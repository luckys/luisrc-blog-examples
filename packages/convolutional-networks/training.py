from copy import deepcopy
import hashlib
import json
from pathlib import Path
import numpy as np
import torch
from torch import nn
from torch.utils.data import TensorDataset,DataLoader

PROTOCOL=json.loads(Path('protocol.json').read_text())
torch.set_num_threads(1)
torch.use_deterministic_algorithms(True)

def make_data(domain,split):
    p=PROTOCOL[domain]
    rng=np.random.default_rng(p[split+'Seed'])
    size=PROTOCOL['imageSize'];rr,cc=np.mgrid[:size,:size]
    images=[];labels=[]
    for label,angle in enumerate([0,np.pi/2,np.pi/4,3*np.pi/4]):
        for _ in range(p[split+'PerClass']):
            cy,cx=size/2+rng.uniform(-4,4,2)
            thickness=rng.uniform(*p['thickness']);half=rng.uniform(*PROTOCOL['halfLength'])
            along=(cc-cx)*np.cos(angle)+(rr-cy)*np.sin(angle)
            across=-(cc-cx)*np.sin(angle)+(rr-cy)*np.cos(angle)
            mask=(np.abs(along)<=half)&(np.abs(across)<=thickness/2)
            img=np.clip(p['background']+p['contrast']*mask+rng.normal(0,p['noise'],(size,size)),0,1)
            images.append(img);labels.append(label if domain=='source' else int(label>=2))
    return torch.tensor(np.array(images),dtype=torch.float32)[:,None],torch.tensor(labels,dtype=torch.long)

def datasets(domain):
    return {split:make_data(domain,split) for split in ['train','validation']}

def metrics(model,data,epoch):
    model.eval()
    result={'epoch':epoch}
    with torch.no_grad():
        for split,(x,y) in data.items():
            logits=model(x)
            result[split+'Loss']=float(nn.functional.cross_entropy(logits,y))
            result[split+'Accuracy']=float((logits.argmax(1)==y).float().mean())
    return result

def train(model,data,seed,mode,epochs=None):
    domain='source' if mode=='source' else 'target'
    generator=torch.Generator().manual_seed(PROTOCOL[domain+'ShuffleSeed'])
    loader=DataLoader(TensorDataset(*data['train']),batch_size=PROTOCOL[domain+'Batch'],shuffle=True,generator=generator,num_workers=0)
    if mode=='fine_tune':
        groups=[{'params':model.backbone.parameters(),'lr':PROTOCOL['fineTuneBackboneRate']},{'params':model.head.parameters(),'lr':PROTOCOL['learningRate']}]
    else:
        groups=[p for p in model.parameters() if p.requires_grad]
    optimizer=torch.optim.Adam(groups,lr=PROTOCOL['learningRate'])
    initial=deepcopy(model.state_dict())
    history=[metrics(model,data,0)];updates=0
    for epoch in range(1,(PROTOCOL['epochs'] if epochs is None else epochs)+1):
        model.train()
        if model.frozen: model.backbone.eval()
        for x,y in loader:
            optimizer.zero_grad(set_to_none=True)
            loss=nn.functional.cross_entropy(model(x),y)
            loss.backward()
            optimizer.step();updates+=1
        history.append(metrics(model,data,epoch))
    changes={name:float((value-initial[name]).abs().max()) for name,value in model.state_dict().items()}
    return dict(id=f'{mode}-{seed}',seed=seed,mode=mode,domain=domain,history=history,updates=updates,trainableParameters=sum(p.numel() for p in model.parameters() if p.requires_grad),backboneMaxChange=max(v for k,v in changes.items() if k.startswith('backbone.')),headMaxChange=max(v for k,v in changes.items() if k.startswith('head.')))

def feature_record(model,x,label,index):
    model.eval()
    with torch.no_grad():
        maps=model.backbone.maps(x)
        gap=model.backbone.gap(maps['conv2_relu']).flatten(1)
        logits=model.head(gap)[0]
    # Fixed spatial coordinate, tied to the RF probe, independent of UI selection.
    differentiable=x.detach().clone().requires_grad_(True)
    selected=model.backbone.maps(differentiable)['conv2_pre'][0,:,6,6]
    gradients=[torch.autograd.grad(selected[c],differentiable,retain_graph=True)[0][0,0].tolist() for c in range(8)]
    return dict(index=index,label=label,input=x[0,0].tolist(),maps={k:v[0].tolist() for k,v in maps.items()},gap=gap[0].tolist(),logits=logits.tolist(),probabilities=logits.softmax(0).tolist(),prediction=int(logits.argmax()),gradients=gradients,gradientCoordinate=[6,6])

def digest_data(data):
    return {split:hashlib.sha256(x.numpy().tobytes()+y.numpy().tobytes()).hexdigest() for split,(x,y) in data.items()}
