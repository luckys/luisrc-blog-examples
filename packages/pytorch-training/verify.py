import json
import platform
from pathlib import Path
import torch
import numpy as np
from experiments import calculate, hashes


def compare(a,b):
    if isinstance(a,dict):
        assert a.keys()==b.keys()
        for k in a:compare(a[k],b[k])
    elif isinstance(a,list):
        assert len(a)==len(b)
        for x,y in zip(a,b):compare(x,y)
    elif isinstance(a,float):
        np.testing.assert_allclose(a,b,rtol=1e-10,atol=1e-12)
    else:
        assert a==b,(a,b)


if __name__=='__main__':
    torch.set_num_threads(1)
    torch.set_num_interop_threads(1)
    report=json.loads(Path('results/training.json').read_text())
    assert report==json.loads(Path('comparison.json').read_text())
    assert report['kind']=='pytorch_end_to_end_training_observations'
    assert report['sources']==hashes()
    assert report['runtime']['python']==platform.python_version()
    assert report['runtime']['numpy']==np.__version__
    assert report['runtime']['torch']==str(torch.__version__)
    config=json.loads(Path('protocol.json').read_text())
    assert config==report['protocol']
    result=calculate(config)
    for k in result:compare(result[k],report[k])
    full=report['resumed'][0]
    assert full['maxParameterError']==0 and full['historyExactlyEqual']
    assert report['inference']['maxLogitError']==0
    assert all(r['maxParameterError']>1e-8 for r in report['resumed'][1:])
    print('PyTorch runs, real checkpoint files, exact local resume and three incomplete controls reproduced.')
