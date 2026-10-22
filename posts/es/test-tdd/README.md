# TDD con una máquina de estados: del primer rojo a una regla que se puede cambiar

Artículo español en draft. Pregunta: Qué enseña cada paso de red-green-refactor y qué no demuestra un import ausente.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/testing-strategy/tests/core.test.mjs](../../../packages/testing-strategy/tests/core.test.mjs)
- [packages/testing-strategy/src/transitions.ts](../../../packages/testing-strategy/src/transitions.ts)
- [packages/testing-strategy/src/machine.ts](../../../packages/testing-strategy/src/machine.ts)
- [packages/testing-strategy/README.md](../../../packages/testing-strategy/README.md)

## Ejecutar

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/testing-strategy test
pnpm --dir packages/testing-strategy test:integration
pnpm --dir packages/testing-strategy typecheck
```

Ver límites en el README del paquete: fake Map, SQLite real y HTTP loopback.
Sin UI E2E o PostgreSQL. Coverage y mutaciones se ejecutan aparte.
