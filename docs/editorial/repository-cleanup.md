# Organización editorial entre los dos repositorios

El blog contiene artículos, recursos publicados y herramientas propias para
audio/diagramas. Su roadmap principal sigue en docs/roadmap-editorial-ingenieria-paysafe-ia.md.
Los manifiestos, rutas, glosarios, revisiones y scripts por serie viven aquí,
junto a las pruebas y laboratorios que los consumen.

Se trasladaron139documentos y45scripts existentes. No se descartó información
que aún sirve para validar artículos o continuar el roadmap. Se actualizaron los
consumidores, imports y enlaces. Las herramientas nuevas deben seguir esta organización.
El test authoring-layout verifica que no se reintroduzcan en el blog.

```bash
BLOG_ROOT=../luisrc-blog pnpm test:editorial
BLOG_ROOT=../luisrc-blog pnpm blog:tool audit-editorial-roadmap
BLOG_ROOT=../luisrc-blog pnpm blog:tool check-attention-transformer-browser
```

Los comandos browser necesitan un servidor local del blog. Los renderers escriben
assets en BLOG_ROOT. El lanzador exige un nombre conocido dentro de tools/blog;
no acepta rutas arbitrarias. Las librerías de esas herramientas se instalan con
pnpm en este monorepo. Los hashes de recursos exportados permiten validar el blog
sin que tenga instalado este checkout hermano.

Las notas antiguas conservan su contexto histórico. Los comandos anteriores
node scripts/check-… o render-… equivalen ahora a pnpm blog:tool con el mismo
nombre sin extensión. El inventario no prueba aceptación del temario o laboratorio.

Añadir las dependencias editoriales cambió el lockfile. Se renovaron las capturas
Docker dependientes mediante exercise/verify, sus gráficos y exports. No se
reemplazaron hashes de fuentes manualmente para hacer pasar las comprobaciones.
