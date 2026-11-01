# Structured extraction: P110 en siete drafts

Laboratorio de extracción de entidades con inferencia local real y validación
determinista. La serie explica roles, few-shot, schema, evidencia, herramientas, entradas
adversariales y evaluación. El roadmap completo sigue abierto. Español, drafts
e independencia de PaySafe.

## Qué existe

- Ocho documentos sintéticos originales, con doce entidades esperadas y dos negativos.
- Tres variantes fijadas antes de inferencia: instrucciones, schema y few-shot.
- 24 respuestas greedy de Qwen2.5-0.5B-Instruct convertido a ONNX, q4, CPU.
- Captura `2026-10-29T17:35:10.874Z`, mensajes, chat serializado, IDs y respuestas sin reparación.
- Contrato Pydantic estricto, JSON Schema generado y comprobaciones literales de cita.
- 18 fixtures de validación y tres tests del límite de propuestas de herramientas.

Modelo público `onnx-community/Qwen2.5-0.5B-Instruct`, revisión
`22942cb7d7ba4cc81bb4673549ca4d4614469b5e`. El fetch contrasta el SHA-256 del
ONNX q4 con el objeto LFS fijado. Pesos solo en `.cache/`, ignorados por Git.
Instalaciones JS con pnpm. No se instala Python con pip.

## Preparar y comprobar

Desde la raíz del monorepo, Node 24.19 o posterior y Docker:

```sh
pnpm install --frozen-lockfile
docker pull --platform linux/amd64 quay.io/jupyter/pytorch-notebook@sha256:7d0701eb4492de8facbb90845c7d4d4dd9da84d3f72e321f5f7be1962047ad11
pnpm --filter @luisrc-examples/structured-extraction test
pnpm --filter @luisrc-examples/structured-extraction test:container
```

Los tests Python se ejecutan con red desactivada, filesystem y bind readonly,
user 1000:100, dos CPU y 2 GiB. El runtime incluye Python 3.13.17, Pydantic 2.14.1
y jsonschema 4.26.0. No hay descarga implícita en los tests.

## Capturas y comandos que las reemplazan

`model:fetch` descarga y verifica el snapshot público; no hace inferencia.
`exercise` ejecuta las 24 peticiones y **reemplaza** `results/generations.json`.
`validate` recalcula y **reemplaza** `results/validation.json` a partir de la captura.
`node run-python.mjs fixtures` recalcula los 18 controles. `schema` regenera el
schema desde el modelo Pydantic. No repetir generación para buscar mejores ejemplos.

## Resultado conservado

| Variante | Parsing rechazado | Evidencia rechazada | Aceptadas | TP / FP / FN efectivos |
| --- | ---: | ---: | ---: | --- |
| instructions | 6 | 1 | 1 | 0 / 1 / 12 |
| schema | 5 | 3 | 0 | 0 / 0 / 12 |
| few-shot | 0 | 0 | 8 | 2 / 2 / 10 |

Los gates se cuentan por **primer fallo**. Cero rechazos en schema no implica
que el contenido de las respuestas rechazadas antes estuviera bien estructurado.
No se quitan fences Markdown ni se reparan llaves. Las salidas rechazadas aportan
cero predicciones a la evaluación efectiva y pueden producir falsos negativos.

Few-shot mejora el formato observado pero omite muchas entidades. En E04 invierte
PER/ORG para Alba y Tomás; ambas citas existen y pasan el control literal. En E03
instructions devuelve «Hoy Inés Vidal», que aparece en el documento pero no coincide
con el nombre esperado. No confundir anclaje literal con exactitud semántica.

Datos y juicios son del autor, conocidos antes de probar: no test ciego, benchmark
general ni estimación de seguridad o comparación representativa de modelos. No
constrained decoding: el schema se envía como texto y luego se valida la respuesta.

`tool-gate.mjs` comprueba una propuesta fija, autorización local y argumentos con
un validador suministrado por la aplicación. Devuelve un draft sin persistir ni
ejecutar efectos externos. Sus tests usan validadores controlados; no se ha medido
tool-calling del modelo ni la seguridad de una integración externa.

## Verificar sin reemplazar evidencia

```sh
pnpm --filter @luisrc-examples/structured-extraction verify
```

Comprueba hashes, mensajes, las 24 combinaciones y métricas. Revalida los 18 controles,
las respuestas y el schema mediante Python en Docker readonly y compara en memoria.
No repite inferencia. Requiere la imagen indicada arriba ya descargada.

`dependency-lock.capture.json` conserva los bytes del root lock al generar, con su
hash original. Es evidencia histórica, no otro lock activo ni un archivo para instalar.
Cambiar una fuente congelada invalida su captura: conservar/versionar ambas antes
si se pretende ejecutar otra configuración.

## Figuras y visor

`node packages/structured-extraction/render.mjs`, desde la raíz del monorepo,
reconstruye `viewer-data.json` y tres SVG a partir de los resultados existentes.
No usa el modelo. `explorer.html` distingue respuestas reales, controles manuales
y métricas sobre selecciones. Su gráfica de TP/FP/FN cambia con el subset; mantiene
una escala común. Las otras figuras describen la muestra completa.

El navegador no ejecuta Pydantic ni ONNX. Reproduce datos sintéticos guardados.
El laboratorio completo permanece aquí; el blog recibe solo los siete recursos
estáticos declarados en metadata/blog-exports.json. No pesos, caches ni runtimes.

Ruta editorial: [siete entregas](../../docs/editorial/ruta-structured-outputs.md).
QA y límites: [revisión](../../docs/editorial/structured-extraction-review.md).
No publicar, traducir, generar audio o hacer commits automáticamente.
