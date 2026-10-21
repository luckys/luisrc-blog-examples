# De monolito modular a microservicios: qué problema justifica pagar el coste

Artículo español en draft. Pregunta: Cuándo compensa desplegar una frontera por separado y qué garantías hay que rediseñar.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/architecture-boundaries/docs/decisions/0001-single-deployment.md](../../../packages/architecture-boundaries/docs/decisions/0001-single-deployment.md)
- [packages/architecture-boundaries/src/adapters/http-provider.ts](../../../packages/architecture-boundaries/src/adapters/http-provider.ts)
- [packages/architecture-boundaries/tests/http.test.mjs](../../../packages/architecture-boundaries/tests/http.test.mjs)
- [packages/architecture-boundaries/src/demo.ts](../../../packages/architecture-boundaries/src/demo.ts)
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
