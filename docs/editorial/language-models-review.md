# P108: revisión de seis drafts y laboratorio

Español, draft true/status draft, Luis Ramírez Calle, independiente de PaySafe.
Sin traducción/audio/publicación/commit/push nuevos. El objetivo total no está
aceptado por este bloque. Ver ruta, manifiesto y glosario.

## Requisitos y evidencia

- Diferenciar modelos/objetivos/familias: P108 y LM-FAMILIES.
- Encoder/decoder/encoder-decoder/masked LM: LM-FAMILIES, con visibilidad y fuentes
  BERT/Transformer/T5. Solo el causal fue entrenado; control sin máscara NO es MLM.
- Autoregression/contexto: LM-CONTEXT, shift y control de futuro con pesos reales.
- Tokenizer/parámetros: LM-TOKENS, 21 IDs, UNK, 3205 parámetros, cabeza untied.
  Capacidad 16 posiciones pero train solo siete; no generalizar por capacidad.
- Next-token loss: LM-LOSS, log-sum-exp, nats, targets y perplexity con denominador.
- Laboratorio verificable: tres modelos reales, probabilidades completas de 21
  tokens por probe/posición; visor, figuras, captures, tests y reentrenamiento.

## Protocolo conservado y límites

Captura 2026-10-28T23:24:04.901196+00:00. Siete hashes de corpus/protocol/runtime/
tokenizer/tokenized/model/experiments. Ninguna fuente numérica congelada modificada.
72 frases originales, 44 train/14 dev/14 test, plantillas/prefijos compartidos.
No dominio/gramática desconocidos, test ciego ni calidad lingüística comercial.
No cambiar etiquetas ni seleccionar ganador después de ver resultados.

Modelo: un bloque pre-LN, d16/2heads/FFN32, GELU exacto, dropout0, posiciones
aprendidas16, finalLN, cabeza untied, float64 CPU. 3205 parámetros. Adam .01,
300 updates full-batch, seeds7/19/31, mismos datos/paso final. Train targets308,
dev/test98. Todos los targets del unigram baseline tienen frecuencia train>0.

Loss train final .546997/.549059/.541999. NLL test 1.407849/1.222869/1.425571,
PPL4.087155/3.396918/4.160231 frente a unigramNLL2.673023/PPL14.483693.
No comparar otras tokenizaciones como escala común. Accuracy train~.66 no equivale
a fracaso si varios ejemplos comparten prefijo y admiten distintos targets.

Control de sufijo: diferencia causal cero en tres seeds, sin máscara diferencias
3.110329/1.308724/2.676524. Sin máscara es un control con pesos causales, no MLM.
Probe «el equipo revisa» casi descarta los porque esas combinaciones faltan en
train: sesgo del split, no regla del español ni diagnóstico causal de una head.

## Artefactos

Seis posts de 1110–1290 palabras aproximadamente, seis snippets ejecutados,
seis diagramas SVG nativos y tres figuras medidas. Fuentes editables en blog/assets.
Código completo solo en examples, ocho exports para visor y figuras. Pack omite
pesos, conserva todos los logits y probabilidades, sin inferencia libre/API.
360 índices,207 exports,48 labs/49 workspaces. No duplicar full lab en el blog.

Visor: tres seeds, siete probes, 72 documentos × siete posiciones, métricas de
cuatro variantes por split y tres matrices conceptuales de visibilidad. Top5+resto
no renormaliza; tabla completa21. Tablas con scroll local/foco y aviso móvil.
Se corrigió CSS real que dejaba SVG360 fuera de contenedor324.

## Verificación

Ocho tests JS, tres Python en contenedor; verify reentrena y compara todo con
rtol1e-10/atol1e-12, no garantiza identidad entre hardware/versiones. 223 pruebas
editoriales/estructura y17blog verdes. Build50rutas, Pagefind10páginas/4280palabras/
2idiomas: drafts excluidos. Logs /tmp/lm-{editorial,unit,python,training}-final.log.

Browser final /tmp/lm-layout.2bseDi/report.json: seis posts+visor a360/1440,
42probes,3024posiciones supervisadas (63504valores de probabilidad),24filas métricas,
matrices causal/encoder/cross, IDs, targets, logits y pequeños valores científicos.
Sin pageerrors ni overflow global; scroll de tabla por teclado comprobado en móvil.
La primera aserción editorial esperaba otra frase con el mismo significado: se
ajustó al texto real, sin cambiar la explicación correcta. Browser inicial falló
por overflow real de SVG, corregido antes del último reporte.

Figuras rasterizadas con resvg e inspeccionadas en /tmp/lm-figures/contact-0..2.png.
Visor móvil inspeccionado en screenshots de probes/teacher/families; charts con
escala/probabilidad/resto y etiquetas legibles. La evidencia de PNG no sustituye
las comprobaciones numéricas del origen. Servidor propio PID130302 cerrado mediante astro dev stop tras QA.

## Siguiente ficha

P109: logits/softmax/temperature/top-k/top-p/truncation/context window/streaming/
latency/determinism limits. Laboratorio exige mismo prompt, estrategias comparadas
y tokens registrados. Fijar protocolo antes de muestrear; preservar P108.
No presentar un replay visual como inferencia/streaming real ni omitir medición
de TTFT/latencia si el artículo hace esas afirmaciones. Prerrequisitos P084/P108.
