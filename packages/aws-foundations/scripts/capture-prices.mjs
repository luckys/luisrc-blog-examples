import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { selections, extractRates } from './pricing.mjs'
const sources = []
for (const service of [...new Set(Object.values(selections).map((s) => s[0]))]) {
  const url = `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/${service}/current/us-east-1/index.json`
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw Error(`pricing_http:${service}:${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length > 5000000) throw Error('unexpected_catalogue_size')
  const data = JSON.parse(bytes.toString('utf8'))
  const selected = []
  for (const [wantedService, sku, code] of Object.values(selections)) {
    if (wantedService !== service) continue
    const product = data.products[sku]
    const term = Object.values(data.terms.OnDemand[sku]).find((term) => term.priceDimensions[code])
    if (!product || !term) throw Error(`missing_pricing_term:${code}`)
    selected.push({ product, effectiveDate: term.effectiveDate, offerTermCode: term.offerTermCode, dimension: term.priceDimensions[code] })
  }
  sources.push({ service, url, versionedUrl: url.replace('/current/', `/${data.version}/`),
    retrievedAt: new Date().toISOString(), publicationDate: data.publicationDate, version: data.version,
    rawCatalogueSha256: createHash('sha256').update(bytes).digest('hex'), selected })
}
const excerpts = { currency: 'USD', region: 'us-east-1', sources }
const rates = extractRates(excerpts)
await mkdir('pricing', { recursive: true })
await writeFile('pricing/catalogue-excerpts.json', JSON.stringify(excerpts, null, 2) + '\n')
await writeFile('pricing/prices-us-east-1.json', JSON.stringify({ capturedAt: new Date().toISOString(), currency: 'USD',
  region: 'us-east-1', mode: 'on_demand_linux_x86_event_functions', rates,
  exclusions: ['free_tier', 'credits', 'taxes', 'savings_plans', 'spot', 'database', 'logs_ingestion_and_storage',
    'internet_data_transfer', 'cross_az_data', 'storage', 's3_sqs_workloads', 'engineering_time', 'failover_capacity_validation'] }, null, 2) + '\n')
console.log(`Diez tarifas archivadas desde ${sources.length} catálogos públicos AWS; no se crearon recursos.`)
