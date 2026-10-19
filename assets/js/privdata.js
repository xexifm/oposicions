/* Dades d'oposicions PRIVADES (repositori privat de GitHub).
   - Es llegeixen amb l'API de GitHub (contents, Accept: raw) i un token que es
     desa només al dispositiu (mai al repositori ni al bundle de sincronització).
   - Se'n desa una còpia a IndexedDB perquè l'app funcioni sense connexió; la
     còpia s'actualitza cada vegada que es carreguen amb connexió.
   - El service worker NO les intercepta (api.github.com és d'un altre origen)
     i no són a ASSETS: només viuen a IndexedDB d'aquest dispositiu. */

const API = 'https://api.github.com';
export const PRIVATE_FILES = ['temari.json', 'resums.json', 'questions.json', 'cases.json'];

const DB = 'oposicions-privat', STORE = 'dades';
function openDb(){
  return new Promise((res, rej)=>{
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = ()=>r.result.createObjectStore(STORE);
    r.onsuccess = ()=>res(r.result);
    r.onerror = ()=>rej(r.error);
  });
}
async function idb(mode, fn){
  const db = await openDb();
  try {
    return await new Promise((res, rej)=>{
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = ()=>res(req && req.result);
      tx.onerror = ()=>rej(tx.error);
    });
  } finally { db.close(); }
}
export async function cacheGet(id){
  try { return await idb('readonly', s=>s.get(id)) || null; } catch(e){ return null; }
}
export async function cachePut(id, value){
  try { await idb('readwrite', s=>s.put(value, id)); return true; } catch(e){ return false; }
}
export async function cacheDelete(id){
  try { await idb('readwrite', s=>s.delete(id)); } catch(e){ /* ignora */ }
}

/* Error amb codi per decidir si cal provar un altre token. */
class PrivError extends Error { constructor(msg, code){ super(msg); this.code = code; } }

async function getFile(repo, path, file, token){
  const ctl = new AbortController();
  const t = setTimeout(()=>ctl.abort(), 12000);
  let r;
  try {
    r = await fetch(`${API}/repos/${repo}/contents/${path}${file}`, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github.raw',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      cache: 'no-store', signal: ctl.signal,
    });
  } catch(e){ throw new PrivError('Sense connexió amb GitHub.', 'net'); }
  finally { clearTimeout(t); }
  // GitHub respon 404 (no 403) quan el token no té accés a un repositori privat.
  if (r.status === 401) throw new PrivError('Token no vàlid o caducat.', 'auth');
  if (r.status === 403 || r.status === 404) throw new PrivError('El token no té accés al repositori ' + repo + '.', 'noaccess');
  if (!r.ok) throw new PrivError('GitHub ha respost ' + r.status + '.', 'http');
  const txt = await r.text();
  try { return JSON.parse(txt); }
  catch(e){ throw new PrivError('El fitxer ' + file + ' no és JSON vàlid.', 'json'); }
}

/* Baixa els 4 fitxers amb un token. Llança PrivError si no hi ha accés. */
export async function fetchPrivate(conf, token){
  const [temari, resums, questions, cases] = await Promise.all(
    PRIVATE_FILES.map(f=>getFile(conf.repo, conf.path, f, token)));
  return { temari, resums, questions, cases };
}

/* Prova els tokens per ordre (el primer amb accés guanya).
   Retorna { data, tokenSrc } o llança l'últim error. Un error de xarxa no
   prova més tokens (fallarien igual). */
export async function fetchPrivateAny(conf, tokens){
  let last = new PrivError('Cal un token amb accés de lectura al repositori ' + conf.repo + '.', 'notoken');
  for (const { src, token } of tokens){
    try { return { data: await fetchPrivate(conf, token), tokenSrc: src }; }
    catch(e){ last = e; if (e.code === 'net' || e.code === 'json') break; }
  }
  throw last;
}
