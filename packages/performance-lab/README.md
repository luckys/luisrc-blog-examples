# Medir rendimiento: carga, benchmarks y profiling

Laboratorio de siete drafts españoles, ampliación de P058. Node24.19.0,
TypeScript5.9.2 estricto en src; glue/tests MJS validados por ejecución. k6 2.3.0
oficial fijado, Linux x64. No cloud, claves, proveedores, bases de datos o datos reales.

## Comprobación rápida con evidencia archivada

Desde la raíz del monorepo:

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/performance-lab test
pnpm --dir packages/performance-lab typecheck
pnpm --dir packages/performance-lab verify
```

Diez tests: distribuciones/histogramas, equivalencia, duplicados, caché, HTTP real,
admisión, lector de heap y ventanas. verify recalcula distribuciones y comprueba
hashes de fuentes/artefactos. No regenera tiempos ni ejecuta k6 por defecto.

## Regenerar mediciones de forma explícita

```bash
pnpm --dir packages/performance-lab tools:install
pnpm --dir packages/performance-lab measure:load
pnpm --dir packages/performance-lab measure:profiles
pnpm --dir packages/performance-lab exec node scripts/build-public.mjs
pnpm --dir packages/performance-lab verify
```

tools:install descarga solo el tar.gz oficial de GitHub, verifica SHA-256 y extrae
un miembro conocido a .tools/, sin instalación global. Solo Linux x64/tar. Archivo:
k6-v2.3.0-linux-amd64.tar.gz, SHA-256
39c3117b6af817592dcd0ce4242105c0a7af10948c2a425306f0be8f7a8a8ab1.
No es una dependencia npm de terceros ni se ejecuta al hacer pnpm install.
Licencia del binario: consultar upstream grafana/k6; no se redistribuye en Git.

measure:load tarda aproximadamente un minuto y medio. Crea un proceso Node
propio en loopback y siete procesos k6 secuenciales; tasa máxima400, duración
máxima60s y máximo100VUs. Env mínimo, sin proxies/herencia de credenciales,
usage report y resolución automática de extensiones desactivados. Un request
por iteración, sin redirects, timeout2s. Cierre explícito y kill solo del hijo
propio ante timeout. No dirigir el script a un dominio ajeno: lo rechaza.

- closed4 y open100, ventanas5s, sin errores en el registro archivado.
- open350 dos veces,5s cada una: rechazos reales, sin dropped iterations.
- recovery25,4s: vuelve a aceptar sin errores.
- generator-starved:100/s,1VU,3s; descartes del generador sin HTTP fallidos.
- steady25,60s: carga sostenida corta, no soak de horas.

El servidor acepta8 trabajos concurrentes y espera40ms artificiales. Sin cola,
SQL/TLS, hardware aislado o capacidad de producción. maxActiveObserved es máximo
acumulado del fixture, no pico independiente de cada fase. Throughput usa duración
de k6; wallSeconds además incluye arranque/cierre del proceso de herramienta.

measure:profiles crea procesos separados con entorno mínimo y datos ficticios.
Dataset5000/1000; tres procesos con3 warm-ups y7 muestras/variante, orden alterno.
Map construido dentro de la llamada medida. Sin profiler durante el benchmark.
CPU:100 trabajos, Session local,1000μs; normal lento/indexado y diagnóstico con
no-turbo-inlining separado. No usar sus tiempos como benchmark normal. El perfil
normal lento conservó atribución anónima; el diagnóstico muestra findRateSlow.

Memoria: seis snapshots V8, GC forzado, cachés ilimitada/acotada, caminos desde
LabCache y retirada de referencia. No dominadores o retained size; self_size
no suma payloads. Raw heaps quedan en .artifacts/ ignorados: pueden contener
información sensible si se adapta el ejemplo. No capturar producción con este script.
Las métricas globales de memoria pueden reflejar el propio trabajo de diagnóstico.

## Artículos y fuentes

- P058: src/statistics.ts y tests/core.test.mjs.
- PERF-MODELS: k6/load.js, scripts/measure-load.mjs y scripts/install-k6.mjs.
- PERF-SATURATION: src/server.ts, tests/http.test.mjs, evidence/load.json.
- PERF-SOAK: src/windows.ts, tests/profiles.test.mjs, fase steady-60s.
- PERF-BENCH: src/workload.ts, scripts/benchmark-child.mjs.
- PERF-CPU: scripts/cpu-child.mjs y evidence/profiles/*.cpuprofile.
- PERF-MEMORY: src/cache.ts, scripts/memory-child.mjs, scripts/heap-reader.mjs.

extractos explicados dentro de los posts; índices en posts/es/perf-* y p058.
measurements.json y dos SVG se derivan de evidencia, no de tiempos inventados.
explorer.html/mjs solo leen el JSON archivado, no generan tráfico. Tras regenerar,
actualizar cifras de los artículos, sincronizar assets y volver a revisar el sitio.
Los hashes se capturan antes/después de cada campaña para detectar cambios de fuentes.

No interpretar artículo existente o tests verdes como aceptación completa de P058
o Serie06. Sin soak prolongado, profiling de toda la transacción HTTP/SQL o SLO de
producción. El fixture de espera y el cálculo de CPU son experimentos separados.
