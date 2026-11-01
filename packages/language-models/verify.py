import json,hashlib,subprocess,sys,math
from pathlib import Path

expected=json.loads(Path('results/observations.json').read_text())
for file,digest in expected['sourceHashes'].items():
    assert hashlib.sha256(Path(file).read_bytes()).hexdigest()==digest,file
actual=json.loads(subprocess.run([sys.executable,'-B','experiments.py'],check=True,capture_output=True,text=True).stdout)
def compare(a,b,path='root'):
    if isinstance(a,bool) or a is None or isinstance(a,str):
        assert a==b,path
    elif isinstance(a,(int,float)):
        assert math.isclose(a,b,rel_tol=1e-10,abs_tol=1e-12),f'{path}:{a}!={b}'
    elif isinstance(a,list):
        assert isinstance(b,list) and len(a)==len(b),path
        for i,(x,y) in enumerate(zip(a,b)):compare(x,y,path+f'[{i}]')
    elif isinstance(a,dict):
        assert isinstance(b,dict) and a.keys()==b.keys(),path
        for key in a:compare(a[key],b[key],path+'.'+key)
    else:raise TypeError(path)
for key in ['runtime','sourceHashes','protocol','vocabulary','baseline','runs']:
    compare(expected[key],actual[key],key)
print('Three causal Transformer runs re-trained: all weights,losses,logits,probabilities,metrics and causality controls match at rtol1e-10/atol1e-12')
