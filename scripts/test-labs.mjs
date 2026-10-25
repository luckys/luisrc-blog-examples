import { spawnSync } from "node:child_process";

// Docker, database integration and browser suites are deliberately opt-in.
// This command never starts containers, pulls images or installs browsers.
const commands = [
  ...[
    "api-threats",
    "api-contracts",
    "api-identity",
    "api-integration",
    "api-pagination-evolution",
    "api-authorization",
    "api-validation-errors",
    "computing-networks",
    "architecture-boundaries",
    "design-principles",
    "distributed-foundations",
    "kafka-streaming",
    "testing-strategy",
    "integration-contracts",
    "property-testing",
    "performance-lab",
    "observability-lab",
    "service-objectives",
    "incident-response",
    "domain-design",
    "data-structures-algorithms",
    "realtime-frontend",
    "reliable-services",
    "mathematics-statistics",
  ].map((lab) => ["--dir", `packages/${lab}`, "test"]),
  [
    "--dir",
    "packages/browser-security",
    "exec",
    "node",
    "--test",
    "tests/http.test.mjs",
  ],
];
let failed = false;
for (const args of commands) {
  console.log(`\npnpm ${args.join(" ")}`);
  const result = spawnSync("pnpm", args, { stdio: "inherit" });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
