"""Inspect single-layer unidirectional PyTorch cell conventions explicitly."""
import torch
from torch.nn import functional as F

def weights(module,name):
    return getattr(module,name) if hasattr(module,name) else getattr(module,name+'_l0')

def cell_step(kind,module,x,h,c=None):
    xi=F.linear(x,weights(module,'weight_ih'),weights(module,'bias_ih'))
    hh=F.linear(h,weights(module,'weight_hh'),weights(module,'bias_hh'))
    info={}
    if kind=='rnn':
        next_h=torch.tanh(xi+hh);next_c=None
    elif kind=='lstm':
        i,f,g,o=(xi+hh).chunk(4,-1)
        i,f,g,o=i.sigmoid(),f.sigmoid(),g.tanh(),o.sigmoid()
        next_c=f*c+i*g
        next_h=o*next_c.tanh()
        info=dict(input=i,forget=f,candidate=g,output=o)
    elif kind=='gru':
        ir,iz,inn=xi.chunk(3,-1);hr,hz,hn=hh.chunk(3,-1)
        reset=torch.sigmoid(ir+hr);update=torch.sigmoid(iz+hz)
        candidate=torch.tanh(inn+reset*hn)
        next_h=(1-update)*candidate+update*h;next_c=None
        info=dict(reset=reset,update=update,candidate=candidate)
    else:raise ValueError('unknown cell')
    return next_h,next_c,info

def trace_cell(kind,module,sequence,h,c=None):
    records=[]
    with torch.no_grad():
        for x in sequence:
            previous=h
            h,c,gates=cell_step(kind,module,x,h,c)
            records.append(dict(previous=previous.tolist(),hidden=h.tolist(),cell=None if c is None else c.tolist(),**{k:v.tolist() for k,v in gates.items()}))
    return records
