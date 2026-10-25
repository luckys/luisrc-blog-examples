# Gradient accumulation: sumar trabajo pequeño sin cambiar el batch que optimizas

Draft español. Cuándo varios microbatches reproducen un batch completo y cómo comprobarlo.

- [packages/training-dynamics/optimizers.py](../../../packages/training-dynamics/optimizers.py)
- [packages/training-dynamics/training.py](../../../packages/training-dynamics/training.py)
- [packages/training-dynamics/experiments.py](../../../packages/training-dynamics/experiments.py)
- [packages/training-dynamics/protocol.json](../../../packages/training-dynamics/protocol.json)
- [packages/training-dynamics/tests/test_optimizers.py](../../../packages/training-dynamics/tests/test_optimizers.py)
- [packages/training-dynamics/tests/test_training.py](../../../packages/training-dynamics/tests/test_training.py)
- [packages/training-dynamics/results/training.json](../../../packages/training-dynamics/results/training.json)
- [packages/training-dynamics/README.md](../../../packages/training-dynamics/README.md)
- [packages/neural-foundations/neural.py](../../../packages/neural-foundations/neural.py)

Ver el README del laboratorio para runtime, reproducción y límites.
