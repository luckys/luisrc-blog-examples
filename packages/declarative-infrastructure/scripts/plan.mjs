const addresses = new Set([
  'kubernetes_namespace_v1.lab',
  ...['kubernetes_config_map_v1.settings', 'kubernetes_secret_v1.example', 'kubernetes_deployment_v1.api', 'kubernetes_service_v1.api', 'kubernetes_ingress_v1.api'].map((name) => 'module.catalogue.' + name),
])
export function summarizePlan(plan) {
  const changes = (plan.resource_changes ?? []).filter((r) => r.change.actions.some((a) => a !== 'no-op' && a !== 'read'))
    .map((r) => ({ address: r.address, actions: r.change.actions })).sort((a, b) => a.address.localeCompare(b.address))
  const counts = Object.fromEntries(['create', 'update', 'delete'].map((action) => [action, changes.filter((r) => r.actions.includes(action)).length]))
  counts.replace = changes.filter((r) => r.actions.includes('create') && r.actions.includes('delete')).length
  return { counts, changes }
}
export function assertPlanScope(summary, { destroy = false } = {}) {
  for (const change of summary.changes) {
    if (!addresses.has(change.address)) throw Error('resource_outside_lab')
    if (change.address === 'kubernetes_namespace_v1.lab' && change.actions.includes('delete') && !destroy) throw Error('namespace_destroy_not_allowed')
  }
  return true
}
