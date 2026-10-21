# ISP: interfaces pequeñas según lo que necesita cada consumidor

Artículo español en draft. Pregunta: De qué operaciones necesita depender cada caso de uso.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/design-principles/src/application.ts](../../../packages/design-principles/src/application.ts)
- [packages/design-principles/src/adapters/memory.ts](../../../packages/design-principles/src/adapters/memory.ts)
- [packages/design-principles/src/type-examples.ts](../../../packages/design-principles/src/type-examples.ts)
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
