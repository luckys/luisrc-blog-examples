"""Readable float64 reference attention; bool masks always mean allowed here."""
import math
import torch
from torch import nn

torch.set_num_threads(1)
torch.use_deterministic_algorithms(True)
DTYPE=torch.float64

def stable_softmax(scores):
    shifted=scores-scores.max(dim=-1,keepdim=True).values
    exponentials=shifted.exp()
    return exponentials/exponentials.sum(dim=-1,keepdim=True)

def allowed_keys(lengths,query_length,key_length,causal=False):
    if lengths.ndim!=1 or lengths.dtype!=torch.int64:raise ValueError('lengths must be int64 batch vector')
    if bool((lengths<1).any()) or bool((lengths>key_length).any()):raise ValueError('invalid key lengths')
    allowed=(torch.arange(key_length)[None,:]<lengths[:,None])[:,None,None,:]
    allowed=allowed.expand(-1,1,query_length,-1)
    if causal:
        if query_length!=key_length:raise ValueError('this causal helper only supports square self-attention')
        allowed=allowed & torch.ones(query_length,key_length,dtype=torch.bool).tril()[None,None]
    return allowed

def scaled_attention(query,key,value,allowed):
    if any(t.ndim!=4 for t in [query,key,value]):raise ValueError('expected B,H,L,D tensors')
    if query.shape[:2]!=key.shape[:2] or key.shape[:3]!=value.shape[:3] or query.shape[-1]!=key.shape[-1]:raise ValueError('incompatible Q/K/V shapes')
    if min(query.shape[-2],key.shape[-2],query.shape[-1])<1:raise ValueError('empty attention axis')
    if any(not bool(torch.isfinite(t).all()) for t in [query,key,value]):raise ValueError('nonfinite input')
    if allowed.dtype!=torch.bool:raise ValueError('manual mask must be bool, True means allowed')
    raw=query@key.transpose(-2,-1)
    scores=raw/math.sqrt(query.shape[-1])
    allowed=torch.broadcast_to(allowed,scores.shape)
    if not bool(allowed.any(-1).all()):raise ValueError('no allowed key in a query row')
    weights=stable_softmax(scores.masked_fill(~allowed,float('-inf')))
    return weights@value,weights,scores

def initialize_linear(layer,generator):
    nn.init.xavier_uniform_(layer.weight,generator=generator)
    nn.init.zeros_(layer.bias)

class MultiHead(nn.Module):
    def __init__(self,size,heads,seed):
        super().__init__()
        if size<1 or heads<1 or size%heads:raise ValueError('size must be divisible by heads')
        self.size,self.heads,self.depth=size,heads,size//heads
        self.query=nn.Linear(size,size,dtype=DTYPE);self.key=nn.Linear(size,size,dtype=DTYPE)
        self.value=nn.Linear(size,size,dtype=DTYPE);self.output=nn.Linear(size,size,dtype=DTYPE)
        generator=torch.Generator().manual_seed(seed+1000)
        for layer in [self.query,self.key,self.value,self.output]:initialize_linear(layer,generator)

    def split(self,x):
        batch,length,_=x.shape
        return x.reshape(batch,length,self.heads,self.depth).transpose(1,2)

    def forward(self,query_input,context_input,allowed):
        query=self.split(self.query(query_input))
        key=self.split(self.key(context_input))
        value=self.split(self.value(context_input))
        attended,weights,scores=scaled_attention(query,key,value,allowed)
        joined=attended.transpose(1,2).contiguous().reshape(query_input.shape[0],query_input.shape[1],self.size)
        output=self.output(joined)
        return output,dict(query=query,key=key,value=value,rawScores=query@key.transpose(-2,-1),scores=scores,allowed=torch.broadcast_to(allowed,weights.shape),weights=weights,attended=attended,joined=joined,output=output)

def native_mha(model,query_input,context_input,allowed):
    native=nn.MultiheadAttention(model.size,model.heads,dropout=0,batch_first=True,dtype=DTYPE).eval()
    with torch.no_grad():
        native.in_proj_weight.copy_(torch.cat([model.query.weight,model.key.weight,model.value.weight]))
        native.in_proj_bias.copy_(torch.cat([model.query.bias,model.key.bias,model.value.bias]))
        native.out_proj.weight.copy_(model.output.weight);native.out_proj.bias.copy_(model.output.bias)
    batch,length,_=query_input.shape;keys=context_input.shape[1]
    forbidden=(~allowed).expand(batch,model.heads,length,keys).reshape(batch*model.heads,length,keys)
    return native(query_input,context_input,context_input,attn_mask=forbidden,need_weights=True,average_attn_weights=False)

def positional_encoding(length,size,base=10000):
    if size%2:raise ValueError('this sinusoidal reference requires even size')
    positions=torch.arange(length,dtype=DTYPE)[:,None]
    frequencies=torch.exp(-math.log(base)*torch.arange(0,size,2,dtype=DTYPE)/size)
    angles=positions*frequencies
    result=torch.empty(length,size,dtype=DTYPE)
    result[:,0::2]=angles.sin();result[:,1::2]=angles.cos()
    return result
