# Training dynamics: actual updates, batches and curves

Laboratorio español P098. MLP 2→4→1, tanh, BCE media, float64; importa el modelo
canónico de `../neural-foundations/neural.py`. No modifica sus fuentes o evidencia.
Todos los archivos de laboratorio viven en este monorepo; el blog conserva extractos
explicados y exports estáticos permitidos, sin un servidor de entrenamiento público.

## Reproducir

Desde la raíz, Docker disponible:

```bash
pnpm --dir packages/training-dynamics runtime:fetch
pnpm --dir packages/training-dynamics test:container
pnpm --dir packages/training-dynamics exercise
pnpm --dir packages/training-dynamics verify
pnpm --dir packages/training-dynamics test
pnpm --dir packages/training-dynamics render
```

La descarga solo hace falta si no está la image CPU fijada en runtime.json,
reutilizada de autodiff-foundations. No se instalan paquetes Python en el host.
Runner: pull never, red none, rootfs y dos binds readonly, usuario 1000:100,
cap-drop ALL, 2 CPUs/2 GiB, un thread OMP/BLAS/MKL. Cada ejercicio tiene nombre
aleatorio precomprobado y finally elimina solo ese contenedor. Sin prune o cloud.
El runner captura JSON stdout y lo escribe atómicamente en dos copias pendientes.

## Protocolo previo al resultado

protocol.json fija train256/validation128, seeds101/102, cuadrados alrededor de
(±1,±1), semiancho0,45. Seeds de pesos7/19/31; orden por SeedSequence(420,epoch).
Sin test evaluado. 80 epochs, batch32, 640updates y20480muestras procesadas por run.
Cuatro configuraciones por seed: SGD .1, momentum .1/μ.9, Adam .01 y AdamW .01/decay.01.
Adam usa betas.9/.999 yepsilon1e-8. Decay en TODOS los parámetros, bias incluidos.
No se hace búsqueda de hiperparámetros ni se iguala la regularización.

Cinco ablations declaradas con seed7: SGD .001,SGD1,batch16,batch256 y momentum
warmup40updates/cosine hasta .1de la tasa base en update639. Los tamaños de batch
mantienen epochs/muestras; NO igualan updates. Hash de orden independiente del
tamaño del batch: certifica la secuencia aplanada, no igualdad de gradientes.

history registra epoch0 y cada epoch: métricas sobre splits completos, contadores,
última tasa usada y normas del gradiente/desplazamiento del ÚLTIMO update. No son
medias por epoch. trace contiene los primeros tres updates con parámetros, gradientes
y estado m/v. En epoch0 la tasa/normas son null; no se dibujan como cero.

Controles: parábola5θ² para tasas.001/.1/.21; Adam/AdamW con gradiente de datos cero;
13puntos en microbatches5/5/3, promedio ponderado y promedio de medias incorrecto.
Ocho entrenamientos adicionales de cinco epochs contrastan batch32 con micro10
para los cuatro optimizadores:40steps por recorrido. No forman parte de los17runs.

## Evidencia y límites

results/training.json ycomparison.json contienen la misma captura. Doce hashes
incluyen runtime, protocolo, runner, fuentes, tests Python y modelo canónico.
verify recalcula17runs,controles y ocho recorridos cortos; rtol1e-10/atol1e-12.
No basta un hash o una curva monotónica. Tests de updates contra torch.optim
incluyen cuatro tasas/gradientes, con/sin decay, segundo step y estado persistente.
La versión naive debe fallar la equivalencia, no pasar silenciosamente.

Implementación didáctica densa, con todos los gradientes presentes. Sin sparse,
grad=None, Nesterov,dampening,AMSGrad,AMP,DDP o buffers fused. Acumulación equivalente
solo para el forward separable de este modelo a pesos fijos. Sin BatchNorm/dropout.
No benchmark de tiempo o memoria, ajuste óptimo, ranking universal ni evaluación final.
El visor no entrena: dibuja checkpoints y tablas de observaciones archivadas.
