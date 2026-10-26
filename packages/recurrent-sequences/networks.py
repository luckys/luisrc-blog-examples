import math
import torch
from torch import nn
from torch.nn.utils.rnn import pack_padded_sequence
from data import PROTOCOL,PAD

SIZE=PROTOCOL['embeddingSize'];HIDDEN=PROTOCOL['hiddenSize'];VOCAB=PROTOCOL['vocabularySize']

def embedding(seed):
    layer=nn.Embedding(VOCAB,SIZE,padding_idx=PAD)
    nn.init.normal_(layer.weight,std=.2,generator=torch.Generator().manual_seed(seed+1000))
    with torch.no_grad():layer.weight[PAD].zero_()
    return layer

def recurrent(kind,seed):
    klass={'rnn':nn.RNN,'lstm':nn.LSTM,'gru':nn.GRU}[kind]
    layer=klass(SIZE,HIDDEN,batch_first=True)
    generator=torch.Generator().manual_seed(seed+2000)
    for p in layer.parameters():nn.init.uniform_(p,-1/math.sqrt(HIDDEN),1/math.sqrt(HIDDEN),generator=generator)
    return layer

def head(outputs,seed):
    layer=nn.Linear(HIDDEN,outputs)
    nn.init.xavier_uniform_(layer.weight,generator=torch.Generator().manual_seed(seed+3000))
    nn.init.zeros_(layer.bias)
    return layer

def last_hidden(state):
    hidden=state[0] if isinstance(state,tuple) else state
    return hidden[-1]

class MemoryModel(nn.Module):
    def __init__(self,kind,seed):
        super().__init__();self.kind=kind
        self.embed=embedding(seed);self.core=recurrent(kind,seed);self.head=head(2,seed)

    def encode(self,embedded,lengths):
        if embedded.ndim!=3 or lengths.ndim!=1 or lengths.shape[0]!=embedded.shape[0]:raise ValueError('batch/length mismatch')
        if bool((lengths<1).any()) or bool((lengths>embedded.shape[1]).any()):raise ValueError('invalid lengths')
        packed=pack_padded_sequence(embedded,lengths.cpu(),batch_first=True,enforce_sorted=False)
        _,state=self.core(packed)
        return last_hidden(state)

    def forward(self,tokens,lengths):
        return self.head(self.encode(self.embed(tokens),lengths))

class ContinuationModel(nn.Module):
    def __init__(self,seed):
        super().__init__();self.kind='continuation'
        self.embed=embedding(seed);self.core=recurrent('gru',seed);self.head=head(VOCAB,seed)

    def forward(self,tokens):
        hidden,_=self.core(self.embed(tokens))
        return self.head(hidden)
