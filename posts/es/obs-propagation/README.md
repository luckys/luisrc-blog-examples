# Propagar una traza desde React hasta un worker en otro proceso

Artículo español en draft. Pregunta: Cómo serializar y reconstruir contexto al cruzar HTTP y un mensaje asíncrono.

Los extractos explicados permanecen en el post. Código completo:

- [web/app.tsx](../../../packages/observability-lab/web/app.tsx)
- [src/server.ts](../../../packages/observability-lab/src/server.ts)
- [src/worker.ts](../../../packages/observability-lab/src/worker.ts)
- [src/tracing.ts](../../../packages/observability-lab/src/tracing.ts)
- [scripts/measure.mjs](../../../packages/observability-lab/scripts/measure.mjs)
- [evidence/browser.json](../../../packages/observability-lab/evidence/browser.json)
- [README.md](../../../packages/observability-lab/README.md)

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @luisrc-examples/observability-lab test
pnpm --filter @luisrc-examples/observability-lab typecheck
```

Ver README del paquete para React/Chromium y límites: HTTP/IPC local, memoria volátil,
sin broker durable, OTLP, Collector o backend. Exemplars mediante reservoir propio.
