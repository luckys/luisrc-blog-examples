# Representaciones aprendidas: qué significa que una red pueda aproximar una función

Draft español. Cómo interpretar features ocultas y separar representabilidad, optimización y generalización.

- [neural.py](../../../packages/neural-foundations/neural.py)
- [protocol.json](../../../packages/neural-foundations/protocol.json)
- [experiments.py](../../../packages/neural-foundations/experiments.py)
- [tests/test_neural.py](../../../packages/neural-foundations/tests/test_neural.py)
- [results/training.json](../../../packages/neural-foundations/results/training.json)
- [README.md](../../../packages/neural-foundations/README.md)

Desde la raíz:

```bash
pnpm --dir packages/neural-foundations test:container
pnpm --dir packages/neural-foundations exercise
pnpm --dir packages/neural-foundations verify
pnpm --dir packages/neural-foundations test
pnpm --dir packages/neural-foundations render
```

Requiere Docker y la image fijada en runtime.json. No instala paquetes Python en host,
usa datos sintéticos y no requiere credenciales. Ver límites y tolerancias en README.
