/* Sincronització automàtica via un Gist privat de GitHub.
   El token (secret) es desa només al dispositiu (localStorage), mai al repositori.
   El contingut del Gist va xifrat amb el token com a contrasenya, de manera que
   ni tan sols amb l'URL del Gist es pot llegir el progrés sense el token.
   L'API de GitHub (api.github.com) permet peticions des del navegador (CORS). */

const API = 'https://api.github.com';
const FILE = 'montornes-oposicio-progres.json';

function headers(token){
  return {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function req(url, opts, token){
  let r;
  try { r = await fetch(url, { ...opts, headers: headers(token) }); }
  catch(e){ throw new Error('Sense connexió amb GitHub.'); }
  if (r.status === 401) throw new Error('Token no vàlid o caducat.');
  if (r.status === 403) throw new Error('GitHub ha denegat l\'accés (permís de Gists?).');
  if (!r.ok) throw new Error('GitHub ha respost ' + r.status + '.');
  return r;
}

/* Cerca el Gist de progrés existent d'aquest usuari (per nom de fitxer). */
export async function findGist(token){
  const r = await req(API + '/gists?per_page=100', {}, token);
  const list = await r.json();
  const g = (list||[]).find(g => g.files && g.files[FILE]);
  return g ? g.id : null;
}

/* Crea el Gist privat de progrés i en retorna l'id. */
export async function createGist(token, content){
  const body = JSON.stringify({
    description: 'Progrés oposició Montornès (sincronització — no esborrar)',
    public: false,
    files: { [FILE]: { content } },
  });
  const r = await req(API + '/gists', { method:'POST', body }, token);
  return (await r.json()).id;
}

/* Llegeix el contingut del fitxer de progrés del Gist. */
export async function readGist(token, id){
  const r = await req(API + '/gists/' + id, {}, token);
  const g = await r.json();
  const f = g.files && g.files[FILE];
  if (!f) return null;
  if (f.truncated && f.raw_url){
    try { const rr = await fetch(f.raw_url); return await rr.text(); }
    catch(e){ throw new Error('No s\'ha pogut llegir el Gist.'); }
  }
  return f.content;
}

/* Desa el contingut al Gist. */
export async function writeGist(token, id, content){
  const body = JSON.stringify({ files: { [FILE]: { content } } });
  await req(API + '/gists/' + id, { method:'PATCH', body }, token);
  return true;
}
