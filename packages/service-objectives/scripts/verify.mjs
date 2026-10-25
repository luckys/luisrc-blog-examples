import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { sourceHashes } from './hashes.mjs'
import { buildReport } from '../src/report.ts'
import * as browser from '../model.mjs'
const evidence = JSON.parse(await readFile(new URL('../evidence/simulation.json', import.meta.url)))
assert.equal(evidence.simulation, true)
assert.deepEqual(await sourceHashes(), evidence.sources)
assert.deepEqual(buildReport(), evidence.report)
for (const scenario of browser.scenarios) {
  const index = new browser.WindowIndex(browser.expand(scenario))
  assert.deepEqual(browser.evaluateAlerts(index, 43200, 999000), evidence.report.scenarios.find((s) => s.id === scenario.id).alerts)
}
console.log('Hashes, simulación archivada y modelo de navegador coinciden')
