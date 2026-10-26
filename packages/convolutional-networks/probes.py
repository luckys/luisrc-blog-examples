import numpy as np
import torch
from torch.nn import functional as F
from geometry import correlate, receptive_field

def arithmetic_probes():
    x=np.arange(1,26,dtype=np.float64).reshape(5,5)
    k=np.array([[1.,0.],[-1.,2.]])
    cases=[]
    for stride in [1,2]:
        for padding in [0,1]:
            for dilation in [1,2]:
                actual=correlate(x,k,stride,padding,dilation)
                reference=F.conv2d(torch.tensor(x)[None,None],torch.tensor(k)[None,None],stride=stride,padding=padding,dilation=dilation)[0,0]
                cases.append(dict(stride=stride,padding=padding,dilation=dilation,output=actual.tolist(),maxError=float(np.abs(actual-reference.numpy()).max())))
    same=F.conv2d(F.pad(torch.tensor(x)[None,None],(0,1,0,1)),torch.tensor(k)[None,None])[0,0]
    pool_input=torch.tensor([[1.,3.,2.,0.],[4.,6.,5.,1.],[2.,0.,8.,3.],[1.,7.,4.,2.]],dtype=torch.float64,requires_grad=True)
    a=pool_input[None,None];mx=F.max_pool2d(a,2);avg=F.avg_pool2d(a,2)
    mg=torch.autograd.grad(mx.sum(),pool_input,retain_graph=True)[0]
    ag=torch.autograd.grad(avg.sum(),pool_input)[0]
    shifted=[]
    for col in [0,1,2]:
        q=torch.zeros(1,1,8,8);q[0,0,3,col]=1
        shifted.append(F.max_pool2d(q,2)[0,0].tolist())
    inp=torch.arange(1,33,dtype=torch.float64).reshape(1,2,4,4)
    weight=torch.arange(24,dtype=torch.float64).reshape(3,2,2,2)/4
    bias=torch.tensor([1.,-1.,2.],dtype=torch.float64)
    out=F.conv2d(inp,weight,bias)[0]
    manual=np.stack([sum(correlate(inp[0,c].numpy(),weight[o,c].numpy()) for c in range(2))+float(bias[o]) for o in range(3)])
    checker=np.indices((8,8)).sum(axis=0)%2
    return dict(input=x.tolist(),kernel=k.tolist(),cases=cases,sameRightBottom=same.tolist(),receptiveField=receptive_field([(3,1,1),(2,2,0),(3,1,1)]),pool=dict(input=pool_input.detach().tolist(),max=mx[0,0].tolist(),average=avg[0,0].tolist(),maxGradient=mg.tolist(),averageGradient=ag.tolist(),negativePadding=F.max_pool2d(torch.tensor([[[[-2.]]]]),2,1,1)[0,0].tolist(),averageWithPadding=F.avg_pool2d(torch.tensor([[[[4.]]]]),2,1,1)[0,0].tolist(),averageWithoutPadding=F.avg_pool2d(torch.tensor([[[[4.]]]]),2,1,1,count_include_pad=False)[0,0].tolist(),shifted=shifted,aliasPhase0=checker[::2,::2].tolist(),aliasPhase1=checker[::2,1::2].tolist(),antiAlias=F.avg_pool2d(torch.tensor(checker,dtype=torch.float64)[None,None],2)[0,0].tolist()),channels=dict(input=inp[0].tolist(),weights=weight.tolist(),bias=bias.tolist(),torch=out.tolist(),manual=manual.tolist(),parameters=27))
