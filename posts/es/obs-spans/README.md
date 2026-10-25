# Spans con OpenTelemetry: delimitar trabajo sin convertir cada función en una traza

Artículo español en draft. Pregunta: Qué mide un span y cómo conservar su árbol, estado y cierre.

Los extractos explicados permanecen en el post. Código completo:

- [src/tracing.ts](../../../packages/observability-lab/src/tracing.ts)
- [src/worker.ts](../../../packages/observability-lab/src/worker.ts)
- [tests/core.test.mjs](../../../packages/observability-lab/tests/core.test.mjs)
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
