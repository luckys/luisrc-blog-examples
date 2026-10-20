import { blogPath } from "../../scripts/blog-path.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import YAML from "yaml";

const manifest = JSON.parse(
  await readFile(blogPath("docs/editorial/api-contracts-series.json"), "utf8"),
);
const entries = manifest.articles.filter((entry) => entry.roadmapId === "P029");

test("navegador: cuatro temas específicos, drafts españoles, extractos reales y diagramas", async () => {
  assert.deepEqual(
    entries.map((entry) => entry.id),
    ["P029", "API-BROWSER-CSP", "API-BROWSER-CSRF", "API-BROWSER-CORS"],
  );
  const code = (
    await Promise.all(
      ["lab.mjs", "render.mjs"].map((file) =>
        readFile(`packages/browser-security/${file}`, "utf8"),
      ),
    )
  )
    .join("\n")
    .replace(/\s/g, "");
  let snippets = 0;
  for (const entry of entries) {
    const text = await readFile(
      blogPath(`src/content/posts/es/${entry.slug}.md`),
      "utf8",
    );
    const meta = YAML.parse(text.match(/^---\n([\s\S]*?)\n---/)[1]);
    for (const key of ["id", "title", "slug", "prerequisites"])
      assert.deepEqual(meta[key], entry[key]);
    assert.equal(meta.locale, "es");
    assert.equal(meta.draft, true);
    assert.equal(meta.status, "draft");
    assert.equal(meta.author, "Luis Ramírez Calle");
    assert.equal(meta.series, manifest.name);
    assert.ok(!text.includes("—"));
    for (const heading of ["Garantías y límites", "Ejercicio:", "Referencias"])
      assert.ok(text.includes(`## ${heading}`), entry.id);
    assert.ok(
      text.includes(
        "https://github.com/luckys/luisrc-blog-examples/blob/main/packages/browser-security/",
      ),
    );
    for (const [, snippet] of text.matchAll(
      /```javascript\n([\s\S]*?)\n```/g,
    )) {
      assert.ok(code.includes(snippet.replace(/\s/g, "")), snippet);
      snippets++;
    }
    for (const [, slug] of text.matchAll(
      /\]\(\/posts\/([^/)#]+)(?:#[^)]*)?\)/g,
    ))
      await readFile(blogPath(`src/content/posts/es/${slug}.md`));
    const images = [
      ...text.matchAll(
        /<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g,
      ),
    ];
    assert.equal(images.length, 1);
    for (const [, asset, alt, width, height] of images) {
      assert.ok(alt.length > 80);
      const svg = await readFile(blogPath(`public${asset}`), "utf8");
      const [, , w, h] = svg
        .match(/viewBox="([^"]+)"/)[1]
        .split(/\s+/)
        .map(Number);
      assert.equal(+width, Math.ceil(w));
      assert.equal(+height, Math.ceil(h));
      await readFile(blogPath(`assets/api-contracts/${entry.id}.d2`));
    }
  }
  assert.equal(snippets, 3);
});
