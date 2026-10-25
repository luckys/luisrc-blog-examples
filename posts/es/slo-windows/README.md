# Ventanas de un SLO: qué cambia entre rolling, calendario y datos que faltan

Artículo español en draft. Pregunta: Cómo elegir fronteras de evaluación y distinguir tráfico cero de telemetría incompleta.

Extractos explicados en el post, laboratorio completo aquí:

- [src/windows.ts](../../../packages/service-objectives/src/windows.ts)
- [tests/alerts.test.mjs](../../../packages/service-objectives/tests/alerts.test.mjs)
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
