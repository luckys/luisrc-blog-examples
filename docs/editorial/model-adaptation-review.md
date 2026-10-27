# Revisión P104: adaptación de modelos

## Alcance

Nueve drafts españoles de Luis Ramírez Calle, independientes de PaySafe. Orden
[de lectura](ruta-adaptacion-modelos.md), [manifiesto](model-adaptation-series.json)
y [glosario](model-adaptation-glossary.md). Se cubre self-supervision, pretraining,
contrastive objectives, freeze/unfreeze, full tuning, PEFT, LoRA, adapters y
forgetting. El laboratorio usa un MLP para aislar mecanismos; no es un LLM.

## Diseño fijado antes de observar resultados

- Source: train 800 / validation 160 / test 256; target: 96 / 128 / 256.
- Ocho features, dos informativas con frontera lineal conocida; seis nuisances
  desplazadas +0.6 en target. Baseline lineal apropiado por construcción.
- Seeds de datos 1000–1002 y 2000–2002; seeds de modelo 7, 19 y 31.
- Pretraining: denoising, 400 updates, Adam 0.003, batch 64, ruido gaussiano 0.2.
- Adaptación: 160 updates, Adam 0.01, batch 32; gradual congela 80 y descongela 80.
- Último checkpoint fijo, sin búsqueda de hyperparameters ni selección con test.
  Validation se registra, pero no se usa para escoger una configuración ganadora.
- Los optimizers no necesitan holdouts. Sus métricas se calculan después de que
  todos hayan terminado. El audit previo de IDs para rechazar duplicados no toma
  decisiones de aprendizaje con las etiquetas de test.

## Resultados y controles conservados

Tres pretrainings reducen MSE de reconstrucción limpia en validation. Se archivan
21 adaptaciones: linear, scratch, head, gradual, full, LoRA y adapter por tres
seeds. Cada ejecución incluye las 256 predicciones y etiquetas target test.
Scratch iguala full en seed 7 y lo supera en 19/31; se conserva el resultado.
No se cambió el dataset ni el presupuesto para fabricar una victoria de pretraining.
La mayoría elegida con train es clase 1: accuracy test 0.46484375.

Clasificadores (total/entrenable): linear 18/18; scratch y full 298/298; head
298/18; gradual 298/18→298; LoRA 346/66; adapter 340/60. Encoder 280, decoder
previo 72. LoRA solo adapta la última matriz 16→8, rank 2/alpha 2: 48 factores.
El adapter final 8→2→8 con bias tiene 42; ambos añaden head de 18. No se declara
VRAM, tiempo, energía o calidad de un benchmark real.

Retención con decoder original y representación ACTIVA, sobre source test:

| Seed 7 | MSE antes | MSE después |
| --- | --- | --- |
| Head | 0.0181788448 | 0.0181788448 |
| Gradual | 0.0181788448 | 2.2659962 |
| Full | 0.0181788448 | 7.3951240 |
| LoRA | 0.0181788448 | 4.7172923 |
| Adapter | 0.0181788448 | 1.5846207 |

Scratch y linear no tienen proxy de forgetting; sus campos quedan null. La
primera captura presentaba reconstrucción scratch junto al encoder de otro modelo,
lo que no mide olvido. Se corrigió el reporte sin cambiar entrenamiento ni datos.
La MSE con decoder fijo no demuestra que toda la información sea irrecuperable.

El probe contrastivo usa tres pares normalizados de dimensión 2 y temperaturas
0.1/0.2/1; no entrena SimCLR. A T=0.2: loss 0.01332574; positivos intercambiados
2.9581666; colapso ln(3)≈1.0986123. Se contrasta el denominador manual y gradcheck.
La figura muestra la loss pequeña en notación científica, no como un cero aparente.

## Verificación efectuada

El runtime CPU por digest coincide con P103; se recuperó la imagen porque ya no
estaba en Docker. Python 3.13.17, NumPy 2.5.4, PyTorch 2.14.1+cpu; linux/amd64,
2 CPUs/2 GiB/un thread. Sin red, root y bind readonly, user 1000:100, cap-drop ALL,
timeout 300 s y limpieza solo del contenedor propio. Once hashes numéricos;
`verify` repite todos los entrenamientos, curvas, deltas y predicciones con
rtol 1e-5/atol 1e-7. Las dos copias JSON coinciden.

Pasan nueve tests Python y tres JS. Comprueban target limpio, loss contrastiva
manual/gradientes, identidad/merge LoRA, gradiente inicial A=0/B≠0, identidad del
adapter, preservación de pesos congelados, head idéntico/copia independiente,
disjunción y rechazo de solapamientos. Un test elimina todos los holdouts y las
etiquetas source antes de entrenar: el pretraining sigue funcionando y el
unfreeze pasa de 18 a 298 entrenables. JS reconstruye accuracy y confusiones.

Nueve extractos inline corresponden a fuentes ejecutadas; nueve D2/SVG y cuatro
plots. Inspección visual de las 13 figuras a 360 px y cuatro secciones del visor.
Chromium: 20 vistas a 1440/360; por ancho se verifican 21 runs, 168 filas de curva,
63 predicciones seleccionadas, confusion matrices, temperaturas, calculadora,
teclado, scroll, links e iframes; sin desbordamiento global ni pageerrors.
Informe final: `/tmp/model-adaptation-layout.2OKVCg/report.json`.

Se corrigieron un valor MSE aproximado, espaciado/URLs, el formato de loss pequeña
y once enlaces del roadmap que aún apuntaban a la carpeta editorial local.
El primer check h1 esperaba texto sin el ancla decorativa #; se corrigió la
expectativa usando el título real, sin modificar el producto.

Pasan 203 comprobaciones editoriales/estructurales y 17 tests del blog. Build:
50 rutas; Pagefind diez páginas/4280 palabras/dos idiomas. Los drafts permanecen
fuera de publicación. pnpm install offline/frozen: 45 proyectos, lockfile intacto.
44 labs, 328 índices y 168 exports. Inventario 79 draft_exists / 19 related_only /
77 not_written: existencia, no aceptación global. Sin commit, push, traducción,
audio o publicación automáticos. Servidor propio cerrado tras QA.

## Siguiente bloque

P105 exige tiempo y VRAM reales. Preflight: NVIDIA GeForce RTX 5070 Laptop GPU,
8151 MiB, driver 595.99.02 y /dev/nvidia0 presentes. El runtime actual es CPU;
falta comprobar acceso desde un runtime CUDA compatible y fijado por digest.
No modificar el driver del usuario. Definir antes de medir: warmup,
synchronize, repeticiones, batches/precisiones, VRAM allocated/reserved,
controles FP32 y OOM acotado. Dividir CPU/GPU/transferencias, batching, mixed
precision, accumulation, profiling y determinism en artículos específicos.
Este preflight no satisface el laboratorio P105.
