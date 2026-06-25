/* ===========================================================================
   Correcció de la prova teòric-pràctica (Part B, Base 7.7.b)
   Dos modes:
     1) Motor de criteris (offline, gratis): detecta conceptes clau a la
        resposta i prepuntua una rúbrica que l'usuari pot ajustar.
     2) API de Claude (opcional, clau pròpia): correcció redactada per Claude.
   =========================================================================== */

/* --- normalització de text per a la cerca de conceptes --- */
function norm(s){
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // treu accents
    .replace(/[^a-z0-9·ç\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Un criteri es considera "cobert" si l'usuari menciona prou grups de
   conceptes. Cada grup és un array de sinònims: n'hi ha prou amb un sinònim.
   El criteri es marca si matchedGroups / totalGroups >= threshold (0.5). */
export function autoMatch(answer, criteria){
  const text = norm(answer);
  const words = text.length;
  const result = {};
  for (const c of criteria){
    const groups = c.keywords || [];
    let hit = 0;
    const found = [];
    for (const g of groups){
      const syns = Array.isArray(g) ? g : [g];
      const ok = syns.some(k => text.includes(norm(k)));
      if (ok){ hit++; found.push(syns[0]); }
    }
    const coverage = groups.length ? hit / groups.length : 0;
    result[c.id] = {
      matched: words > 15 && coverage >= (c.threshold || 0.5),
      coverage, hits: found, total: groups.length, got: hit,
    };
  }
  return result;
}

/* Nota d'un cas a partir dels criteris marcats (manual o auto), escalada al
   màxim de punts del cas. */
export function scoreFromChecks(criteria, checked, maxPoints){
  const totalW = criteria.reduce((a,c) => a + (c.weight || 1), 0) || 1;
  const gotW = criteria.reduce((a,c) => a + (checked[c.id] ? (c.weight || 1) : 0), 0);
  return {
    fraction: gotW / totalW,
    points: +( (gotW / totalW) * maxPoints ).toFixed(2),
    gotW, totalW,
  };
}

/* --- Mode API de Claude (opcional) --- */
export async function gradeWithClaude({ apiKey, model, kase, answer }){
  if (!apiKey) throw new Error('Falta la clau API.');
  const rubric = (kase.criteria || [])
    .map((c,i) => `${i+1}. (${c.weight||1} pts) ${c.label}`).join('\n');

  const sys = `Ets un membre del tribunal qualificador d'una oposició A1 (tècnic/a superior en arquitectura/enginyeria, Ajuntament de Montornès del Vallès). Corregeixes la prova teòric-pràctica (Base 7.7.b) amb rigor jurídic i criteri professional. Valores correcció de les respostes, profunditat, sistemàtica, claredat i capacitat d'anàlisi. Respon NOMÉS amb un objecte JSON vàlid, sense text addicional.`;

  const user = `CAS PRÀCTIC (tema ${kase.theme}): ${kase.title}
CONTEXT: ${kase.context}
ES DEMANA: ${kase.prompt}

RÚBRICA (criteris i pesos, total ${kase.criteria.reduce((a,c)=>a+(c.weight||1),0)} punts conceptuals; la prova val fins a ${kase.maxPoints} punts):
${rubric}

RESPOSTA MODEL DE REFERÈNCIA:
${kase.model}

RESPOSTA DE L'ASPIRANT:
"""${answer}"""

Avalua la resposta de l'aspirant. Retorna aquest JSON exacte:
{
  "criteria": [{"label": "...", "covered": true|false, "comment": "frase breu"}],
  "scoreFraction": 0.0-1.0,
  "feedback": "2-4 frases de retroacció constructiva en català",
  "strengths": ["..."],
  "improve": ["..."]
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: sys,
      messages: [{ role:'user', content: user }],
    }),
  });
  if (!res.ok){
    const t = await res.text();
    throw new Error('Error de l\'API ('+res.status+'): '+t.slice(0,200));
  }
  const data = await res.json();
  const txt = (data.content || []).map(b => b.text || '').join('');
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Resposta inesperada de l\'API.');
  return JSON.parse(m[0]);
}
