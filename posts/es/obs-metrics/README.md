# Métricas con OpenTelemetry: histogramas agregables y labels con límites

Artículo español en draft. Pregunta: Cómo agregar observaciones sin multiplicar series por cada identidad.

Los extractos explicados permanecen en el post. Código completo:

- [src/metrics.ts](../../../packages/observability-lab/src/metrics.ts)
- [src/worker.ts](../../../packages/observability-lab/src/worker.ts)
- [tests/metrics.test.mjs](../../../packages/observability-lab/tests/metrics.test.mjs)
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
