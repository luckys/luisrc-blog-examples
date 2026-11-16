# P115: revisión de los nueve borradores

Estado vigente: nueve borradores españoles verificados, `editorialState: verified_drafts`.
La tabla siguiente contrasta la ficha P115 con las entregas y sus artefactos reales.
La evidencia de arquitectura no demuestra generación útil. El objetivo global de
175 fichas sigue activo y no se acepta por recuento de artículos.

## Auditoría de requisitos de P115

| Requisito del roadmap | Entrega y evidencia inspeccionada | Alcance demostrado |
| --- | --- | --- |
| Problema, coste y límites de datos | P115; corpus/protocolo fijados, core.mjs, tres primeras entregas | Contratos, exposición separada de relevancia, tamaño GIN observado; no benchmark de coste o latencia |
| Tenant permissions | RAG-TENANTS; schema.sql, isolation.json y 69 controles | Roles LOGIN sin bypass/propiedad, RLS, GUC sin autoridad, 36 errores 42501; autenticación trust sólo en fixture loopback |
| Índice global frente a aislamiento físico | RAG-ISOLATION; 56 solicitudes, relaciones y planes reales | Tablas/GIN y conexiones separados por base; mismo servidor, recursos y administrador |
| Conversational RAG | RAG-CONVERSATION; conversation.json, 21 casos | Propiedad de conversación y referencias reautorizadas; no interpretación lingüística ni revocación dentro de un snapshot ya iniciado |
| Multi-step retrieval | RAG-MULTISTEP; multistep.json, 44 recorridos/60 llamadas | Referencias redactadas, progreso/parada y presupuestos; no planificación de un LLM |
| Cache | RAG-CACHE; cache.json, 22 solicitudes | 8 hits, 13 misses, 1 expiración; revocación/ACL/errores; estado autorizado se lee incluso en hit |
| Index updates | RAG-UPDATES; updates.json, 67 eventos | Candidata parcial rechazada, una activación, CAS obsoleto rechazado; dos transacciones RR solapadas, 11 lecturas, 9 controles de citas |
| Context design | RAG-CONTEXT-DESIGN; context.json y tokenizer fijado | 60 composiciones, 165 conteos de chat real, fuentes completas, roles y rechazos; no inferencia |
| RAG vs fine-tuning | RAG-VS-FINETUNING; generation-contracts.json | Responsabilidades, mecanismos y combinaciones; 34 descriptores preparados/26 rechazados, ninguno ejecutado; no comparación de modelos entrenados |
| Explicación, código, fallos y referencias | Nueve fuentes Markdown, snippets contrastados con código del laboratorio, referencias primarias directas | Artículos en español, Luis Ramírez Calle, draft/status draft, cadena de prerrequisitos, decisiones y ejercicios |
| Diagramas y gráficos estáticos/dinámicos | 9 diagramas conceptuales, 11 figuras, 7 visores; informe de navegador | 360/1440, texto/datos exactos, geometría, teclado y scroll local; sin errores JS ni overflow |

## Cierre de context design y comparación conceptual

Context design utiliza Transformers.js3.8.1 y únicamente ocho JSON del tokenizer
Qwen2.5-0.5B-Instruct, revisión22942cb7d7ba4cc81bb4673549ca4d4614469b5e.
No carga pesos. 60 composiciones:34ready,8base_over_budget,6no_evidence,
12rejected_scope. 165conteos de chat completo, sin padding/truncamiento; reserva64.
Las ventanas192/320/512 son decisiones del experimento, no capacidad del modelo.
T05@320:history_first conserva1fuente/H3,254tokens; evidence_first3fuentes/sin
historial,167tokens. A512 ambas coinciden en443tokens/H2H3/3fuentes. Se mantienen
casos donde las políticas coinciden. Las fuentes de SQL se contrastan con generación,
revisión y ACL del protocolo de actualizaciones; el texto largo T10 es mock explícito.
JSON/delimitadores evitan marcas brutas, no demuestran resistencia semántica a injection.

El cierre separa revisiones de datos/permisos, prompt/contexto y modelo/pesos.
60descriptores derivados,34prepared_not_executed/26not_prepared,executedfalse siempre.
No se entrena ni compara un modelo fine-tuned para RAG. Los perfiles alternativos
son controles unitarios, no modelos reales. La coherencia de metadata no prueba
compatibilidad numérica, autorización posterior ni calidad. P114 mantiene sus
61salidas rechazadas; no se sustituyen por respuestas redactadas o JSON reparado.

Verificación final:257tests editoriales/estructura,44del laboratorio,17del blog,
siete verificadores readonly. Build50rutas;Pagefind10páginas/4280palabras/dosidiomas.
Las pruebas SEO se repitieron tras terminar el build: la primera ejecución paralela
leyó dist mientras Astro lo reconstruía y falló por archivos ausentes. No se cambió
código de publicación para ocultar esa carrera del orden de ejecución.

QA final /tmp/rag-architecture-layout.K2fobR/report.json:9posts por ancho360/1440,
noindex,0erroresJS/overflow. Por ancho56queries,69probes,21conversaciones,
44workflows/104prefijos,22cachecases,67eventos/11reads/9citas,60contextos y
60contratos/180vistas de capa. Veinte SVG con texto dentro de límites; los nuevos
diagramas, estados preparados/rechazados y contexto se inspeccionaron visualmente.
Servidor propio553764 detenido. No modelo/SQL/QA propio pendiente.
416índices/317exports/55labs/56workspaces. Sin publicación, traducción, audio o push.

## Histórico de la revisión incremental

Los apartados siguientes preservan el estado que existía al cerrar cada bloque.
Sus pendientes y PIDs anteriores no describen el estado vigente.

## Evidencia ya obtenida

PostgreSQL 17.11 real, imagen por digest del runtime fijado. Protocolo, corpus de doce
documentos, cuatro roles, 28 consultas/gold y lock copiados antes de la captura.
Una ejecución, results/isolation.json, sin artefacto de fallo. Capturas y sus fuentes
se conservan por hashes; el verificador no consulta Docker ni vuelve a buscar.

Tabla global con RLS frente a dos bases separadas con tabla/GIN propios y RLS para
niveles internos. Archivos distintos registrados mediante pg_relation_filepath.
Mismo servidor/CPU/RAM/WAL/admin. Autenticación trust solo para loopback sintético:
no demuestra autenticación de usuarios web ni configuración de despliegue segura.
Login por cada rol real NOSUPERUSER/NOBYPASSRLS/no dueño, sin SET ROLE administrativo.
Política session_user/principals; GUC app.tenant no tiene autoridad.

56 solicitudes: por layout 19 con gold, recall autorizado 1, nueve con gold vacío,
cero resultados; 23 filas devueltas. Cero IDs inesperados o expuestos. No test ciego.
69 controles: 36 errores42501, incluyendo cuatro conexiones a DB ajena; controles
vacíos se cuentan aparte. 6testsJS y readonlyverifier pasan. Contenedor eliminado.
GIN global24KiB vs suma de separados48KiB, solo esos objetos/corpus. No coste total,
latencia o rendimiento; planes reales se preservan sin forzar GIN. Coincidencia de
rankings ligada a ts_rank sin estadísticas globales; no se extiende a BM25/ANN.

Tres posts >1500 palabras, español, Luis Ramírez Calle, draft/statusdraft. Código SQL
inline contrastado con sentencias de captura. Tres diagramas, tres figuras y visor
estático con controles de las 56 consultas/69pruebas; datos públicos sintéticos.
El visor no es login y no vuelve a consultar PostgreSQL.

## Límites que deben permanecer

P114: ninguna de61generaciones pasó contrato. Este bloque no ejecuta LLM ni demuestra
respuestas útiles, abstención correcta o resistencia del modelo a prompt injection.
El texto malicioso del corpus permanece como dato; no se interpreta como permiso.
No caché ni cambio de versión ejecutados todavía; el historial por referencias se
verifica en el segundo bloque descrito abajo. No aislamiento de proceso,
sidechannels, backup independiente, carga concurrente o benchmark de latencia.
No marcar P115 completo porque exista su ID. Auditoría global175 sigue pendiente.

## Verificación del primer bloque

251 pruebas editoriales/estructura, 17 del blog, seis del contrato y verificador de
captura pasan. Astro compila 50 rutas y Pagefind mantiene diez páginas públicas,
4280palabras/dos idiomas. Tres drafts noindex, sin publicar. Informe visual:
/tmp/rag-architecture-layout.cWf577/report.json. Por anchura360/1440:56solicitudes,
69controles,56vistas de relaciones; teclado y scroll local verificados;0errores y0
desbordamientos de página. Seis diagramas/figuras inspeccionados visualmente.
Servidor de revisión propio pid537199 se mantiene para continuar la serie.

## Conversaciones: segundo bloque verificado

Se añadió RAG-CONVERSATION, con artículo español de más de 1600 palabras, diagrama,
figura y visor propio. La captura conversation.json tiene un protocolo independiente,
21 escenarios conocidos y sus fuentes por SHA. No se modifica isolation.json.

Resultados: 7 ready, 8 forbidden, 4 unavailable_reference, 1 not_found y 1 no_evidence.
Dos permisos de gestores se retiran antes de una nueva solicitud; sus referencias
anteriores no aportan texto. Los controles de referencia ajena y revisión incorrecta
se introducen deliberadamente. La propiedad se comprueba antes de leer documentos;
el principal sí se carga de PostgreSQL en cada solicitud. REPEATABLE READ READ ONLY
mantiene un snapshot para principal y fuentes. No prueba revocación dentro de una
transacción en curso, persistencia, cuotas, interpretación lingüística o generación.

252 pruebas editoriales/estructura, 17 del blog, 11 unitarias del laboratorio y ambos
verificadores pasan. El último ajuste de tabla/snippets pasa las cuatro pruebas
editoriales específicas. QA final: /tmp/rag-architecture-layout.PmfWvv/report.json.
Cuatro posts a 360/1440, 56 búsquedas, 69 controles y 21 reanudaciones por anchura,
con geometría de gráficos, texto exacto y teclado. La tabla del cuarto artículo
causaba overflow móvil: se corrigió con región de scroll local y se probó con teclado.
Ocho diagramas/figuras y la rama de permiso retirado inspeccionados visualmente.
Cero errores JS y desbordamientos de página. Servidor propio pid537199 detenido.

La serie conserva plannedIds9 y editorialState in_progress. Quedan cinco entregas.
411 índices por post, 295 exports, 55 laboratorios/56 workspaces. Inventario global
90 draft_exists / 19 related_only / 66 not_written; completionProven sigue false.

Build final: 50 rutas, Pagefind diez páginas públicas/4280 palabras/dos idiomas.
Las 17 pruebas del blog pasan también después del build. No quedan procesos propios
de captura, modelos, QA o servidor pendientes.

## Multi-step y caché: nuevos protocolos

RAG-MULTISTEP: 44 recorridos con 60 llamadas de fuentes reales. Diez cumplen las
claves tipadas, doce agotan llamadas, cuatro agotan fuentes, catorce no avanzan y
cuatro no tienen semilla. Las referencias son grafos redactados, no parser o LLM.
Las cuatro comparaciones manual→ficha pasan de cobertura0 a1 con la segunda lectura;
el caso directo termina tras una llamada. Lectores/referencia restringida tienen
gold autorizado vacío (coverage null). No hay exposición de otro ámbito. Frontera
saturada solo en unidad, no en captura. Ocho pruebas y replay readonly pasan.

RAG-CACHE: 22 solicitudes, ocho hits, trece misses y una caducada. Los dos errores
SQL22012 están entre los misses y provocan dos operaciones reales, sin entrada.
Catorce operaciones de fuentes en total. La revisión del principal cambia al retirar
y restituir permisos; ACL del documento y accessRevision global se confirman juntos.
Beta pierde reutilización por la revisión global aunque sus documentos no cambien.
TTL3000ms, espera nativa observada3102,695719ms; frontera exacta con reloj controlado
solo en tests. Verificador compara expiresAt=savedAt+TTL para evitar error de restar
floats. Ningún dato de captura se ajusta por ese redondeo. Siete pruebas de caché pasan.

No se activa otro índice en este protocolo: indexRevision fija identifica corpus y
schema. Los cambios de ACL coordinados son el camino del script, no un trigger que
obligue a todos los administradores. No concurrencia/stampede/caché distribuida ni
latencia. Las entradas antiguas se vuelven inaccesibles mediante nueva clave; no se
borran instantáneamente. FIFO128 se prueba unitariamente y no se alcanza en SQL.

254 pruebas editoriales/estructura, 17 del blog y 26 del laboratorio pasan. Astro
compila50rutas. QA browser sesión12861 en curso al registrar este bloque; conservar
el handle y observarlo, no reiniciar por timeout. Servidor propio pid543279 activo.
413 índices/303 exports, misma cuenta55laboratorios/56workspaces. Objetivo175 activo.

## Cierre verificable de este bloque

QA completo final: /tmp/rag-architecture-layout.Ag51m2/report.json. Seis posts a360 y
1440, noindex y sin overflow. Por anchura:56búsquedas,69controles,21conversaciones,
44workflows/104prefijos y22casos de caché. Comprobados texto, consultas/errores,
revisiones, claves, fuentes, geometría/estado de gráficos y teclado. Doce SVG con
bounds de texto correctos. Inspeccionados los cuatro SVG nuevos, los visores y el
prefijo1/2 con una referencia todavía sin reproducir; el resultado global se etiqueta
como perteneciente al recorrido completo.

El primer QA detectó sombreado del objeto DOM document en los dos nuevos visores.
Se corrigieron variables locales a source, sin tocar capturas o core. Un chequeo
puntual posterior se interrumpió por recarga HMR, no por nueva captura; se cerró el
servidor, se compiló el estado final y se ejecutó el QA completo estable citado arriba.
También se corrigieron singulares y se aclaró que un hit no renueva el TTL.

254 pruebas editoriales/estructura,17del blog y26del laboratorio pasan. Los cuatro
verificadores de capturas pasan; ningún modelo ni SQL se vuelve a ejecutar para
verificar. Build final /tmp/p115-six-build-final.log:50rutas. Pagefind final diezpáginas
públicas,4280palabras,dosidiomas. Borradores no publicados. Servidor propio545198
cerrado y todos los procesos de captura/QA terminales. No commits/push ni audio.

Próximas entregas: index updates con activación y citas antiguas bajo ACLactual,
context design con tokenizer real y RAG vs fine-tuning. plannedIds9 permanece;
editorialState in_progress. P115 y el objetivo175 no están completos.

## Actualizaciones verificadas

La séptima entrega añade actualizaciones con registro de generaciones, validación de
IDs/hash bajo SHARE y promoción condicional. Captura updates.json: tres intentos con
una activación, once búsquedas/cuatro hits/siete lecturas y nueve citas/cuatro resueltas.
Contenido v1/v2 independiente de ACL actual en document_acl; la restricción posterior
se aplica a las dos generaciones. Pruebas observan dos transacciones solapadas, no
carga simultánea. No GC, rollback, backups, ANN o generación nuevos. Fingerprint solo
de campos declarados, analyzer/esquema fijos; no certifica semántica o representación
bajo otro perfil. Los administradores aún pueden escribir después del publicador.

32 pruebas unitarias de lab,255 editoriales/estructura y17del blog pasan. QA final:
/tmp/rag-architecture-layout.DWH4eq/report.json. Siete posts360/1440,noindex,0overflow/
JSerrors. Porancho67eventos/11búsquedas/9citas nuevas más matrices anteriores completas.
15SVG con texto dentro de límites, tres nuevos y las vistas inspeccionados, teclado
verificado. Build50rutas,Pagefind10páginas/4280palabras/dosidiomas. Servidor548437 cerrado.
414 índices/308 exports. Manifiesto conserva9plannedIds,7redactados,in_progress.
