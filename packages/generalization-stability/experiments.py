import json
import hashlib
import platform
from datetime import datetime,timezone
from pathlib import Path
import numpy as np
import torch
from training import train_run,make_data
from probes import normalization_probe,dropout_probe,activation_probe,initialization_probe,clipping_probe,bias_variance
SOURCES=['package.json','runtime.json','protocol.json','fetch-runtime.mjs','run.mjs','training.py',
         'probes.py','experiments.py','verify.py','tests/test_training.py','tests/test_probes.py']

def hashes():return {f:hashlib.sha256(Path(f).read_bytes()).hexdigest() for f in SOURCES}

def calculate(config):
    data=make_data(config['data'])
    design=np.column_stack([np.ones(len(data['x'])),data['x'].ravel()])
    weights=np.linalg.lstsq(design,data['y'],rcond=None)[0]
    validation=np.column_stack([np.ones(len(data['vx'])),data['vx'].ravel()])
    return {'runs':[train_run(config,seed,variant) for seed in config['initialSeeds'] for variant in config['variants']],
            'data':{k:v.reshape(-1).tolist() for k,v in data.items()},
            'dataHashes':{k:hashlib.sha256(v.astype('<f8').tobytes()).hexdigest() for k,v in data.items()},
            'linearReference':{'method':'least_squares_closed_form','trainMse':float(((design@weights-data['y'])**2).mean()),
                               'validationMse':float(((validation@weights-data['vy'])**2).mean())},
            'normalization':normalization_probe(),'dropout':dropout_probe(),'activations':activation_probe(),
            'initialization':initialization_probe(),'clipping':clipping_probe(),
            'biasVariance':bias_variance(config['biasVariance'])}

if __name__=='__main__':
    torch.set_num_threads(1);torch.set_num_interop_threads(1);torch.use_deterministic_algorithms(True)
    config=json.loads(Path('protocol.json').read_text())
    print(json.dumps({'kind':'generalization_and_stability_observations',
          'generatedAt':datetime.now(timezone.utc).isoformat(),
          'runtime':{'python':platform.python_version(),'numpy':np.__version__,'torch':str(torch.__version__),
                     'device':'cpu','threads':torch.get_num_threads(),'machine':platform.machine()},
          'protocol':config,'sources':hashes(),**calculate(config)},allow_nan=False))
