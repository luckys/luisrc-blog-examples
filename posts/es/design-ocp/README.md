# OCP y composición: añadir una variación sin reescribir la regla base

Artículo español en draft. Pregunta: Qué variación real justifica un punto de extensión y qué sigue cambiando.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/design-principles/src/rates.ts](../../../packages/design-principles/src/rates.ts)
- [packages/design-principles/tests/principles.test.mjs](../../../packages/design-principles/tests/principles.test.mjs)
- [packages/design-principles/README.md](../../../packages/design-principles/README.md)

## Ejecutar

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/design-principles test
pnpm --dir packages/design-principles typecheck
```

Solo fixtures locales. Sin SQL, proveedor, cuentas o datos reales. Ver límites
en el README del paquete; los tipos no son autorización o pruebas de durabilidad.
