import json
import sys
from pathlib import Path
from workload import configure
from measure import benchmark, transfer_benchmark
from controls import precision_controls, accumulation_control, deterministic_control
from profiling import profiler_observation

protocol = json.loads(Path('protocol.json').read_text())
configure(protocol)
kind = sys.argv[1]
if kind == 'benchmark':
    result = benchmark(protocol, sys.argv[2], sys.argv[3], int(sys.argv[4]))
elif kind == 'transfer':
    result = transfer_benchmark(protocol)
elif kind == 'controls':
    result = dict(precision=precision_controls(protocol), accumulation=accumulation_control(protocol), determinism=deterministic_control(protocol))
elif kind == 'profiler':
    result = profiler_observation(protocol)
else:
    raise ValueError(kind)
print(json.dumps(result, allow_nan=False))
