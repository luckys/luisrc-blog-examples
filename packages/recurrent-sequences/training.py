import hashlib
import torch
from torch import nn
from torch.utils.data import DataLoader,TensorDataset
from data import PROTOCOL,PAD,BOS,EOS,decoder_inputs
from networks import last_hidden
from cells import trace_cell

torch.set_num_threads(1);torch.use_deterministic_algorithms(True)

def memory_metrics(model,data,epoch):
    model.eval()
    with torch.no_grad():
        logits=model(data[0],data[1])
        return dict(epoch=epoch,loss=float(nn.functional.cross_entropy(logits,data[2])),accuracy=float((logits.argmax(-1)==data[2]).float().mean()))

def train_memory(model,train,validation,seed,epochs=None):
    protocol=PROTOCOL['memory'];epochs=protocol['epochs'] if epochs is None else epochs
    loader=DataLoader(TensorDataset(*train),batch_size=protocol['batchSize'],shuffle=True,num_workers=0,generator=torch.Generator().manual_seed(protocol['shuffleSeed']))
    optimizer=torch.optim.Adam(model.parameters(),lr=PROTOCOL['learningRate']);history=[];updates=0
    def observe(epoch):
        a=memory_metrics(model,train,epoch);b=memory_metrics(model,validation,epoch)
        history.append(dict(epoch=epoch,trainLoss=a['loss'],trainAccuracy=a['accuracy'],validationLoss=b['loss'],validationAccuracy=b['accuracy']))
    observe(0)
    for epoch in range(1,epochs+1):
        model.train()
        for tokens,lengths,labels in loader:
            optimizer.zero_grad(set_to_none=True)
            loss=nn.functional.cross_entropy(model(tokens,lengths),labels)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(),PROTOCOL['clipNorm'],error_if_nonfinite=True)
            optimizer.step();updates+=1
        if epoch%5==0 or epoch==epochs:observe(epoch)
    return dict(id=f'{model.kind}-{seed}',kind=model.kind,seed=seed,task='memory',history=history,updates=updates,parameters=sum(p.numel() for p in model.parameters()))

def memory_trace(model,data,index):
    model.eval();n=int(data[1][index]);tokens=data[0][index:index+1,:n];label=int(data[2][index])
    embedded=model.embed(tokens).detach().requires_grad_(True)
    output,state=model.core(embedded)
    logits=model.head(output)
    final=model.head(last_hidden(state))[0,label]
    gradient=torch.autograd.grad(final,embedded)[0][0]
    cell_records=trace_cell(model.kind,model.core,embedded[0].detach(),torch.zeros(model.core.hidden_size),torch.zeros(model.core.hidden_size) if model.kind=='lstm' else None)
    return dict(length=n,tokens=tokens[0].tolist(),label=label,embedded=embedded[0].detach().tolist(),hidden=output[0].detach().tolist(),logits=logits[0].detach().tolist(),gradientNorm=gradient.norm(dim=-1).tolist(),cells=cell_records)

def rollout_batch(model,prefix,steps,injected=None):
    inputs=torch.cat([torch.full((len(prefix),1),BOS,dtype=torch.long),prefix],dim=1)
    hidden,state=model.core(model.embed(inputs));logits=model.head(hidden[:,-1])
    rows=[];done=torch.zeros(len(prefix),dtype=torch.bool)
    for step in range(steps):
        token=logits.argmax(-1)
        if step==0 and injected is not None:token=torch.full_like(token,injected)
        token=torch.where(done,torch.full_like(token,PAD),token)
        rows.append(token);done|=token==EOS
        hidden,state=model.core(model.embed(token[:,None]),state)
        logits=model.head(hidden[:,0])
    return torch.stack(rows,dim=1)

def rollout(model,prefix,steps,injected=None):
    model.eval()
    with torch.no_grad():values=rollout_batch(model,torch.tensor([prefix]),steps,injected)[0].tolist()
    if EOS in values:values=values[:values.index(EOS)+1]
    return values

def continuation_metrics(model,targets,epoch):
    model.eval();prefix=PROTOCOL['continuation']['prefixTokens'];steps=targets.shape[1]-prefix
    with torch.no_grad():
        logits=model(decoder_inputs(targets))
        loss=nn.functional.cross_entropy(logits.flatten(0,1),targets.flatten(),ignore_index=PAD,reduction='sum')/(targets!=PAD).sum()
        gold=targets[:,prefix:];predictions=logits[:,prefix:].argmax(-1);generated=rollout_batch(model,targets[:,:prefix],steps)
        return dict(epoch=epoch,loss=float(loss),teacherContinuationAccuracy=float((predictions==gold).float().mean()),rolloutContinuationAccuracy=float((generated==gold).float().mean()),rolloutExactMatch=float((generated==gold).all(1).float().mean()))

def train_continuation(model,train,validation,seed,epochs=None):
    protocol=PROTOCOL['continuation'];epochs=protocol['epochs'] if epochs is None else epochs
    loader=DataLoader(TensorDataset(train),batch_size=protocol['batchSize'],shuffle=True,num_workers=0,generator=torch.Generator().manual_seed(protocol['shuffleSeed']))
    optimizer=torch.optim.Adam(model.parameters(),lr=PROTOCOL['learningRate']);history=[];updates=0
    def observe(epoch):
        a=continuation_metrics(model,train,epoch);b=continuation_metrics(model,validation,epoch)
        history.append(dict(epoch=epoch,trainLoss=a['loss'],validationLoss=b['loss'],teacherContinuationAccuracy=b['teacherContinuationAccuracy'],rolloutContinuationAccuracy=b['rolloutContinuationAccuracy'],rolloutExactMatch=b['rolloutExactMatch']))
    observe(0)
    for epoch in range(1,epochs+1):
        model.train()
        for (targets,) in loader:
            optimizer.zero_grad(set_to_none=True)
            logits=model(decoder_inputs(targets))
            loss=nn.functional.cross_entropy(logits.flatten(0,1),targets.flatten(),ignore_index=PAD,reduction='sum')/(targets!=PAD).sum()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(),PROTOCOL['clipNorm'],error_if_nonfinite=True)
            optimizer.step();updates+=1
        if epoch%5==0 or epoch==epochs:observe(epoch)
    examples=[]
    for target in validation[:8]:
        prefix=target[:2].tolist();clean=rollout(model,prefix,7);wrong=1+(clean[0]%4) if clean[0] in [1,2,3,4] else 1
        with torch.no_grad():teacher=model(decoder_inputs(target[None]))[0,2:].argmax(-1).tolist()
        examples.append(dict(prefix=prefix,expected=target[2:].tolist(),teacher=teacher,generated=clean,injectedToken=wrong,perturbed=rollout(model,prefix,7,injected=wrong)))
    return dict(id=f'continuation-{seed}',kind='gru',seed=seed,task='continuation',history=history,updates=updates,parameters=sum(p.numel() for p in model.parameters()),examples=examples)

def data_hash(data):
    items=data if isinstance(data,tuple) else (data,)
    return hashlib.sha256(b''.join(item.numpy().tobytes() for item in items)).hexdigest()
