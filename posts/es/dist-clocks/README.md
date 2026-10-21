# Relojes lógicos de Lamport: ordenar eventos sin confundir una hora con una causa

Artículo español en draft. Pregunta: Qué sabemos de un mensaje con un contador lógico y qué no dice ese número.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/distributed-foundations/src/clock.ts](../../../packages/distributed-foundations/src/clock.ts)
- [packages/distributed-foundations/tests/clock-routing.test.mjs](../../../packages/distributed-foundations/tests/clock-routing.test.mjs)
- [packages/distributed-foundations/README.md](../../../packages/distributed-foundations/README.md)

## Ejecutar

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/distributed-foundations test
pnpm --dir packages/distributed-foundations typecheck
```

Solo modelos locales. Sin red, disco, clúster o datos reales. Ver límites
en el README del paquete; los tipos no son autorización o pruebas de durabilidad.
