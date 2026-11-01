# P110 desarrollado y verificado en siete drafts

Estado actual: siete entregas en español, autor Luis Ramírez Calle, draft true/status draft.
Ruta: [ruta-structured-outputs.md](ruta-structured-outputs.md). Manifiesto:
[structured-extraction-series.json](structured-extraction-series.json). Laboratorio:
[structured-extraction](../../packages/structured-extraction/README.md).

## Cobertura y evidencia actual

- **P110**: Cómo construir instrucciones y contexto sin promover documentos a configuración.
- **PROMPT-FEW-SHOT**: Qué muestran los ejemplos few-shot y qué errores de extracción persisten.
- **PROMPT-SCHEMA**: Qué valida el parser y qué comprueba el contrato estructural.
- **PROMPT-EVIDENCE**: Qué prueba una cita literal y qué decisiones semánticas deja abiertas.
- **PROMPT-TOOLS**: Cómo validar una propuesta sin delegar autorización ni selección de fuente.
- **PROMPT-ADVERSARIAL**: Qué muestran dos documentos adversariales y qué no demuestran.
- **PROMPT-EVALUATION**: Cómo sumar fallos de formato y errores de entidades sin ocultar rechazos.

Siete diagramas conceptuales y tres figuras derivadas. El visor distingue 24 respuestas
reales, 18 controles manuales y evaluación; la gráfica cambia con el subset. No ejecuta
modelo ni Pydantic en navegador. Mantener los fallos y límites descritos en el histórico.

Verificación final: 7 JS y 9 Python pasan; verify revalida contrato, schema y controles
readonly sin escribir resultados. 231 editorial/estructura, 17 blog y build/Pagefind pasan.
Chromium: /tmp/structured-layout.JQJBN0/report.json. Siete posts a360/1440 sin overflow;
por anchura, 24 respuestas, 18 controles, 256 subsets, 768 filas y 2304 barras dinámicas
contrastadas. Teclado/paneles pasan; sin errores JS. Diez SVG sin recorte. Inspección
visual de /tmp/structured-contact-{0,5}.png y visor móvil realizada. QA reproducible en
tools/blog/check-structured-extraction-browser.mjs. Se corrigieron tablas con scroll
local, título de figura recortado y ancho del SVG dinámico.

Dependencias históricas: P110 preserva root lock en dependency-lock.capture.json;
verify contrasta sus bytes con el hash original sin alterar las capturas. Dos tests
antiguos Docker/CI también dependían de ese lock mutable. Se recuperó de HEAD70b26a6
el lock con SHA e116619c54098ad3bafa43d0b4e9b14966db2e47f835034a3991ab6b2eaa986c,
archivado en metadata/dependency-locks. scripts/captured-source.mjs permite evidencia
histórica solo para ../../pnpm-lock.yaml; código/datos siguen contrastándose con sus
fuentes canónicas. No experimentos antiguos regenerados ni hashes reemplazados.

El entorno perdió node_modules e imagen Docker durante la sesión. Dependencias y
Chromium restaurados con pnpm; imagen recuperada por el mismo digest y revalidación
final completada. Dos revisiones automáticas de escrituras caducaron; reintentos
acotados autorizados resolvieron el guardado. No fue un rechazo por riesgo.

Catálogo: 374 índices, 222 exports, 50 labs/51 workspaces. Roadmap 85 draft_exists,
19 related_only, 71 not_written: inventario no acredita aceptación total. El objetivo
completo sigue activo. Siguiente P111, preservando P026/P045 Stripe/P058 soak.
Sin commit, push, publicación, traducción ni audio automáticos. Revisión y fuentes
originales preservadas debajo como HISTÓRICO; sus pendientes ya no son el estado actual.

---

## Histórico previo de desarrollo

# P110: estado de trabajo

El objetivo completo sigue abierto. Esta continuación ha sido progreso: protocolo,
inferencias reales, contrato, controles y primer borrador. No declarar P110 terminado.

## Artefactos canónicos

`packages/structured-extraction`: protocol, runtime, documents, few-shot, prompts,
fetch-model, model-files, experiment, contract, extraction.schema, fixtures,
tool-definition, tool-gate, run-python, tests y tres results JSON.
Dependencias instaladas con pnpm: Transformers.js 3.8.1 y Ajv 8.20.0. Root lock
modificado, sin nuevo commit. .cache/model ignorada contiene snapshot de 761 MiB.

Modelo ONNX Qwen2.5-0.5B-Instruct q4, revisión fijada
22942cb7d7ba4cc81bb4673549ca4d4614469b5e; LFS SHA-256 del peso verificado.
Captura real 2026-10-29T17:35:10.874Z: 24 respuestas, todos EOS, límite 192.
No se seleccionaron resultados favorables, no se suprimieron fences ni reparó JSON.
No rerun exercise: reemplaza la evidencia. Solo revalidar el resultado existente.

9 tests Python y 3 JS de herramientas pasaron. Los de herramientas se ejecutaron
primero red por módulo ausente y después green. Los tests Python se escribieron
antes del contrato; el primer intento no pudo arrancar por imagen ausente, por lo
que no hay red funcional registrado de esas ocho pruebas iniciales. No afirmarlo.

El runtime se recuperó por digest. Algunas revisiones automáticas caducaron y
el entorno temporal perdió /tmp y enlaces node_modules. Reintentos acotados
restauraron archivos/dependencias. No fue rechazo por riesgo. Tras interrupciones
revalidar archivos/procesos antes de tocar capturas; no asumir que siga una inferencia.

## Resultado y límites que deben permanecer

Instructions: parse6/evidence1/accepted1, TP0 FP1 FN12. Schema: parse5/evidence3/
accepted0, TP0 FP0 FN12. Few-shot: accepted8, TP2 FP2 FN10, precision .5,
recall 1/6, F1 .25. Cero fallos en etapa schema es primer-fallo, no garantía
sobre el contenido que falló antes. Las salidas rechazadas cuentan como predicción
vacía para métricas efectivas. Few-shot retorna [] en varios positivos e invierte
tipos Alba/Tomás en E04. Instructions E03 añade Hoy a Inés Vidal y pasa anclaje.

18 fixtures separados de respuestas del modelo prueban parsing estricto, duplicados,
tipos, campos extra, citas inventadas, text fuera de cita y Unicode literal. El
control Río Claro como ORG pasa anclaje aunque el texto niegue que sea empresa.
Eso es un límite deliberado de la comprobación, no un éxito semántico.

## Continuación concreta

1. Verificar hashes y revalidación, sin sobrescribir las capturas de generación.
   Quality sourceHashes incluye el root pnpm-lock.yaml de la captura: preservarlo
   como archivo de evidencia antes de instalar otra dependencia, para que futuros
   paquetes no invaliden artificialmente este experimento. No añadir otro lock activo.
2. Tests Ajv sobre los mismos fixtures estructurales, controles del builder y
   recomputación independiente de métricas. No ocultar parsing duplicado: JSON.parse
   de JS por sí solo conserva la última clave; el parser Python lo rechaza.
3. Siete posts focalizados: P110 roles/contexto, few-shot, schema/Pydantic,
   evidencia, tool schemas, adversarial inputs y evaluación. Primer P110 escrito
   en src/content/posts/es/prompt-engineering-instrucciones-roles-contexto.md.
   SVG fuente assets/structured-extraction/P110.svg; completar exports, índices
   y comprobar excerpt contra prompts.mjs. No enlaces a slugs inexistentes.
4. Crear figuras a partir de resultados y visor claramente rotulado como replay,
   sin inferencia en navegador. QA real a 360/1440 y build antes de aceptar.

El primer post no completa el bloque. Sigue draft, autor Luis Ramírez Calle,
español solo. Mantener P026/P045/P058 y todos los requisitos del roadmap original.
