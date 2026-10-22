# Model-based testing: comprobar pagos después de cada evento

Artículo español en draft. Pregunta: Qué modelo pequeño permite distinguir un terminal estable de un efecto duplicado.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/property-testing/src/payment.ts](../../../packages/property-testing/src/payment.ts)
- [packages/property-testing/tests/sequence.mjs](../../../packages/property-testing/tests/sequence.mjs)
- [packages/property-testing/tests/properties.test.mjs](../../../packages/property-testing/tests/properties.test.mjs)
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
