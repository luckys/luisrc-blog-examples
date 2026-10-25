# Logs estructurados: qué identifica una petición y qué identifica una operación

Artículo español en draft. Pregunta: Cómo registrar hechos útiles sin confundir trace, request y operación.

Los extractos explicados permanecen en el post. Código completo:

- [src/logging.ts](../../../packages/observability-lab/src/logging.ts)
- [tests/core.test.mjs](../../../packages/observability-lab/tests/core.test.mjs)
- [tests/http.test.mjs](../../../packages/observability-lab/tests/http.test.mjs)
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
