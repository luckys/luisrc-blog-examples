# Entity recognition: spans, BIO y evaluación (P107)

Siete artículos españoles en draft. Corpus original sintético de 32 frases,
PER/ORG, un anotador. Ningún dato personal real. Solo entidades planas y contiguas.

```sh
pnpm --filter @luisrc-examples/entity-recognition test
pnpm --filter @luisrc-examples/entity-recognition verify
```

`verify` valida anotaciones, hashes y reentrena las NUEVE ejecuciones, comparando
pesos, pérdidas, logits, predicciones y métricas. No reemplaza capturas.
`exercise` y `convergence` SÍ reemplazan sus resultados: no ejecutarlos para buscar
una cifra más favorable. `render` deriva el pack del visor y las dos curvas.

## Contrato

Texto original, sin normalización. Offsets por puntos de código Unicode,
intervalos [start,end). Partículas internas incluidas, títulos excluidos.
BIO estricto: I solo continúa una entidad compatible. El tokenizer agrupa
letras/marcas/números y emite otros símbolos no whitespace individualmente.
Los símbolos de un emoji compuesto pueden ser tokens separados.

Corpus train16/dev8/test8; dos negativos por split. Menciones:12PER/12ORG train,
4/4 dev,5/4 test. Alba se repite con sentidos distintos. No holdout por familias
sintácticas, evaluación ciega, representatividad o acuerdo entre anotadores.

## Capturas conservadas

- `annotation-audit.json`: tres hashes, recuentos y contrato, NO calidad NER.
- `results/training.json`: protocolo original previo a fitting, cinco hashes.
  Softmax lineal BIO,646features/3230pesos,138tokens train,full-batch GD .05,
  80pasos,seeds7/19/31. Las tres seeds predicen todo O. F1exacto0; accuracy test49/67.
  El diccionario train logra F1train1 y F1test0 (TP0,FP1,FN9,Alba tipo erróneo).
- `results/convergence.json`: protocolo ADICIONAL fijado antes de ajustar,
  ocho hashes. Solo cambia el número de pasos a800/1600; mismas tres seeds.
  Todas las ejecuciones logran F1train1,dev4/17,test4/21. En test TP2,FP10,FN7.
  La loss baja de ~.203 a~.098, sin cambiar labels/spans fuera de train.

El objetivo de optimización sigue siendo por token. Viterbi impone transiciones
fijas0/-Infinity, no es un CRF entrenado. No se ha entrenado un Transformer.
La alineación de subwords se prueba con fixtures manuales, no tokenizer real.
El test ya se había inspeccionado al fijar el contraste adicional: sus cifras
son descriptivas, nunca validación intacta o ciega. No cambiar fuentes capturadas
sin versionar una captura nueva y preservar las anteriores.

## Visor y métricas

`explorer.html`:32anotaciones,10variantes (diccionario+9modelos),predicciones
GUARDADAS,30resúmenes por split,curvas por seed y prueba de alineación.
Sin inferencia/API en vivo. `observations.json` omite pesos/logits; no es un modelo
descargable para ejecutar sobre texto nuevo. Código completo solo en este repo;
el blog recibe diez assets estáticos allowlisted.

Métrica principal:coincidencia exacta por documento/inicio/final/tipo, micro.
Un límite/tipo erróneo implica FP+FN. Denominador cero=null. Se conservan métricas
por tipo. Diagnóstico greedyIoU uno-a-uno para agrupar errores, sin modificar F1.
La finite-difference check contrasta una actualización con un cálculo independiente.

Ver [ruta editorial](../../docs/editorial/ruta-reconocimiento-entidades.md),
[glosario](../../docs/editorial/entity-recognition-glossary.md) y
[revisión](../../docs/editorial/entity-recognition-review.md).
