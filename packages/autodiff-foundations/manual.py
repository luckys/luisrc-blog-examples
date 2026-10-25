import numpy as np
from base import Layer, dense, forward, sigmoid, binary_loss


def scalar_trace(w: float, x: float) -> dict[str, float]:
    if not np.isfinite(w) or not np.isfinite(x) or abs(w)>3 or abs(x)>3:
        raise ValueError('bounded scalar inputs required')
    q = w * x
    r = q + q
    loss = r ** 2
    dr = 2 * r
    dq_left = dr
    dq_right = dr
    dq = dq_left + dq_right
    return {'w':w, 'x':x, 'q':q, 'r':r, 'loss':loss, 'dr':dr,
            'dqLeft':dq_left, 'dqRight':dq_right, 'dq':dq, 'dw':dq*x, 'dx':dq*w}


def backward_trace(x: np.ndarray, y: np.ndarray, layers: list[Layer]) -> dict:
    if len(layers) != 2:
        raise ValueError('two-layer MLP required')
    z1 = dense(x, layers[0])
    h = np.tanh(z1)
    z2 = dense(h, layers[1])
    loss = binary_loss(z2, y)
    p = sigmoid(z2)
    dz2 = (p - y) / len(x)
    dw2 = h.T @ dz2
    db2 = dz2.sum(axis=0)
    dh = dz2 @ layers[1].weight.T
    dz1 = dh * (1 - h ** 2)
    dw1 = x.T @ dz1
    db1 = dz1.sum(axis=0)
    return {'z1':z1, 'h':h, 'z2':z2, 'p':p, 'loss':loss,
            'dz2':dz2, 'dw2':dw2, 'db2':db2, 'dh':dh, 'dz1':dz1,
            'dw1':dw1, 'db1':db1}


def pack(layers: list[Layer]) -> np.ndarray:
    return np.concatenate([a.ravel() for layer in layers for a in (layer.weight, layer.bias)])


def unpack(template: list[Layer], vector: np.ndarray) -> list[Layer]:
    if vector.ndim!=1 or len(vector)!=len(pack(template)) or not np.all(np.isfinite(vector)):
        raise ValueError('finite parameter vector with expected length required')
    arrays, offset = [], 0
    for layer in template:
        pair = []
        for a in (layer.weight, layer.bias):
            pair.append(vector[offset:offset+a.size].reshape(a.shape).copy())
            offset += a.size
        arrays.append(Layer(*pair))
    return arrays


def manual_vector(trace: dict) -> np.ndarray:
    return np.concatenate([trace[k].ravel() for k in ['dw1','db1','dw2','db2']])


def finite_gradient(x: np.ndarray, y: np.ndarray, layers: list[Layer], epsilon: float) -> np.ndarray:
    if not np.isfinite(epsilon) or epsilon<=0 or epsilon>0.1:
        raise ValueError('epsilon outside bounded experiment')
    theta = pack(layers)
    result = np.zeros_like(theta)
    for i in range(len(theta)):
        high, low = theta.copy(), theta.copy()
        high[i] += epsilon
        low[i] -= epsilon
        loss_high = binary_loss(forward(x, unpack(layers, high))[0], y)
        loss_low = binary_loss(forward(x, unpack(layers, low))[0], y)
        result[i] = (loss_high - loss_low) / (2 * epsilon)
    return result


def mutant_vectors(x: np.ndarray, trace: dict) -> dict[str, np.ndarray]:
    correct = manual_vector(trace)
    missing_tanh = np.concatenate([(x.T @ trace['dh']).ravel(), trace['dh'].sum(axis=0),
                                   trace['dw2'].ravel(), trace['db2']])
    wrong_bias = np.concatenate([trace['dw1'].ravel(), trace['dz1'].mean(axis=0),
                                trace['dw2'].ravel(), trace['dz2'].mean(axis=0)])
    factor = trace['p'] * (1 - trace['p'])
    extra_sigmoid = np.concatenate([(x.T @ (trace['dz1'] * factor)).ravel(),
                                    (trace['dz1'] * factor).sum(axis=0),
                                    (trace['h'].T @ (trace['dz2'] * factor)).ravel(),
                                    (trace['dz2'] * factor).sum(axis=0)])
    return {'missing_mean': correct * len(x), 'missing_tanh': missing_tanh,
            'bias_mean':wrong_bias, 'extra_sigmoid':extra_sigmoid}
