# P116: cinco borradores verificados; serie en curso

## Estado vigente: contexto añadido, cinco entregas pendientes

RAG-CONTEXT-RELEVANCE verificado, español1979palabras, draft/statusdraft, autorLuis,
prerrequisitoRAG-NDCG. Distingue relevancia de documentos seleccionados, cobertura de
hechos requeridos y fracción de texto de cuerpos con rangos anotados. Denominadores
explícitos y null, gold fuera del constructor, proxyUTF16≠scoreRagas/juiciosemántico,
whole sources y chat completo, redundancia/fallos/límites. Código inline coincide
con context-core.v1.mjs congelado. Diagrama850,figuras620/570,visor con resaltados
gold excluidos de prompt, detalle de tokenizer y mensajes/IDs/mediciones exactos.
Referencias primarias Ragasv2 y HFchattemplates/APIversionada3.8.1.

PNPMoffline añade Transformers.js3.8.1 al paquete. Diez JSON de tokenizers fijados,
14082967bytes, repos/revisiones de A/B ya elegidos. Verificados por Gitblob/SHA y
copiados en .cache/tokenizers ignorado; no pesos descargados/cargados. FuenteA
reutiliza metadata previa tras verificar; Bmetadata pública inmutable. Snapshot
context-dependencies.v1.json de lock activo nuevo, no lockfile adicional activo.
Lockroot previo1b24 no estaba referenciado por capturas, históricas intactas.

Captura única results/contexts.v1.json:120composiciones=2tokenizers×20queries×3límites.
474conteos reales de plantillas completas,addgenerationprompttrue,addspecialfalse,
sin padding/truncamiento,máscarasunos y límites de mensajes verificados. Selección
rankorden whole source, skip si no cabe, sin backfillbajo top3 ni gold. A256 todas
40empty_context,base212–226tokens; A384/A1536 ochentaready,fuentes320–383tokens.
19queriescon3fuentes y Q020con2 por perfil/presupuesto amplio. Todos los60pares A/B
coinciden en mensajes/prompts/IDs. Veinte paresbaseline1536 conservan todoscandidatos.
No se ajustaron límites para fabricar diferencias:384y1536 idénticos por caso.

Q008a256:221tokens,0fuentes,coverage0/2,ratiosdocs/textonull. A384/1536:371tokens,
3fuentes,docs2/3,hechos2/2,105/291unidadesUTF16=.3608247423. Q007doc1/3hechos2/2,
113/321unidades. Q002siguecoverage.5 porque backups-2noestáentop3; Q018readycon
3fuentesirrelevantes,coveragefactnull. No confundir readyconanswerable o abstención.
Rangosseunen y canonicalbody/revision secontrastan; títulos/sistema/pregunta/JSON
fuera del proxytextual. Unidademoji/solapamiento probado en tests, no en corpusnativo.

18testscontextTDD (inicial módulo ausente rojo;16verdes,2guardas adicionalesverdes),
44labtotales. Se añaden266editorial/estructura y17blog pasan. Verifydefaultreplay
no carga tokenizer; --tokenizers re-encode474 con diezmetadataSHAs verificados,
ninguna inferencia. CongeladosporSourceHashes: context-core/capture/protocol/
tokenizers/prepare/dependencies másplan/system/gold/corpus/queries/datasetmanifest/
verify.mjs/dataset.mjs/rankings.v1. NO editarlos ni re-capturar para mejorar resultados.
Presentación,render y nuevoverificador son editables. Gold y anteriores capturas intactos.

QAfinal /tmp/rag-evaluation-layout.FrhU07/report.json:5posts en360/1440,noindex,
11SVG,boundsdefuentescorrectos,120contextos porancho además de20goldqueries/16docs y
112rankingcases/448focos. Candidatos,fuentes/cuerpos,unionderangosresaltados,mensajes,
prompts/IDs,intentos,metadatarevisión,ratios ynull/ceros verificados;teclado0JSerrors/
overflow. TresSVG nuevos yQ008vacío/lleno,Q007/Q018inspeccionados visualmente.
Etiquetas de error se tradujeron, repositorio largo acortado en select con identidad
completa desplegable. No se modificó experimento para la presentación.

Una llamada conjunta README+QA no llegó a crear proceso: auto-review excedió su
plazo. Se separaron acciones y reintentó una sola vez el QA; ambas completadas.
No rechazo de seguridad ni bloqueo pendiente, ningún experimento repetido por ello.
421índices/332exports/56labs/57workspaces. Build50rutas y Pagefind10públicas,
4280palabras/dosidiomas. Sin publicación, traducción, audio, commit o push.

## Histórico: cierre de cuatro borradores

Los siguientes contadores y pendientes describen el cierre anterior.

La ficha exige gold datasets, Recall/Precision@k, MRR, nDCG, context relevance,
faithfulness, completeness y latency/cost, más benchmark etiquetado y comparación
real modelo A/B sin tocar testgold. Cuatro entregas verificadas de diez; faltan
seis entregas y generación A/B, evaluación semántica y latencia/coste. No aceptar
P116 por su ID ni por calcular métricas sobre rankings. Manifiesto in_progress.

## Bloque de ranking verificado

Tres drafts específicos: RAG-RECALL-PRECISION (~1670palabras antes de wrapper),
RAG-MRR1571 y RAG-NDCG1711. Español, draft/statusdraft, autorLuis, cadena de
prerrequisitos, mecanismos/fórmulas, ejemplos reales y controles, código contrastado
con módulo congelado, decisiones/errores/ejercicios, referencias primarias TREC/NIST
y MicrosoftResearch. Tres diagramas nuevos, tres figuras y visor compartido.

Se fijan ranking-protocol.v1.json, comparison-plan.v1.json y comparison-system.v1.txt
ANTES de las nuevas búsquedas de test. Pareja A/B futura: Qwen2.5-0.5B rev22942cb...
y Qwen2.5-1.5B revd54957e3af1be04546436e874a60fe386041b244, q8CPUgreedy,
192salida/1536entrada,k3,mismos textos de fuentes, JSONestricto. Revisión/ruta del
archivo del segundo repositorio consultadas mediante API pública HF. No pesos B
bajados/cargados ni inferencia A/B en este bloque. No selección óptima demostrada.

Captura única results/rankings.v1.json:20 búsquedas BM25 reales en proceso Node,
80evaluaciones offline k1/2/3/5. Perfil fijo fold,k1=1.2,b=.75,título+cuerpo,sin
stemming/stopwords,scorepositivo,desempateIDascendente. Runner recibe sólo docs,
queries y perfil; gold entra después en evaluador. No servicio/ANN/LLM ni timing
benchmark. SourceHashes incluyen datos, scripts, métricas, protocolos, prompt/plan
y módulos compartidos ../lexical-search. NO editarlos ni sobrescribir captura.
Verificador readonly comprueba hashes y replay exacto de listas/scores/evaluaciones/
12resúmenes; no experimento estocástico nuevo. Ningún artefacto failure generado.

26tests (10datos+16métricas), TDD inicial de ranking rojo por módulo ausente, luego
verde. Casos de listas cortas, goldvacío, fallos, cutoffs, duplicados/unjudged,
orden/grados, ideal de TODOSqrels y denominadores. P@k divide por k aunque falten
puestos; binario grado>=1. Goldvacío: P0,Recall/RR/nDCGnull; nohit con goldpositivo0.
Ganancia2**grado-1,descuentolog2(rank+1),IDCGcon todosjuicios al mismo cutoff.

Test12answerable:MRR=1 en todoscutoffs;Recall@1=.75 ydesde2=1; P@3=.5,
P@3de15preguntasincluidas3noanswer=.4. Dev4answerable:Recall@3=.875,MRR@3=.875,
nDCG@3=.8467132018086354. Q002 no recupera backups-2 dentro de5 (Recall.5).
Las4noanswer obtienen candidatos; no hay evidencia de qué respondería un generador.
Goldnativo no mezcla1y2 positivos dentro deunaquery. Ocho controles escritos
separados; C05/C06ilustran grado2/1, nDCG1/.79670758 con P/R/RR iguales. No son
outputs de buscador/modelo ni mejoría medida. No tocar el gold para añadir mezcla.

QA /tmp/rag-evaluation-layout.phafTq/report.json:360/1440,4posts noindex,
20queries/16docs delgold,112evaluaciones y448vistasdefoco porancho. Texto/IDs/cuerpos/
qrels/ideal/medias/denominadores/geométricas/null exactos, controles por teclado,
8SVG con texto dentro de límites. Nuevos6SVG yQ008/C06/C07/C04 inspeccionados.
Fallo visual inicial /tmp/rag-evaluation-layout.DUXnKz: tabla RPanchura420 en360;
corregida con región de scrolllocal yprobada ArrowRight. No se oculta overflowglobal.
Pre/code desbordan su propio scroll local, no la página. Scripts fallidos se preservan
como evidencia de QA, no como fallos del experimentoBM25.

264pruebas editoriales/estructura,26lab,17blog; verifyallreadonly pasa.
420índices/327exports/56labs/57workspaces. Corpus/gold/queries y capturas P112–P115
intactos. Ninguna dependencia instalada. No commit/push/publicación/traducción/audio.

## Histórico: primer borrador verificado

Los resultados siguientes corresponden al cierre anterior y sus contadores son
históricos, no el estado vigente.

## Artefactos y alcance

Borrador español de2089palabras, autorLuis Ramírez Calle, draft/statusdraft,
prerrequisitosP082/P093/P113/P115. Explica gold falible, corpus/query/gold separados,
hechos y rangosUTF16, qrels exhaustivos, rúbrica0/1/2, noanswer respecto al corpus,
grupos dev/test, hash≠corrección semántica, protocolo antes de A/B. Código inline
contrastado con dataset.mjs. Dos SVG y visor interactivo; TREC/NIST y paperRagas.
No ejecuta Ragas ni declara juicio humano/modelo. Cierre enlaza laboratorio/ejercicio.

packages/rag-evaluation contiene16docs/32hechos de ocho temas ficticios.20queries:
dev5 de2grupos/test15 de6grupos, sin cruce;16answerable/4unanswerable.
320juicios exhaustivos:296grado0/16grado1/8grado2. No son scores de sistemas.
Hashes de corpus/queries/gold en dataset-manifest.json; verificar no escribe.
No modelos/pesos cargados ni generación/retrieval ejecutados. Manifest de datos,
no protocolo completo de experimento ni resultado A/B. No test ciego, anotación
independiente, acuerdo entre anotadores o distribución representativa.

## Pruebas y presentación

TDD: suite inicial roja por módulo ausente; nueve tests pasan tras implementar.
Décima prueba roja: cambiar copia temporal de gold no rechazaba porque el lector
no admitía origen configurable. Se añade URLbase al lector; diez tests pasan,
incluido rechazo por SHA sin tocar los archivos canónicos. Comando publicado
pnpm --filter @luisrc-examples/rag-evaluation test ejecutado y pasa.

261pruebas editoriales/estructura,17blog,10lab. Build50rutas en
/tmp/p116-first-final-build.log; Pagefind10públicas/4280palabras/dosidiomas.
Primer inventario estaba obsoleto tras crearP116 y falló su test; se regeneró desde
archivos reales:91draft_exists/19related_only/65not_written,completionProvenfalse.
El artículo inicial omitía el comando gitclone exigido por el catálogo; corregido.
No se relajan tests para aceptar el borrador.

QA final /tmp/rag-evaluation-layout.xMmXSh/report.json. 360/1440:20queries y16docs
por ancho, qrels completos, rangos y citas literales, aislamiento de opciones por
split, geometría de barras, texto y metadata exactos. Teclado Home/End, noindex,
0erroresJS/overflow. Dos SVG con texto dentro de límites; revisión visual de ambos
y de Q008 (evidencia distribuida) yQ018 (sin respuesta). Se corrigió espaciado de
etiquetas detectado al mirar capturas; datos/hash intactos.
Servidor propio556618 detenido. No proceso de captura/modelos/QA/servidor pendiente.

417índices/321exports/56laboratorios/57workspaces. Sólo cuatro recursos estáticos
allowlisted de este paquete en blog, diagrama conceptual en assets/visuals. Laboratorio
fuera del blog. Se conservó orden previo de383entradas y34adiciones; ningún contenido
previo revertido. Sin publicación/traducción/audio/push/commit automáticos.

## Pendiente para aceptar la ficha

Nueve entregas, métricas calculadas y evaluador semántico de alcance declarado;
experimento real de dos modelos con revisiones fijadas y testgold intacto, raw outputs,
fallos y denominadores. Medición de latency/cost con límites explícitos. No sustituir
ese requisito por perfiles redactados o respuestas manuales que parecen de un LLM.
P114 conserva61salidas rechazadas; P115 sólo verifica arquitectura y preparación.
Objetivo global175activo; gapsP026/P045Stripe/P058soak ySerie02sóloDSA intactos.

Cierre de este bloque: servidor propio561421 detenido. Build final50rutas; búsqueda
pública mantiene diez páginas/4280palabras/dosidiomas. Ningún proceso propio pendiente.

Cierre vigente de cinco borradores: servidor612461 detenido, sin procesos propios
pendientes. Los contadores y pendientes de apartados históricos no sustituyen
el estado vigente de cinco entregas y A/B real aún sin ejecutar.
