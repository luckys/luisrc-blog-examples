# Quorum: qué garantiza R + W > N y qué no puedes deducir de esa fórmula

Artículo español en draft. Pregunta: Por qué se cruzan los conjuntos y qué supuestos faltan para leer un valor correcto.

El post mantiene los extractos explicados; aquí está el laboratorio completo.

## Archivos

- [packages/distributed-foundations/src/quorum.ts](../../../packages/distributed-foundations/src/quorum.ts)
- [packages/distributed-foundations/tests/quorum.test.mjs](../../../packages/distributed-foundations/tests/quorum.test.mjs)
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
