import torch
from torch import nn
from torch.nn import functional as F


def configure(protocol):
    torch.set_num_threads(protocol['cpuThreads'])
    torch.use_deterministic_algorithms(protocol['determinism']['algorithms'])
    torch.backends.cuda.matmul.fp32_precision = 'ieee'
    torch.backends.cudnn.conv.fp32_precision = 'ieee'
    if torch.cuda.is_available():
        torch.cuda.set_per_process_memory_fraction(protocol['memoryFraction'])


def make_model(protocol, device):
    config = protocol['model']
    torch.manual_seed(protocol['seed'])
    model = nn.Sequential(nn.Linear(config['input'], config['hidden']), nn.ReLU(),
        nn.Linear(config['hidden'], config['hidden']), nn.ReLU(), nn.Linear(config['hidden'], config['classes']))
    return model.to(device)


def make_data(protocol, count, device='cpu'):
    generator = torch.Generator().manual_seed(protocol['dataSeed'])
    features = torch.randn(count, protocol['model']['input'], generator=generator)
    labels = features[:, :protocol['model']['classes']].argmax(dim=1)
    return features.to(device), labels.to(device)


def amp_context(device, precision):
    dtype = torch.float16 if precision == 'fp16' else torch.bfloat16
    return torch.autocast(device_type=device, dtype=dtype, enabled=precision != 'fp32')


def training_step(model, optimizer, scaler, features, labels, device, precision):
    optimizer.zero_grad(set_to_none=True)
    with amp_context(device, precision):
        logits = model(features)
        loss = F.cross_entropy(logits, labels)
    scaler.scale(loss).backward()
    scaler.step(optimizer)
    scaler.update()
    return loss.detach()


def optimizer_for(model, protocol):
    config = protocol['optimizer']
    return torch.optim.AdamW(model.parameters(), lr=config['learningRate'],
        weight_decay=config['weightDecay'], foreach=config['foreach'])


def synchronise(device):
    if device == 'cuda':
        torch.cuda.synchronize()


def memory_snapshot():
    return dict(allocated=torch.cuda.memory_allocated(), reserved=torch.cuda.memory_reserved(),
        peakAllocated=torch.cuda.max_memory_allocated(), peakReserved=torch.cuda.max_memory_reserved())
