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
