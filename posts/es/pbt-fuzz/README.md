# Fuzzing de un parser: combinar bytes extraños con entradas que sí llegan al negocio

Artículo español en draft. Pregunta: Qué comprueba el ruido y qué necesita un generador estructurado.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/property-testing/src/parser.ts](../../../packages/property-testing/src/parser.ts)
- [packages/property-testing/src/money.ts](../../../packages/property-testing/src/money.ts)
- [packages/property-testing/tests/boundaries.test.mjs](../../../packages/property-testing/tests/boundaries.test.mjs)
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
