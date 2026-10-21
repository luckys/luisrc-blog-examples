# Consumer lag y backpressure: que Kafka guarde el trabajo no aumenta tu capacidad

Artículo español en draft. Pregunta: Qué mide el lag y cómo limitar el avance sin crear una cola infinita dentro del proceso.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/kafka-streaming/src/offsets.ts](../../../packages/kafka-streaming/src/offsets.ts)
- [packages/kafka-streaming/src/collect.ts](../../../packages/kafka-streaming/src/collect.ts)
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
