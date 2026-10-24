# Estudi · app d'estudi per a oposicions i cursos

Web app per **estudiar i preparar exàmens**: resums del temari, tests amb correcció automàtica,
simulacres d'examen amb el format oficial, casos pràctics, banc d'errades i repàs espaiat.
Funciona al **PC i al mòbil**, es pot instal·lar com a **app (PWA)** i s'hi pot estudiar **sense connexió**.

### Què s'hi pot estudiar

| | Contingut | On són les dades |
|---|---|---|
| **Montornès del Vallès** · tècnic/a superior en arquitectura/enginyeria (OPO 2024 · BOPB 18-3-2026) | 90 temes amb resum, 900 preguntes, 180 casos | [`data/montornes`](./data/montornes) |
| **Cornellà de Llobregat** · temari general A1, part comuna | 18 temes amb resum, 180 preguntes | [`data/cornella`](./data/cornella) |
| **UOC MBA** · Màster en Direcció i Administració d'Empreses | assignatures, mòduls i reptes | repositori **privat** `xexifm/uoc-mba-dades` (cal un token; vegeu [`GUIA-CONTINGUT.md`](./GUIA-CONTINGUT.md)) |

Per afegir-ne una de nova, vegeu la checklist de [`GUIA-CONTINGUT.md`](./GUIA-CONTINGUT.md).

---

## Què inclou

| Secció | Descripció |
|---|---|
| **📚 Estudi** | Resums dels temes amb esquemes i, si n'hi ha, fonts oficials; repàs espaiat («et toca repassar»). |
| **📝 Examen** | Tests amb **correcció automàtica**, simulacres oficials i banc d'errades. |
| **⚖️ Casos** | Casos pràctics amb **correcció per criteris** (offline) i opció de **correcció amb Claude** (només si l'oposició en té). |
| **🕓 Historial** | Exàmens desats, notes i progrés d'estudi (tot al dispositiu, amb sincronització opcional). |

### Format d'examen
Cada oposició o curs pot definir el seu format a `temari.json` (punts, penalització, temps, nombre de
preguntes i nota mínima; vegeu `GUIA-CONTINGUT.md`). Si no en defineix cap, s'aplica la **Base 7.7 de
Montornès**: test amb 4 respostes, **−25 %** per errada, màx. **25 punts** (mín. 12,5); prova pràctica
màx. **45 punts** (mín. 22,5).

---

## Com es corregeixen els casos teòrico-pràctics

Hi ha **dos modes** (configurables a cada cas, a la pantalla de resultats):

1. **Motor de criteris (per defecte, gratis i offline).** Cada cas porta una **rúbrica** de conceptes clau
   amb pesos. En enviar la resposta, l'app detecta quins conceptes has cobert i **pre-marca** la rúbrica;
   tu pots ajustar les caselles i la nota es recalcula sola. Es mostra sempre la **resposta model**.
2. **Correcció amb Claude (opcional, API pròpia).** A cada cas pots desplegar *«Correcció amb Claude»*,
   enganxar la teva **clau API** (`console.anthropic.com`) i obtenir una correcció redactada per Claude.
   La clau es desa **només al teu navegador** i s'envia exclusivament a l'API d'Anthropic. Té un cost de
   cèntims per correcció.

> El mode 1 no necessita ni connexió ni clau; el mode 2 és per quan vulguis una correcció redactada «de veritat».

---

## Afegir contingut (preguntes, casos, resums)

Tot el contingut viu a fitxers JSON dins de [`/data/<oposició>/`](./data):

- `questions.json` — preguntes tipus test.
- `cases.json` — casos pràctics + rúbriques.
- `resums.json` — resums dels temes.
- `temari.json` — els temes, els blocs, les fonts oficials i el format d'examen *(no cal tocar-lo normalment)*.

### Format d'una pregunta test
```json
{
  "theme": 6, "block": 2,
  "q": "Enunciat de la pregunta?",
  "options": ["Opció A", "Opció B", "Opció C", "Opció D"],
  "correct": 1,                       // índex 0-3 de la correcta
  "explain": "Per què és correcta.",
  "source": "L39_2015",              // clau de norma a temari.json
  "article": "art. 24 Llei 39/2015"
}
```

### Format d'un cas pràctic
```json
{
  "id": "c13-...", "theme": 24, "block": 5, "maxPoints": 45,
  "title": "Títol del cas",
  "context": "Supòsit de fet…",
  "prompt": "Què es demana…",
  "criteria": [
    { "id": "c1", "label": "Criteri avaluable", "weight": 12,
      "keywords": [["sinònim1","sinònim2"], ["altre concepte"]] }
  ],
  "model": "Resposta model (admet llistes amb «- »).",
  "sources": ["LCSP"]
}
```
Les `keywords` són grups de sinònims: el criteri es considera cobert si la resposta menciona prou grups.

> Les dades d'oposicions **privades** (UOC MBA) no són aquí sinó al seu repositori privat, amb el mateix esquema.

---

## Desplegament a GitHub Pages

L'app és un lloc **estàtic** (sense build). La manera més senzilla de publicar-la:

1. **Settings → Pages → Build and deployment → Source: _Deploy from a branch_.**
2. Branca: **`main`** · carpeta: **`/ (root)`** · **Save**.
3. Al cap d'1-2 minuts la URL apareix a *Settings → Pages*.

El fitxer `.nojekyll` evita que GitHub processi el lloc amb Jekyll.

> Si actualitzes el contingut i no el veus al mòbil, fes una recàrrega forçada
> (l'app usa un *service worker* amb memòria cau; en canviar de versió es refresca sol).

### Provar-ho en local
```bash
python3 -m http.server 8000
# obre http://localhost:8000
```

---

## Tecnologia

- **HTML + CSS + JavaScript (mòduls ES)** vanilla, sense build ni dependències.
- **PWA** amb `manifest.webmanifest` i `sw.js` (offline-first).
- Dades en **JSON** servits estàticament. Persistència amb **localStorage** (100% al navegador).

---

## Avís

Material d'**estudi no oficial** generat amb ajuda d'IA. Les preguntes, casos i resums poden contenir
imprecisions: **contrasta sempre amb la normativa consolidada** abans de l'examen. ⚠️ En urbanisme, el
TRLUC (DL 1/2010) va ser modificat per la **Llei 11/2025** i el **DL 2/2025** (vigents des del 31-12-2025).
