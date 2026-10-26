# Trabajo editorial

Manifiestos, rutas de lectura, glosarios y revisiones de las series. Son material
de autoría y validación, no contenido que deba desplegar el blog. Se trasladaron
desde luisrc-blog conservando sus criterios y evidencia.

El roadmap principal sigue en luisrc-blog/docs/roadmap-editorial-ingenieria-paysafe-ia.md.
El estado de continuación se conserva en [roadmap-continuation.md](roadmap-continuation.md).
Las notas anteriores describen entregas históricas; el inventario no certifica aceptación.

Desde la raíz de este monorepo:

```bash
BLOG_ROOT=../luisrc-blog pnpm test:editorial
BLOG_ROOT=../luisrc-blog pnpm blog:tool audit-editorial-roadmap
BLOG_ROOT=../luisrc-blog pnpm blog:tool check-recurrent-sequences-browser
```

Los scripts de tools/blog leen contenido, fuentes D2 y recursos del checkout
BLOG_ROOT, y su configuración editorial de esta carpeta. Los checks de navegador
necesitan el dev server local del blog y Chromium instalado; no arrancan ese servidor.
Los renderers escriben las figuras en el checkout indicado. Conservan sus versiones
fijadas de D2, ECharts y Playwright. Los comandos antiguos que mencionan scripts/
en informes históricos deben ejecutarse con blog:tool y el mismo nombre sin .mjs.
