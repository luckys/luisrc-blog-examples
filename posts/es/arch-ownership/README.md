# Monolito modular: quién puede cambiar los datos y por dónde se entra a un módulo

Artículo español en draft. Pregunta: Cómo mantener ownership y contratos públicos sin introducir llamadas de red entre módulos.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/architecture-boundaries/src/modules/shipping/public.ts](../../../packages/architecture-boundaries/src/modules/shipping/public.ts)
- [packages/architecture-boundaries/src/adapters/ledger.ts](../../../packages/architecture-boundaries/src/adapters/ledger.ts)
- [packages/architecture-boundaries/src/modules/reporting/public.ts](../../../packages/architecture-boundaries/src/modules/reporting/public.ts)
- [packages/architecture-boundaries/scripts/check-boundaries.mjs](../../../packages/architecture-boundaries/scripts/check-boundaries.mjs)
- [packages/architecture-boundaries/tests/boundaries.test.mjs](../../../packages/architecture-boundaries/tests/boundaries.test.mjs)
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
