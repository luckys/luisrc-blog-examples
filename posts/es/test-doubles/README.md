# Test doubles: usar un fake sin confundirlo con la base de datos

Artículo español en draft. Pregunta: Qué aporta cada doble y cómo detectar que un fake ha dejado de respetar el contrato.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/testing-strategy/src/service.ts](../../../packages/testing-strategy/src/service.ts)
- [packages/testing-strategy/src/memory.ts](../../../packages/testing-strategy/src/memory.ts)
- [packages/testing-strategy/src/repository.ts](../../../packages/testing-strategy/src/repository.ts)
- [packages/testing-strategy/src/sqlite.ts](../../../packages/testing-strategy/src/sqlite.ts)
- [packages/testing-strategy/tests/service.test.mjs](../../../packages/testing-strategy/tests/service.test.mjs)
- [packages/testing-strategy/tests/repository-contract.mjs](../../../packages/testing-strategy/tests/repository-contract.mjs)
- [packages/testing-strategy/tests/repositories.test.mjs](../../../packages/testing-strategy/tests/repositories.test.mjs)
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
