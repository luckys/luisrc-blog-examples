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
    elif isinstance(a,float):assert math.isclose(a,b,rel_tol=1e-5,abs_tol=1e-7),(path,a,b)
    else:assert a==b,(path,a,b)

if __name__=='__main__':
    stored=json.loads(Path('comparison.json').read_text());assert stored==json.loads(Path('results/training.json').read_text())
    fresh=run();compare(stored,fresh)
    for r in fresh['runs']:
        assert r['updates']==(640 if r['task']=='memory' else 240)
        if r['task']=='memory':
            assert len(r['lengthProbes'])==6 and len(r['traces'])==2
            assert r['embedding'][0]==[0.]*8
        else:assert len(r['examples'])==8
    assert all(c['maxError']<1e-12 for c in fresh['probes']['cells'].values())
    print('12 entrenamientos, celdas, estados, gradientes y rollouts reproducidos')
