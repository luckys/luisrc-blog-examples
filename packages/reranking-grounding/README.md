# Reranking, grounding y citas: ocho borradores verificados

Ocho borradores españoles, código de laboratorio fuera del blog. Se añadió una entrega
específica sobre formato porque ninguna salida del generador cumplió el contrato.
No tratar esa falla como mejora de respuesta ni reparar JSON para cambiar el resultado.

## Auditoría, sin ejecutar los modelos

Node24.19.0/pnpm12.8.1; dependencias solo mediante pnpm.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @luisrc-examples/reranking-grounding test
pnpm --filter @luisrc-examples/reranking-grounding verify
```

verify es readonly: hashes,215pares/216salidas físicas,120comparaciones de candidatos,
240selecciones,80escenarios,61prompts,61salidas,notas editoriales y10controles de citas.
No requiere pesos ni red ni inferencia. La etiqueta semántica sigue siendo editorial,
no un verificador de entailment general ni revisión independiente por varios anotadores.

Con los archivos de tokenizer ya preparados se puede contrastar todo el conteo:

```sh
node packages/reranking-grounding/verify.mjs --tokenizer
```

## Capturas y resultado principal

protocol.json,rubric.json,system-prompt.txt yfuentes de captura se fijaron antes de
inferir. Corpus P113:13chunks/367unidades/3documentos,20preguntas conocidas (10dev,
8test con respuesta,2negativas test). No test ciego ni capacidad de producción.

Cross encoder real BGE reranker v2 m3 ONNX,q8CPU;215pares únicos,27lotes de8,1posición
repetida técnica registrada pero no contada como otro candidato. Logits sin sigmoid ni
umbral posterior;max71tokens bajo límite de trabajo192.27llamadas suman11.72s de modelo,
excluyen carga/tokenización; no comparativa de latencia end-to-end.

Contextos greedy de chunks completos,3máximo;presupuestos96/160/256 con tokenizer real
del generador. Para respuestas se fija256. Max177tokens de contexto/max396 de prompt.
Mismos prompt y generador Qwen2.5-0.5B-Instruct ONNX,q8CPU,max160nuevostokens,greedy.
80escenarios→61prompts únicos (idénticos comparten resultado).4930tokens generados,
23salidas alcanzan límite. Ninguna aceptada:58JSON inválido,3estado/afirmaciones
incompatibles.80rechazos técnicos; no acreditarlos como abstenciones correctas.

RRF mejora evidencia test con rerank de.85417a.97917;BM25ya tenía.97917. Respuestas
válidas0en ambas variantes. No cambiar modelo,prompt,parser o etiquetas tras mirar
resultados. Otro experimento requiere nuevos protocolos/rutas yconservar este fallo.

Las61salidas se leyeron antes de agregar calidad. annotations.json identifica revisión
editorial por el asistente, no aprobación del usuario.15extractos diagnósticos ilustran
apoyo,ausencia de justificación yfabricación; no segmentación exhaustiva de salidas rechazadas ni
respuestas promovidas a válidas. Q02tresenlaces resolubles:dos apoyan retención yS11no.

## Citas y controles

AliasesS01..S13→chunk/documento/versión/representación/rangoUTF16. citationFor exige
referencia en contexto;sourceLink conserva identidad completa;source.html valida y
resalta rango. Manipular versión/rango no redirige aotra revisión. Resuelve hashchange.
Controles redactados aparte de inferencias:10casos,3enlaces válidos pero solo1etiquetado
como apoyado. No confundir existencia de enlace con apoyo semántico ni criterio ACL.

## Captura original (no necesaria para auditar)

```sh
pnpm --filter @luisrc-examples/reranking-grounding models:fetch
pnpm --filter @luisrc-examples/reranking-grounding prepare
pnpm --filter @luisrc-examples/reranking-grounding capture:reranker
pnpm --filter @luisrc-examples/reranking-grounding prepare:answers
pnpm --filter @luisrc-examples/reranking-grounding capture:answers
pnpm --filter @luisrc-examples/reranking-grounding evaluate
```

Los archivos ya existen:capturas rehúsan sobrescritura. Cada respuesta se guarda
inmediatamente por hash de prompt; eventos started/completed permiten auditar un
reinicio técnico, sin seleccionar repeticiones. Esta ejecución se completó una vez.
Modelos públicos por revisión,bytes ySHA (Git blob paraJSON noLFS);no firma del editor.
Pesos en .cache ignorada,no exportados. No API keys. Dependencias JS mediante pnpm.
Lock histórico conservado. No modificar fuentes de captura con hashes.

Derivados de lectura:

```sh
pnpm --filter @luisrc-examples/reranking-grounding render
node packages/reranking-grounding/render-charts.mjs
```

8paneles,8figuras yvisor de fuentes;sin modelos en navegador.16exports estáticos, sin
pesos ni laboratorio completo. Ver docs/editorial/reranking-grounding-review.md.

review-corrections.json conserva una rectificación editorial: includes idioma no excluye
otros campos; Q11 campos añadidos pasan de contradicted a unsupported en la presentación.
Las capturas originales y los agregados operativos no cambian; hashes vinculan el cambio.
