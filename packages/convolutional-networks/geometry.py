"""Reference arithmetic: explicit cross-correlation, not a flipped convolution."""
import numpy as np

def output_size(size,kernel,stride=1,padding=0,dilation=1):
    if min(size,kernel,stride,dilation)<1 or padding<0:
        raise ValueError('positive sizes/stride/dilation, nonnegative padding required')
    result=(size+2*padding-dilation*(kernel-1)-1)//stride+1
    if result<1: raise ValueError('kernel does not fit padded input')
    return result

def contributions(x,k,row,col,stride=1,padding=0,dilation=1):
    h=output_size(x.shape[0],k.shape[0],stride,padding,dilation)
    w=output_size(x.shape[1],k.shape[1],stride,padding,dilation)
    if not (0<=row<h and 0<=col<w): raise ValueError('output coordinate outside map')
    terms=[]
    for kr in range(k.shape[0]):
        for kc in range(k.shape[1]):
            r=row*stride-padding+kr*dilation
            c=col*stride-padding+kc*dilation
            padded=not(0<=r<x.shape[0] and 0<=c<x.shape[1])
            value=0. if padded else float(x[r,c])
            terms.append(dict(row=r,col=c,padded=padded,value=value,weight=float(k[kr,kc]),product=value*float(k[kr,kc])))
    return terms

def correlate(x,k,stride=1,padding=0,dilation=1):
    h=output_size(x.shape[0],k.shape[0],stride,padding,dilation)
    w=output_size(x.shape[1],k.shape[1],stride,padding,dilation)
    return np.array([[sum(t['product'] for t in contributions(x,k,r,c,stride,padding,dilation)) for c in range(w)] for r in range(h)])

def receptive_field(layers):
    size,jump,start=1,1,.5
    result=[]
    for kernel,stride,padding in layers:
        start+=((kernel-1)/2-padding)*jump
        size+=(kernel-1)*jump
        jump*=stride
        result.append(dict(size=size,jump=jump,start=start))
    return result
