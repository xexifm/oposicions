/* Sincronització entre dispositius mitjançant un codi xifrat.
   El progrés (temes repassats + exàmens) es desa al dispositiu (localStorage).
   Aquest mòdul empaqueta aquestes dades en un codi xifrat amb un PIN (AES-GCM
   + PBKDF2), que l'usuari pot copiar d'un dispositiu i importar en un altre.
   Res no s'envia a cap servidor: el codi és l'única còpia que es mou. */

const enc = new TextEncoder();
const dec = new TextDecoder();
const PREFIX = 'MSYNC1-';

function b64encode(bytes){
  let s = '';
  for (let i=0;i<bytes.length;i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64decode(str){
  const s = atob(str);
  const a = new Uint8Array(s.length);
  for (let i=0;i<s.length;i++) a[i] = s.charCodeAt(i);
  return a;
}
async function deriveKey(pin, salt){
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name:'PBKDF2', salt, iterations:100000, hash:'SHA-256' },
    base, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']);
}

export async function encryptBundle(obj, pin){
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(pin, salt);
  const data = enc.encode(JSON.stringify(obj));
  const ct   = new Uint8Array(await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, data));
  const out  = new Uint8Array(16 + 12 + ct.length);
  out.set(salt, 0); out.set(iv, 16); out.set(ct, 28);
  // en grups per facilitar-ne la còpia
  return PREFIX + b64encode(out);
}

export async function decryptBundle(code, pin){
  const raw = String(code||'').trim().replace(/\s+/g,'');
  if (!raw.startsWith(PREFIX)) throw new Error('El codi no té el format correcte.');
  const all = b64decode(raw.slice(PREFIX.length));
  if (all.length < 30) throw new Error('El codi és massa curt o està incomplet.');
  const salt = all.slice(0,16), iv = all.slice(16,28), ct = all.slice(28);
  const key = await deriveKey(pin, salt);
  let pt;
  try { pt = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, key, ct); }
  catch(e){ throw new Error('PIN incorrecte o codi malmès.'); }
  return JSON.parse(dec.decode(pt));
}
