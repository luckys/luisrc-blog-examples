# Ruta P109: decisiones de generación y límites

Siete drafts en español. Prerrequisitos P084 y P108. Manifiesto:
[text-generation-series.json](text-generation-series.json). Revisión y evidencia:
[text-generation-review.md](text-generation-review.md).

1. **P109:** bucle autorregresivo, logits, greedy/sampling y diferencia entre probabilidad del modelo y de selección.
2. **GEN-TEMPERATURE:** transformar probabilidades sin añadir conocimiento; caso BOS interno y secuencias que no cambian.
3. **GEN-TOPK:** soporte de K exacto, empates y renormalización; candidato casi empatado que queda fuera.
4. **GEN-TOPP:** nucleus mínimo, token que cruza el umbral y composición de filtros sin recuperar IDs excluidos.
5. **GEN-CONTEXT:** EOS, presupuesto y límite de contexto; rechazo, recorte explícito y reinicio de posiciones.
6. **GEN-STREAMING:** emisión y llegada reales, TTFT, tiempo total, intervalo, relojes relativos y coalescencia.
7. **GEN-DETERMINISM:** model seed frente a sampling seed, RNG, fuentes, tolerancias y límites de reproducibilidad.

Cada entrega mantiene una pregunta y ejercicio propios; unir K y p dificultaría
explicar su frontera distinta. Streaming conserva su post porque requiere un
contrato de medición diferente al de las probabilidades.

Laboratorio `packages/text-generation`: modelo P108 seed7 sin reentrenamiento,
dos prompts × seis estrategias × tres sampling seeds, 36 recorridos/144 tokens.
Streaming real JSONL por pipe con dos warmups y cinco mediciones. Siete diagramas,
tres figuras medidas y visor de tres paneles con replay explícitamente rotulado.
No confundir el visor estático con las mediciones de inferencia originales.

QA final: 5 JS/4 Python, verify completo, 227 editorial/estructura, 17 blog,
build/Pagefind y Chromium a 360/1440 pasan. Detalle en la revisión. No publicación,
traducciones, audio ni commits automáticos. Siguiente ficha: P110.
