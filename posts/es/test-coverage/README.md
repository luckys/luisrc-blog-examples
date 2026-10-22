# Coverage al 100 % y errores sin detectar: comprobar la fuerza de las aserciones

Artículo español en draft. Pregunta: Cómo distinguir ejecutar una línea de detectar una regresión en esa línea.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/testing-strategy/tests/weak.test.mjs](../../../packages/testing-strategy/tests/weak.test.mjs)
- [packages/testing-strategy/tests/core.test.mjs](../../../packages/testing-strategy/tests/core.test.mjs)
- [packages/testing-strategy/scripts/mutate.mjs](../../../packages/testing-strategy/scripts/mutate.mjs)
- [packages/testing-strategy/scripts/verify.mjs](../../../packages/testing-strategy/scripts/verify.mjs)
- [packages/testing-strategy/evidence/mutations.json](../../../packages/testing-strategy/evidence/mutations.json)
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
