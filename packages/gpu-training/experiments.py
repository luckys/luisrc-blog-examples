import hashlib
import json
import platform
import random
import subprocess
import sys
from pathlib import Path
from datetime import datetime, timezone
import torch

SOURCES = ['workload.py','measure.py','controls.py','profiling.py','case.py','experiments.py',
    'protocol.json','runtime.json','run.mjs','verify-report.mjs','tests/test_workload.py']


def child(*args):
    process = subprocess.run([sys.executable, '-B', 'case.py', *map(str,args)], capture_output=True, text=True, timeout=180)
    if process.returncode:
        raise RuntimeError(process.stderr)
    return json.loads(process.stdout), process.stderr


def run():
    protocol = json.loads(Path('protocol.json').read_text())
    if not torch.cuda.is_available():
        raise RuntimeError('A real CUDA GPU is required; no CPU fallback')
    order = [(device, precision, batch) for device in protocol['devices']
        for precision in protocol['precisions'][device] for batch in protocol['batches']]
    random.Random(protocol['orderSeed']).shuffle(order)
    cases, warnings = [], []
    for device, precision, batch in order:
        result, warning = child('benchmark', device, precision, batch)
        cases.append(result)
        if warning:
            warnings.append(dict(case=[device, precision, batch], stderr=warning))
    transfers, warning = child('transfer')
    if warning:
        warnings.append(dict(case='transfer', stderr=warning))
    controls, warning = child('controls')
    if warning:
        warnings.append(dict(case='controls', stderr=warning))
    profiler, warning = child('profiler')
    if warning:
        warnings.append(dict(case='profiler', stderr=warning))
    properties = torch.cuda.get_device_properties(0)
    return dict(kind='gpu_training_observations',schema=1,capturedAt=datetime.now(timezone.utc).isoformat(),
        protocol=protocol,runtime=dict(python=platform.python_version(),torch=torch.__version__,cuda=torch.version.cuda,
            device=properties.name,capability=[properties.major,properties.minor],totalMemory=properties.total_memory),
        sourceHashes={name:hashlib.sha256(Path(name).read_bytes()).hexdigest() for name in SOURCES},
        cases=cases, transfers=transfers, controls=controls, profiler=profiler, warnings=warnings)


if __name__ == '__main__':
    print(json.dumps(run(),allow_nan=False))
