import copy
import math
import numpy as np
import torch
from torch import nn


def signal(x):
    return np.sin(2 * np.pi * x)


def make_data(config):
    rng = np.random.default_rng(config['trainSeed'])
    x = np.linspace(-1, 1, config['trainCount']).reshape(-1, 1)
    original = signal(x) + rng.normal(0, config['noiseStd'], x.shape)
    y = original.copy()
    y[config['outlierIndex']] += config['outlierShift']
    vrng = np.random.default_rng(config['validationSeed'])
    vx = np.sort(vrng.uniform(-1, 1, config['validationCount'])).reshape(-1, 1)
    vy = signal(vx) + vrng.normal(0, config['noiseStd'], vx.shape)
    grid = np.linspace(-1, 1, config['gridCount']).reshape(-1, 1)
    return {'x':x,'y':y,'unshiftedY':original,'vx':vx,'vy':vy,'grid':grid,'truth':signal(grid)}


class RegressionMLP(nn.Module):
    def __init__(self, width, options):
        super().__init__()
        def norm():
            if options.get('normalization') == 'batch':
                return nn.BatchNorm1d(width, eps=options.get('epsilon',1e-5),
                                      momentum=options.get('momentum',.1), dtype=torch.float64)
            if options.get('normalization') == 'layer':
                return nn.LayerNorm(width, eps=options.get('epsilon',1e-5), dtype=torch.float64)
            return nn.Identity()
        self.first = nn.Linear(1,width,dtype=torch.float64)
        self.norm_first = norm()
        self.second = nn.Linear(width,width,dtype=torch.float64)
        self.norm_second = norm()
        self.output = nn.Linear(width,1,dtype=torch.float64)
        self.dropout = nn.Dropout(options.get('dropout',0.))

    def forward(self,x):
        h = self.dropout(torch.relu(self.norm_first(self.first(x))))
        h = self.dropout(torch.relu(self.norm_second(self.second(h))))
        return self.output(h)


def make_model(seed,options,width=64):
    model = RegressionMLP(width,options)
    generator = torch.Generator().manual_seed(seed)
    with torch.no_grad():
        for layer in [model.first,model.second]:
            nn.init.kaiming_uniform_(layer.weight, nonlinearity='relu', generator=generator)
            layer.bias.zero_()
        nn.init.xavier_uniform_(model.output.weight,generator=generator)
        model.output.bias.zero_()
    return model


def optimizer_for(model,lr,weight_decay):
    matrices = [p for p in model.parameters() if p.ndim > 1]
    vectors = [p for p in model.parameters() if p.ndim == 1]
    return torch.optim.AdamW([{'params':matrices,'weight_decay':weight_decay},
                             {'params':vectors,'weight_decay':0.}],lr=lr,foreach=False)


class Tracker:
    def __init__(self,patience,min_delta):
        self.patience,self.min_delta = patience,min_delta
        self.best,self.best_epoch,self.wait = float('inf'),None,0

    def observe(self,value,epoch):
        if not math.isfinite(value):
            raise ValueError('nonfinite validation metric')
        improved = value < self.best - self.min_delta
        if improved:
            self.best,self.best_epoch,self.wait = value,epoch,0
        else:
            self.wait += 1
        return improved,self.wait >= self.patience


def checkpoint(model,data,epoch,online=None,gradient_norm=None):
    was_training = model.training
    model.eval()
    with torch.no_grad():
        train = float((model(data['x'])-data['y']).square().mean())
        validation = float((model(data['vx'])-data['vy']).square().mean())
        prediction = model(data['grid']).reshape(-1).tolist()
        norm = float(torch.linalg.vector_norm(torch.cat([p.reshape(-1) for p in model.parameters()])))
    model.train(was_training)
    return {'epoch':epoch,'trainMse':train,'validationMse':validation,'onlineMseLast':online,
            'gradientNormLast':gradient_norm,'parameterNorm':norm,'prediction':prediction}


def train_run(config,seed,variant):
    options = {**config['normalization'],**config['variants'][variant]}
    with torch.random.fork_rng(devices=[]):
        model = make_model(seed,options,config['model']['width'])
        torch.manual_seed(config['dropoutSeed']+seed)
        optimizer = optimizer_for(model,config['lr'],options.get('weightDecay',0.))
        raw = make_data(config['data'])
        data = {k:torch.tensor(v,dtype=torch.float64) for k,v in raw.items()}
        tracker = Tracker(config['earlyStopping']['patience'],config['earlyStopping']['minDelta'])
        initial = checkpoint(model,data,0)
        tracker.observe(initial['validationMse'],0)
        best,best_state,last = initial,copy.deepcopy(model.state_dict()),initial
        history = [{k:v for k,v in initial.items() if k!='prediction'}]
        stopped = False
        for epoch in range(1,config['epochs']+1):
            model.train()
            optimizer.zero_grad(set_to_none=True)
            loss = (model(data['x'])-data['y']).square().mean()
            if not torch.isfinite(loss):
                raise ValueError('nonfinite training loss')
            loss.backward()
            monitored = epoch % config['monitorEvery'] == 0 or epoch == config['epochs']
            gradient_norm = (float(torch.linalg.vector_norm(torch.cat([p.grad.reshape(-1) for p in model.parameters()])))
                             if monitored else None)
            optimizer.step()
            if monitored:
                last = checkpoint(model,data,epoch,float(loss.detach()),gradient_norm)
                history.append({k:v for k,v in last.items() if k!='prediction'})
                improved,stop = tracker.observe(last['validationMse'],epoch)
                if improved:
                    best,best_state = last,copy.deepcopy(model.state_dict())
                if options.get('early') and stop:
                    stopped = True
                    break
        if options.get('early'):
            model.load_state_dict(best_state,strict=True)
            selected = checkpoint(model,data,best['epoch'])
            restored = selected['prediction']==best['prediction']
        else:
            selected,restored = last,False
        return {'id':f'{variant}-{seed}','variant':variant,'seed':seed,'options':options,
                'parameterCount':sum(p.numel() for p in model.parameters()),'updates':last['epoch'],
                'stoppedEarly':stopped,'restoredBest':restored,'history':history,
                'initial':initial,'best':best,'last':last,'selected':selected}
