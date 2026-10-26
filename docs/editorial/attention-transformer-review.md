# Revisión P103: reconstruir atención y Transformer

Ocho drafts españoles de Luis Ramírez Calle, independientes de PaySafe. Ver
[ruta](ruta-atencion-transformer.md), [manifiesto](attention-transformer-series.json)
y [glosario](attention-transformer-glossary.md). La planificación está ahora en
este repositorio de ejemplos. El roadmap principal permanece en el blog.

## Cobertura y división

Q/K/V; escala y softmax; máscaras; multi-head; posiciones; bloque pre-norm;
encoder/decoder; causalidad y coste denso. Una pregunta concreta por post,
aproximadamente 1080–1270 palabras con metadatos y reproducción. Ocho extractos
Python contrastados con fuentes, ocho D2/SVG, cuatro figuras y visor de cuatro
secciones. No hace falta subdividir estos focos. P104 conserva pretraining,
adaptación y test no visto; no se completan sus requisitos con estos controles.

## Evidencia numérica

Laboratorio attention-transformer, sin entrenamiento o calidad predictiva medida.
Float64 CPU, ancho8, heads2, depth4, FFN16, vocab12, batch2, seeds7/19/31 y dropout0.
Nueve casos: self_full (longitud4, válidas4/2), self_causal (longitud5, válidas5/3),
cross (queries5/keys4). Entradas normales fijas, seeds101/102; proyecciones Xavier,
bias0,288parámetros por módulo. Se archivan Q/K/V, raw scores, escala, allowed,
weights, contexto por head, concat y salida.

Forward y pesos contrastados con SDPA/MHA, gradientes Q/K/V con SDPA. El adaptador
MHA copia las cuatro proyecciones y biases, invierte allowed y pide pesos por head.
Los errores máximos quedan bajo1e-12. Bool True significa permitido en nuestro
helper/SDPA, excluido en MHA. Invertirlo cambia output≈8.018569. Máscara aditiva
correcta equivalente. Keys de padding excluidas; queries de padding no se prometen
cero. Se rechazan filas sin ninguna key. SDPA devuelve cero finito para ese caso
en este runtime, sin universalizarlo. Dropout funcional se fija explícitamente0.

Escala:512queries/ocho keys, componentes normales independientes, dimensiones1/4/16/64.
Std raw≈1.049/1.950/3.943/8.043; escaladas≈1.049/.975/.986/1.005. Entropía media raw
≈1.785/1.292/.667/.343 y escalada≈1.785/1.762/1.736/1.717. Dimensiones discretas,
no curva continua ni garantía poblacional sin supuestos. Entropía no es calidad.
Softmax estable[1000,1001,999]≈[.244728,.665241,.090031]; forma ingenua no finita.

PE sinusoidal posiciones0…15, ancho8, base10000. Permutación[2,0,3,1]: error sin
posiciones≈2.22e-16; cambiar asociación manteniendo posiciones≈.432636; permutar
pares completos≈3.33e-16. No confundir equivarianza e invariancia ni prometer
extrapolación porque la fórmula admite posiciones nuevas.

Bloque pre-norm de600parámetros contrastado con TransformerEncoderLayer con pesos
copiados. Anular outputs de subcapas devuelve identidad del bloque; no del modelo
con normalización final. Se declara diferencia frente al post-norm original2017.
FFN por posición y LN por features no abren caminos temporales nuevos.

Tres decoder-only820parámetros y tres encoder-decoder1740. Source4/target5 y
padding4/2,5/3. Source/target comparten embedding en encoder-decoder, no head.
Q de cross viene del decoder; K/V de memory encoder. Cambiar futuro target
mantiene prefijos idénticos en ambas arquitecturas. Sin máscara, cambios decoder-only
≈.650188/.392394/.527208. Gradiente de logit[0,1,1] al futuro y a otra muestra0.
Cambiar source padding no altera outputs válidos; cambiar source válido sí,
≈.095145/.098267/.064307 en el primer vector de logits. No demuestra traducción.

Scores densosB2H2float64:512/2048/8192/32768bytes a longitudes4/8/16/32. Solo
ese tensor, no VRAMtotal, latencia o kernels fusionados. Causalidad no evita
por sí sola materializar el cuadrado. No hay benchmark de GPU o cache K/V.

## Reproducción y límites

Runtime fijado por digest: Python3.13.17, NumPy2.5.4, PyTorch2.14.1+cpu, linux/amd64.
Dos CPUs/2GiB/un thread, rednone, pullnever, rootfs/bindreadonly, /tmp temporal,
user1000:100, capdropALL, timeout300s. Limpieza solo del contenedor propio aleatorio.
Diez hashes de fuentes; comparison.json y results/observations.json idénticos.
Verify recalculó todos los controles, rtol1e-10/atol1e-12. No promete igualdad
entre equipos. Doce tests Python y3JS pasan, con contratos previos a implementación.
No se atribuyen errores numéricos a los imports inicialmente ausentes.

## Limpieza del blog y validación

Se trasladaron139archivos de planificación y45herramientas a docs/editorial y
tools/blog del monorepo. Se actualizaron consumers a editorialPath, imports
canónicos y un lanzador BLOG_ROOT pnpm blog:tool. El blog conserva su roadmap,
artículos, assets y tres scripts propios de audio/diagramas. Playwright y ECharts
salen de sus dependencias; las herramientas declaran aquí sus dependencias.
Instalación pnpm offline, sin descargas, y lockfiles coherentes.

El cambio de lockfile invalidó dos capturas Docker. Se repitieron realmente los
laboratorios container-environments y progressive-delivery, sus verificadores y
renders, sin parchear hashes ni relajar tests. Se actualizaron cifras de tamaños
en el post multi-stage y se sincronizaron los recursos canónicos. Se conserva el
alcance local y las limitaciones de esos experimentos.

Pasan194checks editoriales/estructurales y17tests del blog; los dos tests del
roadmap se trasladan a la suite editorial, no se suprimen.43labs,319índices,
159exports. El inventario78draft_exists/19related_only/78not_written es existencia,
no aceptación global del roadmap. Build y Pagefind se comprueban al cierre.

La inspección visual cubre ocho diagramas/cuatro figuras yvisor móvil.
`/tmp/attention-transformer-visuals/report.json`. Se corrigió overflow de raíces
inline de KaTeX (SVG de6400px) conservando fórmulas equivalentes y explicación.
Después se observa1430px con viewport1440 y350con360, sin overflow global.
Una selección Playwright por string confundía valor1 con etiqueta1 de la opción0;
la prueba usa value explícito. Era una ambigüedad de la prueba, no un fallo del
selector de usuario. Chromium final:18vistas en1440/360px. Por ancho:84matrices completas,168filas,
336conjuntos de contribuciones,16posiciones y15filas de gradiente, además de
teclado, scroll interno, links, iframe y404. Sin errores JS ni overflow global.
Informes `/tmp/attention-transformer-layout.raHdqa/report.json` (1440) y
`/tmp/attention-transformer-layout.p4ir2N/report.json` (360).
La suite recurrente se repitió desde tools/blog a360px y pasó:
`/tmp/recurrent-sequences-layout.rmxpDL/report.json`.

P104 sigue pendiente. Mantener gapsP026, Stripe sandboxP045, soakP058 ySerie02
solo estructuras/algoritmos. El objetivo global continúa sin aceptación completa.
