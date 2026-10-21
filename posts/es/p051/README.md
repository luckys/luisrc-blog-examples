# Kafka y el log retenido: leer un evento no lo elimina

Artículo español en draft. Pregunta: Qué conserva un topic y cuándo deja de ser posible releer el historial.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/kafka-streaming/scripts/broker.mjs](../../../packages/kafka-streaming/scripts/broker.mjs)
- [packages/kafka-streaming/src/client.ts](../../../packages/kafka-streaming/src/client.ts)
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
