# P116: evaluación cuantitativa de RAG

Prerrequisitos P082/P093/P113/P115. Serie española, drafts, Luis Ramírez Calle.
Objetivo: detectar regresiones de recuperación y generación. Laboratorio obligatorio:
benchmark etiquetado y comparación real de modelos A/B sin tocar testgold.
No cerrar P116 por tener su ID o un dataset que valide; queda el experimento A/B.

## Entregas pequeñas por decisión

| Orden | ID | Pregunta central |
| --- | --- | --- |
| 1 | P116 | Qué referencia y splits necesitamos antes de comparar |
| 2 | RAG-RECALL-PRECISION | Qué recuperamos y cuánto ruido entregamos a k fijo |
| 3 | RAG-MRR | Dónde aparece la primera evidencia útil y qué pierde esa métrica |
| 4 | RAG-NDCG | Cómo evaluar orden cuando la relevancia tiene grados |
| 5 | RAG-CONTEXT-RELEVANCE | Qué contexto seleccionado aporta evidencia y qué queda fuera |
| 6 | RAG-FAITHFULNESS | Qué afirmaciones están respaldadas y cómo declarar el evaluador |
| 7 | RAG-COMPLETENESS | Qué puntos requeridos faltan aun en una respuesta sin invenciones |
| 8 | RAG-AB-BENCHMARK | Qué cambia al comparar realmente dos modelos con protocolo fijado |
| 9 | RAG-LATENCY-COST | Qué tiempos, tokens y costes podemos medir con el alcance disponible |
| 10 | RAG-REGRESSION-GATES | Cómo decidir con diferencias por caso, denominadores e incertidumbre |

Cada entrega: mecanismo, ejemplo calculable, código inline probado y laboratorio
externo, diagrama/figura/visor, trade-offs, fallos, ejercicio y fuentes primarias.
Ampliar/dividir si una decisión necesita más detalle, sin mezclar métricas semánticas
con simples contadores de IDs o coincidencias textuales.

## Estado vigente: cinco borradores verificados de diez

Se añade RAG-CONTEXT-RELEVANCE (1979 palabras). Tres recursos visuales nuevos y
visor context.html. Captura real de120 composiciones/474conteos con dos tokenizers,
no generadores. Presupuestos256/384/1536; cuarenta entradas sin fuentes a256,
ochenta con fuentes. Las entradas de384y1536 coinciden, no se retocan presupuestos.
Gold, ranking y configuración A/B intactos. Q002 sigue incompleto; Q018sin evidencia.

266pruebas editoriales/estructura,44lab,17blog. Verifydefault y recontar474con
--tokenizers pasan. QA /tmp/rag-evaluation-layout.FrhU07/report.json:5posts360/1440,
11SVG,120contextos porancho además de gold/ranking, teclado, fuentes/rangos/roles/IDs/
revisiones/ratio/null exactos,0JSerrors/overflow. Ver rag-evaluation-review.md.
Cinco entregas restantes y A/B real pendientes; no aceptar P116 por estos recuentos.

## Histórico: cuatro borradores verificados de diez

P116, RAG-RECALL-PRECISION, RAG-MRR y RAG-NDCG verificados. Seis entregas y
comparación real A/B pendientes. 20 búsquedas BM25 fijadas, 80 evaluaciones.
26 tests de laboratorio, 264 editoriales/estructura y 17 del blog. QA
/tmp/rag-evaluation-layout.phafTq/report.json: 360/1440, cuatro posts, ocho SVG,
112 evaluaciones de visor/448 focos por ancho, teclado y tabla con scroll local.
Cero errores JS/desbordamiento. Detalle en rag-evaluation-review.md.

## Histórico: estado del primer bloque

P116 redactado; laboratorio rag-evaluation. Corpus nuevo16docs/32hechos,20preguntas
agrupadas:dev5 de2temas,test15 de6temas. Gold320juicios exhaustivos,16answerable,
4unanswerable. SHA de datos antes de cualquier ejecución de modelo.10 tests TDD.
Datos redactados y públicos, no ciegos ni representativos; sin anotadores independientes.
Verificación estructural no demuestra corrección semántica. Primer borrador verificado: 261 pruebas editoriales/estructura, 17 del blog, 10 del laboratorio; QA móvil/escritorio sin errores ni overflow. Comparación A/B y nueve entregas restantes pendientes.

## Protocolo que debe cerrarse antes de A/B

- Fijar dos checkpoints reales con revisión y hashes antes de capturar test. Modelos
  candidatos se eligen en dev; no reabrir selección mirando test.
- Mantener corpus/gold iniciales. Si hay error de anotación, nueva versión y registro
  explícito, nunca sobrescribir resultados. No usar gold en los prompts.
- Separar inferencia del evaluador. Medir recuperación/contexto y generación aparte.
- Definir parsing estricto, fallos, noanswer y denominadores antes de respuestas.
- Conservar raw outputs,eventos,versiones,fallos y procesos terminales. No reruns para
  mejorar una media o reparar JSON sin protocolo nuevo.
- Revisar semántica de afirmaciones con rúbrica declarada; los controles escritos
  enseñan métricas, no sustituyen una evaluación de generaciones reales.
- Modelo/LLM-as-judge y calibración humana pertenecen a P117. No afirmar que un
  revisor automático es humano ni llamar acuerdo humano/modelo a dos scripts.
- Definir reloj/inclusión de cold start,warmup,entrada/salida,padding,cache y precios.
  Hardware local no demuestra costes cloud; precios hipotéticos rotulados como tales.
- Informar resultados por pregunta, fallos y límites; test pequeño, público y no ciego.
  Ningún resultado de estas20preguntas demuestra generalización universal.

## Límites heredados

P11461generaciones fallidas,ninguna respuesta aceptada o abstención conforme.
P115 verifica propiedades de arquitectura sin ejecutar el generador. Mantener esas
capturas y límites; un nuevo experimento puede aportar evidencia adicional, no borrar
los resultados anteriores. Objetivo175 activo; gapsP026/P045Stripe/P058soak intactos.
