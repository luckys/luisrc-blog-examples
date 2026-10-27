# Revisión P105: entrenamiento eficiente en GPU

## Alcance y organización

Ocho drafts españoles de Luis Ramírez Calle, independientes de PaySafe. Orden
en [la ruta](ruta-entrenamiento-gpu.md), manifiesto en
[gpu-training-series.json](gpu-training-series.json). CPU/GPU/CUDA, VRAM,
transferencias, batching, mixed precision, accumulation, profiler y determinism
tienen entregas específicas. Código completo en `packages/gpu-training` del
monorepo; en el blog solo artículos, D2/SVG y exports estáticos.

La entrega GPU de accumulation continúa la teoría previa en NumPy, sin
sobrescribir su ID ni su URL. Se detectó una colisión de slug durante generación:
se restauró byte a byte el artículo original limpio de HEAD y se asignó
`gradient-accumulation-gpu-microbatches-desiguales` a la continuación. Las pruebas
comprueban la conservación del original y unicidad de IDs definidos y slugs.
Los cinco posts antiguos sin ID siguen siendo válidos; no se migraron para
satisfacer una comprobación nueva demasiado amplia.

## Protocolo fijado antes de capturar

Se guardó en protocol.json y en la ruta antes de medir. MLP
512→1024→1024→16 con ReLU, 1.591.312 parámetros, sin Dropout ni BatchNorm.
Pesos seed 17, datos seed 223. Inputs normales sintéticos; etiquetas argmax de
las primeras 16 features. Se reutiliza el batch: no es calidad sobre test nuevo.

CPU usa un thread numérico. Batches 32/128/512; CPU FP32 y CUDA FP32/FP16/BF16:
doce configuraciones en procesos Python nuevos. Orden barajado seed 909.
AdamW 0.001/weight_decay 0.01/foreach false. Ocho updates de warmup, cinco
muestras de diez iteraciones medidas. Synchronize antes/después de cada muestra;
perf_counter wall incluye zero_grad, forward, loss, backward y optimizer.
Datos residentes: se excluyen preparación, I/O y transferencia inicial.

Peaks del allocator reiniciados después de warmup con modelo, estado y batch
vivos. No se resta una cuenta teórica para atribuir todo lo restante a
activaciones. Presupuesto del allocator 25%; sin provocar OOM de toda la GPU.

Copias H2D de 1/16 MiB, cuatro warmup y cinco muestras de diez copias.
Allocation/pinning previos y destino reutilizado. Pageable bloqueante frente a
pinned no bloqueante cambia dos decisiones: no aísla causalmente pinning.
Sin cómputo concurrente, no demuestra overlap. Contenido del destino verificado.

## Ejecución real y evidencia

Captura `2026-10-26T23:51:33.402970+00:00`. Python 3.12.3,
PyTorch 2.14.0+cu130, CUDA 13.0; NVIDIA GeForce RTX 5070 Laptop GPU,
compute capability 12.0. Runtime por digest en runtime.json.
Docker sin runtime nvidia/CDI: se usó acceso explícito a tres nodos de dispositivo
y bind readonly de archivos concretos del driver. No se cambió driver ni daemon,
ni se instaló Python en host. Contenedor sin red, root/bind readonly,
usuario 1000:100, cap-drop ALL, 2 CPUs/4 GiB, timeout 300 s y nombre propio
aleatorio. Los hijos ejecutan secuencialmente, sin contaminar timing con otra
configuración simultánea. Solo se elimina el contenedor propio.

Once hashes fijan fuentes/configuración/verificador. Las dos copias JSON
coinciden. `verify` reconstruye estadísticas y controles, audita fuentes y
traza; NO vuelve a entrenar ni compara tiempos con una constante esperada.
`reobserve` ejecuta otra captura y la guarda separada bajo /tmp. No se ejecutó
una nueva captura solo para seleccionar resultados más atractivos.

## Resultados que se conservaron

FP32 batch 128: CPU 30.186068 ms/update, CUDA 2.018505. Es comparación contra
un thread CPU, no contra todos los cores ni contra el mejor tuning del host.
CUDA FP32 batches 32/128/512: 1.988277 / 2.018505 / 2.040094 ms/update;
throughput 16094.34 / 63413.27 / 250968.86 filas/s, con repetición de datos.

AMP fue más lento aquí. Batch 128: FP16 2.719429, BF16 2.466217 ms/update.
Las tres precisiones conservan pesos FP32 y picos allocated casi iguales.
No se alteró workload para fabricar una ventaja. Pico FP32 con batch 512:
102051328 bytes. Reserved puede crecer más por caché: no se llama fuga por eso.
Cada gráfico usa ejes desde cero y el de memoria muestra curvas superpuestas.

Probe inicial de 64 ejemplos: FP16 error logit máximo 0.000271589;
BF16 0.002286002. Ambos coinciden con 63/64 argmax FP32, loss en FP32.
No se presenta como calidad entrenada o garantía de misma convergencia.
GradScaler FP16 65536 antes/después de medir; no hay traza por step de overflows.

Acumulación: 21 filas, microbatches 8/8/5, un step SGD lr0.01, FP32.
Error máximo ponderado 3.725290298e-9; promedio incorrecto de medias
3.273934126e-4. Control probado también en CPU. No se mide ahorro de memoria
de accumulation ni se promete equivalencia con Dropout/BatchNorm/padding.

Profiler separado: tres updates FP32 batch 128 instrumentados, 219 eventos
kernel reales, duraciones sumadas 1064.807 µs. La traza original queda en
results/profiler-trace.json, sin exportarla como descarga del sitio. Sus rangos
y filas agregadas pueden solaparse o repetirse por nombre; no se suman para
inventar wall time. El stderr USDT de inicio/fin se conserva como evidencia.

Repetición determinista: dos modelos, tres updates en el mismo proceso/runtime;
losses idénticas y diferencia máxima de pesos cero. No se promete igualdad
entre hardware/versiones ni tiempos idénticos.

## Revisión editorial y visual

Ocho extractos Python corresponden a fuentes ejecutadas; ocho D2/SVG y cuatro
plots derivados del reporte. Visor con muestras, memoria, transferencias,
precisión, acumulación, profiler y repetición. Sin API externa ni entrenamiento
en el navegador. Pruebas de ordenación conservan índices originales del profiler.

Primera visita Chromium: 18 vistas a 1440/360, sin pageerrors ni overflow global.
Por ancho: doce configuraciones/60 filas de tiempo, cuatro copias/20 filas,
tres probes de precisión y microbatches, dos órdenes del profiler/40 filas.
Teclado, scroll, enlaces internos, imágenes e iframes verificados.
Informe inicial /tmp/gpu-training-layout.NfNlj1/report.json.

Inspección visual: las doce figuras y secciones del visor. Se reorganizaron
memoria, batching y determinism para mejorar el texto móvil. El profiler tiene
scroll vertical acotado y cabecera fija. La visita final también pasa:
/tmp/gpu-training-layout.2sI4Aq/report.json. Inspección adicional del estado inicial
de tablas, sin desplazamiento pendiente de teclado: /tmp/gpu-training-visuals.fLr57e/report.json.
Los cinco paneles registran scrollLeft/scrollTop cero y sus capturas son legibles.
Servidor propio cerrado después de terminar QA.

Pasan cuatro tests JS de modelo/medianas/controles, 209 comprobaciones
editoriales/estructurales y 17 tests del blog; tres tests Python CUDA ya pasaron
antes de la captura y sus fuentes hash no cambiaron. Build 50 rutas;
Pagefind diez páginas/4280 palabras/dos idiomas, drafts fuera.
pnpm offline/frozen: 46 proyectos, lockfile intacto. 45 labs, 336 índices,
177 exports. Inventario 80/19/76 significa existencia, no aceptación global.

## Continuación

El objetivo completo sigue abierto. Próximo bloque Serie 11, P106: NLP y búsqueda
léxica. Leer la ficha completa antes de escribir; cubrir corpus, normalización,
tokenización, stemming, lemmatization, n-grams, TF-IDF, BM25 y BPE/WordPiece.
Laboratorio obligatorio de buscador BM25 con errores y etiquetas de consulta.
Dividir temas para explicarlos, conservar código completo fuera del blog y
añadir diagramas/gráficos pertinentes. No sustituir búsquedas léxicas por un
servicio LLM externo. Mantener gaps previos y restricciones de Serie 02.
Sin commit/push, publicación, traducción o audio automáticos.
