# Consumer groups en Kafka: repartir particiones no es repartir efectos una sola vez

Artículo español en draft. Pregunta: Cómo cambia la asignación al entrar o salir un miembro del grupo.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

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
