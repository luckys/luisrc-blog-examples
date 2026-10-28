# Búsqueda de texto: ruta P106

Audiencia: ingenieros que necesitan entender qué recupera un buscador antes de incorporar embeddings o generación. Español, drafts, sin dependencia de un proyecto comercial.

1. **P106**: Corpus de búsqueda: decidir qué documento responde a una consulta. Pregunta: Cómo fijar unidad documental, procedencia y etiquetas antes del ranking.
2. **NLP-NORMALIZATION**: Normalizar texto sin borrar diferencias que importan. Pregunta: Qué equivalencias crea la normalización y cómo conservar el original.
3. **NLP-TOKENIZATION**: Tokenización: qué pierde un buscador al decidir dónde empieza una palabra. Pregunta: Cómo los límites de token cambian vocabulario y coincidencias.
4. **NLP-STEMMING**: Stemming: agrupar variantes también puede mezclar palabras distintas. Pregunta: Qué gana y pierde una regla que reduce terminaciones.
5. **NLP-LEMMA**: Lemmatization: por qué un diccionario no resuelve toda la morfología. Pregunta: Qué información hace falta para convertir una forma en su lema.
6. **NLP-NGRAMS**: N-grams: recuperar una errata sin llenar el ranking de parecidos. Pregunta: Cómo ventanas de palabras y caracteres cambian recall y ruido.
7. **NLP-TFIDF**: TF-IDF: de contar palabras a comparar vectores de documentos. Pregunta: Cómo frecuencia, rareza y normalización construyen un score sparse.
8. **NLP-BM25**: BM25 por dentro: postings, saturación y longitud de documentos. Pregunta: Cómo obtener un ranking explicable con frecuencia y longitud.
9. **NLP-EVALUATION**: Evaluar un buscador: el promedio no explica qué consulta acaba de fallar. Pregunta: Cómo medir top-k con etiquetas y conservar errores fuera de alcance.
10. **NLP-BPE**: BPE: cómo aprender subwords uniendo pares frecuentes. Pregunta: Cómo entrenar y aplicar merges sin confundir subwords con morfemas.
11. **NLP-WORDPIECE**: WordPiece: elegir la subword más larga también puede acabar en UNK. Pregunta: Cómo segmentar con vocabulario fijo y fallar sin inventar tokens.

Laboratorio: `packages/lexical-search`. Corpus original de veinte documentos y veinte consultas, etiquetas binarias de los cuatrocientos pares guardadas antes del primer ranking. Diez dev y diez test, de las que una no tiene respuesta. El conjunto es didáctico y construido a mano; no es validación ciega ni muestra de producción. Seis contrastes preregistrados, ningún ganador seleccionado ni tuning contra test.

Gate: BM25 real, queries/etiquetas conservadas y análisis por error. Nueve hashes y recomputación de los 120 rankings. Código inline enlazado a fuentes reales. Once diagramas, cuatro figuras, visor con búsqueda ejecutada localmente en el navegador y contraste de la captura.

No publicar, traducir, generar audio ni hacer commit/push de esta entrega sin autorización posterior. El resto de las 175 fichas mantiene su alcance y sus gaps anteriores.
