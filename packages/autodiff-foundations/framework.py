import warnings
import numpy as np
import torch
from base import Layer
from torch.nn.functional import binary_cross_entropy_with_logits


def parameters(layers: list[Layer]) -> tuple[torch.Tensor, ...]:
    return tuple(torch.tensor(a, dtype=torch.float64, device='cpu', requires_grad=True)
                 for layer in layers for a in (layer.weight, layer.bias))


def torch_forward(x: np.ndarray, y: np.ndarray, params: tuple[torch.Tensor, ...],
                  detach_hidden: bool = False) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    w1, b1, w2, b2 = params
    inputs = torch.tensor(x, dtype=torch.float64)
    targets = torch.tensor(y, dtype=torch.float64)
    hidden = torch.tanh(inputs @ w1 + b1)
    if detach_hidden:
        hidden = hidden.detach()
    logits = hidden @ w2 + b2
    loss = binary_cross_entropy_with_logits(logits, targets, reduction='mean')
    return loss, hidden, logits


def gradient_values(params: tuple[torch.Tensor, ...]) -> list[float | None]:
    result = []
    for p in params:
        result.extend([None] * p.numel() if p.grad is None else p.grad.detach().numpy().ravel().tolist())
    return result


def torch_gradient(x: np.ndarray, y: np.ndarray, layers: list[Layer]) -> tuple[np.ndarray, float]:
    params = parameters(layers)
    loss, _, _ = torch_forward(x, y, params)
    loss.backward()
    return np.asarray(gradient_values(params)), float(loss.detach())


def vector_product(x: np.ndarray, y: np.ndarray, layers: list[Layer]) -> np.ndarray:
    params = parameters(layers)
    _, _, logits = torch_forward(x, y, params)
    with torch.no_grad():
        upstream = (torch.sigmoid(logits) - torch.tensor(y, dtype=torch.float64)) / len(x)
    result = torch.autograd.grad(logits, params, grad_outputs=upstream)
    return np.concatenate([g.detach().numpy().ravel() for g in result])


def scalar_framework(w: float, x: float) -> dict[str, float]:
    tw = torch.tensor(w, dtype=torch.float64, requires_grad=True)
    tx = torch.tensor(x, dtype=torch.float64, requires_grad=True)
    q = tw * tx
    r = q + q
    q.retain_grad()
    r.retain_grad()
    loss = r.square()
    loss.backward()
    return {'w':w,'x':x,'q':float(q.detach()),'r':float(r.detach()),'loss':float(loss.detach()),
            'dq':float(q.grad),'dr':float(r.grad),'dw':float(tw.grad),'dx':float(tx.grad)}


def graph_checks(x: np.ndarray, y: np.ndarray, layers: list[Layer]) -> dict:
    probe_params = parameters(layers)
    probe_loss, probe_hidden, _ = torch_forward(x, y, probe_params)
    probe_loss.backward()
    with warnings.catch_warnings():
        warnings.simplefilter('ignore', UserWarning)
        non_leaf_without_retain = probe_hidden.grad
    leaf_present = all(p.grad is not None for p in probe_params)
    params = parameters(layers)
    before = [p.detach().clone() for p in params]
    loss, hidden, _ = torch_forward(x, y, params)
    hidden.retain_grad()
    loss.backward()
    once = gradient_values(params)
    hidden_shape = list(hidden.grad.shape)
    torch_forward(x, y, params)[0].backward()
    twice = gradient_values(params)
    for p in params:
        p.grad = None
    torch_forward(x, y, params)[0].backward()
    reset = gradient_values(params)
    unchanged = all(torch.equal(p.detach(), original) for p, original in zip(params,before))

    # Each failure uses fresh leaves so it cannot pollute the accumulation experiment.
    detached_params = parameters(layers)
    torch_forward(x, y, detached_params, detach_hidden=True)[0].backward()
    detached = gradient_values(detached_params)
    consumed_loss = torch_forward(x, y, parameters(layers))[0]
    consumed_loss.backward()
    reuse_rejected = False
    try:
        consumed_loss.backward()
    except RuntimeError as error:
        reuse_rejected = 'second time' in str(error)
    with torch.no_grad():
        no_grad_loss = torch_forward(x, y, parameters(layers))[0]
    no_grad_rejected = False
    try:
        no_grad_loss.backward()
    except RuntimeError as error:
        no_grad_rejected = 'does not require grad' in str(error)
    checked = torch.autograd.gradcheck(lambda *p: torch_forward(x,y,p)[0], parameters(layers),
                                      eps=1e-6, atol=1e-5, rtol=1e-3)
    return {'once':once,'twice':twice,'reset':reset,'weightsUnchanged':unchanged,
            'detached':detached,'reuseRejected':reuse_rejected,'noGradRejected':no_grad_rejected,
            'nonLeafGradWithoutRetain':None if non_leaf_without_retain is None else non_leaf_without_retain.tolist(),
            'leafGradsPresentWithoutRetain':leaf_present,
            'hiddenGradShape':hidden_shape,'gradcheck':bool(checked)}
