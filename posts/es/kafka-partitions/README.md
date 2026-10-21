# Particiones y claves en Kafka: el orden que necesitas tiene un ámbito

Artículo español en draft. Pregunta: Qué orden preservamos por envío y qué puede romperlo aunque el broker ordene su log.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/kafka-streaming/src/client.ts](../../../packages/kafka-streaming/src/client.ts)
- [packages/kafka-streaming/src/fixtures.ts](../../../packages/kafka-streaming/src/fixtures.ts)
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
