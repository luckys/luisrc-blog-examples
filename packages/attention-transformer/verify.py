import json,math
from pathlib import Path
from experiments import run

def compare(a,b,path='report'):
    if isinstance(a,dict):
        assert a.keys()==b.keys(),path
        for key in a:
            if key!='capturedAt':compare(a[key],b[key],path+'.'+key)
    elif isinstance(a,list):
        assert len(a)==len(b),path
        for index,(x,y) in enumerate(zip(a,b)):compare(x,y,f'{path}[{index}]')
    elif isinstance(a,float):assert math.isclose(a,b,rel_tol=1e-10,abs_tol=1e-12),(path,a,b)
    else:assert a==b,(path,a,b)

if __name__=='__main__':
    saved=json.loads(Path('comparison.json').read_text());assert saved==json.loads(Path('results/observations.json').read_text())
    fresh=run();compare(saved,fresh)
    for c in fresh['cases']:assert max(c['sdpaError'],c['mhaError'],c['mhaWeightError'])<1e-12
    for m in fresh['models']:
        assert m['prefixError']==0 and m['seqTargetPrefixError']==0 and m['seqPaddingPrefixError']==0
        assert m['unmaskedPrefixChange']>1e-5 and m['seqSourceChange']>1e-5
        assert all(v==0 for row in m['inputGradient'][0][2:] for v in row)
    print('9 casos, 3 modelos de cada arquitectura y controles de causalidad recalculados; sin entrenamiento')
