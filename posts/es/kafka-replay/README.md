# Offsets, commits y replay: reconstruir una proyección sin repetir sus efectos

Artículo español en draft. Pregunta: Qué posición confirmamos y cómo reconstruimos estado con un grupo nuevo.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/kafka-streaming/src/offsets.ts](../../../packages/kafka-streaming/src/offsets.ts)
- [packages/kafka-streaming/src/projection.ts](../../../packages/kafka-streaming/src/projection.ts)
- [packages/kafka-streaming/src/collect.ts](../../../packages/kafka-streaming/src/collect.ts)
- [packages/kafka-streaming/tests/core.test.mjs](../../../packages/kafka-streaming/tests/core.test.mjs)
- [packages/kafka-streaming/tests/broker.test.mjs](../../../packages/kafka-streaming/tests/broker.test.mjs)
- [packages/kafka-streaming/README.md](../../../packages/kafka-streaming/README.md)

## Ejecutar

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/kafka-streaming test
pnpm --dir packages/kafka-streaming typecheck
```

Broker real local, datos ficticios y topología de un nodo. Ver límites
en el README del paquete; los tipos no son autorización o pruebas de durabilidad.
