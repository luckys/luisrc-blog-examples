# P105: medir entrenamiento en GPU sin confundir lo que se mide

Plan y protocolo registrados antes del benchmark. El bloque continúa P104 y
permanece en español/draft. Código completo en packages/gpu-training. No se
acepta P105 por la presencia de un ID ni por una GPU detectada: necesita tiempo
y VRAM observados con batches/precisiones diferentes.

## Orden de lectura

1. CPU, GPU y CUDA: qué trabajo se envía al dispositivo y cómo medirlo.
2. VRAM: pesos, gradientes, optimizer, activaciones, allocated frente a reserved.
3. Transferencias: pageable, pinned y non_blocking sin prometer overlap.
4. Batching: throughput, tiempo por update y coste de memoria.
5. Mixed precision: autocast, FP16/BF16, GradScaler y controles numéricos.
6. Gradient accumulation: ponderar microbatches y preservar el update lógico.
7. Profiler: separar host, kernels, instrumentación y tiempo wall.
8. Determinism: reproducir un experimento sin prometer tiempos idénticos.

## Protocolo de captura

Consultar protocol.json. MLP 512→1024→1024→16, ReLU, sin Dropout/BatchNorm;
inputs sintéticos residentes, etiquetas argmax de las primeras 16 features.
No es un benchmark de calidad ni un DataLoader end-to-end. Pesos FP32;
AdamW lr0.001/weight_decay0.01/foreachfalse. CPU un thread; CUDA FP32/FP16/BF16;
batches32/128/512. Ocho updates de warmup, cinco muestras de diez updates por
configuración; orden aleatorio fijado antes con seed909. Cada configuración
empieza del mismo estado y recibe el mismo número de updates, no de ejemplos.
Synchronize antes/después de cada muestra, perf_counter wall. Peaks de memoria
tras warmup y con modelo/optimizer/batch vivos. Detalle de gradientes persistentes
según zero_grad(set_to_none=True). Datos fuera de la región medida.

Transferencias H2D1/16MiB: allocation/pinning previos, destino reutilizado,
pageable bloqueante vs pinned nonblocking, un stream sin cómputo concurrente.
Cinco muestras de diez copias, cuatro warmup, sincronización por muestra.
No es una prueba de overlap ni incluye el coste de preparar pinned memory.

Controles: diferencia numérica inicial respecto a FP32; acumulación de21filas
[8,8,5], un solo stepSGD, media ponderada correcta frente a promedio incorrecto
de medias; profilerCUDAreal para tres steps; repetición determinista corta.
No provocar OOM de toda la GPU. Cap de allocator por proceso25%; registrar
hardware,versiones,hashes,samples yadvertencias. No exigir repetir exactamente
los tiempos: verify-report reconstruye estadísticas yfuentes; reobserve genera
otra observación etiquetada sin sobrescribir automáticamente la publicada.

## Preflight observado

Host NVIDIA GeForce RTX5070LaptopGPU8151MiB,driver595.99.02. Docker no tiene
runtime nvidia/CDI configurado. Se prueba bind readonly de los ficheros concretos
del driver ylos tres nodos de dispositivo, sin alterar drivers ni daemon.
La imagenPyTorchCUDA13.0está fijada por digest. Preflight y captura completos: PyTorch 2.14.0+cu130 ejecutó las doce configuraciones, con 219 eventos kernel en la traza separada. Ver gpu-training-review.md.
