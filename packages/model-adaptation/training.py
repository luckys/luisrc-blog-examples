import copy
import torch
from torch.nn import functional as F
from models import Autoencoder, make_classifier, parameter_counts
from objectives import denoising_loss


def batches(features, labels, count, generator):
    indices = torch.randint(len(features), (count,), generator=generator)
    return features[indices], labels[indices]


def reconstruction(model, features):
    with torch.no_grad():
        return F.mse_loss(model(features), features).item()


def classification(model, pair, predictions=False):
    features, labels = pair
    with torch.no_grad():
        logits = model(features)
        predicted = logits.argmax(dim=-1)
        result = dict(loss=F.cross_entropy(logits, labels).item(), accuracy=(predicted == labels).float().mean().item())
        if predictions:
            result.update(predictions=predicted.tolist(), labels=labels.tolist())
        return result


def pretrain(data, protocol, seed):
    torch.manual_seed(seed)
    model = Autoencoder()
    config = protocol['source']
    optimizer = torch.optim.Adam(model.parameters(), lr=config['learningRate'])
    generator = torch.Generator().manual_seed(seed + 100)
    train = data['source']['train'][0]
    validation = data['source']['validation'][0]
    initial = reconstruction(model, validation)
    curve = []
    for step in range(config['steps']):
        clean, _ = batches(train, train, config['batchSize'], generator)
        noise = torch.randn(clean.shape, generator=generator) * config['noiseStd']
        optimizer.zero_grad(set_to_none=True)
        loss = denoising_loss(model, clean, noise)
        loss.backward()
        optimizer.step()
        if (step + 1) % 20 == 0:
            curve.append(dict(step=step + 1, batchLoss=loss.item(), validationMSE=reconstruction(model, validation)))
    return model, dict(seed=seed, parameters=parameter_counts(model), initialValidationMSE=initial,
        finalValidationMSE=reconstruction(model, validation), curve=curve)


def adapt(pretrained, data, protocol, mode, seed):
    model = make_classifier(pretrained, mode, seed)
    config = protocol['target']
    start = copy.deepcopy(model.state_dict())
    initial_counts = parameter_counts(model)
    optimizer = torch.optim.Adam([p for p in model.parameters() if p.requires_grad], lr=config['learningRate'])
    generator = torch.Generator().manual_seed(seed + 200)
    curve = []
    for step in range(config['steps']):
        if mode == 'gradual' and step == config['unfreezeAt']:
            model.encoder.requires_grad_(True)
            optimizer.add_param_group({'params': list(model.encoder.parameters())})
        features, labels = batches(*data['target']['train'], config['batchSize'], generator)
        optimizer.zero_grad(set_to_none=True)
        loss = F.cross_entropy(model(features), labels)
        loss.backward()
        optimizer.step()
        if (step + 1) % 20 == 0:
            curve.append(dict(step=step + 1, batchLoss=loss.item(), validation=classification(model, data['target']['validation']),
                trainable=parameter_counts(model)['trainable']))
    # Only validation has been consulted so far. Test is evaluated by experiments.py after every run is trained.
    delta = {name: (model.state_dict()[name] - value).abs().max().item() for name, value in start.items()}
    return model, dict(mode=mode, seed=seed, initialParameters=initial_counts, finalParameters=parameter_counts(model),
        curve=curve, changedParameters={name: value for name, value in delta.items() if value != 0},
        largestDelta=max(delta.values()), sourceMSE=None)


def retained_reconstruction(model, pretrained, features):
    # Keep the original reconstruction head; measure the ACTIVE adapted representation.
    with torch.no_grad():
        return F.mse_loss(pretrained.decoder(model.representation(features)), features).item()
