# P107: revisión de siete drafts y laboratorio

Siete artículos españoles,autor Luis Ramírez Calle,draft true/status draft.
El objetivo editorial total sigue abierto. Este bloque desarrolla P107; no se
ha publicado,traducido,generado audio ni hecho commits/push nuevos.

## Cobertura de la ficha

NER/spans/offsets:P107;BIO:NER-BIO;reglas:NER-RULES;token classification y ajuste:
NER-TRAINING;reglas frente a Transformers y alineación:NER-TRANSFORMERS;
entity-level P/R/F1:NER-METRICS;confusiones/límites:NER-ERRORS.
Laboratorio:entrenamiento real PER/ORG,contraste de optimización y revisión de
límites/tipos/omisiones/espurios. No se entrenó un Transformer ni se afirma tal cosa.

## Datos, protocolo y resultados

Corpus original32frases(train16/dev8/test8),dos negativos por split. Un anotador,
sin IAA ni evaluación ciega/representativa. Alba se repite con tipos distintos;
estructuras sintácticas parecidas,no template-family holdout. Spans codepoints,
[start,end),sin normalizar,planos/contiguos/no solapados. Partículas incluidas,
títulos excluidos. Tokens con offsets preservan emojis/marcas combinantes.

Primera captura2026-10-28T09:13:33.756Z,Node24.19.0/ICU78.3/Unicode17.0,
cinco hashes. Softmax lineal cinco clases,646features/3230pesos,138tokens train,
80pasos GDfullbatch.05,seeds7/19/31. Todas predicen O,F1exacto0,accuracy test49/67.
Diccionario train24TP/F1=1;test0TP/1FP/9FN(Alba ORG frente aPER).

Segundo protocolo fijado antes del contraste,sin cambiar el primero ni corpus.
Captura2026-10-28T09:23:28.624Z,ocho hashes. Solo800/1600pasos,mismas seeds.
Loss~.203→~.098,train24TPsin errores/F1=1,dev2TP/7FP/6FN/F1=4/17,
test2TP/10FP/7FN/F1=4/21. Labels/spans idénticos entre los seis contrastes;
losses/logits sí cambian. No confundir ambos. Se había inspeccionado test:
cifras descriptivas sobre fixtures conocidas,no validación intacta o ciega.

Viterbi usa transiciones fijas0/-Infinity,no CRF. No se selecciona ganador.
Verificador reentrena NUEVE ajustes y compara pesos,losses,logits,predicciones,
métricas y revisiones. Finite differences valida una actualización independiente.
No editar fuentes numéricas capturadas sin preservar/versionar nueva evidencia.

## Métricas y confusiones

Exact match por documento/inicio/fin/tipo;micro y por tipo. Error límite/tipo suma
FP+FN. Cero denominador=null. Macro por tipo test7/36 frente a micro4/21.
IoUgreedy uno-a-uno solo agrupa diagnóstico,no cambia scoring,no óptimo global.
N25PrismaTech tipo;N26TejidodelSur dividido;N27Alba tipo;N29MaríadelMar dividido;
N30Peña parcial yÁlamoRedes PER;N32Mañana espurio. No atribuir causas sin contraste.

## Artículos y figuras

Siete posts~1160–1510palabras con código explicado y pruebas. Siete diagramasSVG
nativos con fuente editable y tres figuras numéricas(counts/loss/F1). Código completo
en examples. Diez exports estáticos,no modelos/API en vivo. Pack omite pesos/logits.
354índices,199exports,47labs/48workspaces. Glosario y ruta enlazados.

Fuentes primarias:spaCy rule-based/EntityRecognizer,HFtoken classification,
BERT1810.04805 yCoNLL2003W03-0419. Sin comparación de latencia/calidad Transformer.

## Verificación actual tras restaurar el entorno

16unit,219editorial/estructura,17blog verdes. Verify reproduce todas las capturas.
Build50rutas,Pagefind10páginas/4280palabras/2idiomas,drafts excluidos. Dependencias
restauradas con pnpm--frozen-lockfile;offline no tenía metadata,online exacta pasó,
sin modificar locks. BrowserChromium141/Playwright1.56.1 en/tmp/ner-playwright.

Browser actual:/tmp/ner-layout.2bljtj/report.json. Siete posts+visor a360/1440,
64roundtrips anotados,640comparaciones predichas,60métricas,transicionesBIO,
ejes por80/800/1600 y subword fixtures. Sin pageerrors/globaloverflow. Se corrigió
un selector del harness que contaba highlights de los nuevos paneles también.
Fuentes SVG correctas; capturas antiguas mostraron recorte inconsistente. Se
revisan otra vez dentro del post con scroll instantáneo para evitar capturas
durante desplazamiento. Evidencia actual:/tmp/ner-figures-restored/.

Logs actuales:/tmp/ner-{unit,verify,editorial,blog,build,pagefind}-restored.log.
Los/tmpde turnos previos desaparecieron tras interrupción; no depender de ellos.
Servidor propio PID59657 cerrado mediante astro dev stop. Sin contenedores propios.

## Continuación

P108:leer ficha y preparar laboratorio de predicciones de modelo pequeño con
probabilidades. Separar familias/objetivos,tokenizer/parámetros/contexto y loss.
No confundir un demo de conteos o atención sin cabeza entrenada con un Transformer
LM entrenado. Mantener independencia de PaySafe y ejemplos completos en examples.
Conservar gaps P026,P045Stripe,P058soak y Serie02solo datos/algoritmos.

Inspección adicional con resvg de NER-RULES/NER-METRICS/NER-ERRORS: los PNG de
360×420 sitúan el texto en filas 31–43 y 56–68, completo. No hay recorte en la
fuente; no alterar SVG correctos por un artefacto de captura/visualización.
Evidencia: /tmp/ner-figures-restored/*-resvg.png. P108 añade un lab sin posts:
48 labs/49 workspaces, pero siguen 354 índices/199 exports y 219 tests editoriales.
