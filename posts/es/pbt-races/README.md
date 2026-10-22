# Race conditions con fast-check: controlar el orden en vez de añadir sleeps

Artículo español en draft. Pregunta: Cómo reproducir una actualización perdida controlando promesas.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/property-testing/src/concurrency.ts](../../../packages/property-testing/src/concurrency.ts)
- [packages/property-testing/tests/search.test.mjs](../../../packages/property-testing/tests/search.test.mjs)
- [packages/property-testing/evidence/verification.json](../../../packages/property-testing/evidence/verification.json)
- [packages/property-testing/README.md](../../../packages/property-testing/README.md)

## Ejecutar

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/property-testing test
pnpm --dir packages/property-testing verify
pnpm --dir packages/property-testing typecheck
```

Ver límites en el README del paquete: generación, shrinking y scheduler locales.
Sin red, SQL, crash de proceso real o motor automático de mutaciones.
