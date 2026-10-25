# Sampling de trazas: qué desaparece cuando no guardas todos los spans

Artículo español en draft. Pregunta: Qué conserva el contexto no muestreado y qué no puede recuperar un sampler posterior.

Los extractos explicados permanecen en el post. Código completo:

- [src/tracing.ts](../../../packages/observability-lab/src/tracing.ts)
- [web/app.tsx](../../../packages/observability-lab/web/app.tsx)
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
