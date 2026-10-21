# CQRS: separar el modelo de lectura no obliga a separar servicios

Artículo español en draft. Pregunta: Qué gana una representación de lectura distinta y cuándo puede quedar desactualizada.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/architecture-boundaries/src/modules/reporting/internal/projection.ts](../../../packages/architecture-boundaries/src/modules/reporting/internal/projection.ts)
- [packages/architecture-boundaries/src/adapters/ledger.ts](../../../packages/architecture-boundaries/src/adapters/ledger.ts)
- [packages/architecture-boundaries/src/demo.ts](../../../packages/architecture-boundaries/src/demo.ts)
- [packages/architecture-boundaries/tests/application.test.mjs](../../../packages/architecture-boundaries/tests/application.test.mjs)
- [packages/architecture-boundaries/README.md](../../../packages/architecture-boundaries/README.md)

## Ejecutar

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/architecture-boundaries test
pnpm --dir packages/architecture-boundaries typecheck
```

Solo fixtures locales. Sin SQL, proveedor comercial, cuentas o datos reales. Ver límites
en el README del paquete; los tipos no son autorización o pruebas de durabilidad.
