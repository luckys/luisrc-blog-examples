# GPU training laboratory

Real CPU/CUDA observations for P105, not a simulation. The experiment isolates training updates with resident synthetic data. It does not benchmark model quality, DataLoader throughput, end-to-end inference or every CPU core.

## Runtime

Node24.19+, pnpm12.8.1, Docker, a supported NVIDIA GPU and host driver libraries. The pinned CUDA13.0 PyTorch image supports the observed sm120 device. The Linux runner mounts only three NVIDIA device nodes and specific read-only driver library files; it never edits system drivers or Docker configuration. Set GPU_DRIVER_LIBDIR to the directory containing libcuda.so.1 when its host location differs. The supplied binding adapter was observed on Debian-style NVIDIA driver layout; adapt explicitly for another platform.

```bash
pnpm --filter @luisrc-examples/gpu-training runtime:fetch
pnpm --filter @luisrc-examples/gpu-training preflight
pnpm --filter @luisrc-examples/gpu-training test:container
pnpm --filter @luisrc-examples/gpu-training exercise
pnpm --filter @luisrc-examples/gpu-training verify
pnpm --filter @luisrc-examples/gpu-training reobserve
```

exercise replaces the canonical observation only on successful capture of all twelve configurations and actual CUDA kernel events. Each benchmark configuration runs in a fresh Python child process. Five raw timing samples are kept. reobserve writes a separate report under /tmp and does not replace the canonical observation. verify audits hashes, statistics, controls and original profiler trace; it does not assert identical timings on a later run.

See protocol.json and docs/editorial/ruta-entrenamiento-gpu.md for the design fixed before observation. The CPU uses one numerical thread; the container has 2 CPUs/4GiB. GPU allocator fraction is0.25. Workload has no Dropout or BatchNorm. All parameters stay FP32, autocast chooses FP16/BF16 operations. Data is synthetic and reused across updates, with no claim of held-out prediction quality.

Transfer comparison changes pinning and synchronization strategy together; it is not a factorial isolation of pinning alone. No concurrent compute is scheduled, so it cannot prove overlap. Accumulation compares a single SGD update on21rows split8/8/5; weighted means preserve the objective and an unweighted control deliberately changes it. Profiling instruments three updates separately from the uninstrumented benchmark. Determinism control is same hardware/runtime/process only.

No full-device OOM, clock/power changes, privileged container, host package install, cloud GPU charge or driver replacement is required. Only the runner's random container is removed on exit.
