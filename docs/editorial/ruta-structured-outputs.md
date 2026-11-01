# Ruta P110: de una respuesta generada a datos comprobables

Siete drafts en español, independientes de PaySafe. Prerrequisitos P022 y P109.
Manifiesto: [structured-extraction-series.json](structured-extraction-series.json).
Laboratorio: [structured-extraction](../../packages/structured-extraction/README.md).

1. **P110:** instrucciones, roles, documentos, chat template y entrada efectiva.
2. **PROMPT-FEW-SHOT:** demostraciones positivas/negativas, coste de contexto y formato frente a calidad.
3. **PROMPT-SCHEMA:** parser estricto, Pydantic, JSON Schema, Ajv y generación libre frente a constrained decoding.
4. **PROMPT-EVIDENCE:** cita en fuente, nombre en cita, duplicados y límites semánticos del anclaje literal.
5. **PROMPT-TOOLS:** tool schema, nombre permitido, contexto autorizado y retorno local sin efectos externos.
6. **PROMPT-ADVERSARIAL:** órdenes dentro del documento, límites de confianza y utilidad conservada.
7. **PROMPT-EVALUATION:** protocolo, primer fallo, TP/FP/FN efectivos, denominadores nulos e integridad histórica.

Cada entrega tiene pregunta, código o documentos concretos, diagrama, ejercicio y
límites. Separar estructura, evidencia e interpretación evita presentar JSON válido
como respuesta correcta. Herramientas y entradas adversariales se mantienen en
entregas propias porque añaden decisiones de autoridad y evaluación de daño.

24 inferencias locales originales, tres variantes × ocho documentos, sin reparación
ni selección favorable; 18 fixtures manuales separados. Siete diagramas conceptuales,
tres figuras derivadas y visor con captura, controles y evaluación. La gráfica de
entidades cambia al seleccionar documentos, sin ejecutar modelo ni Pydantic en web.

Las ocho respuestas few-shot pasan controles, pero solo recuperan 2/12 entidades y
producen dos falsos positivos. Se conservan listas vacías incorrectas, tipos invertidos,
fences y citas sin respaldo. Los resultados describen ocho documentos sintéticos,
no una estimación de calidad general ni una garantía de resistencia a ataques.

No publicación, traducción, audio, commit o push automáticos. La revisión final y
los informes quedan en [structured-extraction-review.md](structured-extraction-review.md).
Siguiente ficha del objetivo completo: P111; no olvidar huecos P026/P045/P058.
