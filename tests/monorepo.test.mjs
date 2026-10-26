import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import YAML from "yaml";

const posts = JSON.parse(await readFile("posts/index.json", "utf8"));
const exports = JSON.parse(
  await readFile("metadata/blog-exports.json", "utf8"),
);

test("workspace: los cuarenta y tres laboratorios tienen nombres únicos y un único lockfile", async () => {
  const workspace = YAML.parse(await readFile("pnpm-workspace.yaml", "utf8"));
  assert.deepEqual(workspace.packages, ["packages/*"]);
  const lock = YAML.parseAllDocuments(await readFile("pnpm-lock.yaml", "utf8"))
    .map((doc) => doc.toJS())
    .find((doc) => doc?.importers?.["packages/realtime-frontend"]);
  assert.ok(lock);
  const labs = await readdir("packages");
  assert.deepEqual(labs.toSorted(), [
    "api-authorization",
    "api-contracts",
    "api-identity",
    "api-integration",
    "api-pagination-evolution",
    "api-threats",
    "api-validation-errors",
    "architecture-boundaries",
    "attention-transformer",
    "autodiff-foundations",
    "aws-foundations",
    "browser-security",
    "capacity-costs",
    "computing-networks",
    "container-environments",
    "convolutional-networks",
    "data-structures-algorithms",
    "database-fundamentals",
    "declarative-infrastructure",
    "design-principles",
    "distributed-foundations",
    "domain-design",
    "generalization-stability",
    "incident-response",
    "integration-contracts",
    "kafka-streaming",
    "kubernetes-workloads",
    "machine-learning",
    "mathematics-statistics",
    "neural-foundations",
    "observability-lab",
    "performance-lab",
    "progressive-delivery",
    "property-testing",
    "pytorch-training",
    "realtime-frontend",
    "recurrent-sequences",
    "reliable-services",
    "service-objectives",
    "testing-strategy",
    "training-dynamics",
    "transactions",
    "transactions-en",
  ]);
  const names = new Set();
  for (const lab of labs) {
    const pkg = JSON.parse(
      await readFile(`packages/${lab}/package.json`, "utf8"),
    );
    assert.ok(!names.has(pkg.name), pkg.name);
    names.add(pkg.name);
    assert.equal(pkg.private, true);
    const dependencies = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies };
    // pnpm12 omits newly added workspaces with no dependencies from importers.
    // Packages with dependencies must still have a lockfile entry.
    if (Object.keys(dependencies).length) assert.ok(lock.importers[`packages/${lab}`], lab);
    await assert.rejects(access(`packages/${lab}/pnpm-lock.yaml`), {
      code: "ENOENT",
    });
    await assert.rejects(access(`packages/${lab}/pnpm-workspace.yaml`), {
      code: "ENOENT",
    });
  }
});

test("artículos: todos los índices enlazan archivos reales dentro del monorepo", async () => {
  assert.equal(posts.length, 319);
  const unique = new Set();
  for (const post of posts) {
    const id = `${post.locale}/${post.slug}`;
    assert.ok(!unique.has(id), id);
    unique.add(id);
    assert.match(post.directory, /^(es|en)\/[a-z0-9-]+$/);
    const index = await readFile(`posts/${post.directory}/README.md`, "utf8");
    assert.ok(index.includes(post.title));
    for (const file of post.files) {
      assert.ok(file.startsWith("packages/"));
      assert.ok(!file.split("/").includes(".."));
      await access(file);
      assert.ok(index.includes(`../../../${file}`));
    }
    for (const [, href] of index.matchAll(/\]\(([^)]+)\)/g)) {
      if (/^https:/.test(href)) continue;
      const local = resolve(`posts/${post.directory}`, href);
      assert.ok(!relative(resolve("."), local).startsWith(".."));
      await access(local);
    }
  }
});

test("migración: las fuentes ejecutables originales se conservan byte a byte", async () => {
  const migration = JSON.parse(
    await readFile("metadata/migration-source.json", "utf8"),
  );
  assert.equal(migration.source, "luckys/luisrc");
  assert.ok(migration.files.length > 240);
  let checked = 0;
  for (const file of migration.files) {
    // Workspace metadata and explanatory paths change; executable sources do not.
    if (
      /(?:^|\/)(?:README\.md|package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)$/.test(
        file.path,
      )
    )
      continue;
    const [oldFolder, ...rest] = file.path.split("/");
    const folder = migration.packageFolders[oldFolder];
    assert.ok(folder);
    assert.equal(
      createHash("sha256")
        .update(await readFile(`packages/${folder}/${rest.join("/")}`))
        .digest("hex"),
      file.sha256,
      file.path,
    );
    checked++;
  }
  assert.ok(checked > 200);
});

test("exportación: solo recursos estáticos explícitos, sin servidores, secretos o dependencias", async () => {
  assert.equal(exports.length, 159);
  const destinations = new Set();
  for (const entry of exports) {
    assert.ok(!destinations.has(entry.destination));
    destinations.add(entry.destination);
    assert.match(entry.source, /^packages\/[a-z0-9-]+\//);
    assert.match(
      entry.destination,
      /^(?:public\/assets\/interactive|assets\/evidence)\//,
    );
    assert.doesNotMatch(
      entry.source,
      /(?:node_modules|\.env|\.pem|\.key|\.sqlite|server\.mjs|lab\.mjs|credentials\.mjs)/,
    );
    await access(entry.source);
  }
});
