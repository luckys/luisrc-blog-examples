# Continuación del objetivo editorial completo

## Avance en curso: comparación A/B REAL iniciada; observar antes de actuar

2026-11-04. Objetivo175 activo. Cinco drafts P116 verificados; faltan cinco entregas.
La comparación de generadores está EN CURSO, aún no existe results/generation.v1.json.
NO volver a preparar entradas ni lanzar otro capturador sin inspeccionar procesos.

Handle exec vigente57005: node packages/rag-evaluation/capture-generations.v1.mjs,
log /tmp/p116-generations-resume.log. Última comprobación viva: controller735216,
workerA-02PID735228. Consultar SIEMPRE:
node packages/rag-evaluation/inspect-generation-progress.v1.mjs
Ese script comprueba PIDs reales, no sólo un lock. Poll write_stdin del handle57005.

Ejecución inicial handle89039 dejó de existir tras pausa solicitada. Se comprobó
controller721930 y worker721941 MUERTOS antes de reanudar. Guardó10salidasA-Q001..010;
A-Q011tenía case_started sin resultado. Al reanudar se conserva como
interrupted_unknown,raw/generatedIdsnull, NO se repite. Quedan casos nunca iniciados.
La reanudación creó sesiónA-02 y luego ejecutaráB. A-01 yA-02 tienen tiempos de carga
separados; no atribuir la diferencia de latencia a tamaño del modelo sin ese límite.

Preparados modelos reales con prepare-generators.v1.mjs: A512096557bytes de pesos,
B1578954293bytes de pesos, más JSONmetadata. Revisiones ya fijadas enplanv1:
A22942cb7d7ba4cc81bb4673549ca4d4614469b5e y Bd54957e3af1be04546436e874a60fe386041b244.
LFS/Gitblob/SHA verificados; A reutiliza caché validada, B descargado. Pesos quedan
.cache/generators ignorados. No instalacióndeps nueva: sigueHF3.8.1. Disco618GiBfree,
RAM54GiBfree/62GiBtotal,16CPUs vistos; runtime fuente en generation-inputs.

ANTES de decodificar se fijaron response-rubric.v1.json,generation-protocol.v1.json,
response-contract.v1.mjs,response-evaluation.v1.mjs,helpers/worker/parent y40inputs
sin gold en results/generation-inputs.v1.json. 73tests pasan (44previos+12schema+
14semántica+3estado). ContratoJSONcompleto,clavesduplicadas/citasajenas/estados
inválidos rechazados; sinfencesstrip/repair/retry. Evaluación separa fidelidad,
completitudgold,completitudgrounded,citas ypolítica según evidencia realmenteentrada.
UnnoanswerporQ002puedesercontextocorrecto yseguir sinresponderpreguntaanswerable.
Todos los spansdelanswerdebenrevisarse ymatchGoldrazonado; evidenciarequierequote/
revision/rangos de fuente PROVIDED. Semanticjudgments son revisión editorial del
asistente, no humanos independientes ni experimentoLLMjudge. RúbricaSHA va enreviews.

FROZEN: todos los archivos listados en generation-inputs.v1.sourceHashes, ahora
con salidas reales. NO editarlos tras ver resultados. Parent/verifier nuevos que NO
están en hashes pueden añadirse; para corregir experimentov1 conservar fuenteoriginal
ynuevaversión/artefactodecorrección, nunca mutar para volverloverde. Scripts:
verify-generations.v1.mjs está listo para artefactofinal (no ejecutar hasta completo),
--tokenizers re-decodedIDs, --models rehash pesos (noinferir). Inspectprogressreadonly.
Capturadorconsume caso startedconresultadoperdido como interrupted_unknown; sólo
neverstartedpuedeejecutarse. Lockparent ycheckPIDs impidenduplicación. Unloadfailure
sepreserva ynoejecutados marcados, nunca fingir que hubo inferencia.

Últimos datos PARCIALES:14resultadosA=13generatedinvalid_json+1interrupted_unknown;
Bsin resultados aún. No tomar esos números por final ni inferir ganador. Algunas
salidasA usanprosa/Markdown e incluso TTLconfundidoconbytes; no puntuarlas
semánticamente si contrato invalido. No leer sólo campos extraídos de texto averiado.
Preparar artículos RAG-FAITHFULNESS/RAG-COMPLETENESS con datos reales una vezavailable;
si hay0salidas semánticamente elegibles, null con denom0 y límites explícitos, no
inventar éxito con controles redactados. A/Bcapítulo8,latencycost9,gates10 pendientes.

Primarysources ya consultadas: arxiv.org/html/2309.15217v2 secciónFaithfulness;
arxiv.org/abs/2305.14251 FActScore; arxiv.org/abs/2305.14627 ALCE. No ejecutamos esos
frameworks ni apropiamos sus puntuaciones. Los controles unitarios son ficción
separada, no outputs del modelo. No nuevos commits/push/publicación/traducción/audio.
Conservar P11461fallidas y gapsP026/P045Stripe/P058soak. Serie02sóloDSA. Revisar
históricos siguientes para fullscope, contadores y tests hasta el quinto draft.

## Histórico: P116 cinco borradores verificados; sigue evaluación de respuestas

2026-11-03. RAG-CONTEXT-RELEVANCE añadido,1979palabras; manifest5/10in_progress,
verifiedIds5. Faltanfaithfulness,completeness,A/Breal,latency/cost,gates. Objetivo175
activo;91draft_exists/19related_only/65not_written,completionProvenfalse.421índices/
332exports/56labs/57workspaces. P112–P116 sincommit; noautocommit/push/publicación/
traducción/audio. Serie02sóloDSA y gapsP026/P045Stripe/P058soak intactos.

Nueva captura packages/rag-evaluation/results/contexts.v1.json,120composiciones,
474conteosreales,2tokenizers3límites256/384/1536. DiezJSONmetadata14,082,967bytes,
cacheignorada,no pesos. HF3.8.1añadido víaPNPMoffline. Modelos A/Bmismosfijados de
planv1; no cambiarlos. No inferencia. 40empty_context a256 (base212–226tokens),80ready
con fuentes320–383. Todaslasentradas384y1536idénticas porperfil/query, no ajustar
límites para inventarescalones. Q020sólo2candidatos,otras19tienen3. 60paresA/Bcoinciden
prompts/IDs. Baseline1536conserva todoscandidatos/mensajesiguales para futuroA/B.

Selecciónnogold,whole sources,ordentop3,skipnofit,sinbackfill. Evaluadordespuésgold:
ratioDocsRelevantes/seleccionadas (vacío=null),hechoscubiertos/requeridos (0/2=0,
0requeridos=null),rangoanotadounión/textocuerposUTF16 (vacío=null). Proxycustom,no
Ragas/juiciosemántico. Q008a256:221tokens,nofuentes; a384/1536:371tokens,3fuentes,
docs2/3,hechos2/2,105/291unidades. Q007docs1/3hechos2/2. Q002sigue.5,no backups-2
enloscandidatos. Q018tienefuentespero0relevantes,hechosnull. Ready no es answerable.

CONGELADOSporhashesnuevos: context-core.v1.mjs,capture-context.v1.mjs,
context-protocol.v1.json,context-tokenizers.v1.json,prepare-tokenizers.v1.mjs,
context-dependencies.v1.json,comparison-plan.v1/systemv1,rankings.v1,corpus/queries/
gold/dataset-manifest/dataset.mjs/verify.mjs. No editar ni volver a capturarv1.
Verificador nuevo verify-contexts.v1 defaultreplaymedidas; --tokenizersreencode474.
Ambospasan. Metadata10JSONporGitblob/SHA. Rootlockprevio1b24 no estaba referenciado,
snapshotlocalnuevo evita mutar evidenciadependenciasvieja. Cache.node_modulesfuera
índices. Presentación/render/nuevosverifierseditables; código congelado no.

44labtests(18context+16rank+10data),266editorial/estructura,17blog pasan.
QAfinal /tmp/rag-evaluation-layout.FrhU07/report.json:5posts360/1440,noindex,
11SVG,120contextcasesademás20gold/16docs/112rankcases448focosporancho. Roles/IDs/
prompts/textos/rangos/ratio/null/revisiones/teclado exactos,0errors/overflow.
TresSVGy4UIcontextinspeccionados. Llamada README+QAauto-reviewtimeoutnoinicióproceso;
reintentoestrechounavez completó, no rechazo seguridad ni bloqueo. Buildfinal50rutas;
Pagefind10públicas4280palabras2idiomas. Servidor propio612461 detenido; ningún modelo, capturador, QA o servidor propio
pendiente.

SIGUIENTE RAG-FAITHFULNESS y RAG-COMPLETENESS: necesitan respuestas evaluables,
no simular que controles escritos son salidas de modelo. Preparar carga/capturaREAL
A/B con planv1 ycontextosbaseline1536YA FIJADOS, doscheckpointdistintos,metadatapesos
porrevSHA. A Qwen2.5-0.5B22942cb...,B1.5Bd54957e...,q8CPU1hilo,greedy192tokens,
JSONestrictoexactstatus/answer/citations. SinGoldenPrompt,sinrepararJSON,sinretries
favorables. Planstatusnot_executedhistóriconosemuta. Se puede ejecutarA/Bantes de
redactarcapítulos6/7; capítulo8explicará experimento, no cambiarordenpedagógico.
Rúbrica/criterios deben fijarse ANTES de ver outputs; distinguir validez técnica,
respaldo semántico,completitud,citas,answerable/noanswer. Revisión editorial≠humano
independiente niLLMjudge (P117). Tokens/latencias se miden en capturadordesdeprimera
carga con boundariesdeclarados; warmup/coldload yfallos completos. No nuevosdatos
para favorecerresultado; goldv1intacto. Si falla,guardarfallo y no sustituirresultados.
P11461fallidas,no generaciónútil/abstenciónconforme demostradas aún; conservar.

## Histórico: P116 cuatro borradores verificados; sigue context relevance

2026-11-03. P116manifiesto4/10,in_progress,verifiedIds los4artículos. Nuevos:
RAG-RECALL-PRECISION, RAG-MRR, RAG-NDCG (~1670/1571/1711palabras), con 3diagramas,
3figuras y visor ranking.html. Seis entregas pendientes y comparación real A/B.
P1159draftsverificados; objetivo175activo,no completo. Inventario91/19/65,
completionProvenfalse. 420índices/327exports/56labs/57workspaces.
P112–P116 sincommit; no commit/push/publicación/traducción/audio automáticos.

Nueva captura única packages/rag-evaluation/results/rankings.v1.json,20búsquedas
BM25 reales/80evaluaciones a k1/2/3/5. No inferencia ni benchmark de latencia. Perfil
fold,k1=1.2,b=.75,título+cuerpo,sin stemming/stopwords,score>0,tieIDascendente.
Runner no recibe gold. Hashes congelan capture-rankings.v1/retrieval-runner.v1/
ranking-metrics.v1/ranking-protocol.v1/ranking-controls.v1/comparison-plan.v1/
comparison-system.v1/corpus/queries/gold/dataset-manifest/dataset.mjs/verify.mjs y
../lexical-search/retrieval.mjs+analysis.mjs. NO editarlos. Verificador nuevo
verify-rankings.v1 hace replay readonly exacto, no re-ejecutar el capturador.

Plan de modelos y prompt fijados ANTES de observar testretrieval: Aonnx-community/
Qwen2.5-0.5B-Instruct rev22942cb7d7ba4cc81bb4673549ca4d4614469b5e; BQwen2.5-1.5B-
Instruct revd54957e3af1be04546436e874a60fe386041b244. HFAPI pública confirmaSHA/ruta
onnx/model_quantized.onnx. q8CPU1hilo,greedy192tokenssalida,inputlim1536,k3,mismos
textos fuentes completos,JSONestricto; sin gold enprompt ysinrepararsalidas. Planstatus
not_executed es histórico de su creación, no debe mutarse tras generar resultados.
No pesos B descargados/cargados ni generaciones nuevas. El futuro experimento debe
validar archivos fijados yconservar todosoutputs/fallos. No cambiarlos por ver test.

Métricas:relevantegrado>=1,P dividek incluso lista corta,goldvacíoP0/R/RR/nDCGnull;
nohitcongoldpositivo0. Gain2**grade-1,discountlog2(rank+1),IDCGtodosqrels.
Test12answerable:MRR=1 todoscutoffs,Recall@1=.75→1desde2,P@3=.5; all15P@3=.4.
Dev4:Recall@3=.875,MRR@3=.875,nDCG@3=.8467132018086354. Q002faltabackups-2
hasta5,Recall.5; preservar. Cuatro noanswer con candidatos, NOerrorgeneradorprobado.
Gold no mezcla1y2positivos dentrodequery; ocho controles escritos aparte (C05/C06
nDCG1/.7967 conP/R/RRiguales), nunca atribuir a búsquedas o modelos esos controles.

264editorial/estructura,26lab,17blog pasan; verifyallpnpm pasa. Buildfinal posterior
al wrapper de tabla se ejecuta en este cierre (consultar logs p116-four-final-build).
QA /tmp/rag-evaluation-layout.phafTq/report.json:4posts360/1440,noindex,
0JSerrors/overflow,20goldqueries16docs,112rankingcases/448focos porancho,8SVG.
6SVGnuevos y4vistas inspeccionados. QAinicialDUXnKz falló por tablaRP420px; región
scrolllocal conArrowRight lo corrige. No alterar código/datoscapturados paraeso.
Servidor propio561421 detenido; no modelo, captura, QA o servidor propio pendiente. Sin instalaciónnueva; Node24.19,pnpm12.8.1.

SIGUIENTE RAG-CONTEXT-RELEVANCE: evaluar evidencia realmente seleccionada, distinguir
ranking top-k de contexto, presupuesto y redundancia. Usar datasetv1 y captura BM25 intactos;
si hacefaltaprotocolo/capturanueva con hashes/versiones propios. No editar fuente
congelada. Despuésfaithfulness/completeness,comparaciónA/Breal,latencia/coste,gates.
Modelo-judge/calibraciónhumana esP117; no llamar revisión automática humana.
P11461generacionesfallidas yningunaabstenciónconforme siguen sin corregirse. Gaps
P026/P045Stripe/P058soak ySerie02sóloDSA intactos. Objetivo completo no probado.

## Histórico: P115 cerrado como borradores; P116 primera entrega verificada

2026-11-03. SerieP1159/9verified_drafts, auditoría explícita en rag-architecture-review.
P116 comienza Evaluación RAG: datos, métricas y regresiones,10entregas previstas,
1verificada,9pendientes; editorialStatein_progress. Ver ruta-evaluacion-rag.md,
rag-evaluation-series.json y rag-evaluation-review.md. Objetivo175activo, no completo.
Inventario91draft_exists/19related_only/65not_written,completionProvenfalse.
417índices/321exports/56labs/57workspaces. P112–P116 sin commit. No publicación,
traducción,audio,push o commits automáticos. Preservar todos los cambios previos.

Nueva fuente española: evaluar-rag-gold-dataset-splits-etiquetas.md,2089palabras,
drafttrue/statusdraft,autorLuis,prerrequisitosP082/P093/P113/P115. Dos diagramas,
visor gold con todos los juicios/rangos/docversiones, fuentesTREC/NIST/Ragas.
Labnuevo packages/rag-evaluation, sin dependencias nuevas ni instalación necesaria.
Datos:16docs/32hechos,20queries,dev5 de2grupos/test15 de6grupos,16answerable/
4unanswerable;320juicios:296grado0/16grado1/8grado2. RangosUTF16. No modelos
ni retrieval ejecutados en este bloque; noA/B. Dataset sintético público conocido
por autor, no ciego/representativo; sin revisión semántica independiente.

NOEDITAR corpus.json,queries.json,gold.json de versión1: SHA en dataset-manifest.json,
comprobado por verify.mjs. No es captura experimental ni prueba de anotación correcta.
Cambiar versión/motivo si hay un error, no retocar gold para favorecer modelo.
Validator/tests/render/visores aún editables (no cubiertos por fuentes de captura).
TDD10tests,último altera copia temporal de gold y se rechaza porhash;pnpmfiltertest
publicado probado. Primero9testsrojos/móduloausente, luego9green; hashred→10green.

261editorial/estructura,17blog,10lab pasan; build50rutas,Pagefind10públicas4280palabras/
2idiomas. QAfinal /tmp/rag-evaluation-layout.xMmXSh/report.json:360/1440,
20queries16docs porancho,2SVG,barras/textos/referencias/splits/teclado,noindex,
0JSerrors/overflow. Diagramas yQ008/Q018 revisados visualmente; etiquetas espaciadas.
Servidor propio556618 detenido; nada de captura/modelo/QA/servidor propio pendiente.

SIGUIENTE RAG-RECALL-PRECISION: desarrollar conceptos con ejemplo exacto y dataset
fijado. Rubricgrado>=1como relevante binario debe declararse, no sumargradoscomoIDs.
Gold vacío implica Recallnull; fijar denominadorPrecision@k para listas cortas y
reportar casos/fallos/splits separados. No presentar scores aún no ejecutados.
DespuésMRR,nDCG,context relevance,faithfulness,completeness,A/B,latencycost,gates.
El laboratorio P116 exige comparación real de DOS MODELOS, no dos prompts/profiles.
Fijar sus revisiones/inputs/criterios antes de test; conservar outputs/fallos; no
usar gold en prompt. Si se usan respuestas redactadas para enseñar métrica, rótulo
control/manual y no atribuirlas a generación. Modelo-judge/calibraciónhumana esP117.
P11461fallidas,generaciónútil/abstenciónconforme no probadas. GapsP026/P045Stripe/
P058soak ySerie02sóloDSA intactos. Históricos a continuación pueden tener contadores
anteriores; estado vigente es este bloque.

## Histórico: P115 nueve borradores verificados; siguiente P116

2026-11-03. P115:9/9,verified_drafts; ver rag-architecture-review.md para auditoría
requisito→artículo→evidencia. 416índices/317exports,55labs/56workspaces. Objetivo175
activo, inventario90draft_exists/19related_only/66not_written,completionProvenfalse.
No publicación/traducción/audio/push automáticos. P112–P115 siguen sin commit.

Context design y cierre terminados. results/context.json:60composiciones,
34ready/8base_over_budget/6no_evidence/12rejected_scope,165conteos reales con ochoJSON
del tokenizerQwen fijado; no pesos ni inferencia. context-dependency-lock.capture.json
nuevo preserva lock anterior de protocolos originales. No modificar fuentes
congeladas por SHA. --tokenizer permite recontar sin modelo. T05@320 contrasta
1fuente+H3/254tokens frente3fuentes/167tokens; @512coinciden443. Reserva64.
results/generation-contracts.json deriva34prepared_not_executed/26not_prepared;
executedfalse60/60. No fine-tuning o comparación de calidad real en P115.

257editorial/estructura,44lab,17blog pasan; siete verifiers readonly; build50rutas,
Pagefind10públicas/4280palabras/2idiomas. QAfinal
/tmp/rag-architecture-layout.K2fobR/report.json:9posts,20SVG,360/1440,noindex,
0JSerrors/overflow,teclado. 60contratos×3capas por ancho además de todos los casos
previos. Primer testblog se solapó con build y leyó dist incompleto; rerun posterior17/17,
sin cambios de producto. Servidor propio553764 detenido; ningún proceso pendiente.

SIGUIENTE P116: evaluación cuantitativa de RAG. Gold datasets, Recall/Precision@k,
MRR,nDCG,context relevance,faithfulness,completeness,latency/cost. Laboratorio exigido:
benchmark etiquetado y comparación modeloA/B sin tocar testgold. No presentar el
corpus conocido de P113–P115 como test ciego ni renombrar configuraciones como dos
modelos. Definir datos/splits/criterios/versiones y protocolo antes de capturar.
P11461generaciones fallidas y generación útil/noanswer conforme siguen no demostrados.
GapsP026/P045Stripe/P058soak ySerie02sóloDSA intactos. No reducir objetivo global.

## Histórico: P115 siete borradores verificados; comienza context design

2026-11-03. RAG-UPDATES añadido (~2000 palabras). Manifest7/9 in_progress; faltan
context design y RAG vs fine-tuning. 414índices/308exports,55labs/56workspaces.
Inventario90/19/66,completionProvenfalse; objetivo175 activo. No commits/push/audio,
publicación o traducción automáticos. Preservar capturas y todos los cambios previos.

Nueva captura única packages/rag-architecture/results/updates.json, fuentes congeladas
porSHA: updates-core/schema/protocol/cases/v2-corpus/capture más fixture/cache/baseline
schema/runtime/corpus/lock local. No editar/repetir. 3 intentos: candidata11rechazada,
12completaactivada,viejo puntero esperado rechazado0filas. SHARE durantevalidación/
activación; applicationSELECTonly. Dos solicitudes RR con transacciones solapadas:
oldbindv1→activatev2→newreadv2/commit→oldrereadpointerv1/snapshot→oldreadv1/commit.
No benchmark concurrente. 11búsquedas,4hits,7lecturasfuentes,TTL60000sinexpirytest.
9citas,4resueltas. ACLactualen tabla document_acl independiente decontenido; alphaCache
nivel0→1yepoch2atómicos. Reader ya no resuelve v1/v2,manager sí; stored_access_level0
no autoriza frente a effective access_level1. Datos antiguos no se mutan. No GC,
rollbackav1,backup/failover/ANN/LLM uoffsets de cita nuevos. 67eventos de aplicación.

verify-updates readonly pasa conreplay/cache/roles/orden/citas/hash. 6unitarias nuevas,
32lab totales,255editorial/estructura,17blog. Build50rutas;Pagefind10públicas/4280palabras/
2idiomas. QA /tmp/rag-architecture-layout.DWH4eq/report.json:7posts360/1440,previos56queries/
69probes/21convos/44workflows104prefijos/22cachecases; nuevos67eventos11reads9citations
porancho.15SVGconbounds correctos;3SVGnuevos y3vistas inspeccionados;0JSerrors/overflow,
teclado pasa. Servidor propio548437 cerrado. Ningún proceso de captura/QA/modelo pendiente.

SIGUIENTE context design. Tokenizer Qwen local de P114 en .cache/generator (sinmodelname).
No cargar modelos/pesos. Añadir HF3.8.1 mediantepnpm a rag-architecture para conteo real;
conservar dependency-lock.capture.json congelado y usar un snapshot NUEVO para este
protocolo. Instrucciones/historial/evidencia separadas,conteo de chat completo yreserva,
no truncamiento silencioso ni éxito delgenerador. No mutar fuentes deP112–P115capturadas.
P11461generacionesfallidas sigue pendiente útilgeneration/noanswerconforme. GapsP026/
P045Stripe/P058soak ySerie02soloDSA intactos. El cierreRAGvsfine-tuning aún no escrito.

## Histórico: P115 seis borradores verificados, tres entregas pendientes

2026-11-03. Completados en este bloque RAG-MULTISTEP (1705palabras) y RAG-CACHE
(≈1950 tras aclaraciones). Manifiesto6/9,in_progress. Faltan RAG-UPDATES,
RAG-CONTEXT-DESIGN,RAG-VS-FINETUNING. Objetivo global175 activo; no dar por completo
P115 por ID o recuentos. 413índices/303exports,55labs/56workspaces. Inventario90/19/66,
completionProvenfalse. P112/P113/P114/P115 sin commit. No commits/push/publicación,
traducción/audio automáticos. Preservar todos los cambios y límites históricos.

Código canónico packages/rag-architecture. Nuevas capturas únicas e inmutables:
results/multistep.json:44workflows/60llamadasfuentes. Paradas10requirements_met,
12call_budget,4source_budget,14no_progress,4no_results. Tareas tipadas requiredKeys y
grafos redactados, no LLM/parser/agente. Coverage de IDs, no respuesta factual.
Cuatro pares one-step0→follow-reference1, caso directo1call. Lectores/referencia
restringida tienen gold autorizado vacío:coverage null. Ciclos se deduplican; refs
ajenas0filas. Límite de frontera solo unidad, no se alcanza en matrizSQL. Nuevas
fuentes SHA congeladas:multistep.mjs,protocol/cases/capture,fixture/schema/search/
runtime/corpus/lock local. verify-multistep hace replay readonly sin SQL.

results/cache.json:22solicitudes,8hit/13miss/1expired,14operacionesfuentes,2erroresSQL
22012 no cacheados. Clave JSONtuple namespace/role/tenant/nivel/revprincipal/epochACL/
indexRevision/analyzer/ranknorm/k/query exacta. Principal yestado actual se leen en
snapshotRRreadonly antesdelookup. Revocar/restauraralpha_manager aumenta revisión2/3;
ACLalpha-cache→1 yepochglobal2 enmisma transacción. Beta tambiénmiss porinvalidación
global aunque sucontenido no cambie, conservado. indexRevision fijaSHAcorpus+schema,
NO activación de nuevoíndice. TTL3000ms,esperanativa3102,695719ms. Fakeclocksolo unidad.
FIFO128unitario,nunca expulsión enSQL. Las clavesantiguas quedan fuera del recorrido,
no se borran instantáneamente. El script coordina ACL+epoch,no haytrigger que impida
cambios administrativos sinbump. No concurrencia/stampede/cache distribuida/latencia/LLM.
verify-cache reproduce timestamps originales; comparar expiresAt=savedAt+TTL evita
redondeo de restar floats. Core/capture/protocol/cases yfuentes congeladas porSHA;
no modificarlas ni repetir para obtener otros resultados. Reutilizar fixture concallback.

QA final /tmp/rag-architecture-layout.Ag51m2/report.json:seisposts360/1440,noindex,
0overflow/JSerrors. Porancho56queries69probes21conversaciones44workflows/104prefijos,
22cachecases. Teclado,scrolllocal,textos,consultas,clave/revisiones,geometría/estados
verificados. DoceSVG conbounds correctos; cuatro nuevos yUIcache/prefijo1/2inspeccionados.
Se corrigió variable local document que sombreabaDOM en dosvisores, solo presentación.
Se corrigieron singulares ydiagrama que ahora explicita quehit no renuevaTTL. Uncheck
puntual falló porHMR(/tmp/rag-final-detail.JKs2z3); elQA completo final pasa trasrestart
estable. No presentar ese fallo como modelo/protocolo. Capturas originales intactas.

254editorial/estructura,17blog,26lab pasan; cuatroverificadores readonly pasan.
Build final /tmp/p115-six-build-final.log50rutas. Pagefind /tmp/p115-six-pagefind-final.log:
10páginas públicas/4280palabras/dosidiomas. Ninguna captura o QA propia pendiente.
Servidor propio545198 detenido. Ningún modelo nuevo cargado/ejecutado en este bloque.
Capturas previasP112–P114 intactas. P11461generaciones fallidas, respuesta útil y
no-answerconforme no demostrados; no confundir éxito de arquitectura con generación.
GapsP026/P045Stripe/P058soak ySerie02soloDSA se conservan.

SIGUIENTE RAG-UPDATES: protocolo nuevo para construcción parcial rechazada,
validación/activación real y dos solicitudes con snapshot solapado; caché por revisión
y citas antiguas reautorizadas. Reutilizar withDatabaseFixture(callback) sin editarla
(congelada por conversación/multistep/cache). Una ACL copiada en índice viejo no debe
autorizar una cita prohibida ahora. Separar autoridad ACL de versión decontenido o
explicitar una garantía más limitada, sin aparentar aislamiento inexistente.

Después contextdesign: tokenizer Qwen real yaen packages/reranking-grounding/.cache/
generator/tokenizer.json y tokenizer_config.json (sin subdirectorio modelname).
Instalar HF3.8.1 conpnpm en rag-architecture si hacefalta, conservar snapshots de lock
anteriores y nuevo snapshot propio para siguiente captura. Contar chat completo+
reserva sin cargar pesos/inferir. RAG vs fine-tuning cierra la serie, con referencias
previas sin inventar nueva evidencia de generación útil.

## Histórico: P115 en curso, cuatro borradores verificados

2026-11-03. Se escribieron cuatro borradores españoles: P115 contratos/requisitos,
RAG-TENANTS permisos RLS, RAG-ISOLATION global vs separado y RAG-CONVERSATION.
Manifiesto rag-architecture-series.json conserva nueve plannedIds e in_progress.
Faltan cinco: multi-step, caché, actualizaciones, context design y RAG vs fine-tuning.
No aceptar P115 completo porque exista el artículo con su ID. Objetivo global175 activo.

Código canónico packages/rag-architecture. PostgreSQL17.11 real por digest, corpus12,
cuatro roles LOGIN noadministrativos/NOBYPASSRLS. results/isolation.json: 28 casosgold
por dos layouts=56 búsquedas; 69 controles/36 denegaciones42501. Por layout:19gold
positivos recall autorizado1, nuevevacíos con0filas; cero exposiciones/IDs inesperados.
Archivos físicos distintos en3DB, mismo servidor/CPU/RAM/WAL/admin. GIN24KiB vs suma48KiB,
solo esos índices/corpus. Planes normales guardados; no claims ANN/latencia/backup.
Trust solo contenedor loopback sintético, no autenticación web/despliegue.

results/conversation.json: captura independiente,21 escenarios conocidos. 7ready,
8forbidden,4unavailable_reference,1not_found,1no_evidence. Sesiones backend con UUID,
propietario role+tenant y refs ID+revisión, no texto antiguo como evidencia. Relee
principal/fuentes dentro de REPEATABLE READ READ ONLY. Revocación de dos gestores
confirmada ANTES de nueva solicitud deja0fuentes. No revocación en snapshot activo,
resolución lingüística, persistencia, cuotas o generación. Controls de referencias
ajenas/revisiones erróneas son deliberados. sourceHashes congelan conversations.mjs,
database-fixture.mjs,capture-conversation.mjs,protocol/schema/runtime/corpus/lock local.
Reutilizar withDatabaseFixture(callback) sin editarlo; nuevas capturas/protocolos para
próximas operaciones. No repetir ni alterar fuentes congeladas de ninguna captura.
Ambos verificadores readonly pasan. Contenedores eliminados, ningún modelo nuevo.

252 editorial/estructura,17 blog,11unitarias pasan. Últimos ajustes tabla/snippets
pasan4pruebas focalizadas. QA final /tmp/rag-architecture-layout.PmfWvv/report.json:
cuatro posts360/1440,56búsquedas69controles21reanudaciones porancho,geometría/textos,
teclado/scroll local;0JSerrors/overflow. Ocho diagramas/figuras y permiso retirado
inspeccionados. Servidor propio pid537199 detenido. Build final completado:50rutas, /tmp/p115-build-final.log. Pagefind mantiene10páginas
públicas/4280palabras/dosidiomas. Tests posteriores al build:17/17. Sin procesos propios
de captura, modelo o QA pendientes. No reiniciar capturas.

411índices/295exports,55labs/56workspaces. Inventario90/19/66,completionProvenfalse.
P112/P113/P114/P115sincommit. No commits/push/publicación/traducción/audio automáticos.
PreservarP114:61generacionesfallidas, útilgeneration/noanswerconforme sin demostrar;
gapsP026/P045Stripe/P058soak,Serie02soloDSA. No confundir arquitectura con generador útil.

Siguiente acción: continuar RAG-MULTISTEP con workflow
acotado y captura real de rutas correctas, sin progreso/ciclos/presupuesto insuficiente,
siempre autorización antes de contexto. Después caché por ámbito/revisión, activación
de índices con solicitudes solapadas, context design y RAG vs fine-tuning.
Tokenizer Qwen fijado ya está en packages/reranking-grounding/.cache/generator/
tokenizer.json y tokenizer_config.json (no en subcarpeta de nombre del modelo).
Para contar nuevos prompts usar tokenizer real sin inferir ni cargar pesos; añadir
dependencia HF mediante pnpm si hace falta. No mutar protocolos/capturas P112–P114.

## Histórico: P114 en ocho borradores verificados; generación fallida documentada

2026-11-03. Ver reranking-grounding-review.md ymanifiesto.8posts españoles,drafttrue/
statusdraft,LuisRamírezCalle. Se añadió FORMATO como concepto propio.8diagramas,
8figuras,8paneles yresolvedorfuentes. Código solo packages/reranking-grounding.
407índices/284exports,54labs/55workspaces. Inventario89/19/67 ycompletionProvenfalse.
Objetivo global175 sigue activo ysin aceptación completa;gapsP026/P045Stripe/P058soak
preservados,Serie02soloDSA. No reducir objetivo al último conjunto de borradores.

Ejecuciones reales P114:215pares BGE multilingüeq8CPU,27lotes/216outputs físicos;
120comparaciones M3/6/10;240contextos;80escenarios;61prompts únicos y61generaciones
Qwen0.5Bq8CPU.4930tokens,23alcanza160tokens. Se completó una vez;no proceso de modelo
pendiente. NO repetir/tunear para obtener versión favorable ni editar archivos conSHA.
Inputs/protocol/rubric/prompt/core/captures/io/preparación ydatos congelados. Pesos solo
.cache ignorada. Para otro ensayo versionar nuevas rutas/protocolo ypreservar todo.

Resultado crucial:58invalid_json+3invalid_state_claims=ninguna respuesta aceptada.
80rechazos técnicos,no abstenciones correctas. El contexto RRFtest mejora.8542→.9792;
BM25ya.9792. NO vender comoRAGfuncional ni éxito de generación. Limite pendiente:
respuesta útil grounded yno-answerconforme no demostrados. Auditarlo antes de afirmar
aceptación global o funcionalidad de un proyecto;los artículos explican el fallo real.
No sustituir respuestas fallidas por redactadas ni considerar diags comoaceptadas.

61salidas revisadas porasistente antesdeagregados;15extractos diagnósticos,noexhaustivos.
Corrección review-corrections.json:Q11«incluye idioma»no excluyeotroscampos,porloque
labelpresentación contradicted→unsupported. Ligada aSHA,originales intactos y0cambio
operativo. UIexplicala rectificación. Modelos/prompt/criterios no se ajustarontrasresultados.

5JS,248editorial/estructura,17blog,verify--tokenizer pasan. QAfinal:
/tmp/reranking-layout.qNv96r/report.json,8posts360/1440,poranchura120rankings,
1560resaltados,120candidatos,240contextos,80salidas,15diags,10controles,8negativos,
13fuentes y5enlaces manipulados;0JSerrors/overflow,teclado/scrollyvisualesinspeccionados.
Servidor propio 531354 cerrado (astro dev stop, exit 0). Build final:50 rutas.
Pagefind final:10 páginas,4280 palabras,2 idiomas. Ninguna inferencia o QA propia pendiente.

SIGUIENTE P115:arquitecturasRAG. Obligatorio conversationalRAG,multi-step,cache,
indexupdates,tenantpermissions,RAGvsfine-tuning,contextdesign. Lab:diseño multi-tenant
ycomparación real de índiceglobalfiltrado vsaislamiento físico. Plan en ruta-arquitecturas-rag.md: nueve entregas propuestas, sin posts/capturas aún. No convertir tests derouting en evidencia de respuestas generadas útiles:
el falloP114permanece visible. Planificar postspequeños porconcepto ycaptura antesdeclaims.

P112/P113/P114sincommit. HEADblogc2f71c5/examplescc99f36. No nuevoscommits,push,
publicación,traducción/audio automáticos. Contexto inferior histórico,superado.

## Histórico: P113 desarrollado en siete borradores verificados

2026-11-03. Ver retrieval-strategies-series.json y retrieval-strategies-review.md.
Siete borradores españoles específicos: BM25, denso, RRF, filtros, multi-query,
rewrite y evaluación. Draft true/status draft; Luis Ramírez Calle. Siete diagramas,
siete figuras, dos tipos de gráfico SVG dinámico y seis paneles interactivos.
Código canónico solo packages/retrieval-strategies. 399 índices/268 exports,
53 laboratorios/54 workspaces. Objetivo global175 aún no conseguido; inventario
88draft_exists/19related_only/68not_written, completionProvenfalse.

Capturas P113 ejecutadas y congeladas: results/inputs.json antes de inferencia;
33 vectores MiniLM q8 CPU reales;60 rankings BM25/denso/RRF;36 filtros;7 casos
multi-query;16 propuestas de rewrite. No retocar ranking/evaluate/protocol/entradas
ni archivos con hashes para modificar la historia. No repetir encoder por resultados
desfavorables. Pesos solo .cache/model ignorada, no exportados. Verificador readonly.

Test8: BM25 coverage.97917/7de8, denso.77917/5de8,RRF.85417/6de8. Preservar Q14:
evidencia primera/novenaycuarta;Q12RRFmejora denso;Q06/Q18incompletas en los tres.
Q19negativo devuelve3 todos;Q20BM25=0,denso/RRF=3. Multi-queryQ08pierde cobertura1→0;
Q13rewrite alterada pasa el guard y conserva retrieval1: evidencia no prueba intención.
No test ciego, generador de paráfrasis, respuestas generadas ni benchmark de latencia.
Filtros antes/después son respecto al corte top3 sobre scores globales; en RRF después
de fusionar ventanas. No nativo prefilter ANN ni ACL. SVG dinámicos usan escalas declaradas.

6 JS,245editorial/estructura,17blog,verify--tokenizer ybuild pasan. QA completo:
/tmp/retrieval-layout.574F2s/report.json. Siete posts360/1440;poranchura300comparaciones,
260pares,320fusiones,36filtros,56subconjuntos,16rewrites;sin JSerrors/overflow ycon
teclado/scroll. Siete diagramas/siete figuras ypaneles inspeccionados; ramas corregidas.
Servidor propio 525698 cerrado (astro dev stop, exit 0). Pagefind final:10 páginas,
4280 palabras y2 idiomas. No quedan inferencias ni procesos de QA propios pendientes.

SIGUIENTE P114: leer ficha y ruta-reranking-grounding.md. Exige RESPUESTAS con/sin
reranking y enlaces verificados a fragmentos, no solo otra tabla de retrieval. Hay
plan de siete entregas pequeñas; no hay posts, modelo elegido ni captura P114 todavía.
Verificar cross encoder real compatible con español; fijar protocolo/modelos/gold/
presupuesto/generador antes de inferir. Conservar negativos, regresiones y salidas.

P112/P113 sin comitear. HEAD previos blogc2f71c5/examplescc99f36. No commits/push/
publicación/traducción/audio automáticos. GapsP026/P045Stripe/P058soak ySerie02soloDSA
intactos. Resto inferior es histórico y no describe el estado actual.

## Histórico: P112 desarrollado en nueve borradores verificados

2026-11-03. Ver document-ingestion-series.json, ruta-ingesta-documental.md y
document-ingestion-review.md. 9/9en español,draft/statusdraft,LuisRamírezCalle.
9diagramas,8figuras,10paneles. Código canónico solo packages/document-ingestion.
392índices/256exports,52labs/53workspaces. Global175fichas no terminado; inventario
87draft_exists/19related_only/69not_written,completionProvenfalse.

Fase final ejecutada de verdad:44vectores MiniLMq8CPU/384d,41distancias,4particiones,
87secuencias detokenizer,4índicesBM25 y80rankings. Gold20preguntas fijado antes.
Umbral.35 cortó todas las fronteras;preservar ese resultado sin tuning posterior.
Test8:coverage.97917/.8125/.96528/1;completitud7/8,6/8,7/8,8/8. Casosdesfavorables
Q04overlap8,Q07overlap4,Q17semántico;Q18semántico favorable;Q19yQ20negativos intactos.
No rehacer inferencia ni OCR. Capturas y sus fuentes con hashes congeladas. Verificadores
sonreadonly; no sobrescribir resultados por hacerlos más atractivos. Nuevos ensayos con
protocolo/rutas nuevos. El visor no contiene pesos ni ejecuta modelos/búsqueda.

17JS,242editorial/estructura,17blog,verify-chunking --tokenizer ybuild/Pagefind pasan.
QAfinal:/tmp/ingestion-layout.OIQj9O/report.json,9posts360/1440,10panelesvisibles,
0JSerrors/overflow,teclado/scrolly17figuras/diagramasinspeccionados. Detalles en review.
Servidor propio PID519360 cerrado por astro dev stop (exit 0). No queda ningún
encoder, OCR, benchmark ni servidor de QA propio pendiente.

SIGUIENTE P113:retrieval léxico,denso ehíbrido; comparar3retrievers con gold. Incluir
sparse/dense,BM25,vector,RRF/otrasfusiones,metadatafilters,multi-queryyqueryrewrite.
Reusar corpusversionado deP112, fijar partición/preguntas/modelos/protocolo ANTES de
rankings nuevos; conservar regresiones ynegativos. No reducir P113 a comparar chunking.
Ruta propuesta de7entregas en ruta-retrieval-hibrido.md; todavía no hay posts ni
capturas P113. Antes de implementar, fijar el contrato experimental que recoge esa ruta.

Commits previos blogc2f71c5/examplescc99f36. P112no comiteado; no commits/push/publicación/
traducción/audioautomáticos. GapsP026/P045Stripe/P058soak ySerie02soloDSA intactos.
Resto inferior histórico; los planes de6/9 no describen el estado actual.

## Histórico: P112 en desarrollo, seis de nueve drafts verificados

P112/INGEST-OCR/LAYOUT/PROVENANCE/DEDUP/SIZE escritos en español,drafttrue/statusdraft,
LuisRamírezCalle. Seis diagramas, cinco figuras y siete paneles. 389índices/251exports,
52labs/53workspaces. Objetivo global175fichas pendiente; inventario87/19/69 no es aceptación.

Ledger real derivado:9fuentes,760unidades conorigen;8grupos bytes,6texto;3representantes
RUNBOOK/COLUMNS/HTML para recuperación. Controles CACHE300/301/OPPOSITE excluidos.
Jaccard11/13=.846153846 para dos pares; solo revisión,no fusionados. 367unidades del corpus.
Ventanas16/32/48:25/13/9;47secuencias de tokenizer reales,sinencoder;máximostokens29/52/77.
results/ledger.json ytoken-preflight.json congelados. No modificarledger/ranges/inputs/build/
preflight/protocol/registry/tokenizer-manifest ni fuentes conSHA: nuevos protocolos por fase.
OCR original y corrección TSV se conservan intactos; no rerun de OCR.

10JS,verify-ledger --tokenizer,241editorial/estructura y17blog pasaron en fase6.
BuildAstro50rutas. Último QA Chromium tras recuperar deps y reiniciar servidor propio:
/tmp/ingestion-layout.jACRvx/report.json. 6posts360/1440,poranchura289PDF,712OCR,303layout,
2HTML,1511rangos provenance,14grupos,2near-cases,47ventanas;sinJSerrors/overflow yteclado/scroll.
Copy finalenumtraducido,hintscroll ysingular/plural revisados. Figura ySVG sinrecortes.
Servidor propioactualPID519360 (puerto4322), confirmado vivo; detener al cerrar entrega.
No proceso deOCR/modelo/benchmark pendiente. Los restores fueron pnpmfrozenforceignore-scripts;
no variar locks ni usar npm/pip. pnpmexecplaywrightinstallchromium si cache desaparece.

SIGUIENTE: semantic chunking con embeddings reales; overlap y evaluación de recuperación.
Fijar protocolo ygold ANTES de esos resultados. Baseline32unidades mantiene IDs originales.
Propuesta: sentencias Intl.Segmenter,partir las muy largas por32unidades,encoderMiniLMq8
384d del snapshotP111,distancia entreadyacentes umbral.35 ycap32; sin tuning posterior.
Overlap4/8 sobre32,evitar cola redundante si una ventana ya termina alfinal. BM25fold
k1=1.2,b=.75 fijo en todas las particiones para aislar chunking; no confundir esa comparación
con evaluar distintos retrievers. Medir cobertura de evidencia porunidades ycompletitud@3,
permitir alternativas equivalentes (retención ydirectorio también aparecen en COLUMNS),
consultas multifactor ynegativas. Corpus minúsculo/known,no test ciego. P112no terminado.
Estos diseños todavía no son protocolo ejecutado: comprobar archivos actuales al continuar.

Commits previos:blogc2f71c5/examplescc99f36. P112sincomitear. No futuros commits,push,
publicación,traducción/audio automáticos. GapsP026/P045Stripe/P058soak ySerie02soloDSA intactos.
Estado inferior histórico.

## Estado vigente: P112 en desarrollo, tres de nueve drafts verificados

Progreso: parsingPDF/HTML,OCR ylayout escritos en español,drafttrue/statusdraft,
autorLuisRamírezCalle. Tres SVG conceptuales,tres figuras ECharts y visor de cuatro
paneles. Laboratorio solo packages/document-ingestion,carpetas en inglés. Ver ruta,
manifiesto y document-ingestion-review.md para evidencia y límites.

Captura real única2026-11-01T21:29:56.612Z: Poppler24.08/Tesseract.js7/core7,modelo
español fijado. PDFdigital178palabras,columnas110,scan0en capa de texto;OCR178.
CER0sobre1158caracteres normalizados,escaneo limpio sintético. Confidence no es
probabilidad;checksum42.646103 es correcto. Layout por filas mezcla columnas y
produce435ediciones/634caracteres;regla de plantillax306 da0. No generalizar.

IMPORTANTE: TSVsin cabecera causówords=[] en el colectororiginal, pero texto/blocks/
TSV completos. No reescribir results/extraction.json ni su capture.mjs congelado.
ocr-tsv/derive producen results/ocr-words.json sin OCRnuevo y verifican cajas con
blocks. Los consumidores usan esa derivación. Protocol/runtime/fixture-content/
make-fixtures/parsing/evaluation/archivolock yfuentes conhashes siguen intactos.
Para próximas fases crear nuevos protocolos/capturas, sin alterar los existentes.

5JS yverifyreadonly,240editorial/estructura,17blog ybuild/Pagefind pasan.
Chromium:/tmp/ingestion-layout.HcHzD5/report.json;3posts360/1440, poranchura289PDF,
712OCR,303layout,2HTML. Coordenadas/unidades,valores,teclado yscroll,sin errores ni
overflow. Diagramas/figuras inspeccionados. Servidor propioPID431789 se detiene al
cerrar la fase; ningúnOCR/bench pendiente. Dependencias solo con pnpm.

SIGUIENTE: completar provenance(metadata,IDs/versiones,offsets yregión),dedup,
size chunking,semantic chunking con embeddings reales,overlap eindexación ymedición
de recuperación de dos estrategias. Son seis entregas pendientes. P112 no terminado.
No sustituir semantic por separar párrafos ni evaluar con etiquetas posteriores.

386índices/246exports,52labs/53workspaces. Inventario87/19/69 no demuestra aceptación
de175fichas;completionProvenfalse. GapsP026/P045Stripe/P058soak preservados;Serie02soloDSA.
Objetivo global activo. Commits previos:blogc2f71c5/examplescc99f36;P112sincomitear.
No commits/push/publicación/traducción/audio automáticos. Estado inferior histórico.

## Estado vigente: P111 desarrollado en nueve drafts verificados

Progreso: PG, relevancia y medición completados. Manifiesto 9/9, español,
draft true/status draft, autor Luis Ramírez Calle. Nueve diagramas, seis figuras y
seis paneles interactivos. Laboratorio solo en packages/vector-retrieval, con
catorce exports estáticos. Ver vector-retrieval-review.md y ruta editorial.

Capturas originales intactas: 140 vecindarios FAISS y 80 PG, 40 rankings y 6.600
tiempos. Se conservan regresiones Q06/Q17, Q19 sin mejora, Q20 sin respuesta y
PG ef4 con cuatro resultados. Separados recall geométrico/relevancia y relojes
nativo/cliente. Sin extrapolar a producción ni cambiar etiquetas por los resultados.

15 JS P111, 51 JS P107–P111, 237 editorial/estructura y 17 del blog pasan.
Verificadores de los cinco labs, build y Pagefind pasan. Chromium final:
/tmp/vector-layout.d3DnXh/report.json. Nueve posts a 360/1440; por anchura 90
controles, 400 parejas/153.600 componentes, 140 casos FAISS, 80 PG, 40 rankings y
231 selecciones de tiempo. Sin overflow/JSerrors; teclado/scroll y revisión visual.
Servidor propio PID379935 se detiene al cerrar esta entrega. No benchmarks pendientes.

Siguiente P112: leer ficha completa y preparar serie focalizada de ingesta/OCR/chunking.
Parsing/OCR/layout reales, semantic/size chunking, overlap, metadata, dedup, provenance
e indexing; medir recuperación de dos estrategias. Prerrequisitos P106/P111. No
escribir todo en un solo artículo ni presentar fixtures como captura de OCR real.

383 índices/236 exports, 51 labs/52 workspaces. Inventario 86/19/70 no demuestra
aceptación de 175 fichas; completionProven=false. Gaps P026/P045 Stripe/P058 soak
preservados; Serie02 solo DSA. El objetivo global sigue activo.

El usuario autorizó commit de TODOS los cambios al cerrar esta serie el 2026-11-01.
No push/publicación/traducción/audio ni futuros commits automáticos. El estado
inferior es histórico y no sustituye este bloque vigente.

## Estado vigente: P111 con seis de nueve drafts verificados

Esta continuación fue progreso: VEC-EXACT, VEC-HNSW y VEC-FAISS redactados,
con tres diagramas nuevos. Seis drafts en español hasta FAISS, Luis Ramírez Calle,
draft true/status draft. Ruta/manifiesto/revisión: ruta-recuperacion-vectorial.md,
vector-retrieval-series.json y vector-retrieval-review.md. Laboratorio fuera del blog.

SIGUIENTE: VEC-PGVECTOR, VEC-RELEVANCE y VEC-MEASUREMENT. Añadir modos de
pgvector y evaluación al visor, enlazar la figura de relevancia y completar QA de
las nueve entregas. No aceptar P111 ni el objetivo global mientras falten requisitos.
No reejecutar benchmarks/encoder para mejorar números. Las capturas siguen intactas.

Visor: control2D,400parejas reales de384componentes y140salidas nativas frente a FlatL2.
Incluye textos de1000registros sin exportar los980vectores extra. Los980controles
carecen de gold semántico: desconocido no se presenta como irrelevante. El diagrama
compara conjuntos guardados y no inventa visitas al grafo. Tiempos agregan600llamadas
por estrategia y no la consulta individual. Figuras ECharts6.1.0 de recall nativo,
serialización y relevancia; IDs CSS normalizados y byte-exact deterministic tests.

QA fase6/9:11JS,probe nativo con serialización/restauración tipada,verify readonly,
235editorial/estructura,17blog ybuild/Pagefind pasan. Chromium completo:
/tmp/vector-layout.hjrf19/report.json. Seis posts360/1440; por anchura90controles,
400parejas/153600coordenadas,140vecindarios y1796inspecciones de texto/etiqueta.
Teclado/scroll y nooverflow/noJSerrors. Seis diagramas y tres figuras inspeccionados.
Último ajuste separa labels coincidentes de P@3; QA gráfico focalizado:
/tmp/vector-figures.BwZ7aD/report.json. Capturas finales a380px sin margen blanco ajeno alSVG.

380índices/232exports,51labs/52workspaces; inventario86/19/70 NO prueba aceptación
completa175fichas. Mantener gapsP026/P045Stripe/P058soak ySerie02soloDSA. Caches y
pesos ignorados; ninguna inferencia/benchmark pendiente. Servidor temporal propio
PID323294 detenido al cerrar la fase. HEADblog8023014/examples70b26a6, sin nuevos commits.
No commits/push/publicación/traducción/audio automáticos. Estado inferior histórico.

## Estado vigente: P110 verificado; siguiente P111

Esta continuación fue progreso: siete drafts, siete diagramas, tres figuras y visor
con gráfica dinámica. Ver [ruta](ruta-structured-outputs.md),
[manifiesto](structured-extraction-series.json) y [revisión](structured-extraction-review.md).
7 JS/9 Python, verify readonly, 231 editorial/estructura, 17 blog y build/Pagefind pasan.
Chromium /tmp/structured-layout.JQJBN0/report.json: posts360/1440, 24 respuestas,
18 controles, 256 subsets, 768 filas/2304 barras por anchura, teclado y sin overflow.
Capturas congeladas intactas; no rerun exercise. El lock histórico está archivado.
Servidor temporal PID252741 detenido al cerrar QA; no contenedores propios pendientes.

374 índices/222 exports, 50 labs/51 workspaces. Inventario85/19/71 no prueba aceptación
ni termina las175 fichas. Gaps P026/P045 Stripe/P058 soak siguen abiertos; Serie02 solo DSA.
HEAD blog8023014/examples70b26a6, P107-P110 sin comitear. No commits/push/publicación/audio
ni traducciones automáticos. Siguiente P111: ficha completa, P076/P106/P108, embeddings
reales y dataset etiquetado, BM25/vector, cosine/L2, normalization, exact/ANN, HNSW,
FAISS, pgvector y recall/latency. No sustituir inferencia ni índices reales por fixtures.

## Estado vigente: P109 desarrollado y verificado en siete drafts

Esta continuación fue progreso: revisión de siete artículos, correcciones de
redacción, dos huecos del visor resueltos y QA final. Español, draft true/status
draft, Luis Ramírez Calle. Siete SVG conceptuales, tres figuras y visor de tres
paneles. Ver [ruta](ruta-generacion-texto.md), [manifiesto](text-generation-series.json),
[revisión](text-generation-review.md) y [laboratorio](../../packages/text-generation/README.md).

5 JS/4 Python pasan; verify recalcula los 36 recorridos/144 tokens y controles
con rtol1e-10/atol1e-12. Los tiempos archivados se auditan, no se fuerzan a repetirse.
Capturas y fuentes congeladas intactas. Se recuperó la imagen por digest después
de reiniciarse el entorno. No se cambiaron pesos ni se seleccionó otra seed.

227 editorial/estructura, 17 blog, build/Pagefind pasan. Chromium final:
`/tmp/generation-layout.spetAP/report.json`. Siete posts a360/1440; por anchura
36 recorridos/144 decisiones/240 filtros/42 frames. Prefijos, todas las
probabilidades, sorteos, tokens, razones de parada, relojes/chunks contrastados.
Teclado y scroll local móvil pasan, sin errores JS ni overflow de página.
Inspección visual de diez SVG y paneles realizada. El visor es replay; la
captura original sí procede de inferencia con flush real. Ver revisión para límites.

49 labs/50 workspaces, 367 índices/215 exports. Inventario 84 draft_exists,
19 related_only, 72 not_written: existencia no equivale a aceptación. No se ha
completado el objetivo de 175 fichas. Conservar huecos P026/P045 Stripe/P058 soak
y Serie02 solo estructuras de datos/algoritmos. P107 y P108 siguen desarrollados;
preservar sus fuentes capturadas. No rerun scripts de montaje de /tmp.

Servidor temporal PID232712 detenido y sin contenedores propios de generación.
`git diff --check` pasa en ambos repositorios.

HEAD blog8023014/examples70b26a6; NER+LM+generación sin comitear. Sin nuevos commits,
push, publicación, traducciones o audio. Siguiente P110: leer ficha completa,
P022/P109 y fuentes primarias; definir extracción con schema y evidencia por
campo. Un JSON válido no prueba respaldo en el texto. No sustituir inferencia
real por fixtures al evaluar cambios de prompts.

---


## Estado vigente: P108 desarrollado en seis drafts

Este turno fue progreso. Se escribieron P108,LM-TOKENS,LM-CONTEXT,LM-LOSS,
LM-FAMILIES,LM-INSPECTION con código probado, seis diagramas, tres figuras medidas
y visor de probabilidades completas. Español,draft true/status draft,Luis Ramírez
Calle. Ver [ruta](ruta-modelos-lenguaje.md),[manifiesto](language-models-series.json),
[revisión](language-models-review.md) y [lab](../../packages/language-models/README.md).

Captura P108 intacta 2026-10-28T23:24:04.901196+00:00,siete hashes. Tres modelos
causales reales,seeds7/19/31,3205parámetros,21tokens,300pasosAdam.01,float64CPU.
72frases/44train/14dev/14test,plantillas/prefijos compartidos. No calidad general
ni test ciego. Probe los muy improbable tras «el equipo revisa» es sesgo del split.
No Transformer masked/encoder-decoder entrenado. NLLtest1.407849/1.222869/1.425571
frente a unigram2.673023. Control causal0 frente a sinmáscara positivo; no es MLM.

Ocho JS,tres Python,verify reentrena todo,223editorial/estructura,17blog verdes.
Browser /tmp/lm-layout.2bseDi/report.json: seisposts+visor a360/1440,42probes,
3024posiciones/63504probabilidades,24filas métricas,teclado,IDs/targets/matrices.
Corregido overflowSVG móvil con width100%. Figuras/tmp/lm-figures/contact-0..2.png.
Servidor propio PID130302 cerrado mediante astro dev stop al terminar QA. Browser/tmp/ner-playwright.
No fuentes numéricas modificadas.360índices/207exports,48labs/49workspaces.

SIGUIENTE:P109,leer ficha completa. Tema generación/logits/softmax/temperature/
top-k/top-p/truncation/context/streaming/latency/determinism. Laboratorio:mismo
prompt bajo estrategias de sampling,tokens registrados. Fijar protocolo antes
de probar. Reutilizar pesos P108 sin alterarlos y documentar su scope sintético.
Prerrequisitos P084/P108. No llamar streaming/inferencia a un replay ni omitir
latencia si se afirma medirla. Revalorar división en posts específicos.

Objetivo175fichas sigue activo. Inventario83draft_exists/19related_only/73not_written
NO prueba aceptación total. Conservar gapsP026/P045Stripe/P058soak,Serie02solo
estructuras/algoritmos. Sin commits/push nuevos;HEADblog8023014/examples70b26a6.
NER+LM sin comitear en ambos repos. No publicar/traducir/audio/commits automáticos.
No rerun scripts temporales de montaje:duplican índices/sobrescriben revisiones.

---


## Estado vigente: P107 revisado; P108 entrenado, artículos pendientes

Este turno fue progreso real. P107 desarrollado en siete drafts. Se restauraron
dependencias con pnpm frozen (locks intactos), se reentrenaron las nueve ejecuciones
y se regeneró QA. Ver [revisión NER](entity-recognition-review.md). Browser actual:
/tmp/ner-layout.2bljtj/report.json. Figuras: /tmp/ner-figures-restored/. El raster
resvg no tiene recorte; no alterar fuentes correctas por artefactos de captura.
PID59657 cerrado. No quedan contenedores propios.

P108: corpus/protocolo fijados ANTES del ajuste y tres Transformers causales reales
entrenados. Ver [ruta](ruta-modelos-lenguaje.md) y
[lab](../../packages/language-models/README.md). SIGUIENTE ACCIÓN: escribir seis
posts focalizados y crear diagramas y visor con probabilidades guardadas. No hay
posts o exports P108 todavía. El temario y el objetivo total siguen abiertos.

Captura 2026-10-28T23:24:04.901196+00:00, seeds 7/19/31, 300 pasos Adam .01
full-batch, float64 CPU, 3205 parámetros, 21 tokens, contexto máximo 16,
un bloque 16d/2heads/FFN32. 72 frases, 44 train/14 dev/14 test, con plantillas y
prefijos compartidos: no generalización natural. Pesos, logits, probabilidades,
losses, métricas, unigram baseline y controles archivados. No winner selection.
Sufijo perturbado no cambia el prefijo causal (0); sin máscara sí cambia, pero
ese control NO es un masked LM. Siete hashes: no editar corpus/protocol/runtime/
tokenizer/tokenized/model/experiments sin preservar/versionar la captura.
Verify reentrena y compara todo con rtol1e-10/atol1e-12 en contenedor CPU.
Tres tests Python/cinco JS, 219 editorial/estructura y 17 blog verdes.
NLL test 1.407849/1.222869/1.425571, unigramas 2.673023; solo descriptivo.

Imagen CPU pinned recuperada en Docker; red none, 2 CPU/2 GiB/un thread,
rootfs/bind readonly, user1000:100, timeout300s. Browser en /tmp/ner-playwright.
data:prepare explícito, sin lifecycle automático. 48 labs/49 workspaces,
354 índices/199 exports. Inventario 82 draft_exists/19 related_only/74 not_written
no implica aceptación. P108 sigue not_written, correctamente: no tiene post aún.

Sin nuevos commits/push. HEAD blog8023014/examples70b26a6. Cambios NER+LM en ambos
repos. No publicar/traducir/audio/commits automáticos. Mantener las 175 fichas,
gaps P026/P045Stripe/P058soak y Serie02 solo datos/algoritmos. No rerun scripts
temporales de montaje: pueden duplicar índices o sobrescribir revisiones.

---


## Continuación vigente: P107 desarrollado en siete drafts

Este turno fue progreso: cinco posts añadidos (siete totales),clasificador NER
entrenado,contraste de convergencia preservando el fracaso inicial,métricas
exactas y revisión de confusiones. Ver [revisión](entity-recognition-review.md),
[ruta](ruta-reconocimiento-entidades.md),[manifiesto](entity-recognition-series.json)
y [laboratorio](../../packages/entity-recognition/README.md).

Nueve ejecuciones,seeds7/19/31 a80/800/1600.80todoO;800/1600trainF1=1,
dev4/17,test4/21. Loss baja sin mejorar labels/spans de dev/test. No alterar
las fuentes con hashes ni reemplazar capturas para ocultar resultados negativos.
Test ya inspeccionado,solo descriptivo. No Transformer entrenado.

Verificación restaurada tras perder/tmpy dependencias:16unit,219editoriales,
17blog,verify exacto,build50rutas/Pagefind10páginas. Navegador actual:
/tmp/ner-layout.2bljtj/report.json,640comparaciones predichas+64roundtrips.
Figuras nuevas:/tmp/ner-figures-restored/. Servidor propioPID59657 cerrar al
terminar QA. Locks intactos. Código completo solo examples;199exports estáticos.

Siguiente:P108,cómo funcionan modelos de lenguaje.Leer ficha completa. Lab:
visualizar predicciones con probabilidades de un modelo pequeño. No sustituir
el mecanismo descrito por otro más fácil sin explicitarlo. Objetivo175fichas
sigue activo.Inventario82draft_exists/19related_only/74not_written no acepta
todo el roadmap.Conservar P026/P045Stripe/P058soak y Serie02solo datos/algoritmos.

Sin nuevos commits/push.LastHEADblog8023014/examples70b26a6(P106). CambiosNER
en ambos repositorios. No publicar/traducir/audio/commits automáticos.
No rerun scripts/tmpde montaje:pueden duplicar índices y sobrescribir revisiones.

---


## Continuación vigente: P107 en progreso, dos drafts y primer entrenamiento

Este turno fue progreso: dos posts españoles, tres SVG, visor spans/BIO, corpus y
protocolo previos a fitting, clasificador lineal BIO realmente entrenado y captura
negativa conservada. No afirmar que P107 está terminado. El objetivo total sigue
activo. Ver [revisión parcial](entity-recognition-review.md),
[manifiesto](entity-recognition-series.json) y
[laboratorio](../../packages/entity-recognition/README.md).

Siguiente acción: investigar por qué las tres seeds producen todo O pese a bajar
la loss; fijar un protocolo adicional antes de experimentar, usar train/dev para
la decisión y conservar intacta la primera captura. Se ha visto test, por tanto
no llamarlo ciego/intacto después de ajustar. Faltan cinco posts y análisis de
límites/tipos/omisiones/espurios, reglas vs Transformers y entity-level P/R/F1.
No sustituir el entrenamiento real por reglas.

Evidencias: 12 unit,217 editorial/estructura,17 blog verdes; verify reentrena y
compara toda la captura; build50rutas,Pagefind10páginas/4280palabras/2idiomas.
QA `/tmp/ner-layout.0l0dvh/report.json`: dos posts+visor a360/1440,64roundtrips.
Se arreglaron overflow de tabla y figura; servidorPID2813549 cerrado.

Sin nuevos commits/push. Cambios en ambos repositorios. Últimos HEAD siguen
blog8023014/examples70b26a6 (P106). Inventario82draft_exists/19related_only/
74not_written; existencia no aceptación. 349índices,194exports,47labs,48workspaces.
Preservar P026,P045Stripe,P058soak,Serie02soloestructuras/algoritmos y todas las
fichas originales. No publicar,traducir,generar audio ni comitear automáticamente.

---


## Continuación vigente: P106 desarrollado en once drafts

El último turno fue progreso. Se completó el bloque P106 en once posts, con once
diagramas D2/SVG, cuatro figuras y visor interactivo. Español, draft true/status
draft, Luis Ramírez Calle, independiente de PaySafe. Código completo en
`packages/lexical-search`; solo assets estáticos se exportan al blog.
Ver [ruta](ruta-busqueda-lexica.md), [manifiesto](lexical-search-series.json),
[glosario](lexical-search-glossary.md) y [revisión](lexical-search-review.md).

IDs en orden: P106, NLP-NORMALIZATION, NLP-TOKENIZATION, NLP-STEMMING, NLP-LEMMA,
NLP-NGRAMS, NLP-TFIDF, NLP-BM25, NLP-EVALUATION, NLP-BPE, NLP-WORDPIECE.
El prerrequisito P033 del roadmap no tiene ID exacto existente; se enlazan
DB-SQL/DB-ANALYTICS conservando el gap de aceptación de P033, sin renombrar IDs.

Corpus original de veinte documentos título+cuerpo, veinte queries con intención,
diez dev/diez test. Todos los cuatrocientos pares juzgados por una convención
didáctica explícita antes del scoring, sin evaluación ciega ni representatividad.
Seis contrastes fijos, sin tuning o selección de ganador. Q20 fuera de alcance
se informa aparte; métricas null y nueve test con respuesta, no diez.

Captura 2026-10-27T18:40:34.660Z, Node24.19.0/ICU78.3/Unicode17.0. BM25 k1=1.2,
b=.75, IDF positiva, términos query únicos, OR, scores positivos y empate por ID.
TF-IDF rawTF/smoothIDF/L2. NFC/lowercase es, fold áéíóúü conserva ñ. No stopwords.
Plural reducer incompleto NO Snowball; lookup trece entradas NO tagger contextual.
Char3 dentro de palabras por puntos de código. BPE aprende cinco merges sobre
cuatro palabras, caracteres y fallback ilustrativo, no byte-level/model IDs.
WordPiece es solo inferencia greedy, vocabulario fijo, whole-word UNK, no trainer.

Resultados preservados: test fold P@3 .296296/R@3 .833333/MRR@3 .888889 frente a
char3 .370370/1/.925926. Char3 rescata Q19 pero empeora Q17 de D15 primero a
D06/D07/D15. Q10 mejora por retencion sin corregir anios. Q12 sigue perdiendo
D06 con palabras. Q20 devuelve falsos relevantes; Q18 no prueba negación.
No generalizar calidad comercial ni confundir score y probabilidad.

Nueve hashes; verify recalcula todos los rankings/contribuciones/métricas y
trazas. No modificar fuentes numéricas sin capturar e identificar otro resultado.
Nueve tests JS, 214 editoriales/estructura y 17 del blog verdes. Build 50 rutas,
Pagefind diez páginas/4280 palabras/dos idiomas, drafts fuera. pnpm offline/frozen
47 projects/46 labs, lock intacto. 347 índices y 189 exports.

Navegador: `/tmp/lexical-search-layout.LzhMVG/report.json`, 24 vistas a 1440/360,
120 rankings por ancho con scores/contribuciones, tres splits, siete subword
probes, teclado/scroll y queries libres; sin pageerrors/global overflow.
Se corrigió overflow real de output y navegación defectuosa del propio check.
Quince figuras inspeccionadas; ocho capturas limpias, scroll inicial cero:
`/tmp/lexical-search-visuals.ByTDU2/report.json`. Ver revisión para límites.

El objetivo de 175 fichas sigue abierto. Inventario 81/19/75 significa existencia,
no aceptación. Mantener gaps P026, Stripe P045 y soak P058. Serie02 solo datos y
algoritmos. No publicar, traducir, generar audio ni hacer commits/push automáticos.
P104/P105 SÍ están comiteados por petición anterior: blog 2d38206 y examples
9a37040. El usuario solicitó guardar todos los cambios de P106 mediante commits
el 28 de octubre de 2026; consultar git log en ambos repositorios. El servidor local
propio PID2613323 quedó cerrado al terminar QA.

### Siguiente bloque: P107, NER y spans

Leer la ficha P107 completa del roadmap principal. Prerrequisitos P092, P093,
P106 y P104. Separar anotación/spans/offsets, BIO, rule-based, modelo entrenado,
entity-level precision/recall/F1 y errores de límites. Gate: ENTRENAR un detector
de nombres/organizaciones con conjunto anotado y revisar confusiones. Un matcher
de reglas o llamar un servicio externo no sustituye ese entrenamiento.

Fijar corpus/splits/anotaciones/protocolo antes de entrenar; evitar fuga por
plantillas o entidades repetidas y no inventar calidad sobre un test trivial.
El laboratorio vive en examples, artículos/diagramas/visores en blog y material
editorial/tools en examples. Consultar fuentes primarias, usar pnpm al instalar.

## Historial anterior: estado de cada entrega en su momento

## Continuación vigente: P105 desarrollado en ocho drafts

El último turno fue progreso. P104 y P105 suman 17 drafts nuevos sin commit.
Ver [ruta GPU](ruta-entrenamiento-gpu.md), [manifiesto](gpu-training-series.json),
[glosario](gpu-training-glossary.md) y [revisión](gpu-training-review.md).
Español, draft true/status draft, Luis Ramírez Calle, independiente de PaySafe.
Código completo en `packages/gpu-training`; ocho D2/SVG, cuatro plots y visor
en el blog. Ocho extractos corresponden al código ejecutado.

P105 usa GPU real: RTX 5070 Laptop, sm120, PyTorch 2.14.0+cu130, CUDA 13.0,
Python 3.12.3. Captura del 26 de octubre a las 23:51:33 UTC. Runtime fijado por
digest. Docker no tenía runtime NVIDIA/CDI: se montaron tres nodos y cuatro
archivos concretos del driver readonly, sin editar driver ni daemon. Sin red,
usuario 1000:100, cap-drop ALL, 2 CPUs/4 GiB, timeout 300 s. Solo se elimina el
contenedor propio; la imagen queda disponible para repetir.

Doce casos: CPU FP32 y CUDA FP32/FP16/BF16 por batches 32/128/512. Cada caso
corre en un proceso nuevo, con ocho warmup y cinco muestras de diez iteraciones.
MLP 512→1024→1024→16, 1.591.312 parámetros, pesos FP32, AdamW 0.001,
weight decay 0.01, foreach false. Sin Dropout ni BatchNorm. Datos residentes y
repetidos: no es calidad ni pipeline completo. CPU usa un thread. FP32 fue más
rápido que AMP aquí; conservar el resultado. Peaks reiniciados tras warmup.

Cuatro transferencias H2D de 1/16 MiB: pageable bloqueante frente a pinned no
bloqueante, preparación excluida. No aísla pinning ni demuestra overlap.
Probe inicial FP16/BF16: 63/64 argmax iguales a FP32. Acumulación de 21 filas,
microbatches 8/8/5, un step SGD: error ponderado 3.725e-9 frente a 3.274e-4
incorrecto. Profiler separado: 219 kernels, duración sumada 1064.807 µs;
esa suma no es wall time. Repetir tres updates en la misma GPU/runtime dio
pesos iguales; no promete igualdad entre versiones o tiempos idénticos.

Once hashes. Verify audita estadísticas, fuentes y traza; NO vuelve a ejecutar
el benchmark. Reobserve ejecuta otra captura y guarda el reporte separado en
/tmp. No modificar fuentes numéricas sin regenerar una observación identificada.

Pasan tres tests Python CUDA, cuatro JS, 209 editoriales/estructurales y 17 del
blog. Chromium: 18 vistas a 1440/360, informe final
`/tmp/gpu-training-layout.2sI4Aq/report.json`. Por ancho: doce casos/60 filas,
cuatro copias/20 filas, tres probes y microbatches, cuarenta filas del profiler.
Teclado, scroll horizontal/vertical, links e iframes; sin pageerrors ni overflow
global. Doce figuras inspeccionadas; tres diagramas rehechos para mejorar móvil.
Visor inicial sin scroll residual: `/tmp/gpu-training-visuals.fLr57e/report.json`.
Build: 50 rutas; Pagefind diez páginas/4280 palabras/dos idiomas, drafts fuera.
46 projects/45 labs, 336 índices/177 exports; lockfile intacto (pnpm offline/frozen).
Inventario 80 draft_exists / 19 related_only / 76 not_written indica existencia,
no aceptación del objetivo completo.

Incidencia resuelta: el slug inicial de accumulation coincidía con el artículo
DL-ACCUMULATION. Se restauró intacto y se creó una URL GPU propia, con enlace y
dependencia de la teoría anterior. Los cinco posts históricos sin ID siguen
válidos; la comprobación de unicidad solo considera IDs definidos.

### Siguiente bloque: Serie 11 / P106 NLP y búsqueda léxica

Leer la ficha completa del roadmap original. Temario: corpus, normalización,
tokenización, stemming, lemmatization, n-grams, TF-IDF, BM25 y BPE/WordPiece.
Laboratorio obligatorio: buscador BM25 con errores analizados y etiquetas de
consulta guardadas. Dividir conceptos en posts específicos; código en examples,
posts/recursos en blog y planificación/tools en examples. Consultar fuentes
primarias y fijar corpus, consultas/gold y evaluación antes de optimizar.
No sustituir recuperación léxica por un servicio externo LLM.

El objetivo completo sigue abierto; mantener gaps P026, Stripe P045 y soak P058.
Serie 02 solo estructuras/algoritmos. Sin commit/push, publicación, traducción
o audio automáticos. Últimos commits: blog 89bc6b1/examples b591162.
Servidor propio 2503878 cerrado tras QA; ningún contenedor GPU propio activo.


## Continuación vigente: P104 desarrollado en nueve drafts

El último turno fue progreso: añadió nueve artículos P104 y el laboratorio
`model-adaptation`. No hay commit nuevo. Ver [ruta](ruta-adaptacion-modelos.md),
[manifiesto](model-adaptation-series.json), [glosario](model-adaptation-glossary.md)
y [revisión](model-adaptation-review.md). Español, draft true/status draft,
Luis Ramírez Calle, independiente de PaySafe. Código completo en examples;
nueve D2/SVG, cuatro plots y visor en el blog. Nueve extractos ejecutados.

Protocolo declarado antes de resultados: tres pretrainings y 21 adaptaciones,
siete estrategias por tres seeds, datos sintéticos con frontera lineal y 256 filas
target test reservadas. Scratch iguala/supera full; conservar ese resultado.
Retención con decoder original y módulo activo: pesos base intactos no implican
comportamiento intacto. Contrastive: cálculo y gradientes de tres pares, sin
entrenamiento SimCLR. El laboratorio P104 no es un benchmark de GPU.

Verify repite entrenamientos, predicciones y curvas; once hashes numéricos.
Pasan nueve tests Python, tres JS, 203 editoriales/estructurales y 17 del blog.
Chromium: 20 vistas a 1440/360; informe inicial
`/tmp/model-adaptation-layout.2OKVCg/report.json` (final), 13 figuras y cuatro
secciones inspeccionadas. Se muestra en notación científica la loss pequeña de
T=0.1 para evitar un cero aparente. El check final terminó correctamente.
Servidor propio cerrado con astro dev stop tras completar QA.
Build: 50 rutas, Pagefind diez páginas/4280 palabras/dos idiomas, drafts fuera.
45 workspace projects/44 labs, 328 índices/168 exports. Inventario 79/19/77
significa existencia, no aceptación global.

### Siguiente bloque: P105 con GPU real disponible

Preflight actual: NVIDIA GeForce RTX 5070 Laptop GPU, 8151 MiB, driver 595.99.02;
`/dev/nvidia0` y `nvidia-smi` presentes. Elegir runtime CUDA compatible y fijado
por digest: la imagen actual usa PyTorch CPU. No modificar el driver del usuario.
Fijar el protocolo antes de medir: warmup, synchronize, repeticiones, batches,
precisiones, VRAM allocated/reserved, controles de calidad FP32 y OOM acotado.
Dividir CPU/GPU/transferencias, batching, mixed precision, accumulation, profiling
y determinism en posts específicos. El preflight no satisface el gate P105.

El objetivo de 175 fichas sigue abierto. Mantener gaps P026, Stripe P045 y soak
P058. Serie 02 solo estructuras/algoritmos. Sin publicación, traducción, audio,
commit o push automáticos. El usuario pidió los commits anteriores antes de
reactivar el objetivo y ya estaban hechos: blog 89bc6b1/examples b591162.
Los cambios P104 quedan para la próxima revisión. Detener el dev server propio
tras terminar QA y comprobar el estado real al retomar.

## Continuación vigente: P103 escrito y organización editorial trasladada

P101, P102 y P103 suman25drafts nuevos en español de Luis Ramírez Calle,
independientes de PaySafe. P103 está en [ruta](ruta-atencion-transformer.md),
[manifiesto](attention-transformer-series.json),[glosario](attention-transformer-glossary.md)
y[revisión](attention-transformer-review.md). El usuario pidió continuar y guardar
TODO mediante commits; consultar git log en ambos repositorios para sus hashes.
No hacer push, publicar, traducir o generar audio sin nueva autorización.

Limpieza:139documentos y45herramientas trasladados desde el blog a este monorepo,
sin descartar información necesaria para pruebas o continuación. El blog conserva
el roadmap principal, artículos, assets y3scripts propios. Ver [organización](repository-cleanup.md).
Los scripts antiguos se invocan con BLOG_ROOT y pnpm blog:tool, nombre sin extensión.
Los metadatos se localizan mediante editorialPath; solo contenido/assets usan blogPath.

P103: Q/K/V; escala/softmax; máscaras; multi-head; posiciones; bloque pre-norm;
encoder/decoder; causalidad/coste denso. Ocho posts de1080–1270palabras con código,
ocho D2/SVG, cuatro figuras yvisor. Código en packages/attention-transformer.
Sin entrenamiento. Float64CPU,ancho8,heads2,FFN16,batch2,seeds7/19/31. Nueve casos
self_full4,self_causal5,cross5×4,288parámetros. Matrices,softmax,contextos ysalida
contrastados con SDPA/MHA;gradientes Q/K/V también. Máscaras True=allowed frente
a MHA True=excluded. Fila sin keys se rechaza; SDPA ceroobservado no universal.

Decoder-only820/encoder-decoder1740 por seed,pre-norm,PEsinusoidal,dropout0.
Futuro target no cambia prefijos; sin máscara cambian≈.650/.392/.527.
Gradiente al futuro yotra muestra0. Sourcepadding no afecta, sourceválido sí.
Softmax ingenua[1000,1001,999] nofinita;estableprobabilidadesválidas.
Escala/entropía bajo componentes normales independientes,no calidad.
Tres pruebas de permutaciones distinguen token yposición;sin promesa extrapolación.
Tensor scoresB2H2float64:512/2048/8192/32768bytes porL4/8/16/32,no VRAMtotal.

RuntimeCPU por digest reutilizado:Python3.13.17,NumPy2.5.4,PyTorch2.14.1+cpu,
linux/amd64,2CPUs/2GiB/un thread,rednone,pullnever,rootfs/bindreadonly,user1000:100,
capdropALL. Diez hashes,results/observations.json ycomparison.json idénticos.
Verify recalcula todos los controles,rtol1e-10/atol1e-12.12testsPython/3JS.
Pasan194checks editoriales/estructurales y17tests blog (los dos del roadmap ahora
están en la suite editorial).43labs,319índices,159exports. Inventario78/19/78
es existencia, no aceptación global. DoscapturasDocker P062/P063 renovadas de
verdad por cambio de lockfile de las herramientas;ver revisiones de esos bloques.

Chromium P10318vistas1440/360:168matrices,336filas,672contribuciones,32posiciones,
30filas de gradiente,teclado,scroll,links y404. Informes raHdqa/p4ir2N en
/tmp/attention-transformer-layout.*/report.json. Visita de suite recurrente
migrada rmxpDL a360 pasa. Visual /tmp/attention-transformer-visuals/report.json.
Se corrigió raíz inline KaTeX que ensanchaba página; se conserva matemática
con notación equivalente. Selección Playwright por value resuelve ambigüedad
valor/etiqueta, no se cambió el control del producto para satisfacer la prueba.

### Siguiente bloque: P104, pretraining y adaptación

Leer la ficha completa del roadmap en BLOG_ROOT/docs/roadmap-editorial-ingenieria-paysafe-ia.md.
Dividir self-supervision/objetivos, pretraining, contrastive learning, freeze/unfreeze,
full fine-tuning, PEFT, LoRA, adapters yforgetting. Laboratorio obligatorio:
ajustar un modelo pequeño ycomparar con baseline sobre TEST NO VISTO. La tarea de
ocho patrones repetidos de P102 no cumple ese gate. El P101 de transferencia no
lo sustituye. Declarar splits/budgets/controles antes de ejecutar yconservar
resultados desfavorables. Código completo en monorepo,posts/recursos en blog.
Mantener gapsP026,Stripe sandboxP045,soakP058;Serie02solo estructuras/algoritmos.
El objetivo completo continúa abierto; no hay aceptación por conteo de IDs.

## Historial anterior (rutas de scripts corresponden a su ubicación histórica)

## Continuación vigente: P102 desarrollado en ocho drafts

El turno anterior fue progreso: añadió ocho artículos P102 y el laboratorio
recurrent-sequences; terminó las pruebas de navegador antes de la interrupción.
Se han recuperado los informes reales, no reiniciado los entrenamientos.
Ver [ruta](ruta-redes-recurrentes.md), [manifiesto](recurrent-sequences-series.json),
[glosario](recurrent-sequences-glossary.md) y [revisión](recurrent-sequences-review.md).
Español, draft true/status draft, Luis Ramírez Calle, independiente de PaySafe.
P101 y P102 se conservan sin commit:17drafts nuevos. Últimos commits explícitos
blog `b7d32df` / ejemplos `7de597d`. No commit/push, publicación, traducción o audio automáticos.

Orden P102: embeddings; hidden state; longitudes variables; RNN; LSTM; GRU;
gradientes y dependencias largas; teacher forcing/generación. Ocho extractos
Python, ocho D2/SVG, cuatro figuras y visor de cuatro secciones. Código completo
en `luisrc-blog-examples/packages/recurrent-sequences`, sin alterar fuentes hash
P096–P101. Catálogos por post y carpetas inglesas.

Nueve predictores de memoria: RNN/LSTM/GRU×seeds7/19/31; train512/validation256,
longitudes4…12, primero1/2→etiqueta0/1, distractores3…6,QUERY7final. Embedding8,
hidden16, parámetros530/1778/1362. Adam.01/clip1,batch64,80epochs,640updates.
Último estado, sin checkpoint elegido por validation. Probes128equilibrados por
longitud4/8/12/24/48/96: accuracy1 en todos. NO forzar un fracaso de RNN.

18trazas (12/48por modelo), estados/puertas reconstruidos con pesos reales y
gradiente del logit correcto respecto a embeddings. RNN7/long48: primergradiente
≈3.198e-22 ypredicción correcta. Distinguir sensibilidad infinitesimal, cambio de
símbolo discreto y dificultad de aprender desde cero. Potencias .5^T/1.2^T y
camino fijo .99^T aislados; este último no es derivada total de LSTM.

Tres GRU de continuación,1498parámetros,seeds7/19/31,60epochs/batch32/240updates.
Ciclos de ocho símbolos+EOS: SOLO ocho patrones posibles, los ocho en train128 y
validation64; solapamiento archivado. No afirmar generalización a patrones nuevos.
Inputs BOS+targets desplazados. Prefijo real de dos tokens, después teacher usa
pasado real yrollout sus propios tokens. Métricas finales tokenaccuracy/exactmatch1;
las curvas SÍ muestran diferencias mientras aprenden. No inventar una brecha final
ni negar las diferencias transitorias. Perturbación de primer token es artificial.

Controles: lookup/onehot/gradPAD/repeticiones; packed batch desordenado frente a
individual yPAD extra; loss masked por siete tokens válidos; causalidad de inputs
desplazados; celdas nativas/manuales. GRU reset tras W_hh+bias frente a antes:
error≈.07862si se intercambia. LSTM moderna con forget gate, no atribución histórica
simplificada; estado cero de entrada no implica estado recurrente fijo.

Captura2026-10-25T22:14:53.211252+00:00. Runtime por digest reutilizado: Python3.13.17,
NumPy2.5.4,PyTorch2.14.1+cpu,linux/amd64,2CPUs/2GiB,un thread,rednone,pullnever,
rootfs/bindreadonly,user1000:100,capdropALL,timeout300s. Doce hashes; verify repite
12entrenamientos ycontroles,rtol1e-5/atol1e-7,dos copias JSON iguales. Sin GPU,
paquetes Python nuevos en host o dataset externo. Limpieza de contenedor propio.

Pasan12tests Python,3JS,184checks editoriales/estructurales y19tests blog.
Frozen pnpm install43proyectos;42labs,311índices,150exports,lockfile intacto.
Build50rutas;Pagefind10páginas/4280palabras/dosidiomas. Drafts excluidos.
Inventario77draft_exists/19related_only/79not_written no acepta el roadmap completo.

Chromium18vistas1440/360px. Por ancho:36checkpoints,90embeddings,108selecciones de
estado,18celdas,24ejemplos generativos,curvas,teclado,scroll,links,iframe y404.
Informes finales `/tmp/recurrent-sequences-layout.OV7pnE/report.json` (1440) y
`/tmp/recurrent-sequences-layout.LFpAUy/report.json` (360), recuperados tras pausa.
Inspección visual `/tmp/recurrent-sequences-visuals/report.json`. Se corrigieron
ecuaciones en una línea que provocaban375px de ancho a360; luego350en los ocho
posts. Diagramas muestran entradas ycamino directo adecuados. Tablas con notación
científica legible para magnitudes pequeñas/grandes, cero y ausente separados.
Servidor propio2141010 se cierra al recuperar la sesión; sin containers sequence.

### Siguiente acción: P103, atención y Transformer

Desarrollar Q/K/V, escala, máscaras, multi-head, posiciones, bloques, encoder/decoder
y causalidad como preguntas separadas. Laboratorio obligatorio: self-attention
implementada con tensores, dimensiones y máscaras contrastadas; no requiere un
modelo grande entrenado. Cuidado con convenciones booleanas distintas entre SDPA
y MultiheadAttention, padding de keys frente a queries, filas totalmente excluidas
y fuga de tokens futuros. Usar arrays reales y controles negativos; no atribuir
semántica a pesos inicializados ni reproducir benchmarks del paper de 2017 sin medir.
Mantener P026, Stripe sandboxP045, soakP058 ySerie02solo estructuras/algoritmos.
El objetivo completo sigue activo y faltan fichas y gates por verificar.

## Historial anterior

## Continuación vigente: P101 desarrollado en nueve drafts

El turno anterior fue progreso: commits explícitos blog `b7d32df` y ejemplos
`7de597d`, con P098–P100 guardados y ambos repositorios limpios. Ahora se añaden
nueve drafts españoles de Luis Ramírez Calle, independientes de PaySafe. Ver
[ruta CNN](ruta-redes-convolucionales.md), [manifiesto](convolutional-networks-series.json),
[glosario](convolutional-networks-glossary.md) y [revisión](convolutional-networks-review.md).
No hacer commit/push, publicar, traducir o generar audio automáticamente.
Las secciones posteriores de este archivo son historial de entregas anteriores.

Orden: convolution/kernel/cross-correlation; padding/stride/dilation; pooling;
receptive field; canales; entrenamiento; feature maps; arquitecturas;
transfer learning. Entre 1109 y 1451 palabras con código y metadatos por pieza.
Nueve extractos Python, nueve D2/SVG, tres figuras estáticas y visor de cinco
secciones. Código completo en `luisrc-blog-examples/packages/convolutional-networks`;
no se modifican fuentes hash de P096–P100. Carpetas inglesas e índices por post.

Experimento real: imágenes sintéticas de segmentos 24×24, un canal, cuatro
orientaciones, train256/validation128, generadores101/102. TinyCNN: dos convolutions
1→4→8 con ReLU, maxpool2 entre ellas, GAP y head. Source372parámetros, Adam.01,
40epochs/batch32/320updates, seeds7/19/31. Último checkpoint, no selección de
validation. Accuracy1 en las tres, solo sobre ese generador.

Target cambia apariencia y etiquetas a ejes frente a diagonales: train32 y
validation128, seeds201/202. Cuatro modos por seed: scratch, random_frozen,
frozen y fine_tune. Head inicial idéntica; pares de backbone compartidos según
origen. 40epochs/batch16/80updates. Frozen/random_frozen:18parámetros entrenables,
backbone eval/no_grad/intacto. Scratch/fine_tune:354. Fine-tune lrbackbone.001 y
head.01; los demás.01. Source→target usa .pt real temporal solo del backbone.

Transfer NO gana con el protocolo declarado. Accuracy target scratch7/19/31:
.9609375/.9609375/.9765625; frozen .515625/.5/.5390625. Se conservan también curvas
random_frozen y fine_tune. No retunear para imponer una mejora; no se aisló
causalmente apariencia frente a etiquetas o presupuesto. Las seeds comparten datos.

Mapas del source7/epoch40, primeras validation por clase, índices0/32/64/96:
112mapas de cinco etapas,32gradientes de conv2_pre[:,6,6]. Escala compartida por
etapa o contraste local declarado. No semántica certificada, causalidad o
explicación de clase a partir de esos mapas. RFteórico8,jump2,start1; centro9…16,
esquina0…4 reales. Referencia positiva usa avgpool para hacer visible todo el
soporte; CNN entrenada usa maxpool, gradiente posiblemente escaso. No confundirlos.

Probes:112salidas de ocho geometrías vs Conv2d, productos por coordenada,
padding asimétrico, pooling/gradientes/bordes/desplazamientos/aliasing, suma
multicanal yconteo de parámetros. ResidualBlock ejecutado ytestado pero no usado
en los15trainings: ramas compatibles, proyección ysalida ReLU(x) con rama cero.

Runtime CPU reutilizado por digest: Python3.13.17, NumPy2.5.4, PyTorch2.14.1+cpu,
linux/amd64. Dos CPUs/2GiB, un thread, rednone, pullnever, rootfs/bindreadonly,
user1000:100, capdropALL, timeout300s. Captura2026-10-25T21:40:56.960649+00:00.
Once hashes de fuentes. Verify volvió a ejecutar15trainings ycontroles con
rtol1e-6/atol1e-7. Dos copias JSON iguales. Sin paquetes Python nuevos en host,
GPU, torchvision, dataset externo, benchmark de tiempo o test final.

Pasan9tests Python,3JS,177checks editoriales/estructurales y19tests blog.
Frozen pnpm install42proyectos;41labs,303índices,141exports,lockfile intacto.
Build50rutas;Pagefind10páginas/4280palabras/dosidiomas. Drafts excluidos.
Inventario76draft_exists/19related_only/80not_written no prueba aceptación global.

Chromium final20vistas,1440/360px:224celdas,224mapas,64gradientes,90checkpoints,
448selecciones de escala,curvas completas,teclado,scroll interno,enlaces y404.
Informes M0VtvM/cwjp6D en `/tmp/convolutional-networks-layout.*/report.json`.
Inspección visual adicional `/tmp/cnn-visuals/report.json`. Se corrigió tabla
móvil que ensanchaba la página; no se ocultó overflow ni se relajó el criterio.
Una aserción de scroll inicial se movió antes de la acción de teclado que lo
cambiaba. Servidor propio2066563 detenido,4322libre; no containers luisrc-cnn-.

### Siguiente acción: P102, redes para secuencias

Leer P102 y dividir preguntas: representación/embeddings, hidden state y unroll,
longitudes variables/padding/masking, RNN, puertas LSTM, GRU, gradientes y
memoria larga, teacher forcing frente a generación. Valorar piezas pequeñas
antes de escribir. Laboratorio obligatorio: predictor secuencial realmente
entrenado y contraste de dependencias largas; no sustituirlo por una animación.
Declarar datos/splits/presupuestos, controles y métricas antes de entrenar.
Reutilizar runtime CPU e inspeccionarlo; usar pnpm para instalaciones y mantener
código completo en el monorepo hermano, con extractos explicados en el blog.

P104 conserva su alcance de pretraining/PEFT/test no visto; este bloque CNN no
lo completa. Mantener P026, Stripe sandboxP045, soakP058 y demás gaps. Serie02
solo estructuras/algoritmos. El objetivo completo sigue activo y no se ha
probado que todas las fichas y gates del roadmap estén satisfechos.

## Historial de continuaciones

## Continuación vigente: P100 desarrollado en diez drafts

El turno anterior fue progreso:P099 quedó escrito,ejecutado yverificado. Se
preservan P098/P099 sin commit yse añaden diez drafts P100,español,autor Luis
Ramírez Calle,independientes de PaySafe. Ver [ruta](ruta-generalizacion-estabilidad.md),
[manifiesto](generalization-stability-series.json),[glosario](generalization-stability-glossary.md)
y[revisión](generalization-stability-review.md). No hacer commit/push,publicación,
traducción o audio automáticamente. Últimos commits explícitos siguen siendo
blog9412094/ejemplosb900c13. Hay24drafts nuevos de P098/P099/P100 pendientes.

Orden:diagnóstico overfit/underfit;bias–variance;initialization;activations;
BatchNorm;LayerNorm;Dropout;weight decay;early stopping;gradient clipping.
Se dividió antes de escribir:953–1127palabras con código/metadatos por pieza.
Diecisiete extractos Python,diez D2/SVG,cuatro gráficas yvisor con módulos
dinámicos. Código completo en `luisrc-blog-examples/packages/generalization-stability`.
No importa ni modifica fuentes hash de P096–P099. Carpetas inglesas eíndices por post.

Experimento principal real:regresión sin(2πx),train24 equiespaciados[-1,1],ruidoσ.25,
seed101,desplazamiento+1.25del target8 SOLO en train. Validation256xUniform/seed102,
ruidoσ.25,sin el desplazamiento adicional. Se declara contaminación deliberada,
no dos muestras iid limpias. Grid101contra señal para dibujar,no elegir modelo.
Sin test final. MLP1→64→64→1,ReLU,float64,4353parámetros;AdamWlr.01,full-batch,
máximo2000updates/epochs,monitorización cada10 en eval/no_grad.

18runs:seeds7/19/31 por baseline,dropout.15,decay.01solo matrices,BatchNorm,
LayerNorm yearly stopping. Matrices iniciales emparejadas;BN/LN añaden256parámetros.
Dropoutseed separada deinitialization. Se comparan métricas en el mismo modo,
onlineMseLast aparte. No se ajustan hiperparámetros después de ver resultados.

Las tres baselines terminan con menor train ypeor validation que su mejor
checkpoint monitorizado. Seed7:best430,val.1960405460;final2000train.0064919374,
val.2047013230. Seed19:best310,val.1831855201;finalval.2053928661.
Seed31:best310,val.1767178248;finalval.1952682169. Referencia lineal resuelta
por mínimos cuadrados train.3650527625/val.4953123923,limitación representacional.

Early:min_delta0,patience10CHECKS=100epochs aquí. Seeds7/31 paran530/410 yrestauran
430/310,mejorando el final continuo. Seed19 para170/restaura70,val.2728629474:
se detiene ANTES de la mejora posterior. Se conserva ese fallo de la política,
no se retunean datos/hiperparámetros para ocultarlo. La expectativa inicial del
verificador de mejora en las tres seeds fue rechazada. Verify exige propiedades
que sí definen la implementación:prefijo idéntico,mejor observación monitorizada,
patience exacta,restauración ydos éxitos/un empeoramiento. No volver a introducir
una garantía universal en ese gate. Last/best/selected separados,sin reescribir
curvas oinventar puntos después de la parada. Dropout empeora las tres finales;
decay/BN mejoran una cada uno,LN otra. No hay ranking universal.

Controles separados:32datasets sinoutlier para bias/variance con Legendre1/5/15,
ridge1e-4,identidad finita yruido esperado.0625,no bias poblacional exacto.
Initialization:8capas16→16,ceros/ReLU,Xavier/tanh gain1,He/ReLU,normalstd3/tanh;
saturación solo tanh,null paraReLU. Tanhgrande81,25%finalsaturada pero gradinputnorm
196.364688:no inferir vanishing global de ese indicador. Activations yunidad
ReLUinactiva contrastadas conautograd. BN/LN4×3,primera fila fija,compañeros
cambiados,affineFalse,manuales,ejes,runningvarN−1 vsforwardN,tracked/untracked y
singleton2D. Dropoutprobe p.2 independiente deltrainp.15. Clippingglobal[3,4]norm5→≤2,
NaN rechazado ycontraejemploAdam:step≈.09999>ητ. Parábola50θ²:lr.05diverge,sinclip
guard enstep9;clip1 acota perooscila;lr.01resuelve. Clipping NO se aplica a18runs
de generalización ni se presenta como cura de overfitting.

Runtime CPU por digest reutilizado einspeccionado:Python3.13.17,NumPy2.5.4,
PyTorch2.14.1+cpu,linux/amd64. Dos CPUs/2GiB,un thread OMP/BLAS/MKL/Torch,rednone,
pullnever,rootfs/bindreadonly,user1000:100,capdropALL. Timeout300s por ejercicio,
limpia solo su contenedor propio aleatorio precomprobado. Sin paquetes Python
en host ocloud. No containers luisrc-generalization- restantes. Captura final
2026-10-25T20:51:40.314824+00:00,once hashes. Verify vuelve a entrenar18runs y
recalcular controles,rtol1e-9/atol1e-11 ypropiedades de trayectorias. No cambiar
fuentes hash anteriores sin regenerar observaciones dependientes.

Pasan10tests Python,3JS,170checks editoriales/estructurales y19tests blog.
Frozen pnpm install41proyectos pasa sin dependencias nuevas o cambios de lockfile.
40labs,294índices,133exports sincronizados. Build50rutas/76HTML,Pagefind10páginas/
4280palabras/dosidiomas. Auditor75draft_exists/19related_only/81not_written:
inventario,no aceptación global.

Chromiumfinal22vistas,1440/360px. Total108checkpoints,144snapshots de función,
192selecciones de capa/métrica,8matrices,18steps seleccionados de clipping,
más activations/grados,teclado,scroll interno,links,iframe,error404 ypeticiones
locales. Informe `/tmp/generalization-stability-layout.45nR1C/report.json`;
j1myqw anterior a los ajustes finales. Sin errores JS,overflow global opetición
fuera de la carpeta del visor. Inspección visual de diez diagramas,cuatro gráficas,
funcionesbest/last,parada19,código ycontroles:
`/tmp/generalization-visuals/report.json`. Figuras≤380px,fuentedegráfico14px,ticks
enteros para capas,tablas de normalización con5cifras significativas en UI y
precisión completa enJSON. Código inicial scrollLeft0. Servidor QA propio2058749
detenido;puerto4322sin listener comprobado.

**Siguiente:P101**,leer ficha completa yprerrequisitos. Convolution,kernel,padding,
stride,pooling,receptive field,feature maps,CNN architectures ytransfer learning.
Laboratorio obligatorio:entrenar CNN pequeña einspeccionar mapas de activación
reales,no solo un dibujo de convolution. Dividir preguntas específicas antes de
escribir. Reutilizar einspeccionar runtime disponible;si necesita torchvision u
otras capacidades,comprobarlas en la image antes de asumirlas. Mantener
instalaciones conpnpm ydatos/licencias/protocolo reproducibles.

P101–P175 yotros gaps siguen pendientes. Preservar P026,Stripe sandboxP045,
soakP058 ySerie02solo estructuras/algoritmos. El objetivo global sigue activo;
las notas inferiores son históricas.

## Continuación vigente: P099 desarrollado en siete drafts

El turno anterior fue progreso: P098 quedó escrito yverificado en siete drafts,
con entrenamiento NumPy yvisor. Se preserva sin commit. Ahora se añade P099 en
otras siete entregas españolas, independientes de PaySafe,autor Luis Ramírez Calle.
Ver [ruta](ruta-entrenamiento-pytorch.md),[manifiesto](pytorch-training-series.json),
[glosario](pytorch-training-glossary.md) y[revisión](pytorch-training-review.md).
No hacer commit/push,publicación,traducción o audio automáticamente. Últimos
commits explícitos siguen siendo blog9412094/ejemplosb900c13.

Orden:tensores/shapes/dtype/device/broadcasting;Dataset/DataLoader;nn.Module;
loop/autograd/loss/optimizer;evaluación;inferencia guardada;reanudación. Se valoró
dividir más:1044–1249palabras aproximadamente con código/metadatos yuna pregunta
por entrega. Catorce extractos Python,siete D2/SVG,dos gráficas yvisor dinámico.
Código completo en `luisrc-blog-examples/packages/pytorch-training`,carpetas inglesas;
el blog conserva extractos explicados yexports estáticos permitidos.

Pipeline PyTorch real,CPU,float64,MLP2→4→1,tanh,BCE media. Reutiliza modelo/datos
canónicos de P096 sin modificar fuentes oobservaciones anteriores. Train256,
validation128,seeds101/102,cuatro grupos de semiancho0,45 alrededor de(±1,±1).
Seeds de pesos7/19/31,copiados de NumPy aLinear con transposición. Generator420
dedicado,shuffleTrue,num_workers0,drop_lastFalse,batch30/cola16. Sesenta epochs,
540updates/15360muestras por run. SGDlr.1,momentum.9,StepLR cada20epochs×.5.
Evaluación batch50 con generadores separados. No es el orden/protocolo de P098
ni un benchmark entre implementaciones. Sin test final.

Validation BCE final:0,008309222327672137;0,004984868028258361;0,00806297935233508,
accuracy1 en las tres. Loss online con pesos cambiantes separada de evaluación
a pesos fijos. Cada epoch guarda orden,contadores,tasas usada/siguiente yestado.
Traza:backward no cambia pesos,step sí. Se comprueba cobertura de todos los índices.

Save/load mediante archivos .pt reales en directorio temporal propio,después
eliminado. Esquemas explícitos,weights_onlyTrue,map_locationCPU,strictTrue.
Inferencia recupera128logits con error0. Corte en epoch30/270updates. Reanudación
completa reproduce historial yparámetros exactamente en este runtime. Controles:
resetmomentum error0,01465689426;resetorden0,00318082863;solo modelo0,3408893113.
Este último termina con mejor validation loss y sigue siendo una trayectoria
distinta. No usar solo la loss final como prueba de reanudación.

Se preserva optimizador,scheduler,RNGdel loader yRNGCPU,además de modelo/config.
La red no consume RNGglobal en forward;una coincidencia de estado no prueba
restauración. Campos cpuRngMatchesSaved/loaderRngMatchesSaved describen igualdad.
El test perturba primero el RNGCPU con11draws ycomprueba restauración efectiva.
El helper evaluate tiene hooks que verifican modo eval ygrad desactivado en sus
forwards,no solo pesos conservados. Dropout es un probe separado;no se entrena
en la MLP. No se prueba mid-epoch,GPU,workers,AMP,DDP oaugmentations.

Runtime CPU por digest reutilizado einspeccionado:Python3.13.17,NumPy2.5.4,
PyTorch2.14.1+cpu,linux/amd64. Dos CPUs/2GiB,un thread OMP/BLAS/MKL/Torch;
rednone,pullnever,rootfs/dosbindsreadonly,usuario1000:100,capdropALL. Sin paquetes
Python en host ocloud. Captura final2026-10-25T20:31:47.167940+00:00,trece hashes.
Verify vuelve a entrenar,guardar,cargar ycontrastar informes;rtol1e-10/atol1e-12
ycondiciones de exactitud/rechazo adicionales. No modificar fuentes hash de
P096/P097/P098/P099 sin regenerar evidencia dependiente.

Pasan13tests Python,3JS,163checks editoriales/estructurales y19tests blog. Frozen
pnpm install40proyectos pasa,sin dependencias nuevas ocambio de lock.39labs,
284índices,124exports sincronizados. Build50rutas/75HTML,Pagefind10páginas/
4280palabras/dosidiomas. Inventario74draft_exists/19related_only/82not_written
no equivale a aceptación global.

Chromium16vistas,1440/360px:126checkpoints,96comparaciones de reanudación,
4shapes,972filas de batches,tablas/curvas/cursores,teclado,scroll interno,links,
iframe,error404. Sin errores JS,overflow global opetición fuera de la carpeta
del visor. Informe final `/tmp/pytorch-training-layout.aY61GG/report.json`.
El primer intento PxXTCR detectó una frase compacta sin espacios que desbordaba
16px;se corrigió su redacción sin ocultar overflow. V3ocsl es previo a la última
captura. Inspección visual de todos los diagramas,gráficas,código yvisor;comprobación
adicional `/tmp/pytorch-final-visuals/report.json`,código inicial scrollLeft0.

**Siguiente:P100**,leer ficha completa yprerrequisitos. Se requiere introducir
overfitting deliberado,corregirlo ycomparar curvas:el XOR fácil actual no cumple
ese experimento. Dividir diagnóstico underfit/overfit/bias-variance,initialization,
activation,batch/layer norm,dropout,weight decay,early stopping yclipping en
preguntas específicas antes de escribir. Mantener protocolo ypresupuesto claros,
train/validation/test según su función ysin elegir conclusiones por una sola curva.
Reutilizar la image CPU disponible e inspeccionarla antes de ejecutar.

Mantener P026,Stripe sandboxP045,soakP058 ySerie02solo estructuras/algoritmos.
P100–P175 yotros gaps siguen pendientes. El objetivo global permanece activo.
Las secciones inferiores son históricas.

Servidor QA propio2002713 detenido;puerto4322sin listener comprobado.

## Continuación vigente: P098 desarrollado en siete drafts

El turno anterior fue progreso: commits explícitos blog `9412094` y ejemplos
`b900c13`, checkouts limpios comprobados. Ahora se añaden siete drafts de
optimización y dinámica de entrenamiento. Ver
[ruta](ruta-optimizadores-entrenamiento.md),
[manifiesto](training-dynamics-series.json) y
[revisión](training-dynamics-review.md). Español, autor Luis Ramírez Calle,
independientes de PaySafe. Este bloque queda sin commit; no hacer commit/push,
publicación, traducción o audio automáticamente.

Orden: epochs/batches/presupuestos; SGD/learning rate; momentum; Adam;
AdamW/L2/decay; schedules; gradient accumulation. Se valoró la división y se
separaron siete preguntas, alrededor de1100–1320palabras con código/metadatos.
Nueve extractos Python, siete D2/SVG, tres gráficas y visor de checkpoints.
Código completo en `luisrc-blog-examples/packages/training-dynamics`, carpetas
inglesas e índices por post; el blog conserva extractos explicados y exports.

Entrenamientos reales NumPy, MLP2→4→1,tanh,BCEmedia,float64,train256/validation128,
datos/orden/pesos idénticos por seed. Doce runs principales: SGD/momentum/Adam/AdamW
por seeds7/19/31,80epochs,batch32,640updates. Cinco ablations seed7: tasas SGD.001/1,
batches16/256 y momentum warmup/cosine. Protocolo previo, sin búsqueda posterior
de hiperparámetros, test evaluado, benchmark o ganador universal. Comparar tamaño
de batch mantiene epochs/muestras pero NO updates. Momentum-cosine termina peor
que su baseline y SGD1 mejora frente a SGD.1: se publican esos resultados.

Acumulación ponderada5/5/3 reproduce el gradiente completo con error1,388e-17;
promedio de medias incorrecto falla con0,045714. Ocho recorridos adicionales de
cinco epochs, cuatro métodos, batch32 frente a micro10:40steps por lado y máximo
error de parámetros5,552e-16. No BatchNorm/dropout/AMP/DDP. Las reglas de update
se contrastan con PyTorch en tests de gradientes controlados; no se presenta el
laboratorio como entrenamiento completo PyTorch de P099.

Runtime PyTorch CPU por digest ya disponible desde P097, Python3.13.17/NumPy2.5.4/
PyTorch2.14.1+cpu. Dos CPUs/2GiB, un thread OMP/BLAS/MKL, rednone/bindsreadonly,
usuario1000:100,capdropALL,pullnever. Sin instalación Python en host. No quedan
containers luisrc-dynamics-. Captura2026-10-25T19:42:00.042775+00:00,doce hashes.
Verify vuelve a entrenar17runs y controles, no solo hashes; valida versiones y
dos copias JSON,rtol1e-10/atol1e-12. Mantener fuentes hash anteriores intactas.

Pasan7tests Python,3JS,156checks editoriales/estructurales y19tests blog. Frozen
pnpm install39proyectos pasa sin nuevas dependencias o cambios de lockfile.
38labs,277índices,117exports sincronizados. Build50rutas/74HTML; Pagefind10páginas/
4280palabras/dosidiomas. Auditor73draft_exists/19related_only/83not_written es
inventario, no aceptación global.

Chromium16vistas,1440/360px,540estados y1800filas: tablas/curvas/cursores, null,
teclado, scroll interno, iframe, enlaces/assets y error404. Sin errores JS,
overflow global o peticiones fuera de la carpeta del visor. Informe final
`/tmp/training-dynamics-layout.YvOFp7/report.json`; revisión visual adicional de
diagramas y SGD en ocho vistas `/tmp/training-visuals/report.json`.
Se corrigió el control de seed que mostraba31 desactivado al cargar ablations7;
ahora muestra7, con aserción de valor. Fuentes de gráficos14px, figuras≤380px.

Un comando de build no llegó a arrancar por timeout de revisión automática de
permisos. El único reintento terminó correctamente; sin bloqueo pendiente por
ese motivo. Servidor QA propio1850743 detenido; puerto4322sin listener comprobado.

**Siguiente: P099**, leer su ficha completa y prerrequisitos. Construir entrenamiento
end-to-end PyTorch con torch.Tensor,broadcasting,autograd,Dataset/DataLoader,
nn.Module,loss,optimizer,train/eval,save/load. Dividir en preguntas específicas;
verificar checkpoints y reanudación con estado del optimizador/reloj, además de
predicciones. Reutilizar la image CPU ya disponible, inspeccionándola antes.
No contar el contraste de updates de este bloque como aceptación de P099.

Mantener P026,Stripe sandboxP045,soakP058 y Serie02solo estructuras/algoritmos.
P099–P175 y los demás gaps siguen pendientes. Objetivo global activo; las notas
inferiores describen estados históricos.

## Estado vigente: P066, P096 y P097 preparados para commit

Por petición explícita del usuario se guardan los cambios de los tres bloques en
ambos repositorios. Las notas inferiores sobre cambios sin commit describen el
estado anterior a esta petición. No se solicita push, traducción, publicación ni audio.

P097 añade cinco drafts: computational graph y chain rule, BCE desde logits,
backpropagation por matrices, gradient checking y autograd en PyTorch. Ver
[ruta](ruta-forward-backward-autodiff.md),
[manifiesto](autodiff-foundations-series.json) y
[revisión](autodiff-foundations-review.md). Se conservan los siete drafts de P066
y los cinco de P096: diecisiete entregas españolas en total.

El laboratorio `packages/autodiff-foundations` contrasta gradientes manuales,
diferencias finitas y PyTorch CPU sobre tres configuraciones, con controles
incorrectos y un visor de resultados reales. Runtime fijado por digest, disponible
para reutilizar; no modificar fuentes con hash sin regenerar observaciones.
Cinco diagramas, dos gráficas y el visor están sincronizados con el blog.

Validación previa al commit: 19 tests del blog y 149 checks editoriales y del
monorepo pasan. La revisión registra además build/Pagefind, 10 tests Python,
3 tests JS y QA de navegador en 12 vistas. Índices: 270; laboratorios: 37;
exports: 109. Inventario: 72 draft_exists, 19 related_only, 84 not_written;
no equivale a aceptación global.

**Siguiente: P098**, optimización y entrenamiento con epochs, batches,
minibatches, SGD, momentum, Adam/AdamW, schedules y gradient accumulation.
Dividir en artículos específicos y comparar curvas reales con un protocolo justo.
Mantener los pendientes P026, Stripe sandbox P045, soak P058 y el alcance de
Serie02 limitado a estructuras de datos y algoritmos. El objetivo global sigue
activo; las secciones inferiores son históricas.

## Continuación vigente: P096 desarrollado en cinco drafts, 25 de octubre de 2026

El turno anterior fue progreso: P066 quedó escrito y verificado en siete drafts,
con laboratorio y visor; sus cambios siguen sin commit y se han preservado. Ahora
se añade el primer bloque de Serie10 Deep Learning, cinco entregas de P096. Ver
[ruta](ruta-fundamentos-redes-neuronales.md), [manifiesto](neural-foundations-series.json)
y [revisión](neural-foundations-review.md). Español/draft, autor Luis Ramírez Calle,
sin traducción/publicación/audio. No hacer commit/push automáticamente.

Orden: perceptrón/neurona/weights/bias/XOR; dense layers/shapes/broadcasting;
activations/estabilidad; entrenamiento NumPy; representación/aproximación universal.
Cinco D2/SVG de277–309px, tres gráficas estáticas, nueve extractos Python probados y
visor de checkpoints/predicciones/activaciones. Código en el monorepo dedicado,
`packages/neural-foundations`; cinco índices por post con carpetas inglesas.

Laboratorio realmente entrenado, no simulación: MLP2→4→1,tanh,17parámetros,
BCEdesde logits,float64,3000actualizaciones full-batch,lr0,1. Protocolo previo con
baseline logística, control ceros y seeds7/19/31. Splits256/128/256independientes,
balanceados, seeds101/102/103, cuatro cuadrados alrededor de(±1,±1),semiancho0,45.
Ceros y logística50%test; tres MLP256/256. No calibración ni evaluación del hueco del
grid. Se separan representación, optimización y generalización, sin convertir el
juguete en una prueba de universal approximation o superioridad general de redes.

Captura2026-10-25T14:19:41.698402+00:00, ocho hashes de entradas. Runtime SciPy
notebook ya disponible por digest, Python3.13.15/NumPy2.5.3, dos CPUs/2GiB, un thread
BLAS/OMP/MKL, rednone/bindreadonly. Sin instalación Python o cloud. Verify vuelve a
entrenar cinco casos y compara con tolerancias, no solo hashes. Seis tests Python,
tres JS contra NumPy,143checks editoriales/estructurales y19tests blog pasan.
No containers luisrc-neural- restantes. Sin dependencias nuevas o cambios de lock.

Build50rutas/72HTML,Pagefind10páginas/4280palabras/dosidiomas. Índices265,labs36,
exports102 sincronizados. Auditor71draft_exists/19related_only/85not_written es
inventario, no aceptación global. Chromium12vistas:210checkpoints,32mapas ocultos,
80probes y606selecciones de activation, más teclado/error/links/scroll interno.
Informe `/tmp/neural-foundations-layout.nX2TwI/report.json`. Tres posts se comprueban
tras aclaraciones nats/recodificación y reducción de diagramas:
`/tmp/neural-visuals/final-article-check.json`. Gráficos y código inspeccionados.

La integración sufrió un timeout de revisión automática de permisos antes de
arrancar el comando; se reintentó una vez en pasos pequeños y terminó correctamente.
No queda bloqueo ni acción pendiente de aprobación por ese motivo.

**Siguiente: P097**, leer ficha completa y prerrequisitos. Desarrollar computational
graph, loss, chain rule, backward por capas, reverse-mode autodiff y gradient checking;
contrastar con framework, no contar el test numérico de P096 como artículo terminado.
Revisar runtime disponible antes de elegir framework. El host no tiene torch;
no asumir que la image SciPy lo incluye. Mantener instalaciones con pnpm y reutilizar
runtimes fijados cuando existan. P098optimizers y P099PyTorch vienen después.

Puede ampliarse el laboratorio existente. Si cambian entradas hash, regenerar sus
observaciones y exports y actualizar las cifras de los posts, sin rebajar verificadores.
El objetivo completo conserva P097–P175 y gaps previos: P026,Stripe sandboxP045,
soakP058 y los restantes criterios de aceptación. Serie02solo estructuras/algoritmos.
Últimos commits blog1c2e9d1/ejemplos57b4890; P066 y P096 quedan sin commit.
Servidor QA propio1372791 detenido;4322sin listener al cierre.
Las notas inferiores son históricas. El objetivo global sigue activo.

## Continuación vigente: P066 escrito y verificado, 25 de octubre de 2026

El turno anterior fue progreso: commits explícitos blog `1c2e9d1` y ejemplos
`57b4890`, ambos checkouts limpios al reanudar. Ahora se añaden siete drafts de
capacidad/costes; ver [ruta](ruta-capacidad-costes.md),
[manifiesto](capacity-costs-series.json) y [revisión](capacity-costs-review.md).
No están comiteados; no hacer commit/push/publicación/traducción/audio automáticos.

Orden: RPS/Little, utilization/margen, bottlenecks, autoscaling/colas, tres
presupuestos, compromisos y FinOps. Código en `packages/capacity-costs`, carpetas
por post inglesas, snippets explicados en los posts y enlaces al monorepo. Siete
D2/SVG, gráfico monetario y comparador con funciones del modelo tipado compartidas.

Tres perfiles y tarifas ficticias explícitas, sin benchmark/factura cloud. Nueve
hashes, cálculo final2026-10-25T14:04:05.173Z. Siete contratos locales y TSstrict5.9.2
pasan. No dependencias declaradas o cambios de lockfiles. Estimación por franjas
supone preparación perfecta; traza fluida independiente300s/60pasos no es HPA ni
simulación mensual. CPU×2 marca campaña inviable con máximo8, payload×10 altera
subtotal; compromisos incluyen ociosidad y el reparto reconcilia cada microUSD.

Build50rutas/71HTML, Pagefind10páginas/4280palabras/dos idiomas,19tests blog y137checks
editoriales/estructurales pasan. Índices260,labs35,exports94. Auditor70draft_exists/
19related_only/86not_written no demuestra aceptación global. Chromium16vistas,
48combinaciones mensuales y360intervalos con teclado, sin errores/overflow; informe
`/tmp/capacity-costs-layout.MqoIWu/report.json`. Diagramas/gráficos/visor inspeccionados.

**Siguiente: Serie10 Deep Learning, desde P096.** P096 requiere neurona, weights,
bias, activations, dense layers, XOR, non-linearity y matices de universal
approximation; laboratorio MLP NumPy para puntos no lineales. Revisar P076/P078/P079
existentes y separar conceptos cuando lo necesiten antes de P097 backprop/autodiff.
No sustituir entrenamiento real reproducible por una animación. Series07–09 tienen
material previo, cuya existencia tampoco resuelve automáticamente todos los gaps.

Preservar P026,Stripe sandboxP045,soakP058 y Serie02solo estructuras/algoritmos.
Servidor QA propio1145405 detenido; puerto4322 sin listener al cierre.
El objetivo global sigue activo. Las notas inferiores describen estados históricos.

## Estado vigente: AWS y P065 preparados para commit, 25 de octubre de 2026

Por petición explícita del usuario se guardan los cambios pendientes en ambos
repositorios. Hay once drafts AWS, seis Terraform y once Kubernetes, todos en
español, con diagramas, ejemplos explicados y enlaces al laboratorio externo.
No se publican, traducen ni generan audios. Las notas inferiores describen estados
anteriores; el bloque Kubernetes de P065 ya está escrito y verificado.

Ver [ruta conjunta](ruta-terraform-kubernetes.md),
[manifiesto Kubernetes](kubernetes-series.json) y
[revisión](kubernetes-review.md). Su laboratorio registra 23 fases reales de K3s,
26 hashes de entradas y 66 muestras de HPA. Los tres tests locales pasan. La
evidencia distingue readiness de liveness, observa OOM y scheduling, y comprueba
permisos mediante impersonation. El estado HPA inicial sin CPU válida se conserva
en tablas, pero no se dibuja como recomendación de escalar a cero. El recorrido
Service se prueba desde otro Pod; no se afirma haber validado hairpin al propio Pod.

La política de scripts auxiliares de pnpm se hace explícita sin añadir dependencias
ni modificar lockfiles. Se recapturan P062/P063 porque su build consume esa política;
sus verificaciones y las de Terraform siguen pasando. Los exports canónicos y sus
hashes están sincronizados: 253 índices de posts, 34 laboratorios y 88 exports.
Pasan 19 tests del blog y 132 comprobaciones editoriales/estructurales. Build y
Pagefind verificados; Chromium revisa 24 vistas de Kubernetes en escritorio y móvil,
sin errores, con fases y muestras recorridas por teclado. Informe:
`/tmp/kubernetes-layout.F49lGm/report.json`.

El siguiente bloque editorial es P066, capacidad y costes. Mantener los gaps P026,
Stripe sandbox P045 y soak prolongado P058; Serie02 solo estructuras y algoritmos.
P065 tiene cobertura como drafts y laboratorio local, no acredita preparación para
producción. El objetivo global sigue abierto. No se hace push ni publicación.

## Continuación vigente: bloque Terraform de P065, 25 de octubre de 2026

El turno anterior fue progreso: once drafts AWS con laboratorio/visuales/QA.
Se han preservado sin commit. Ahora se añaden seis drafts Terraform: P065,
TF-PROVIDERS, TF-STATE, TF-MODULES, TF-DRIFT y TF-CHANGES. Ver
[ruta P065](ruta-terraform-kubernetes.md), [manifiesto](terraform-series.json) y
[revisión](terraform-review.md). Autor Luis Ramírez Calle, español/draft, sin
traducción/publicación/audio. **P065 sigue parcial**, pendiente su bloque de
Kubernetes con artículos y experimentos propios; el auditor solo inventaría IDs.

Código en packages/declarative-infrastructure. Cuatro tests locales sin Docker,
seis índices por artículo, siete extractos HCL/JavaScript, seis D2/SVG y gráfico
derivado de cuatro planes. Visor estático de dieciséis fases con contadores de
acciones, no hereda HTTP entre fases y explica el plan ordinario tras refresh-only.
Tabla de estado legible sin scroll horizontal en móvil; direcciones largas y JSON
mantienen regiones desplazables. Ningún canal de control en el visor.

Laboratorio real: K3s1.35.9+k3s1 en Docker privilegiado, Terraform1.15.3 en container
y provider hashicorp/kubernetes3.4.0, versions y lockfile fijados. Node24.19.0,
image propia sin dependencias, importada al containerd local. No binarios host,
kubeconfig personal, nube o secretos reales. Herramientas/image base por digest.
La prueba preliminar de clúster se cerró verificando propiedad; no se reutilizó un
clúster ajeno. Finally del harness elimina solo container/red propios, sin prune.

Captura final2026-10-25T12:39:39.917Z, proyecto luisrc-declarative-9575171a,
namespace tf-lab-9575171a,16fasesobserved/17hashes. Seis recursos Terraform reales:
namespace, ConfigMap, fixture Secret, Deployment, Service e Ingress Traefik. Plan
create6, apply, HTTP esperado y no-change0. Borrar Pod cambia UID por controlador
sin apply. Drift de ConfigMap llega a HTTP y plan propone update1; se repara.
Otro apply hace stale al plan anterior y se comprueba el rechazo exacto. Cambio
de revisión reemplaza ConfigMap(create/delete) y actualiza Deployment; viejo nombre
ausente. Refresh-only acepta state pero conserva mensaje manual; plan ordinario
sigue difiriendo y apply recupera objetivo. Destroy6, namespace ausente/state vacío,
clúster y red eliminados. Images propias retenidas. No se prueba continuidad HTTP.

Se corrigieron dos fallos reales del harness sin rebajar criterios: NodeReady no
implicaba Traefik existente/listo; se espera disponibilidad del controlador. Fetch
Node24 ignoraba Host, confirmado con servidor loopback; nuevo cliente node:http
con Host explícito y test de regresión/restricción a loopback. No se retiró la regla
host. Los intentos fallidos limpiaron su clúster y no publicaron captura final.

State/planes/checkpoints privados en .artifacts ignorado. Directorio700 y kubeconfig600
comprobados. Solo se publican booleanos sobre atributo sensible/state, no valores,
kubeconfig o planes completos. El kubeconfig y tar de la ejecución correcta se
eliminaron tras teardown. No locking remoto, HA, fallo parcial de apply, TLS,
capacidad o autoscaling ensayados. Metrics-server instalado por K3s no prueba HPA.

Pnpm frozen34proyectos pasa; nuevo paquete sin dependencias, sin importador vacío
en lock según pnpm12. Test estructural exige importador a cualquier paquete con
dependencias. No nuevas dependencias ni cambios de rootpackage/workspace/lock ni
lock del blog. P062/P063/AWSverify siguen pasando. No repetir sus builds por entradas
que no cambiaron. 125checks editoriales/estructurales,19tests blog y4tests nuevos
pasan. Build50rutas/69HTML; Pagefind10páginas/4280palabras/dos idiomas. Índices242,
labs33,exports83. Auditor69draft_exists/20related_only/86not_written, no aceptación
de P065 completo. Fuentes canónicas y provenance sincronizadas; no servidores o
archivos privados exportados al blog.

Chromium final:14vistas1440/360(seis posts+visor),32selecciones de fase, valores y
acciones/barras exactos, prev/next/select/details/JSON con teclado, tablas, iframe,
noindex y enlaces/assets. Fallo de informe explícito, sin overflow global ni errores
JS; visor solo assets propios. Informe /tmp/terraform-layout.be3HyH/report.json.
El informe .fKWtyc es previo al ajuste móvil de snapshot. Se inspeccionaron los seis
diagramas, gráfico, HCL renderizado y visor en ambas anchuras.

**Siguiente acción: bloque Kubernetes de P065**, no P066 todavía. Separar API/Pods,
Deployment/ReplicaSet, Services/EndpointSlices/DNS, Ingress/controller, startup/
readiness/liveness, ConfigMaps/propagación, Secrets/RBAC, requests/limits/scheduling
y HPA/métricas. Usar los conceptos ya introducidos y ampliar el laboratorio con
observaciones reales: endpoint/readiness, reinicios, permisos y autoscaling. No
tratar la existencia de objetos como evidencia de cada mecanismo. El manifiesto
Terraform no contiene los futuros posts Kubernetes todavía.

Después P066, Deep Learning y series11–16. Conservar gapsP026, Stripe sandboxP045,
soak prolongadoP058 y Serie02 solo estructuras/algoritmos. Últimos commits siguen
bloge438cd4 y ejemplosec50a13; AWS y Terraform permanecen sin commit/push. El objetivo
global sigue activo. Servidor QA propio707580 detenido;4322sin listener al cierre.
Las notas inferiores son históricas.

## Continuación vigente: fundamentos AWS terminados como drafts, 25 de octubre de 2026

El turno anterior produjo progreso verificable: se guardaron los cambios en
blog e438cd4 y ejemplos ec50a13 por petición explícita. Ambos checkouts estaban
limpios al reanudar. La parte AWS entonces era inicial; ahora P064 se desarrolla
en once artículos españoles independientes enlazados en orden. Ver
[ruta](ruta-aws-fundamentos.md), [manifiesto](aws-foundations-series.json) y
[revisión](aws-foundations-review.md). No hay traducción, publicación o audio.

La secuencia cubre responsabilidad/IaaS/PaaS/serverless, IAM, VPC, EC2, Lambda,
ECS/Fargate, S3, SQS Standard, RDS, DynamoDB y comparación Lambda/ECS. Código en
packages/aws-foundations; nueve extractos TypeScript y un JSON completo en los
posts, once índices por artículo. Diagramas D2/SVG estrechos por concepto y
cost-summary.svg derivado de los dos escenarios. Visor estático oscuro con siete
campos, dos escenarios y modelo puro compilado compartido con tests.

Tarifas públicas AWS Price List capturadas2026-10-25T11:33:36.124Z, cinco ofertas,
diez dimensionesus-east-1/USD/on-demand, tramos y procedencia archivados. Snapshot
consistente no implica firma AWS. Diseños: HTTP API/Lambda Event Functions x86
sin VPC del cliente y ALB/Fargate privado en2AZ con6interfaces endpoint más
S3/DynamoDB gateway, sin NAT/internet externo. Dos IPv4 asumidas; DB común
propuesta, sin precio incluido. Subtotales2,033335/86,32905USD a1M;203,3335/163,9652
a100M con tasks/LCU/GB distintos. No capacidad equivalente, autoscaling observado,
factura total o TCO. Matriz de responsabilidades sin horas inventadas.

Captura final2026-10-25T12:10:51.810Z,25hashes, cuatro HTTP loopback200/404/405/503
frente a adaptador Lambda local. Reader ficticio; puerto35375 cerrado. En TDD se
corrigió Allow:GET en405 para ambos adaptadores y se recapturó. Verify contrasta
el informe público completo. No credenciales/deployAWS, permisos IAM efectivos,
SQS/S3 reales, restoreRDS, failover o rendimiento cloud probados. Los preflights
mantienen esas diferencias; restoreVerified siguefalse incluso si se declara true.

Quince tests y tipos strict pasan; exercise/verify local pasan. Frozen pnpm33
proyectos y467entradas supply-chain pasa con acceso al registry; offline no tenía
los metadatos requeridos. No nuevas dependencias ni cambios de lock/config raíz
ni del lock del blog. P062/P063verify intactos, sin repetir Docker innecesariamente.
119checks editoriales/estructurales y19tests blog pasan. Build50rutas/68HTML;
Pagefind10páginas publicadas/4280palabras/dos idiomas. Índices236,labs32,exports79.
Se conserva orden previo de índices y entradas ajenas a esta serie.

Chromium final:24vistas1440/360,11posts+visor por anchura. Dos escenarios, siete
campos, valores/barras/partidas exactas, tráfico cero, tres entradas inválidas,
reset/teclado, tablas/details y error explícito sin informe. No overflow global,
noindex, enlaces/recursos correctos, sin erroresJS y visor solo assets propios.
Informe: /tmp/aws-foundations-layout.1fPYA0/report.json. Inspección visual de todos
los diagramas, gráfico y visor en ambas anchuras. Las capturas previas
/tmp/aws-foundations-layout.TE4wmQ y .cHnjbX son evidencia anterior; el QA final
incluye la task definition completa y elimina scroll residual de teclado.

Auditor68draft_exists/20related_only/87not_written: inventario, no aceptación de
todo el objetivo. Siguiente P065: leer ficha y material relacionado, dividir
Terraform plan/state/providers/modules/drift y Kubernetes pods/deployments/services/
ingress/probes/secrets/autoscaling en artículos específicos. El laboratorio debe
probar infraestructura declarativa y un servicio mínimo local o cloud; no basta
una simulación del scheduler. No crear recursos facturables sin necesidad.
Después P066, Deep Learning y series11–16. Conservar gapsP026, Stripe sandboxP045,
soak prolongadoP058 y Serie02 solo estructuras/algoritmos.

Los cambios de P064 quedan sin commit/push. El objetivo global sigue activo.
Servidor QA propio468571 detenido;4322 y35375 sin listener al terminar.
Las secciones siguientes son históricas.

## Estado preparado para commit solicitado, 25 de octubre de 2026

El usuario ha solicitado guardar los cambios. P062 y P063 están terminados como
drafts españoles; P064 conserva únicamente su ruta, manifiesto y laboratorio
inicial. Sus once artículos, diagramas y visor siguen pendientes: no interpretar
el manifiesto como entrega de esos posts. El README de aws-foundations documenta
este límite. No se publica, traduce, genera audio o ejecuta push.

El workspace contiene ahora 32 laboratorios, incluido AWS en preparación, y 33
proyectos con la raíz. Se mantienen 225 índices por post y 74 exports estáticos.
AWS tiene quince tests, contratos HTTP locales y tarifas públicas archivadas;
no usa credenciales ni despliega recursos cloud. Verificación offline correcta.

Al añadir su importador se repitieron ambos exercises Docker por cambiar el
lockfile raíz. P062: captura 2026-10-25T11:39:04.758Z, proyecto
luisrc-containers-e88d1435, diez fases y quince hashes; build618488773bytes,
runtime344517995bytes. P063: captura 2026-10-25T11:38:47.394Z, proyecto
luisrc-delivery-e00824f8, dieciocho fases y veintiséis hashes. Ambos terminaron
su limpieza y sus verificaciones offline pasan. Gráficas y exports se regeneran
para estas capturas; las cifras del post multi-stage se actualizan.

Validación previa al commit: 113 checks editoriales/estructurales, 19 tests del
blog y 27 tests de estos tres laboratorios pasan, junto con sus typechecks.
Build y Pagefind pasan; se conservan diez páginas publicadas y dos idiomas.
Ambos verify Docker y el verify offline de AWS pasan con las capturas actuales.

La continuación editorial es completar P064 según ruta-aws-fundamentos.md y su
manifiesto, no empezar P065 todavía. Las entradas inferiores conservan el estado
histórico y sus verificaciones; sus indicaciones de no hacer commit automático
quedan sustituidas por la petición explícita actual. El objetivo global sigue
pendiente; conservar los gaps indicados abajo.

## Continuación vigente: CI/CD y despliegues progresivos, 25 de octubre de 2026

La entrega anterior fue progreso: P062 se desarrolló en seis drafts con laboratorio
Docker real y quedó sin commit. Se preserva y se amplía P063 en ocho drafts
españoles: pipeline/gates, artefactos, flags, smoke, rolling, blue-green, canary y
rollback compatible. Ver ruta-ci-cd-despliegues.md, progressive-delivery-series.json
y progressive-delivery-review.md. Código solo en packages/progressive-delivery,
catorce extractos en los posts, ocho índices GitHub. OPS-DELIVERY conserva ejemplos.

Laboratorio Node24.19.0/TS5.9.2/pg8.23.1, Engine29.9.2/Compose5.6.1, PostgreSQL18
por digest. Dos images comparten servidor y fijan release.json en build. IDs
locales usados en Compose con pull_policy never; no digest de registry publicado.
Ocho etapas locales: siete tests, typecheck, compile, audit runtime en artefacto
pnpm deploy temporal y dos builds/políticas. Audit archivado sin advisories;
sin scan del SO, firmas o CI remoto. pnpm12 tiene pipeline incorporado: utilizar
`pnpm --filter @luisrc-examples/progressive-delivery run ci:local`.

Captura final2026-10-25T10:58:04.348Z, proyecto luisrc-delivery-16bc9095, router78054
cerrado. Dieciocho fases y veintiséis hashes. Candidato defectuoso intencional:
flag on transforma10000/99en100/1céntimos, pero todos los HTTP son200. Sin promoción
real; activación completa marcada negativeFixture/bypassedSmokeGate para ensayar
mitigación. Flag off recupera lecturas con la misma image. Router GET/IPC privado,
revisión esperada, cabecera del cliente no impone flags, destinos loopback y
puertos refrescados tras recrear. No es proxy o servicio de flags de producción.

Rolling observa v2/v1 y v2/v2 con flag off e IDs efectivos. Antes de blue-green se
prepara blue v1 de nuevo; se observa v1 antes, green v2 después y vuelta al blue
conservado. Canary:200lecturas HTTP reales, dos claves sintéticas por bucket;
20incorrectas candidato/180correctas control, todos200. Gate mínimo20/umbral1%
didáctico retira y smoke verifica. No población real/significancia estadística.
V2 crea fila con ambas columnas; rollback de image a v1 la lee. Cuatro filas
anteriores idénticas, quinta escritura de v1. Contract prematuro42703 probado en
transacción revertida; esquema expandido permanece. Sin corrupción reparada,
backup restore, migración masiva, Kubernetes o disponibilidad continua probada.

P062 se recaptura porque cambió lock raíz, sin quitar control de hashes:
2026-10-25T10:46:32.297Z, luisrc-containers-dc010859, diez fases/quince hashes.
Runtime344.517.979bytes (328,6MiB), build618.488.184 (589,8MiB). Post y gráfica
actualizados; su revisión distingue evidencia inicial y actualización. Ambos
laboratorios incluyen lock/config raíz: si vuelven a cambiar al añadir paquetes,
repetir **ambos exercises**, regenerar gráficas, sincronizar exports y contrastar
cifras de los posts/revisiones. No debilitar los checks para conservar el verde.

Siete tests/typecheck/verify P063 y verify P062 pasan. Frozen32proyectos/31labs;
lock compartido+51líneas frente a HEAD (35P062+16P063), sin upgrades anteriores.
113checks editoriales/estructurales y19tests blog. Build50rutas/67HTML, Pagefind
10páginas/4280palabras/dos idiomas. Índices225 y74exports canónicos. Auditor67exactos,
20relacionados y88sin artículo identificado; no aceptación del objetivo completo.
Ocho D2, gráfica derivada y visor estático de fases/cohortes con paginación de12.
Browser18vistas1440/360; dieciocho fases, tres filtros y34páginas por viewport,
teclado/tablas/details/iframe, noindex/recursos y sin overflow o errores JS.
Informe /tmp/progressive-delivery-layout.Bnffvk/report.json. P06214vistas renovadas:
/tmp/container-environments-layout.79l0Ka/report.json. Inspección visual de diagramas
y gráficas mobile, visor/tablas en ambas anchuras. Lock del blog sin cambios.
Servidor QA140189cerrado y4322libre; router78054ausente y proyectos Docker finales
sin containers, volúmenes o redes. Las images locales se conservan para revisión.

P062 y P063 siguen sin commit en ambos repositorios; últimos commits blog270c50c y
ejemplos419d4c3, sin push. No comitear/pushear, publicar, traducir o generar audio
automáticamente. Objetivo global activo; esta entrega es progreso, no cierre.

Siguiente P064: leer ficha completa y artículos relacionados antes de dividir.
Cubrir IaaS/PaaS/serverless, VPC/IAM, EC2/Lambda/ECS, S3/SQS, managed DB y modelos
de coste. Laboratorio exige comparar diseños de API en Lambda/ECS justificando
coste operacional: usar supuestos verificables y fuentes oficiales actuales,
sin presentar un diseño como despliegue cloud observado. No hace falta crear
recursos facturables para esa comparación. Separar la capacidad/FinOps profunda
de P066. Después P065/P066, Deep Learning y series11–16. Conservar gapsP026,
Stripe sandboxP045, soak prolongadoP058 y Serie02 solo estructuras/algoritmos.
Las notas inferiores son históricas.

## Continuación vigente: Docker y entornos reproducibles, 25 de octubre de 2026

La entrega anterior fue progreso: se confirmaron los commits blog270c50c y
ejemplos419d4c3 de P059–P061, ambos sin cambios pendientes después del commit y
sin push. El objetivo se ha reanudado y get_goal confirma status active.

Ahora P062 se desarrolla en seis drafts españoles específicos: images/containers,
Dockerfile/layers/cache/contexto, multi-stage/TypeScript, Compose/redes/readiness,
volúmenes e image security. Ver ruta-docker-entornos.md,
container-environments-series.json y container-environments-review.md. Código
completo solo en packages/container-environments; diez extractos dentro de los
posts y seis índices GitHub. OPS-DELIVERY conserva ejemplos y enlaza la ampliación.

Laboratorio real: API Node24.19.0, pg8.23.1, @redis/client6.3.0, PostgreSQL18.4 y
Redis8.8.1. Engine29.9.2/Compose5.6.1, Linux amd64. Multi-stage con Corepack/pnpm,
tsc y deploy --prod sin --legacy. En copia temporal cambia source y BuildKit deja
pnpm install CACHED. Runtime344.513.944 bytes (328,6MiB), build618.605.033 (589,9MiB),
tamaño local compartible de image inspect, no red/RAM/benchmark.

Captura final2026-10-25T10:07:49.317Z, proyectoluisrc-containers-2f953b0d, quince
hashes y diez fases. API recreada cambia ID y conserva image/nota. Redis detenido
da fallback SQL/ready200. PostgreSQL detenido da live200/ready503/miss503; luego
recupera. down/up conserva una fila; down --volumes/up inicia otra vez vacío,
lectura404 y nueva creación válida. UID1000, EROFS al escribir /app y compilador
ausente; restricciones de API inspeccionadas, sin inducir OOM/throttling.
Solo se limpian recursos tras confirmar propiedad; al final no hay containers,
redes o volúmenes del proyecto. Images propias retenidas, sin registry push.

Cinco tests y typecheck/verify pasan. Install frozen31proyectos/30laboratorios,
lock compartido+35líneas sin upgrades previos.107checks editoriales/estructurales,
build50rutas/66HTML, Pagefind10páginas/4280palabras y19tests del blog pasan. Índices217
y70exports canónicos. Auditor66exactos/21relacionados/88sin artículo, no aceptación.
Seis D2, gráfica SVG derivada y replay estático con fases y barras dinámicas.
Chromium14vistas1440/360,20selecciones de fase, teclado/select/prev/next/details,
tablas e iframe. Informe /tmp/container-environments-layout.qsNt8p/report.json.
Inspección visual corrigió referencia larga, labels de red superpuestas y gráfico
sobredimensionado en escritorio. Lock del blog sin cambios.
Servidor de QA4024479cerrado;4322libre. No hay servicios propios persistentes.

No hay scan, firma, backup restore, corte de energía, multi-arch, build bit
reproducible, despliegue remoto, autorización/TLS, secretos privados o permisos SQL
mínimos. Notas inmutables, cache prescindible sin prueba de capacidad. P062 guarda
hashes de lock/config raíz: si cambian al añadir otro paquete, repetir exercise,
regenerar gráfica y exports y revisar las cifras escritas. No quitar el control.

P062 queda sin commit en ambos repositorios. No comitear/pushear automáticamente,
traducir, publicar o generar audios. La instrucción actual es escribir las series.
Siguiente P063: leer OPS-DELIVERY, DB-MIGRATIONS y la ficha completa; dividir CI/gates,
artefactos inmutables, deploy/release, rolling/blue-green/canary, flags, smoke tests
y rollback. Laboratorio debe desplegar regresión controlada y revertir con esquema
compatible; un build local no prueba por sí solo deployment/rollback. Cambiar el
lock obliga a refrescar la evidencia de P062. Después P064–P066, Deep Learning y
series11–16 según roadmap. Conservar gapsP026, Stripe sandboxP045, soak prolongadoP058
y Serie02 limitada a estructuras/algoritmos. Objetivo completo aún pendiente.
Las notas inferiores son históricas.

## Continuación vigente: respuesta a incidentes, 25 de octubre de 2026

Se completa P061 en seis drafts españoles: triage/evidencia, mitigación/verificación,
runbooks, on-call/handoff, postmortem y acciones. Ver ruta-incidentes.md, manifiesto
incident-response-series.json y revisión incident-response-review.md. Código solo en
packages/incident-response del monorepo; doce extractos en los posts. OPS-DELIVERY
conserva ejemplos y añade enlace. Seis D2, gráfica derivada y replay estático.

Incidente sintético con HTTP y dos procesos reales. Captura final2026-10-25T07:43:29.009Z,
API3694193/worker3694201, dieciséis hashes y once eventos. Legacy acepta lote cero;
tres jobs sin progreso durante al menos tres ticks observados. Pausa rechaza una
petición, restauración conserva cinco IDs y nuevos trabajos elevan el total a siete,
cero pendientes. Ruta validada rechaza cero sin alterar lote/revisión. Dos acciones
verificadas solo en fixture; alertas/durabilidad abiertas. Coordinación ficticia,
sin paging humano, persistencia, crash recovery o deployment de un binario.
Checkpoint parcial ignorado por Git, sin prometer fsync o atomicidad ante cortes.

Nueve tests/typecheck/exercise/verify pasan;102checks editoriales/estructurales,
build50rutas/65HTML, Pagefind10páginas/4280palabras y19tests del blog. Índices211,
29laboratorios y66exports canónicos. Auditor65exactos/22relacionados/88sin post,
no aceptación por IDs. Browser14vistas1440/360,11eventos/8fases por viewport,
teclado y dos enlaces a pruebas. Informe /tmp/incident-response-layout.6AsZu3/report.json.
Inspección visual corrigió etiquetas abreviadas y ancho de criterios. Caché anterior
vacía: Chromium1194 restaurado con pnpm en /tmp/incident-response-playwright.
Lock del blog restaurado tras regeneración automática propia; sin cambios finales.
Servidor3697991cerrado tras QA. No hay servicios de laboratorio persistentes.

P059, P060 Y P061 siguen sin commit en ambos repositorios. Últimos commits
bloga2ab1e7/ejemplos319ed10, sin push. No comitear automáticamente, publicar,
traducir o generar audio. Trabajo retomado por petición directa «continua»; el
objetivo global permanece incompleto. El flag de herramienta aún figuraba pausado
tras la interrupción anterior; no hay API para reanudarlo desde el agente.

Siguiente P062: leer ficha completa y OPS-DELIVERY/reliable-services antes de
redactar; separar layers/Dockerfile/multi-stage, images/containers, redes/Compose,
volúmenes/persistencia y seguridad según decisiones. Laboratorio obligatorio API,
Redis y PostgreSQL mediante Compose y reproducción de setup limpio, con evidencia
real si se afirma ejecución. Después P063–P066, Deep Learning y series11–16 según
roadmap. Mantener gapsP026, Stripe sandboxP045 y soakP058. Serie02 solo algoritmos.
Las notas inferiores son históricas.

## Continuación vigente: SLI, SLO y presupuestos, 24 de octubre de 2026

La entrega anterior fue progreso: seis drafts de observabilidad con laboratorio real,
sin commit, preservados. Ahora se amplía P060 en seis drafts: SLI/elegibilidad,
cohortes, ventanas/cobertura, presupuesto/política, burn rate y alertas multi-window.
Ver ruta-sli-slo-presupuestos.md, service-objectives-series.json y revisión propia.
OPS-SLO conserva su ejemplo con enlace a la ampliación. Diez extractos en los posts;
código completo solo en packages/service-objectives del monorepo.

Node24.19.0/TS5.9.2, sin dependencias runtime. Simulación determinista, no tráfico real:
endpoint6elegibles/3disponibles/2rápidas-correctas; cohortes t10:4elegibles/1buena.
Siete escenarios43200min con segmentos comprimidos y19hashes de fuentes/spec/tests.
Fast/recovered1500malos/43200permitidos/41700restantes, diferente estado de alerta.
Coverage parcial no declara cumplimiento; no traffic/insufficient no significan ok.
Contrato propio, no OpenSLO. Sin endpoint desplegado, Prometheus/Alertmanager,
paging, calendario civil/DST o enforcement de política. Política y owners ficticios.

Doce tests/typecheck y verify pasan;97checks editoriales/estructurales, build y19tests
del blog. Seis D2 y gráfica derivada; visor de targets/pares/tiempo/cohortes con modelo
compartido. Chromium14vistas1440/360,56combinaciones y teclado, tablas, iframe,
noindex/recursos/sin overflow. Informe `/tmp/service-objectives-layout.c1DyHM/report.json`.
Inspección visual llevó a corregir secuencia de cohortes y gráfica mobile responsive;
resize360/900/400/1440probado. Lazy decode corregido esperando carga real, sin quitar
aserciones. Inventario desactualizado regenerado:64exactos/23relacionados/88sin post,
no aceptación por IDs.205índices/28paquetes/62exports. Lock del blog sin cambios;
monorepo añade importador reutilizando deps offline. Servidor3547279cerrado,4322libre.

Siguen pendientes de commit observabilidad Y esta serie en ambos repositorios.
Últimos commits bloga2ab1e7/ejemplos319ed10, sin push. No comitear automáticamente,
traducir, generar audio o publicar. Mantener objetivo global activo.

Siguiente P061: contrastar ficha con OPS-DELIVERY (docker-ci-despliegues-runbooks)
y reliable-services. Profundizar triage/síntoma/causa, mitigación y verificación,
runbooks, coordinación/on-call, postmortem blameless y acciones con dueño/evidencia.
Usar incidente reproducible con cronología real si se afirma diagnóstico ejecutado;
no presentar modelo o plantilla como recuperación observada. Después P062–P066.
Mantener límites P026, Stripe sandboxP045, soakP058 y alcance de Serie02 solo algoritmos.
Las notas inferiores son históricas.

## Continuación vigente: observabilidad, 23 de octubre de 2026

Rendimiento confirmado tras revalidación: blog `a2ab1e7`, ejemplos `319ed10`,
sin push. Después se escriben seis drafts de P059, separados por concepto:
logs/identidades, spans/ciclo de vida, propagación React/API/worker, sampling,
métricas/histogramas y exemplars. Ver ruta-observabilidad.md,
observability-series.json y observability-review.md. OPS-SIGNALS se conserva.

Código solo en packages/observability-lab, con once extractos dentro de los posts.
SDK OTel3.0.0/API1.10.0, React19.2.0, Node24.19.0. Chromium pulsa cinco escenarios;
API/worker por HTTP/IPC, PIDs distintos. Correcto/fallo:5spans/1traza; broken:
5spans/2trazas sin conexión; link:dos trazas relacionadas; unsampled:cero spans,
dos logs y una medición. Total20spans/10logs,4ok/1error. Evidencia con14hashes;
no sumar campañas repetidas. Dos exemplars finales resuelven a spans archivados.

El SDK metrics JS3.0.0 no exporta exemplars: reservoir y serializador OpenMetrics
propios, máximo10muestras, último sampled por bucket/resultado. No soporte nativo,
ingestión Prometheus, Collector, OTLP, backend, broker durable o crash recovery.
HTTP202 solo aceptación. Datos ficticios/volátiles, no benchmark. Browser Context
explícito, no instrumentación general React o tail sampling ejecutado.

Nueve tests rápidos/typecheck,92checks editoriales/estructurales, build y19tests
del blog pasan. Seis D2, gráfica derivada y visor con timeline, logs, buckets y
selección de exemplars. Chromium14vistas1440/360, cinco selecciones por viewport,
exemplars/teclado y regiones horizontales. Diagramas/gráfica/UI/tablas inspeccionados.
Informe final `/tmp/observability-layout.YiWBev/report.json`. Servidor3453303 cerrado,
sin procesos API/worker del lab. Lock del blog restaurado del pruning automático;
monorepo añade SDKs y peer opcional OTel de Vitest sin cambiar versión de Vitest.
199índices,27paquetes,57exports. Los artículos/lab nuevos quedan SIN COMMIT.

Siguiente P060: contrastar sli-slo-error-budget-servicios y reliable-services.
Ampliar elegibilidad, cohortes maduras, ventanas, presupuesto, burn rate y alertas
multi-window en posts específicos, distinguiendo simulación y alertas desplegadas.
Después P061 incidentes/runbooks/postmortem y P062–P066. Mantener gaps P026,
Stripe sandboxP045 y soakP058; no aceptar Serie06 por IDs. Objetivo global activo,
sin traducción, audio, publicación, commit o push automáticos. Notas inferiores
históricas; la existencia de63IDs no prueba aceptación de todo el roadmap.

## Continuación vigente: rendimiento y profiling, 22 de octubre de 2026

Propiedades confirmadas en el turno anterior: blog 74b3eef, ejemplos c778ec9,
sin push. Ahora siete drafts de P058: distribuciones, modelos de carga,
saturación/recuperación, carga sostenida, microbenchmarks, CPU y memoria.
Ruta-rendimiento-profiling.md, performance-series.json y performance-review.md.
Se conserva OPS-LOAD y su laboratorio original, con enlace a la ampliación.

Código solo en packages/performance-lab; snippets dentro de los artículos.
Node24.19.0/TS5.9.2, k6 2.3.0 oficial instalado con pnpm tools:install y SHA-256.
Siete fases HTTP reales, procesos separados/misma máquina. Dos ventanas open350
dan 958/1751 y 953/1751 éxitos; recovery25 sin errores. Un VU descarta240
iteraciones sin HTTP fallidos. Fase60s tiene1501 éxitos; no soak de horas.
Tres procesos de benchmark, tres CPU profiles, seis snapshots V8. Perfil normal
lento opaco; diagnóstico no-turbo-inlining separado muestra findRateSlow.
Caché sin límite retiene500/1500; acotada100/100; retirando referencia ambas0.
No retained size, SQL, cloud, proveedor o CPU aislada. Timings no universales.

Diez tests del lab y verificación de muestras/hashes pasan;87 checks cruzados
y19 tests del blog, build correcto.193 índices,26 paquetes,53 exports estáticos.
Siete D2, dos gráficas derivadas y visor de siete escenarios, solo datos archivados.
Chromium16 vistas:14 de posts más2 del visor,14 selecciones de escenario, teclado,
iframe, tablas y sin overflow. Diagrama/gráficas/tablas móviles inspeccionados.
Informe /tmp/performance-layout.UWIYeG/report.json. Servidor3280870 cerrado,
puerto4322 sin listener. Lock del blog restaurado solo de pruning automático;
monorepo añade importador nuevo sin versiones nuevas de dependencias npm.
Heaps y binario k6 locales/ignorados, no publicados. Artículos/lab sin commit.

Siguiente P059/P060: contrastar observabilidad-logs-metricas-trazas-workers,
sli-slo-error-budget-servicios y reliable-services. Verificar OpenTelemetry,
propagación, métricas agregables/exemplars y recorrido frontend/worker real;
no atribuir esas garantías a logs manuales. Después operaciones y CI/CD según
fichas. Gaps P026, Stripe sandbox P045 y soak prolongado P058 conservados.
No aceptar Serie06 por recuentos/IDs. Español/draft, sin traducción, audio,
publicación, commit o push automáticos. Las notas inferiores son históricas.

## Continuación vigente: pruebas basadas en propiedades, 22 de octubre de 2026

Serie de integración confirmada: blog c0a1b48, ejemplos d7c9f26, sin push.
La evidencia P056 previa se conserva; checks cruzados verifican hashes y fuentes,
sin volver a arrancar su PostgreSQL/Pact en este turno.

P057 se amplía en siete drafts: propiedades/generadores, shrinking/replay, modelo
de secuencias, scheduler de carreras, fuzzing, fault injection y evaluación de
oráculos con variantes manuales. Ruta-pruebas-propiedades.md y manifest/revisión
property-testing propios. Se conserva OPS-FAULTS como introducción, con enlace
a la ampliación, sin atribuir shrinking a su antiguo generador LCG.

Código solo en packages/property-testing. fast-check4.10.2, Node24.19.0, TS5.9.2.
Quince tests, catorce extractos, siete D2/SVG. Seed5702 reduce rechazo atrasado
a submit/confirm/decline; cuatro reducciones y replay confirmado. Duplicado
submit/confirm/confirm y after-effect con clave nueva también detectados.
Scheduler muestra read/read/write/write con valor1; arreglo local da2. No SQL,
red, crash real o disco durable. Tres mutaciones seleccionadas, sin Stryker o
score global. Proveedor Set/journal en memoria, no proceso reiniciado ni PSP.

82 checks cruzados/estructurales, build y19 tests del blog pasan. Catorce vistas
Chromium1440/360, siete diagramas móviles inspeccionados; tabla mejorada y
recorrido repetido. Informe /tmp/property-testing-layout.FD5dfr/report.json.
Servidor temporal3178077 cerrado,4322 sin listener. Lockfile del blog restaurado
solo del pruning automático; monorepo conserva fast-check/pure-rand nuevos.
186 índices,25 paquetes,48 exports estáticos. Nuevos posts/lab sin commit.

Siguiente P058: contrastar pruebas-carga-percentiles-saturacion y reliable-services.
Ampliar carga real/modelo abierto-cerrado, percentiles/warm-up/reproducibilidad,
saturación/stress/soak y profiling CPU/memoria en posts específicos según evidencia.
No presentar cola determinista o tiempos de un test como medición de servidor.
Después P059/P060 observabilidad. Conservar gaps P026 y Stripe sandbox P045;
no dar toda Serie06 por aceptada por IDs. Español/draft, sin traducción, audio,
publicación o push automáticos. Las entradas inferiores son históricas.

## Continuación vigente: integración y contratos, 22 de octubre de 2026

Serie de pruebas confirmada: blog `f50c079`, ejemplos `c56d6aa`, sin push.
Revalidados ocho checks estructurales/editoriales, 28+11 tests, contraejemplo débil,
cuatro mutaciones manuales y typecheck antes de confirmar. Ahora cinco drafts de
P056: Testcontainers, fixtures/factories, aislamiento, schemas y Pact. Ver
ruta-integracion-contratos.md, integration-contracts-series.json y revisión propia.

Código solo en packages/integration-contracts del monorepo. PostgreSQL18.4 por
digest, Testcontainers12.2.1 y Pact17.1.4; HTTP loopback, schemas privados y tmpfs.
Cuatro tests de núcleo, dos del consumidor y nueve de integración. Contrato local
de dos interacciones, no Broker o matriz de despliegue. Variante renombrada rechazada;
unit-drift pasa schema/integer pero falla expectativa monetaria. Reaper desactivado
solo en el fixture, cierre explícito/wrapper; sin SIGKILL probado, HA o disco durable.
Nuevos posts/lab sin commit. No dar toda Serie06 por aceptada contando IDs.

Siguiente P057: contrastar fault-injection-pruebas-propiedades y reliable-services;
ampliar generadores/shrinking, fuzzing, scheduling y replay con regresión mínima
reproducible. Después P058 carga/profile y observabilidad. Mantener gaps P026 y
Stripe sandbox P045. Español/draft; sin traducción, audio, publicación o push.
Las entradas inferiores son históricas.

## Continuación vigente: pruebas de software, 22 de octubre de 2026

Kafka confirmado: blog `4cd1476`, ejemplos `b501dab`, sin push. Revalidados ocho
checks estructurales/editoriales de Kafka, ocho tests locales y typecheck antes
del commit; integración del broker conservada de la revisión anterior.

P055 se amplía en cinco drafts: diseño/oracle, TDD, test doubles, niveles de prueba
y coverage/mutaciones. Ver ruta-pruebas-software.md, testing-strategy-series.json
y testing-strategy-review.md. Se conserva DESIGN-TDD como introducción. Código
solo en packages/testing-strategy del monorepo, con snippets dentro de los posts.

Registro de jobs, no worker. Fake Map, SQLite real, HTTP loopback y archivo
cerrado/reabierto. Sin UI E2E, PostgreSQL o Testcontainers. 28 tests locales y once
de contratos/HTTP; suite débil aparte con 100 % solo en transitions.ts. Cuatro
mutaciones manuales detectadas por el núcleo, tres en el archivo ejecutado por
la suite débil y una fuera de su alcance. Sin Stryker ni score global.
Nuevos artículos/lab sin commit; no aceptar toda Serie 06 por recuentos o IDs.

Siguiente: P056 específico, contrastar api-contracts y api-pagination-evolution
antes de redactar lifecycle Testcontainers/fixtures/factories y contratos de API
verificados por clientes. Después P057 y P058, luego observabilidad y operaciones.
Mantener los gaps P026 y Stripe sandbox P045. Español/draft, sin traducción, audio,
publicación o push automáticos. Las notas inferiores son históricas.

## Continuación vigente: Kafka, 21 de octubre de 2026

Confirmada fundamentos distribuidos: blog `4b33999`, ejemplos `7e50860`, sin push.
Después se añaden cinco drafts de P051: log/retención, particiones/keys,
consumer groups, offsets/replay y lag/backpressure. Ver ruta-kafka-streaming.md,
kafka-streaming-series.json y kafka-streaming-review.md. Código solo en
packages/kafka-streaming del monorepo; snippets explicados dentro del post.

Broker real oficial 3.9.1 fijado por digest, KafkaJS 2.2.4, loopback, KRaft de un
nodo y RF=1. Reconstrucción de dos envíos, redelivery/checkpoint, asignación/salida
limpia, pause/resume y prefijo eliminado por DeleteRecords. No confundirlo con
expiración temporal observada, compaction, crash, RF>1, failover o exactly-once.
Proyección/dedup en memoria; checkpoint durable no reconstruye una vista volátil.
No dar por aceptada toda Serie 05 contando IDs. La serie nueva queda sin commit.

Siguiente: auditar las fichas de Serie 06 y posts existentes antes de redactar
pruebas/calidad/CI/CD, AWS, Terraform/Kubernetes y observabilidad. Los gaps de P026
y Stripe sandbox de P045 siguen declarados. Mantener español/draft, laboratorios
fuera del blog, sin audio, traducción, publicación o push automáticos.

## Continuación vigente: fundamentos distribuidos, 21 de octubre de 2026

Revisada y confirmada la serie de fronteras: `fbeba30` blog, `92dba16` ejemplos,
sin push. Después se añaden seis drafts de P048: replicación/consistencia, quorum,
consenso/elección, Lamport, CAP/PACELC y sharding. Ruta en
ruta-fundamentos-distribuidos.md; laboratorio en packages/distributed-foundations.
Los ocho posts anteriores de fallos, idempotencia, colas, webhooks, Outbox, sagas,
retries y reconciliación se reutilizan, no se renumeran ni se recrean.

Modelos de un proceso: réplicas y mensajes manuales, conjuntos, regla de voto,
contador y directorio. Sin red, disco, Raft completo, clúster CP/AP, movimientos de
registros o migración recuperable. Mantener límites explícitos en posts y README.
No dar P048 o Serie 05 por aceptados contando artículos. Siguiente bloque P051:
log/retención, particiones/claves, consumer groups/offsets y replay; comprobar antes
infraestructura local si se quiere afirmar Kafka real. Después lagunas de Serie 06.
Sin traducción, audio, publicación o push. Esta serie nueva queda sin commit.
Evidencia de revisión en distributed-foundations-review.md; notas inferiores históricas.

## Continuación vigente: fronteras de arquitectura, 21 de octubre de 2026

Tras revisar y confirmar principios (`8cb7108` blog, `e3fb352` ejemplos), se añaden
cinco drafts: P045 puertos/adaptadores, ARCH-LAYERS capas/Clean, ARCH-OWNERSHIP
módulos/datos, ARCH-CQRS proyección y P046 costes de despliegue. Ruta en
ruta-fronteras-arquitectura.md; evidencia en architecture-boundaries-review.md.
Código solo en packages/architecture-boundaries del monorepo de ejemplos.

HTTP real contra fixture loopback y checker de imports; dos módulos en un proceso,
entrega manual de eventos, estado y deduplicación volátiles. No Stripe sandbox,
SQL, broker, worker autónomo, TLS, despliegues independientes o benchmark cloud.
No aceptar P045 por su ID: la integración comercial exigida sigue sin ejecutarse.
No dar Serie 05 por completa. Siguiente: contrastar P048/P051 y gaps distribuidos
sin duplicar outbox, sagas o idempotencia; después Serie 06. Mantener español/draft,
sin traducción, audio, publicación o push automáticos. Notas posteriores históricas.

## Continuación vigente: principios de diseño, 21 de octubre de 2026

Confirmada la entrega anterior: blog `a7b4e69`, ejemplos `9316534`, sin push.
Después se añaden siete drafts españoles para profundizar P043: cohesión/SRP,
OCP/composición, LSP, ISP, DIP/DI, KISS/YAGNI y DRY. Ver ruta-principios-diseno.md
y design-principles-review.md. Laboratorio en packages/design-principles, snippets
dentro de los posts, contratos y tests locales, sin proveedor o base de datos.

La división separa siete preguntas de diseño, no siete fichas del roadmap. No
repetir el resumen DESIGN-MODULES. El usuario pide revisar y confirmar este bloque
y continuar P045/P046 con entregas específicas sobre puertos/adaptadores, capas,
ownership modular, consistencia/modelos de lectura y costes de despliegue. No dar
P045 por completo: todavía no se sustituye un proveedor Stripe sandbox. Después
revisar P048/P051 y Serie 06. Mantener español/draft, sin audio, traducción,
publicación o push automáticos. Notas posteriores son históricas.

## Continuación vigente: división conceptual DDD, 21 de octubre de 2026

La serie de modelado pasa de cinco a diez drafts: ocho conceptos DDD con post
propio (lenguaje, contextos, entidades, valores, agregados, servicios, repositorios
y eventos), más C4 y ADR. Se conservan las URLs anteriores y se amplían mecanismos,
ejemplos y ejercicios. Ver ruta-modelado-arquitectura.md y domain-design-review.md.
Código completo en packages/domain-design del monorepo: 25 tests, incluidos nuevos
casos de identidad, igualdad, fechas, política temporal y confirmación de eventos.
Las notas de cinco posts más abajo son históricas y su decisión de agrupar Money
y Payment queda sustituida por la petición expresa de separarlos.

No declarar P044 completo por tener ocho partes: política logística, entidad y
reservas monetarias siguen siendo ejercicios separados. Sin SQL, proveedor o
entrega durable. Siguiente bloque sigue siendo P043/P045/P046; este encargo solo
amplía y reorganiza la serie actual. Mantener draft/español, sin commit automático.

## Continuación vigente: modelado y arquitectura, 20 de octubre de 2026

Se añaden cinco borradores españoles: vocabulario/contextos (P044), valores y
agregados, repositorios/eventos, C4 (P047), ADR/RFC. Ver
[orden de lectura](ruta-modelado-arquitectura.md) y
[contraste de persistencia/arquitectura](persistence-architecture-coverage-review.md).
Los quince posts de bases de datos se reutilizan sin renumerar sus IDs DB-*.
Se corrigen referencias malformadas `publichttps` y rutas anteriores del manifiesto.

Código completo en `luisrc-blog-examples/packages/domain-design`; snippets explicados
dentro de los posts. Node 24.19.0 y TypeScript 5.9.2 estricto. Reglas, revisión optimista
y eventos en memoria; tres SVG C4 son diseño objetivo, no servicios desplegados.
ADR propuesta, sin comparación ejecutada PostgreSQL/DynamoDB. No dar P044/P047 ni
Serie 05 completa por la presencia de archivos o tests. El flujo logístico y las
reservas de pago se prueban separados. No hay proveedor, SQL, outbox durable o auth.

Siguiente paso editorial: ampliar P043/P045/P046 sin repetir el artículo introductorio
de monolito modular. Después P048/P051 y lagunas distribuidas, luego Serie 06.
Mantener posts específicos, español y draft, código de laboratorio en monorepo.
No traducción, audio, publicación, commit o push automáticos. Los apartados posteriores
son históricos; los límites de P026 y demás laboratorios siguen abiertos.

La revisión y la evidencia de esta entrega se registran en `domain-design-review.md`.

## Continuación vigente: P031, 20 de octubre de 2026

Las notas posteriores de «P031 pendiente» son históricas. Hay cuatro drafts nuevos,
36 entregas API en total: polling/SSE, GraphQL N+1, gRPC y elección de integración.
Ruta y manifest actualizados. Código en `packages/api-integration` del monorepo,
con carpetas en inglés e índices por post. No recrear ejemplos o ZIPs en el blog.

Ver [la revisión P031](api-integration-review.md) para pruebas, división y límites.
Verificados: 17 tests del laboratorio, cuatro estructurales, 46 editoriales,
trece suites locales, build y 19 tests del blog; ocho vistas Chromium y seis visores.
El inventario tiene 51 IDs exactos, 33 relacionados y 91 sin artículo identificado;
no certifica aceptación. El gap de renovación OAuth de P026 permanece explícito.

Siguiente paso editorial: revisar cobertura de las Series 04–06 contra cada ficha,
aprovechando los artículos de bases de datos y sistemas distribuidos ya escritos,
antes de crear duplicados. Después Deep Learning y Series 11–16. Mantener español,
drafts, posts específicos y pruebas de ejemplos en el monorepo separado. Sin traducción,
audio, publicación o push automáticos.

## Separación de ejemplos, 20 de octubre de 2026

Los ejemplos se han trasladado a `/home/luckys/Projects/Frontend/luisrc-blog-examples`,
con destino GitHub `luckys/luisrc-blog-examples`. Los 16 paquetes tienen carpetas
en inglés; `posts/<locale>/<id>/README.md` relaciona cada artículo con sus fuentes.
El blog ya no guarda `examples/` ni ZIPs. No recrear esas carpetas al continuar
P031. El código nuevo y sus tests deben ir al monorepo de ejemplos.

El commit `96424b4` conserva el estado anterior a esta migración, incluidos los
artículos P029/P030 que las notas históricas de abajo describían sin commit.
Esas notas y sus resultados ZIP documentan revisiones anteriores, no el flujo actual.
Consulta [el flujo vigente](../examples-repository.md): las verificaciones cruzadas
se ejecutan en el monorepo con `BLOG_ROOT`, y el blog compila independientemente.
El repositorio remoto aún debe crearse y subirse antes de que funcionen sus enlaces.

Objetivo activo del usuario: «Escribe en español todos los articulos que faltan por
series siguiendo el roadmap docs/roadmap-editorial-ingenieria-paysafe-ia.md , las buenas
practicas de escribir articulos, usa diagramas, graficos tanto estaticos como dinamicos
para que la informacion se entienda muy bien y este detallada».

Los últimos turnos han producido progreso verificable: diez borradores de ML clásico
y nueve de Computación, sistemas y redes, con laboratorios y recursos visuales.
La instrucción más reciente restringe la Serie 02 a estructuras de datos y algoritmos:
P011 se ha ampliado a 21 entregas, sin redactar P010 o P012–P019.
Después se continúa Serie 03 con P020–P029: contratos, validación, errores,
paginación, evolución, identidad, permisos y navegador, en veintitrés entregas.
P030 continúa con nueve entregas específicas: threat modeling, mass assignment,
SQL injection, dos sobre SSRF, concurrencia, token bucket, credenciales de clientes
y rotación de secretos. Treinta y dos entregas API en total. No es una auditoría
de infraestructura; el alcance del laboratorio es local.
No es una espera ni una declaración de finalización. Mantener el objetivo activo.

## Estado de trabajo

- Commit `ed7a5b3` guarda las tres entregas de permisos P028 y su laboratorio.
  Commit `09fe2e5` guarda las cuatro entregas de identidad P026/P027.
  Commit `cdea5a0` guarda la división editorial de P020–P025 en doce entregas,
  sobre `89f67b4` para P024/P025 y `fb190d4` para validación/errores.
  Las cuatro entregas nuevas de navegador P029 son posteriores y siguen sin commit.
  Las tres de inicio de P030, su laboratorio y visor son también posteriores, sin commit.
  También las dos entregas SSRF y su ampliación del laboratorio, posteriores, sin commit.
  También las dos de consumo/rate limiting y el visor de cuota, posteriores, sin commit.
  También las dos de credenciales/rotación y sus pruebas, posteriores, sin commit.
  Sin push solicitado.
- `roadmap-progress.md` y `.json`: generados desde las 175 fichas reales con
  `BLOG_ROOT=../luisrc-blog pnpm blog:tool audit-editorial-roadmap`. No alteran el alcance del objetivo.
- Hay 50 IDs exactos, 34 fichas con candidatos relacionados y 91 sin artículo
  identificado. No son contadores de aceptación. Los candidatos agrupados se han
  conservado, no renumerado para aparentar completitud.
- La ruta corta anterior para PS01–PS10 no sustituye las fichas generales. AWS,
  Terraform/Kubernetes, Kafka, OIDC y otros laboratorios siguen necesitando revisión.
- Entrega ML: `ml-series-review.md`, ruta-machine-learning.md y laboratorio en
  examples/machine-learning. CLI Docker sin red y --pull=never, imagen ya local.
- Entrega Computación: ruta-computacion-redes.md y laboratorio examples/computacion-redes.
  P001–P009 redactados; CPU/memoria, DNS/HTTP, TLS y navegador observados de verdad;
  los modelos de localidad/transporte se distinguen de mediciones de hardware o red.
- Entrega de algoritmos: ruta-estructuras-algoritmos.md, algorithms-series-review.md
  y examples/estructuras-algoritmos. 21 partes de P011, no 21 IDs del catálogo.
  28 tests de laboratorio, 18 extractos y 42 vistas móvil/escritorio verificadas.
- Inicio de APIs: ruta-diseno-apis-seguridad.md, api-contracts-series-review.md y
  examples/api-contratos. P020/P021 con OpenAPI 3.1.1, HTTP real y 11 tests.
  Continúa con P022/P023, examples/api-validacion-errores y revisión propia:
  13 tests Node y cuatro Python, JSON Schema/Ajv/Zod/Pydantic reales, errores por
  campo, stock/versión, dos peticiones concurrentes y proyección segura de logs.
  P024/P025 continúan en packages/api-pagination-evolution, diecinueve tests:
  PostgreSQL con un millón de filas, 56 planes SQL archivados, escrituras entre
  páginas, snapshots, dos lectores HTTP y schemas OpenAPI contrastados.
  Los tres primeros laboratorios no tienen autenticación o pagos; la base es efímera.
  La revisión solicitada divide P022 en tres, P023 en dos, P024 en tres y P025 en dos;
  junto a P020/P021 son doce entregas, no doce fichas. Se mantienen URLs y laboratorios.
  Pydantic es opcional. Ver api-series-split-review.md y la ruta actualizada.
- Identidad: P026/P027 se desarrollan en cuatro entregas con examples/api-identidad.
  Diez tests Node y flujo Chromium. OP oidc-provider real de test, Authorization
  Code/PKCE, firma RS256 con JWKS y variantes adversariales. RP HTTPS con sesión
  opaca y logout; modelo refresh separado con revocación familiar y replay.
  No afirmar que el RP tiene renovación OAuth integrada: ese enlace no se ha
  implementado. Sin contraseñas verificadas, MFA, permisos por objeto o M2M real.
  No dar el DoD de P026 por completo solo por la existencia de sus dos drafts.
  Ver api-identity-review.md. Este límite de P026 se conserva.
- Permisos: P028 se desarrolla en tres entregas con examples/api-permisos.
  Cinco tests de política y trece HTTP, fixtures de identidad públicas y memberships
  locales, casos de lectura y modificación de documentos de otro tenant, IDs
  repetidos, listas, roles/estado y verificación de título posterior. Sin SQL/RLS
  o autenticación de producción. Visor estático con la misma función probada.
  Ver api-authorization-review.md.
- Navegador: P029 se divide preventivamente en cuatro entregas específicas:
  DOM XSS, CSP, CSRF y SOP/CORS. packages/browser-security, siete tests HTTP y ocho
  Chromium. Sesión de fixture, loopback HTTP sin Secure; puertos no aíslan cookies.
  Sin integración OIDC/permisos, sin otros navegadores ni colector remoto CSP.
  Ver api-browser-review.md. P031 sigue sin entregas propias.
- Amenazas: P030 parcial en siete partes pequeñas, no un resumen de todo el temario.
  packages/api-threats, 39 tests HTTP/SQLite/SSRF/admisión y threat-model.json con responsables,
  controles y riesgos residuales. T01 fixture, T02 aislamiento, T03 mass assignment,
  T04 SQL injection. T05 SSRF demostrado solo en fixtures: HTTP real, dos destinos
  loopback y resolver programado. No servidor DNS, TLS, IPv6, proxy o firewall.
  Referencia por tenant, redirects rechazados y IP aprobada fijada al lookup del
  transporte. Harness impide salida externa incluso en variantes malas, no es una
  política egress desplegada. T06 añade cupos global/tenant, rechazo sin cola y token
  bucket por tenant verificado. Un proceso, sin réplicas/load test o límites económicos.
  T07 secretos/broken auth sigue abierto.
  Visor estático comparte parser; no consulta SQLite ni mide riesgo. Sin dependencias.
  Ver api-threats-review.md. Ningún recuento de IDs o tests cierra P030 por sí solo.
  Verificación final: 69 tests del blog y trece del ZIP extraído; build normal pasa.
  52 vistas completas y tres visores Chromium; repeticiones de las vistas afectadas
  por los últimos ajustes. Servidor temporal cerrado. Un fallo DNS del calendario
  externo fue transitorio y el reintento normal pasó, sin cambios en ese componente.
  Ejecutar tests SEO después del build, no contra dist mientras se está regenerando.
  Esta evidencia de 69/13 corresponde al avance anterior. La continuación SSRF y
  verificación actual están en api-ssrf-review.md; no suman ejecuciones repetidas.
  Segundo visor reproduce cinco trazas archivadas de peticiones reales; no abre
  sockets a los destinos representados desde el navegador ni mide latencia/riesgo.
  Verificación SSRF final: build, 70 tests raíz, 27 del ZIP extraído, 56 vistas de
  artículos y cuatro visores pasan; cuatro vistas afectadas y los visores repetidos
  tras cambios finales. Servidor temporal cerrado. Ver api-ssrf-review.md.
  Esa evidencia SSRF corresponde al avance anterior. Para el bloque de admisión
  consultar api-admission-review.md; no sumar repeticiones como pruebas nuevas.
  Verificación actual: build, 71 tests raíz, 39 del ZIP independiente, 60 vistas y
  cinco visores pasan. CLI con ambos tenants y modo inseguro rechazado verificada;
  servidor temporal cerrado. Quedan T07/broken auth/secretos y P031, no se completa P030.

## Actualización más reciente: credenciales y rotación

P030 tiene nueve partes y el laboratorio 58 tests: once nuevos de credenciales,
siete de cliente y uno de evidencia sobre los 39 previos. El modo opt-in verifica
claves de clientes con digest, caducidad, revocación y scopes, sin fallback a fixtures.
La recarga comprueba la candidata antes de cambiar; audit por allowlist sin secretos.
T07 demonstrated_in_fixture_only, no secret manager o autenticación de personas.
Dos drafts, dos diagramas y tabla de cinco etapas HTTP. Sin claves reales en assets.

Verificación de esta continuación: build y 72 tests raíz pasan. ZIP de 40 archivos
extraído independientemente: 58 tests y demo de rotación pasan. Chromium verifica
seis vistas de los tres posts afectados y los cinco visores, no vuelve a recorrer
todos los anteriores. Inspección de ambos diagramas móviles y tabla realizada.
Informe `/tmp/api-contracts-layout.L90fJV/report.json`. Servidor temporal detenido.
Los 32 drafts API siguen excluidos del HTML/Markdown/llms de producción.
Detalle, revisión de P030 y límites: [api-credentials-review.md](api-credentials-review.md).
Sin commit nuevo. Inventario conserva 50 IDs exactos/34 relacionados/91 no escritos,
no aceptación del objetivo global. El siguiente bloque es P031.

## Próxima acción concreta

1. Revalidar git, procesos y estado real después de cualquier interrupción.
2. Respetar el alcance nuevo: en Serie 02 **solo estructuras de datos y algoritmos**.
   P011 tiene 21 entregas, código, medición y recursos. No volver a proponer escribir
   Git ni P012–P019 como continuación automática. Esas fichas permanecen en el
   catálogo original, pero fuera del encargo actual de esta serie.
3. Leer cada ficha completa y fuentes primarias antes de escribir. Tests antes del
   código; medir ejemplos sin convertirlos en benchmarks universales. Un laboratorio
   compartido por serie es válido si identifica qué archivo y evidencia usa cada post.
   **Valorar siempre posts pequeños y específicos**: dividir al cambiar de problema,
   mecanismo o ejercicio autónomo; no separar las piezas necesarias para explicar
   una misma decisión. Detalle en api-browser-review.md. La revisión de P028 mantiene
   sus tres partes porque ya separan política, aislamiento y verificación.
4. Revisar el límite del laboratorio P026 (sesión y modelo refresh separados)
   antes de dar por aceptada su ficha. P030 ya tiene nueve entregas y T07 se
   demuestra en fixture, no se debe seguir exigiendo un secret manager cloud
   para un laboratorio local. Revisar su cobertura conjunta. Después P031 según
   ruta-diseno-apis-seguridad.md, contrastando los artículos agrupados previos.
   Después revisar series 04–06 y los límites
   declarados de las series 07–09. Continuar después P096–P175 por series.
5. Mantener español, draft, autor Luis Ramírez Calle; no traducciones, audio,
   publicación o nuevos commits/push sin el encargo aplicable.

Usar pnpm en instalaciones. No instalar Python con pip/conda implícitamente. Reutilizar
entornos locales; si falta GPU o un proveedor, avanzar lo verificable y declarar el
límite real, sin dar por cumplido un laboratorio que no se haya ejecutado.

La finalización exige auditoría ficha por ficha del temario, código, ejemplos, recursos,
pruebas, enlaces y renderizado. No marcar el objetivo completo basándose en este
inventario, en un build verde o en tener 175 ficheros.
