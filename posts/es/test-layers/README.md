# Unit, integration y E2E: elegir la frontera que puede detectar el fallo

Artículo español en draft. Pregunta: Qué parte del recorrido ejecuta cada test y qué dependencias quedan fuera.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/testing-strategy/src/http.ts](../../../packages/testing-strategy/src/http.ts)
- [packages/testing-strategy/src/sqlite.ts](../../../packages/testing-strategy/src/sqlite.ts)
- [packages/testing-strategy/tests/http.test.mjs](../../../packages/testing-strategy/tests/http.test.mjs)
- [packages/testing-strategy/tests/repositories.test.mjs](../../../packages/testing-strategy/tests/repositories.test.mjs)
- [packages/testing-strategy/evidence/verification.json](../../../packages/testing-strategy/evidence/verification.json)
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
