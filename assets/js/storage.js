/* Persistència local (localStorage). 100% al navegador, sense servidor.
   Estructura (multi-municipi):
     { settings:{...GLOBAL...}, munis:{ <id>:{ exams:[], studied:{}, mistakes:{}, pendingExam } } }
   - settings és GLOBAL (token/PIN de sincronització, clau d'API, municipi actiu).
   - el progrés (exams, temes repassats, examen en procés) es desa PER MUNICIPI.
   - la sincronització puja/baixa el progrés de TOTS els municipis alhora. */
const KEY = 'montornes_oposicio_v1';
const DEFAULT_MUNI = 'montornes';

function readAll(){
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch(e){ return {}; }
}
function writeAll(obj){
  try { localStorage.setItem(KEY, JSON.stringify(obj)); return true; }
  catch(e){ console.warn('No s\'ha pogut desar:', e); return false; }
}
/* Migració des de l'estructura antiga (un sol municipi, claus a l'arrel) a la
   nova (progrés dins de munis[<id>]). No destructiva. */
function normalize(all){
  if (!all.munis) all.munis = {};
  // Estructura antiga: exams/studied/pendingExam a l'arrel → Montornès.
  if (all.exams || all.studied || all.pendingExam){
    const m = all.munis[DEFAULT_MUNI] || (all.munis[DEFAULT_MUNI] = {});
    if (all.exams && !m.exams) m.exams = all.exams;
    if (all.studied && !m.studied) m.studied = all.studied;
    if (all.pendingExam && !m.pendingExam) m.pendingExam = all.pendingExam;
    delete all.exams; delete all.studied; delete all.pendingExam;
  }
  if (!all.settings) all.settings = {};
  return all;
}
function read(){ return normalize(readAll()); }
function muniBucket(all, id){
  id = id || all.settings.municipi || DEFAULT_MUNI;
  return all.munis[id] || (all.munis[id] = {});
}

export const store = {
  // --- municipi actiu (global) ---
  muni(){ return read().settings.municipi || null; },
  setMuni(id){ const all = read(); all.settings.municipi = id; writeAll(all); },

  // --- accés genèric al bucket del municipi actiu ---
  get(path, fallback){
    const b = muniBucket(read());
    return path in b ? b[path] : fallback;
  },
  set(path, value){
    const all = read();
    const b = muniBucket(all);
    b[path] = value;
    return writeAll(all);
  },
  // --- historial d'exàmens (per municipi) ---
  exams(){ return this.get('exams', []); },
  saveExam(exam){
    const list = this.exams();
    list.unshift(exam);
    this.set('exams', list.slice(0, 100));
  },
  deleteExam(id){
    this.set('exams', this.exams().filter(e => e.id !== id));
  },
  clearExams(){ this.set('exams', []); },
  // --- examen en procés (per municipi) ---
  pendingExam(){ return this.get('pendingExam', null); },
  setPendingExam(state){ this.set('pendingExam', state); },
  clearPendingExam(){ this.set('pendingExam', null); },
  // --- estadístiques per tema, DERIVADES dels exàmens del municipi actiu ---
  themeStats(){
    const ts = {};
    const ensure = k => (ts[k] || (ts[k] = { qTot:0, qOk:0, cPts:0, cMax:0 }));
    this.exams().forEach(e=>{
      const tp = e.themePerf; if (!tp) return;
      for (const [th, v] of Object.entries(tp.q||{})){ const x=ensure(th); x.qTot+=v.tot; x.qOk+=v.ok; }
      for (const [th, v] of Object.entries(tp.c||{})){ const x=ensure(th); x.cPts+=v.pts; x.cMax+=v.max; }
    });
    return ts;
  },
  // --- banc d'errades (per municipi): preguntes fallades en exàmens ---
  // { <qid>: {fails, lastFail, streak} } — streak = encerts seguits des de
  // l'última errada; amb 2 encerts seguits la pregunta surt del banc.
  mistakes(){ return this.get('mistakes', {}); },
  mistakeCount(){ return Object.keys(this.mistakes()).length; },
  // Registra en bloc el resultat de cada pregunta d'un examen: [{id, ok}].
  // ok=true suma un encert (2 seguits treuen la pregunta del banc);
  // ok=false registra una errada. Les preguntes en blanc no s'hi passen.
  recordAnswers(list){
    const m = this.mistakes();
    for (const {id, ok} of list||[]){
      if (!id) continue;
      if (ok){
        if (!m[id]) continue;
        m[id].streak = (m[id].streak||0) + 1;
        if (m[id].streak >= 2) delete m[id];   // dominada: fora del banc
      } else {
        const e = m[id] || (m[id] = { fails:0, lastFail:0, streak:0 });
        e.fails++; e.lastFail = Date.now(); e.streak = 0;
      }
    }
    this.set('mistakes', m);
  },

  // --- progrés d'estudi (temes repassats, per municipi) ---
  // Valor per tema: número (format antic, timestamp) o {t, n} on t és l'últim
  // repàs i n el nombre de repassos (per al repàs espaiat: 7 dies el 1r cop,
  // 30 dies a partir del 2n).
  studied(){ return this.get('studied', {}); },
  studiedInfo(num){
    const v = this.studied()[num];
    if (!v) return null;
    return typeof v === 'number' ? { t:v, n:1 } : { t:v.t||0, n:v.n||1 };
  },
  toggleStudied(num){
    const s = this.studied();
    if (s[num]) delete s[num]; else s[num] = { t:Date.now(), n:1 };
    this.set('studied', s);
    return !!s[num];
  },
  // "Repassat avui": actualitza la data de l'últim repàs i suma un repàs.
  touchStudied(num){
    const s = this.studied();
    if (!s[num]) return;
    const i = typeof s[num]==='number' ? { t:s[num], n:1 } : s[num];
    s[num] = { t:Date.now(), n:(i.n||1)+1 };
    this.set('studied', s);
  },
  // --- config de l'usuari (GLOBAL, compartida entre municipis) ---
  settings(){ return read().settings; },
  setSetting(k, v){
    const all = read(); all.settings[k] = v; writeAll(all);
  },

  // --- sincronització entre dispositius: TOT (tots els municipis) ---
  exportBundle(){
    const all = read();
    const munis = {};
    for (const [id, b] of Object.entries(all.munis||{})){
      munis[id] = { exams: b.exams||[], studied: b.studied||{}, mistakes: b.mistakes||{} };
    }
    return { v:2, ts:Date.now(), munis };
  },
  importBundle(b){
    if (!b || typeof b!=='object') throw new Error('Dades no vàlides.');
    const all = read();
    // Compatibilitat amb el format antic (v1: exams/studied a l'arrel → Montornès).
    const remoteMunis = b.munis || { [DEFAULT_MUNI]: { exams:b.exams||[], studied:b.studied||{} } };
    for (const [id, rm] of Object.entries(remoteMunis)){
      const local = all.munis[id] || (all.munis[id] = {});
      // Exàmens: unió per id
      const byId = {};
      (local.exams||[]).forEach(e=>{ if(e&&e.id) byId[e.id]=e; });
      (rm.exams||[]).forEach(e=>{ if(e&&e.id && !byId[e.id]) byId[e.id]=e; });
      local.exams = Object.values(byId).sort((a,b)=>(b.date||0)-(a.date||0)).slice(0,200);
      // Temes repassats: unió; si el tema és als dos costats, es queda la data
      // i el nombre de repassos més alts (compatible amb el format antic, número).
      const s = local.studied || (local.studied = {});
      const normSt = x => typeof x==='number' ? { t:x, n:1 } : { t:x.t||0, n:x.n||1 };
      Object.entries(rm.studied||{}).forEach(([k,v])=>{
        if (!v) return;
        if (!s[k]){ s[k] = v; return; }
        const a = normSt(s[k]), b = normSt(v);
        s[k] = { t:Math.max(a.t,b.t), n:Math.max(a.n,b.n) };
      });
      // Banc d'errades: fusió conservadora (màxim d'errades, mínim d'encerts
      // seguits) perquè una pregunta no surti del banc si en un dispositiu
      // encara falla.
      const mk = local.mistakes || (local.mistakes = {});
      Object.entries(rm.mistakes||{}).forEach(([k,v])=>{
        if (!v) return;
        if (!mk[k]) { mk[k] = v; return; }
        mk[k] = {
          fails: Math.max(mk[k].fails||0, v.fails||0),
          lastFail: Math.max(mk[k].lastFail||0, v.lastFail||0),
          streak: Math.min(mk[k].streak||0, v.streak||0),
        };
      });
    }
    writeAll(all);
    const cur = muniBucket(all);
    return { exams:(cur.exams||[]).length, studied:Object.keys(cur.studied||{}).length };
  },
};
