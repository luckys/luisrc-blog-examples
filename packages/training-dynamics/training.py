import sys
from pathlib import Path
import hashlib
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'neural-foundations'))
from neural import Layer, initialize, gradients, metrics, make_split
from optimizers import Optimizer, schedule_rate


def arrays(layers):
    return [a for layer in layers for a in (layer.weight, layer.bias)]


def flatten(layers):
    return np.concatenate([a.ravel() for a in arrays(layers)])


def layers_from(params):
    return [Layer(params[0], params[1]), Layer(params[2], params[3])]


def batches(count, size, order_seed, epoch):
    if count < 1 or size < 1:
        raise ValueError('nonempty data and positive batch size required')
    order = np.random.default_rng(np.random.SeedSequence([order_seed, epoch])).permutation(count)
    return [order[start:start + size] for start in range(0, count, size)]


def accumulated_gradient(x, y, layers, micro_size, naive=False):
    if len(x) == 0 or micro_size < 1:
        raise ValueError('nonempty effective batch and positive microbatch size required')
    chunks = [(x[i:i+micro_size], y[i:i+micro_size]) for i in range(0, len(x), micro_size)]
    total = [np.zeros_like(a) for a in arrays(layers)]
    for mx, my in chunks:
        weight = 1 / len(chunks) if naive else len(mx) / len(x)
        for acc, g in zip(total, arrays(gradients(mx, my, layers))):
            acc += weight * g
    return layers_from(total)


def train_run(x, y, vx, vy, seed, kind, options, epochs, batch_size, order_seed,
              micro_size=None, schedule=None):
    layers = initialize(4, seed)
    opt = Optimizer(arrays(layers), kind, **{k:v for k,v in options.items() if k != 'lr'})
    total_updates = epochs * int(np.ceil(len(x) / batch_size))
    history, trace, order_digest = [], [], hashlib.sha256()
    updates, seen, rate, grad_norm, delta_norm = 0, 0, None, None, None
    for epoch in range(epochs + 1):
        tr, va = metrics(x, y, layers), metrics(vx, vy, layers)
        history.append({'epoch':epoch, 'updates':updates, 'examplesSeen':seen,
                        'trainLoss':tr['loss'], 'validationLoss':va['loss'],
                        'trainAccuracy':tr['accuracy'], 'validationAccuracy':va['accuracy'],
                        'lrLast':rate, 'gradientNormLast':grad_norm, 'updateNormLast':delta_norm})
        if epoch == epochs:
            break
        for indices in batches(len(x), batch_size, order_seed, epoch):
            order_digest.update(indices.astype('<i8').tobytes())
            before = flatten(layers)
            gs = (gradients(x[indices], y[indices], layers) if micro_size is None else
                  accumulated_gradient(x[indices], y[indices], layers, micro_size))
            rate = (options['lr'] if schedule is None else
                    schedule_rate(options['lr'], updates, total_updates,
                                  schedule['warmupUpdates'], schedule['minFactor']))
            layers = layers_from(opt.step(arrays(layers), arrays(gs), rate))
            grad_norm = float(np.linalg.norm(flatten(gs)))
            delta_norm = float(np.linalg.norm(flatten(layers) - before))
            updates += 1
            seen += len(indices)
            if updates <= 3:
                trace.append({'update':updates,'lr':rate,'before':before.tolist(),
                              'gradient':flatten(gs).tolist(),'after':flatten(layers).tolist(),
                              'm':np.concatenate([a.ravel() for a in opt.m]).tolist(),
                              'v':np.concatenate([a.ravel() for a in opt.v]).tolist()})
    return {'seed':seed,'optimizer':kind,'options':options,'epochs':epochs,'batchSize':batch_size,
            'microSize':micro_size,'schedule':schedule,'updates':updates,'examplesSeen':seen,
            'orderHash':order_digest.hexdigest(),'parameters':flatten(layers).tolist(),
            'history':history,'trace':trace}
