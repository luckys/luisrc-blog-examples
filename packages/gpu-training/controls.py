import copy
import torch
from torch.nn import functional as F
from workload import make_model, make_data, amp_context, optimizer_for, training_step


def precision_controls(protocol):
    model = make_model(protocol, 'cuda')
    x, labels = make_data(protocol, protocol['precisionControlBatch'], 'cuda')
    with torch.no_grad():
        reference = model(x)
        reference_loss = F.cross_entropy(reference, labels)
        results = []
        for precision in ['fp32', 'fp16', 'bf16']:
            with amp_context('cuda', precision):
                output = model(x)
                loss = F.cross_entropy(output, labels)
            results.append(dict(precision=precision, outputDtype=str(output.dtype), lossDtype=str(loss.dtype),
                maxAbsoluteLogitError=(output.float() - reference).abs().max().item(),
                lossAbsoluteError=(loss - reference_loss).abs().item(),
                samePredictions=(output.argmax(1) == reference.argmax(1)).sum().item(), count=len(x),
                finite=bool(torch.isfinite(output).all().item())))
    return results


def one_update(model, features, labels, sizes, learning_rate, wrong_weights=False):
    optimizer = torch.optim.SGD(model.parameters(), lr=learning_rate)
    optimizer.zero_grad(set_to_none=True)
    start = 0
    for count in sizes:
        stop = start + count
        loss = F.cross_entropy(model(features[start:stop]), labels[start:stop], reduction='mean')
        weight = 1 / len(sizes) if wrong_weights else count / len(features)
        (loss * weight).backward()
        start = stop
    if start != len(features):
        raise ValueError('microbatches must cover the complete logical batch')
    optimizer.step()


def accumulation_control(protocol, device='cuda'):
    config = protocol['accumulation']
    original = make_model(protocol, device)
    x, labels = make_data(protocol, config['sampleCount'], device)
    full, micro, wrong = [copy.deepcopy(original) for _ in range(3)]
    one_update(full, x, labels, [len(x)], config['learningRate'])
    one_update(micro, x, labels, config['microbatches'], config['learningRate'])
    one_update(wrong, x, labels, config['microbatches'], config['learningRate'], True)
    difference = lambda a,b: max((x-y).abs().max().item() for x,y in zip(a.parameters(),b.parameters()))
    return dict(device=device, sampleCount=len(x), microbatches=config['microbatches'],
        weightedUpdateError=difference(full, micro), unweightedUpdateError=difference(full, wrong),
        optimizerStepsPerVariant=1)


def deterministic_control(protocol):
    def repeat():
        model = make_model(protocol, 'cuda')
        x, labels = make_data(protocol, 32, 'cuda')
        optimizer = optimizer_for(model, protocol)
        scaler = torch.amp.GradScaler('cuda', enabled=False)
        losses = [training_step(model, optimizer, scaler, x, labels, 'cuda', 'fp32').item()
            for _ in range(protocol['determinism']['probeSteps'])]
        return [p.detach().clone() for p in model.parameters()], losses
    first, first_loss = repeat()
    second, second_loss = repeat()
    return dict(sameLosses=first_loss == second_loss, maximumWeightDifference=max((a-b).abs().max().item() for a,b in zip(first,second)),
        scope='same process, hardware, runtime and fixed inputs only; no cross-version guarantee',losses=first_loss)
