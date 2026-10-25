import hashlib
import json
import os
import platform
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
from neural import (initialize, train, metrics, forward, sigmoid, deserialize,
                    dense, compose_affine, Layer, xor_features, make_split)

SOURCE_FILES = ['package.json', 'runtime.json', 'protocol.json', 'neural.py',
                'experiments.py', 'verify.py', 'run.mjs', 'tests/test_neural.py']

def source_hashes() -> dict[str, str]:
    return {file: hashlib.sha256(Path(file).read_bytes()).hexdigest() for file in SOURCE_FILES}


def calculate() -> dict:
    protocol = json.loads(Path('protocol.json').read_text())
    d, t, g = protocol['dataset'], protocol['training'], protocol['grid']
    splits = {}
    for name in ['train', 'validation', 'test']:
        x, y = make_split(d[name+'PerQuadrant'], d[name+'Seed'], d['halfWidth'])
        splits[name] = (x, y)
    train_x, train_y = splits['train']; validation_x, validation_y = splits['validation']
    step = (g['max']-g['min'])/g['size']
    positions = g['min'] + step * (np.arange(g['size']) + .5)
    grid = np.array([[x,y] for y in positions[::-1] for x in positions])
    probes = np.asarray(protocol['probePoints'], dtype=np.float64)
    specifications = [('linear', 0, 7, False), ('zero', t['width'], 7, True)]
    specifications += [('mlp-'+str(seed), t['width'], seed, False) for seed in t['seeds']]
    cases = []
    for name, width, seed, zero in specifications:
        final, history = train(train_x, train_y, validation_x, validation_y,
                               initialize(width, seed, zero), t['epochs'],
                               t['learningRate'], t['recordEvery'])
        for snapshot in history:
            parameters = deserialize(snapshot['layers'])
            logits, hidden = forward(probes, parameters)
            snapshot['probeProbability'] = sigmoid(logits).ravel().tolist()
            snapshot['probeHidden'] = hidden.tolist() if width else None
        test_x, test_y = splits['test']
        grid_logits, grid_hidden = forward(grid, final)
        cases.append({'id': name, 'width': width, 'seed': seed, 'zero': zero,
                      'parameterCount': sum(a.weight.size+a.bias.size for a in final),
                      'history': history, 'test': metrics(test_x, test_y, final),
                      'testProbability': sigmoid(forward(test_x, final)[0]).ravel().tolist(),
                      'gridProbability': sigmoid(grid_logits).ravel().tolist(),
                      'gridHidden': grid_hidden.tolist() if width else None})
    first = Layer(np.array([[1.,2.,3.],[4.,5.,6.]]),np.array([.1,.2,.3]))
    second = Layer(np.array([[1.],[-2.],[.5]]),np.array([.4]))
    samples = np.array([[1.,2.],[-1.,3.]])
    collapse_error = float(np.max(np.abs(dense(dense(samples,first),second)-dense(samples,compose_affine(first,second)))))
    activation_x = np.linspace(-5,5,101)
    return {'cases': cases, 'splits': {n:{'x':x.tolist(),'y':y.ravel().tolist()} for n,(x,y) in splits.items()},
            'grid': {'points':grid.tolist(), 'size':g['size'], 'min':g['min'], 'max':g['max']},
            'activation': {'x':activation_x.tolist(),'tanh':np.tanh(activation_x).tolist(),
                           'sigmoid':sigmoid(activation_x).tolist(),'relu':np.maximum(0,activation_x).tolist()},
            'affineCollapseMaxAbsError':collapse_error,
            'manualXor':xor_features(np.array([[0.,0.],[0.,1.],[1.,0.],[1.,1.]])).tolist()}


def report() -> dict:
    runtime = json.loads(Path('runtime.json').read_text())
    if platform.python_version()!=runtime['python'] or np.__version__!=runtime['numpy']:
        raise RuntimeError('use the pinned container runtime')
    cpu = next((line.split(':',1)[1].strip() for line in Path('/proc/cpuinfo').read_text().splitlines()
                if line.startswith('model name')), 'not reported')
    return {'generatedAt':datetime.now(timezone.utc).isoformat(), 'kind':'numpy_training_observations_on_synthetic_xor',
            'runtime':{'python':platform.python_version(),'numpy':np.__version__,'architecture':platform.machine(),
                       'cpuModel':cpu,'threads':{k:os.environ.get(k) for k in ['OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS']}},
            'protocol':json.loads(Path('protocol.json').read_text()), 'sources':source_hashes(), 'results':calculate(),
            'limits':{'realWorldGeneralization':False,'probabilityCalibrationVerified':False,
                      'optimizerComparison':False,'universalApproximationProvedByExperiment':False}}

if __name__=='__main__':
    print(json.dumps(report(),ensure_ascii=False,allow_nan=False))
