"""CPU-only, single-worker XOR pipeline with explicit epoch-boundary state."""
import sys
from pathlib import Path
from dataclasses import dataclass, field
import numpy as np
import torch
from torch import nn
from torch.nn.functional import binary_cross_entropy_with_logits
from torch.utils.data import Dataset, DataLoader
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'neural-foundations'))
from neural import initialize, make_split, forward


class PointDataset(Dataset):
    def __init__(self, x, y):
        if (x.ndim != 2 or x.shape[1] != 2 or y.shape != (len(x), 1)
                or not len(x) or not np.isfinite(x).all() or not np.isfinite(y).all()
                or not np.all((y == 0) | (y == 1))):
            raise ValueError('finite features (n,2) and binary targets (n,1) required')
        self.x = torch.tensor(x, dtype=torch.float64, device='cpu')
        self.y = torch.tensor(y, dtype=torch.float64, device='cpu')

    def __len__(self):
        return len(self.x)

    def __getitem__(self, index):
        return self.x[index], self.y[index], index


class XorMLP(nn.Module):
    def __init__(self, width):
        super().__init__()
        self.hidden = nn.Linear(2, width, dtype=torch.float64)
        self.output = nn.Linear(width, 1, dtype=torch.float64)

    def forward(self, x):
        hidden = torch.tanh(self.hidden(x))
        return self.output(hidden)


def checked_loss(logits, targets, reduction='mean'):
    if (logits.ndim != 2 or logits.shape[1] != 1 or logits.shape != targets.shape
            or not len(logits) or logits.dtype != torch.float64 or targets.dtype != logits.dtype
            or logits.device != targets.device or not torch.isfinite(logits).all()
            or not torch.isfinite(targets).all() or not torch.all((targets == 0) | (targets == 1))):
        raise ValueError('matching finite float64 binary (batch,1) tensors required')
    return binary_cross_entropy_with_logits(logits, targets, reduction=reduction)


def make_data(config):
    d = config['dataset']
    return (make_split(d['trainPerQuadrant'], d['trainSeed'], d['halfWidth']),
            make_split(d['validationPerQuadrant'], d['validationSeed'], d['halfWidth']))


def model_vector(model):
    return torch.cat([p.detach().reshape(-1) for p in model.parameters()]).numpy().copy()


def model_values(model):
    return {name:value.detach().tolist() for name,value in model.state_dict().items()}


def evaluate(model, loader):
    was_training = model.training
    model.eval()
    total_loss, correct, count, batch_means = 0., 0, 0, []
    try:
        with torch.no_grad():
            for x, y, _ in loader:
                logits = model(x)
                loss_sum = float(checked_loss(logits, y, reduction='sum'))
                total_loss += loss_sum
                correct += int(((logits >= 0) == y).sum())
                count += len(x)
                batch_means.append(loss_sum / len(x))
    finally:
        model.train(was_training)
    return {'loss':total_loss/count, 'accuracy':correct/count, 'count':count,
            'naiveMeanOfBatchMeans':sum(batch_means)/len(batch_means)}


@dataclass
class Session:
    config: dict
    seed: int
    model: XorMLP
    optimizer: torch.optim.Optimizer
    scheduler: torch.optim.lr_scheduler.StepLR
    training: DataLoader
    validation: DataLoader
    train_evaluation: DataLoader
    generator: torch.Generator
    epoch: int = 0
    updates: int = 0
    in_epoch: bool = False
    history: list = field(default_factory=list)
    trace: dict = field(default_factory=dict)


def checkpoint_row(s, online=None, order=None, lr_used=None):
    train = evaluate(s.model, s.train_evaluation)
    validation = evaluate(s.model, s.validation)
    return {'epoch':s.epoch, 'updates':s.updates, 'examplesSeen':s.epoch*len(s.training.dataset),
            'onlineLoss':online, 'trainLoss':train['loss'], 'validationLoss':validation['loss'],
            'trainAccuracy':train['accuracy'], 'validationAccuracy':validation['accuracy'],
            'lrUsed':lr_used, 'lrNext':s.optimizer.param_groups[0]['lr'],
            'order':order or [], 'state':model_values(s.model)}


def make_session(config, seed):
    torch.manual_seed(config['torchSeed'])
    torch.use_deterministic_algorithms(True)
    model = XorMLP(config['architecture']['width'])
    layers = initialize(config['architecture']['width'], seed)
    with torch.no_grad():
        for target, source in zip([model.hidden, model.output], layers):
            target.weight.copy_(torch.tensor(source.weight.T))
            target.bias.copy_(torch.tensor(source.bias))
    optimizer = torch.optim.SGD(model.parameters(), **config['optimizer'])
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, **config['scheduler'])
    (x,y),(vx,vy) = make_data(config)
    train, validation = PointDataset(x,y), PointDataset(vx,vy)
    generator = torch.Generator().manual_seed(config['loaderSeed'])
    training = DataLoader(train, batch_size=config['batchSize'], shuffle=True, generator=generator,
                          num_workers=config['numWorkers'], drop_last=config['dropLast'])
    def fixed_loader(dataset):
        return DataLoader(dataset, batch_size=config['evaluationBatchSize'], shuffle=False,
                          num_workers=0, generator=torch.Generator().manual_seed(421))
    s = Session(config,seed,model,optimizer,scheduler,training,fixed_loader(validation),
                fixed_loader(train),generator)
    s.history.append(checkpoint_row(s))
    return s


def train_until(s, final_epoch):
    if not s.epoch <= final_epoch <= s.config['epochs'] or s.in_epoch:
        raise ValueError('resume only from an epoch boundary within the protocol')
    while s.epoch < final_epoch:
        s.in_epoch = True
        s.model.train()
        total_loss, count, order = 0., 0, []
        lr_used = s.optimizer.param_groups[0]['lr']
        for x, y, indices in s.training:
            before = model_vector(s.model)
            s.optimizer.zero_grad(set_to_none=True)
            loss = checked_loss(s.model(x), y)
            loss.backward()
            after_backward = model_vector(s.model)
            gradient = torch.cat([p.grad.detach().reshape(-1) for p in s.model.parameters()]).numpy()
            s.optimizer.step()
            if not s.trace:
                s.trace = {'batchSize':len(x),'loss':float(loss.detach()),'before':before.tolist(),
                           'afterBackward':after_backward.tolist(),'gradient':gradient.tolist(),
                           'afterStep':model_vector(s.model).tolist()}
            total_loss += float(loss.detach()) * len(x)
            count += len(x)
            order.extend(indices.tolist())
            s.updates += 1
        s.epoch += 1
        s.scheduler.step()
        s.in_epoch = False
        s.history.append(checkpoint_row(s,total_loss/count,order,lr_used))
    return s
