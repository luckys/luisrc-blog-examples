import hashlib,json,platform
from pathlib import Path
from datetime import datetime,timezone
import numpy as np
import torch
from data import PROTOCOL,memory_data,continuation_data
from networks import MemoryModel,ContinuationModel
from training import train_memory,memory_metrics,memory_trace,train_continuation,data_hash
from probes import arithmetic_probes

SOURCES=['data.py','cells.py','networks.py','training.py','probes.py','experiments.py','verify.py','protocol.json','runtime.json','run.mjs','tests/test_cells.py','tests/test_training.py']

def run():
    p=PROTOCOL['memory'];q=PROTOCOL['continuation']
    train=memory_data(p['trainCount'],p['trainSeed']);validation=memory_data(p['validationCount'],p['validationSeed'])
    probes={length:memory_data(p['probeCount'],p['probeSeedBase']+length,fixed_length=length) for length in p['lengthProbes']}
    gen_train=continuation_data(q['trainCount'],q['trainSeed']);gen_validation=continuation_data(q['validationCount'],q['validationSeed'])
    train_patterns={tuple(row) for row in gen_train.tolist()};validation_patterns={tuple(row) for row in gen_validation.tolist()}
    continuation_summary=dict(trainUnique=len(train_patterns),validationUnique=len(validation_patterns),overlap=len(train_patterns&validation_patterns),possiblePatterns=8)
    runs=[]
    for seed in PROTOCOL['seeds']:
        for kind in p['kinds']:
            model=MemoryModel(kind,seed);result=train_memory(model,train,validation,seed)
            result['lengthProbes']=[dict(length=length,**memory_metrics(model,data,p['epochs'])) for length,data in probes.items()]
            result['traces']=[memory_trace(model,probes[length],0) for length in p['traceLengths']]
            result['embedding']=model.embed.weight.detach().tolist();runs.append(result)
        runs.append(train_continuation(ContinuationModel(seed),gen_train,gen_validation,seed))
    return dict(kind='recurrent_sequence_observations',schema=1,capturedAt=datetime.now(timezone.utc).isoformat(),protocol=PROTOCOL,runtime=dict(python=platform.python_version(),numpy=np.__version__,torch=torch.__version__),sourceHashes={f:hashlib.sha256(Path(f).read_bytes()).hexdigest() for f in SOURCES},dataHashes=dict(memoryTrain=data_hash(train),memoryValidation=data_hash(validation),lengthProbes={str(n):data_hash(v) for n,v in probes.items()},continuationTrain=data_hash(gen_train),continuationValidation=data_hash(gen_validation)),continuationDatasetSummary=continuation_summary,runs=runs,probes=arithmetic_probes())

if __name__=='__main__':print(json.dumps(run(),allow_nan=False))
