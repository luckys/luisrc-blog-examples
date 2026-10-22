# Testcontainers con PostgreSQL: que la prueba controle su dependencia

Artículo español en draft. Pregunta: Quién arranca, espera y limpia el PostgreSQL real que utiliza el test.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/integration-contracts/tests/database-fixture.mjs](../../../packages/integration-contracts/tests/database-fixture.mjs)
- [packages/integration-contracts/tests/postgres.test.mjs](../../../packages/integration-contracts/tests/postgres.test.mjs)
- [packages/integration-contracts/scripts/verify.mjs](../../../packages/integration-contracts/scripts/verify.mjs)
- [packages/integration-contracts/sql/001_orders.sql](../../../packages/integration-contracts/sql/001_orders.sql)
- [packages/integration-contracts/README.md](../../../packages/integration-contracts/README.md)

## Ejecutar

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/integration-contracts test
pnpm --dir packages/integration-contracts test:integration
pnpm --dir packages/integration-contracts typecheck
```

Ver límites en el README del paquete: PostgreSQL real, HTTP loopback y Pact local.
Sin Pact Broker, publicación, CI desplegada o UI E2E. Ver requisitos Docker.
