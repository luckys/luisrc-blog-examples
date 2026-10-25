import json
import hashlib
import platform
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import torch
from training import make_split, train_run, initialize, gradients, flatten, accumulated_gradient
from optimizers import Optimizer

SOURCES = ['package.json','runtime.json','protocol.json','fetch-runtime.mjs','run.mjs',
           'optimizers.py','training.py','experiments.py','verify.py',
           'tests/test_optimizers.py','tests/test_training.py','../neural-foundations/neural.py']


def hashes():
    return {p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in SOURCES}


def calculate(protocol):
    d = protocol['dataset']
    x,y = make_split(d['trainPerQuadrant'],d['trainSeed'],d['halfWidth'])
    vx,vy = make_split(d['validationPerQuadrant'],d['validationSeed'],d['halfWidth'])
    runs = []
    for seed in protocol['initialSeeds']:
        for kind, options in protocol['optimizers'].items():
            run = train_run(x,y,vx,vy,seed,kind,options,protocol['epochs'],protocol['batchSize'],protocol['orderSeed'])
            runs.append({'id':f'{kind}-{seed}',**run})
    for a in protocol['ablations']:
        options = {**protocol['optimizers'][a['optimizer']]}
        if 'lr' in a: options['lr']=a['lr']
        run=train_run(x,y,vx,vy,7,a['optimizer'],options,protocol['epochs'],
                      a.get('batchSize',protocol['batchSize']),protocol['orderSeed'],
                      schedule=protocol['schedule'] if 'schedule' in a else None)
        runs.append({'id':a['name'],**run})
    probes=[]
    xx,yy=x[:13],y[:13]
    layers=initialize(4,7)
    whole=flatten(gradients(xx,yy,layers))
    weighted=flatten(accumulated_gradient(xx,yy,layers,5))
    naive=flatten(accumulated_gradient(xx,yy,layers,5,naive=True))
    for kind, options in protocol['optimizers'].items():
        a=train_run(x,y,vx,vy,7,kind,options,protocol['accumulation']['epochs'],32,protocol['orderSeed'])
        b=train_run(x,y,vx,vy,7,kind,options,protocol['accumulation']['epochs'],32,protocol['orderSeed'],micro_size=protocol['accumulation']['microSize'])
        probes.append({'optimizer':kind,'wholeUpdates':a['updates'],'microUpdates':b['updates'],
                       'maxParameterError':float(np.max(np.abs(np.asarray(a['parameters'])-b['parameters']))),
                       'maxLossError':max(abs(ha['trainLoss']-hb['trainLoss']) for ha,hb in zip(a['history'],b['history']))})
    scalar=[]
    for lr in [.001,.1,.21]:
        theta=1.;points=[]
        for update in range(21):
            points.append({'update':update,'theta':theta,'loss':5*theta*theta})
            theta-=lr*10*theta
        scalar.append({'lr':lr,'points':points})
    decay=[]
    for kind in ['adam','adamw']:
        value=Optimizer([np.array([2.])],kind,decay=.1).step([np.array([2.])],[np.array([0.])],.01)
        decay.append({'optimizer':kind,'before':2.,'gradient':0.,'after':float(value[0][0])})
    return {'runs':runs,'accumulation':{'whole':whole.tolist(),'weighted':weighted.tolist(),'naive':naive.tolist(),
            'maxWeightedError':float(np.max(np.abs(whole-weighted))),
            'maxNaiveError':float(np.max(np.abs(whole-naive))),'training':probes},
            'scalar':scalar,'decay':decay,
            'dataHashes':{name:hashlib.sha256(a.astype('<f8').tobytes()).hexdigest() for name,a in [('trainX',x),('trainY',y),('validationX',vx),('validationY',vy)]}}


if __name__=='__main__':
    torch.set_num_threads(1)
    torch.set_num_interop_threads(1)
    protocol=json.loads(Path('protocol.json').read_text())
    print(json.dumps({'kind':'optimizer_training_observations','generatedAt':datetime.now(timezone.utc).isoformat(),
          'runtime':{'python':platform.python_version(),'numpy':np.__version__,'torch':torch.__version__,
                     'device':'cpu','machine':platform.machine(),'torchThreads':torch.get_num_threads()},
          'protocol':protocol,'sources':hashes(),**calculate(protocol)},allow_nan=False))
