import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { saveCheckpoint } from '../src/journal.ts'
test('journal: un checkpoint parcial conserva hechos sin presentarse como informe completo', async () => {
  const folder = await mkdtemp('/tmp/incident-journal.')
  const target = pathToFileURL(folder + '/checkpoint.json')
  const events = [{ seq: 1, id: 'queued', facts: { queued: 3 } }]
  await saveCheckpoint(target, events)
  const saved = JSON.parse(await readFile(target))
  assert.equal(saved.kind, 'checkpoint_not_final_report')
  assert.deepEqual(saved.events, events)
})
