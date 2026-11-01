# Ruta: reconocimiento de entidades

P107 desarrollado en siete posts españoles, pequeños y específicos. Español,
draft true/status draft,Luis Ramírez Calle. Sin dependencia de PaySafe.
Prerrequisitos del bloque:P092,P093,P106,P104. No renombrar fichas anteriores.

La ficha exige NER,BIO,span annotations,token classification,reglas vs Transformers
y entity-level P/R/F1. El laboratorio exige entrenar nombres/organizaciones y
revisar límites. Se cumple con un clasificador lineal realmente ajustado, no con
solo reglas. La comparación Transformer es conceptual y su alineación una fixture;
no se atribuye un entrenamiento inexistente.

## Orden de lectura

1. **P107**: NER: decidir dónde empieza y termina una entidad. Cómo definir menciones PER/ORG y conservar offsets sobre el texto original.
2. **NER-BIO**: BIO tags: convertir palabras etiquetadas en entidades completas. Cómo representar límites con B/I/O y rechazar secuencias incoherentes.
3. **NER-RULES**: NER con reglas: qué resuelve un diccionario y qué se le escapa. Cómo construir un baseline sin confundir cobertura y memorización.
4. **NER-TRAINING**: Entrenar un detector NER: bajar la loss no garantiza reconocer entidades. Cómo aprender pesos BIO y separar convergencia de generalización.
5. **NER-TRANSFORMERS**: NER con Transformers: el contexto ayuda, la alineación sigue importando. Qué cambia con contexto y cómo alinear subwords.
6. **NER-METRICS**: Evaluar NER: un límite incorrecto cuenta como dos errores. Cómo medir por entidad sin ocultar errores tras token accuracy.
7. **NER-ERRORS**: Errores de NER: distinguir límites, tipos y entidades inventadas. Cómo revisar confusiones y decidir el siguiente experimento.

## Decisiones y evidencia

El corpus y el protocolo original preceden al ajuste. Tras el fracaso todoO,
se fijó un contraste separado antes de ejecutarlo. Se conservan las nueve seeds/
pasos, sin seleccionar ganador ni alterar etiquetas. Más pasos ajustan train,
pero dejan F1descriptivo test en4/21. Los artículos explican límites y fallos,
no presentan un detector de producción ni validación ciega.

Código ejecutable,corpus,capturas,pruebas y scripts en packages/entity-recognition.
Fragmentos explicados y enlaces al repo en cada post. Siete diagramas SVG nativos,
tres figuras numéricas y visor de anotaciones/predicciones/errores/alineación.
Ver manifiesto y revisión para evidencia y límites. Siguiente ficha:P108.
