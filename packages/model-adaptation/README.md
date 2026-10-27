# Model adaptation laboratory

Small CPU PyTorch experiment for the nine Spanish P104 articles. Complete code stays in this monorepo; the blog receives only explicitly exported static observations and visualizations.

## Run

Node24.19+, pnpm12.8.1, Docker and the pinned runtime image are required. Python packages are not installed on the host.

```bash
pnpm --filter @luisrc-examples/model-adaptation runtime:fetch
pnpm --filter @luisrc-examples/model-adaptation test:container
pnpm --filter @luisrc-examples/model-adaptation exercise
pnpm --filter @luisrc-examples/model-adaptation verify
pnpm --filter @luisrc-examples/model-adaptation render
pnpm --filter @luisrc-examples/model-adaptation test
```

The runner uses only its randomly named container, network none, pinned digest, read-only source/root, one numerical thread, 2 CPUs/2GiB and a five-minute timeout. It removes its own container on exit. Image fetch needs network; the actual experiment does not.

## Design fixed before observation

See protocol.json and docs/editorial/ruta-adaptacion-modelos.md. Three denoising pretrainings, seven downstream modes per seed, final fixed step only. Same dataset across seeds for paired initialization comparisons. Target test is reserved until all optimizers finish; complete test predictions and labels are archived. Six splits contain distinct feature rows, with IDs and feature/label hashes.

The task is intentionally linearly separable and synthetic. It does not establish that pretraining helps realistic tabular tasks, language models or production workloads. The linear baseline is strong by construction. Contrastive learning has an exact three-pair objective/gradient probe, not another trained model. Source reconstruction after adaptation is a retention proxy with a fixed original decoder, not an audit of all capabilities. The scratch reconstruction comparison is not forgetting because it never learned the source task.

Parameter counts are analytical counts from actual modules. No GPU, peak memory, energy or wall-clock performance is claimed. All modes receive the same downstream update count, not equal total compute. Pretraining is extra work.
