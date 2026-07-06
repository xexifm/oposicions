# Helper per afegir preguntes tipus test a data/<muni>/questions.json.
#
# Rota la posició de la resposta correcta (0→1→2→3…) i valida que les
# longituds de correcta i distractors quedin equilibrades (<12% de diferència),
# que els ids i els enunciats siguin únics i que hi hagi 4 opcions.
#
# Ús típic (un script per lot, p. ex. q_51_60.py):
#     import sys; sys.path.insert(0, 'tools')
#     from qadd import load, save, add, validate, POS, set_muni
#     set_muni('montornes')       # per defecte ja és 'montornes'
#     d = load(); POS[0] = 0
#     add(d, 51, 11, "Enunciat?", "correcta", ["d1","d2","d3"], "explic", "TRLUC", "Art. 73 TRLUC")
#     ...
#     validate(d, set(range(51, 61)))   # valida abans de desar
#     save(d)
import json, os

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MUNI = ['montornes']
POS = [0]

def set_muni(m):
    MUNI[0] = m

def _path():
    return os.path.join(_ROOT, 'data', MUNI[0], 'questions.json')

def load():
    with open(_path(), encoding='utf-8') as f:
        return json.load(f)

def save(d):
    with open(_path(), 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
        f.write('\n')

def add(d, theme, block, qtext, correct, distractors, explain, source, article):
    assert len(distractors) == 3, f"calen 3 distractors: {qtext[:40]}"
    idx = POS[0] % 4; POS[0] += 1
    options = list(distractors)
    options.insert(idx, correct)
    n = sum(1 for x in d['questions'] if x['theme'] == theme)
    q = {
        'id': f"t{theme:02d}q{n+1}",
        'theme': theme, 'block': block,
        'q': qtext, 'options': options, 'correct': idx,
        'explain': explain, 'source': source, 'article': article,
    }
    d['questions'].append(q)
    return q

def validate(d, themes):
    qs = [x for x in d['questions'] if x['theme'] in themes]
    ids = [x['id'] for x in d['questions']]
    assert len(ids) == len(set(ids)), 'ids duplicats'
    texts = [x['q'] for x in d['questions']]
    assert len(texts) == len(set(texts)), 'enunciats duplicats: ' + str([t for t in texts if texts.count(t) > 1][:2])
    pos = {0: 0, 1: 0, 2: 0, 3: 0}
    cl, dl = [], []
    for x in qs:
        assert len(x['options']) == 4 and 0 <= x['correct'] <= 3
        pos[x['correct']] += 1
        cl.append(len(x['options'][x['correct']]))
        for i, o in enumerate(x['options']):
            if i != x['correct']: dl.append(len(o))
    ca, da = sum(cl) / len(cl), sum(dl) / len(dl)
    print(f"temes {min(themes)}-{max(themes)}: {len(qs)} preguntes; posicions {pos}; correcta {ca:.0f} ch vs distractors {da:.0f} ch")
    assert abs(ca - da) / max(ca, da) < 0.12, f'longituds desequilibrades: {ca:.0f} vs {da:.0f} (escurça les correctes)'
