# Replicación y consistencia: por qué una escritura confirmada todavía puede no verse

Artículo español en draft. Pregunta: Qué observamos al confirmar en una réplica antes de propagar el cambio a otra.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/distributed-foundations/src/replication.ts](../../../packages/distributed-foundations/src/replication.ts)
- [packages/distributed-foundations/src/demo.ts](../../../packages/distributed-foundations/src/demo.ts)
- [packages/distributed-foundations/tests/replication.test.mjs](../../../packages/distributed-foundations/tests/replication.test.mjs)
- [packages/distributed-foundations/README.md](../../../packages/distributed-foundations/README.md)

## Ejecutar

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/distributed-foundations test
pnpm --dir packages/distributed-foundations typecheck
```

Solo modelos locales. Sin red, disco, clúster o datos reales. Ver límites
en el README del paquete; los tipos no son autorización o pruebas de durabilidad.
