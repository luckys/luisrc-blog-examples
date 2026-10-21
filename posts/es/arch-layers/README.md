# Capas y Clean Architecture: la dirección de los imports importa más que los nombres

Artículo español en draft. Pregunta: Qué decisiones quedan dentro y cómo detectamos dependencias que cruzan en sentido contrario.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/architecture-boundaries/src/modules/shipping/domain.ts](../../../packages/architecture-boundaries/src/modules/shipping/domain.ts)
- [packages/architecture-boundaries/src/modules/shipping/ports.ts](../../../packages/architecture-boundaries/src/modules/shipping/ports.ts)
- [packages/architecture-boundaries/src/modules/shipping/application.ts](../../../packages/architecture-boundaries/src/modules/shipping/application.ts)
- [packages/architecture-boundaries/scripts/check-boundaries.mjs](../../../packages/architecture-boundaries/scripts/check-boundaries.mjs)
- [packages/architecture-boundaries/tests/boundaries.test.mjs](../../../packages/architecture-boundaries/tests/boundaries.test.mjs)
- [packages/architecture-boundaries/README.md](../../../packages/architecture-boundaries/README.md)

## Ejecutar

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/architecture-boundaries test
pnpm --dir packages/architecture-boundaries typecheck
```

Solo fixtures locales. Sin SQL, proveedor comercial, cuentas o datos reales. Ver límites
en el README del paquete; los tipos no son autorización o pruebas de durabilidad.
