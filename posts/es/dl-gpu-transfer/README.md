# Transferencias a GPU: qué cambian pinned memory y non_blocking

Draft español. Cómo medir copias H2D y qué falta para demostrar overlap.

- [packages/gpu-training/workload.py](../../../packages/gpu-training/workload.py)
- [packages/gpu-training/measure.py](../../../packages/gpu-training/measure.py)
- [packages/gpu-training/controls.py](../../../packages/gpu-training/controls.py)
- [packages/gpu-training/profiling.py](../../../packages/gpu-training/profiling.py)
- [packages/gpu-training/case.py](../../../packages/gpu-training/case.py)
- [packages/gpu-training/experiments.py](../../../packages/gpu-training/experiments.py)
- [packages/gpu-training/run.mjs](../../../packages/gpu-training/run.mjs)
- [packages/gpu-training/verify-report.mjs](../../../packages/gpu-training/verify-report.mjs)
- [packages/gpu-training/protocol.json](../../../packages/gpu-training/protocol.json)
- [packages/gpu-training/runtime.json](../../../packages/gpu-training/runtime.json)
- [packages/gpu-training/tests/test_workload.py](../../../packages/gpu-training/tests/test_workload.py)
- [packages/gpu-training/results/observations.json](../../../packages/gpu-training/results/observations.json)
- [packages/gpu-training/results/profiler-trace.json](../../../packages/gpu-training/results/profiler-trace.json)
- [packages/gpu-training/README.md](../../../packages/gpu-training/README.md)

README: reproducción, protocolo y límites.
