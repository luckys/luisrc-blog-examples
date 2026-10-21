# LSP: tener la misma firma no garantiza el mismo contrato

Artículo español en draft. Pregunta: Qué debe conservar una implementación para poder sustituir a otra.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/design-principles/src/rates.ts](../../../packages/design-principles/src/rates.ts)
- [packages/design-principles/src/type-examples.ts](../../../packages/design-principles/src/type-examples.ts)
- [packages/design-principles/tests/rate-contract.mjs](../../../packages/design-principles/tests/rate-contract.mjs)
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
