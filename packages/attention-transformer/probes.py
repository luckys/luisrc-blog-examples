import math
import torch
from torch.nn import functional as F
from attention import DTYPE,stable_softmax,scaled_attention,allowed_keys,MultiHead,positional_encoding
from transformer import DecoderOnly,EncoderDecoder,example_inputs

def maximum_error(a,b):return float((a-b).detach().abs().max())

def observations():
    large=torch.tensor([[1000.,1001.,999.]],dtype=DTYPE)
    naive=large.exp()/large.exp().sum(-1,keepdim=True)
    stable=stable_softmax(large)
    scales=[]
    for depth in [1,4,16,64]:
        generator=torch.Generator().manual_seed(303+depth)
        q=torch.randn(512,1,depth,dtype=DTYPE,generator=generator);k=torch.randn(512,8,depth,dtype=DTYPE,generator=generator)
        raw=(q@k.transpose(-2,-1))[:,0];scaled=raw/math.sqrt(depth)
        def statistics(scores):
            weights=stable_softmax(scores)
            return dict(scoreStd=float(scores.std(unbiased=False)),meanEntropy=float(-(weights*weights.clamp_min(1e-300).log()).sum(-1).mean()),meanMaximumWeight=float(weights.max(-1).values.mean()))
        scales.append(dict(depth=depth,raw=statistics(raw),scaled=statistics(scaled)))
    q=torch.tensor([[[[1.,0.],[0.,1.]]]],dtype=DTYPE);k=q.clone();v=torch.tensor([[[[2.,4.],[8.,10.]]]],dtype=DTYPE)
    allow=torch.tensor([[[[True,False],[True,True]]]])
    manual,w,scores=scaled_attention(q,k,v,allow)
    correct=F.scaled_dot_product_attention(q,k,v,attn_mask=allow,dropout_p=0)
    inverted=F.scaled_dot_product_attention(q,k,v,attn_mask=~allow,dropout_p=0)
    additive=torch.zeros_like(scores).masked_fill(~allow,float('-inf'))
    with_additive=F.scaled_dot_product_attention(q,k,v,attn_mask=additive,dropout_p=0)
    fully=F.scaled_dot_product_attention(q,k,v,attn_mask=torch.zeros_like(allow),dropout_p=0)
    costs=[]
    for length in [4,8,16,32]:
        score=torch.empty(2,2,length,length,dtype=DTYPE)
        costs.append(dict(length=length,scoreElements=score.numel(),scoreBytes=score.numel()*score.element_size()))
    x=torch.randn(1,4,8,dtype=DTYPE,generator=torch.Generator().manual_seed(42));perm=torch.tensor([2,0,3,1]);model=MultiHead(8,2,7)
    allow_full=allowed_keys(torch.tensor([4]),4,4);pos=positional_encoding(4,8)
    a,_=model(x,x,allow_full);b,_=model(x[:,perm],x[:,perm],allow_full)
    fixed,_=model(x+pos,x+pos,allow_full);reordered,_=model(x[:,perm]+pos,x[:,perm]+pos,allow_full)
    joint,_=model((x+pos)[:,perm],(x+pos)[:,perm],allow_full)
    return dict(softmax=dict(logits=large.tolist(),stable=stable.tolist(),naiveNonfinite=not bool(torch.isfinite(naive).all()),stableFinite=bool(torch.isfinite(stable).all())),scale=scales,maskExample=dict(query=q.tolist(),key=k.tolist(),value=v.tolist(),allowed=allow.tolist(),scores=scores.tolist(),weights=w.tolist(),output=manual.tolist(),sdpaError=maximum_error(manual,correct),additiveError=maximum_error(manual,with_additive)),wrongMaskError=maximum_error(manual,inverted),fullyMaskedPolicy='manual rejects',fullyMaskedSDPA=dict(finite=bool(torch.isfinite(fully).all()),zero=bool((fully==0).all())),positions=positional_encoding(16,8).tolist(),permutation=dict(indices=perm.tolist(),noPositionError=maximum_error(b,a[:,perm]),fixedPositionChange=maximum_error(reordered,fixed[:,perm]),jointPermutationError=maximum_error(joint,fixed[:,perm])),costs=costs)

def causal_observation(seed):
    source,target,source_lengths,target_lengths=example_inputs()
    model=DecoderOnly(seed).eval();changed=target.clone();changed[0,3:]=torch.tensor([5,6]);changed[1,3:]=torch.tensor([10,11])
    logits,trace=model(target,target_lengths,True);other,_=model(changed,target_lengths,True)
    plain,_=model(target,target_lengths,False);leak,_=model(changed,target_lengths,False)
    embedded=model.embed(target).detach().requires_grad_(True);differentiable,_=model.from_embeddings(embedded,target_lengths,True)
    grad=torch.autograd.grad(differentiable[0,1,1],embedded)[0]
    seq=EncoderDecoder(seed).eval();seq_logits,seq_trace=seq(source,target,source_lengths,target_lengths)
    seq_future,_=seq(source,changed,source_lengths,target_lengths)
    padded=source.clone();padded[1,2:]=torch.tensor([10,11]);seq_padded,_=seq(padded,target,source_lengths,target_lengths)
    src=source.clone();src[0,3]=6;seq_source,_=seq(src,target,source_lengths,target_lengths)
    return dict(seed=seed,target=target.tolist(),changedTarget=changed.tolist(),lengths=target_lengths.tolist(),logits=logits.detach().tolist(),changedLogits=other.detach().tolist(),prefixError=maximum_error(logits[:,:3],other[:,:3]),unmaskedPrefixChange=maximum_error(plain[0,:3],leak[0,:3]),inputGradient=grad.tolist(),lmParameters=sum(p.numel() for p in model.parameters()),seqParameters=sum(p.numel() for p in seq.parameters()),source=source.tolist(),sourceLengths=source_lengths.tolist(),seqLogits=seq_logits.detach().tolist(),seqTargetPrefixError=maximum_error(seq_logits[:,:3],seq_future[:,:3]),seqPaddingPrefixError=maximum_error(seq_logits[1,:3],seq_padded[1,:3]),seqSourceChange=maximum_error(seq_logits[0,0],seq_source[0,0])),trace,seq_trace
