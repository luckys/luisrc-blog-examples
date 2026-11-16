# P114: ocho borradores verificados; experimento de generación fallido

Revisión de 2026-11-03. Estado editorial verified_drafts, sin publicación ni aceptación
global del roadmap. Autor Luis Ramírez Calle. Solo español, draft true/status draft.
No presentar esta captura como un RAG funcional: ninguna salida cumplió el contrato.

## Alcance contrastado con la ficha

| Requisito | Evidencia y alcance real |
| --- | --- |
| Cross encoders | BGE multilingüe ONNX q8 CPU,215pares reales,27lotes/216salidas físicas;último padding documentado,logits íntegros |
| Rerank | BM25 yRRF preservados,120comparaciones conM3/6/10;selección yorden reproducidos desde logits reales |
| Evidence selection | 240contextos de96/160/256tokens con tokenizerQwen;chunks completos,aliases ydescartes;80escenarios de respuesta con256 |
| Grounding | 61notas editoriales previas aagregados,15extractos diagnósticos con fuentes yrazones;no verificador semántico general ni revisión ciega |
| Citations | Aliases→identidad/versiones/rangoUTF16;source.html resuelve13fragmentos yresponde a hashchange;5enlaces manipulados rechazados |
| No-answer | Estado previsto yreglas probados;8escenarios negativos observados fallanformato,0abstenciones conformes. No acreditar éxito del modelo |
| Uncertainty | Distinguir logit,sigmoid yconfianza calibrada;no umbral ajustado a2negativas ni garantías estadísticas |
| Laboratorio de respuestas con/sin reranking | 80escenarios,61prompts únicos,generación local real comparada;58JSON inválidos+3estados incoherentes,80rechazos técnicos |
| Enlaces a fragmentos | Verificación de13URLs válidas y5alteradas poranchura;diagnósticos y10controles separados de respuestas aceptadas |
| Escritura yrecursos | 8posts específicos,extractos de código ejecutado,8diagramas,8figuras y8paneles congráficos dinámicos,rangos yfuentes |

Se añadió RERANK-FORMAT después de EVIDENCE para explicar el fallo observado sin
sobrecargar grounding o evaluación. La cadena termina en NOANSWER/EVALUATION. Cada
post tiene más de mil palabras, contexto, decisiones, límites, ejercicio y referencias.

## Capturas originales

Entradas y reglas antes de inferir: 2026-11-03T12:26:46.279Z.
Logits: 2026-11-03T12:27:04.862Z.
Contextos yprompts antes de generar: 2026-11-03T12:27:42.770Z.
Índice final de generaciones: 2026-11-03T12:37:47.749Z.
Agregados tras leer yanotar: 2026-11-03T12:43:49.984Z.

Modelos públicos por revisión ySHA. Primer candidato Xenova consultado devolvió401,
sin descarga ni inferencia;se seleccionó una conversión pública BGE documentada antes
de medir. BGErevision6f5ff65298512715a1e669753bc754d2bc8f367b;Qwenrevision
22942cb7d7ba4cc81bb4673549ca4d4614469b5e. Ambosq8CPU,Transformers.js3.8.1 y
ONNXRuntimeNode1.21.0. Pesos solo.cache ignorada; no API keys ni ejecución remota.

215pares lógicos,216posiciones físicas;max71tokens/límite de trabajo192. Sumallamadas
reranker11.7187s excluye carga/tokenización.80escenarios reutilizan61prompts únicos.
4930tokens generados;23salidas alcanzan160. Suma536.5701s de generación, no benchmark
end-to-end. Promptmax396bajo1024;contextomax177bajo256. Nada truncado de la entrada.

Se preservaron todos los resultados yeventos, sin repetir para escoger una respuesta
favorable. Los comandos rechazan sobrescritura;para otro ensayo versionar protocolo y
rutas. Fuentes con hashes congeladas, incluyendo prompt,rúbrica ycódigo de captura.
El lock histórico conserva bytes originales. Los verificadores no ejecutan modelos.

## Qué puede concluirse y qué sigue sin demostrarse

Test8conrespuesta:BM25 contexto.9791667conysin;RRF.8541667sin/.9791667conrerank.
Q14evidenciaRRF4ª→1ª;BM25ya1ª. Q06dev mejora al incluir fragmentos complementarios.
Q18 sigue incompleta. No concluir superioridad universal ni calidad de respuesta a
partir de cobertura. Datos conocidos, no test ciego o corpus de producción.

Formato58invalid_json/3invalid_state_claims.80rechazos técnicos,0respuestas aceptadas,
0abstenciones conformes. No link-validity operativa inventada: null sin referencias de
respuestas aceptadas. Diags Q02:tres enlaces,solo2apoyanretención;Q11TTLcorrecto/clave
sin apoyo;Q19número13inventado;Q20vacío produjo salida ajena. Diagnósticos no exhaustivos.

LIMITACIÓN ABIERTA: generación útil con grounding yno-answer conforme no acreditada.
Si la aceptación de un proyecto requiere respuestas útiles, hace falta otro experimento
predeclarado yno bastan estos borradores. Esta serie explica el fracaso ylas comprobaciones;
no ocultar ese límite cuando se diseñen arquitecturas posteriores o se audite el objetivo.

## Corrección editorial trazable

La revisión inicial marcó como contradicted la clave inventada en Q11. «Incluye el
idioma» no afirma exclusividad de campos. review-corrections.json cambia la etiqueta
de presentación aunsupported yexplica la razón, ligada aSHA de anotaciones/evaluación.
No modifica originales ni agregados:todoese texto ya estaba rechazado. El visor muestra
la rectificación. No es un ajuste para mejorar una métrica ni un resultado de otro modelo.

Los10controles de citas son redactados, no inferencias.3resuelven ysolo1está etiquetado
como apoyado. Fuente real no basta:TTL301conenlacecorrecto contradiceTTL300;réplicas
Kubernetes no aparecen. Alias/contexto/versión/representación/rango se prueban porseparado.

## Verificaciones

- 5tests JS de contratos ygeometría pasan.
- verify --tokenizer reproduce todas las secuencias depares,240presupuestos,61prompts
  ydecodifica las salidas originales;audita hashes,logits,rangos,eventos/resultados yparche.
- 248tests editoriales/estructura y17delblog pasan;407índices/284exports;sin labs/ZIPs
  dentro delblog ni pesos/runtime exportados.16exports propios permitidos,byteexactos.
- QA completo:/tmp/reranking-layout.qNv96r/report.json.8posts a360/1440. Poranchura:
  120rankings/1560resaltados/120candidatos/240contextos/80salidas/15diagnósticos/
  10controles/8negativos/13fuentes/5enlaces manipulados. Teclado/scroll cuando necesario,
  0erroresJS/overflow. Geometría ytexto contrastados.8diagramas/8figuras sinrecortes.
  Inspección visual estática ymóvil, resolvedor conresaltado;corrección editorialvisible.
- Astro final compila 50 rutas; Pagefind indexa 10 páginas, 4280 palabras y 2 idiomas.
  Los posts siguen drafts y fuera de feeds, sitemap e índice público.

## Continuación

407índices,284exports,54labs/55workspaces. Inventario89draft_exists/19related_only/
67not_written;completionProvenfalse. No aceptar175fichas por inventario. GapsP026/
P045Stripe/P058soak preservados, más el límite de generación P114 descrito arriba.
Serie02soloDSA. SiguienteP115:arquitecturasRAG,leer ficha yplan antes de implementar.
P112/P113/P114no comiteados;HEAD previos blogc2f71c5/examplescc99f36. No nuevos commits,
push,publicación,traducción oaudio automáticos. Servidor propio 531354 cerrado por astro dev stop (exit 0). No quedan inferencias ni
procesos de QA propios pendientes.
