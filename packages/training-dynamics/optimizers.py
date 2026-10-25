"""Small dense optimizers: no sparse, missing, mixed-precision or fused gradients."""
import math
import numpy as np


class Optimizer:
    def __init__(self, params, kind, decay=0., beta=.9, betas=(.9, .999), epsilon=1e-8):
        if kind not in ('sgd', 'momentum', 'adam', 'adamw') or decay < 0:
            raise ValueError('unsupported optimizer or decay')
        self.kind, self.decay, self.beta = kind, decay, beta
        self.b1, self.b2 = betas
        self.epsilon, self.t = epsilon, 0
        self.m = [np.zeros_like(p) for p in params]
        self.v = [np.zeros_like(p) for p in params]

    def step(self, params, grads, lr):
        if not np.isfinite(lr) or lr <= 0 or len(params) != len(grads):
            raise ValueError('positive finite learning rate and matching lists required')
        if any(p.shape != g.shape or not np.isfinite(g).all() for p,g in zip(params,grads)):
            raise ValueError('dense finite gradients with matching shapes required')
        self.t += 1
        result = []
        for i, (p, raw) in enumerate(zip(params, grads)):
            g = raw if self.kind == 'adamw' else raw + self.decay * p
            if self.kind == 'sgd':
                direction = g
            elif self.kind == 'momentum':
                self.m[i] = self.beta * self.m[i] + g
                direction = self.m[i]
            else:
                self.m[i] = self.b1 * self.m[i] + (1 - self.b1) * g
                self.v[i] = self.b2 * self.v[i] + (1 - self.b2) * g * g
                m_hat = self.m[i] / (1 - self.b1 ** self.t)
                v_hat = self.v[i] / (1 - self.b2 ** self.t)
                direction = m_hat / (np.sqrt(v_hat) + self.epsilon)
            base = p * (1 - lr * self.decay) if self.kind == 'adamw' else p
            result.append(base - lr * direction)
        return result


def schedule_rate(base, update, total, warmup, min_factor):
    if not (0 <= update < total and 1 <= warmup < total - 1 and 0 < min_factor <= 1):
        raise ValueError('bounded zero-based update index required')
    if update < warmup:
        return base * (update + 1) / warmup
    progress = (update - warmup) / (total - warmup - 1)
    factor = min_factor + (1 - min_factor) * (1 + math.cos(math.pi * progress)) / 2
    return base * factor
