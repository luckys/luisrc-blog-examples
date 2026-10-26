"""Two independent synthetic tasks; no external corpus or tokenizer."""
import json
from pathlib import Path
import numpy as np
import torch

PROTOCOL=json.loads(Path('protocol.json').read_text())
PAD,BOS,EOS=0,8,9

def memory_data(count,seed,fixed_length=None):
    if count%2:raise ValueError('balanced probe requires an even count')
    rng=np.random.default_rng(seed)
    labels=np.repeat([0,1],count//2);rng.shuffle(labels)
    lo,hi=PROTOCOL['memory']['trainLengths']
    lengths=rng.integers(lo,hi+1,size=count) if fixed_length is None else np.full(count,fixed_length)
    if lengths.min()<2:raise ValueError('need a first symbol and QUERY')
    tokens=np.zeros((count,int(lengths.max())),dtype=np.int64)
    for i,(length,label) in enumerate(zip(lengths,labels)):
        tokens[i,0]=label+1
        tokens[i,1:length-1]=rng.integers(3,7,size=length-2)
        tokens[i,length-1]=7
    return torch.tensor(tokens),torch.tensor(lengths),torch.tensor(labels,dtype=torch.long)

def continuation_data(count,seed):
    rng=np.random.default_rng(seed);rows=[]
    length=PROTOCOL['continuation']['tokens']
    for _ in range(count):
        start=int(rng.integers(0,4));direction=int(rng.choice([-1,1]))
        rows.append([1+(start+direction*t)%4 for t in range(length)]+[EOS])
    return torch.tensor(rows,dtype=torch.long)

def decoder_inputs(targets):
    inputs=torch.full_like(targets,PAD)
    inputs[:,0]=BOS
    inputs[:,1:]=targets[:,:-1]
    return inputs
