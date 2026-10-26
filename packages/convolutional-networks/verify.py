"""Re-train all fifteen runs; compare actual numeric evidence, not only hashes."""
import json
import math
from pathlib import Path
from experiments import run

def compare(a,b,path='report'):
    if isinstance(a,dict):
        assert a.keys()==b.keys(),path
        for key in a:
            if key!='capturedAt':compare(a[key],b[key],path+'.'+key)
    elif isinstance(a,list):
        assert len(a)==len(b),path
        for i,(x,y) in enumerate(zip(a,b)):compare(x,y,f'{path}[{i}]')
    elif isinstance(a,float):assert math.isclose(a,b,rel_tol=1e-6,abs_tol=1e-7),(path,a,b)
    else:assert a==b,(path,a,b)

if __name__=='__main__':
    stored=json.loads(Path('results/training.json').read_text())
    assert stored==json.loads(Path('comparison.json').read_text())
    fresh=run();compare(stored,fresh)
    for r in fresh['runs']:
        assert len(r['history'])==41
        assert r['updates']==(320 if r['mode']=='source' else 80)
        if 'frozen' in r['mode']:
            assert r['backboneMaxChange']==0 and r['headMaxChange']>0
        else: assert r['backboneMaxChange']>0
    assert all(c['maxError']==0 for c in fresh['probes']['cases'])
    print('15 entrenamientos, activaciones, gradientes, controles y hashes reproducidos')
