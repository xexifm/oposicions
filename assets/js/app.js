/* ===========================================================================
   App principal — router + vistes
   =========================================================================== */
import { store } from './storage.js';
import { autoMatch, scoreFromChecks, gradeWithClaude } from './grader.js';
import { encryptBundle, decryptBundle } from './sync.js';
import { findGist, createGist, readGist, writeGist } from './gist.js';

const view = document.getElementById('view');
const DATA = { temari:null, resums:null, questions:null, cases:null, _muni:null };

/* ---------- municipis (oposicions) ---------- */
const MUNIS = {
  montornes: {
    id:'montornes', dir:'montornes',
    name:'Montornès del Vallès', short:'Montornès',
    role:'Tècnic/a superior · arquitectura/enginyeria',
    crest:'M', color:'#9e1632', shield:null,
    web:'https://www.montornes.cat',
  },
  cornella: {
    id:'cornella', dir:'cornella',
    name:'Cornellà de Llobregat', short:'Cornellà',
    role:'Oposició · temari en preparació',
    crest:'C', color:'#a61a2f', shield:'assets/icons/cornella-escut.svg',
    web:'https://www.cornella.cat',
  },
};
const DEFAULT_MUNI = 'montornes';
function activeMuni(){ return MUNIS[store.muni()] || null; }
function muniConf(){ return activeMuni() || MUNIS[DEFAULT_MUNI]; }
function contentReady(){ return !!(DATA.temari && DATA.temari.temari && DATA.temari.temari.length); }

/* Actualitza la marca (escut + títol) de la barra superior segons el municipi. */
function paintBrand(){
  const m = activeMuni();
  const crestEl = byId('crest'), titEl = byId('brandtitle'), subEl = byId('brandsub');
  if (!crestEl) return;
  if (!m){ crestEl.textContent = '·'; crestEl.style.removeProperty('--crest-color');
    if (titEl) titEl.textContent = 'Simulador d\'oposicions'; if (subEl) subEl.textContent = 'Tria l\'oposició';
    return; }
  crestEl.style.setProperty('--crest-color', m.color);
  crestEl.innerHTML = m.shield ? `<img src="${m.shield}" alt="${esc(m.short)}">` : esc(m.crest);
  if (titEl) titEl.textContent = 'Oposició ' + m.short;
  if (subEl) subEl.textContent = m.role;
  document.documentElement.style.setProperty('--brand', m.color);
}

/* ---------- utilitats ---------- */
const esc = s => (s==null?'':String(s)).replace(/[&<>"']/g, c => (
  {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => (Math.round(n*100)/100).toLocaleString('ca-ES',{minimumFractionDigits:0,maximumFractionDigits:2});
const shuffle = a => { a=[...a]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
// Barreja les opcions d'una pregunta i recol·loca l'índex de la correcta, perquè
// la resposta bona no surti sempre a la mateixa posició (i variï entre exàmens).
function shuffleOptions(q){
  if (!Array.isArray(q.options) || typeof q.correct !== 'number') return q;
  const order = q.options.map((_, i) => i);
  for (let i=order.length-1; i>0; i--){ const j=Math.floor(Math.random()*(i+1)); [order[i],order[j]]=[order[j],order[i]]; }
  q.options = order.map(i => q.options[i]);
  q.correct = order.indexOf(q.correct);
  return q;
}
const byId = id => document.getElementById(id);
const $$ = sel => Array.from(view.querySelectorAll(sel));
function scrollTop(){ window.scrollTo({top:0,behavior:'instant'}); }

async function loadData(){
  const muni = muniConf();
  if (DATA.temari && DATA._muni === muni.id) return;
  const base = location.pathname.replace(/index\.html$/,'');
  const dir = 'data/' + muni.dir + '/';
  const get = f => fetch(base + dir + f, {cache:'no-cache'}).then(r=>r.json());
  const [temari, resums, questions, cases] = await Promise.all([
    get('temari.json').catch(()=>({blocks:{},temari:[],norms:{}})),
    get('resums.json').catch(()=>({})),
    get('questions.json').catch(()=>[]), get('cases.json').catch(()=>[]),
  ]);
  DATA.temari = temari && temari.temari ? temari : {blocks:{},temari:[],norms:{}};
  DATA.resums = resums.resums || resums || {};
  DATA.questions = questions.questions || questions || [];
  DATA.cases = cases.cases || cases || [];
  DATA._muni = muni.id;
}

function normRef(key){
  const n = DATA.temari.norms[key];
  return n ? n : { name:key, url:'#' };
}

/* ---------------------------------------------------------------------------
   Enllaçat automàtic de normes i articles dins del text dels resums.
   Detecta sigles (TRLUC, LRBRL…) i formes "Llei 39/2015" i les enllaça al
   text consolidat; si davant hi ha "art. N", afegeix l'àncora #a<N> (BOE).
   --------------------------------------------------------------------------- */
const LAW_TOKENS = [
  ['Llei 39/2015','L39_2015'], ['Llei 40/2015','L40_2015'], ['Llei 19/2014','L19_2014'],
  ['Llei 18/2007','L18_2007'], ['Llei 20/2009','L20_2009'], ['Llei 11/2009','L11_2009'],
  ['Llei 11/2025','L11_2025'], ['Llei 31/1995','L31_1995'], ['Llei 38/2003','L38_2003'],
  ['Llei 33/2003','L33_2003'], ['Llei 9/2017','LCSP'], ['Llei 7/1985','LRBRL'],
  ['Llei 38/1999','LOE'], ['RD 171/2004','RD171_2004'], ['RD 500/1990','RD500_1990'],
  ['Decret 179/1995','ROAS'], ['Decret 305/2006','RLUC'], ['Decret 336/1988','D336_1988'],
  ['TRLSRU','TRLSRU'], ['TRLUC','TRLUC'], ['TRLHL','TRLHL'], ['TREBEP','TREBEP'],
  ['LOPDGDD','LOPDGDD'], ['LRBRL','LRBRL'], ['RLUC','RLUC'], ['LCSP','LCSP'],
  ['ROAS','ROAS'], ['RGPD','RGPD'], ['TRRL','TRRL'], ['LEF','LEF'], ['LOE','LOE'],
  ['CTE','CTE'], ['EAC','EAC2006'], ['CEAL','CEAL'], ['CE','CE1978'], ['Constitució','CE1978'],
];
const _escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const _normTok = s => s.toUpperCase().replace(/\s+/g,' ').replace(/’/g,"'").trim();
const TOK_KEY = {}; LAW_TOKENS.forEach(([t,k])=>{ TOK_KEY[_normTok(t)] = k; });
// CEAL no és al catàleg de normes; s'ignora en enllaçar (només evita mal-enllaçar "CE").
const _alts = LAW_TOKENS.map(([t])=>_escRe(t).replace(/\s+/g,'\\s+'))
  .sort((a,b)=>b.length-a.length).join('|');
// Referència d'article: "art. 47", "arts. 15-29", "article 5.2", amb possible llei al darrere.
const ARTWORD = "\\b(?:[Aa]rts?\\.?|[Aa]rticles?)";
const NUM = "\\d+(?:\\.\\d+)?(?:\\s*bis|\\s*ter)?";
const ARTNUMS = NUM + "(?:\\s*(?:-|–|a|i|,|;)\\s*" + NUM + ")*";
// Llei al darrere de l'article, només si realment hi és (amb "de la…", "del" o un simple espai).
const LAWGRP = "(?:\\s+(?:de\\s+(?:la|l'|el)\\s+|del\\s+|de\\s+)?(?:" + _alts + ")\\b)?";
const ART_CLUSTER = ARTWORD + "\\s*" + ARTNUMS + LAWGRP;
// Matcher case-sensitive (per no confondre "CE" amb "ce" ni sigles amb text normal).
const MASTER = new RegExp("(" + ART_CLUSTER + ")|(\\b(?:" + _alts + ")\\b)", "g");
const NORM_RE = new RegExp("\\b(" + _alts + ")\\b", "g");
const LAWEND_RE = new RegExp("(" + _alts + ")\\s*$");

function anchorTag(ref, artNum, text){
  const isBoe = /boe\.es/.test(ref.url);
  const anchor = (artNum && isBoe) ? '#a' + String(artNum).split('.')[0] : '';
  return `<a class="lawlink" href="${esc(ref.url)}${anchor}" target="_blank" rel="noopener" title="${esc(ref.name)}">${text}</a>`;
}

/* Enllaça normes i articles en un text JA escapat (esc).
   defaultLaw: clau de norma a assumir per als "art. N" que no porten llei
   (p. ex. la llei del títol de l'apartat). L'estat es reinicia a cada crida. */
function linkifyLaw(escaped, defaultLaw){
  if (!escaped) return escaped;
  let out = '', last = 0, lastLaw = defaultLaw || null, m;
  MASTER.lastIndex = 0;
  while ((m = MASTER.exec(escaped))){
    out += escaped.slice(last, m.index);
    last = m.index + m[0].length;
    if (m[2] !== undefined){                         // sigla o llei solta
      const key = TOK_KEY[_normTok(m[2])];
      const ref = key && DATA.temari.norms[key];
      if (ref){ lastLaw = key; out += anchorTag(ref, null, m[2]); } else out += m[0];
    } else {                                         // referència d'article
      const seg = m[1];
      const lawM = seg.match(LAWEND_RE);
      let key = lawM ? TOK_KEY[_normTok(lawM[1])] : null;
      if (key) lastLaw = key; else key = lastLaw;
      const numM = seg.match(/\d+(?:\.\d+)?/);
      const ref = key && DATA.temari.norms[key];
      out += ref ? anchorTag(ref, numM ? numM[0] : null, seg) : seg;
    }
  }
  return boldify(out + escaped.slice(last));
}
/* Marca en negreta el text entre **dobles asteriscs** (destaca termes clau i xifres). */
function boldify(html){ return html.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>'); }
/* Primera norma esmentada en un text (per fixar la llei per defecte d'un apartat). */
function pickLaw(text, fallback){
  NORM_RE.lastIndex = 0;
  const m = NORM_RE.exec(text||'');
  return m ? (TOK_KEY[_normTok(m[1])] || fallback) : fallback;
}
/* Conjunt de claus de normes esmentades en un text pla. */
function detectNorms(plain){
  const found = new Set(); let m;
  NORM_RE.lastIndex = 0;
  while ((m = NORM_RE.exec(plain))){ const k = TOK_KEY[_normTok(m[1])]; if (k) found.add(k); }
  return found;
}
/* Glossari d'abreviacions a partir de les normes del tema + les detectades. */
function glossaryHtml(resum, tema){
  const keys = new Set((tema && tema.sources) || []);
  let plain = (resum.intro||'') + ' ';
  (resum.sections||[]).forEach(s=>{ plain += (s.p||'')+' '+((s.list||[]).join(' '))+' '+(s.key||'')+' '; });
  plain += (resum.key||'');
  flattenKeypoints(resum.keypoints||[]).forEach(t=> plain += ' '+t);
  detectNorms(plain).forEach(k=>keys.add(k));
  const ks = [...keys].filter(k=>DATA.temari.norms[k]);
  if (!ks.length) return '';
  ks.sort((a,b)=>DATA.temari.norms[a].name.localeCompare(DATA.temari.norms[b].name,'ca'));
  const items = ks.map(k=>{
    const n = DATA.temari.norms[k];
    return `<li><a class="lawlink" href="${esc(n.url)}" target="_blank" rel="noopener"><b>${esc(k)}</b></a> — ${esc(n.name)}</li>`;
  }).join('');
  return `<details class="gloss" open><summary>📖 Glossari d'abreviacions</summary><ul>${items}</ul></details>`;
}
function flattenKeypoints(kp){
  const out = [];
  (kp||[]).forEach(g=>{
    if (typeof g==='string'){ out.push(g); return; }
    if (g.h) out.push(g.h);
    (g.p||[]).forEach(it=>{ if (typeof it==='string') out.push(it); else { if(it.t) out.push(it.t); (it.sub||[]).forEach(x=>out.push(x)); } });
  });
  return out;
}
/* Esquema jeràrquic de repàs ràpid (keypoints). */
function renderKeypoints(kp, fallback){
  if (!kp || !kp.length) return '';
  let html = '<div class="keysch"><div class="kcap">🧠 Repàs ràpid · esquema clau</div>';
  kp.forEach(g=>{
    if (typeof g==='string'){ html += `<div class="kgrp"><ul><li>${linkifyLaw(esc(g), fallback)}</li></ul></div>`; return; }
    const gl = pickLaw(g.h||'', fallback);
    html += `<div class="kgrp">${g.h?`<b>${linkifyLaw(esc(g.h), fallback)}</b>`:''}<ul>`;
    (g.p||[]).forEach(it=>{
      if (typeof it==='string'){ html += `<li>${linkifyLaw(esc(it), gl)}</li>`; }
      else { html += `<li>${linkifyLaw(esc(it.t||''), gl)}${(it.sub||[]).length?`<ul>${it.sub.map(x=>`<li>${linkifyLaw(esc(x), gl)}</li>`).join('')}</ul>`:''}</li>`; }
    });
    html += '</ul></div>';
  });
  return html + '</div>';
}

/* ===========================================================================
   ROUTER
   =========================================================================== */
const routes = {
  '': estudi, 'estudi': estudi, 'tema': temaView,
  'examen': examenConfig,
  'historial': historial, 'fonts': fonts,
  'quiz': quizRoute, 'errades': erradesRoute,
  'casquiz': casquizRoute, 'temahist': temahistView,
};
let examState = null;

/* Rutes amb l'oposició a l'URL: #/<muni>/<vista>/<param>
   (p. ex. #/montornes/tema/10). Així els enllaços són autosuficients i es
   poden obrir en pestanyes noves o compartir sense perdre l'oposició.
   Les rutes velles sense municipi (#/tema/10) es redirigeixen a la forma
   canònica amb l'oposició activa. */
async function render(){
  const hash = location.hash.replace(/^#\/?/, '');
  const segs = hash.split('/');
  const muniSeg = MUNIS[segs[0]] ? segs.shift() : null;
  const route = (segs[0] || '').split('?')[0];
  const param = segs[1];

  if (!muniSeg){
    // Rutes globals (sense oposició): selector i configuració.
    if (route === 'config'){
      paintBrand();
      view.innerHTML = '';
      configView();
      document.querySelectorAll('[data-route]').forEach(a=>a.classList.remove('active'));
      scrollTop();
      return;
    }
    // Ruta vella amb vista coneguda i oposició activa → redirecció canònica.
    const m = store.muni();
    if (m && MUNIS[m] && route && route !== 'tria' && routes[route]){
      location.replace('#/' + m + '/' + hash);
      return;
    }
    // Selector d'oposició.
    paintBrand();
    view.innerHTML = '';
    triaView();
    document.querySelectorAll('[data-route]').forEach(a=>a.classList.remove('active'));
    scrollTop();
    return;
  }

  // Oposició de l'URL: apunta el bucket de progrés i la marca.
  if (store.muni() !== muniSeg) store.setMuni(muniSeg);
  paintBrand();
  await loadData();
  const fn = routes[route] || estudi;
  view.innerHTML = '';
  // Municipi sense temari carregat encara: les vistes de contingut mostren "en preparació".
  const needsContent = ['','estudi','tema','examen','fonts','quiz','errades','casquiz','temahist'].includes(route);
  if (needsContent && !contentReady()) prepView();
  else fn(param);
  // navegació: prefixa l'oposició als enllaços i marca l'actiu
  const active = route || 'estudi';
  document.querySelectorAll('[data-route]').forEach(a=>{
    a.href = '#/' + muniSeg + '/' + a.dataset.route;
    a.classList.toggle('active', a.dataset.route === active ||
      (['tema','quiz','casquiz','temahist'].includes(active) && a.dataset.route==='estudi') ||
      (active==='errades' && a.dataset.route==='examen'));
  });
  scrollTop();
}
window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', render);
render();
setTimeout(initGistSync, 0);   // defer: espera que el mòdul acabi de carregar

/* ---------- estat de connexió: offline + actualització en reconnectar ---------- */
function toast(msg, ms=3200){
  let t = byId('toast');
  if(!t){ t=document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.remove('show'), ms);
}
window.addEventListener('offline', ()=> toast('Sense connexió — pots seguir estudiant; el progrés es desa al dispositiu.'));
window.addEventListener('online', async ()=>{
  // El progrés (localStorage) es manté sempre; en reconnectar refresquem el contingut.
  try{
    DATA.temari = null;
    await loadData();
    await render();
    toast('Tornes a estar en línia — contingut actualitzat ✓');
  }catch(e){ /* si falla, es manté el que hi ha en memòria */ }
});

/* ---------- Sincronització automàtica amb Gist privat de GitHub ---------- */
let gistBusy = false, gistPushTimer = null, gistInited = false;
function gistStatus(msg, cls){
  const el = byId('ghstatus'); if(!el) return;
  el.textContent = msg; el.className = 'muted ' + (cls||'');
}
/* Assegura que tenim l'id del Gist (el cerca o el crea). Xifrat amb el PIN. */
async function ensureGistId(token, pin){
  const s = store.settings();
  if (s.ghGistId) return s.ghGistId;
  let id = await findGist(token);
  if (!id) id = await createGist(token, await encryptBundle(store.exportBundle(), pin));
  store.setSetting('ghGistId', id);
  return id;
}
/* Sincronització completa: baixa i fusiona, després puja la unió.
   El contingut es xifra amb el PIN (compartit entre dispositius), no amb el
   token (que pot variar). Si el PIN no coincideix, NO puja (no sobreescriu). */
async function gistSyncNow({ pull=true, push=true, silent=false } = {}){
  const s = store.settings();
  const token = s.ghToken, pin = s.ghPin;
  if (!token || !pin || gistBusy) return { ok:false };
  gistBusy = true;
  if (!silent) gistStatus('Sincronitzant…');
  try{
    const id = await ensureGistId(token, pin);
    let changed = false;
    if (pull){
      const content = await readGist(token, id);
      if (content){
        let remote;
        try{ remote = await decryptBundle(content, pin); }
        catch(e){
          // Contingut xifrat amb un PIN diferent: no toquem res per no perdre dades.
          if (!silent) gistStatus('El PIN no coincideix amb el de l\'altre dispositiu. Fes servir el mateix PIN a tots dos.', 'err');
          return { ok:false, pinMismatch:true };
        }
        const before = JSON.stringify(store.exportBundle());
        store.importBundle(remote);
        changed = JSON.stringify(store.exportBundle()) !== before;
      }
    }
    if (push) await writeGist(token, id, await encryptBundle(store.exportBundle(), pin));
    store.setSetting('syncLast', Date.now());
    if (!silent) gistStatus('Sincronitzat ✓ · ' + new Date().toLocaleTimeString('ca-ES',{hour:'2-digit',minute:'2-digit'}), 'ok');
    return { ok:true, changed };
  }catch(e){
    if (!silent) gistStatus('Error: ' + e.message, 'err');
    return { ok:false, error:e.message };
  }finally{ gistBusy = false; }
}
/* Puja els canvis locals amb un petit retard (agrupant-los). */
function scheduleGistPush(){
  if (!store.settings().ghToken || !store.settings().ghAuto) return;
  clearTimeout(gistPushTimer);
  gistPushTimer = setTimeout(()=>{ gistSyncNow({ pull:false, push:true, silent:true }); }, 1800);
}
/* En obrir l'app: baixa i fusiona una vegada, i refresca la vista si ha canviat. */
async function initGistSync(){
  if (gistInited) return; gistInited = true;
  const s = store.settings();
  if (!s.ghAuto || !s.ghToken || !s.ghPin) return;
  const r = await gistSyncNow({ pull:true, push:true, silent:true });
  if (r && r.changed) render();
}

/* Vista "en preparació" per a un municipi encara sense temari. */
function prepView(){
  const m = muniConf();
  view.innerHTML = `
    <a class="backlink" href="#/">← Inici</a>
    <section class="hero">
      <div class="eyebrow">Oposició · ${esc(m.short)}</div>
      <h1>Temari en preparació</h1>
      <p class="lead">El contingut de l'oposició de <b>${esc(m.name)}</b> (resums, preguntes i casos) encara
      s'està preparant. Torna-hi ben aviat. Mentrestant pots preparar-te l'altra oposició disponible.</p>
      <div class="row" style="margin-top:14px">
        <a class="btn primary lg" href="#/">Canvia d'oposició</a>
      </div>
    </section>`;
}

/* ===========================================================================
   VISTA: TRIA D'OPOSICIÓ (selector de municipi)
   =========================================================================== */
function triaView(){
  const cur = store.muni();
  const card = m => {
    const crest = m.shield ? `<img src="${m.shield}" alt="${esc(m.short)}">` : esc(m.crest);
    return `<button class="triacard" data-muni="${m.id}" style="--crest-color:${m.color}">
        <span class="triacrest">${crest}</span>
        <span class="triatxt"><b>${esc(m.name)}</b><small>${esc(m.role)}</small></span>
        ${cur===m.id?'<span class="pill green">Actual</span>':'<span class="tgo">→</span>'}
      </button>`;
  };
  view.innerHTML = `
    <section class="hero" style="text-align:center">
      <div class="eyebrow">Simulador d'oposicions</div>
      <h1>Tria l'oposició</h1>
      <p class="lead" style="margin-inline:auto">Selecciona a quina oposició et vols preparar. El progrés (temes
      repassats i exàmens) es desa per separat per a cada oposició, però la sincronització entre dispositius ho puja tot.</p>
    </section>
    <div class="trialist">
      ${card(MUNIS.montornes)}
      ${card(MUNIS.cornella)}
    </div>
    <div class="row" style="justify-content:center;margin-top:18px">
      <a class="btn ghost" href="#/config">⚙️ Configuració (sincronització i clau API)</a>
    </div>`;
  $$('[data-muni]').forEach(b=>b.addEventListener('click', ()=>{
    const id = b.dataset.muni;
    if (store.muni() !== id){ store.setMuni(id); DATA.temari = null; DATA._muni = null; }
    location.hash = '#/' + id + '/estudi';
  }));
}

/* ===========================================================================
   VISTA: CONFIGURACIÓ GLOBAL (clau API de Claude i sincronització)
   =========================================================================== */
function configView(){
  const s = store.settings();
  view.innerHTML = `
    <a class="backlink" href="#/">← Tria d'oposició</a>
    <h1>Configuració</h1>
    <p class="lead">Aquests ajustos són globals: valen per a totes les oposicions i es desen en aquest dispositiu.</p>

    <div class="card" id="apicard">
      <h2 style="margin:0 0 4px">🤖 Correcció dels casos amb Claude</h2>
      <p class="muted" style="margin:0 0 10px">Amb una clau API d'Anthropic, els casos pràctics es corregeixen
      automàticament amb Claude (nota, criteris i retroacció redactada). Si l'API no respon (sense connexió,
      sense crèdit…), s'aplica la correcció local per criteris. La clau es desa en aquest dispositiu i, si tens
      la sincronització activa, viatja <b>xifrada amb el teu PIN</b> als altres dispositius.</p>
      <label class="field"><span>Clau API d'Anthropic (sk-ant-…)</span>
        <input id="cfgApiKey" type="password" autocomplete="off" placeholder="sk-ant-api03-…" value="${esc(s.apiKey||'')}"></label>
      <label class="field weakfield">
        <input type="checkbox" id="showKey"><span>Mostra la clau</span>
      </label>
      <div class="row" style="gap:8px">
        <button class="btn primary" id="apiSave">Desa la clau</button>
        <button class="btn ghost" id="apiTest">Prova la connexió</button>
        <button class="btn ghost" id="apiClear" ${s.apiKey?'':'hidden'}>Esborra-la</button>
      </div>
      <p id="apistatus" class="muted" style="margin:.7em 0 0"></p>
    </div>

    ${syncCardHtml()}
    <div class="card" style="margin-top:18px">
      <p class="muted" style="margin:0;font-size:.85rem">⚠️ Les preguntes, els resums i els casos són material
      d'estudi generat amb IA. Contrasta sempre amb la normativa consolidada abans de l'examen.</p>
    </div>`;
  setupSync();

  const keyEl = byId('cfgApiKey');
  const st = (msg, cls)=>{ const el=byId('apistatus'); el.textContent=msg; el.className='muted '+(cls||''); };
  byId('showKey').addEventListener('change', e=>{ keyEl.type = e.target.checked ? 'text' : 'password'; });
  byId('apiSave').addEventListener('click', ()=>{
    const k = keyEl.value.trim();
    if (!k.startsWith('sk-ant-')){ st('La clau ha de començar per sk-ant-…', 'err'); return; }
    store.setSetting('apiKey', k);
    byId('apiClear').hidden = false;
    st('Clau desada ✓ Els casos es corregiran amb Claude.', 'ok');
    scheduleGistPush();
  });
  byId('apiTest').addEventListener('click', async ()=>{
    const k = keyEl.value.trim() || s.apiKey;
    if (!k){ st('Primer escriu la clau.', 'err'); return; }
    st('Provant la connexió…');
    try{
      const r = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': k, 'anthropic-version': '2023-06-01',
                   'anthropic-dangerous-direct-browser-access': 'true' },
      });
      if (r.ok) st('Connexió correcta ✓ La clau funciona.', 'ok');
      else if (r.status === 401) st('La clau no és vàlida (error 401).', 'err');
      else st('L\'API ha respost amb l\'error ' + r.status + '.', 'err');
    }catch(e){ st('No s\'ha pogut connectar amb l\'API (sense connexió?).', 'err'); }
  });
  byId('apiClear').addEventListener('click', ()=>{
    store.setSetting('apiKey', '');
    keyEl.value = '';
    byId('apiClear').hidden = true;
    st('Clau esborrada. Es farà servir la correcció local.', '');
  });
}

/* ===========================================================================
   VISTA: INICI
   =========================================================================== */
/* ---------- repàs espaiat ---------- */
const DAY = 86400000;
/* Un tema "toca" repassar-lo als 7 dies del primer repàs i cada 30 dies a
   partir del segon. Retorna els temes vençuts, el més antic primer. */
function studiedDueInfo(num){
  const i = store.studiedInfo(num);
  if (!i) return null;
  const days = Math.floor((Date.now()-i.t)/DAY);
  const interval = i.n<=1 ? 7 : 30;
  return { days, due: days >= interval };
}
function dueThemes(){
  return Object.keys(store.studied())
    .map(k=>{ const d = studiedDueInfo(k); return d && d.due ? { num:+k, days:d.days } : null; })
    .filter(Boolean)
    .sort((a,b)=>b.days-a.days);
}

/* ===========================================================================
   VISTA: ESTUDI (pantalla principal de l'oposició)
   =========================================================================== */
function estudi(){
  const studied = store.studied();
  const blocks = DATA.temari.blocks;
  const temari = DATA.temari.temari;
  const m = muniConf();
  const nMist = store.mistakeCount();
  const tOf = n => temari.find(x=>x.num===n);

  const mistCard = nMist ? `
    <div class="card mistcard compact">
      <div class="between"><b>🔁 Banc d'errades</b><span class="pill amber">${nMist} pendents</span></div>
      <p class="muted" style="margin:.3em 0 .6em">Preguntes fallades: amb 2 encerts seguits surten del banc.</p>
      <a class="btn primary sm" href="#/errades">Repassa les errades →</a>
    </div>` : '';

  const due = dueThemes();
  const dueCard = due.length ? `
    <div class="card duecard compact">
      <div class="between"><b>📅 Et toca repassar</b><span class="pill amber">${due.length} tema(es)</span></div>
      ${due.slice(0,5).map(d=>{
        const t = tOf(d.num);
        return `<a class="duelink" href="#/tema/${d.num}"><b>${d.num}.</b> ${esc(t?t.title:'')}
          <span class="muted">· fa ${d.days} dies</span></a>`;
      }).join('')}
      ${due.length>5?`<p class="muted" style="margin:.5em 0 0;font-size:.85rem">…i ${due.length-5} més, marcats a la llista.</p>`:''}
    </div>` : '';

  view.innerHTML = `
    <div class="munibar">
      <span class="munilabel">Oposició: <b>${esc(m.name)}</b></span>
      <a class="btn ghost sm" href="#/">Canvia d'oposició</a>
    </div>
    ${dueCard}${mistCard}
    <h1>Estudi del temari</h1>
    <p class="lead">Els ${temari.length} temes, agrupats en blocs. Toca un tema per estudiar-ne el resum, o
    practica'l directament amb el quiz (test) i el cas pràctic. Toca els percentatges per veure en què falles.</p>
    <div class="search" style="margin:14px 0 6px">
      <span class="mag">🔎</span>
      <input id="q" type="text" placeholder="Cerca un tema, una llei, un concepte…" autocomplete="off">
    </div>
    <p class="muted" id="studycount" style="font-size:.85rem"></p>
    <div id="temalist"></div>`;

  const listEl = byId('temalist');
  const stats = store.themeStats();
  function pctClass(p){ return p>=75?'good':(p>=50?'mid':'bad'); }
  function statBadges(num){
    const ts = stats[num];
    let html='';
    if (ts && ts.qTot){ const p=Math.round(ts.qOk/ts.qTot*100);
      html+=`<a class="tstat ${pctClass(p)}" href="#/temahist/${num}" title="${ts.qOk} encerts de ${ts.qTot} preguntes contestades — toca per veure l'historial">test ${p}%</a>`; }
    if (ts && ts.cMax){ const p=Math.round(ts.cPts/ts.cMax*100);
      html+=`<a class="tstat ${pctClass(p)}" href="#/temahist/${num}" title="punts de casos acumulats — toca per veure l'historial">casos ${p}%</a>`; }
    if (!html) html='<span class="tstat none">sense dades</span>';
    return html;
  }
  function draw(filter){
    const f = (filter||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    const match = t => {
      if (!f) return true;
      const hay = (t.num+' '+t.title+' '+t.blockName+' '+t.sources.map(s=>normRef(s).name).join(' '))
        .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
      return hay.includes(f);
    };
    const groups = {};
    temari.filter(match).forEach(t=>{ (groups[t.block] ||= []).push(t); });
    let html = '';
    Object.keys(groups).sort((a,b)=>a-b).forEach(b=>{
      html += `<div class="blockhead"><span class="n">${b}</span><h3>${esc(blocks[b])}</h3></div>`;
      groups[b].forEach(t=>{
        const done = studied[t.num];
        const hasResum = DATA.resums[t.num];
        const d = done ? studiedDueInfo(t.num) : null;
        const doneBadge = !done ? '' : (d && d.due
          ? `<span class="tstat mid" title="Toca tornar-lo a repassar">🔁 repassat fa ${d.days} dies</span>`
          : '<span class="tstat done">✓ repassat</span>');
        html += `<div class="tema-item">
          <a class="tn" href="#/tema/${t.num}">${t.num}</a>
          <span class="tmid">
            <a class="tt" href="#/tema/${t.num}">${esc(t.title)}</a>
            <span class="tstats">${doneBadge}${statBadges(t.num)}${hasResum?'':'<span class="tstat none">resum en preparació</span>'}</span>
          </span>
          <span class="tactions">
            <a class="pill practbtn" href="#/quiz/${t.num}" title="Quiz de 5 preguntes d'aquest tema">⚡ Quiz</a>
            <a class="pill practbtn" href="#/casquiz/${t.num}" title="Cas pràctic d'aquest tema">⚖️ Cas</a>
          </span>
        </div>`;
      });
    });
    listEl.innerHTML = html || '<p class="muted">Cap tema coincideix amb la cerca.</p>';
  }
  const total = temari.length, done = Object.keys(studied).length;
  byId('studycount').textContent = `${done} de ${total} temes marcats com a repassats.`;
  byId('q').addEventListener('input', e=>draw(e.target.value));
  draw('');
}

/* ===========================================================================
   VISTA: TEMA (resum)
   =========================================================================== */
/* Concepte curt d'un tema per als menús de navegació. */
function themeConcept(t){
  let s = (t.title||'').split(/[:.]/)[0].trim();
  if (s.length>36) s = s.slice(0,36).trim()+'…';
  return s;
}
/* Barra de navegació entre temes: fletxes + desplegable de tots els temes per blocs. */
function themeNavHtml(num){
  const temari = DATA.temari.temari, blocks = DATA.temari.blocks;
  const groups = {};
  temari.forEach(t=>{ (groups[t.block] ||= []).push(t); });
  let opts = '';
  Object.keys(groups).sort((a,b)=>a-b).forEach(b=>{
    opts += `<optgroup label="Bloc ${b} · ${esc(blocks[b])}">`;
    groups[b].forEach(t=>{ opts += `<option value="${t.num}" ${t.num===num?'selected':''}>${t.num} · ${esc(themeConcept(t))}</option>`; });
    opts += `</optgroup>`;
  });
  return `<div class="temanav">
    ${num>1?`<a class="tnav-arrow" href="#/tema/${num-1}" title="Tema anterior">‹</a>`:`<span class="tnav-arrow disabled">‹</span>`}
    <select id="temajump" class="tnav-select" aria-label="Salta a un tema">${opts}</select>
    ${num<90?`<a class="tnav-arrow" href="#/tema/${num+1}" title="Tema següent">›</a>`:`<span class="tnav-arrow disabled">›</span>`}
  </div>`;
}

function temaView(num){
  num = parseInt(num,10);
  const tema = DATA.temari.temari.find(t=>t.num===num);
  if (!tema){ view.innerHTML = '<p>Tema no trobat.</p>'; return; }
  const resum = DATA.resums[num];
  const studied = !!store.studied()[num];
  const dueInfo = studied ? studiedDueInfo(num) : null;
  const srcChips = tema.sources.map(k=>{
    const n = normRef(k);
    return `<a class="srcchip" href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${esc(n.name)} ↗</a>`;
  }).join('');

  let body;
  if (resum){
    body = renderResum(resum, tema);
  } else {
    body = `<div class="notice">El resum detallat d'aquest tema encara s'està preparant
      (s'aniran afegint per fases). Mentrestant, consulta les fonts oficials de sota i practica
      amb les preguntes d'aquest bloc.</div>`;
  }

  view.innerHTML = `
    ${themeNavHtml(num)}
    <a class="backlink" href="#/estudi">← Tornar al temari</a>
    <article class="summary card">
      <div class="eyebrow">Bloc ${tema.block} · ${esc(tema.blockName)}</div>
      <h1>Tema ${tema.num}</h1>
      <p class="lead">${esc(tema.title)}</p>
      <div class="srclist">${srcChips || '<span class="muted">Sense norma específica.</span>'}</div>
      <div class="divider"></div>
      ${body}
      <div class="divider"></div>
      <div class="row">
        <button class="btn ${studied?'primary':''}" id="markbtn">${studied?'✓ Repassat':'Marcar com a repassat'}</button>
        ${dueInfo && dueInfo.due ? `<button class="btn" id="touchbtn" title="Actualitza la data de l'últim repàs">🔁 Repassat avui (fa ${dueInfo.days} dies)</button>` : ''}
        <a class="btn primary" href="#/quiz/${tema.num}">⚡ Quiz d'aquest tema (5 preguntes)</a>
        <a class="btn primary" href="#/casquiz/${tema.num}">⚖️ Cas d'aquest tema</a>
      </div>
    </article>
    <div class="row" style="margin-top:14px;justify-content:space-between">
      ${num>1?`<a class="btn ghost" href="#/tema/${num-1}">← Tema ${num-1}</a>`:'<span></span>'}
      ${num<90?`<a class="btn ghost" href="#/tema/${num+1}">Tema ${num+1} →</a>`:'<span></span>'}
    </div>`;

  byId('markbtn').addEventListener('click', e=>{
    const now = store.toggleStudied(num);
    e.target.classList.toggle('primary', now);
    e.target.textContent = now ? '✓ Repassat' : 'Marcar com a repassat';
    scheduleGistPush();
  });
  const tb = byId('touchbtn');
  if (tb) tb.addEventListener('click', ()=>{
    store.touchStudied(num);
    scheduleGistPush();
    render();
  });
  const jump = byId('temajump');
  if (jump) jump.addEventListener('change', e=>{ location.hash = '#/' + store.muni() + '/tema/' + e.target.value; });
}

function renderResum(r, tema){
  const primary = (tema && tema.sources && tema.sources[0]) || null;
  let html = '';
  // Esquema clau (repàs ràpid) al PRINCIPI del resum.
  if (r.keypoints && r.keypoints.length) html += renderKeypoints(r.keypoints, primary);
  html += glossaryHtml(r, tema);
  if (r.intro) html += `<p>${linkifyLaw(esc(r.intro), pickLaw(r.intro, primary))}</p>`;
  (r.sections||[]).forEach(s=>{
    // llei per defecte de l'apartat: la del títol, si no la del primer paràgraf, si no la del tema
    const secLaw = pickLaw((s.h||'') + ' ' + (s.p||''), primary);
    if (s.h) html += `<h3>${esc(s.h)}</h3>`;
    if (s.p) html += `<p>${linkifyLaw(esc(s.p), secLaw)}</p>`;
    if (s.list) html += `<ul>${s.list.map(li=>`<li>${linkifyLaw(esc(li), secLaw)}</li>`).join('')}</ul>`;
    if (s.table) html += renderTable(s.table, secLaw);
    if (s.p2) html += `<p>${linkifyLaw(esc(s.p2), secLaw)}</p>`;
    if (s.key) html += `<div class="keyfact">💡 ${linkifyLaw(esc(s.key), secLaw)}</div>`;
    if (s.scheme) html += renderScheme(s.scheme);
  });
  return html;   // (la "Clau" final s'ha eliminat; el repàs ràpid és a dalt)
}

/* Renderitza un "esquema" com a text normal que s'ajusta a la pantalla
   (sense desplaçament horitzontal): cada línia és una fila indentada que ajusta. */
function renderScheme(sc){
  const lines = String(sc.body||'').split('\n');
  let rows = '';
  for (const ln of lines){
    if (!ln.trim()){ rows += '<div class="sgap"></div>'; continue; }
    const indent = ln.length - ln.replace(/^\s+/,'').length;
    const lvl = Math.min(Math.floor(indent/2), 6);
    rows += `<div class="sline" style="padding-left:${lvl*0.8}em">${esc(ln.trim())}</div>`;
  }
  return `<div class="scheme"><div class="cap">${esc(sc.cap||'Esquema')}</div>${rows}</div>`;
}

/* Taula comparativa (contractes, procediments, llindars…). Amb scroll horitzontal si cal. */
function renderTable(t, law){
  const head = (t.headers||[]).map(h=>`<th>${linkifyLaw(esc(h), law)}</th>`).join('');
  const body = (t.rows||[]).map(r=>`<tr>${r.map(c=>`<td>${linkifyLaw(esc(c), law)}</td>`).join('')}</tr>`).join('');
  return `<div class="tablewrap">${t.cap?`<div class="tcap">${esc(t.cap)}</div>`:''}`
    + `<table class="rtable"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/* ===========================================================================
   VISTA: CONFIGURACIÓ D'EXAMEN
   =========================================================================== */
function examenConfig(){
  const params = new URLSearchParams((location.hash.split('?')[1])||'');
  const preBlock = params.get('block');
  const blocks = DATA.temari.blocks;
  const temari = DATA.temari.temari;
  const s = store.settings();
  const allThemes = temari.map(t=>t.num);
  const themesOfBlock = b => temari.filter(t=>String(t.block)===String(b)).map(t=>t.num);
  const pending = store.pendingExam();
  const pAns = pending ? (pending.answers||[]).filter(a=>a!==null).length : 0;
  const pQ = pending ? (pending.qs||[]).length : 0;
  const pC = pending ? (pending.cs||[]).length : 0;
  const pendingBanner = pending ? `
    <div class="card pendingcard">
      <b>⏳ Tens un examen en procés</b>
      <p class="muted" style="margin:.3em 0 .7em">${pAns} de ${pQ} preguntes contestades${pC?` · ${pC} cas(os)`:''}. Si en comences un de nou, aquest es perdrà.</p>
      <div class="row"><button class="btn primary" id="resumeBtn">▶ Reprèn l'examen</button>
      <button class="btn ghost" id="discardBtn">Descarta'l</button></div>
    </div>` : '';

  const nMist = store.mistakeCount();
  const mistCard = nMist ? `
    <div class="card mistcard">
      <b>🔁 Banc d'errades</b>
      <p class="muted" style="margin:.3em 0 .7em">Tens <b>${nMist}</b> pregunta(es) fallades pendents de dominar
      (surten del banc amb 2 encerts seguits). Repassar-les és la manera més ràpida de pujar nota.</p>
      <a class="btn primary" href="#/errades">Repassa les errades →</a>
    </div>` : '';

  // selecció inicial: un bloc si ve per paràmetre, si no tot el temari
  const sel = new Set(preBlock ? themesOfBlock(preBlock) : allThemes);

  // grups de blocs amb els seus temes
  const blockPick = Object.keys(blocks).sort((a,b)=>a-b).map(b=>{
    const ths = themesOfBlock(b);
    const chips = ths.map(n=>{
      const t = temari.find(x=>x.num===n);
      return `<label class="thchip"><input type="checkbox" data-theme="${n}" ${sel.has(n)?'checked':''}>
        <span>${n}</span></label>`;
    }).join('');
    return `<div class="blockpick">
      <label class="blocktoggle"><input type="checkbox" data-block="${b}"> <b>Bloc ${b}</b> · ${esc(blocks[b])}</label>
      <div class="themes">${chips}</div></div>`;
  }).join('');

  view.innerHTML = `
    <h1>Configura l'examen</h1>
    <p class="lead">Tria com vols practicar. La puntuació segueix la Base 7.7 de la convocatòria.</p>
    ${pendingBanner}
    ${mistCard}
    <div class="card">
      <div class="field"><span>Àmbit · pots triar diversos blocs o temes</span>
        <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px">
          <button type="button" class="chip" id="selAll">Tot el temari</button>
          <button type="button" class="chip" id="selNone">Buidar selecció</button>
        </div>
        <details class="themepick" id="themepick">
          <summary>Triar blocs i temes concrets · <span id="selcount"></span></summary>
          ${blockPick}
        </details>
      </div>

      <div class="field"><span>Preguntes tipus test (Prova 1)</span>
        <div class="seg" id="cfgN">
          ${[0,10,20,40,50,60].map(n=>`<button data-v="${n}" class="${(s.n??20)===n?'on':''}">${n===0?'Cap':n}</button>`).join('')}
        </div></div>

      <div class="field"><span>Casos teòrico-pràctics (Prova 2)</span>
        <div class="seg" id="cfgCases">
          ${[0,1,2,3].map(n=>`<button data-v="${n}" class="${(s.cases??1)===n?'on':''}">${n===0?'Cap':n}</button>`).join('')}
        </div></div>

      <label class="field weakfield">
        <input type="checkbox" id="cfgWeak" ${s.weak?'checked':''}>
        <span><b>Prioritza els temes febles</b> — més preguntes dels temes on falles més
        (segons els teus resultats) i del banc d'errades.</span>
      </label>

      <label class="field weakfield">
        <input type="checkbox" id="cfgNoTimer" ${s.noTimer?'checked':''}>
        <span><b>Sense límit de temps</b> — si no el marques, el cronòmetre es calcula sol:
        1 minut per pregunta de test i 10 minuts per cas pràctic (<span id="timerCalc"></span>).</span>
      </label>

      <button class="btn primary block lg" id="startBtn" style="margin-top:8px">Començar examen →</button>
      <p class="muted" id="avail" style="margin:.7em 0 0;font-size:.85rem"></p>
    </div>`;

  let cfg = { n:(s.n??20), cases:(s.cases??1), noTimer: !!s.noTimer, weak: !!s.weak };
  function autoMinutes(){ return cfg.n*1 + cfg.cases*10; }
  function updateTimerCalc(){
    const el = byId('timerCalc'); if (!el) return;
    el.textContent = `ara: ${autoMinutes()} minuts`;
  }
  const themeCbs = ()=>$$('input[data-theme]');
  const blockCbs = ()=>$$('input[data-block]');

  function syncBlockToggles(){
    blockCbs().forEach(cb=>{
      const ths = themesOfBlock(cb.dataset.block);
      const on = ths.filter(n=>sel.has(n)).length;
      cb.checked = on===ths.length && on>0;
      cb.indeterminate = on>0 && on<ths.length;
    });
    const allOn = sel.size===allThemes.length;
    byId('selAll').classList.toggle('on', allOn);
    byId('selcount').textContent = allOn ? 'tot el temari' : `${sel.size} tema(es)`;
  }
  function updateAvail(){
    const qs = poolQuestions(sel).length, cs = poolCases(sel).length;
    byId('avail').textContent = sel.size
      ? `Disponibles en aquesta selecció: ${qs} preguntes test · ${cs} casos pràctics.`
      : 'Selecciona com a mínim un tema o un bloc.';
  }
  function refresh(){ syncBlockToggles(); updateAvail(); }

  themeCbs().forEach(cb=>cb.addEventListener('change', ()=>{
    const n=+cb.dataset.theme; cb.checked?sel.add(n):sel.delete(n); refresh();
  }));
  blockCbs().forEach(cb=>cb.addEventListener('change', ()=>{
    themesOfBlock(cb.dataset.block).forEach(n=>{ cb.checked?sel.add(n):sel.delete(n); });
    themeCbs().forEach(t=>{ t.checked = sel.has(+t.dataset.theme); });
    refresh();
  }));
  byId('selAll').addEventListener('click', ()=>{
    allThemes.forEach(n=>sel.add(n)); themeCbs().forEach(t=>t.checked=true); refresh();
  });
  byId('selNone').addEventListener('click', ()=>{
    sel.clear(); themeCbs().forEach(t=>t.checked=false); refresh();
  });
  if (preBlock) byId('themepick').open = true;

  segHandler('cfgN', v=>{cfg.n=+v; store.setSetting('n',+v); updateTimerCalc();});
  segHandler('cfgCases', v=>{cfg.cases=+v; store.setSetting('cases',+v); updateTimerCalc();});
  byId('cfgNoTimer').addEventListener('change', e=>{ cfg.noTimer = e.target.checked; store.setSetting('noTimer', e.target.checked); });
  byId('cfgWeak').addEventListener('change', e=>{ cfg.weak = e.target.checked; store.setSetting('weak', e.target.checked); });
  byId('startBtn').addEventListener('click', ()=>{
    if (!sel.size){ alert('Selecciona com a mínim un tema o un bloc.'); return; }
    if (!cfg.n && !cfg.cases){ alert('Tria com a mínim preguntes de test o un cas pràctic.'); return; }
    if (store.pendingExam() && !confirm('Tens un examen en procés que es perdrà si en comences un de nou. Vols continuar?')) return;
    store.clearPendingExam();
    startExam({ ...cfg, timer: cfg.noTimer ? 0 : autoMinutes(), themes:[...sel] });
  });
  if (pending){
    byId('resumeBtn').addEventListener('click', resumeExam);
    byId('discardBtn').addEventListener('click', ()=>{
      if (confirm('Segur que vols descartar l\'examen en procés?')){ store.clearPendingExam(); render(); }
    });
  }
  refresh();
  updateTimerCalc();
}
function segHandler(id, cb){
  byId(id).addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return;
    byId(id).querySelectorAll('button').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); cb(b.dataset.v);
  });
}
/* themes: Set de números de tema, o null/undefined = tot el temari. */
function asThemeSet(themes){
  if (!themes) return null;
  return themes instanceof Set ? themes : new Set(themes);
}
function poolQuestions(themes){
  const set = asThemeSet(themes);
  return DATA.questions.filter(q => !set || set.has(q.theme));
}
function poolCases(themes){
  const set = asThemeSet(themes);
  return DATA.cases.filter(c => !set || set.has(c.theme));
}

/* ===========================================================================
   EXAMEN EN CURS
   =========================================================================== */
/* Mostreig ponderat cap als temes febles: cada pregunta pesa més si el seu
   tema té una taxa d'error alta (estadístiques dels exàmens desats) o si és
   al banc d'errades. Sense dades, pes neutre (equival a l'atzar). Per no fer
   un examen monotemàtic, cap tema pot superar ~20% de les preguntes quan la
   selecció té prou temes; si el límit deixa l'examen curt, s'omple a l'atzar. */
function weakWeightedPick(pool, n){
  const stats = store.themeStats();
  const bank = store.mistakes();
  const w = pool.map(q=>{
    const st = stats[q.theme];
    let weight = 1;
    if (st && st.qTot >= 3) weight += 2 * (1 - st.qOk/st.qTot);
    if (q.id && bank[q.id]) weight += 1.5;
    return weight;
  });
  const nThemes = new Set(pool.map(q=>q.theme)).size;
  const cap = nThemes >= 5 ? Math.max(2, Math.ceil(n*0.2)) : Infinity;
  const perTheme = {}, out = [];
  const idx = pool.map((_,i)=>i);
  while (out.length < n && idx.length){
    let tot = 0;
    for (const i of idx) tot += w[i];
    if (tot <= 0) break;
    let r = Math.random()*tot, pos = 0;
    for (; pos < idx.length-1; pos++){ r -= w[idx[pos]]; if (r <= 0) break; }
    const q = pool[idx[pos]];
    idx.splice(pos, 1);
    if ((perTheme[q.theme]||0) >= cap) continue;   // tema ple: descarta
    perTheme[q.theme] = (perTheme[q.theme]||0) + 1;
    out.push(q);
  }
  if (out.length < n){
    const chosen = new Set(out);
    for (const q of shuffle(pool)){ if (out.length>=n) break; if (!chosen.has(q)) out.push(q); }
  }
  return shuffle(out);
}

function startExam(cfg){
  const set = cfg.themes ? new Set(cfg.themes) : null;
  let pool = poolQuestions(set);
  if (cfg.mistakesOnly){
    // Mode "banc d'errades": només preguntes fallades pendents de dominar.
    const bank = store.mistakes();
    pool = pool.filter(q => q.id && bank[q.id]);
    cfg = { ...cfg, n: Math.min(pool.length, 60), cases: 0 };
  }
  const picked = cfg.weak && !cfg.mistakesOnly ? weakWeightedPick(pool, cfg.n) : shuffle(pool).slice(0, cfg.n);
  const qs = picked.map(q=>shuffleOptions({...q, options:[...q.options]}));
  const cs = shuffle(poolCases(set)).slice(0, cfg.cases).map(c=>({...c}));
  if (qs.length===0 && cs.length===0){ alert('No hi ha contingut per a aquesta selecció.'); return; }
  examState = {
    cfg, qs, cs,
    answers: new Array(qs.length).fill(null),
    caseAnswers: cs.map(()=>({text:'', checks:{}, claude:null})),
    started: Date.now(),
    deadline: cfg.timer ? Date.now()+cfg.timer*60000 : 0,
    submitted: false,
    isExam: true,
  };
  persistExam();
  examRunning();
}

/* Ruta #/quiz/N: quiz ràpid de 5 preguntes d'un sol tema (sense casos ni temps).
   Es desa a l'historial com un examen normal, així alimenta les estadístiques. */
function quizRoute(num){
  num = Number(num);
  if (!num){ location.hash = '#/' + store.muni() + '/examen'; return; }
  if (store.pendingExam() && !confirm('Tens un examen en procés que es perdrà si comences aquest quiz. Vols continuar?')){
    location.hash = '#/' + store.muni() + '/tema/' + num; return;
  }
  store.clearPendingExam();
  startExam({ themes:[num], n:5, cases:0, timer:5, quick:true });
}

/* Ruta #/casquiz/N: pràctica d'un cas pràctic d'un sol tema (sense test). */
function casquizRoute(num){
  num = Number(num);
  if (!num){ location.hash = '#/' + store.muni() + '/estudi'; return; }
  if (!poolCases(new Set([num])).length){
    alert('Aquest tema encara no té cas pràctic disponible.');
    location.hash = '#/' + store.muni() + '/tema/' + num; return;
  }
  if (store.pendingExam() && !confirm('Tens un examen en procés que es perdrà si comences aquest cas. Vols continuar?')){
    location.hash = '#/' + store.muni() + '/tema/' + num; return;
  }
  store.clearPendingExam();
  startExam({ themes:[num], n:0, cases:1, timer:10, quick:true });
}

/* Ruta #/errades: examen només amb les preguntes del banc d'errades. */
function erradesRoute(){
  if (!store.mistakeCount()){ location.hash = '#/' + store.muni() + '/examen'; return; }
  if (store.pendingExam() && !confirm('Tens un examen en procés que es perdrà. Vols continuar?')){
    location.hash = '#/' + store.muni() + '/examen'; return;
  }
  store.clearPendingExam();
  startExam({ mistakesOnly:true, n:0, cases:0, timer:0 });
}

/* Reprèn l'examen desat (des de la configuració o l'historial). */
function resumeExam(){
  const p = store.pendingExam();
  if (!p){ location.hash = '#/' + store.muni() + '/examen'; return; }
  examState = { ...p, isExam: true, submitted: false };
  if (examState.paused === undefined) examState.paused = false;
  if (examState.remaining === undefined) examState.remaining = 0;
  examRunning();
}

/* Desa l'examen en curs perquè es pugui reprendre si es perd la pàgina. */
function persistExam(){
  if (!examState || !examState.isExam || examState.submitted) return;
  const s = examState;
  store.setPendingExam({
    cfg: s.cfg, qs: s.qs, cs: s.cs,
    answers: s.answers,
    caseAnswers: (s.caseAnswers||[]).map(a=>({ text:a.text||'', checks:a.checks||{}, claude:null })),
    started: s.started, deadline: s.deadline, submitted: false,
    paused: !!s.paused, remaining: s.remaining||0, isExam: true,
  });
}
let _persistT = null;
function persistExamSoon(){ clearTimeout(_persistT); _persistT = setTimeout(persistExam, 500); }

function themeLabel(n){
  const t = DATA.temari.temari.find(x=>x.num===Number(n));
  if(!t) return `<span class="pill">Tema ${n||'—'}</span>`;
  const short = t.title.length>64 ? t.title.slice(0,64).trim()+'…' : t.title;
  return `<span class="pill">Tema ${n}: ${esc(short)}</span>`
    + `<a class="pill resumlink" href="#/tema/${n}" target="_blank" rel="noopener" title="Consulta el resum d'aquest tema">📖 resum</a>`;
}

function examRunning(){
  const { qs, cs } = examState;
  const caseMax = cs.length ? +(45/cs.length).toFixed(2) : 0;
  let html = `<h1 style="margin:0 0 6px">Examen en curs</h1>
    <div class="exambar" id="exambar">
      <div class="exambar-row">
        <div class="progress" style="flex:1;margin:0"><i id="prog" style="width:0%"></i></div>
        ${examState.deadline?`<span class="timer" id="timer">--:--</span>
          <button class="btn ghost timerbtn" id="pauseBtn" type="button" title="Atura/Reprèn el cronòmetre">⏸ Pausa</button>`:''}
      </div>
      <p class="muted" id="progtext" style="font-size:.8rem;margin:6px 0 0"></p>
    </div>`;

  if (qs.length){
    html += `<h2 style="margin-top:18px">Prova 1 · Tipus test <span class="pill">${qs.length} preguntes · 25 punts</span></h2>`;
    qs.forEach((q,i)=>{
      html += `<div class="card" data-q="${i}">
        <div class="qmeta"><span class="qnum">Pregunta ${i+1}</span>
          ${themeLabel(q.theme)}</div>
        <p style="font-weight:500;font-size:1.05rem">${esc(q.q)}</p>
        <div class="opts">${q.options.map((o,oi)=>`
          <button class="opt" data-q="${i}" data-o="${oi}">
            <span class="mk">${'ABCD'[oi]}</span><span>${esc(o)}</span></button>`).join('')}</div>
      </div>`;
    });
  }
  if (cs.length){
    html += `<h2 style="margin-top:22px">Prova 2 · Teòric-pràctica <span class="pill">${cs.length} cas(os) · 45 punts</span></h2>`;
    cs.forEach((c,i)=>{
      html += `<div class="card">
        <div class="qmeta"><span class="qnum">Cas ${i+1}</span>${themeLabel(c.theme)}
          <span class="pill amber">fins a ${fmt(caseMax)} punts</span></div>
        <h3>${esc(c.title)}</h3>
        <p><b>Context.</b> ${esc(c.context)}</p>
        <p><b>Es demana.</b> ${esc(c.prompt)}</p>
        <label class="field"><span>La teva resposta</span>
          <textarea data-case="${i}" placeholder="Redacta la teva resposta jurídica i raonada…"></textarea></label>
      </div>`;
    });
  }
  html += `<div class="sticky-bar"><button class="btn primary block lg" id="submitBtn">Corregir examen</button></div>`;
  view.innerHTML = html;

  // restaura respostes i textos desats (en reprendre)
  examState.answers.forEach((a,i)=>{
    if (a!==null){ const b = view.querySelector(`.opt[data-q="${i}"][data-o="${a}"]`); if (b) b.classList.add('sel'); }
  });
  $$('textarea[data-case]').forEach(ta=>{
    const v = examState.caseAnswers[+ta.dataset.case] && examState.caseAnswers[+ta.dataset.case].text;
    if (v) ta.value = v;
  });

  // handlers test
  $$('.opt').forEach(btn=>btn.addEventListener('click', ()=>{
    const qi=+btn.dataset.q, oi=+btn.dataset.o;
    examState.answers[qi] = (examState.answers[qi]===oi) ? null : oi; // re-tocar deselecciona
    view.querySelectorAll(`.opt[data-q="${qi}"]`).forEach(b=>b.classList.remove('sel'));
    if (examState.answers[qi]!==null) btn.classList.add('sel');
    updateProgress();
    persistExam();
  }));
  // handlers casos
  $$('textarea[data-case]').forEach(ta=>ta.addEventListener('input', ()=>{
    examState.caseAnswers[+ta.dataset.case].text = ta.value;
    persistExamSoon();
  }));
  byId('submitBtn').addEventListener('click', ()=>{
    const unanswered = examState.answers.filter(a=>a===null).length;
    if (unanswered>0 && !confirm(`Tens ${unanswered} pregunta(es) test sense contestar (no resten punts). Vols corregir igualment?`)) return;
    finishExam();
  });
  const pauseBtn = byId('pauseBtn');
  if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
  if (examState.paused === undefined) examState.paused = false;
  if (examState.remaining === undefined) examState.remaining = 0;
  if (examState.paused && pauseBtn){          // reprèn amb el cronòmetre aturat
    pauseBtn.textContent = '▶ Reprèn';
    const el = byId('timer'); if (el){ el.classList.add('paused'); el.textContent = fmtClock(examState.remaining); }
  }
  updateProgress();
  startTimer();
}
function fmtClock(ms){
  const m = Math.max(0,Math.floor(ms/60000)), s = Math.max(0,Math.floor((ms%60000)/1000));
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function updateProgress(){
  const { qs, answers } = examState;
  const done = answers.filter(a=>a!==null).length;
  const pct = qs.length ? Math.round(done/qs.length*100) : 0;
  const p = byId('prog'); if(p) p.style.width = pct+'%';
  const t = byId('progtext'); if(t) t.textContent = `${done} de ${qs.length} preguntes contestades.`;
}
let timerInt=null;
function startTimer(){
  clearInterval(timerInt);
  if (!examState.deadline || examState.paused) return;
  const tick = ()=>{
    const el = byId('timer'); if(!el){ clearInterval(timerInt); return; }
    const left = examState.deadline - Date.now();
    if (left<=0){ clearInterval(timerInt); el.textContent='00:00'; if(!examState.submitted) finishExam(); return; }
    const m = Math.floor(left/60000), s = Math.floor((left%60000)/1000);
    el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    el.classList.toggle('danger', left<=300000); // vermell als últims 5 min
  };
  tick(); timerInt=setInterval(tick,1000);
}
function togglePause(){
  if (!examState.deadline) return;
  const btn = byId('pauseBtn'), el = byId('timer');
  if (examState.paused){            // reprèn
    examState.deadline = Date.now() + (examState.remaining||0);
    examState.paused = false;
    if (btn) btn.textContent = '⏸ Pausa';
    if (el) el.classList.remove('paused');
    startTimer();
  } else {                          // atura
    examState.remaining = examState.deadline - Date.now();
    examState.paused = true;
    clearInterval(timerInt);
    if (btn) btn.textContent = '▶ Reprèn';
    if (el) el.classList.add('paused');
  }
  persistExam();
}

/* ===========================================================================
   RESULTATS
   =========================================================================== */
function finishExam(){
  clearInterval(timerInt);
  examState.submitted = true;
  store.clearPendingExam();          // l'examen ja no està "en procés"
  const { qs, cs, answers } = examState;
  const n = qs.length;
  let correct=0, wrong=0, blank=0;
  qs.forEach((q,i)=>{
    if (answers[i]===null) blank++;
    else if (answers[i]===q.correct) correct++;
    else wrong++;
  });
  const perQ = n ? 25/n : 0;
  const scoreA = n ? Math.max(0, correct*perQ - wrong*perQ*0.25) : null;

  // Banc d'errades: registra el resultat de les contestades (les errades hi
  // entren; 2 encerts seguits en treuen la pregunta).
  store.recordAnswers(qs
    .map((q,i)=> answers[i]===null ? null : {id:q.id, ok:answers[i]===q.correct})
    .filter(Boolean));

  // Part B: prepuntuar amb el motor de criteris (base local, sempre disponible)
  const caseResults = cs.map((c,i)=>{
    const ans = examState.caseAnswers[i];
    const auto = autoMatch(ans.text, c.criteria||[]);
    const checks = {};
    (c.criteria||[]).forEach(cr=>{ checks[cr.id] = auto[cr.id]?.matched || false; });
    ans.checks = checks; ans.auto = auto;
    return { c, ans };
  });
  const caseMax = cs.length ? 45/cs.length : 0;

  const R = { correct, wrong, blank, scoreA, perQ, caseResults, caseMax };
  renderResults(R);
  autoGradeWithClaude(R);   // corregeix amb Claude si hi ha clau; si falla, queda la correcció local
}

/* Correcció automàtica dels casos amb Claude (si hi ha clau API configurada).
   La correcció local per criteris ja s'ha fet i es mostra de seguida; quan
   Claude respon, la nota i la retroacció es substitueixen. Si l'API falla
   (sense connexió, sense crèdit, error), es manté la correcció local i
   s'avisa. */
async function autoGradeWithClaude(R){
  const s = store.settings();
  const key = s.apiKey;
  const answered = R.caseResults.filter(({ans}) => (ans.text||'').trim().length > 0);
  if (!key || !answered.length) return;
  R.claudeState = 'running';
  paintClaudeBanner(R);
  let failed = null;
  for (const {c, ans} of answered){
    try {
      ans.claude = await gradeWithClaude({ apiKey:key, model: s.apiModel, kase:c, answer:ans.text });
    } catch(e){
      failed = (e && e.message) ? e.message : 'error desconegut';
    }
  }
  R.claudeState = failed ? 'error' : 'done';
  R.claudeError = failed;
  // Torna a pintar els resultats només si l'usuari encara els està veient.
  if (examState && examState.submitted && byId('reviewB')) renderResults(R);
}

function claudeBannerHtml(R){
  if (!R.caseResults.length || !store.settings().apiKey) return '';
  if (R.claudeState === 'running')
    return `<div class="notice" id="claudeBanner">⏳ <b>Corregint els casos amb Claude…</b> La nota provisional de sota és la correcció local; s'actualitzarà sola en uns segons.</div>`;
  if (R.claudeState === 'done')
    return `<div class="notice" id="claudeBanner" style="border-color:#bcd6c1;background:var(--green-bg)">✅ <b>Casos corregits amb Claude.</b> La nota i la retroacció dels casos són de Claude; pots ajustar igualment les caselles de la rúbrica.</div>`;
  if (R.claudeState === 'error')
    return `<div class="notice" id="claudeBanner" style="border-color:#e6c2bd;background:var(--red-bg)">⚠️ <b>Claude no disponible</b> (${esc(R.claudeError||'error')}). S'ha aplicat la <b>correcció local per criteris</b>: revisa les caselles de la rúbrica manualment.</div>`;
  return `<div id="claudeBanner" hidden></div>`;
}
function paintClaudeBanner(R){
  const el = byId('claudeBanner');
  if (el) el.outerHTML = claudeBannerHtml(R);
}

function partBTotal(caseResults, caseMax){
  if (!caseResults.length) return null;
  let pts=0;
  caseResults.forEach(({c,ans})=>{
    if (ans.claude && typeof ans.claude.scoreFraction==='number'){
      pts += ans.claude.scoreFraction * caseMax;
    } else {
      pts += scoreFromChecks(c.criteria||[], ans.checks, caseMax).points;
    }
  });
  return +pts.toFixed(2);
}

function renderResults(R){
  const { correct, wrong, blank, scoreA, perQ, caseResults, caseMax } = R;
  const scoreB = partBTotal(caseResults, caseMax);
  const total = (scoreA||0) + (scoreB||0);
  const aOk = scoreA===null || scoreA>=12.5;
  const bOk = scoreB===null || scoreB>=22.5;
  const apte = aOk && bOk && (scoreA!==null || scoreB!==null);

  let html = `<a class="backlink" href="#/examen">← Nou examen</a>
    <h1>Resultats</h1>
    <div class="score">`;
  if (scoreA!==null){
    html += `<div class="scorebox ${scoreA>=12.5?'ok':'ko'}">
      <span class="pill crimson">Prova 1 · Test</span>
      <div class="big">${fmt(scoreA)} <span style="font-size:1rem;color:var(--ink-faint)">/ 25</span></div>
      <p style="margin:.3em 0 0">${correct} encerts · ${wrong} errades · ${blank} en blanc<br>
      <span class="muted">Cada encert ${fmt(perQ)} · cada errada −${fmt(perQ*0.25)} · mínim 12,5</span></p>
    </div>`;
  }
  if (scoreB!==null){
    html += `<div class="scorebox ${scoreB>=22.5?'ok':'ko'}">
      <span class="pill crimson">Prova 2 · Pràctica</span>
      <div class="big">${fmt(scoreB)} <span style="font-size:1rem;color:var(--ink-faint)">/ 45</span></div>
      <p style="margin:.3em 0 0"><span class="muted">Mínim 22,5 · puntuació provisional segons rúbrica</span></p>
    </div>`;
  }
  html += `</div>
    <div class="card" style="margin-top:14px;text-align:center;background:${apte?'var(--green-bg)':'var(--red-bg)'};border-color:${apte?'#bcd6c1':'#e6c2bd'}">
      <div style="font-size:2.4rem">${apte?'✅':'📌'}</div>
      <h2 style="margin:.2em 0">${apte?'Apte/a':'Cal seguir practicant'}</h2>
      <p style="margin:0">Puntuació total de l'oposició (proves 1+2): <b>${fmt(total)} / 70</b>.
      ${scoreA!==null&&scoreA<12.5?'<br>⚠️ La prova 1 no arriba a 12,5 (eliminatòria).':''}
      ${scoreB!==null&&scoreB<22.5?'<br>⚠️ La prova 2 no arriba a 22,5 (eliminatòria).':''}</p>
    </div>`;

  html += themeBreakdownHtml();

  const nMist = store.mistakeCount();
  if (nMist){
    html += `<div class="notice" style="margin-top:14px">🔁 Tens <b>${nMist}</b> pregunta(es) al banc d'errades.
      <a href="#/errades">Repassa-les ara →</a> (amb 2 encerts seguits surten del banc.)</div>`;
  }

  // Detall Part A
  if (examState.qs.length){
    html += `<h2 style="margin-top:22px">Correcció del test</h2><div id="reviewA"></div>`;
  }
  // Detall Part B
  if (caseResults.length){
    const hasKey = !!store.settings().apiKey;
    html += `<h2 style="margin-top:22px">Correcció dels casos</h2>
      ${claudeBannerHtml(R)}
      ${hasKey ? '' : `<div class="notice">La nota dels casos és <b>orientativa</b>: el motor local ha marcat els
      criteris que ha detectat a la teva resposta. Per a una correcció redactada de debò, configura la clau API
      de Claude a <a href="#/config">⚙️ Configuració</a>. El tribunal valora correcció, profunditat, sistemàtica,
      claredat i anàlisi.</div>`}
      <div id="reviewB"></div>`;
  }
  html += `<div class="row" style="margin-top:18px">
      <button class="btn primary" id="saveBtn" ${R.saved?'disabled':''}>${R.saved?'✓ Desat':'💾 Desar a l\'historial'}</button>
      <a class="btn ghost" href="#/examen">Nou examen</a>
    </div>`;
  view.innerHTML = html;

  if (examState.qs.length) renderReviewA();
  if (caseResults.length) renderReviewB(caseResults, caseMax);

  byId('saveBtn').addEventListener('click', e=>{
    if (R.saved) return;
    R.saved = true;
    const scoreB2 = partBTotal(caseResults, caseMax);
    const total2 = (scoreA||0)+(scoreB2||0);
    const nThemes = (examState.cfg.themes||[]).length;
    const totalThemes = DATA.temari.temari.length;
    let label;
    if (examState.cfg.mistakesOnly) label = 'errades';
    else if (nThemes===1) label = 'tema ' + examState.cfg.themes[0];
    else if (!nThemes || nThemes===totalThemes) label = 'all';
    else label = `${nThemes} temes`;
    // estadístiques per tema: encerts test (sobre les contestades) i punts de casos
    const qPerf = {};
    examState.qs.forEach((q,i)=>{
      const a = examState.answers[i];
      if (a===null) return;                       // les no contestades no compten
      const k = q.theme; (qPerf[k] ||= {tot:0,ok:0});
      qPerf[k].tot++; if (a===q.correct) qPerf[k].ok++;
    });
    const casePerf = {};
    caseResults.forEach(({c,ans})=>{
      const pts = (ans.claude && typeof ans.claude.scoreFraction==='number')
        ? ans.claude.scoreFraction*caseMax
        : scoreFromChecks(c.criteria||[], ans.checks, caseMax).points;
      const k = c.theme; (casePerf[k] ||= {pts:0,max:0});
      casePerf[k].pts += pts; casePerf[k].max += caseMax;
      // Detall de l'intent per a l'historial del tema: criteris no coberts
      // (de Claude si ha corregit; si no, de la rúbrica local).
      const missed = (ans.claude && Array.isArray(ans.claude.criteria))
        ? ans.claude.criteria.filter(cr=>!cr.covered).map(cr=>cr.label)
        : (c.criteria||[]).filter(cr=>!ans.checks[cr.id]).map(cr=>cr.label);
      store.addCaseAttempt(k, { date: Date.now(), caseId: c.id, pts: +pts.toFixed(2), max: caseMax, missed });
    });
    store.saveExam({
      id:'ex_'+Date.now(), date:Date.now(),
      block: label, quiz: !!examState.cfg.quick, n: examState.qs.length, cases: caseResults.length,
      correct, wrong, blank,
      scoreA: scoreA, scoreB: scoreB2, total: total2,
      apte: (scoreA===null||scoreA>=12.5) && (scoreB2===null||scoreB2>=22.5) && (scoreA!==null||scoreB2!==null),
      themePerf: { q:qPerf, c:casePerf },        // per recalcular estadístiques per tema (i fusionar entre dispositius)
    });
    e.target.textContent = '✓ Desat'; e.target.disabled = true;
    scheduleGistPush();
  });
}

/* Taula de rendiment per tema d'aquest examen, de pitjor a millor. Només es
   mostra si l'examen cobreix més d'un tema (en un quiz d'un tema no aporta res). */
function themeBreakdownHtml(){
  const { qs, answers } = examState;
  const per = {};
  qs.forEach((q,i)=>{
    const p = per[q.theme] || (per[q.theme] = {tot:0, ok:0, blank:0});
    if (answers[i]===null) p.blank++;
    else { p.tot++; if (answers[i]===q.correct) p.ok++; }
  });
  const themes = Object.keys(per);
  if (themes.length < 2) return '';
  const rows = themes
    .map(th=>({ th:+th, ...per[th], rate: per[th].tot ? per[th].ok/per[th].tot : 0 }))
    .sort((a,b)=>a.rate-b.rate || b.tot-a.tot);
  const tOf = n => DATA.temari.temari.find(x=>x.num===n);
  return `<h2 style="margin-top:22px">Rendiment per tema</h2>
    <p class="muted" style="margin:.2em 0 .6em;font-size:.88rem">De pitjor a millor. Toca un tema per repassar-ne el resum, o fes-ne un quiz ràpid.</p>
    <div class="tablewrap"><table class="rtable">
      <thead><tr><th>Tema</th><th>Encerts</th><th>%</th><th></th></tr></thead><tbody>
      ${rows.map(r=>{
        const ti = tOf(r.th);
        const pct = r.tot ? Math.round(100*r.ok/r.tot) : null;
        const cls = pct===null ? 'none' : pct>=75?'good':pct>=50?'mid':'bad';
        return `<tr>
          <td><a href="#/tema/${r.th}">${r.th}. ${esc(ti?ti.title:'')}</a></td>
          <td>${r.ok} de ${r.tot}${r.blank?` <span class="muted">(+${r.blank} en blanc)</span>`:''}</td>
          <td><span class="tstat ${cls}">${pct===null?'—':pct+'%'}</span></td>
          <td><a href="#/quiz/${r.th}">Quiz →</a></td></tr>`;
      }).join('')}
    </tbody></table></div>`;
}

function renderReviewA(){
  const { qs, answers } = examState;
  const wrap = byId('reviewA');
  wrap.innerHTML = qs.map((q,i)=>{
    const a = answers[i];
    const opts = q.options.map((o,oi)=>{
      let cls='opt';
      if (oi===q.correct) cls+=' correct';
      else if (oi===a) cls+=' wrong';
      return `<div class="${cls}"><span class="mk">${'ABCD'[oi]}</span><span>${esc(o)}</span></div>`;
    }).join('');
    const srcKey = q.source;
    const src = srcKey ? normRef(srcKey) : null;
    const status = a===null?'<span class="pill">En blanc</span>'
      : a===q.correct?'<span class="pill green">Correcta</span>':'<span class="pill" style="background:var(--red-bg);color:var(--red);border-color:#e6c2bd">Incorrecta</span>';
    return `<div class="card">
      <div class="qmeta"><span class="qnum">Pregunta ${i+1}</span> ${status} ${themeLabel(q.theme)}</div>
      <p style="font-weight:500">${esc(q.q)}</p>${opts}
      ${q.explain?`<div class="explain">${linkifyLaw(esc(q.explain), q.source||null)}
        ${src?`<br><a class="src" href="${esc(src.url)}" target="_blank" rel="noopener noreferrer">${esc(src.name)}${q.article?', '+esc(q.article):''} ↗</a>`:''}</div>`:''}
    </div>`;
  }).join('');
}

function renderReviewB(caseResults, caseMax){
  const wrap = byId('reviewB');
  wrap.innerHTML = caseResults.map(({c,ans},i)=>`
    <div class="card" data-caseidx="${i}">
      <div class="qmeta"><span class="qnum">Cas ${i+1}</span><span class="pill">Tema ${c.theme}</span>
        <span class="pill amber" data-pts="${i}">—</span></div>
      <h3>${esc(c.title)}</h3>
      <details><summary style="cursor:pointer;font-weight:600">Veure l'enunciat i la teva resposta</summary>
        <p style="margin-top:8px"><b>Context.</b> ${esc(c.context)}</p>
        <p><b>Es demana.</b> ${esc(c.prompt)}</p>
        <div class="model"><h4>La teva resposta</h4><p>${ans.text?esc(ans.text):'<i>(en blanc)</i>'}</p></div>
      </details>
      <h4 style="font-family:var(--serif);margin:14px 0 6px">Rúbrica de correcció</h4>
      <p class="muted" style="font-size:.85rem;margin:0 0 8px">Marca els criteris que has cobert. La nota es recalcula sola.</p>
      <div class="crits">${(c.criteria||[]).map(cr=>`
        <label class="crit ${ans.checks[cr.id]?'on':''}">
          <input type="checkbox" data-case="${i}" data-crit="${cr.id}" ${ans.checks[cr.id]?'checked':''}>
          <span>${esc(cr.label)}${ans.auto&&ans.auto[cr.id]&&ans.auto[cr.id].hits.length?` <span class="muted">(detectat: ${ans.auto[cr.id].hits.map(esc).join(', ')})</span>`:''}</span>
          <span class="w">${cr.weight||1} pts</span>
        </label>`).join('')}</div>
      <div class="model"><h4>Resposta model</h4>${mdToHtml(c.model, (c.sources||[])[0]||null)}
        ${c.sources?`<div class="srclist" style="margin-top:8px">${c.sources.map(k=>{const n=normRef(k);return `<a class="srcchip" href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${esc(n.name)} ↗</a>`;}).join('')}</div>`:''}
      </div>
      <details style="margin-top:10px"><summary style="cursor:pointer;font-weight:600">⚙️ Correcció amb Claude (API, opcional)</summary>
        <div class="notice" style="margin-top:8px">Correcció real redactada per Claude. Necessita una clau API pròpia
        (<a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>).
        La clau es guarda només al teu navegador i mai s'envia enlloc més que a l'API d'Anthropic.</div>
        <label class="field"><span>Clau API (sk-ant-…)</span>
          <input type="password" class="apikey" placeholder="sk-ant-..." value="${esc(store.settings().apiKey||'')}"></label>
        <label class="field"><span>Model</span>
          <input type="text" class="apimodel" value="${esc(store.settings().apiModel||'claude-sonnet-5')}"></label>
        <button class="btn" data-claude="${i}">Corregir aquest cas amb Claude</button>
        <div class="claudeout" style="margin-top:10px"></div>
      </details>
    </div>`).join('');

  function recalc(){
    caseResults.forEach(({c,ans},i)=>{
      const badge = wrap.querySelector(`[data-pts="${i}"]`);
      if (!badge) return;
      if (ans.claude && typeof ans.claude.scoreFraction === 'number'){
        badge.textContent = `${fmt(ans.claude.scoreFraction*caseMax)} / ${fmt(caseMax)} (Claude)`;
      } else {
        const sc = scoreFromChecks(c.criteria||[], ans.checks, caseMax);
        badge.textContent = `${fmt(sc.points)} / ${fmt(caseMax)} punts`;
      }
    });
  }
  // Si Claude ja ha corregit (correcció automàtica), mostra la seva correcció
  // de manera destacada abans de la rúbrica.
  caseResults.forEach(({ans},i)=>{
    if (!ans.claude) return;
    const cardEl = wrap.querySelector(`[data-caseidx="${i}"]`);
    if (!cardEl) return;
    const holder = document.createElement('div');
    holder.innerHTML = renderClaude(ans.claude, caseMax);
    const anchor = cardEl.querySelector('h4');
    cardEl.insertBefore(holder.firstElementChild, anchor);
  });
  wrap.querySelectorAll('input[type=checkbox]').forEach(cb=>cb.addEventListener('change',()=>{
    const ci=+cb.dataset.case, cr=cb.dataset.crit;
    caseResults[ci].ans.checks[cr]=cb.checked;
    cb.closest('.crit').classList.toggle('on', cb.checked);
    recalc();
  }));
  wrap.querySelectorAll('[data-claude]').forEach(btn=>btn.addEventListener('click', async ()=>{
    const i=+btn.dataset.claude;
    const cardEl = btn.closest('.card');
    const apiKey = cardEl.querySelector('.apikey').value.trim();
    const model = cardEl.querySelector('.apimodel').value.trim();
    const out = cardEl.querySelector('.claudeout');
    if (!apiKey){ out.innerHTML='<p style="color:var(--red)">Cal una clau API.</p>'; return; }
    store.setSetting('apiKey', apiKey); store.setSetting('apiModel', model);
    btn.disabled=true; out.innerHTML='<p class="muted">Corregint amb Claude…</p>';
    try{
      const res = await gradeWithClaude({ apiKey, model, kase: caseResults[i].c, answer: caseResults[i].ans.text });
      caseResults[i].ans.claude = res;
      out.innerHTML = renderClaude(res, caseMax);
      const badge = wrap.querySelector(`[data-pts="${i}"]`);
      if (badge) badge.textContent = `${fmt((res.scoreFraction||0)*caseMax)} / ${fmt(caseMax)} (Claude)`;
    }catch(err){
      out.innerHTML = `<p style="color:var(--red)">${esc(err.message)}</p>`;
    }finally{ btn.disabled=false; }
  }));
  recalc();
}

function renderClaude(res, caseMax){
  const crits = (res.criteria||[]).map(c=>`<li>${c.covered?'✅':'❌'} ${esc(c.label)}${c.comment?` — <span class="muted">${esc(c.comment)}</span>`:''}</li>`).join('');
  return `<div class="model">
    <h4>Correcció de Claude — ${fmt((res.scoreFraction||0)*caseMax)} / ${fmt(caseMax)} punts</h4>
    <p>${esc(res.feedback||'')}</p>
    ${crits?`<ul>${crits}</ul>`:''}
    ${res.strengths?.length?`<p><b>Punts forts:</b> ${res.strengths.map(esc).join('; ')}</p>`:''}
    ${res.improve?.length?`<p><b>A millorar:</b> ${res.improve.map(esc).join('; ')}</p>`:''}
  </div>`;
}

/* ===========================================================================
   VISTA: HISTORIAL D'UN TEMA (què has fallat al test i als casos)
   =========================================================================== */
function temahistView(num){
  num = parseInt(num,10);
  const t = DATA.temari.temari.find(x=>x.num===num);
  if (!t){ view.innerHTML='<p>Tema no trobat.</p>'; return; }
  const stats = store.themeStats()[num];
  const pctQ = stats && stats.qTot ? Math.round(stats.qOk/stats.qTot*100) : null;
  const pctC = stats && stats.cMax ? Math.round(stats.cPts/stats.cMax*100) : null;
  const cls = p => p>=75?'good':p>=50?'mid':'bad';

  // Evolució del tema als exàmens desats (del més antic al més recent).
  const evo = store.exams().slice().reverse()
    .map(e=>{
      const q = e.themePerf && e.themePerf.q && e.themePerf.q[num];
      const c = e.themePerf && e.themePerf.c && e.themePerf.c[num];
      if (!q && !c) return null;
      return { date: e.date, q, c };
    }).filter(Boolean);

  // Preguntes del tema actualment al banc d'errades.
  const bank = store.mistakes();
  const failed = DATA.questions
    .filter(q => q.theme === num && q.id && bank[q.id])
    .map(q => ({ q, info: bank[q.id] }));

  // Intents de casos amb els criteris fallats.
  const attempts = (store.caseAttempts()[num] || []).slice().reverse();

  const evoHtml = evo.length ? `<div class="card"><h2 style="margin:0 0 6px">📈 Evolució en aquest tema</h2>
    ${evo.map(x=>{
      const d = new Date(x.date);
      const ds = d.toLocaleDateString('ca-ES',{day:'2-digit',month:'short',year:'numeric'});
      const parts = [];
      if (x.q) parts.push(`test ${x.q.ok}/${x.q.tot}`);
      if (x.c) parts.push(`cas ${fmt(x.c.pts)}/${fmt(x.c.max)} punts`);
      return `<div class="histrow"><span class="muted">${ds}</span><span>${parts.join(' · ')}</span></div>`;
    }).join('')}</div>` : '';

  const failedHtml = failed.length ? `<div class="card">
    <h2 style="margin:0 0 6px">❌ Preguntes que tens pendents de dominar</h2>
    <p class="muted" style="margin:0 0 10px;font-size:.85rem">Són al banc d'errades: 2 encerts seguits les treuen.</p>
    ${failed.map(({q,info})=>`
      <div class="failq">
        <p style="margin:0 0 4px;font-weight:500">${esc(q.q)} <span class="pill amber">${info.fails} errada(es)</span></p>
        <p style="margin:0 0 4px" class="okline">✓ ${esc(q.options[q.correct])}</p>
        <p class="muted" style="margin:0;font-size:.85rem">${esc(q.explain||'')}${q.article?` <i>(${esc(q.article)})</i>`:''}</p>
      </div>`).join('')}
    </div>` : '';

  const attemptsHtml = attempts.length ? `<div class="card">
    <h2 style="margin:0 0 6px">⚖️ Intents de casos pràctics</h2>
    ${attempts.map(a=>{
      const d = new Date(a.date);
      const ds = d.toLocaleDateString('ca-ES',{day:'2-digit',month:'short',year:'numeric'});
      const p = a.max ? Math.round(a.pts/a.max*100) : 0;
      return `<div class="failq">
        <p style="margin:0 0 4px"><span class="muted">${ds}</span> · <b>${fmt(a.pts)}/${fmt(a.max)}</b>
          <span class="tstat ${cls(p)}">${p}%</span></p>
        ${a.missed && a.missed.length
          ? `<p style="margin:0;font-size:.9rem">Criteris fallats: ${a.missed.map(esc).join(' · ')}</p>`
          : '<p class="muted" style="margin:0;font-size:.9rem">Tots els criteris coberts.</p>'}
      </div>`;
    }).join('')}</div>` : '';

  view.innerHTML = `
    <a class="backlink" href="#/estudi">← Tornar al temari</a>
    <div class="eyebrow">Tema ${num} · ${esc(t.blockName||'')}</div>
    <h1 style="font-size:1.5rem">${esc(t.title)}</h1>
    <div class="row" style="margin:10px 0 16px;gap:8px;flex-wrap:wrap">
      ${pctQ!==null?`<span class="tstat ${cls(pctQ)}">test ${pctQ}% (${stats.qOk}/${stats.qTot})</span>`:'<span class="tstat none">test: sense dades</span>'}
      ${pctC!==null?`<span class="tstat ${cls(pctC)}">casos ${pctC}%</span>`:'<span class="tstat none">casos: sense dades</span>'}
      <a class="pill practbtn" href="#/quiz/${num}">⚡ Quiz</a>
      <a class="pill practbtn" href="#/casquiz/${num}">⚖️ Cas</a>
      <a class="pill" href="#/tema/${num}">📖 Resum</a>
    </div>
    ${evoHtml}${failedHtml}${attemptsHtml}
    ${!evo.length && !failed.length && !attempts.length
      ? '<div class="card center"><p class="muted">Encara no has practicat aquest tema. Fes-ne un quiz o un cas!</p></div>' : ''}`;
}

/* ===========================================================================
   VISTA: HISTORIAL
   =========================================================================== */
/* Gràfic de tendència (SVG inline, sense llibreries): percentatge de cada
   examen desat sobre el seu màxim (així un quiz de 5 preguntes i un examen
   complet són comparables), del més antic al més recent. Línia de referència
   al 50%, el mínim de cada prova per ser apte. */
function trendChartHtml(exams){
  const list = exams.slice(0, 20).slice().reverse();
  if (list.length < 2) return '';
  const pct = e => {
    const max = (e.n?25:0) + (e.cases?45:0);
    return max ? Math.max(0, Math.min(100, (e.total||0)/max*100)) : 0;
  };
  const W=340, H=130, PX=12, PY=14;
  const xs = i => PX + i*(W-2*PX)/(list.length-1);
  const ys = p => H-PY - p*(H-2*PY)/100;
  const pts = list.map((e,i)=>`${xs(i).toFixed(1)},${ys(pct(e)).toFixed(1)}`).join(' ');
  const dots = list.map((e,i)=>
    `<circle cx="${xs(i).toFixed(1)}" cy="${ys(pct(e)).toFixed(1)}" r="3.4" fill="${e.apte?'#2e7d4f':'#b3402a'}"><title>${Math.round(pct(e))}%</title></circle>`).join('');
  return `<div class="card">
    <div class="between"><h2 style="margin:0">📈 Evolució</h2>
      <span class="muted" style="font-size:.82rem">últims ${list.length} exàmens</span></div>
    <svg viewBox="0 0 ${W} ${H}" class="trend" role="img" aria-label="Evolució de la nota dels exàmens">
      <line x1="${PX}" y1="${ys(50).toFixed(1)}" x2="${W-PX}" y2="${ys(50).toFixed(1)}" stroke="#c9a227" stroke-dasharray="4 3" stroke-width="1"/>
      <text x="${W-PX}" y="${(ys(50)-4).toFixed(1)}" text-anchor="end" font-size="9" fill="#c9a227">50% (mínim)</text>
      <polyline points="${pts}" fill="none" stroke="#9e1632" stroke-width="2" stroke-linejoin="round"/>
      ${dots}
    </svg>
    <p class="muted" style="margin:.4em 0 0;font-size:.82rem">Percentatge de la nota sobre el màxim de cada examen
    (verd: apte · vermell: no apte).</p>
  </div>`;
}

/* Top de temes més fluixos segons les estadístiques acumulades (mínim 3
   preguntes contestades del tema perquè el percentatge digui alguna cosa). */
function weakThemesHtml(){
  const stats = store.themeStats();
  const rows = Object.entries(stats)
    .filter(([,v])=>v.qTot>=3)
    .map(([k,v])=>({ num:+k, pct:Math.round(v.qOk/v.qTot*100), tot:v.qTot }))
    .filter(r=>r.pct<80)
    .sort((a,b)=>a.pct-b.pct)
    .slice(0,5);
  if (!rows.length) return '';
  const tOf = n => (DATA.temari.temari||[]).find(x=>x.num===n);
  return `<div class="card">
    <h2 style="margin:0 0 4px">🎯 Temes a reforçar</h2>
    <p class="muted" style="margin:0 0 8px;font-size:.85rem">Els temes on falles més al test (mínim 3 preguntes contestades).</p>
    ${rows.map(r=>{
      const t = tOf(r.num);
      const cls = r.pct>=75?'good':r.pct>=50?'mid':'bad';
      return `<div class="weakrow">
        <a href="#/tema/${r.num}"><b>${r.num}.</b> ${esc(t?t.title:'')}</a>
        <span class="tstat ${cls}">test ${r.pct}%</span>
        <a class="pill" href="#/quiz/${r.num}">⚡ quiz</a>
      </div>`;
    }).join('')}
  </div>`;
}

function historial(){
  const exams = store.exams();
  const studied = store.studied();
  const sd = Object.keys(studied).length;
  let html = `<h1>Historial i progrés</h1>`;
  html += `<div class="card"><div class="between">
      <div><b>${sd} / 90</b> temes repassats</div>
      <div class="progress" style="flex:1;max-width:240px"><i style="width:${Math.round(sd/90*100)}%"></i></div>
    </div></div>`;
  html += trendChartHtml(exams);
  html += weakThemesHtml();

  const pending = store.pendingExam();
  if (pending){
    const pAns = (pending.answers||[]).filter(a=>a!==null).length;
    const pQ = (pending.qs||[]).length, pC = (pending.cs||[]).length;
    html += `<div class="card pendingcard">
      <div class="between"><b>⏳ Examen en procés</b><span class="pill amber">en procés</span></div>
      <p class="muted" style="margin:.3em 0 .7em">${pAns} de ${pQ} preguntes contestades${pC?` · ${pC} cas(os)`:''}.</p>
      <div class="row"><button class="btn primary" id="histResume">▶ Reprèn l'examen</button>
      <button class="btn ghost" id="histDiscard">Descarta'l</button></div>
    </div>`;
  }

  if (!exams.length){
    html += `<div class="card center"><p class="muted">Encara no has desat cap examen.</p>
      <a class="btn primary" href="#/examen">Fer el primer examen</a></div>`;
  } else {
    html += `<div class="between" style="margin:16px 0 8px"><h2 style="margin:0">Exàmens (${exams.length})</h2>
      <button class="btn ghost" id="clearAll">Buidar tot</button></div>`;
    html += exams.map(e=>{
      const d = new Date(e.date);
      const ds = d.toLocaleDateString('ca-ES',{day:'2-digit',month:'short',year:'numeric'})+' '+d.toLocaleTimeString('ca-ES',{hour:'2-digit',minute:'2-digit'});
      return `<div class="hist-item">
        <div class="between">
          <div><b>${fmt(e.total)} / 70</b> ${e.apte?'<span class="pill green">Apte</span>':'<span class="pill amber">No apte</span>'}
            <div class="muted" style="font-size:.85rem">${ds}</div></div>
          <button class="btn ghost" data-del="${esc(e.id)}">Esborrar</button>
        </div>
        <div class="row" style="margin-top:8px;font-size:.88rem">
          ${e.n?`<span class="pill">Test: ${fmt(e.scoreA)}/25 · ${e.correct}✓ ${e.wrong}✗ ${e.blank}○</span>`:''}
          ${e.cases?`<span class="pill">Pràctica: ${fmt(e.scoreB)}/45 · ${e.cases} cas(os)</span>`:''}
          ${e.quiz?'<span class="pill">⚡ quiz</span>':''}
          ${e.block&&e.block!=='all'?`<span class="pill">${esc(e.block)}</span>`:''}
        </div></div>`;
    }).join('');
  }
  view.innerHTML = html;
  const clr = byId('clearAll');
  if (clr) clr.addEventListener('click', ()=>{ if(confirm('Esborrar tot l\'historial d\'aquesta oposició?')){ store.clearExams(); render(); }});
  $$('[data-del]').forEach(b=>b.addEventListener('click', ()=>{ store.deleteExam(b.dataset.del); render(); }));
  const hr = byId('histResume'); if (hr) hr.addEventListener('click', resumeExam);
  const hd = byId('histDiscard'); if (hd) hd.addEventListener('click', ()=>{
    if (confirm('Segur que vols descartar l\'examen en procés?')){ store.clearPendingExam(); render(); }
  });
}

/* Targeta de sincronització (a la pantalla d'inici). El PIN i el token es
   comparteixen entre municipis; la sincronització puja/baixa el progrés de TOTS. */
function syncCardHtml(){
  return `
    <div class="card" id="synccard" style="margin-top:18px">
      <h2 style="margin:0 0 4px">🔄 Sincronitza entre dispositius</h2>
      <p class="muted" style="margin:0 0 10px">El progrés (temes repassats i exàmens de <b>totes</b> les oposicions)
      es desa a cada dispositiu. Amb aquesta opció es puja i es baixa <b>automàticament</b> a un Gist <b>privat</b> del teu
      compte de GitHub, xifrat amb un <b>PIN</b>. Ningú no hi té accés sense el PIN i el token es desa només
      en aquest dispositiu. Passos: 1) crea un token de GitHub
      <a href="https://github.com/settings/tokens/new?scopes=gist&description=Simulador%20oposicions" target="_blank" rel="noopener noreferrer">aquí (només permís «gist») ↗</a>;
      2) posa un PIN i el token i activa-ho. Al segon dispositiu, fes servir <b>el mateix PIN</b> i el seu token.</p>
      <label class="field"><span>PIN (mínim 4 caràcters · el mateix a tots els dispositius)</span>
        <input id="syncpin" type="password" inputmode="numeric" autocomplete="off" placeholder="El teu PIN"></label>
      <label class="field"><span>Token de GitHub (ghp_… o github_pat_…)</span>
        <input id="ghtoken" type="password" autocomplete="off" placeholder="El token es desa només en aquest dispositiu"></label>
      <div class="row" style="gap:8px">
        <button class="btn primary" id="ghActivate">Activa la sincronització automàtica</button>
        <button class="btn ghost" id="ghSyncNow" hidden>Sincronitza ara</button>
        <button class="btn ghost" id="ghDisable" hidden>Desactiva</button>
      </div>
      <p id="ghstatus" class="muted" style="margin:.7em 0 0"></p>
    </div>`;
}

function setupSync(){
  const pinEl = byId('syncpin');
  if (!pinEl || !byId('ghActivate')) return;   // no hi ha targeta de sincronització a la vista
  const getPin = ()=>{
    const p = (pinEl.value||'').trim();
    if (p.length<4){ gistStatus('Escriu un PIN de com a mínim 4 caràcters.', 'err'); pinEl.focus(); return null; }
    return p;
  };

  // --- Sincronització automàtica amb Gist de GitHub ---
  const tokenEl = byId('ghtoken');
  const btnAct = byId('ghActivate'), btnNow = byId('ghSyncNow'), btnOff = byId('ghDisable');
  function paintGh(){
    const on = !!(store.settings().ghAuto && store.settings().ghToken);
    btnAct.hidden = on; btnNow.hidden = !on; btnOff.hidden = !on;
    if (on){
      tokenEl.value = store.settings().ghToken;
      pinEl.value = store.settings().ghPin || '';
      const last = store.settings().syncLast;
      gistStatus(on ? ('Activada ✓' + (last?(' · última sincronització a les '+new Date(last).toLocaleTimeString('ca-ES',{hour:'2-digit',minute:'2-digit'})):'')) : '', 'ok');
    }
  }
  btnAct.addEventListener('click', async ()=>{
    const pin = getPin(); if(!pin) return;      // reutilitza el PIN de dalt (mateix a tots dos dispositius)
    const tk = (tokenEl.value||'').trim();
    if (tk.length<20){ gistStatus('Enganxa un token de GitHub vàlid.', 'err'); tokenEl.focus(); return; }
    store.setSetting('ghToken', tk);
    store.setSetting('ghPin', pin);
    store.setSetting('ghGistId', '');           // que el torni a cercar/crear
    store.setSetting('ghAuto', true);
    gistInited = false;
    const r = await gistSyncNow({ pull:true, push:true });
    if (r.ok){ paintGh(); toast('Sincronització automàtica activada ✓'); if (r.changed) setTimeout(()=>render(), 900); }
    else { store.setSetting('ghAuto', false); }  // no deixar-la activa si ha fallat
  });
  btnNow.addEventListener('click', async ()=>{
    const r = await gistSyncNow({ pull:true, push:true });
    if (r.ok && r.changed) setTimeout(()=>render(), 900);
  });
  btnOff.addEventListener('click', ()=>{
    store.setSetting('ghAuto', false); store.setSetting('ghToken', '');
    store.setSetting('ghGistId', ''); store.setSetting('ghPin', '');
    gistStatus('Sincronització automàtica desactivada.', '');
    paintGh();
  });
  paintGh();
}

/* ===========================================================================
   VISTA: FONTS OFICIALS
   =========================================================================== */
function fonts(){
  const norms = DATA.temari.norms;
  const items = Object.keys(norms).map(k=>{
    const n=norms[k];
    return `<a class="srcchip" href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${esc(n.name)} ↗</a>`;
  }).join('');
  view.innerHTML = `
    <a class="backlink" href="#/">← Inici</a>
    <h1>Fonts oficials del temari</h1>
    <p class="lead">Tota la normativa del temari amb enllaços als textos consolidats. S'obren en una
    pestanya nova; al mòbil, manté premut per obrir-los en una finestra nova si cal.</p>
    <div class="card"><div class="srclist">${items}</div></div>
    <div class="card">
      <h3>Portals de referència</h3>
      <div class="srclist">
        <a class="srcchip" href="https://www.boe.es/legislacion/" target="_blank" rel="noopener noreferrer">BOE · Legislació consolidada ↗</a>
        <a class="srcchip" href="https://portaljuridic.gencat.cat" target="_blank" rel="noopener noreferrer">Portal Jurídic de Catalunya ↗</a>
        <a class="srcchip" href="https://www.montornes.cat" target="_blank" rel="noopener noreferrer">Ajuntament de Montornès ↗</a>
        <a class="srcchip" href="https://bop.diba.cat" target="_blank" rel="noopener noreferrer">BOPB (Diputació de Barcelona) ↗</a>
      </div>
    </div>
    <div class="notice">⚠️ <b>Urbanisme:</b> el TRLUC (DL 1/2010) va ser modificat per la Llei 11/2025 i el
    Decret llei 2/2025, vigents des del 31-12-2025. Contrasta sempre amb el text consolidat del Portal Jurídic.</div>
    <footer class="foot">Material d'estudi no oficial · Convocatòria BOPB 18-3-2026, CVE 202610051525.
    Verifica sempre el contingut amb la normativa vigent.</footer>`;
}

/* ---- mini markdown per a respostes model ---- */
function mdToHtml(md, defaultLaw){
  if(!md) return '';
  const lines = String(md).split('\n');
  let html='', inList=false;
  for (let ln of lines){
    ln=ln.trimEnd();
    if (/^[-•]\s+/.test(ln)){
      if(!inList){html+='<ul>';inList=true;}
      html+=`<li>${linkifyLaw(esc(ln.replace(/^[-•]\s+/,'')), defaultLaw)}</li>`;
    } else {
      if(inList){html+='</ul>';inList=false;}
      if(ln.trim()) html+=`<p>${linkifyLaw(esc(ln), defaultLaw)}</p>`;
    }
  }
  if(inList) html+='</ul>';
  return html;
}
