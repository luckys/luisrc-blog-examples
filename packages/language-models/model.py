import math
import torch
from torch import nn

class TinyCausalLM(nn.Module):
    def __init__(self, vocabulary_size):
        super().__init__()
        f={"dtype":torch.float64}
        self.token_embedding=nn.Embedding(vocabulary_size,16,**f)
        self.position_embedding=nn.Embedding(16,16,**f)
        self.ln1=nn.LayerNorm(16,eps=1e-5,**f)
        self.qkv=nn.Linear(16,48,**f)
        self.attention_output=nn.Linear(16,16,**f)
        self.ln2=nn.LayerNorm(16,eps=1e-5,**f)
        self.ff1=nn.Linear(16,32,**f)
        self.ff2=nn.Linear(32,16,**f)
        self.final_norm=nn.LayerNorm(16,eps=1e-5,**f)
        self.head=nn.Linear(16,vocabulary_size,**f)

    def forward(self, ids, causal=True):
        if ids.ndim!=2 or not 1<=ids.shape[1]<=16:
            raise ValueError('Context must have 1..16 token IDs per row')
        batch,length=ids.shape
        hidden=self.token_embedding(ids)+self.position_embedding(torch.arange(length,device=ids.device))
        q,k,v=self.qkv(self.ln1(hidden)).chunk(3,dim=-1)
        q,k,v=[t.reshape(batch,length,2,8).transpose(1,2) for t in (q,k,v)]
        scores=(q@k.transpose(-1,-2))/math.sqrt(8)
        if causal:
            blocked=torch.triu(torch.ones(length,length,device=ids.device,dtype=torch.bool),diagonal=1)
            scores=scores.masked_fill(blocked,float('-inf'))
        attended=(scores.softmax(-1)@v).transpose(1,2).reshape(batch,length,16)
        hidden=hidden+self.attention_output(attended)
        hidden=hidden+self.ff2(torch.nn.functional.gelu(self.ff1(self.ln2(hidden)),approximate='none'))
        return self.head(self.final_norm(hidden))
