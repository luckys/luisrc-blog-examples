import hashlib,json,platform
from datetime import datetime,timezone
from pathlib import Path
import numpy as np
import torch
from torch.nn import functional as F
from attention import DTYPE,MultiHead,allowed_keys,native_mha
from probes import observations,causal_observation,maximum_error

SOURCES=['attention.py','transformer.py','probes.py','experiments.py','verify.py','protocol.json','runtime.json','run.mjs','tests/test_attention.py','tests/test_transformer.py']

def serial(value):
    if isinstance(value,torch.Tensor):return value.detach().tolist()
    if isinstance(value,dict):return {key:serial(v) for key,v in value.items()}
    return value

def run():
    protocol=json.loads(Path('protocol.json').read_text());cases=[];models=[]
    source=torch.randn(2,4,8,dtype=DTYPE,generator=torch.Generator().manual_seed(101))
    target=torch.randn(2,5,8,dtype=DTYPE,generator=torch.Generator().manual_seed(102))
    for seed in protocol['seeds']:
        for name,query,context,lengths,causal in [('self_full',source,source,torch.tensor([4,2]),False),('self_causal',target,target,torch.tensor([5,3]),True),('cross',target,source,torch.tensor([4,2]),False)]:
            model=MultiHead(8,2,seed).eval();allow=allowed_keys(lengths,query.shape[1],context.shape[1],causal)
            output,trace=model(query,context,allow)
            sdpa=F.scaled_dot_product_attention(trace['query'],trace['key'],trace['value'],attn_mask=allow,dropout_p=0)
            native,weights=native_mha(model,query,context,allow)
            cases.append(dict(id=f'{name}-{seed}',name=name,seed=seed,queryInput=query.tolist(),contextInput=context.tolist(),keyLengths=lengths.tolist(),parameters=sum(p.numel() for p in model.parameters()),trace=serial(trace),sdpaError=maximum_error(trace['attended'],sdpa),mhaError=maximum_error(output,native),mhaWeightError=maximum_error(trace['weights'],weights)))
        record,lm,seq=causal_observation(seed)
        models.append(dict(**record,lm=serial(lm),sequence=serial(seq)))
    return dict(kind='attention_transformer_observations',schema=1,capturedAt=datetime.now(timezone.utc).isoformat(),protocol=protocol,runtime=dict(python=platform.python_version(),numpy=np.__version__,torch=torch.__version__),sourceHashes={name:hashlib.sha256(Path(name).read_bytes()).hexdigest() for name in SOURCES},cases=cases,models=models,probes=observations())

if __name__=='__main__':print(json.dumps(run(),allow_nan=False))
