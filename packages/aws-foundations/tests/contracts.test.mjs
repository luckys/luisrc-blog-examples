import test from 'node:test'
import assert from 'node:assert/strict'
import { catalogueReadPolicy, documentKey, processStandardBatch, validatePrivateEcsNetwork, validateQueuePlan, catalogueGetItemInput, reviewManagedDb } from '../src/contracts.ts'

test('IAM: política de lectura acotada; no finge evaluar el motor de permisos AWS', () => {
  const arn = 'arn:aws:dynamodb:us-east-1:000000000000:table/catalogue'
  assert.deepEqual(catalogueReadPolicy(arn).Statement, [{ Effect: 'Allow', Action: ['dynamodb:GetItem'], Resource: [arn] }])
  for (const value of ['*', arn + '/*', 'arn:aws:s3:::catalogue']) assert.throws(() => catalogueReadPolicy(value))
})

test('S3: keys explícitas; un prefijo no sustituye autorización de tenant', () => {
  assert.equal(documentKey('tenant-a', 'report-1'), 'tenants/tenant-a/documents/report-1.json')
  for (const value of ['', '../other', 'a/b', 'A', 'a'.repeat(41)]) assert.throws(() => documentKey(value, 'doc'))
})

test('SQS Standard: reporta solo el ID fallido y permite continuar el resto del batch', async () => {
  const processed = []
  const response = await processStandardBatch([{ messageId: 'a', body: 'ok' }, { messageId: 'b', body: 'fail' }, { messageId: 'c', body: 'also-ok' }], async (body) => {
    if (body === 'fail') throw Error('transient'); processed.push(body)
  })
  assert.deepEqual(processed, ['ok', 'also-ok']); assert.deepEqual(response, { batchItemFailures: [{ itemIdentifier: 'b' }] })
})

test('red privada: no borra endpoints ni exige internet exterior sin ruta prevista', () => {
  const plan = { zones: 2, publicTaskIp: false, services: ['ecr.api', 'ecr.dkr', 'logs'], gateways: ['s3', 'dynamodb'], externalInternetRequired: false }
  assert.equal(validatePrivateEcsNetwork(plan), true)
  assert.throws(() => validatePrivateEcsNetwork({ ...plan, services: ['ecr.dkr', 'logs'] }))
  assert.throws(() => validatePrivateEcsNetwork({ ...plan, gateways: ['dynamodb'] }))
  assert.throws(() => validatePrivateEcsNetwork({ ...plan, externalInternetRequired: true }))
})

test('SQS: preflight de visibilidad incluye timeout y batch window, no una prueba del servicio', () => {
  const plan = { functionTimeout: 10, batchWindow: 5, visibilityTimeout: 90, partialFailures: true }
  assert.equal(validateQueuePlan(plan), true)
  assert.throws(() => validateQueuePlan({ ...plan, visibilityTimeout: 60 }))
  assert.throws(() => validateQueuePlan({ ...plan, partialFailures: false }))
})

test('DynamoDB: GetItem usa la primary key y lectura fuerte de tabla, no Scan', () => {
  assert.deepEqual(catalogueGetItemInput('book-1'), { TableName: 'catalogue', Key: { id: { S: 'book-1' } }, ConsistentRead: true })
  assert.throws(() => catalogueGetItemInput('book/other'))
})

test('managed DB: configuración aceptada no marca una restauración inexistente como probada', () => {
  const plan = { publiclyAccessible: false, multiAZ: true, backupRetentionDays: 7, restoreTested: false }
  assert.deepEqual(reviewManagedDb(plan), { configuredAsRequested: true, restoreDeclaredTested: false, restoreVerified: false, openWork: ['restore_evidence_not_verified'] })
  assert.equal(reviewManagedDb({ ...plan, restoreTested: true }).restoreVerified, false)
  assert.throws(() => reviewManagedDb({ ...plan, backupRetentionDays: 1 }))
  assert.throws(() => reviewManagedDb({ ...plan, publiclyAccessible: true }))
})
