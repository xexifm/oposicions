# Simulador d'oposició · Tècnic/a superior en arquitectura/enginyeria

Web app per preparar el **concurs-oposició lliure** de tècnic/a superior en arquitectura/enginyeria
de l'**Ajuntament de Montornès del Vallès** (OPO 2024 · BOPB 18-3-2026 · CVE 202610051525).

Funciona al **PC i al mòbil**, es pot instal·lar com a **app (PWA)** i estudiar **sense connexió**.

👉 **App en línia:** `https://xexifm.github.io/montornes-del-valles/` *(disponible un cop activat GitHub Pages, vegeu més avall).*

---

## Què inclou

| Secció | Descripció |
|---|---|
| **📚 Estudi** | Resums dels **90 temes** de l'Annex I amb esquemes i fonts oficials, organitzats en blocs. |
| **📝 Examen** | Prova tipus test amb **correcció automàtica** i puntuació segons la Base 7.7. |
| **⚖️ Casos** | Casos teòrico-pràctics amb **correcció per criteris** (offline) i opció de **correcció amb Claude**. |
| **🕓 Historial** | Exàmens desats, notes i progrés d'estudi (tot al navegador). |
| **🔗 Fonts** | Tota la normativa del temari amb enllaços als textos consolidats (BOE / Portal Jurídic). |

### Format oficial reproduït (Base 7.7)
- **Prova 1 (test):** 4 respostes, **−25%** per errada, no contestades no resten. Màx. **25 punts** (mín. 12,5).
- **Prova 2 (teòric-pràctica):** supòsits pràctics. Màx. **45 punts** (mín. 22,5).
- Apte/a si s'arriba als dos mínims.

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

Tot el contingut viu a fitxers JSON dins de [`/data`](./data):

- `questions.json` — preguntes tipus test.
- `cases.json` — casos pràctics + rúbriques.
- `resums.json` — resums dels temes.
- `temari.json` — els 90 temes, blocs i fonts oficials *(no cal tocar-lo normalment)*.

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

> **Objectiu:** 1000 preguntes i 50 casos. Aquest repositori s'omple **per fases**; el lot actual cobreix
> tots els blocs perquè l'app sigui plenament funcional des del primer dia.

---

## Desplegament a GitHub Pages

Aquest repo inclou un workflow ([`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml))
que publica l'app automàticament. Per activar-ho un sol cop:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Fes un push a `main` (o executa el workflow manualment des de la pestanya *Actions*).
3. La URL apareixerà a *Settings → Pages* (normalment `https://<usuari>.github.io/montornes-del-valles/`).

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
