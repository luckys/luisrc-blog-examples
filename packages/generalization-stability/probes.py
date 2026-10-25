import numpy as np
import torch
from torch import nn
from training import signal


def normalization_probe():
    a = torch.tensor([[1.,2.,4.],[2.,4.,8.],[3.,8.,12.],[4.,16.,16.]],dtype=torch.float64)
    b = a.clone();b[1:] *= 10
    bn = nn.BatchNorm1d(3,affine=False,momentum=.1,eps=1e-5,dtype=torch.float64)
    first = bn(a)
    other = nn.BatchNorm1d(3,affine=False,eps=1e-5,dtype=torch.float64)(b)
    layer = nn.LayerNorm(3,elementwise_affine=False,eps=1e-5,dtype=torch.float64)
    manual_batch = (a-a.mean(0))/torch.sqrt(a.var(0,unbiased=False)+1e-5)
    manual_layer = (a-a.mean(1,keepdim=True))/torch.sqrt(a.var(1,unbiased=False,keepdim=True)+1e-5)
    singleton_rejected = False
    try:
        nn.BatchNorm1d(3,dtype=torch.float64)(a[:1])
    except ValueError:
        singleton_rejected = True
    bn.eval()
    untracked = nn.BatchNorm1d(3,affine=False,track_running_stats=False,dtype=torch.float64).eval()
    return {'inputsA':a.tolist(),'inputsB':b.tolist(),'batchA':first.tolist(),'batchB':other.tolist(),
            'layerA':layer(a).tolist(),'layerB':layer(b).tolist(),
            'batchManual':manual_batch.tolist(),'layerManual':manual_layer.tolist(),
            'runningMean':bn.running_mean.tolist(),'runningVariance':bn.running_var.tolist(),
            'expectedRunningMean':(.1*a.mean(0)).tolist(),
            'expectedRunningVariance':(.9+.1*a.var(0,unbiased=True)).tolist(),
            'evalA':bn(a).tolist(),'singletonEval':bn(a[:1]).tolist(),
            'singletonRejected':singleton_rejected,'untrackedEvalUsesBatch':torch.allclose(untracked(a),first)}


def dropout_probe():
    with torch.random.fork_rng(devices=[]):
        torch.manual_seed(404)
        dropout = nn.Dropout(.2)
        x = torch.ones(20000,3,dtype=torch.float64)
        y = dropout(x)
        dropout.eval()
        return {'p':.2,'elements':y.numel(),'mean':float(y.mean()),
                'zeroFraction':float((y==0).double().mean()),'possibleValues':torch.unique(y).tolist(),
                'evalIdentity':torch.equal(dropout(x),x),'firstRows':y[:8].tolist()}


def activation_probe():
    values = [-5.,-1.,0.,1.,5.]
    result = []
    for name,fn in [('sigmoid',torch.sigmoid),('tanh',torch.tanh),('relu',torch.relu),
                    ('leaky_relu',lambda x:torch.nn.functional.leaky_relu(x,.01))]:
        x = torch.tensor(values,dtype=torch.float64,requires_grad=True)
        output = fn(x)
        gradient = torch.autograd.grad(output.sum(),x)[0]
        result.append({'id':name,'input':values,'output':output.tolist(),'gradient':gradient.tolist()})
    dead=[]
    for fn in [torch.relu,lambda x:torch.nn.functional.leaky_relu(x,.01)]:
        bias = torch.tensor(-1.,dtype=torch.float64,requires_grad=True)
        loss = (fn(bias)-1).square()
        dead.append(float(torch.autograd.grad(loss,bias)[0]))
    chain=[]
    for kind in ['tanh','relu']:
        for depth in range(1,13):
            x=torch.tensor(1.,dtype=torch.float64,requires_grad=True);h=x
            for _ in range(depth):h=torch.tanh(3*h) if kind=='tanh' else torch.relu(3*h)
            chain.append({'kind':kind,'depth':depth,'value':float(h.detach()),
                          'gradient':float(torch.autograd.grad(h,x)[0])})
    return {'functions':result,'deadReluBiasGradient':dead[0],'leakyBiasGradient':dead[1],'chains':chain}


def initialization_probe():
    result=[]
    with torch.random.fork_rng(devices=[]):
        for kind in ['zeros_relu','xavier_tanh','he_relu','large_tanh']:
            generator=torch.Generator().manual_seed(606)
            layers=nn.ModuleList([nn.Linear(16,16,bias=False,dtype=torch.float64) for _ in range(8)])
            for layer in layers:
                if kind=='zeros_relu':nn.init.zeros_(layer.weight)
                elif kind=='xavier_tanh':nn.init.xavier_uniform_(layer.weight,generator=generator)
                elif kind=='he_relu':nn.init.kaiming_normal_(layer.weight,nonlinearity='relu',generator=generator)
                else:nn.init.normal_(layer.weight,std=3.,generator=generator)
            x=torch.randn(128,16,generator=torch.Generator().manual_seed(303),dtype=torch.float64,requires_grad=True)
            h=x;stats=[]
            for layer in layers:
                h=torch.tanh(layer(h)) if kind.endswith('tanh') else torch.relu(layer(h))
                stats.append({'variance':float(h.detach().var(unbiased=False)),
                              'secondMoment':float(h.detach().square().mean()),
                              'zeroFraction':float((h.detach()==0).double().mean()),
                              'saturationFraction':float((h.detach().abs()>.99).double().mean()) if kind.endswith('tanh') else None})
            loss=(h-1).square().mean();loss.backward()
            for stat,layer in zip(stats,layers):stat['gradientNorm']=float(layer.weight.grad.norm())
            result.append({'id':kind,'loss':float(loss.detach()),'inputGradientNorm':float(x.grad.norm()),'layers':stats})
    return result


def clipping_probe():
    p=nn.Parameter(torch.zeros(2,dtype=torch.float64));p.grad=torch.tensor([3.,4.],dtype=torch.float64)
    norm=nn.utils.clip_grad_norm_([p],2.,error_if_nonfinite=True)
    vector={'before':float(norm),'after':float(p.grad.norm()),'values':p.grad.tolist()}
    q=nn.Parameter(torch.tensor([1.],dtype=torch.float64));q.grad=torch.tensor([100.],dtype=torch.float64)
    optimizer=torch.optim.Adam([q],lr=.1,foreach=False)
    nn.utils.clip_grad_norm_([q],.0001,error_if_nonfinite=True);optimizer.step()
    adam={'stepNorm':float((q.detach()-1).abs().item()),'lrTimesClip':.1*.0001}
    p.grad=torch.tensor([float('nan'),1.],dtype=torch.float64)
    rejected=False
    try:nn.utils.clip_grad_norm_([p],2.,error_if_nonfinite=True)
    except RuntimeError:rejected=True
    curves=[]
    for kind,rate,threshold in [('unclipped',.05,None),('clipped',.05,1.),('stable_rate',.01,None)]:
        theta=nn.Parameter(torch.tensor([1.],dtype=torch.float64))
        opt=torch.optim.SGD([theta],lr=rate);history=[];reason='budget'
        for step in range(41):
            loss=50*theta.square().sum()
            row={'step':step,'theta':float(theta.detach().item()),'loss':float(loss.detach()),
                 'gradientBefore':None,'gradientAfter':None,'stepNorm':None}
            if not torch.isfinite(loss) or float(loss.detach())>1e12:
                reason='loss_above_guard';history.append(row);break
            if step==40:history.append(row);break
            opt.zero_grad(set_to_none=True);loss.backward()
            row['gradientBefore']=float(theta.grad.norm())
            if threshold is not None:nn.utils.clip_grad_norm_([theta],threshold,error_if_nonfinite=True)
            row['gradientAfter']=float(theta.grad.norm());before=theta.detach().clone();opt.step()
            row['stepNorm']=float((theta.detach()-before).norm());history.append(row)
        curves.append({'id':kind,'lr':rate,'clip':threshold,'reason':reason,'history':history})
    return {'vector':vector,'adam':adam,'nonfiniteRejected':rejected,'curves':curves}


def bias_variance(config):
    grid=np.linspace(-1,1,101);truth=signal(grid);models=[]
    for degree in config['degrees']:
        predictions=[]
        for seed in range(config['firstSeed'],config['firstSeed']+config['datasets']):
            rng=np.random.default_rng(seed)
            x=rng.uniform(-1,1,config['trainCount']);y=signal(x)+rng.normal(0,config['noiseStd'],x.shape)
            design=np.polynomial.legendre.legvander(x,degree)
            weights=np.linalg.solve(design.T@design+config['ridge']*np.eye(degree+1),design.T@y)
            predictions.append(np.polynomial.legendre.legvander(grid,degree)@weights)
        predictions=np.asarray(predictions);mean=predictions.mean(0)
        bias=(mean-truth)**2;variance=((predictions-mean)**2).mean(0)
        models.append({'degree':degree,'biasSquared':float(bias.mean()),'variance':float(variance.mean()),
                       'cleanRisk':float(((predictions-truth)**2).mean()),
                       'knownNoiseVariance':config['noiseStd']**2,'meanPrediction':mean.tolist(),
                       'biasSquaredByX':bias.tolist(),'varianceByX':variance.tolist()})
    return {'datasets':config['datasets'],'grid':grid.tolist(),'truth':truth.tolist(),'models':models}
