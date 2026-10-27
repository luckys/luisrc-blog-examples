import statistics
import time
import torch
from workload import make_model, make_data, optimizer_for, training_step, synchronise, memory_snapshot


def sample_updates(step, count, device):
    synchronise(device)
    started = time.perf_counter()
    for _ in range(count):
        loss = step()
    synchronise(device)
    elapsed = time.perf_counter() - started
    return elapsed, loss


def benchmark(protocol, device, precision, batch):
    model = make_model(protocol, device)
    features, labels = make_data(protocol, batch, device)
    optimizer = optimizer_for(model, protocol)
    scaler = torch.amp.GradScaler('cuda', enabled=device == 'cuda' and precision == 'fp16')
    step = lambda: training_step(model, optimizer, scaler, features, labels, device, precision)
    for _ in range(protocol['warmupSteps']):
        loss = step()
    synchronise(device)
    warmup_loss = loss.item()
    if device == 'cuda':
        torch.cuda.reset_peak_memory_stats()
        before = memory_snapshot()
    else:
        before = None
    times = []
    scale_before = scaler.get_scale()
    for _ in range(protocol['samples']):
        elapsed, loss = sample_updates(step, protocol['stepsPerSample'], device)
        times.append(elapsed)
    final_loss = loss.item()
    memory = memory_snapshot() if device == 'cuda' else None
    median = statistics.median(times)
    return dict(device=device, precision=precision, batch=batch, parameters=sum(v.numel() for v in model.parameters()),
        sampleSeconds=times, stepsPerSample=protocol['stepsPerSample'],
        medianStepMilliseconds=median / protocol['stepsPerSample'] * 1000,
        examplesPerSecond=batch * protocol['stepsPerSample'] / median,
        memoryBefore=before, memory=memory, warmupLoss=warmup_loss, finalLoss=final_loss,
        weightDtypes=sorted(set(str(v.dtype) for v in model.parameters())),
        gradScaleBefore=scale_before, gradScaleAfter=scaler.get_scale(),
        initialWeightSeed=protocol['seed'], dataSeed=protocol['dataSeed'])


def transfer_benchmark(protocol):
    records = []
    for size in protocol['transfer']['bytes']:
        for mode in protocol['transfer']['modes']:
            pinned = mode == 'pinned_nonblocking'
            source = torch.ones(size // 4, pin_memory=pinned)
            destination = torch.empty_like(source, device='cuda')
            for _ in range(protocol['transfer']['warmupCopies']):
                destination.copy_(source, non_blocking=pinned)
            torch.cuda.synchronize()
            samples = []
            for _ in range(protocol['transfer']['samples']):
                torch.cuda.synchronize()
                start = time.perf_counter()
                for _ in range(protocol['transfer']['copiesPerSample']):
                    destination.copy_(source, non_blocking=pinned)
                torch.cuda.synchronize()
                samples.append(time.perf_counter() - start)
            median = statistics.median(samples)
            copies = protocol['transfer']['copiesPerSample']
            records.append(dict(bytes=size, mode=mode, sampleSeconds=samples, copiesPerSample=copies,
                medianCopyMilliseconds=median / copies * 1000, decimalGigabytesPerSecond=size * copies / median / 1e9,
                destinationMatches=bool(torch.all(destination == 1).item())))
    return records
