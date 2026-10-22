# Shrinking y replay: convertir una secuencia aleatoria en una regresión pequeña

Artículo español en draft. Pregunta: Cómo reducir y repetir el fallo sin depender de la suerte.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/property-testing/tests/search.test.mjs](../../../packages/property-testing/tests/search.test.mjs)
- [packages/property-testing/tests/search-fixture.mjs](../../../packages/property-testing/tests/search-fixture.mjs)
- [packages/property-testing/tests/sequence.mjs](../../../packages/property-testing/tests/sequence.mjs)
- [packages/property-testing/src/payment.ts](../../../packages/property-testing/src/payment.ts)
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
