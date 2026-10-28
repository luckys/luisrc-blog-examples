# Glosario y decisiones de lenguaje P106

- **corpus**: colección de documentos con límites explícitos.
- **token**: ocurrencia de una unidad; **término**: entrada del vocabulario.
- **analyzer**: pipeline completo que produce términos para indexación/consulta.
- **NFC**: normalización canónica; no es eliminación de acentos ni corrección.
- **accent folding**: política adicional explícita; aquí conserva ñ.
- **stemming / stem**: reducción a claves, no necesariamente palabras válidas.
- **lemmatization / lemma lookup**: forma lingüística / tabla limitada. No llamar
  contextual a este lookup ni Snowball a la reducción didáctica de plurales.
- **word n-gram / character n-gram**: ventanas de palabras / puntos de código.
- **TF / DF / IDF**: ocurrencias por documento / documentos con término / peso.
- **postings**: documentos y frecuencias por término; no almacenamos posiciones.
- **BM25 score / cosine similarity**: ranking léxico, no probabilidad o confianza.
- **P@3**: denominator fijo tres; **R@3**: divisor relevantes; **RR@3**: inversa
  de primera posición relevante en top3, cero si no aparece; **MRR@3**: su media.
- **macro**: media por query; Q20 sin respuesta queda aparte, con métricas null.
- **gold / judgments**: etiquetas didácticas de autor, todos los pares juzgados;
  no test ciego ni evidencia representativa de producción.
- **BPE**: aprender y aplicar merges ordenados; aquí caracteres y cuatro palabras.
- **WordPiece**: aquí inferencia greedy con vocabulario fijo; no trainer original.
- **UNK**: palabra no representable bajo este vocabulario; no dato inválido.

Usar términos técnicos en inglés con explicación española. Evitar «el buscador
entiende» cuando solo se observaron coincidencias. Recordar que acierto agregado,
cobertura de palabras, exactitud lingüística y relevancia son medidas diferentes.
