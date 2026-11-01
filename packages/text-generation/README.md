# Text generation: laboratorio P109

Generación real reutilizando los pesos congelados de P108, modelSeed7. No se
reentrena ni se elige la seed con mejor test. Siete drafts en español acompañan el laboratorio, con siete diagramas, tres
figuras y un visor de capturas. Ocho exports estáticos; los pesos permanecen aquí.
La revisión de esta ficha no implica completar el roadmap editorial entero.

## Verificar

```sh
pnpm --filter @luisrc-examples/text-generation runtime:fetch
pnpm --filter @luisrc-examples/text-generation test
pnpm --filter @luisrc-examples/text-generation test:container
pnpm --filter @luisrc-examples/text-generation verify
```

Verify repite los36rollouts y controles con rtol1e-10/atol1e-12; audita las trazas
de streaming y recalcula medianas, sin afirmar que los tiempos se reproduzcan.
Exercise SÍ reemplaza results/observations.json. Stream:measure SÍ reemplaza
results/streaming.json. No usarlos para buscar resultados más favorables.
Data:prepare regenera inputs.json usando el tokenizer de P108 y puede invalidar
hashes. No hay lifecycle prepare en instalaciones.

## Protocolo previo y generaciones

Dos prompts:«el equipo» y«la ingeniera consulta los». Estrategias:greedy,
samplingT1,T.5,T1.5,top-k2,top-p.8. SamplingSeeds11/23/47,distintas de modelSeed7.
Los36rollouts incluyen greedy repetido. MaxNewTokens10,EOSemitido y registrado,
sin supresión de PAD/BOS/UNK. Todos los eventos guardan IDs de contexto,logits,
probabilidades originales/temperadas/de selección,soporte,masa retenida,uniforme,
token elegido y probabilidad bajo modelo y política.

Orden:T→exact top-k con empate por ID→renormalizar→mínimo prefijo top-p que
cruza el umbral→renormalizar. Variantes medidas usan como máximo un truncador;
los tests también comprueban composición. LCG32 didáctico e inverseCDF en orden
de ID; una draw por token sampleado, ninguna en greedy. No es RNG criptográfico.

Captura válida2026-10-28T23:49:22.920895+00:00,nueve hashes incluyendo checkpoint
y model.py originales. 36rollouts,144tokens, todos terminan enEOS. Greedy principal:
revisa/la/propuesta/./EOS. Top-k2 cambia el soporte del primer paso y genera
publica/los/datos o resultados. Varias temperaturas dejan secuencias iguales.
T1.5/seed47 emite consulta/los/BOS/./EOS. Conservar ese fallo; no atribuir mejoras
automáticas de gramática,conocimiento o diversidad a subir temperature.

Una primera captura provisional tenía colisión de campos steps(array/conteo),
detectada por el runner. Se corrigió el esquema a steps+tokenCount y se repitió
el MISMO protocolo antes de aceptar la captura válida. No tuning de modelo.

## Límites de contexto

EOS,max_new_tokens ycontext_limit son razones separadas. Prompt21IDs se rechaza
por defecto. El control explícito left_preserve_bos conserva BOS+últimos15 IDs,
reinicia posiciones y registra tokens omitidos. Es fuera del contexto de train,
no una garantía de calidad o una política silenciosa recomendada. Los tests usan
modelos fijos para forzar cada condición sin depender de que el modelo emitaEOS.

## Streaming real y medición

Stream.py carga el modelo,emite ready y espera requests por stdin. Después calcula
cada token y lo envía por JSONL stdout con flush; no precomputa una transcripción
ni introduce sleeps. El cliente Node envía cada request DESPUÉS de ready y captura
líneas,IDs de chunks y tiempos relativos hrtime. El productor usa perf_counter.
No se comparan timestamps absolutos de procesos distintos.

Dos warmups y cinco medidas, todos con cinco tokens incluidosEOS. Captura
2026-10-28T23:51:16.571Z,nueve hashes,CPU IntelCoreUltra9 285H,Node24.19.0,
Python3.13.17/torch2.14.1+cpu,unthread,dosCPU/2GiB límiteDocker. Medianas cliente:
TTFT1.125774ms,total1.946817ms,intertoken0.1745685ms. Esto describe UN pipe local,
modelo3205parámetros,sin KVcache ni concurrencia. No es benchmark de un LLM/API,
GPU,red o HTTP. Se excluyen startup/carga previos a ready y tokenización previa.

R3:productor termina~1.296ms,cliente~3.338ms;varios eventos llegan en un chunk.
R4:primeros dos tokens comparten chunk. Media intertoken=(último-primero)/(n-1),
puede aparentar menor intervalo por coalescencia. InferenceStepMs incluye forward,
validación,sampling y trabajoPython,NO tiempo puro de kernels. Elapsed productor
incluye trabajo y emisiones previas;TTFTcliente incluye transporte/scheduling.

## Aislamiento y continuación

Contenedores propios aleatorios,red none,rootfs y dos binds readonly,cap-drop ALL,
user1000:100,2CPU/2GiB,timeout300s,limpieza solo del nombre propio. No cambios a
P108. Cinco tests JS, cuatro Python y verify completo pasan. 227 comprobaciones
editoriales/estructura, 17 del blog, build/Pagefind y Chromium a 360/1440 pasan.

El visor permite recorrer cada decisión, contrastar 240 combinaciones de filtros
sobre logits guardados y revisar siete peticiones de streaming. Solo replay,
sin inferencia ni streaming en vivo. Próximo bloque editorial: P110.
Ver docs/editorial/ruta-generacion-texto.md y text-generation-review.md.
