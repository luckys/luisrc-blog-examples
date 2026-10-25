# Un training loop en PyTorch: qué cambia en zero_grad, backward y step

Draft español. Cómo implementar un loop propio sin mezclar derivación, actualización y métricas.

- [packages/pytorch-training/pipeline.py](../../../packages/pytorch-training/pipeline.py)
- [packages/pytorch-training/checkpoints.py](../../../packages/pytorch-training/checkpoints.py)
- [packages/pytorch-training/probes.py](../../../packages/pytorch-training/probes.py)
- [packages/pytorch-training/experiments.py](../../../packages/pytorch-training/experiments.py)
- [packages/pytorch-training/protocol.json](../../../packages/pytorch-training/protocol.json)
- [packages/pytorch-training/tests/test_pipeline.py](../../../packages/pytorch-training/tests/test_pipeline.py)
- [packages/pytorch-training/tests/test_contracts.py](../../../packages/pytorch-training/tests/test_contracts.py)
- [packages/pytorch-training/results/training.json](../../../packages/pytorch-training/results/training.json)
- [packages/pytorch-training/README.md](../../../packages/pytorch-training/README.md)
- [packages/neural-foundations/neural.py](../../../packages/neural-foundations/neural.py)

Ver README del laboratorio para reproducción,runtime,archivos temporales ylímites.
