# Consumer-driven contracts con Pact: verificar al proveedor sin fiarse del mock

Artículo español en draft. Pregunta: Cómo convertir una expectativa del cliente en un contrato verificado contra la API real.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/integration-contracts/tests/consumer.test.mjs](../../../packages/integration-contracts/tests/consumer.test.mjs)
- [packages/integration-contracts/tests/postgres.test.mjs](../../../packages/integration-contracts/tests/postgres.test.mjs)
- [packages/integration-contracts/src/consumer.ts](../../../packages/integration-contracts/src/consumer.ts)
- [packages/integration-contracts/contracts/ReceiptWidget-OrdersApi.json](../../../packages/integration-contracts/contracts/ReceiptWidget-OrdersApi.json)
- [packages/integration-contracts/evidence/verification.json](../../../packages/integration-contracts/evidence/verification.json)
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
