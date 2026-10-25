import copy
import os
import torch
from pipeline import XorMLP


def atomic_save(path, payload):
    temporary = path.with_suffix('.pending')
    torch.save(payload, temporary)
    os.replace(temporary, path)


def save_inference(path, model, config):
    atomic_save(path, {'schema':1,'kind':'inference','architecture':config['architecture'],
                      'dtype':config['dtype'],'model':copy.deepcopy(model.state_dict())})


def load_inference(path, config):
    payload = torch.load(path, map_location='cpu', weights_only=True)
    if (payload.get('schema') != 1 or payload.get('kind') != 'inference'
            or payload.get('architecture') != config['architecture'] or payload.get('dtype') != 'float64'):
        raise ValueError('incompatible inference schema')
    model = XorMLP(config['architecture']['width'])
    model.load_state_dict(payload['model'], strict=True)
    model.eval()
    return model


def save_resume(path, session):
    if session.in_epoch:
        raise ValueError('checkpoint requires a completed epoch')
    atomic_save(path, {'schema':1,'kind':'epoch_boundary_resume','config':session.config,
                      'seed':session.seed,'epoch':session.epoch,'updates':session.updates,
                      'model':copy.deepcopy(session.model.state_dict()),
                      'optimizer':copy.deepcopy(session.optimizer.state_dict()),
                      'scheduler':copy.deepcopy(session.scheduler.state_dict()),
                      'loaderRng':session.generator.get_state(), 'torchRng':torch.get_rng_state(),
                      'history':session.history,'trace':session.trace})


def load_resume(path, session, variant='full'):
    if variant not in ['full','optimizer_reset','order_reset','weights_only']:
        raise ValueError('unknown controlled variant')
    payload = torch.load(path, map_location='cpu', weights_only=True)
    if (payload.get('schema') != 1 or payload.get('kind') != 'epoch_boundary_resume'
            or payload.get('config') != session.config or payload.get('seed') != session.seed):
        raise ValueError('incompatible resume schema or protocol')
    session.model.load_state_dict(payload['model'], strict=True)
    session.epoch, session.updates = payload['epoch'], payload['updates']
    session.history, session.trace = payload['history'], payload['trace']
    if variant != 'weights_only':
        session.scheduler.load_state_dict(payload['scheduler'])
        if variant != 'optimizer_reset':
            session.optimizer.load_state_dict(payload['optimizer'])
        else:
            session.optimizer.param_groups[0]['lr'] = payload['optimizer']['param_groups'][0]['lr']
        if variant != 'order_reset':
            session.generator.set_state(payload['loaderRng'])
        # Restore after constructing and loading objects that could consume RNG.
        torch.set_rng_state(payload['torchRng'])
    return payload
