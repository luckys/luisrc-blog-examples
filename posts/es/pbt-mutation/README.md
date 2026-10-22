# Mutation testing de propiedades: mil ejemplos no arreglan una regla incompleta

Artículo español en draft. Pregunta: Qué errores deliberados detecta el oráculo y cuáles deja pasar.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/property-testing/tests/mutations.test.mjs](../../../packages/property-testing/tests/mutations.test.mjs)
- [packages/property-testing/src/payment.ts](../../../packages/property-testing/src/payment.ts)
- [packages/property-testing/src/recovery.ts](../../../packages/property-testing/src/recovery.ts)
- [packages/property-testing/scripts/verify.mjs](../../../packages/property-testing/scripts/verify.mjs)
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
