# Domain services: dónde colocar una regla que no pertenece a una entidad

Fragmentos explicados dentro del post; laboratorio completo en estos archivos:

- [packages/domain-design/src/return-policy.ts](../../../packages/domain-design/src/return-policy.ts)
- [packages/domain-design/src/return-boundary.ts](../../../packages/domain-design/src/return-boundary.ts)
- [packages/domain-design/tests/concepts.test.mjs](../../../packages/domain-design/tests/concepts.test.mjs)
- [packages/domain-design/README.md](../../../packages/domain-design/README.md)

Desde la raíz: `pnpm install --frozen-lockfile` y `pnpm --dir packages/domain-design test`.

Fixture en memoria; diseño SQL y proveedor no desplegados.
