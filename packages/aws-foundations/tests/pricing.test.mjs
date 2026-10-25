import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { extractRates, selections } from '../scripts/pricing.mjs'

test('precios: diez dimensiones trazables a cinco catálogos AWS, región y USD explícitos', async () => {
  const excerpts = JSON.parse(await readFile('pricing/catalogue-excerpts.json'))
  const pricing = JSON.parse(await readFile('pricing/prices-us-east-1.json'))
  assert.equal(excerpts.sources.length, 5); assert.equal(Object.keys(selections).length, 10)
  assert.deepEqual(extractRates(excerpts), pricing.rates)
  for (const source of excerpts.sources) {
    assert.match(source.url, /^https:\/\/pricing\.us-east-1\.amazonaws\.com\/offers\/v1\.0\/aws\//)
    assert.match(source.versionedUrl, new RegExp(`/${source.version}/us-east-1/index.json$`))
    assert.match(source.rawCatalogueSha256, /^[a-f0-9]{64}$/)
    assert.ok(new Date(source.publicationDate) <= new Date(source.retrievedAt))
  }
  const invalid = structuredClone(excerpts)
  invalid.sources[0].selected[0].dimension.unit = 'milliseconds'
  assert.throws(() => extractRates(invalid))
})
