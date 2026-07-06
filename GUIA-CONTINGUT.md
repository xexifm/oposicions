# Guia de contingut i preferències — apps d'estudi per a oposicions

Aquest document recopila **totes les indicacions** que en Sergi ha anat donant sobre
com vol el material d'estudi i l'app, **i el procés provat** amb què es va generar tot
el contingut de Montornès (90 resums, 900 preguntes, 180 casos). Serveix de manual
complet per **afegir una nova oposició** sense haver de redescobrir res.

> Manteniment: actualitza aquest fitxer **abans o just després** d'aplicar qualsevol
> canvi de criteri nou. És la font de veritat de les preferències.

---

## 0. Checklist per posar en marxa una NOVA oposició

1. **Registrar el municipi** a `assets/js/app.js`, constant `MUNIS` (id, dir, name,
   short, role, crest/color o escut SVG a `assets/icons/`, web). Les rutes ja són
   `#/<muni>/<vista>/<param>`: no cal tocar res més del router.
2. **Crear `data/<muni>/`** amb els 4 fitxers (esquemes a la secció 1):
   `temari.json`, `resums.json`, `questions.json`, `cases.json`.
   Es pot copiar l'esquelet de `data/cornella/` (buit) o el de Montornès com a referència.
3. **Afegir els 4 fitxers a `ASSETS` de `sw.js`** (memòria cau offline) i **apujar la
   versió de `CACHE`** (`vNN` → `vNN+1`). Cal apujar-la **a cada desplegament** que
   canviï contingut o codi.
4. **Buidar el temari a `temari.json`** des de les bases de la convocatòria:
   `norms` (sigles → nom + URL oficial), `blocks` (numerats) i `temari`
   (num, title literal de les bases, block, blockName, sources).
5. Generar contingut **per lots de 10 temes** (secció 5): primer un lot de mostra,
   validar-lo amb en Sergi, i després la resta.
6. Objectius de volum per tema (assolits a Montornès i estàndard per a les següents):
   **resum profund + 10 preguntes + 2 casos**.

---

## 1. Arquitectura de dades (`data/<muni>/*.json`)

Tots els fitxers duen un `_meta.info` amb l'avís de material generat amb IA.

### `temari.json`
```json
{
  "norms":  { "TRLUC": { "name": "…", "url": "https://…" }, … },
  "blocks": { "1": "Nom del bloc", … },
  "temari": [ { "num": 1, "title": "…", "block": 1, "blockName": "…", "sources": ["CE1978"] }, … ]
}
```

### `resums.json`
```json
{ "_meta": {…}, "resums": { "1": {RESUM}, "2": {…}, … } }   // clau = núm. de tema (string)
```

### `questions.json`
```json
{ "_meta": {…}, "questions": [ {PREGUNTA}, … ] }
```

### `cases.json`
```json
{ "_meta": {…}, "cases": [ {CAS}, … ] }
```

---

## 2. Resums dels temes

### Estructura JSON d'un resum
```json
{
  "intro": "Paràgraf que situa el tema i avisa de què cau a l'examen.",
  "sections": [
    { "h": "1. Títol de secció",
      "p": "paràgraf opcional",
      "list": ["punt", "punt"],
      "table": { "headers": [..], "rows": [[..],[..]], "cap": "peu de taula" },
      "p2": "paràgraf de tancament opcional" }
  ],
  "keypoints": [ { "h": "Etiqueta", "p": ["línia", "línia"] } ]
}
```
Claus permeses per secció: només `h`, `p`, `list`, `table`, `p2`. Les files de cada
taula han de tenir **exactament** tantes cel·les com `headers`.

### Nivell i estil (el "patró tema 15")
- **Profunditat de referència: 4-6 KB de JSON per resum** (el rang real de Montornès
  és 4,1-10,6 KB). Un resum de 2-3 KB és "superficial" i s'ha de reescriure.
- **5-7 seccions numerades**, amb **taules** per a terminis, quanties, òrgans i
  règims comparats (és el que més es pregunta), i llistes per a requisits i efectes.
- **Citar sempre norma i article concrets** ("art. 73 TRLUC", "art. 90.3 Llei 39/2015"),
  mai "art. X" sol. Les quanties i terminis, sempre exactes (1.500.000/150.000/3.000 €;
  6/4/2 anys; 45 dies; etc.).
- **MAJÚSCULES** per remarcar els conceptes clau dins del text (no s'usa negreta:
  **prohibit `**` dins del JSON**, el renderitzador no el processa).
- **`keypoints` substanciosos**: esquema jeràrquic final per repassar sense rellegir;
  ha de contenir les xifres i articles clau, no generalitats.
- **Glossari d'abreviacions**: es genera automàticament a partir de les sigles del
  text i de `norms`; per això cal que `norms` estigui complet i que les sigles del
  text hi coincideixin.
- **Sense scroll horitzontal**: res de taules amb columnes killomètriques; el CSS ja
  fa scroll intern però cal evitar cel·les de paràgrafs sencers.
- **PROHIBIT deixar notes de verificació dins del text** ("? —", "correcció:",
  "cal verificar", punts suspensius de dubte). Si un fet no és segur, es resol abans
  de desar; mai s'envia el dubte a producció.
- Gramàtica catalana correcta i entenedora; extensió mínima ~1 pàgina A4.
- Mantenir `docs/resums-tots.md` (exportació de tots els resums en un únic fitxer
  per a revisions externes).

---

## 3. Preguntes tipus test (Prova 1)

### Estructura JSON d'una pregunta
```json
{ "id": "t51q6", "theme": 51, "block": 11,
  "q": "Enunciat…?", "options": ["A","B","C","D"], "correct": 2,
  "explain": "Explicació rica…", "source": "TRLUC", "article": "Art. 73 TRLUC" }
```
- `id` = `tNNqM` (NN tema amb dos dígits, M seqüencial dins del tema). Únics.
- `block` = bloc del tema segons `temari.json`.

### Regles de qualitat (les importants!)
- **4 opcions, 1 correcta.** Objectiu per tema: **10 preguntes**.
- **Posició de la correcta rotativa** (0→1→2→3→…): al final, cada posició ha de
  quedar ~25% del total del lot.
- **Longituds equilibrades**: la mitjana de caràcters de les respostes correctes no
  pot desviar-se **més d'un 12%** de la mitjana dels distractors (validació
  automàtica). El biaix típic és fer la correcta massa llarga i detallada: si passa,
  **escurçar la correcta** (el detall va a `explain`) o allargar distractors.
  Compte amb el biaix invers ("la llarga mai és la bona").
- **Distractors plausibles**: quanties/terminis reals però equivocats, òrgans
  competents intercanviats, règims de figures veïnes; mai bajanades evidents.
- **Explicacions riques**: què es pregunta, per què la correcta ho és (amb article)
  i, si aporta, per què les altres no. Es pot usar MAJÚSCULA per als conceptes clau.
- **Enunciats únics** a tot el banc (validació automàtica) i contextualitzats
  (esmentar l'article o la llei a l'enunciat quan orienta l'estudi).
- Coherència amb els resums: si una pregunta fixa un termini o quantia, el resum del
  tema l'ha de recollir igual.

### Eina: `tools/qadd.py`
Helper amb `add()` (rotació automàtica de posicions, ids) i `validate()`
(ids/enunciats únics, posicions, equilibri de longituds <12%). Ús típic: un script
per lot (`q_51_60.py`) que importa el helper, afegeix les 50 preguntes i valida
**abans** de desar. Si `validate()` peta per longituds: llistar les preguntes amb
més diferència correcta−distractors i escurçar les correctes.

---

## 4. Casos teòrico-pràctics (Prova 2)

### Estructura JSON d'un cas
```json
{ "id": "c-t58-slug" | "c2-t58-slug", "theme": 58, "block": 12, "maxPoints": 45,
  "title": "…", "context": "Supòsit de fet realista…",
  "prompt": "Expliqueu: a) …; b) …; c) …",
  "criteria": [ { "id": "c1", "label": "Idea que ha d'aparèixer (amb article i xifra)",
                  "weight": 12, "keywords": [["sinonim1","sinonim2"],["grup2"]] }, … ],
  "model": "Resposta model extensa amb a) b) c)…",
  "sources": ["TRLUC"] }
```

### Regles
- **2 casos per tema** (`c-…` el primer, `c2-…` el segon, amb angles diferents del
  mateix tema). `maxPoints` sempre 45.
- **Context realista i local** (ambientat al municipi quan s'hi presti: òrgans,
  situacions de tècnic municipal reals).
- **Prompt en apartats a/b/c** — facilita la correcció per criteris.
- **3-4 criteris** amb `weight`; la **suma de pesos ha d'estar entre 40 i 50**
  (validació automàtica).
- **`keywords`**: llista de **grups de sinònims** (n'hi ha prou que aparegui un
  sinònim de cada grup; el criteri es dona per cobert amb ≥50% de grups). El motor
  normalitza el text (minúscules i sense accents), així que els keywords s'escriuen
  **sense accents** ("informacio publica", "parcellacio"). Triar arrels robustes
  ("coercitiv" cobreix coercitiva/coercitives) i xifres exactes ("10", "2 mesos").
- **`model`**: resposta model completa (~1.200-1.600 caràcters) estructurada a/b/c,
  amb articles i quanties: és el que Claude fa servir de patró en la correcció API.
- Repassar les faltes de teclat al `prompt`/`context` (les valida un humà, no el motor).

### Eina: `tools/cadd.py`
Helper amb `C()` (construeix el cas amb ids `c2-tN-slug`) i `validate()` (ids únics,
pesos 40-50, keywords no buits, camps obligatoris). Un script per lot de 15 casos.

---

## 5. Pipeline de treball per lots (el que va funcionar)

Per a cada **lot de 10 temes** (preguntes+resums) o **15 casos**:

1. **Reiniciar la branca de treball des de `main`**
   (`git fetch origin main && git checkout -B <branca> origin/main`).
2. **Inventari previ**: bolcar títols del temari, resums actuals i preguntes/casos
   existents dels temes del lot (evitar repetir enunciats i angles; reutilitzar fets).
3. **Generar** amb un script per lot (a `tools/` o en un directori temporal) que usa
   els helpers i **valida abans de desar**.
4. **Validació global** (script curt): totals per tema, ids i enunciats únics,
   estructura dels resums (claus permeses, taules quadrades), **cap `**` ni notes de
   dubte**, mides dels resums (cap per sota de ~4 KB).
5. **Prova de navegador** quan el canvi ho justifiqui (Chromium headless amb
   playwright-core: obrir `#/<muni>/estudi`, un `#/<muni>/casquiz/N`, mirar errors de
   consola).
6. **Bump de `sw.js`** (+1 la versió de `CACHE`).
7. **Commit + push + PR + squash-merge a `main`** (GitHub Pages desplega des de main).
   Un PR per lot, amb el resum de validacions al cos.

### Errors ja comesos (no repetir)
- Respostes correctes sistemàticament més llargues → va caldre re-equilibrar 3 lots.
- Notes de verificació dins dels resums ("? — comprovar") desplegades → neteja a posteriori.
- Negretes `**` dins del JSON (no es renderitzen).
- Files de taula amb més cel·les que `headers` (taula desquadrada al web).
- Enllaç en pestanya nova que perdia l'oposició activa → per això les rutes duen el
  municipi (`#/montornes/tema/10`); no tornar a rutes sense prefix.
- Claus API o tokens: **mai** al repositori ni a cap fitxer versionat; només
  localStorage del dispositiu (i xifrats amb el PIN al bundle de sincronització).

---

## 6. App (PWA) — requisits vigents

- Web a **PC i mòbil**, GitHub Pages (deploy des de `main`), **offline** complet
  (service worker; bump de versió a cada canvi), progrés a localStorage.
- Rutes amb municipi: `#/<muni>/<vista>` (estudi, tema/N, examen, historial, quiz/N,
  casquiz/N, temahist/N) + globals `#/` (selector) i `#/config`.
- **Configuració global** (⚙️ abans de triar oposició): clau API de Claude i
  sincronització (token GitHub + PIN). Correcció de casos amb Claude API amb
  **fallback local** automàtic (rúbrica de keywords) si la crida falla.
- **Examen**: selecció multi-tema i per blocs; opció de 0 preguntes test (només
  casos); cronòmetre automàtic (1 min/pregunta + 10 min/cas) desactivable.
- **Estudi**: % de test i % de casos per tema amb color (llindar ~75%), clicables cap
  a l'historial per tema (errades + intents de casos); botons Quiz i Cas per tema.
- Repàs espaiat ("et toca repassar") i banc d'errades amb ponderació.
- **Sincronització** entre dispositius: bundle xifrat AES-GCM+PBKDF2 amb PIN, a un
  Gist privat (token només al dispositiu); la importació **fusiona**, mai substitueix;
  si el PIN no coincideix, no se sobreescriu res.
- Enllaços a fonts oficials que funcionin al mòbil.

## 7. Procés de treball amb en Sergi

- **Mostrar un parell d'exemples abans de canviar-ho tot** en canvis massius de
  format; validar amb ell i després desplegar a tots els temes.
- Llengua de treball: **català**.
- Avís permanent: material **generat amb IA**; contrastar amb la normativa vigent
  abans de l'examen.

---

*Última actualització: 2026-07-06 (procés complet de Montornès: 90 resums profunds,
900 preguntes, 180 casos; helpers a `tools/`).*
