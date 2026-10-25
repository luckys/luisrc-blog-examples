# Observability lab: React, HTTP and an asynchronous worker

Laboratorio P059: seis artículos españoles con extractos en el blog y código
completo aquí. No es una plantilla de producción.

## Requisitos y comandos

Node24.19.0, pnpm12.8.1, API OpenTelemetry1.10.0, SDKs3.0.0, React19.2.0,
esbuild0.25.10, TypeScript5.9.2, Playwright1.56.1. Versiones fijadas, no una
afirmación de que todas sean las últimas. Los imports corresponden al SDK3.

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @luisrc-examples/observability-lab test
pnpm --filter @luisrc-examples/observability-lab typecheck
pnpm --filter @luisrc-examples/observability-lab build:ui
pnpm --filter @luisrc-examples/observability-lab start
```

Abre la URL loopback con puerto libre impresa por start. Ctrl+C cierra API y worker.
Si falta Chromium, este paso opcional descarga el navegador de Playwright:

```bash
pnpm --filter @luisrc-examples/observability-lab exec playwright install chromium
```

Para repetir los cinco clics y sobrescribir evidencia y assets derivados:

```bash
pnpm --filter @luisrc-examples/observability-lab measure
pnpm --dir packages/observability-lab exec node scripts/build-public.mjs
```

measure construye React, arranca dos procesos, abre Chromium, pulsa cinco botones,
valida relaciones y cierra los hijos. Env mínimo sin secretos heredados, sin cloud.
Bundle y screenshots en .artifacts/ ignorado. Reutiliza Chromium ya instalado.

## Diseño

- web/app.tsx: spans UI y CLIENT, Context explícito y fetch same-origin.
- src/server.ts: extrae W3C traceparent, SERVER y PRODUCER, metadata por IPC.
- src/worker.ts: otro PID extrae contexto y procesa secuencialmente, CONSUMER.
- src/tracing.ts: SDK real, ParentBased, exporter JSON propio en memoria.
- src/logging.ts: allowlist de eventos, resultados e identidades de fixture.
- src/metrics.ts: histograma SDK; reservoir y serializador OpenMetrics propios.
- /state inspecciona el fixture. /metrics expone OpenMetrics1.0.
- /telemetry/browser es receptor JSON propio, no OTLP.

ok/fail:5spans/1traza; broken:5spans/2trazas sin conexión; link:5spans/2trazas
con link; unsampled:0spans y2logs/1medición. Total5jobs,4ok/1error,20spans,10logs.
202 significa aceptación, no finalización. La espera artificial20ms no mide capacidad.

## Evidencia

Nueve tests: ciclo de vida, W3C válido/inválido, sampling, allowlist, HTTP/IPC,
variantes, concurrencia/sensibles, agregación y exemplars. Esperan relaciones y
conteos, no velocidad de hardware. evidence/browser.json conserva cinco casos,
PIDs distintos, hashes antes/después, árboles, logs, histograma y referencias.
Cada exemplar final resuelve a un span archivado. measurements.json/signals.svg
derivan de ese archivo después de verificar fuentes. El visor no ejecuta servicios.
Checks cruzados en tests/editorial/observability-series.test.mjs; layout en el blog.

## Límites

- SDK metrics JS3.0.0 no exporta exemplars. Reservoir propio: última muestra sampled
  por bucket/resultado, máximo10. Sin selección uniforme, TTL o retención durable.
- Histograma acumulado, límites0.01/0.025/0.05/0.1s. Buckets internos no acumulativos;
  serializador OpenMetrics los acumula. Sin ingestión Prometheus verificada.
- Sin OTLP, Collector, Jaeger, Prometheus, Grafana o backend de consultas.
- Sin broker durable, Outbox, DB, retry, idempotencia, TLS, auth, CORS cross-origin,
  crash recovery o despliegue. 202 no garantiza persistencia.
- Context explícito del navegador; no instrumentación general React, Zone.js o Web Vitals.
- Sin tail sampling ejecutado. ParentBased confía en contexto recibido del fixture;
  una API pública requiere decidir confianza y límites propios.
- Solo inspección loopback. Máximo100jobs/500spans browser, memoria volátil.
  No exponer públicamente este servidor; /state y receptor no tienen autenticación.
- Logs sin timestamp/nivel/transporte de producción. IDs secuenciales de fixture.
  No bodies/headers completos archivados; no auditoría universal de datos sensibles.
- No sumar spans para latencia de negocio ni confundir duración con CPU.
  Misma máquina, sin validación de relojes entre hosts. No benchmark.
- Sin audio, traducción o publicación. Datos ficticios y archivados.
