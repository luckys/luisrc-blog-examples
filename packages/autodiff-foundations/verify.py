import json
import math
from pathlib import Path
import torch
from experiments import calculate, hashes

def compare(a,b,path='results'):
    if isinstance(a,dict):
        assert a.keys()==b.keys(),path
        for k in a:compare(a[k],b[k],path+'.'+k)
    elif isinstance(a,list):
        assert len(a)==len(b),path
        for i,(x,y)in enumerate(zip(a,b)):compare(x,y,path+f'[{i}]')
    elif isinstance(a,(int,float))and not isinstance(a,bool):assert math.isclose(a,b,rel_tol=1e-10,abs_tol=1e-12),(path,a,b)
    else:assert a==b,(path,a,b)

torch.set_num_threads(1);torch.set_num_interop_threads(1)
report=json.loads(Path('comparison.json').read_text())
assert report==json.loads(Path('results/gradients.json').read_text())
assert report['sources']==hashes()
compare({'cases':report['cases'],'scalarCases':report['scalarCases']},calculate())
print('Tres puntos de parámetros y cuatro grafos escalares recalculados; PyTorch, VJP, gradcheck, diferencias finitas, controles y hashes verificados.')
