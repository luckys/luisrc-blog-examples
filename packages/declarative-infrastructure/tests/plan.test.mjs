import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizePlan, assertPlanScope } from '../scripts/plan.mjs'
const resource = (address, actions) => ({ address, change: { actions } })
test('plan: separa create/update/delete y reemplazos sin publicar before/after sensibles', () => {
  const result = summarizePlan({ resource_changes: [resource('module.catalogue.kubernetes_config_map_v1.settings', ['create', 'delete']), resource('module.catalogue.kubernetes_deployment_v1.api', ['update']), { ...resource('module.catalogue.kubernetes_secret_v1.example', ['no-op']), change: { actions: ['no-op'], after: { data: 'never-export-this' } } }] })
  assert.deepEqual(result.counts, { create: 1, update: 1, delete: 1, replace: 1 })
  assert.equal(result.changes.length, 2)
  assert.ok(!JSON.stringify(result).includes('never-export-this'))
})
test('scope: no aplica direcciones ajenas ni destruye namespace fuera del teardown', () => {
  const allowed = summarizePlan({ resource_changes: [resource('module.catalogue.kubernetes_config_map_v1.settings', ['update'])] })
  assert.equal(assertPlanScope(allowed), true)
  const destroy = summarizePlan({ resource_changes: [resource('kubernetes_namespace_v1.lab', ['delete'])] })
  assert.throws(() => assertPlanScope(destroy))
  assert.equal(assertPlanScope(destroy, { destroy: true }), true)
  assert.throws(() => assertPlanScope(summarizePlan({ resource_changes: [resource('aws_instance.unrelated', ['create'])] })))
})
