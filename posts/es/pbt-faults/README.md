# Fault injection: perder la respuesta sin duplicar el efecto

Artículo español en draft. Pregunta: Qué ocurre al fallar antes o después del efecto y reintentar con una clave estable.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/property-testing/src/recovery.ts](../../../packages/property-testing/src/recovery.ts)
- [packages/property-testing/tests/recovery-fixture.mjs](../../../packages/property-testing/tests/recovery-fixture.mjs)
- [packages/property-testing/tests/boundaries.test.mjs](../../../packages/property-testing/tests/boundaries.test.mjs)
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
