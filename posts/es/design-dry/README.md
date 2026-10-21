# DRY: cuándo dos fragmentos repiten una regla y cuándo solo se parecen

Artículo español en draft. Pregunta: Qué conocimiento necesita una fuente única y qué políticas deben evolucionar separadas.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/design-principles/src/eligibility.ts](../../../packages/design-principles/src/eligibility.ts)
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
