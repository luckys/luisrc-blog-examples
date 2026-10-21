import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import YAML from "yaml";
import { blogPath } from "../../scripts/blog-path.mjs";

const manifest = JSON.parse(
  await readFile(
    blogPath("docs/editorial/architecture-boundaries-series.json"),
  ),
);
const ids = ["P045", "ARCH-LAYERS", "ARCH-OWNERSHIP", "ARCH-CQRS", "P046"];
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

test("arquitectura: cinco drafts, temas separados y prerrequisitos anteriores", async () => {
  assert.deepEqual(
    manifest.articles.map((post) => post.id),
    ids,
  );
  const known = new Set();
  for (const file of await readdir(blogPath("src/content/posts/es"))) {
    const source = await readFile(
      blogPath(`src/content/posts/es/${file}`),
      "utf8",
    );
    known.add(YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]).id);
  }
  const seen = new Set();
  let date = -Infinity;
  for (const { entry, source } of posts) {
    const meta = YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]);
    for (const key of ["id", "title", "slug", "prerequisites"])
      assert.deepEqual(meta[key], entry[key]);
    assert.equal(meta.author, "Luis Ramírez Calle");
    assert.equal(meta.series, manifest.name);
    assert.equal(meta.draft, true);
    assert.equal(meta.status, "draft");
    assert.equal(meta.locale, "es");
    assert.ok(new Date(meta.published).valueOf() > date);
    date = new Date(meta.published).valueOf();
    for (const prerequisite of entry.prerequisites) {
      assert.ok(known.has(prerequisite));
      if (ids.includes(prerequisite)) assert.ok(seen.has(prerequisite));
    }
    seen.add(entry.id);
    assert.doesNotMatch(source, /—/);
    for (const heading of [
      "## Código completo y pruebas",
      "## Garantías y límites",
      "## Ejercicio:",
      "## Referencias",
    ])
      assert.ok(source.includes(heading), entry.id);
    for (const file of entry.files)
      await access(`packages/architecture-boundaries/${file}`);
  }
});

test("arquitectura: extractos de código y ADR coinciden con las fuentes canónicas", async () => {
  const implementation = compact(
    (
      await Promise.all(
        [
          "src/modules/shipping/domain.ts",
          "src/modules/shipping/ports.ts",
          "src/modules/shipping/application.ts",
          "src/modules/reporting/public.ts",
          "src/adapters/ledger.ts",
          "src/adapters/http-provider.ts",
          "tests/application.test.mjs",
          "tests/boundaries.test.mjs",
        ].map((file) =>
          readFile(`packages/architecture-boundaries/${file}`, "utf8"),
        ),
      )
    ).join("\n"),
  );
  const adr = await readFile(
    "packages/architecture-boundaries/docs/decisions/0001-single-deployment.md",
    "utf8",
  );
  let count = 0;
  let docs = 0;
  for (const { entry, source } of posts) {
    for (const [, language, snippet] of source.matchAll(
      /```(typescript|javascript|markdown)\n([\s\S]*?)\n```/g,
    )) {
      if (language === "markdown") {
        assert.ok(adr.includes(snippet));
        docs++;
      } else {
        assert.ok(
          implementation.includes(compact(snippet)),
          `${entry.id}: snippet no coincide`,
        );
        count++;
      }
    }
  }
  assert.equal(count, 10);
  assert.equal(docs, 1);
});

test("arquitectura: cinco SVG con alt y dimensiones reales, fuentes D2 presentes", async () => {
  for (const { entry, source } of posts) {
    const images = [
      ...source.matchAll(
        /<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g,
      ),
    ];
    assert.equal(images.length, 1);
    const [, path, alt, width, height] = images[0];
    assert.equal(
      path,
      `/assets/visuals/architecture-boundaries/${entry.id}.svg`,
    );
    assert.ok(alt.length > 80);
    const svg = await readFile(blogPath(`public${path}`), "utf8");
    const [, , w, h] = svg
      .match(/viewBox="([^"]+)"/)[1]
      .split(/\s+/)
      .map(Number);
    assert.equal(+width, Math.ceil(w));
    assert.equal(+height, Math.ceil(h));
    await access(blogPath(`assets/architecture-boundaries/${entry.id}.d2`));
  }
});

test("arquitectura: mantiene explícitos proveedor ficticio, volatilidad y elección conceptual", () => {
  const byId = new Map(posts.map(({ entry, source }) => [entry.id, source]));
  assert.match(byId.get("P046"), /role="region" aria-label="Comparación de costes[^\n]+tabindex="0"/);
  assert.match(byId.get("P045"), /no cumple la parte de P045.*Stripe sandbox/);
  assert.match(
    byId.get("ARCH-LAYERS"),
    /No es un sandbox ni una prueba de pureza/,
  );
  assert.match(
    byId.get("ARCH-CQRS"),
    /Sin ejecutar la entrega manual, no se actualiza sola/,
  );
  assert.match(
    byId.get("P046"),
    /No hay despliegues independientes, medición de capacidad/,
  );
});
