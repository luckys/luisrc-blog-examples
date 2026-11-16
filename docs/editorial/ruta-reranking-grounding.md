# P114: ordenar candidatos y justificar respuestas con fuentes

Estado: ocho borradores escritos y verificados. Ver reranking-grounding-series.json
y reranking-grounding-review.md. La generación falló el contrato en61de61salidas;
no hay demostración de respuestas útiles ni abstención conforme. Se preserva la captura.
El plan inferior es histórico yse materializó con una entrega extra de formato.
Prerrequisito del roadmap: P113. Español, borradores, Luis Ramírez Calle.
La ficha exige evaluar RESPUESTAS con y sin reranking y comprobar enlaces a
fragmentos. No sustituir ese laboratorio por otra tabla de cobertura de retrieval.

## Serie propuesta por conceptos

| Orden | ID propuesto | Pregunta que debe resolver |
| --- | --- | --- |
| 1 | P114 | Qué compara un cross encoder que no compara un bi-encoder, y dónde entra reranking |
| 2 | RERANK-CANDIDATES | Qué límites impone el conjunto de candidatos y cómo elegir un presupuesto auditable |
| 3 | RERANK-EVIDENCE | Qué fragmentos conservar para responder, respetando contexto, versiones y longitud |
| 4 | RERANK-FORMAT | Por qué la salida puede fallar JSON, esquema oestado yporqué ese rechazo no valida no-answer |
| 5 | RERANK-GROUNDING | Cómo comprobar que cada afirmación de una respuesta se sostiene en la evidencia disponible |
| 6 | RERANK-CITATIONS | Qué debe identificar una cita y cómo validar su enlace hasta el rango de fuente |
| 7 | RERANK-NOANSWER | Cómo permitir abstención y expresar incertidumbre sin llamar probabilidad a cualquier score |
| 8 | RERANK-EVALUATION | Qué cambia en las respuestas con y sin reranking y qué fallos permanecen |

Si el presupuesto o la generación de respuestas ocupa demasiado espacio, dividir
antes de reunir temas que merecen explicaciones y ejercicios independientes.
Todos los artículos tendrán código inline probado y laboratorio fuera del blog,
diagrama conceptual, figuras estáticas y visualizaciones interactivas, decisiones,
fallos observados, límites, ejercicio y fuentes primarias.

## Contrato experimental que debe cerrarse antes de inferir

1. Reusar corpus/chunks versionados P112 y preguntas gold P113. Son datos conocidos:
   no atribuir a ese conjunto independencia ni generalización. Si se añaden preguntas,
   fijar hechos, citas y criterios antes de los nuevos rankings o respuestas.
2. Elegir y verificar un cross encoder real compatible con español y runtime local.
   Leer model card, formato de pares query/passage, tokenizer, revisión, licencia,
   dtype, longitud y significado de salida. No simular logits ni sustituir el modelo
   por un solapamiento léxico. No inferir que un score es probabilidad calibrada.
3. Mantener las capturas P113 intactas. Proponer presupuestos/candidatos antes de ver
   logits. Conservar BM25 como referencia además del híbrido: no elegir únicamente
   una baseline débil para producir una historia de mejora. Registrar candidatos
   ausentes, vacíos y completos, antes y después, y cada score real.
4. Evaluar respuestas con y sin reranking bajo el mismo generador y contrato. Si se
   usa un LLM, ejecución real local con modelo/prompt/revisión fijados, salidas íntegras
   y negativos conservados. No presentar respuestas redactadas por el autor como
   inferencia del modelo. Una modalidad extractiva debe identificarse y justificarse
   explícitamente, sin tratarla como validación de un generador que no se ejecutó.
5. Separar recuperación, selección de contexto, generación y verificación de citas.
   Un fallo de cobertura no prueba alucinación, y una cita existente no prueba que
   sostenga la afirmación. Anotar afirmaciones/apoyo/contradicciones por separado.
6. Validar citas mediante ID de fuente, versión, representación y rango real. Resolver
   enlaces en un visor/endpoint estático verificable y mostrar el fragmento citado.
   Controles de IDs inexistentes, versiones obsoletas, rangos inválidos y citas que
   existen pero no apoyan una afirmación. No inventar URLs de evidencia.
7. Permitir no-answer y respuestas parciales con motivo. Negativos y desconocidos no
   se convierten en aciertos vacíos. Para hablar de incertidumbre/calibración hacen
   falta etiquetas y denominadores adecuados; no ajustar un umbral a dos negativos.
8. Medir trabajo y, si se habla de latencia, capturar tiempos reales con alcance
   declarado. Conservar todas las respuestas y regresiones, sin repetir para escoger
   la versión favorable ni cambiar criterios después de leer resultados.

## Evidencia para cerrar los borradores

Protocolo y entradas antes de inferencia; archivos/modelos por SHA y runtime real;
pares y scores del cross encoder; respuestas con/sin reranking; evaluaciones de
afirmaciones y citas; controles de abstención; verificador de solo lectura y pruebas
de rangos/identidad. Revisión editorial y de código. QA móvil/escritorio de artículos,
visores y enlaces a fragmentos, con diagramas y gráficos inspeccionados. Build.
Código solo en el monorepo de ejemplos, dependencias mediante pnpm. No publicación,
traducción, audio, commit ni push automáticos. El objetivo global175 sigue pendiente.
