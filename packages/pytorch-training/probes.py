import copy
import numpy as np
import torch
from pipeline import XorMLP, checked_loss


def tensor_probe():
    logits = torch.tensor([[-2.],[-.5],[.5],[2.]], dtype=torch.float64)
    flat = torch.tensor([0.,1.,0.,1.], dtype=torch.float64)
    bad = logits - flat
    good = logits - flat[:, None]
    rejected = False
    try:
        torch.nn.functional.binary_cross_entropy_with_logits(logits, flat)
    except ValueError:
        rejected = True
    source = np.zeros((2, 2), dtype=np.float64)
    shared = torch.from_numpy(source)
    copied = torch.tensor(source)
    source[0, 0] = 9
    return {'badShape':list(bad.shape),'goodShape':list(good.shape),
            'badResidual':bad.tolist(),'goodResidual':good.tolist(),
            'badMse':float(bad.square().mean()),'goodMse':float(good.square().mean()),
            'bceRejected':rejected,'sharedAfterMutation':float(shared[0,0]),
            'copiedAfterMutation':float(copied[0,0])}


def mode_probe():
    with torch.random.fork_rng(devices=[]):
        torch.manual_seed(99)
        dropout = torch.nn.Dropout(p=.5)
        values = torch.ones(64,4,dtype=torch.float64)
        first,second = dropout(values),dropout(values)
        dropout.eval()
        identity = torch.equal(dropout(values),values)
        model = XorMLP(4).eval()
        inputs = torch.ones(2,2,dtype=torch.float64)
        eval_requires_grad = model(inputs).requires_grad
        model.train()
        with torch.no_grad():
            disabled = model(inputs)
        return {'dropoutTrainDiffers':not torch.equal(first,second),
                'dropoutEvalIdentity':identity,'dropoutFirst':first[:8].tolist(),
                'evalStillRequiresGrad':eval_requires_grad,
                'noGradStillTraining':model.training,'noGradRequiresGrad':disabled.requires_grad}


def snapshot_probe():
    with torch.random.fork_rng(devices=[]):
        model = XorMLP(4)
        shallow = model.state_dict()
        deep = copy.deepcopy(model.state_dict())
        before = deep['hidden.bias'].clone()
        with torch.no_grad():
            model.hidden.bias.add_(1)
        return {'shallowChanged':torch.equal(shallow['hidden.bias'],before+1),
                'deepUnchanged':torch.equal(deep['hidden.bias'],before)}
