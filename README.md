# luisrc-blog-examples

**English** · [Español](README.es.md)

Monorepo of runnable examples for [luisrc.pages.dev](https://luisrc.pages.dev/).
The articles live in [luckys/luisrc](https://github.com/luckys/luisrc); the
labs, fixtures, tests and original results are kept here.
They contain fictional data only. They are not production-ready applications.

## Finding the code for a post

The [per-article index](posts/README.md) maps 421 posts to their files and
labs. Each entry in `posts/<locale>/<id>/README.md` links the corresponding
sources. Shared labs live only once in `packages/`: splitting a topic into
several articles does not duplicate its implementation.

Drafts also appear in the index. Their blog page will not be publicly
available until they are approved and published.

## Installation

Use **Node.js 24.19.0 or later** and **pnpm 12.8.1**. All dependency
installations are done with pnpm, from the monorepo root:

```bash
git clone git@github.com:luckys/luisrc-blog-examples.git
cd luisrc-blog-examples
pnpm install --frozen-lockfile
pnpm test
pnpm test:labs
```

There is a single `pnpm-workspace.yaml` and a single `pnpm-lock.yaml`. Do not run
independent installs in each lab. `pnpm test` checks structure, indexes and
source preservation; `pnpm test:labs` runs the local Node and standard Python
tests, without starting Docker or installing browsers.

## Labs

The [kubernetes-workloads](packages/kubernetes-workloads/README.md) package observes
real Pods, versions, routes, probes, configuration, RBAC, OOM and HPA on K3s.
Eleven drafts complement the Terraform block of P065.

The [declarative-infrastructure](packages/declarative-infrastructure/README.md) package
uses real Terraform and K3s for six own resources, drift, state, outdated plans,
replacement and teardown. Terraform block of P065, complemented by kubernetes-workloads.

The [aws-foundations](packages/aws-foundations/README.md) package accompanies eleven
P064 drafts: local contracts, public rates, chart and subtotal comparator.
It does not deploy to AWS or demonstrate real capacity or billing.

The [progressive-delivery](packages/progressive-delivery/README.md) package runs a
local pipeline, runtime audit and Docker deployments with rolling, blue-green, canary,
flags and SQL-compatible image rollback. Negative candidate, no production.

The [container-environments](packages/container-environments/README.md) package brings up
API, PostgreSQL and Redis via Compose. Build cache, outages, recreation, volume
and two real empty setups; no scan, backup restore or remote deployment.

The [incident-response](packages/incident-response/README.md) package reproduces a
synthetic incident with HTTP and two real processes. Nine tests, timeline, runbook
and actions with evidence. In-memory queue, no human on-call or executed deploy.

The [service-objectives](packages/service-objectives/README.md) package simulates SLI,
maturation, windows, budgets and multi-window conditions. Twelve tests and a model
shared with the viewer. No real traffic, paging, Prometheus or policy applied to CI.

The [observability-lab](packages/observability-lab/README.md) package traces React →
API → worker across separate processes with OpenTelemetry. Nine fast tests and five
opt-in Chromium scenarios; SDK histogram and explicit exemplar reservoir.
No durable broker, OTLP, Collector, backend or executed Prometheus ingestion.

The [performance-lab](packages/performance-lab/README.md) package measures HTTP with k6
in separate processes and captures CPU/heap profiles of fictional data. Load
and tools are opt-in; its fast tests and verification use archived evidence.
No cloud, hours-long soak or certified production capacity.

The [property-testing](packages/property-testing/README.md) package generates and shrinks
counterexamples with fast-check. It includes replay, scheduler, bounded fuzzing, logical
failures and three manual variants; no network, real crash or Stryker executed.

The [integration-contracts](packages/integration-contracts/README.md) package
runs PostgreSQL with Testcontainers and verifies local Pact contracts. Docker
is opt-in; the test command only checks the core without containers.

The [testing-strategy](packages/testing-strategy/README.md) package adds rule
tests, doubles, a Map/SQLite contract and real HTTP. It includes a coverage
counterexample and four manual mutations; no UI E2E or Stryker executed.

The [kafka-streaming](packages/kafka-streaming/README.md) package adds projection
tests and five cases with an isolated local Kafka broker. The integration requires
an explicit start; `test:labs` only runs its part without a broker.

The [distributed-foundations](packages/distributed-foundations/README.md) package
adds deterministic models of replicas, quorum, voting, Lamport and routing. Run
`pnpm --dir packages/distributed-foundations test`; it requires no network or cluster.

The commands in this table start from the root. Always check each lab's README
before starting services or running integration tests.

| Folder                                                                      | Contents                                                | Test or entry point                                                                     |
| --------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [transactions](packages/transactions/README.md)                             | ACID and transactions, Spanish                          | `pnpm --dir packages/transactions test` (requires the lab's PostgreSQL)                 |
| [transactions-en](packages/transactions-en/README.md)                       | The same lab translated into English                    | `pnpm --dir packages/transactions-en test` (requires the lab's PostgreSQL)              |
| [database-fundamentals](packages/database-fundamentals/README.md)           | SQL, isolation, indexes, migrations, Redis              | `pnpm --dir packages/database-fundamentals test:integration` (requires Docker Compose)  |
| [domain-design](packages/domain-design/README.md) | Vocabulary, aggregates, optimistic concurrency, C4 and ADR | `pnpm --dir packages/domain-design test` and `typecheck` |
| [design-principles](packages/design-principles/README.md) | Cohesion, SOLID, KISS/YAGNI and DRY | `pnpm --dir packages/design-principles test` and `typecheck` |
| [architecture-boundaries](packages/architecture-boundaries/README.md) | Ports, HTTP, ownership, layers and local CQRS | `pnpm --dir packages/architecture-boundaries test` and `boundaries` |
| [data-structures-algorithms](packages/data-structures-algorithms/README.md) | Search, sorting, trees and graphs                       | `pnpm --dir packages/data-structures-algorithms test`                                   |
| [reliable-services](packages/reliable-services/README.md)                   | Invariants, concurrency, events and failures            | `pnpm --dir packages/reliable-services test`                                            |
| [computing-networks](packages/computing-networks/README.md)                 | Processes, memory, HTTP and transport                   | `pnpm --dir packages/computing-networks test`                                           |
| [realtime-frontend](packages/realtime-frontend/README.md)                   | React, accessibility, state and collaboration           | `pnpm --dir packages/realtime-frontend test`                                            |
| [mathematics-statistics](packages/mathematics-statistics/README.md)         | Probability, algebra, optimization and inference        | `pnpm --dir packages/mathematics-statistics test` (Python 3)                            |
| [machine-learning](packages/machine-learning/README.md)                     | Data, models and evaluation                             | `pnpm --dir packages/machine-learning test:container` (pinned local image)              |
| [api-contracts](packages/api-contracts/README.md)                           | HTTP and OpenAPI                                        | `pnpm --dir packages/api-contracts test`                                                |
| [api-validation-errors](packages/api-validation-errors/README.md)           | JSON Schema, Zod and Problem Details                    | `pnpm --dir packages/api-validation-errors test`                                        |
| [api-pagination-evolution](packages/api-pagination-evolution/README.md)     | Cursors, PostgreSQL and compatibility                   | `pnpm --dir packages/api-pagination-evolution test`                                     |
| [api-identity](packages/api-identity/README.md)                             | Cookies, OIDC and rotation                              | `pnpm --dir packages/api-identity test` (local OpenSSL)                                 |
| [api-authorization](packages/api-authorization/README.md)                   | Tenant, ownership and authorization                     | `pnpm --dir packages/api-authorization test`                                            |
| [browser-security](packages/browser-security/README.md)                     | XSS, CSP, CSRF and CORS                                 | `pnpm --dir packages/browser-security test` (Chromium)                                  |
| [api-threats](packages/api-threats/README.md)                               | Mass assignment, SQL injection, SSRF, quotas and secrets | `pnpm --dir packages/api-threats test`                                                 |
| [api-integration](packages/api-integration/README.md) | Polling/SSE, GraphQL N+1 and gRPC | `pnpm --dir packages/api-integration test` |

Tests that use Docker, data services, scientific images or a browser are
opt-in. They are not silently skipped inside `test:labs`: that command declares
a concrete local subset. Do not run the vulnerable labs outside
loopback or give them credentials, data or production networks.

For browser suites, install Chromium explicitly with pnpm:

```bash
pnpm --filter @luisrc-examples/realtime-frontend exec playwright install chromium
pnpm test:browser
```

## Checking consistency with the blog

You do not need to clone the blog to run the labs. Checking code
snippets, diagrams and links does require both checkouts:

```bash
BLOG_ROOT=../luisrc-blog pnpm test:editorial
```

`BLOG_ROOT` is explicit: there are no symlinks or a mandatory personal path. The
previous editorial tests have been moved here. ZIP file tests are replaced by
checks of sources, GitHub targets and exports;
ZIPs are no longer distributed in the blog.

## Updating the site's viewers and charts

The blog keeps its SVGs, static viewers and evidence JSON so it can build and
work without this checkout or GitHub calls at runtime. Those
resources are part of the page, not downloadable copies of the labs.
The export list is explicit in [metadata/blog-exports.json](metadata/blog-exports.json).

After modifying a viewer source or recalculating results:

```bash
BLOG_ROOT=../luisrc-blog pnpm blog:sync
BLOG_ROOT=../luisrc-blog pnpm test:editorial
```

The sync copies only those resources and saves their SHA-256 in the blog.
The blog's `render-*.mjs` scripts consume their own editorial JSON to
regenerate charts. The experiment and snippet-sync scripts live
in this repository; the `sync-*-snippets.mjs` scripts also require `BLOG_ROOT`.
Review and commit the changes in both repositories when an example changes.

## Pushing the repository for the first time

The local branch is `main` and `origin` points to
`git@github.com:luckys/luisrc-blog-examples.git`. Once the **empty** repository
has been created on the `luckys` account, with no README or extra initial commit:

```bash
git push -u origin main
```

New blog links use `blob/main`. Until this repository is created and pushed
on GitHub they will return 404. The local migration does not create the remote repository or push.

`packages/capacity-costs`: three demand profiles, CPU and dependency capacity,
smooth scaling simulation, exact partial budget, fictional commitments
and reconciled allocation; it does not measure a provider or validate an invoice.

`packages/neural-foundations`: NumPy MLP on synthetic XOR, baseline and negative
control, five reproducible trainings, gradient comparison and viewer
inference cross-checked against NumPy. No generalization or calibration accredited
outside the declared dataset and protocol.

`packages/autodiff-foundations`: shared scalar graph, instrumented MLP backward,
real contrast with CPU PyTorch and finite differences, deliberate errors and autograd
behavior. Reuses weights/model from neural-foundations without altering its training.

## Optimizers and training dynamics

`packages/training-dynamics`: seven P098 articles, 17 training curves and update
controls cross-checked against CPU PyTorch. Reuses the existing image and the
neural-foundations model. See [README](packages/training-dynamics/README.md).

## PyTorch end-to-end training

`packages/pytorch-training`: seven P099 articles, real training with loaders/modules,
validation and verified inference/resume files. See [README](packages/pytorch-training/README.md).

## Generalization and stability

`packages/generalization-stability`: ten P100 articles, 18 real trainings,
layer/stability controls and preserved negative results. See [README](packages/generalization-stability/README.md).

The [convolutional-networks](packages/convolutional-networks/README.md) package accompanies
nine P101 drafts: fifteen trained CNNs, real maps and transfer learning controls.

[recurrent-sequences](packages/recurrent-sequences/README.md): eight P102 drafts,
12 trained models, real states/gates and generation with no future provided.

[attention-transformer](packages/attention-transformer/README.md): eight P103 drafts,
explicit matrices, native controls and causality tests; no training.

## Editorial work and blog tooling

The [editorial documentation](docs/editorial/README.md) and the [review and render scripts](tools/blog) live here. They run from this monorepo specifying `BLOG_ROOT`, without copying lab code back into the blog.

The [model-adaptation](packages/model-adaptation/README.md) package accompanies nine
P104 drafts: three denoising pretrainings, 21 adaptations and a held-out test;
linear/scratch baselines, freeze/full, LoRA/adapters and retention with a fixed decoder.
It does not measure GPU or run full contrastive training.

The [gpu-training](packages/gpu-training/README.md) package accompanies eight P105 drafts:
12 real CPU/CUDA configurations, times and VRAM, H2D copies, numerical
controls and a trace of 219 kernels. The benchmark uses repeated resident data
and single-threaded CPU; it does not compare quality or a full pipeline.

[lexical-search](packages/lexical-search/README.md): eleven P106 drafts, original corpus, BM25/TF-IDF, six contrasts and 120 labeled rankings. Includes retrieval errors and BPE/WordPiece traces; no external models.

[entity-recognition](packages/entity-recognition/README.md): P107 in seven drafts: Unicode spans, BIO, rules, real training, convergence and errors. Preserves the initial failure and the low generalization.

[language-models](packages/language-models/README.md): P108 in six drafts. Small causal Transformer trained, full distributions, metrics, figures and a saved-predictions viewer.

[text-generation](packages/text-generation/README.md): P109 in seven drafts. 36 frozen generations, contrasted filters and measured real streaming, with diagrams and a captures viewer.

[structured-extraction](packages/structured-extraction/README.md): P110 in seven drafts; 24 real responses, strict validation, evidence and local tool proposals. Diagrams, figures and a captures viewer.

[vector-retrieval](packages/vector-retrieval/README.md): P111 developed in drafts; real encoder, BM25/vector comparison and FAISS/pgvector captures. Nine written drafts; figures and a viewer for geometry, indexes, relevance and measurement. Final review completed; not published.

[document-ingestion](packages/document-ingestion/README.md): nine verified Spanish drafts of P112. Parsing/OCR/layout, provenance/dedup, size-based chunking and embeddings, overlap and compared BM25 indexing. Preserves negative results, nine diagrams, eight figures and ten interactive panels.

[retrieval-strategies](packages/retrieval-strategies/README.md): P113 in seven verified Spanish drafts. Real BM25/dense/RRF over the same 13 chunks; filters, multi-query and rewriting with explicit controls.

[reranking-grounding](packages/reranking-grounding/README.md): P114 in eight verified Spanish drafts. Real cross encoder, 80 scenarios/61 generations rejected by contract, grounding diagnostics and versioned citations. The failed result is not repaired.

## RAG evaluation: start of P116

`packages/rag-evaluation`: synthetic gold, dev/test groups, references and hashes.
Five deliveries out of ten; real A/B comparison still pending. See
[the editorial route](docs/editorial/ruta-evaluacion-rag.md).
