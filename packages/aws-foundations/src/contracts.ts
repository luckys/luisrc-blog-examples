export function catalogueReadPolicy(tableArn: string) {
  if (!/^arn:aws:dynamodb:us-east-1:\d{12}:table\/[a-zA-Z0-9_-]+$/.test(tableArn)) throw Error('table_arn_required')
  return { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: ['dynamodb:GetItem'], Resource: [tableArn] }] }
}

export function documentKey(tenantId: string, documentId: string) {
  for (const value of [tenantId, documentId]) if (!/^[a-z0-9-]{1,40}$/.test(value)) throw Error('invalid_identifier')
  return `tenants/${tenantId}/documents/${documentId}.json`
}

export async function processStandardBatch(records: { messageId: string; body: string }[], process: (body: string) => Promise<void>) {
  const batchItemFailures: { itemIdentifier: string }[] = []
  for (const record of records) {
    try { await process(record.body) }
    catch { batchItemFailures.push({ itemIdentifier: record.messageId }) }
  }
  return { batchItemFailures }
}

export function validatePrivateEcsNetwork(plan: { zones: number; publicTaskIp: boolean; services: string[]; gateways: string[]; externalInternetRequired: boolean }) {
  if (plan.zones !== 2 || plan.publicTaskIp || plan.externalInternetRequired) throw Error('outside_private_design')
  for (const service of ['ecr.api', 'ecr.dkr', 'logs']) if (!plan.services.includes(service)) throw Error(`missing_endpoint:${service}`)
  for (const gateway of ['s3', 'dynamodb']) if (!plan.gateways.includes(gateway)) throw Error(`missing_gateway:${gateway}`)
  return true
}

export function validateQueuePlan(plan: { functionTimeout: number; batchWindow: number; visibilityTimeout: number; partialFailures: boolean }) {
  for (const value of [plan.functionTimeout, plan.batchWindow, plan.visibilityTimeout]) if (!Number.isFinite(value) || value < 0) throw Error('invalid_queue_time')
  if (plan.functionTimeout <= 0 || plan.visibilityTimeout < 6 * plan.functionTimeout + plan.batchWindow || !plan.partialFailures) throw Error('queue_plan_not_accepted')
  return true
}

export function catalogueGetItemInput(id: string) {
  if (!/^[a-z0-9-]{1,40}$/.test(id)) throw Error('invalid_item_id')
  return { TableName: 'catalogue', Key: { id: { S: id } }, ConsistentRead: true }
}

export function reviewManagedDb(plan: { publiclyAccessible: boolean; multiAZ: boolean; backupRetentionDays: number; restoreTested: boolean }) {
  if (plan.publiclyAccessible || !plan.multiAZ || !Number.isInteger(plan.backupRetentionDays)
    || plan.backupRetentionDays < 7 || plan.backupRetentionDays > 35) throw Error('local_db_policy_rejected')
  return { configuredAsRequested: true, restoreDeclaredTested: plan.restoreTested, restoreVerified: false,
    openWork: ['restore_evidence_not_verified'] }
}
