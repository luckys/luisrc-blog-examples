# Arquitectura hexagonal: cambiar el adaptador sin cambiar el caso de uso

Artículo español en draft. Pregunta: Qué conversación define un puerto y qué detalles traduce cada adaptador.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/architecture-boundaries/src/modules/shipping/ports.ts](../../../packages/architecture-boundaries/src/modules/shipping/ports.ts)
- [packages/architecture-boundaries/src/modules/shipping/application.ts](../../../packages/architecture-boundaries/src/modules/shipping/application.ts)
- [packages/architecture-boundaries/src/adapters/fixture-provider.ts](../../../packages/architecture-boundaries/src/adapters/fixture-provider.ts)
- [packages/architecture-boundaries/src/adapters/http-provider.ts](../../../packages/architecture-boundaries/src/adapters/http-provider.ts)
- [packages/architecture-boundaries/tests/http.test.mjs](../../../packages/architecture-boundaries/tests/http.test.mjs)
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
