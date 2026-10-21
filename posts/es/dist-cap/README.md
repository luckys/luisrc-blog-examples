# CAP y PACELC: describir qué deja de garantizar una operación cuando falla la red

Artículo español en draft. Pregunta: Qué respuesta puede dar una réplica aislada y dónde aparece el coste de coordinación.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/distributed-foundations/src/replication.ts](../../../packages/distributed-foundations/src/replication.ts)
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
