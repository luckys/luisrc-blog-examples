import {editorialPath} from '../../scripts/editorial-path.mjs'
import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import YAML from "yaml";
import { blogPath } from "../../scripts/blog-path.mjs";

const manifest = JSON.parse(
  await readFile(editorialPath("design-principles-series.json")),
);
const expectedIds = [
  "P043",
  "DESIGN-OCP",
  "DESIGN-LSP",
  "DESIGN-ISP",
  "DESIGN-DIP",
  "DESIGN-SIMPLICITY",
  "DESIGN-DRY",
];
const compact = (text) =>
  text
    .replace(/\s/g, "")
    .replaceAll('"', "'")
    .replaceAll(";", "")
    .replace(/,(?=[)}\]])/g, "");
const posts = await Promise.all(
  manifest.articles.map(async (entry) => ({
    entry,
    source: await readFile(
      blogPath(`src/content/posts/es/${entry.slug}.md`),
      "utf8",
    ),
  })),
);

test("diseño: siete drafts específicos, ordenados y con prerequisitos existentes", async () => {
  assert.deepEqual(
    manifest.articles.map((post) => post.id),
    expectedIds,
  );
  const knownIds = new Set();
  for (const file of await readdir(blogPath("src/content/posts/es"))) {
    const source = await readFile(
      blogPath(`src/content/posts/es/${file}`),
      "utf8",
    );
    knownIds.add(YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]).id);
  }
  let previousDate = -Infinity;
  const seen = new Set();
  for (const { entry, source } of posts) {
    const meta = YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]);
    for (const key of ["id", "title", "slug", "prerequisites"])
      assert.deepEqual(meta[key], entry[key]);
    assert.equal(meta.author, "Luis Ramírez Calle");
    assert.equal(meta.locale, "es");
    assert.equal(meta.draft, true);
    assert.equal(meta.status, "draft");
    assert.equal(meta.series, manifest.name);
    assert.ok(new Date(meta.published).valueOf() > previousDate);
    previousDate = new Date(meta.published).valueOf();
    for (const prerequisite of entry.prerequisites) {
      assert.ok(knownIds.has(prerequisite));
      if (expectedIds.includes(prerequisite)) assert.ok(seen.has(prerequisite));
    }
    seen.add(entry.id);
    for (const heading of [
      "## Código completo y pruebas",
      "## Garantías y límites",
      "## Ejercicio:",
      "## Referencias",
    ])
      assert.ok(source.includes(heading), entry.id);
    assert.doesNotMatch(source, /—/);
    for (const file of entry.files)
      await access(`packages/design-principles/${file}`);
  }
});

test("diseño: todos los extractos ejecutables proceden de los archivos probados", async () => {
  const implementation = compact(
    (
      await Promise.all(
        [
          "src/rates.ts",
          "src/preview.ts",
          "src/presentation.ts",
          "src/application.ts",
          "src/demo.ts",
          "src/eligibility.ts",
          "src/type-examples.ts",
          "tests/rate-contract.mjs",
          "tests/principles.test.mjs",
        ].map((file) => readFile(`packages/design-principles/${file}`, "utf8")),
      )
    ).join("\n"),
  );
  let count = 0;
  for (const { entry, source } of posts) {
    const snippets = [
      ...source.matchAll(/```(typescript|javascript)\n([\s\S]*?)\n```/g),
    ];
    assert.ok(snippets.length >= 1, entry.id);
    for (const [, , snippet] of snippets) {
      assert.ok(
        implementation.includes(compact(snippet)),
        `${entry.id}: fragmento distinto al código probado`,
      );
      count++;
    }
  }
  assert.equal(count, 16);
});

test("diseño: siete diagramas reales con dimensiones y descripción accesible", async () => {
  for (const { entry, source } of posts) {
    const matches = [
      ...source.matchAll(
        /<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g,
      ),
    ];
    assert.equal(matches.length, 1);
    const [, path, alt, width, height] = matches[0];
    assert.ok(alt.length > 80);
    assert.equal(path, `/assets/visuals/design-principles/${entry.id}.svg`);
    const svg = await readFile(blogPath(`public${path}`), "utf8");
    const [, , w, h] = svg
      .match(/viewBox="([^"]+)"/)[1]
      .split(/\s+/)
      .map(Number);
    assert.equal(+width, Math.ceil(w));
    assert.equal(+height, Math.ceil(h));
    await access(blogPath(`assets/design-principles/${entry.id}.d2`));
  }
});

test("diseño: dependencias locales apuntan al contrato, no del caso de uso al adaptador", async () => {
  const app = await readFile(
    "packages/design-principles/src/application.ts",
    "utf8",
  );
  const memory = await readFile(
    "packages/design-principles/src/adapters/memory.ts",
    "utf8",
  );
  const demo = await readFile("packages/design-principles/src/demo.ts", "utf8");
  assert.doesNotMatch(app, /from ['"].*(?:adapters|demo)/);
  assert.match(
    memory,
    /import type \{ QuoteReader, QuoteWriter \} from ['"]\.\.\/application\.ts['"]/,
  );
  assert.match(demo, /from ['"]\.\/adapters\/memory\.ts['"]/);
  assert.match(
    posts.find((post) => post.entry.id === "DESIGN-DIP").source,
    /no completa.*P045/,
  );
  assert.match(
    posts.find((post) => post.entry.id === "DESIGN-DRY").source,
    /plazos son ficticios/,
  );
});
