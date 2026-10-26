import hashlib
import json
import platform
from pathlib import Path
from tempfile import TemporaryDirectory
from datetime import datetime,timezone
import numpy as np
import torch
from networks import TinyCNN, configure_target
from training import PROTOCOL,datasets,train,feature_record,digest_data
from probes import arithmetic_probes

SOURCES=['geometry.py','probes.py','networks.py','training.py','experiments.py','verify.py','protocol.json','runtime.json','run.mjs','tests/test_probes.py','tests/test_training.py']

def run():
    source=datasets('source');target=datasets('target');runs=[];features=[];filters=None
    with TemporaryDirectory(prefix='cnn-transfer-') as directory:
        for seed in PROTOCOL['seeds']:
            model=TinyCNN(4,seed)
            runs.append(train(model,source,seed,'source'))
            path=Path(directory)/f'backbone-{seed}.pt'
            torch.save(model.backbone.state_dict(),path)
            state=torch.load(path,map_location='cpu',weights_only=True)
            for mode in PROTOCOL['targetModes']:
                target_model=configure_target(state,seed,mode)
                runs.append(train(target_model,target,seed,mode))
            if seed==7:
                x,y=source['validation']
                for label in range(4):
                    index=int((y==label).nonzero()[0])
                    features.append(feature_record(model,x[index:index+1],label,index))
                filters=model.backbone.conv1.weight.detach()[:,0].tolist()
    return dict(kind='convolutional_network_observations',schema=1,capturedAt=datetime.now(timezone.utc).isoformat(),runtime=dict(python=platform.python_version(),numpy=np.__version__,torch=torch.__version__),protocol=PROTOCOL,sourceHashes={name:hashlib.sha256(Path(name).read_bytes()).hexdigest() for name in SOURCES},dataHashes=dict(source=digest_data(source),target=digest_data(target)),runs=runs,features=features,filters=filters,probes=arithmetic_probes())

if __name__=='__main__':print(json.dumps(run(),allow_nan=False))
