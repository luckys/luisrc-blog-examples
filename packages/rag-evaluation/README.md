# RAG evaluation: datos, métricas y regresiones

P116 está en curso: cinco borradores verificados de diez. El laboratorio contiene
un gold sintético versionado y una captura de búsquedas BM25. Siguen pendientes la
evaluación de respuestas, la comparación real A/B, latency/cost y gates.
No es un test ciego ni una evaluación independiente de calidad de anotación.

## Ejecutar desde la raíz del monorepo

Usa Node.js 24.19 o posterior y pnpm 12.8.1. El conteo real utiliza Transformers.js
3.8.1. Instala las dependencias desde la raíz con `pnpm install --frozen-lockfile`;
todas las instalaciones del monorepo se realizan con pnpm.

```bash
pnpm --filter @luisrc-examples/rag-evaluation test
pnpm --filter @luisrc-examples/rag-evaluation verify
pnpm --filter @luisrc-examples/rag-evaluation render
```

Los 44 tests separan diez controles del dataset, dieciséis de ranking y dieciocho
de selección/evidencia de contexto. Verificar
no sobrescribe resultados: comprueba hashes y hace replay determinista de las
funciones JS, sin nuevas inferencias ni un benchmark de tiempo. Renderizar deriva
los recursos de presentación. El código del laboratorio permanece fuera del blog;
sólo se sincronizan recursos estáticos explícitos.

## Dataset v1

- `corpus.json`: 16 documentos de ocho temas ficticios y 32 hechos con rangos UTF-16.
- `queries.json`: veinte preguntas, cinco de dev en dos grupos y quince de test en
  seis grupos. Los temas no cruzan splits.
- `gold.json`: dieciséis preguntas con respuesta y cuatro sin ella. Hay 320 juicios
  exhaustivos: 296 de grado 0, dieciséis de grado 1 y ocho de grado 2.
- `dataset-manifest.json`: hashes de esos tres archivos. Es un manifiesto de datos,
  no un resultado de modelos ni una prueba de que las etiquetas sean correctas.

Grado 0: ningún hecho requerido; 1: parte de ellos; 2: todos. Unanswerable significa
que falta evidencia en este corpus. Los datos son públicos y conocidos por su
redactor, sin anotadores independientes ni acuerdo entre revisores medido.
No editar la versión inicial para mejorar una puntuación. Si hay un error, crear
otra versión y registrar el motivo, conservando las comparaciones anteriores.

## Captura de ranking v1

`results/rankings.v1.json` conserva veinte búsquedas reales en proceso y ochenta
evaluaciones para k = 1, 2, 3 y 5. El perfil BM25 quedó fijado: analyzer fold,
k1 = 1.2, b = 0.75, título y cuerpo, sin stemming ni stopwords, score positivo y
desempate por ID ascendente. El runner sólo recibe documentos, preguntas y perfil;
el gold interviene después en la evaluación.

Los hashes de la captura congelan sus fuentes, incluidos los módulos compartidos
de lexical-search, datos, métricas y protocolos. No editar esos archivos ni volver
a ejecutar el capturador sobre el resultado existente. `verify-rankings.v1.mjs`
comprueba listas, scores, ochenta evaluaciones y doce resúmenes por split/cutoff.
La captura no mide latencia y no ejecuta un generador.

Precision divide por k, incluso con listas cortas; grados >= 1 cuentan como relevantes
binarios. Gold vacío: Precision 0 y Recall/RR/nDCG null. Un fallo de recuperación con
gold positivo aporta 0. nDCG usa ganancia `2**grade - 1`, descuento `log2(rank + 1)`
y un ideal construido con todos los qrels, no sólo con lo recuperado.

En las doce preguntas de test con respuesta, MRR vale 1 en todos los cutoffs;
Recall@1 vale 0.75 y llega a 1 en k = 2. Precision@3 vale 0.5 en esas doce preguntas
y 0.4 en las quince de test. En dev, Q002 sigue sin recuperar backups-2 entre cinco
resultados. Este fallo se conserva. Las cuatro preguntas sin respuesta obtienen
candidatos, pero no hay salidas de un generador que permitan evaluar alucinación.

El gold nativo no mezcla grados positivos 1 y 2 dentro de una misma pregunta.
`ranking-controls.v1.json` contiene ocho controles redactados, claramente separados
de las búsquedas. C05/C06 ilustran el efecto del orden de grados sobre nDCG; no son
resultados de otros buscadores o modelos.

## Contextos y evidencia v1

Transformers.js 3.8.1 se añade con pnpm. Se preparan diez JSON de metadata de dos
tokenizers, 14 082 967 bytes, sin pesos. Cada archivo queda ligado a su revisión,
objeto Git y SHA-256 en context-tokenizers.v1.json. La caché .cache/ se ignora.

```bash
pnpm --filter @luisrc-examples/rag-evaluation prepare:tokenizers
pnpm --filter @luisrc-examples/rag-evaluation verify:tokenizers
```

El primer comando sólo prepara metadata; no ejecuta captura ni inferencia. El
segundo revalida los 474 conteos con tokenizers locales. Verify normal puede
reconstruir las decisiones usando mediciones guardadas sin cargar tokenizers.

results/contexts.v1.json conserva 120 composiciones: 2 tokenizers, 20 preguntas y
límites de entrada 256/384/1536. Cuarenta empty_context a256; ochenta ready. Las
bases miden212–226 tokens; entradas con fuentes320–383. A384 y1536 caben todos los
candidatos, incluso los irrelevantes. Q020 tiene dos candidatos; las demás, tres.
Los60pares A/B coinciden en mensajes/prompts/IDs. No son modelos ejecutados.

La selección no recibe gold. El evaluador calcula relevancia de documentos
seleccionados, cobertura de hechos requeridos y fracción del texto anotado en
cuerpos, con rangos UTF-16 unidos sin solapamientos dobles. Son proxies del gold,
no Ragas, juicio semántico o prueba de uso por el generador. Los denominadores
vacíos quedan null. Q008:105/291 unidades requeridas; cobertura2/2 a384 y1536.
A256 queda sin fuentes, cobertura0/2 y ratios de documentos/texto null.
Q002 conserva cobertura.5; aumentar espacio no introduce backups-2 ausente del top3.

Context-core/capture/protocol/tokenizers/prepare/dependencies y datos/plan/resultado
upstream están congelados por sourceHashes. No editarlos ni repetir capture-context.
Los presupuestos pequeños son variantes didácticas, no ajustes del plan A/B fijado.
El baseline1536 comprueba que todos los candidatos caben y los mensajes son iguales.
Context-dependencies.v1.json es una copia de evidencia de dependencias, no otro
lockfile activo. No se modifica el lock histórico de experimentos anteriores.

## Comparación de modelos todavía pendiente

`comparison-plan.v1.json` y `comparison-system.v1.txt` se fijaron antes de las nuevas
búsquedas de test. A es Qwen2.5-0.5B-Instruct, revisión 22942cb...; B es
Qwen2.5-1.5B-Instruct, revisión d54957e...; los repositorios y revisiones completas
están en el plan. La revisión y la ruta q8 del segundo repositorio se consultaron en
la API pública oficial de Hugging Face. No se han descargado o cargado sus pesos.

El plan declara CPU, un hilo, greedy, 192 tokens de salida, 1536 de entrada, k = 3,
los mismos textos completos de fuentes, ausencia de gold en prompts y JSON estricto.
No se ha ejecutado A/B en este bloque. La captura posterior debe verificar artefactos
fijados, conservar todos los raw outputs y fallos, y separar parsing de evaluación
semántica. No renombrar dos prompts o perfiles como dos modelos distintos.

P114 conserva 61 generaciones rechazadas. Este bloque no las corrige ni demuestra
generación útil o abstención conforme. Las fuentes, resultados y límites anteriores
permanecen como evidencia histórica.
