import json
from pathlib import Path
import torch
from torch.profiler import profile, record_function, ProfilerActivity
from workload import make_model, make_data, optimizer_for, training_step


def profiler_observation(protocol):
    config = protocol['profiler']
    model = make_model(protocol, 'cuda')
    x, y = make_data(protocol, config['batch'], 'cuda')
    optimizer = optimizer_for(model, protocol)
    scaler = torch.amp.GradScaler('cuda', enabled=False)
    for _ in range(3):
        training_step(model, optimizer, scaler, x, y, 'cuda', 'fp32')
    torch.cuda.synchronize()
    with profile(activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA], record_shapes=True, profile_memory=True) as profiler:
        for _ in range(config['steps']):
            with record_function('training_update'):
                training_step(model, optimizer, scaler, x, y, 'cuda', 'fp32')
        torch.cuda.synchronize()
    path = Path('/tmp/gpu-training-trace.json')
    profiler.export_chrome_trace(str(path))
    trace = json.loads(path.read_text())
    kernels = [event for event in trace['traceEvents'] if event.get('cat') == 'kernel']
    rows = [dict(name=event.key, count=event.count, selfCpuMicroseconds=event.self_cpu_time_total,
        selfDeviceMicroseconds=event.self_device_time_total, inputShapes=event.input_shapes)
        for event in profiler.key_averages(group_by_input_shape=True)]
    return dict(rows=rows, kernelEvents=len(kernels),
        kernelMicroseconds=sum(e['dur'] for e in kernels),
        scope='instrumented three-update observation; not the uninstrumented benchmark', trace=trace)
