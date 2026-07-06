# tools/ — helpers per generar contingut

Scripts de suport per crear preguntes i casos d'una oposició amb les regles de
qualitat de la [guia de contingut](../GUIA-CONTINGUT.md) (seccions 3 i 4).

- **`qadd.py`** — afegeix preguntes tipus test a `data/<muni>/questions.json`.
  Rota la posició de la correcta i valida ids/enunciats únics i longituds
  equilibrades (<12% de diferència correcta vs distractors).
- **`cadd.py`** — afegeix casos pràctics a `data/<muni>/cases.json`. Valida
  pesos dels criteris (40-50), keywords i camps obligatoris.

Tots dos treballen per defecte sobre `montornes`; per a una altra oposició,
`set_muni('<muni>')` al principi del teu script.

## Exemple mínim

```python
import sys; sys.path.insert(0, 'tools')
from qadd import load, save, add, validate, POS, set_muni

set_muni('montornes')
d = load(); POS[0] = 0            # posició inicial de la correcta

add(d, 51, 11,
    "Quina durada màxima té la suspensió de llicències (arts. 73-74 TRLUC)?",
    "Un any la potestativa prèvia i fins a dos anys en total amb l'aprovació inicial",
    ["Sis mesos improrrogables en tot cas",
     "Tres anys des de l'acord d'iniciar la revisió del pla",
     "No hi ha límit mentre es tramita el nou planejament"],
    "Explicació rica amb l'article…", "TRLUC", "Arts. 73-74 TRLUC")
# … 4 preguntes més per al tema …

validate(d, set(range(51, 61)))   # sempre validar ABANS de desar
save(d)
```

Després: apuja la versió de `CACHE` a `sw.js` i desplega (un PR per lot).
Les regles completes i el pipeline són a `GUIA-CONTINGUT.md`.
