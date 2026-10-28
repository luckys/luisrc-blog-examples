# Revisión P106: corpus, búsqueda léxica y subwords

Once drafts españoles, Luis Ramírez Calle, draft true/status draft. Sin vínculo
de producto con PaySafe. Ver [ruta](ruta-busqueda-lexica.md),
[manifiesto](lexical-search-series.json), [glosario](lexical-search-glossary.md) y [laboratorio](../../packages/lexical-search/README.md).

## Alcance contrastado con la ficha original

| Requisito P106 | Evidencia actual |
| --- | --- |
| Corpus | P106, corpus.json con veinte notas originales, unidad título+cuerpo, IDs/versiones; veinte queries con intención y cuatrocientos juicios bajo convención explícita |
| Normalización | NFC, lowercase español y fold conservando ñ; ejemplos canónicos, idempotencia y retención del original |
| Tokenización | Regex Unicode, casos C++/C#/Node.js, negación retenida; límites de orden/posiciones/idiomas explicados |
| Stemming | Post específico y regla didáctica probada; lunes y formas de índice conservan fallos; referencia a Snowball sin afirmar implementarlo |
| Lemmatization | Post específico, trece entradas explícitas, normalización consistente y ambigüedad de fue; no tagger ni modelo contextual |
| N-grams | Ventanas de palabras/puntos de código, recuento de ocurrencias, búsqueda BM25 char3 y regresión Q17 |
| TF-IDF | Fórmula suavizada, TF/DF, cosine L2, fixture calculado a mano y contraste sobre el corpus |
| BM25 | Índice invertido OR, fórmula positiva IDF, k1/b fijados, descomposición por término, curvas y fixture independiente |
| BPE | Entrenamiento real de cinco merges en cuatro palabras con counts, traza completa, aplicación ordenada, caso solapado y alfabeto limitado |
| WordPiece | Inferencia greedy probada con vocabulario fijo, ##, whole-word UNK, no backtracking; explicación del aprendizaje reconstruido sin afirmar trainer ejecutado |
| Buscador BM25 verificable | retrieval.mjs compartido por CLI y navegador; tests independientes y recomputación completa de resultados |
| Analizar errores y guardar etiquetas | queries.json antes de scoring, intent/category/split/relevant; rankings, missed/falseTop y métricas en reportes; Q10/Q12/Q17/Q18/Q19/Q20 discutidos |
| Diagramas, gráficas y código | Once D2/SVG, cuatro figuras con datos o cálculos declarados, once extractos exactos; visor de cuatro secciones; laboratorio en monorepo, solo exports estáticos en blog |

P033 no existe como ID exacto en los artículos previos. Se enlazan DB-SQL y
DB-ANALYTICS y se conserva el mapeo de prerrequisitos del roadmap en el manifiesto.
No se reasignó ningún ID ni se declaró cumplida la ficha SQL completa por eso.
P086 sí existe. Todos los IDs y slugs definidos siguen siendo únicos.

## Protocolo y resultados preservados

Protocolo, corpus, queries y lookup anteriores al primer scoring. Seis contrastes,
sin búsqueda de hiperparámetros ni ganador seleccionado. Captura
2026-10-27T18:40:34.660Z, Node v24.19.0, ICU78.3/Unicode17.0, nueve hashes.
Ningún cambio de fuente numérica después de archivar el reporte.

Veinte queries, diez dev/diez test; Q20 sin respuesta. Métricas macro sobre nueve
test con respuesta: fold P@3 .296296/R@3 .833333/MRR@3 .888889, char3
.370370/1/.925926. Las restantes variantes igualan fold en esas métricas test.
P@3 usa divisor tres incluso con menos resultados; RR truncado en tres.
Q20 no recibe un recall inventado ni se usa para calibrar un umbral.

Char3 recupera la errata Q19, pero Q17 pasa de D15 primero a D06/D07/D15.
Retención de ese error evita presentar recall agregado como comprensión.
Q10 coincide por retencion, no por corregir anios. Q12 pierde D06 con palabras,
no se añade un sinónimo después de observar test. Q18 conserva un incidente como
coincidencia no relevante: retener sin no equivale a modelar negación.

Los juicios son didácticos de autor, no evaluación ciega o representativa. No hay
benchmark de latencia ni capacidad de producción. Las cuatro figuras declaran
si muestran recuentos, métricas o cálculos analíticos; no tiempos simulados.

## Verificación ejecutada

- Nueve tests JS: normalización, límites de tokens, morfología limitada, fixture
  BM25, TF-IDF a mano, postings vs cálculo exhaustivo, métricas y subwords.
- Verify recalcula los 120 rankings, todas sus contribuciones y métricas, la
  normalización y las trazas. Comprueba nueve hashes y tolerancia 1e-12.
- 214 tests editoriales/estructura y 17 tests del blog verdes. Las cinco nuevas
  comprobaciones P106 cubren metadatos/IDs, once extractos, dimensiones/export,
  recomputación y errores conservados; no sustituyen revisión conceptual.
- Build final 50 rutas; Pagefind diez páginas/4280 palabras/dos idiomas, drafts
  excluidos. pnpm offline/frozen funciona con 47 projects/46 labs, lock intacto.
- 347 índices de posts y 189 exports estáticos. Git diff --check en ambos repos.

Chromium: `/tmp/lexical-search-layout.LzhMVG/report.json`. 24 vistas (once posts
y visor, por 1440/360). Cada ancho compara 120 rankings con scores, términos,
TF/DF/longitudes/IDF/contribuciones, tres splits y siete probes de subwords.
También queries libres sin gold, salida textual de entrada HTML, teclado,
scroll horizontal/vertical, links HTTP200, imágenes/iframes, noindex y ausencia
de pageerrors/desbordamiento global. Todas las peticiones del visor son locales.

Una primera pasada detectó un desbordamiento real de output: la lista JSON de
tokens tenía 437px en una caja de 324px. overflow-wrap:anywhere lo corrige sin
alterar scores. Otra pasada falló en el propio check al intentar seleccionar un
control de una sección oculta: se corrigió su navegación, no el comportamiento
del producto para satisfacer la prueba. La pasada final completa pasa.

Inspección visual: quince figuras y cuatro secciones. Capturas nuevas sin scroll
residual del teclado: `/tmp/lexical-search-visuals.ByTDU2/report.json`, ocho vistas,
offsets iniciales cero. Header/primer término legibles. Se limita el chart a 380px,
vocabulario entero y decimales con coma en figuras. Las capturas del check de
teclado pueden conservar desplazamiento suave transitorio; no representan el
estado inicial del usuario.

## Estado de entrega

P106 aporta once drafts y su laboratorio. Sin publicación, traducción, audio,
push nuevos. El usuario solicitó guardar la entrega mediante commits el 28 de octubre de 2026. El objetivo completo sigue abierto: el inventario
81 draft_exists/19 related_only/75 not_written solo registra existencia. Mantener
las exclusiones de Serie02 y los gaps P026, Stripe P045 y soak P058.
Siguiente: P107, NER/spans/BIO, detector entrenado y evaluación por entidad.
