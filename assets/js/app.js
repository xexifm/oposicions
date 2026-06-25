/* ===========================================================================
   App principal — router + vistes
   =========================================================================== */
import { store } from './storage.js';
import { autoMatch, scoreFromChecks, gradeWithClaude } from './grader.js';

const view = document.getElementById('view');
const DATA = { temari:null, resums:null, questions:null, cases:null };

/* ---------- utilitats ---------- */
const esc = s => (s==null?'':String(s)).replace(/[&<>"']/g, c => (
  {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => (Math.round(n*100)/100).toLocaleString('ca-ES',{minimumFractionDigits:0,maximumFractionDigits:2});
const shuffle = a => { a=[...a]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const byId = id => document.getElementById(id);
const $$ = sel => Array.from(view.querySelectorAll(sel));
function scrollTop(){ window.scrollTo({top:0,behavior:'instant'}); }

async function loadData(){
  if (DATA.temari) return;
  const base = location.pathname.replace(/index\.html$/,'');
  const get = f => fetch(base + 'data/' + f, {cache:'no-cache'}).then(r=>r.json());
  const [temari, resums, questions, cases] = await Promise.all([
    get('temari.json'), get('resums.json').catch(()=>({})),
    get('questions.json').catch(()=>[]), get('cases.json').catch(()=>[]),
  ]);
  DATA.temari = temari;
  DATA.resums = resums.resums || resums || {};
  DATA.questions = questions.questions || questions || [];
  DATA.cases = cases.cases || cases || [];
}

function normRef(key){
  const n = DATA.temari.norms[key];
  return n ? n : { name:key, url:'#' };
}

/* ===========================================================================
   ROUTER
   =========================================================================== */
const routes = {
  '': home, 'home': home,
  'estudi': estudi, 'tema': temaView,
  'examen': examenConfig, 'casos': casosList, 'cas': casView,
  'historial': historial, 'fonts': fonts,
};
let examState = null;

async function render(){
  await loadData();
  const hash = location.hash.replace(/^#\/?/, '');
  const [route, param] = hash.split('/');
  const fn = routes[route] || home;
  view.innerHTML = '';
  fn(param);
  // marcar navegació activa
  const active = route || 'home';
  document.querySelectorAll('[data-route]').forEach(a=>{
    a.classList.toggle('active', a.dataset.route === active ||
      (active==='tema' && a.dataset.route==='estudi') ||
      (active==='cas' && a.dataset.route==='casos'));
  });
  scrollTop();
}
window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', render);
render();

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

/* ===========================================================================
   VISTA: INICI
   =========================================================================== */
function home(){
  const exams = store.exams();
  const studied = Object.keys(store.studied()).length;
  const last = exams[0];
  view.innerHTML = `
  <section class="hero">
    <div class="eyebrow">Concurs-oposició lliure · OPO 2024 · BOPB 18-3-2026</div>
    <h1>Prepara't l'oposició de tècnic/a superior</h1>
    <p class="lead">Simulador d'examen segons la <b>Base 7.7</b> de les bases específiques: prova
    tipus test (25 punts) i prova teòric-pràctica (45 punts). Amb resums dels 90 temes,
    correcció automàtica i historial. Funciona al PC i al mòbil, fins i tot sense connexió.</p>
    <div class="row" style="margin-top:14px">
      <a class="btn primary lg" href="#/examen">📝 Començar examen</a>
      <a class="btn lg" href="#/estudi">📚 Estudiar temari</a>
    </div>
  </section>

  <div class="home-tiles">
    <a class="tile" href="#/estudi"><span class="ic">📚</span><b>Resums dels 90 temes</b>
      <span>Esquemes i punts clau de tot el temari, organitzats per blocs. ${studied} temes repassats.</span></a>
    <a class="tile" href="#/examen"><span class="ic">📝</span><b>Examen tipus test</b>
      <span>${DATA.questions.length} preguntes amb correcció instantània i penalització −25% per errada.</span></a>
    <a class="tile" href="#/casos"><span class="ic">⚖️</span><b>Casos teòrico-pràctics</b>
      <span>${DATA.cases.length} supòsits amb correcció per criteris (i opció de correcció amb Claude).</span></a>
    <a class="tile" href="#/historial"><span class="ic">🕓</span><b>Historial i progrés</b>
      <span>${exams.length} exàmens desats.${last?` Últim: ${last.apte?'apte ✓':'no apte'} (${fmt(last.total)}/70).`:''}</span></a>
  </div>

  <div class="card" style="margin-top:18px">
    <div class="between">
      <div><h3 style="margin:0">Format oficial de l'examen</h3>
      <p class="muted" style="margin:.3em 0 0">Segons la Base 7.7 de la convocatòria.</p></div>
      <a class="btn ghost" href="#/fonts">Fonts oficials →</a>
    </div>
    <div class="grid cols-2" style="margin-top:12px">
      <div class="scorebox"><span class="pill crimson">Prova 1 · Test</span>
        <p style="margin:.6em 0 0">Examen tipus test, 4 respostes. Errades: <b>−25%</b> d'un encert.
        No contestades no resten. <b>Màx. 25 punts</b>, mín. 12,5 per no quedar exclòs.</p></div>
      <div class="scorebox"><span class="pill crimson">Prova 2 · Teòric-pràctica</span>
        <p style="margin:.6em 0 0">Supòsits pràctics. Es valora correcció, profunditat, sistemàtica,
        claredat i anàlisi. <b>Màx. 45 punts</b>, mín. 22,5.</p></div>
    </div>
    <p class="muted" style="margin:.8em 0 0;font-size:.85rem">⚠️ Les preguntes i casos són material d'estudi
    generat amb IA. Contrasta sempre amb la normativa consolidada abans de l'examen.</p>
  </div>`;
}

/* ===========================================================================
   VISTA: ESTUDI (llistat de temes)
   =========================================================================== */
function estudi(){
  const studied = store.studied();
  const blocks = DATA.temari.blocks;
  const temari = DATA.temari.temari;
  view.innerHTML = `
    <h1>Estudi del temari</h1>
    <p class="lead">Els 90 temes de l'Annex I, agrupats en blocs. Toca un tema per veure'n el resum amb esquemes.</p>
    <div class="search" style="margin:14px 0 6px">
      <span class="mag">🔎</span>
      <input id="q" type="text" placeholder="Cerca un tema, una llei, un concepte…" autocomplete="off">
    </div>
    <p class="muted" id="studycount" style="font-size:.85rem"></p>
    <div id="temalist"></div>`;

  const listEl = byId('temalist');
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
        html += `<a class="tema-item" href="#/tema/${t.num}">
          <span class="tn">${t.num}</span>
          <span><span class="tt">${esc(t.title)}</span></span>
          <span class="badge">${done?'✓ repassat':''} ${hasResum?'':'· resum en preparació'}</span>
        </a>`;
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
function temaView(num){
  num = parseInt(num,10);
  const tema = DATA.temari.temari.find(t=>t.num===num);
  if (!tema){ view.innerHTML = '<p>Tema no trobat.</p>'; return; }
  const resum = DATA.resums[num];
  const studied = !!store.studied()[num];
  const srcChips = tema.sources.map(k=>{
    const n = normRef(k);
    return `<a class="srcchip" href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${esc(n.name)} ↗</a>`;
  }).join('');

  let body;
  if (resum){
    body = renderResum(resum);
  } else {
    body = `<div class="notice">El resum detallat d'aquest tema encara s'està preparant
      (s'aniran afegint per fases). Mentrestant, consulta les fonts oficials de sota i practica
      amb les preguntes d'aquest bloc.</div>`;
  }

  view.innerHTML = `
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
        <a class="btn ghost" href="#/examen?block=${tema.block}">Practicar aquest bloc →</a>
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
  });
}

function renderResum(r){
  let html = '';
  if (r.intro) html += `<p>${esc(r.intro)}</p>`;
  (r.sections||[]).forEach(s=>{
    if (s.h) html += `<h3>${esc(s.h)}</h3>`;
    if (s.p) html += `<p>${esc(s.p)}</p>`;
    if (s.list) html += `<ul>${s.list.map(li=>`<li>${esc(li)}</li>`).join('')}</ul>`;
    if (s.key) html += `<div class="keyfact">💡 ${esc(s.key)}</div>`;
    if (s.scheme) html += renderScheme(s.scheme);
  });
  if (r.key) html += `<div class="keyfact">💡 <b>Clau:</b> ${esc(r.key)}</div>`;
  return html;
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

/* ===========================================================================
   VISTA: CONFIGURACIÓ D'EXAMEN
   =========================================================================== */
function examenConfig(){
  const params = new URLSearchParams((location.hash.split('?')[1])||'');
  const preBlock = params.get('block') || 'all';
  const blocks = DATA.temari.blocks;
  const s = store.settings();
  const blockOpts = ['<option value="all">Tot el temari (90 temes)</option>']
    .concat(Object.keys(blocks).sort((a,b)=>a-b).map(b=>
      `<option value="${b}" ${b===preBlock?'selected':''}>Bloc ${b} · ${esc(blocks[b])}</option>`)).join('');

  view.innerHTML = `
    <h1>Configura l'examen</h1>
    <p class="lead">Tria com vols practicar. La puntuació segueix la Base 7.7 de la convocatòria.</p>
    <div class="card">
      <label class="field"><span>Bloc del temari</span>
        <select id="cfgBlock">${blockOpts}</select></label>

      <div class="field"><span>Preguntes tipus test (Prova 1)</span>
        <div class="seg" id="cfgN">
          ${[10,20,40,50,60].map(n=>`<button data-v="${n}" class="${(s.n||20)===n?'on':''}">${n}</button>`).join('')}
        </div></div>

      <div class="field"><span>Casos teòrico-pràctics (Prova 2)</span>
        <div class="seg" id="cfgCases">
          ${[0,1,2,3].map(n=>`<button data-v="${n}" class="${(s.cases??1)===n?'on':''}">${n===0?'Cap':n}</button>`).join('')}
        </div></div>

      <label class="field"><span>Cronòmetre</span>
        <select id="cfgTimer">
          <option value="0">Sense límit</option>
          <option value="30">30 minuts</option>
          <option value="60" selected>60 minuts</option>
          <option value="90">90 minuts</option>
        </select></label>

      <button class="btn primary block lg" id="startBtn" style="margin-top:8px">Començar examen →</button>
      <p class="muted" id="avail" style="margin:.7em 0 0;font-size:.85rem"></p>
    </div>`;

  let cfg = { block:preBlock, n:(s.n||20), cases:(s.cases??1), timer:60 };
  const updateAvail = ()=>{
    const qs = poolQuestions(cfg.block).length;
    const cs = poolCases(cfg.block).length;
    byId('avail').textContent = `Disponibles en aquesta selecció: ${qs} preguntes test · ${cs} casos pràctics.`;
  };
  byId('cfgBlock').addEventListener('change', e=>{cfg.block=e.target.value;updateAvail();});
  segHandler('cfgN', v=>{cfg.n=+v; store.setSetting('n',+v);});
  segHandler('cfgCases', v=>{cfg.cases=+v; store.setSetting('cases',+v);});
  byId('cfgTimer').addEventListener('change', e=>cfg.timer=+e.target.value);
  byId('startBtn').addEventListener('click', ()=>startExam(cfg));
  updateAvail();
}
function segHandler(id, cb){
  byId(id).addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return;
    byId(id).querySelectorAll('button').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); cb(b.dataset.v);
  });
}
function poolQuestions(block){
  return DATA.questions.filter(q => block==='all' || String(q.block)===String(block) || isThemeInBlock(q.theme, block));
}
function poolCases(block){
  return DATA.cases.filter(c => block==='all' || String(c.block)===String(block) || isThemeInBlock(c.theme, block));
}
function isThemeInBlock(theme, block){
  const t = DATA.temari.temari.find(x=>x.num===theme);
  return t && String(t.block)===String(block);
}

/* ===========================================================================
   EXAMEN EN CURS
   =========================================================================== */
function startExam(cfg){
  const qs = shuffle(poolQuestions(cfg.block)).slice(0, cfg.n).map(q=>({...q}));
  const cs = shuffle(poolCases(cfg.block)).slice(0, cfg.cases).map(c=>({...c}));
  if (qs.length===0 && cs.length===0){ alert('No hi ha contingut per a aquesta selecció.'); return; }
  examState = {
    cfg, qs, cs,
    answers: new Array(qs.length).fill(null),
    caseAnswers: cs.map(()=>({text:'', checks:{}, claude:null})),
    started: Date.now(),
    deadline: cfg.timer ? Date.now()+cfg.timer*60000 : 0,
    submitted: false,
  };
  examRunning();
}

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

  // handlers test
  $$('.opt').forEach(btn=>btn.addEventListener('click', ()=>{
    const qi=+btn.dataset.q, oi=+btn.dataset.o;
    examState.answers[qi] = (examState.answers[qi]===oi) ? null : oi; // re-tocar deselecciona
    view.querySelectorAll(`.opt[data-q="${qi}"]`).forEach(b=>b.classList.remove('sel'));
    if (examState.answers[qi]!==null) btn.classList.add('sel');
    updateProgress();
  }));
  // handlers casos
  $$('textarea[data-case]').forEach(ta=>ta.addEventListener('input', ()=>{
    examState.caseAnswers[+ta.dataset.case].text = ta.value;
  }));
  byId('submitBtn').addEventListener('click', ()=>{
    const unanswered = examState.answers.filter(a=>a===null).length;
    if (unanswered>0 && !confirm(`Tens ${unanswered} pregunta(es) test sense contestar (no resten punts). Vols corregir igualment?`)) return;
    finishExam();
  });
  const pauseBtn = byId('pauseBtn');
  if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
  examState.paused = false; examState.remaining = 0;
  updateProgress();
  startTimer();
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
}

/* ===========================================================================
   RESULTATS
   =========================================================================== */
function finishExam(){
  clearInterval(timerInt);
  examState.submitted = true;
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

  // Part B: prepuntuar amb el motor de criteris
  const caseResults = cs.map((c,i)=>{
    const ans = examState.caseAnswers[i];
    const auto = autoMatch(ans.text, c.criteria||[]);
    const checks = {};
    (c.criteria||[]).forEach(cr=>{ checks[cr.id] = auto[cr.id]?.matched || false; });
    ans.checks = checks; ans.auto = auto;
    return { c, ans };
  });
  const caseMax = cs.length ? 45/cs.length : 0;

  renderResults({ correct, wrong, blank, scoreA, perQ, caseResults, caseMax });
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

  // Detall Part A
  if (examState.qs.length){
    html += `<h2 style="margin-top:22px">Correcció del test</h2><div id="reviewA"></div>`;
  }
  // Detall Part B
  if (caseResults.length){
    html += `<h2 style="margin-top:22px">Correcció dels casos</h2>
      <div class="notice">La nota dels casos és <b>orientativa</b>: el motor ha marcat els criteris que ha
      detectat a la teva resposta. Revisa i ajusta les caselles, compara amb la resposta model, o demana
      la correcció amb Claude (necessita clau API). El tribunal valora correcció, profunditat, sistemàtica,
      claredat i anàlisi.</div>
      <div id="reviewB"></div>`;
  }
  html += `<div class="row" style="margin-top:18px">
      <button class="btn primary" id="saveBtn">💾 Desar a l'historial</button>
      <a class="btn ghost" href="#/examen">Nou examen</a>
    </div>`;
  view.innerHTML = html;

  if (examState.qs.length) renderReviewA();
  if (caseResults.length) renderReviewB(caseResults, caseMax);

  byId('saveBtn').addEventListener('click', e=>{
    const scoreB2 = partBTotal(caseResults, caseMax);
    const total2 = (scoreA||0)+(scoreB2||0);
    store.saveExam({
      id:'ex_'+Date.now(), date:Date.now(),
      block: examState.cfg.block, n: examState.qs.length, cases: caseResults.length,
      correct, wrong, blank,
      scoreA: scoreA, scoreB: scoreB2, total: total2,
      apte: (scoreA===null||scoreA>=12.5) && (scoreB2===null||scoreB2>=22.5) && (scoreA!==null||scoreB2!==null),
    });
    e.target.textContent = '✓ Desat'; e.target.disabled = true;
  });
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
      ${q.explain?`<div class="explain">${esc(q.explain)}
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
      <div class="model"><h4>Resposta model</h4>${mdToHtml(c.model)}
        ${c.sources?`<div class="srclist" style="margin-top:8px">${c.sources.map(k=>{const n=normRef(k);return `<a class="srcchip" href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${esc(n.name)} ↗</a>`;}).join('')}</div>`:''}
      </div>
      <details style="margin-top:10px"><summary style="cursor:pointer;font-weight:600">⚙️ Correcció amb Claude (API, opcional)</summary>
        <div class="notice" style="margin-top:8px">Correcció real redactada per Claude. Necessita una clau API pròpia
        (<a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>).
        La clau es guarda només al teu navegador i mai s'envia enlloc més que a l'API d'Anthropic.</div>
        <label class="field"><span>Clau API (sk-ant-…)</span>
          <input type="password" class="apikey" placeholder="sk-ant-..." value="${esc(store.settings().apiKey||'')}"></label>
        <label class="field"><span>Model</span>
          <input type="text" class="apimodel" value="${esc(store.settings().apiModel||'claude-sonnet-4-6')}"></label>
        <button class="btn" data-claude="${i}">Corregir aquest cas amb Claude</button>
        <div class="claudeout" style="margin-top:10px"></div>
      </details>
    </div>`).join('');

  function recalc(){
    caseResults.forEach(({c,ans},i)=>{
      const sc = scoreFromChecks(c.criteria||[], ans.checks, caseMax);
      const badge = wrap.querySelector(`[data-pts="${i}"]`);
      if (badge) badge.textContent = `${fmt(sc.points)} / ${fmt(caseMax)} punts`;
    });
  }
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
   VISTA: CASOS (catàleg per practicar individualment)
   =========================================================================== */
function casosList(){
  const cs = DATA.cases;
  view.innerHTML = `
    <h1>Casos teòrico-pràctics</h1>
    <p class="lead">${cs.length} supòsits per practicar la Prova 2. Pots fer-ne un de sol amb correcció per
    criteris, o incloure'ls en un examen complet des d'<a href="#/examen">Examen</a>.</p>
    <div id="caselist">${cs.map(c=>`
      <a class="tema-item" href="#/cas/${esc(c.id)}">
        <span class="tn">${c.theme}</span>
        <span><span class="tt">${esc(c.title)}</span><br><span class="muted" style="font-size:.85rem">${esc((c.context||'').slice(0,90))}…</span></span>
      </a>`).join('') || '<p class="muted">Encara no hi ha casos.</p>'}</div>`;
}

function casView(id){
  const c = DATA.cases.find(x=>x.id===id);
  if (!c){ view.innerHTML='<p>Cas no trobat.</p>'; return; }
  examState = { cfg:{block:'all'}, qs:[], cs:[c],
    answers:[], caseAnswers:[{text:'',checks:{},claude:null}],
    started:Date.now(), deadline:0, submitted:false };
  const t = DATA.temari.temari.find(x=>x.num===c.theme);
  view.innerHTML = `
    <a class="backlink" href="#/casos">← Tots els casos</a>
    <div class="eyebrow">Tema ${c.theme}${t?' · '+esc(t.blockName):''}</div>
    <h1>${esc(c.title)}</h1>
    <div class="card">
      <p><b>Context.</b> ${esc(c.context)}</p>
      <p><b>Es demana.</b> ${esc(c.prompt)}</p>
      <label class="field"><span>La teva resposta</span>
        <textarea id="caseta" placeholder="Redacta la teva resposta jurídica i raonada…"></textarea></label>
      <button class="btn primary block lg" id="corrBtn">Corregir aquest cas</button>
    </div>`;
  byId('caseta').addEventListener('input', e=>examState.caseAnswers[0].text=e.target.value);
  byId('corrBtn').addEventListener('click', ()=>{
    const ans = examState.caseAnswers[0];
    const auto = autoMatch(ans.text, c.criteria||[]);
    const checks={}; (c.criteria||[]).forEach(cr=>checks[cr.id]=auto[cr.id]?.matched||false);
    ans.checks=checks; ans.auto=auto;
    const caseResults=[{c,ans}];
    view.innerHTML = `<a class="backlink" href="#/casos">← Tots els casos</a>
      <h1>Correcció · ${esc(c.title)}</h1>
      <div class="notice">Nota orientativa segons els criteris detectats. Ajusta les caselles o demana la
      correcció amb Claude.</div><div id="reviewB"></div>
      <div class="row" style="margin-top:16px"><a class="btn ghost" href="#/cas/${esc(c.id)}">Repetir</a>
      <a class="btn ghost" href="#/casos">Altres casos</a></div>`;
    renderReviewB(caseResults, 45);
  });
}

/* ===========================================================================
   VISTA: HISTORIAL
   =========================================================================== */
function historial(){
  const exams = store.exams();
  const studied = store.studied();
  const sd = Object.keys(studied).length;
  let html = `<h1>Historial i progrés</h1>`;
  html += `<div class="card"><div class="between">
      <div><b>${sd} / 90</b> temes repassats</div>
      <div class="progress" style="flex:1;max-width:240px"><i style="width:${Math.round(sd/90*100)}%"></i></div>
    </div></div>`;

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
        </div></div>`;
    }).join('');
  }
  view.innerHTML = html;
  const clr = byId('clearAll');
  if (clr) clr.addEventListener('click', ()=>{ if(confirm('Esborrar tot l\'historial?')){ store.clearExams(); render(); }});
  $$('[data-del]').forEach(b=>b.addEventListener('click', ()=>{ store.deleteExam(b.dataset.del); render(); }));
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
function mdToHtml(md){
  if(!md) return '';
  const lines = String(md).split('\n');
  let html='', inList=false;
  for (let ln of lines){
    ln=ln.trimEnd();
    if (/^[-•]\s+/.test(ln)){
      if(!inList){html+='<ul>';inList=true;}
      html+=`<li>${esc(ln.replace(/^[-•]\s+/,''))}</li>`;
    } else {
      if(inList){html+='</ul>';inList=false;}
      if(ln.trim()) html+=`<p>${esc(ln)}</p>`;
    }
  }
  if(inList) html+='</ul>';
  return html;
}
