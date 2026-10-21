# Sharding: elegir una clave también decide qué consultas y cambios serán difíciles

Artículo español en draft. Pregunta: Cómo repartir claves sin confundir un nuevo mapa de rutas con una migración de datos.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/distributed-foundations/src/routing.ts](../../../packages/distributed-foundations/src/routing.ts)
- [packages/distributed-foundations/src/demo.ts](../../../packages/distributed-foundations/src/demo.ts)
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
