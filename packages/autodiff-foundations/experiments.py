import hashlib
import json
import os
import platform
from pathlib import Path
from datetime import datetime, timezone
import numpy as np
import torch
from base import initialize, deserialize
from manual import backward_trace, manual_vector, finite_gradient, mutant_vectors, scalar_trace, pack
from framework import torch_gradient, graph_checks, vector_product, scalar_framework

SOURCES=['package.json','runtime.json','protocol.json','fetch-runtime.mjs','run.mjs','base.py',
         'manual.py','framework.py','experiments.py','verify.py','tests/test_manual.py','tests/test_torch.py',
         '../neural-foundations/neural.py','../neural-foundations/results/training.json']


def hashes() -> dict[str,str]:
    return {f:hashlib.sha256(Path(f).read_bytes()).hexdigest() for f in SOURCES}


def serial(value):
    if isinstance(value,np.ndarray): return value.tolist()
    if isinstance(value,dict): return {k:serial(v)for k,v in value.items()}
    if isinstance(value,list): return [serial(v)for v in value]
    return value


def error_summary(candidate, reference, rtol, atol):
    difference=np.abs(candidate-reference)
    relative=difference/np.maximum(1e-12,np.abs(candidate)+np.abs(reference))
    return {'maxAbsError':float(difference.max()),'maxRelativeError':float(relative.max()),
            'passes':bool(np.allclose(candidate,reference,rtol=rtol,atol=atol))}


def calculate() -> dict:
    protocol=json.loads(Path('protocol.json').read_text())
    parent=json.loads(Path('../neural-foundations/results/training.json').read_text())
    assert parent['sources']['neural.py']==hashlib.sha256(Path('../neural-foundations/neural.py').read_bytes()).hexdigest()
    x=np.asarray(protocol['points'],dtype=np.float64);y=np.asarray(protocol['targets'],dtype=np.float64)
    names=[f'{key}{list(i)}'for key,shape in [('W1',(2,4)),('b1',(4,)),('W2',(4,1)),('b2',(1,))]for i in np.ndindex(shape)]
    cases=[]
    for specification in protocol['cases']:
        if 'checkpoint'in specification:
            saved=next(c for c in parent['results']['cases']if c['id']=='mlp-7')
            snapshot=next(h for h in saved['history']if h['epoch']==specification['checkpoint'])
            layers=deserialize(snapshot['layers'])
        else: layers=initialize(protocol['width'],specification['seed'])
        trace=backward_trace(x,y,layers)
        manual=manual_vector(trace)
        auto,loss=torch_gradient(x,y,layers)
        finite=[]
        for epsilon in protocol['epsilons']:
            vector=finite_gradient(x,y,layers,epsilon)
            finite.append({'epsilon':epsilon,'vector':vector.tolist(),**error_summary(vector,manual,**{k:protocol['check'][k]for k in ['rtol','atol']})})
        reference=finite_gradient(x,y,layers,protocol['check']['epsilon'])
        mutants={name:{'vector':v.tolist(),**error_summary(v,reference,protocol['check']['rtol'],protocol['check']['atol'])}
                 for name,v in mutant_vectors(x,trace).items()}
        cases.append({'id':specification['id'],'parameters':pack(layers).tolist(),'names':names,
                      'trace':serial(trace),'manual':manual.tolist(),'torch':auto.tolist(),'torchLoss':loss,
                      'finite':finite,'mutants':mutants,'checks':graph_checks(x,y,layers),
                      'maxTorchError':float(np.abs(manual-auto).max()),
                      'vjpMaxError':float(np.abs(vector_product(x,y,layers)-manual).max())})
    scalars=[{'input':p,'manual':scalar_trace(**p),'torch':scalar_framework(**p)}for p in protocol['scalarPoints']]
    return {'cases':cases,'scalarCases':scalars}


def report() -> dict:
    runtime=json.loads(Path('runtime.json').read_text())
    assert (platform.python_version(),np.__version__,torch.__version__)==(runtime['python'],runtime['numpy'],runtime['torch'])
    torch.set_num_threads(1)
    torch.set_num_interop_threads(1)
    results=calculate()
    cpu=next((line.split(':',1)[1].strip()for line in Path('/proc/cpuinfo').read_text().splitlines()if line.startswith('model name')),'unknown')
    return {'kind':'manual_finite_difference_and_pytorch_autograd_observations',
            'generatedAt':datetime.now(timezone.utc).isoformat(),'protocol':json.loads(Path('protocol.json').read_text()),
            'runtime':{'python':platform.python_version(),'numpy':np.__version__,'torch':torch.__version__,
                       'device':'cpu','architecture':platform.machine(),'cpuModel':cpu,
                       'torchThreads':torch.get_num_threads(),'interopThreads':torch.get_num_interop_threads(),
                       'environment':{k:os.environ.get(k)for k in ['OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS']}},
            'sources':hashes(),**results,'limits':{'gpuVerified':False,'trainingConvergenceVerified':False,
                                                 'arbitraryFunctionsVerified':False,'higherOrderDerivativesVerified':False}}

if __name__=='__main__':print(json.dumps(report(),ensure_ascii=False,allow_nan=False))
