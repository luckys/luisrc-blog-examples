# Autograd en PyTorch: qué calcula backward y qué puede cortar el grafo

Draft español. Cómo verificar leaf, acumulación, detach, valores guardados y un producto vector-Jacobiano.

- [autodiff-foundations/manual.py](../../../packages/autodiff-foundations/manual.py)
- [autodiff-foundations/framework.py](../../../packages/autodiff-foundations/framework.py)
- [autodiff-foundations/protocol.json](../../../packages/autodiff-foundations/protocol.json)
- [autodiff-foundations/tests/test_manual.py](../../../packages/autodiff-foundations/tests/test_manual.py)
- [autodiff-foundations/tests/test_torch.py](../../../packages/autodiff-foundations/tests/test_torch.py)
- [autodiff-foundations/results/gradients.json](../../../packages/autodiff-foundations/results/gradients.json)
- [autodiff-foundations/README.md](../../../packages/autodiff-foundations/README.md)
- [neural-foundations/neural.py](../../../packages/neural-foundations/neural.py)
- [neural-foundations/results/training.json](../../../packages/neural-foundations/results/training.json)

Desde la raíz:

```bash
pnpm --dir packages/autodiff-foundations runtime:fetch
pnpm --dir packages/autodiff-foundations test:container
pnpm --dir packages/autodiff-foundations exercise
pnpm --dir packages/autodiff-foundations verify
pnpm --dir packages/autodiff-foundations test
pnpm --dir packages/autodiff-foundations render
```

PyTorch CPU por digest, datos sintéticos. Ver README para versión, tolerancias y límites.
