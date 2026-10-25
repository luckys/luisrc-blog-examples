# Exemplars: abrir una traza desde un histograma sin crear una serie por petición

Artículo español en draft. Pregunta: Cómo conectar una muestra con su span y qué soporte exige cada tramo de exportación.

Los extractos explicados permanecen en el post. Código completo:

- [src/metrics.ts](../../../packages/observability-lab/src/metrics.ts)
- [tests/metrics.test.mjs](../../../packages/observability-lab/tests/metrics.test.mjs)
- [explorer.html](../../../packages/observability-lab/explorer.html)
- [explorer.mjs](../../../packages/observability-lab/explorer.mjs)
- [measurements.json](../../../packages/observability-lab/measurements.json)
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
