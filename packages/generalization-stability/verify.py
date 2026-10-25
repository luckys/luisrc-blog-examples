import json
import platform
from pathlib import Path
import numpy as np
import torch
from experiments import calculate,hashes

def compare(a,b):
    if isinstance(a,dict):
        assert a.keys()==b.keys()
        for k in a:compare(a[k],b[k])
    elif isinstance(a,list):
        assert len(a)==len(b)
        for x,y in zip(a,b):compare(x,y)
    elif isinstance(a,float):np.testing.assert_allclose(a,b,rtol=1e-9,atol=1e-11)
    else:assert a==b,(a,b)

if __name__=='__main__':
    torch.set_num_threads(1);torch.set_num_interop_threads(1);torch.use_deterministic_algorithms(True)
    report=json.loads(Path('comparison.json').read_text());assert report==json.loads(Path('results/training.json').read_text())
    assert report['sources']==hashes();assert report['kind']=='generalization_and_stability_observations'
    assert [report['runtime'][k] for k in ['python','numpy','torch']]==[platform.python_version(),np.__version__,str(torch.__version__)]
    config=json.loads(Path('protocol.json').read_text());assert config==report['protocol']
    result=calculate(config)
    for key in result:compare(result[key],report[key])
    improved_seeds=[];worse_seeds=[]
    for seed in config['initialSeeds']:
        baseline=next(r for r in report['runs'] if r['id']==f'baseline-{seed}')
        early=next(r for r in report['runs'] if r['id']==f'early_stopping-{seed}')
        assert early['stoppedEarly'] and early['restoredBest']
        assert baseline['last']['trainMse']<baseline['best']['trainMse']
        assert baseline['last']['validationMse']>baseline['best']['validationMse']
        assert early['history']==baseline['history'][:len(early['history'])]
        assert early['selected']['validationMse']==min(h['validationMse'] for h in early['history'])
        assert early['last']['epoch']==early['best']['epoch']+config['earlyStopping']['patience']*config['monitorEvery']
        (improved_seeds if early['selected']['validationMse']<baseline['last']['validationMse'] else worse_seeds).append(seed)
    assert improved_seeds==[7,31] and worse_seeds==[19]
    print('18 training runs, overfitting/early-stopping contrasts and numerical controls reproduced.')
