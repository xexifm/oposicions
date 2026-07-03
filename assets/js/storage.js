/* Persistència local (localStorage). 100% al navegador, sense servidor. */
const KEY = 'montornes_oposicio_v1';

function readAll(){
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch(e){ return {}; }
}
function writeAll(obj){
  try { localStorage.setItem(KEY, JSON.stringify(obj)); return true; }
  catch(e){ console.warn('No s\'ha pogut desar:', e); return false; }
}

export const store = {
  get(path, fallback){
    const all = readAll();
    return path in all ? all[path] : fallback;
  },
  set(path, value){
    const all = readAll();
    all[path] = value;
    return writeAll(all);
  },
  // --- historial d'exàmens ---
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
  // --- examen en procés (per poder reprendre'l) ---
  pendingExam(){ return this.get('pendingExam', null); },
  setPendingExam(state){ this.set('pendingExam', state); },
  clearPendingExam(){ this.set('pendingExam', null); },
  // --- estadístiques per tema, DERIVADES dels exàmens desats ---
  // Cada exam desa el seu themePerf; així la fusió entre dispositius (unió
  // d'exàmens per id) no duplica els comptadors.
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
  // --- sincronització entre dispositius (fusió, no substitució) ---
  exportBundle(){
    return { v:1, ts:Date.now(), exams:this.exams(), studied:this.studied() };
  },
  importBundle(b){
    if (!b || typeof b!=='object') throw new Error('Dades no vàlides.');
    // Exàmens: unió per id
    const byId = {};
    (this.exams()||[]).forEach(e=>{ if(e&&e.id) byId[e.id]=e; });
    (b.exams||[]).forEach(e=>{ if(e&&e.id && !byId[e.id]) byId[e.id]=e; });
    const merged = Object.values(byId).sort((a,b)=>(b.date||0)-(a.date||0)).slice(0,200);
    this.set('exams', merged);
    // Temes repassats: unió, conservant la marca de temps més antiga/qualsevol
    const s = this.studied();
    Object.entries(b.studied||{}).forEach(([k,v])=>{ if(!s[k]) s[k]=v; });
    this.set('studied', s);
    return { exams:merged.length, studied:Object.keys(s).length };
  },
  // --- progrés d'estudi (temes marcats com a repassats) ---
  studied(){ return this.get('studied', {}); },
  toggleStudied(num){
    const s = this.studied();
    if (s[num]) delete s[num]; else s[num] = Date.now();
    this.set('studied', s);
    return !!s[num];
  },
  // --- config de l'usuari ---
  settings(){ return this.get('settings', {}); },
  setSetting(k, v){
    const s = this.settings(); s[k] = v; this.set('settings', s);
  },
};
