import torch
from torch.nn import functional as F


def denoising_loss(model, clean, noise):
    corrupted = clean + noise
    return F.mse_loss(model(corrupted), clean)


def contrastive_loss(first, second, temperature=0.2):
    if temperature <= 0 or first.shape != second.shape or first.ndim != 2 or len(first) < 2:
        raise ValueError('two paired matrices, positive temperature and at least two pairs required')
    first = F.normalize(first, dim=-1)
    second = F.normalize(second, dim=-1)
    logits = first @ second.T / temperature
    positives = torch.arange(len(first))
    return (F.cross_entropy(logits, positives) + F.cross_entropy(logits.T, positives)) / 2


def contrastive_probe():
    first = torch.tensor([[1., 0.], [0., 1.], [-1., 0.]], requires_grad=True)
    second = torch.tensor([[0.9, 0.1], [0.1, 0.9], [-0.9, 0.1]], requires_grad=True)
    values = []
    for temperature in [0.1, 0.2, 1.0]:
        values.append(dict(temperature=temperature, loss=contrastive_loss(first, second, temperature).item()))
    loss = contrastive_loss(first, second)
    loss.backward()
    return dict(temperatures=values, logits=(F.normalize(first, dim=-1) @ F.normalize(second, dim=-1).T / 0.2).detach().tolist(),
        loss=loss.item(), firstGradient=first.grad.tolist(), secondGradient=second.grad.tolist(),
        swappedLoss=contrastive_loss(first.detach(), second.detach()[[1, 0, 2]]).item(),
        collapsedLoss=contrastive_loss(torch.ones(3, 2), torch.ones(3, 2)).item(),
        training=False, scope='three-pair objective and gradients only; not a SimCLR training run')
