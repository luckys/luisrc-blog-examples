import torch
from torch import nn
from cells import cell_step,trace_cell
from data import decoder_inputs

def arithmetic_probes():
    torch.manual_seed(303)
    sequence=torch.tensor([[.2,-.1],[.5,.3],[-.4,.7]],dtype=torch.float64)
    h=torch.tensor([.3,-.2],dtype=sequence.dtype);c=torch.tensor([.1,.4],dtype=sequence.dtype)
    records={}
    for kind,klass in [('rnn',nn.RNNCell),('lstm',nn.LSTMCell),('gru',nn.GRUCell)]:
        cell=klass(2,2).double();rows=trace_cell(kind,cell,sequence,h,c if kind=='lstm' else None)
        state=(h,c) if kind=='lstm' else h;error=0.
        for x,row in zip(sequence,rows):
            state=cell(x,state);actual=state[0] if kind=='lstm' else state
            error=max(error,float((actual.detach()-torch.tensor(row['hidden'],dtype=sequence.dtype)).abs().max()))
        records[kind]=dict(inputs=sequence.tolist(),initialHidden=h.tolist(),initialCell=c.tolist() if kind=='lstm' else None,steps=rows,maxError=error)
    gru=nn.GRUCell(2,2).double()
    with torch.no_grad():
        gru.weight_ih.copy_(torch.arange(12,dtype=torch.float64).reshape(6,2)/10-.5)
        gru.weight_hh.copy_(torch.tensor([[.2,.7],[-.3,.4],[.8,-.6],[.1,.9],[1.2,-.5],[.7,.8]],dtype=torch.float64))
        gru.bias_ih.fill_(.15);gru.bias_hh.copy_(torch.tensor([.1,-.2,.3,-.1,.4,-.3],dtype=torch.float64))
    x=sequence[0];manual,_,gates=cell_step('gru',gru,x,h)
    ir,iz,inn=nn.functional.linear(x,gru.weight_ih,gru.bias_ih).chunk(3)
    r=gates['reset'];z=gates['update']
    wrong_candidate=torch.tanh(inn+nn.functional.linear(r*h,gru.weight_hh[4:],gru.bias_hh[4:]))
    wrong=(1-z)*wrong_candidate+z*h
    convention=dict(manual=manual.detach().tolist(),torch=gru(x,h).detach().tolist(),wrong=wrong.detach().tolist(),wrongMaxError=float((manual-wrong).abs().max().detach()))
    controls=[]
    for length in [1,4,12,24,48,96]:
        row={'length':length}
        for name,a in [('rnnHalf',.5),('rnnLarge',1.2)]:
            start=torch.tensor(0.,dtype=torch.float64,requires_grad=True);state=start
            for _ in range(length):state=torch.tanh(a*state)
            row[name]=float(torch.autograd.grad(state,start)[0])
        initial=torch.tensor(1.,dtype=torch.float64,requires_grad=True);state=initial
        for _ in range(length):state=.99*state
        row['fixedForget']=float(torch.autograd.grad(state,initial)[0]);controls.append(row)
    padcell=nn.RNNCell(1,1).double()
    with torch.no_grad():
        for parameter in padcell.parameters():parameter.fill_(.5)
    state=torch.tensor([[.2]],dtype=torch.float64);states=[float(state.item())]
    for _ in range(4):state=padcell(torch.zeros_like(state),state);states.append(float(state.detach().item()))
    targets=torch.tensor([[1,2,3,9],[4,1,9,0]])
    return dict(cells=records,gruConvention=convention,gradientControls=controls,paddingStates=states,shift=dict(targets=targets.tolist(),inputs=decoder_inputs(targets).tolist()))
