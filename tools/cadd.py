# Helper per afegir casos teòrico-pràctics a data/<muni>/cases.json.
#
# Cada cas: maxPoints 45, 3-4 criteris amb pesos (suma 40-50) i grups de
# sinònims (keywords SENSE accents, el motor normalitza), i resposta model.
# El prefix de l'id el tries: 'c' per al primer cas del tema, 'c2' per al segon.
#
# Ús típic (un script per lot):
#     import sys; sys.path.insert(0, 'tools')
#     from cadd import load, save, C, validate, set_muni
#     set_muni('montornes')       # per defecte ja és 'montornes'
#     d = load()
#     d['cases'].append(C(58, 12, 'slug', "Títol", "Context…", "Expliqueu: a)…",
#         [("criteri amb article i xifra", 12, [["sinonim1","sinonim2"],["grup2"]]), …],
#         "Resposta model a) b) c)…", ["TRLUC"], prefix='c2'))
#     validate(d)                  # valida abans de desar
#     save(d)
import json, os

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MUNI = ['montornes']

def set_muni(m):
    MUNI[0] = m

def _path():
    return os.path.join(_ROOT, 'data', MUNI[0], 'cases.json')

def load():
    with open(_path(), encoding='utf-8') as f:
        return json.load(f)

def save(d):
    with open(_path(), 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
        f.write('\n')

def C(theme, block, slug, title, context, prompt, criteria, model, sources, prefix='c2'):
    """criteria: llista de (label, weight, [[sinònims], ...]). prefix: 'c' o 'c2'."""
    crits = []
    for i, (label, weight, kws) in enumerate(criteria, 1):
        crits.append({'id': f'c{i}', 'label': label, 'weight': weight, 'keywords': kws})
    return {
        'id': f'{prefix}-t{theme}-{slug}',
        'theme': theme, 'block': block, 'maxPoints': 45,
        'title': title, 'context': context, 'prompt': prompt,
        'criteria': crits, 'model': model, 'sources': sources,
    }

def validate(d):
    ids = [c['id'] for c in d['cases']]
    assert len(ids) == len(set(ids)), 'ids duplicats'
    per = {}
    for c in d['cases']:
        per[c['theme']] = per.get(c['theme'], 0) + 1
        assert c['maxPoints'] == 45
        assert c['title'] and c['context'] and c['prompt'] and c['model']
        assert len(c['criteria']) >= 3, c['id']
        w = sum(cr['weight'] for cr in c['criteria'])
        assert 40 <= w <= 50, (c['id'], w)
        for cr in c['criteria']:
            assert cr['keywords'] and all(isinstance(g, list) and g for g in cr['keywords']), c['id']
    return per
