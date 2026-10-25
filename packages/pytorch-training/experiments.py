import hashlib
import json
import platform
import tempfile
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import torch
from pipeline import make_session, train_until, model_vector, make_data, evaluate
from checkpoints import save_inference, load_inference, save_resume, load_resume
from probes import tensor_probe, mode_probe, snapshot_probe

SOURCES = ['package.json','runtime.json','protocol.json','fetch-runtime.mjs','run.mjs',
           'pipeline.py','checkpoints.py','probes.py','experiments.py','verify.py',
           'tests/test_pipeline.py','tests/test_contracts.py','../neural-foundations/neural.py']


def hashes():
    return {f:hashlib.sha256(Path(f).read_bytes()).hexdigest() for f in SOURCES}


def describe(s):
    return {'seed':s.seed,'history':s.history,'trace':s.trace,'finalParameters':model_vector(s.model).tolist()}


def calculate(config):
    runs=[]
    for seed in config['initialSeeds']:
        s=make_session(config,seed)
        train_until(s,config['epochs'])
        runs.append({'id':f'seed-{seed}',**describe(s)})
    full=runs[0]
    part=make_session(config,7)
    train_until(part,config['checkpointEpoch'])
    resumed=[]
    with tempfile.TemporaryDirectory() as directory:
        path=Path(directory)/'resume.pt'
        save_resume(path,part)
        for variant in ['full','optimizer_reset','order_reset','weights_only']:
            session=make_session(config,7)
            payload=load_resume(path,session,variant)
            rng_equal=torch.equal(torch.get_rng_state(),payload['torchRng'])
            loader_equal=torch.equal(session.generator.get_state(),payload['loaderRng'])
            train_until(session,config['epochs'])
            vector=model_vector(session.model)
            error=float(np.max(np.abs(vector-np.asarray(full['finalParameters']))))
            resumed.append({'variant':variant,**describe(session),'maxParameterError':error,
                            'cpuRngMatchesSaved':rng_equal,'loaderRngMatchesSaved':loader_equal,
                            'historyExactlyEqual':session.history==full['history']})
        end=make_session(config,7)
        train_until(end,config['epochs'])
        inference_path=Path(directory)/'inference.pt'
        save_inference(inference_path,end.model,config)
        loaded=load_inference(inference_path,config)
        x=torch.tensor(make_data(config)[1][0],dtype=torch.float64)
        with torch.no_grad():
            before=end.model(x);after=loaded(x)
        inference={'fileReloaded':True,'maxLogitError':float((before-after).abs().max()),
                   'modelMode':loaded.training,'before':before[:8].tolist(),'after':after[:8].tolist(),
                   'parameterCount':sum(p.numel() for p in loaded.parameters())}
    initial=make_session(config,7)
    stats=evaluate(initial.model,initial.validation)
    (x,y),(vx,vy)=make_data(config)
    return {'runs':runs,'resumed':resumed,'inference':inference,
            'probes':{'tensors':tensor_probe(),'modes':mode_probe(),'snapshots':snapshot_probe(),
                      'validationAggregation':stats},
            'dataHashes':{name:hashlib.sha256(a.astype('<f8').tobytes()).hexdigest()
                          for name,a in [('trainX',x),('trainY',y),('validationX',vx),('validationY',vy)]}}


if __name__=='__main__':
    torch.set_num_threads(1)
    torch.set_num_interop_threads(1)
    config=json.loads(Path('protocol.json').read_text())
    print(json.dumps({'kind':'pytorch_end_to_end_training_observations',
          'generatedAt':datetime.now(timezone.utc).isoformat(),
          'runtime':{'python':platform.python_version(),'numpy':np.__version__,'torch':str(torch.__version__),
                     'device':'cpu','machine':platform.machine(),'threads':torch.get_num_threads()},
          'protocol':config,'sources':hashes(),**calculate(config)},allow_nan=False))
