# Fixtures y factories: datos de prueba que explican el escenario

Artículo español en draft. Pregunta: Cómo preparar valores válidos sin esconder identidad, tiempo y condiciones relevantes.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/integration-contracts/src/fixtures.ts](../../../packages/integration-contracts/src/fixtures.ts)
- [packages/integration-contracts/tests/core.test.mjs](../../../packages/integration-contracts/tests/core.test.mjs)
- [packages/integration-contracts/tests/database-fixture.mjs](../../../packages/integration-contracts/tests/database-fixture.mjs)
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
