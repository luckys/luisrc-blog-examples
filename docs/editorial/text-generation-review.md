# P109: revisión de generación, contexto y streaming

Siete drafts españoles desarrollados, con autor Luis Ramírez Calle. El bloque
mantiene la distinción entre inferencia, política de selección y entrega de tokens.
No se han publicado, traducido ni generado audios. El objetivo editorial completo
sigue abierto.

## Cobertura de la ficha y evidencia directa

| Requisito P109 | Artículo | Evidencia que permite comprobarlo |
| --- | --- | --- |
| Logits, softmax y bucle de generación | P109 | 36 recorridos con logits, probabilidades y prefijos por paso; inverse CDF contrastada entre Python y JS |
| Temperature | GEN-TEMPERATURE | Mismo modelo, T 0,5/1/1,5; distribuciones y caso BOS interno conservados |
| Top-k | GEN-TOPK | K exacto, desempate por ID, masa retenida y contraste con consulta justo fuera del corte |
| Top-p | GEN-TOPP | Prefijo mínimo que cruza p, renormalización y tests de composición K→p, incluido p=1 |
| Truncation y context window | GEN-CONTEXT | Rechazo de 21 IDs, control explícito BOS+últimos 15, stop reasons y modelos fijos para fronteras |
| Streaming y latency | GEN-STREAMING | Inferencia real seguida de flush; siete peticiones JSONL por pipe, dos warmups, clocks separados y chunks archivados |
| Determinism limits | GEN-DETERMINISM | Model seed separada de sampling seed; runtime y fuentes fijados; reejecución de tokens distinta de auditoría de tiempos |
| Comparar un prompt bajo estrategias y registrar tokens | Laboratorio compartido | Dos prompts × seis estrategias × tres sampling seeds; 36 recorridos, 144 tokens, todos conservados |
| Diagramas, fórmulas, código, trade-offs, fallos y referencias | Siete posts | Siete SVG conceptuales, tres figuras desde capturas, snippets del código probado, ejercicios y visor interactivo |

Prerrequisitos P084/P108 comprobados y enlazados; navegación entre entregas y
catálogo de 367 índices coherentes. Código completo únicamente en el monorepo de
ejemplos. Ocho exports de lectura allowlisted para este laboratorio, 215 totales.

## Protocolo y capturas preservados

Pesos P108 modelSeed 7 elegidos antes de sampling, sin seleccionar el mejor test.
Sampling seeds 11/23/47. Dos prompts: «el equipo» y «la ingeniera consulta los».
Greedy, sample T1, T0,5, T1,5, top-k2 y top-p0,8, con maxNewTokens10.
Protocolo fijado antes de observar; ningún token especial suprimido.

Calidad: `2026-10-28T23:49:22.920895+00:00`, nueve hashes.
Streaming: `2026-10-28T23:51:16.571Z`, nueve hashes independientes. No se han
modificado las fuentes congeladas ni las capturas al revisar los artículos.
La corrección previa de colisión steps/contador queda documentada en el README.

Verify vuelve a calcular todos los forwards, distribuciones, uniformes, tokens y
controles con rtol 1e-10/atol 1e-12. Verify-stream audita fuentes y recalcula métricas
de las llegadas archivadas; no impone igualdad temporal en una nueva ejecución.

## Resultados desfavorables y límites conservados

- T1,5/seed47 emite BOS dentro de una frase. Sigue siendo improbable: no se convirtió en argmax.
- Varias temperaturas/seeds producen el mismo texto. Tres seeds no estiman diversidad poblacional ni calidad.
- Top-k2 descarta consulta pese a estar casi empatada con publica. No hay estrategia ganadora.
- Todos los recorridos principales acaban EOS. Los otros motivos de parada requieren controles explícitos, separados de resultados lingüísticos.
- La arquitectura acepta 16 posiciones, pero train usó siete. Recortar y reiniciar posiciones no demuestra calidad con contexto largo.
- Las latencias corresponden a CPU, 3205 parámetros y pipe local: no red, HTTP, GPU, concurrencia ni benchmark de un LLM.
- Startup/carga y tokenización previa no están en TTFT. EOS cuenta como token. No p95 representativo con cinco medidas.
- R3 termina en el consumidor a 3,338462 ms y en el productor a 1,295875 ms relativos a sus propios inicios. No restar relojes absolutos.
- R4 agrupa los dos primeros tokens en un chunk. Un frame JSONL no equivale a una lectura de transporte.

## Verificación final de esta continuación

- Cinco tests JS y cuatro Python pasan. Los 36 recorridos y controles se recalcularon sin diferencias; auditoría de streaming pasa.
- 227 tests editoriales/estructura y 17 tests del blog pasan; build y Pagefind pasan.
- Chromium: siete posts a 360/1440, noindex, imágenes cargadas y sin overflow de página. Las tablas tienen scroll local.
- Por anchura: 36 recorridos, 144 decisiones con las tres distribuciones completas de 21 IDs, 240 combinaciones de filtros y 42 frames. Se contrastan prefijos, sorteos, tokens, parada, tiempos del productor/cliente y chunks.
- Teclado: slider y scroll horizontal móvil comprobados. Sin errores JS. Informe final `/tmp/generation-layout.spetAP/report.json`.
- Inspección de diez SVG renderizados y paneles móviles realizada. Figuras: `/tmp/generation-contact-{0,5}.png`. Las capturas son evidencia temporal; las fuentes canónicas permanecen en el repositorio.

Se corrigieron dos huecos de lectura: el visor ahora expone el control max_new_tokens
y el resumen temporal del productor. Se aclaró la composición K→p y se hizo más
legible el código de métricas y RNG del post sin modificar las fuentes capturadas.

El visor **reproduce capturas** y recalcula filtros sobre logits guardados. No
ejecuta forwards ni genera frases nuevas o streaming en vivo. Las mediciones
originales sí proceden de generación y flush reales.

Servidor temporal PID 232712 cerrado con `astro dev stop`; no quedan contenedores
propios de generación. `git diff --check` pasa en ambos repositorios.

## Continuación

Siguiente ficha P110: prompt engineering y structured outputs. Diseñar el contrato
de extracción y las pruebas de evidencia antes de comparar prompts. No atribuir
a un schema la garantía de que un campo está respaldado por el texto.
El inventario global es solo localización, no aceptación de las 175 fichas.
