import math
import torch
from torch import nn
from attention import DTYPE,MultiHead,allowed_keys,positional_encoding,initialize_linear

SIZE,FF,VOCAB=8,16,12

def feed_forward(seed):
    model=nn.Sequential(nn.Linear(SIZE,FF,dtype=DTYPE),nn.ReLU(),nn.Linear(FF,SIZE,dtype=DTYPE))
    generator=torch.Generator().manual_seed(seed+1100)
    for layer in [model[0],model[-1]]:initialize_linear(layer,generator)
    return model

def token_embedding(seed):
    model=nn.Embedding(VOCAB,SIZE,padding_idx=0,dtype=DTYPE)
    nn.init.normal_(model.weight,std=.2,generator=torch.Generator().manual_seed(seed+90))
    with torch.no_grad():model.weight[0].zero_()
    return model

def output_head(seed):
    layer=nn.Linear(SIZE,VOCAB,dtype=DTYPE);initialize_linear(layer,torch.Generator().manual_seed(seed+900));return layer

class TransformerBlock(nn.Module):
    """One pre-norm block, no dropout; not the exact 2017 post-norm model."""
    def __init__(self,seed):
        super().__init__()
        self.norm1=nn.LayerNorm(SIZE,dtype=DTYPE);self.norm2=nn.LayerNorm(SIZE,dtype=DTYPE)
        self.attention=MultiHead(SIZE,2,seed);self.feed_forward=feed_forward(seed)

    def forward(self,x,allowed):
        normalized=self.norm1(x)
        attended,trace=self.attention(normalized,normalized,allowed)
        after_attention=x+attended
        after_feed_forward=after_attention+self.feed_forward(self.norm2(after_attention))
        return after_feed_forward,dict(attention=trace,normalized=normalized,afterAttention=after_attention,output=after_feed_forward)

class DecoderOnly(nn.Module):
    def __init__(self,seed):
        super().__init__();self.embed=token_embedding(seed);self.block=TransformerBlock(seed)
        self.final_norm=nn.LayerNorm(SIZE,dtype=DTYPE);self.head=output_head(seed)

    def from_embeddings(self,embedded,lengths,causal=True):
        positioned=embedded*math.sqrt(SIZE)+positional_encoding(embedded.shape[1],SIZE)
        allowed=allowed_keys(lengths,embedded.shape[1],embedded.shape[1],causal)
        hidden,trace=self.block(positioned,allowed)
        logits=self.head(self.final_norm(hidden))
        return logits,trace

    def forward(self,tokens,lengths,causal=True):
        return self.from_embeddings(self.embed(tokens),lengths,causal)

class DecoderBlock(nn.Module):
    def __init__(self,seed):
        super().__init__()
        self.norm1=nn.LayerNorm(SIZE,dtype=DTYPE);self.norm2=nn.LayerNorm(SIZE,dtype=DTYPE);self.norm3=nn.LayerNorm(SIZE,dtype=DTYPE)
        self.self_attention=MultiHead(SIZE,2,seed+1);self.cross_attention=MultiHead(SIZE,2,seed+2)
        self.feed_forward=feed_forward(seed+3)

    def forward(self,x,memory,self_allowed,cross_allowed):
        normalized=self.norm1(x)
        self_result,self_trace=self.self_attention(normalized,normalized,self_allowed)
        after_self=x+self_result
        cross_result,cross_trace=self.cross_attention(self.norm2(after_self),memory,cross_allowed)
        after_cross=after_self+cross_result
        output=after_cross+self.feed_forward(self.norm3(after_cross))
        return output,dict(self=self_trace,cross=cross_trace,afterSelf=after_self,afterCross=after_cross,output=output)

class EncoderDecoder(nn.Module):
    def __init__(self,seed):
        super().__init__();self.embed=token_embedding(seed)
        self.encoder=TransformerBlock(seed+10);self.encoder_norm=nn.LayerNorm(SIZE,dtype=DTYPE)
        self.decoder=DecoderBlock(seed+20);self.decoder_norm=nn.LayerNorm(SIZE,dtype=DTYPE);self.head=output_head(seed)

    def forward(self,source,target,source_lengths,target_lengths):
        src=self.embed(source)*math.sqrt(SIZE)+positional_encoding(source.shape[1],SIZE)
        tgt=self.embed(target)*math.sqrt(SIZE)+positional_encoding(target.shape[1],SIZE)
        memory,encoder_trace=self.encoder(src,allowed_keys(source_lengths,source.shape[1],source.shape[1]))
        memory=self.encoder_norm(memory)
        hidden,decoder_trace=self.decoder(tgt,memory,allowed_keys(target_lengths,target.shape[1],target.shape[1],causal=True),allowed_keys(source_lengths,target.shape[1],source.shape[1]))
        return self.head(self.decoder_norm(hidden)),dict(encoder=encoder_trace,**decoder_trace,memory=memory)

def example_inputs():
    return (torch.tensor([[1,2,3,4],[5,6,0,0]]),torch.tensor([[8,1,4,2,9],[8,3,9,0,0]]),torch.tensor([4,2]),torch.tensor([5,3]))
