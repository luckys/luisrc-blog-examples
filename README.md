# luisrc-blog-examples

Monorepo de ejemplos ejecutables de [luisrc.pages.dev](https://luisrc.pages.dev/).
Los artículos viven en [luckys/luisrc](https://github.com/luckys/luisrc); los
laboratorios, fixtures, pruebas y resultados originales se mantienen aquí.
Solo contienen datos ficticios. No son aplicaciones listas para producción.

## Encontrar el código de un post

El [índice por artículo](posts/README.md) relaciona 136 posts con sus archivos y
laboratorios. Cada entrada en `posts/<locale>/<id>/README.md` enlaza las fuentes
correspondientes. Los laboratorios compartidos viven una sola vez en `packages/`:
dividir un tema en varios artículos no duplica su implementación.

Los borradores también aparecen en el índice. Su página del blog no estará
disponible públicamente hasta que se aprueben y publiquen.

## Instalación

Usa **Node.js 24.19.0 o posterior** y **pnpm 12.8.1**. Todas las instalaciones de
dependencias se hacen con pnpm, desde la raíz del monorepo:

```bash
git clone git@github.com:luckys/luisrc-blog-examples.git
cd luisrc-blog-examples
pnpm install --frozen-lockfile
pnpm test
pnpm test:labs
```

Hay un único `pnpm-workspace.yaml` y un único `pnpm-lock.yaml`. No ejecutes
instalaciones independientes en cada laboratorio. `pnpm test` comprueba la
estructura, índices y conservación de fuentes; `pnpm test:labs` ejecuta los tests
locales de Node y Python estándar, sin iniciar Docker ni instalar navegadores.

## Laboratorios

Los comandos de esta tabla parten de la raíz. Consulta siempre el README de cada
laboratorio antes de iniciar servicios o ejecutar pruebas de integración.

| Carpeta                                                                     | Contenido                                               | Prueba o entrada                                                                       |
| --------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [transactions](packages/transactions/README.md)                             | ACID y transacciones, español                           | `pnpm --dir packages/transactions test` (requiere PostgreSQL del lab)                  |
| [transactions-en](packages/transactions-en/README.md)                       | El mismo laboratorio traducido al inglés                | `pnpm --dir packages/transactions-en test` (requiere PostgreSQL del lab)               |
| [database-fundamentals](packages/database-fundamentals/README.md)           | SQL, aislamiento, índices, migraciones, Redis           | `pnpm --dir packages/database-fundamentals test:integration` (requiere Docker Compose) |
| [data-structures-algorithms](packages/data-structures-algorithms/README.md) | Búsquedas, ordenación, árboles y grafos                 | `pnpm --dir packages/data-structures-algorithms test`                                  |
| [reliable-services](packages/reliable-services/README.md)                   | Invariantes, concurrencia, eventos y fallos             | `pnpm --dir packages/reliable-services test`                                           |
| [computing-networks](packages/computing-networks/README.md)                 | Procesos, memoria, HTTP y transporte                    | `pnpm --dir packages/computing-networks test`                                          |
| [realtime-frontend](packages/realtime-frontend/README.md)                   | React, accesibilidad, estado y colaboración             | `pnpm --dir packages/realtime-frontend test`                                           |
| [mathematics-statistics](packages/mathematics-statistics/README.md)         | Probabilidad, álgebra, optimización e inferencia        | `pnpm --dir packages/mathematics-statistics test` (Python 3)                           |
| [machine-learning](packages/machine-learning/README.md)                     | Datos, modelos y evaluación                             | `pnpm --dir packages/machine-learning test:container` (imagen local fijada)            |
| [api-contracts](packages/api-contracts/README.md)                           | HTTP y OpenAPI                                          | `pnpm --dir packages/api-contracts test`                                               |
| [api-validation-errors](packages/api-validation-errors/README.md)           | JSON Schema, Zod y Problem Details                      | `pnpm --dir packages/api-validation-errors test`                                       |
| [api-pagination-evolution](packages/api-pagination-evolution/README.md)     | Cursores, PostgreSQL y compatibilidad                   | `pnpm --dir packages/api-pagination-evolution test`                                    |
| [api-identity](packages/api-identity/README.md)                             | Cookies, OIDC y rotación                                | `pnpm --dir packages/api-identity test` (OpenSSL local)                                |
| [api-authorization](packages/api-authorization/README.md)                   | Tenant, ownership y autorización                        | `pnpm --dir packages/api-authorization test`                                           |
| [browser-security](packages/browser-security/README.md)                     | XSS, CSP, CSRF y CORS                                   | `pnpm --dir packages/browser-security test` (Chromium)                                 |
| [api-threats](packages/api-threats/README.md)                               | Mass assignment, SQL injection, SSRF, cuotas y secretos | `pnpm --dir packages/api-threats test`                                                 |
| [api-integration](packages/api-integration/README.md) | Polling/SSE, GraphQL N+1 y gRPC | `pnpm --dir packages/api-integration test` |

Los tests con Docker, servicios de datos, imágenes científicas o navegador son
opt-in. No se omiten silenciosamente dentro de `test:labs`: ese comando declara
un subconjunto local concreto. No ejecutes los laboratorios vulnerables fuera de
loopback ni les proporciones credenciales, datos o redes de producción.

Para las suites de navegador, instala Chromium explícitamente con pnpm:

```bash
pnpm --filter @luisrc-examples/realtime-frontend exec playwright install chromium
pnpm test:browser
```

## Comprobar coherencia con el blog

No necesitas clonar el blog para ejecutar los laboratorios. La comprobación de
fragmentos de código, diagramas y enlaces sí necesita ambos checkouts:

```bash
BLOG_ROOT=../luisrc-blog pnpm test:editorial
```

`BLOG_ROOT` es explícito: no hay symlinks ni una ruta personal obligatoria. Las
pruebas editoriales anteriores se han trasladado aquí. Las pruebas de archivos
ZIP se sustituyen por comprobaciones de fuentes, destinos GitHub y exportaciones;
ya no se distribuyen ZIPs en el blog.

## Actualizar los visores y gráficas del sitio

El blog conserva sus SVG, visores estáticos y JSON de evidencia para compilar y
funcionar sin este checkout ni llamadas a GitHub en tiempo de ejecución. Esos
recursos son parte de la página, no copias descargables de los laboratorios.
La lista de exportación es explícita en [metadata/blog-exports.json](metadata/blog-exports.json).

Después de modificar una fuente de un visor o recalcular resultados:

```bash
BLOG_ROOT=../luisrc-blog pnpm blog:sync
BLOG_ROOT=../luisrc-blog pnpm test:editorial
```

La sincronización copia únicamente esos recursos y guarda sus SHA-256 en el blog.
Los scripts `render-*.mjs` del blog consumen sus propios JSON editoriales para
regenerar gráficas. Los scripts de experimentos y sincronización de snippets viven
en este repositorio; los `sync-*-snippets.mjs` también requieren `BLOG_ROOT`.
Revisa y comitea los cambios de ambos repositorios cuando cambie un ejemplo.

## Subir el repositorio por primera vez

La rama local es `main` y `origin` apunta a
`git@github.com:luckys/luisrc-blog-examples.git`. Una vez creado el repositorio
**vacío** en la cuenta `luckys`, sin README ni commit inicial adicional:

```bash
git push -u origin main
```

Los enlaces nuevos del blog usan `blob/main`. Hasta crear y subir este repositorio
en GitHub devolverán 404. La migración local no crea el repositorio remoto ni hace push.
