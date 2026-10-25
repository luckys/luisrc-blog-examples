import json
import math
from pathlib import Path
from experiments import calculate, source_hashes

def compare(a,b,path='result'):
    if isinstance(a,dict):
        assert a.keys()==b.keys(),path
        for key in a: compare(a[key],b[key],path+'.'+key)
    elif isinstance(a,list):
        assert len(a)==len(b),path
        for i,(x,y) in enumerate(zip(a,b)):compare(x,y,path+f'[{i}]')
    elif isinstance(a,(float,int)) and not isinstance(a,bool):
        assert math.isclose(a,b,rel_tol=1e-10,abs_tol=1e-12),(path,a,b)
    else: assert a==b,(path,a,b)

report=json.loads(Path('results/training.json').read_text())
assert report['kind']=='numpy_training_observations_on_synthetic_xor'
assert report['sources']==source_hashes()
assert report==json.loads(Path('training.json').read_text())
compare(report['results'],calculate())
print('Cinco recorridos NumPy reentrenados: curvas, pesos, inferencias, splits y hashes coinciden con las tolerancias declaradas.')
