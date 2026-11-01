# luisrc-blog-examples

Monorepo de ejemplos ejecutables de [luisrc.pages.dev](https://luisrc.pages.dev/).
Los artículos viven en [luckys/luisrc](https://github.com/luckys/luisrc); los
laboratorios, fixtures, pruebas y resultados originales se mantienen aquí.
Solo contienen datos ficticios. No son aplicaciones listas para producción.

## Encontrar el código de un post

El [índice por artículo](posts/README.md) relaciona 383 posts con sus archivos y
laboratorios. Cada entrada en `posts/<locale>/<id>/README.md` enlaza las fuentes
correspondientes. Los laboratorios compartidos viven una sola vez en `packages/`:
dividir un tema en varios artículos no duplica su implementación.

Los borradores también aparecen en el índice. Su página del blog no estará
disponible públicamente hasta que se aprueben y publiquen.

## Instalación

Usa **Node.js 24.19.0 o posterior** y **pnpm 12.8.1**. Todas las instalaciones de
dependencias se hacen con pnpm, desde la raíz del monorepo:

```bash
git clone git@github.com:luckys/luisrc-blog-examples.git
cd luisrc-blog-examples
pnpm install --frozen-lockfile
pnpm test
pnpm test:labs
```

Hay un único `pnpm-workspace.yaml` y un único `pnpm-lock.yaml`. No ejecutes
instalaciones independientes en cada laboratorio. `pnpm test` comprueba la
estructura, índices y conservación de fuentes; `pnpm test:labs` ejecuta los tests
locales de Node y Python estándar, sin iniciar Docker ni instalar navegadores.

## Laboratorios

El paquete [kubernetes-workloads](packages/kubernetes-workloads/README.md) observa
Pods, versiones, rutas, probes, configuración, RBAC, OOM y HPA reales sobre K3s.
Once drafts complementan el bloque Terraform de P065.

El paquete [declarative-infrastructure](packages/declarative-infrastructure/README.md)
usa Terraform y K3s reales para seis recursos propios, drift, state, planes
obsoletos, reemplazo y teardown. Bloque Terraform de P065, complementado por kubernetes-workloads.

El paquete [aws-foundations](packages/aws-foundations/README.md) acompaña once drafts
de P064: contratos locales, tarifas públicas, gráfico y comparador de subtotales.
No despliega en AWS ni demuestra capacidad o facturación reales.

El paquete [progressive-delivery](packages/progressive-delivery/README.md) ejecuta
pipeline local, audit runtime y despliegues Docker con rolling, blue-green, canary,
flags y rollback de image compatible con SQL. Candidato negativo, sin producción.

El paquete [container-environments](packages/container-environments/README.md) levanta
API, PostgreSQL y Redis mediante Compose. Cache de build, caídas, recreación, volumen
y dos setups vacíos reales; sin scan, backup restore o despliegue remoto.

El paquete [incident-response](packages/incident-response/README.md) reproduce un
incidente sintético con HTTP y dos procesos reales. Nueve tests, cronología, runbook
y acciones con evidencia. Cola en memoria, sin guardia humana o deploy ejecutados.

El paquete [service-objectives](packages/service-objectives/README.md) simula SLI,
maduración, ventanas, presupuestos y condiciones multi-window. Doce tests y modelo
compartido con el visor. Sin tráfico real, paging, Prometheus o política aplicada a CI.

El paquete [observability-lab](packages/observability-lab/README.md) traza React →
API → worker en procesos distintos con OpenTelemetry. Nueve tests rápidos y cinco
escenarios Chromium opt-in; histograma SDK y reservoir de exemplars explícito.
Sin broker durable, OTLP, Collector, backend o ingestión Prometheus ejecutada.

El paquete [performance-lab](packages/performance-lab/README.md) mide HTTP con k6
en procesos separados y captura perfiles de CPU/heap de datos ficticios. Carga
y herramientas son opt-in; sus tests rápidos y verificación usan evidencia
archivada. Sin cloud, soak de horas o capacidad de producción certificada.

El paquete [property-testing](packages/property-testing/README.md) genera y reduce
contraejemplos con fast-check. Incluye replay, scheduler, fuzzing acotado, fallos
lógicos y tres variantes manuales; sin red, crash real o Stryker ejecutados.

El paquete [integration-contracts](packages/integration-contracts/README.md)
ejecuta PostgreSQL con Testcontainers y verifica contratos Pact locales. Docker
es opt-in; el comando test solo comprueba el núcleo sin contenedores.

El paquete [testing-strategy](packages/testing-strategy/README.md) añade pruebas
de reglas, doubles, un contrato Map/SQLite y HTTP real. Incluye un contraejemplo
de coverage y cuatro mutaciones manuales; sin UI E2E o Stryker ejecutados.

El paquete [kafka-streaming](packages/kafka-streaming/README.md) añade tests de
proyección y cinco casos con un broker Kafka local aislado. La integración requiere
arranque explícito; `test:labs` solo ejecuta su parte sin broker.

El paquete [distributed-foundations](packages/distributed-foundations/README.md)
añade modelos deterministas de réplicas, quorum, voto, Lamport y routing. Ejecuta
`pnpm --dir packages/distributed-foundations test`; no requiere red o clúster.

Los comandos de esta tabla parten de la raíz. Consulta siempre el README de cada
laboratorio antes de iniciar servicios o ejecutar pruebas de integración.

| Carpeta                                                                     | Contenido                                               | Prueba o entrada                                                                       |
| --------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [transactions](packages/transactions/README.md)                             | ACID y transacciones, español                           | `pnpm --dir packages/transactions test` (requiere PostgreSQL del lab)                  |
| [transactions-en](packages/transactions-en/README.md)                       | El mismo laboratorio traducido al inglés                | `pnpm --dir packages/transactions-en test` (requiere PostgreSQL del lab)               |
| [database-fundamentals](packages/database-fundamentals/README.md)           | SQL, aislamiento, índices, migraciones, Redis           | `pnpm --dir packages/database-fundamentals test:integration` (requiere Docker Compose) |
| [domain-design](packages/domain-design/README.md) | Vocabulario, agregados, revisión optimista, C4 y ADR | `pnpm --dir packages/domain-design test` y `typecheck` |
| [design-principles](packages/design-principles/README.md) | Cohesión, SOLID, KISS/YAGNI y DRY | `pnpm --dir packages/design-principles test` y `typecheck` |
| [architecture-boundaries](packages/architecture-boundaries/README.md) | Puertos, HTTP, ownership, capas y CQRS local | `pnpm --dir packages/architecture-boundaries test` y `boundaries` |
| [data-structures-algorithms](packages/data-structures-algorithms/README.md) | Búsquedas, ordenación, árboles y grafos                 | `pnpm --dir packages/data-structures-algorithms test`                                  |
| [reliable-services](packages/reliable-services/README.md)                   | Invariantes, concurrencia, eventos y fallos             | `pnpm --dir packages/reliable-services test`                                           |
| [computing-networks](packages/computing-networks/README.md)                 | Procesos, memoria, HTTP y transporte                    | `pnpm --dir packages/computing-networks test`                                          |
| [realtime-frontend](packages/realtime-frontend/README.md)                   | React, accesibilidad, estado y colaboración             | `pnpm --dir packages/realtime-frontend test`                                           |
| [mathematics-statistics](packages/mathematics-statistics/README.md)         | Probabilidad, álgebra, optimización e inferencia        | `pnpm --dir packages/mathematics-statistics test` (Python 3)                           |
| [machine-learning](packages/machine-learning/README.md)                     | Datos, modelos y evaluación                             | `pnpm --dir packages/machine-learning test:container` (imagen local fijada)            |
| [api-contracts](packages/api-contracts/README.md)                           | HTTP y OpenAPI                                          | `pnpm --dir packages/api-contracts test`                                               |
| [api-validation-errors](packages/api-validation-errors/README.md)           | JSON Schema, Zod y Problem Details                      | `pnpm --dir packages/api-validation-errors test`                                       |
| [api-pagination-evolution](packages/api-pagination-evolution/README.md)     | Cursores, PostgreSQL y compatibilidad                   | `pnpm --dir packages/api-pagination-evolution test`                                    |
| [api-identity](packages/api-identity/README.md)                             | Cookies, OIDC y rotación                                | `pnpm --dir packages/api-identity test` (OpenSSL local)                                |
| [api-authorization](packages/api-authorization/README.md)                   | Tenant, ownership y autorización                        | `pnpm --dir packages/api-authorization test`                                           |
| [browser-security](packages/browser-security/README.md)                     | XSS, CSP, CSRF y CORS                                   | `pnpm --dir packages/browser-security test` (Chromium)                                 |
| [api-threats](packages/api-threats/README.md)                               | Mass assignment, SQL injection, SSRF, cuotas y secretos | `pnpm --dir packages/api-threats test`                                                 |
| [api-integration](packages/api-integration/README.md) | Polling/SSE, GraphQL N+1 y gRPC | `pnpm --dir packages/api-integration test` |

Los tests con Docker, servicios de datos, imágenes científicas o navegador son
opt-in. No se omiten silenciosamente dentro de `test:labs`: ese comando declara
un subconjunto local concreto. No ejecutes los laboratorios vulnerables fuera de
loopback ni les proporciones credenciales, datos o redes de producción.

Para las suites de navegador, instala Chromium explícitamente con pnpm:

```bash
pnpm --filter @luisrc-examples/realtime-frontend exec playwright install chromium
pnpm test:browser
```

## Comprobar coherencia con el blog

No necesitas clonar el blog para ejecutar los laboratorios. La comprobación de
fragmentos de código, diagramas y enlaces sí necesita ambos checkouts:

```bash
BLOG_ROOT=../luisrc-blog pnpm test:editorial
```

`BLOG_ROOT` es explícito: no hay symlinks ni una ruta personal obligatoria. Las
pruebas editoriales anteriores se han trasladado aquí. Las pruebas de archivos
ZIP se sustituyen por comprobaciones de fuentes, destinos GitHub y exportaciones;
ya no se distribuyen ZIPs en el blog.

## Actualizar los visores y gráficas del sitio

El blog conserva sus SVG, visores estáticos y JSON de evidencia para compilar y
funcionar sin este checkout ni llamadas a GitHub en tiempo de ejecución. Esos
recursos son parte de la página, no copias descargables de los laboratorios.
La lista de exportación es explícita en [metadata/blog-exports.json](metadata/blog-exports.json).

Después de modificar una fuente de un visor o recalcular resultados:

```bash
BLOG_ROOT=../luisrc-blog pnpm blog:sync
BLOG_ROOT=../luisrc-blog pnpm test:editorial
```

La sincronización copia únicamente esos recursos y guarda sus SHA-256 en el blog.
Los scripts `render-*.mjs` del blog consumen sus propios JSON editoriales para
regenerar gráficas. Los scripts de experimentos y sincronización de snippets viven
en este repositorio; los `sync-*-snippets.mjs` también requieren `BLOG_ROOT`.
Revisa y comitea los cambios de ambos repositorios cuando cambie un ejemplo.

## Subir el repositorio por primera vez

La rama local es `main` y `origin` apunta a
`git@github.com:luckys/luisrc-blog-examples.git`. Una vez creado el repositorio
**vacío** en la cuenta `luckys`, sin README ni commit inicial adicional:

```bash
git push -u origin main
```

Los enlaces nuevos del blog usan `blob/main`. Hasta crear y subir este repositorio
en GitHub devolverán 404. La migración local no crea el repositorio remoto ni hace push.

`packages/capacity-costs`: tres perfiles de demanda, capacidad CPU y dependencia,
simulación fluida de escalado, presupuesto parcial exacto, compromisos ficticios
y reparto reconciliado; no mide un proveedor ni valida una factura.

`packages/neural-foundations`: MLP NumPy sobre XOR sintético, baseline y control
negativo, cinco entrenamientos reproducibles, comparación de gradientes e inferencia
del visor contrastada con NumPy. No generalización o calibración acreditadas fuera
del dataset y protocolo declarados.

`packages/autodiff-foundations`: grafo escalar compartido, backward MLP instrumentado,
contraste real con PyTorch CPU y diferencias finitas, errores deliberados y comportamiento
de autograd. Reutiliza pesos/modelo de neural-foundations sin alterar su entrenamiento.

## Optimizers and training dynamics

`packages/training-dynamics`: siete artículos P098,17curvas de entrenamiento y controles
de actualizaciones contrastados con PyTorch CPU. Reutiliza la image existente y el
modelo de neural-foundations. Ver [README](packages/training-dynamics/README.md).

## PyTorch end-to-end training

`packages/pytorch-training`: siete artículos P099,entrenamiento real con loaders/módulos,
validación y archivos de inferencia/reanudación verificados. Ver [README](packages/pytorch-training/README.md).

## Generalization and stability

`packages/generalization-stability`: diez artículos P100,18entrenamientos reales,
controles de capas/estabilidad yresultados negativos preservados. Ver [README](packages/generalization-stability/README.md).

El paquete [convolutional-networks](packages/convolutional-networks/README.md) acompaña
nueve drafts P101: quince CNN entrenadas, mapas reales y controles de transfer learning.

[recurrent-sequences](packages/recurrent-sequences/README.md): ocho drafts P102,
12 modelos entrenados, estados/puertas reales y generación sin futuro proporcionado.

[attention-transformer](packages/attention-transformer/README.md): ocho drafts P103,
matrices explícitas, controles nativos y pruebas de causalidad; sin entrenamiento.

## Trabajo editorial y herramientas del blog

La [documentación editorial](docs/editorial/README.md) y los [scripts de revisión y render](tools/blog) viven aquí. Se ejecutan desde este monorepo indicando `BLOG_ROOT`, sin volver a copiar código de laboratorio al blog.

El paquete [model-adaptation](packages/model-adaptation/README.md) acompaña nueve
drafts P104: tres pretrainings de denoising, 21 adaptaciones y test reservado;
baselines lineal/scratch, freeze/full, LoRA/adapters y retención con decoder fijo.
No mide GPU ni ejecuta entrenamiento contrastivo completo.

El paquete [gpu-training](packages/gpu-training/README.md) acompaña ocho drafts P105:
12 configuraciones reales CPU/CUDA, tiempos y VRAM, copias H2D, controles
numéricos y traza de 219 kernels. El benchmark usa datos residentes repetidos
y CPU con un thread; no compara calidad ni un pipeline completo.

[lexical-search](packages/lexical-search/README.md): once drafts P106, corpus original, BM25/TF-IDF, seis contrastes y 120 rankings etiquetados. Incluye errores de recuperación y trazas de BPE/WordPiece; sin modelos externos.

[entity-recognition](packages/entity-recognition/README.md): P107 en siete drafts: spans Unicode, BIO, reglas, entrenamiento real, convergencia y errores. Conserva el fracaso inicial y la baja generalización.

[language-models](packages/language-models/README.md): P108 en seis drafts. Transformer causal pequeño entrenado, distribuciones completas, métricas, figuras y visor de predicciones guardadas.

[text-generation](packages/text-generation/README.md): P109 en siete drafts. 36 generaciones congeladas, filtros contrastados y streaming real medido, con diagramas y visor de capturas.

[structured-extraction](packages/structured-extraction/README.md): P110 en siete drafts; 24 respuestas reales, validación estricta, evidencias y propuestas locales de herramientas. Diagramas, figuras y visor de capturas.

[vector-retrieval](packages/vector-retrieval/README.md): P111 desarrollado en drafts; encoder real, comparación BM25/vector y capturas FAISS/pgvector. Nueve borradores escritos; figuras y visor de geometría, índices, relevancia y medición. Revisión final completada; sin publicación.
