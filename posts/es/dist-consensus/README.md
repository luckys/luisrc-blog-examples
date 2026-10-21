# Consenso y Raft: elegir un líder no basta para confirmar un cambio

Artículo español en draft. Pregunta: Cómo term, voto y estado conservado limitan una elección, sin implementar todo Raft.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/distributed-foundations/src/voting.ts](../../../packages/distributed-foundations/src/voting.ts)
- [packages/distributed-foundations/tests/voting.test.mjs](../../../packages/distributed-foundations/tests/voting.test.mjs)
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
