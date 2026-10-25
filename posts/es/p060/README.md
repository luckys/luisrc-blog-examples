# Definir un SLI: qué cuenta como una respuesta buena y qué entra en el denominador

Artículo español en draft. Pregunta: Cómo definir disponibilidad y latencia sin confundir un status HTTP con un resultado correcto.

Extractos explicados en el post, laboratorio completo aquí:

- [src/sli.ts](../../../packages/service-objectives/src/sli.ts)
- [src/fixtures.ts](../../../packages/service-objectives/src/fixtures.ts)
- [tests/sli.test.mjs](../../../packages/service-objectives/tests/sli.test.mjs)
- [spec/objectives.json](../../../packages/service-objectives/spec/objectives.json)
- [README.md](../../../packages/service-objectives/README.md)

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @luisrc-examples/service-objectives test
pnpm --filter @luisrc-examples/service-objectives verify
```

Datos simulados, no tráfico real. Ver README para límites: sin endpoint desplegado,
Prometheus, notificaciones, calendario civil o política aplicada automáticamente.
