import {editorialPath} from '../../scripts/editorial-path.mjs'
import { blogPath } from "../../scripts/blog-path.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import YAML from "yaml";

const slugs = [
  "modelado-relacional-integridad-datos",
  "aislamiento-mvcc-postgresql",
  "concurrencia-bloqueos-postgresql",
  "sql-joins-null-agregaciones",
  "sql-cte-ventanas-cohortes",
  "normalizacion-desnormalizacion-datos",
  "indices-postgresql-fundamentos",
  "indices-compuestos-parciales-covering",
  "explain-analyze-postgresql",
  "migraciones-base-datos-sin-romper-aplicacion",
  "particionado-retencion-postgresql",
  "redis-cache-consistencia",
  "elegir-sql-nosql-motores-especializados",
];

test("la ampliación tiene trece borradores españoles y recursos locales válidos", async () => {
  const files = await readdir(blogPath("src/content/posts/es"));
  for (const slug of slugs) {
    assert.ok(files.includes(`${slug}.md`), slug);
    const text = await readFile(
      blogPath(`src/content/posts/es/${slug}.md`),
      "utf8",
    );
    const [, header, body] =
      text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
    assert.ok(header, slug);
    const data = YAML.parse(header);
    assert.equal(data.locale, "es");
    assert.equal(data.slug, slug);
    assert.equal(data.draft, true);
    assert.equal(data.series, "Fundamentos de bases de datos");
    assert.ok(data.author);
    assert.ok(body.includes("## Garantías y límites"), slug);
    assert.ok(body.includes("## Ejercicio"), slug);
    assert.ok(body.includes("## Referencias"), slug);
    assert.ok(
      !body.includes("```mermaid"),
      "los diagramas deben estar renderizados",
    );
    assert.ok(body.includes("<img "), slug);
    for (const [, path] of body.matchAll(
      /(?:src="|\]\()\/assets\/([^"\s)]+)/g,
    )) {
      await access(blogPath(`public/assets/${path}`));
    }
    for (const [, target] of body.matchAll(/\]\(\/posts\/([^\s)#]+)/g)) {
      assert.ok(files.includes(`${target}.md`), `${slug}: enlace a ${target}`);
    }
  }
});

test("cada bloque SQL identificado coincide con el archivo descargable", async () => {
  for (const slug of slugs) {
    const text = await readFile(
      blogPath(`src/content/posts/es/${slug}.md`),
      "utf8",
    );
    for (const [, path, code] of text.matchAll(
      /Archivo: `database-fundamentals\/(sql\/[^`]+)`\.\n\n```sql\n([\s\S]*?)\n```/g,
    )) {
      const file = await readFile(
        `packages/database-fundamentals/${path}`,
        "utf8",
      );
      assert.equal(code.trim(), file.trim(), `${slug}: ${path}`);
    }
  }
});

test("el inventario mantiene orden de lectura y prerrequisitos sin ciclos", async () => {
  const manifest = YAML.parse(
    await readFile(
      editorialPath("database-fundamentals.yaml"),
      "utf8",
    ),
  );
  assert.equal(manifest.articles.length, 15);
  const seen = new Set();
  let lastDate = -Infinity;
  for (const entry of manifest.articles) {
    const text = await readFile(blogPath(entry.path), "utf8");
    const header = YAML.parse(text.match(/^---\n([\s\S]*?)\n---/)[1]);
    assert.equal(header.id, entry.id);
    assert.ok(!seen.has(entry.id));
    for (const prerequisite of header.prerequisites ?? []) {
      assert.ok(
        seen.has(prerequisite),
        `${entry.id} depende de ${prerequisite} antes de introducirlo`,
      );
    }
    const date = new Date(header.published).valueOf();
    assert.ok(date > lastDate, entry.id);
    lastDate = date;
    seen.add(entry.id);
  }
});
