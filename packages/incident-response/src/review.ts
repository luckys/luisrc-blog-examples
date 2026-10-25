export type Action = { id: string; owner: string; criterion: string; state: string; proof: string | null }
export function actionHasEvidence(action: Action, proofs: Readonly<Record<string, boolean>>) {
  if (![action.id, action.owner, action.criterion].every((value) => typeof value === 'string' && value.trim().length > 0)) return false
  if (action.state === 'open') return action.proof === null
  return action.state === 'verified_in_fixture' && action.proof !== null && proofs[action.proof] === true
}
export function handoffHasContext(handoff: Record<string, unknown>) {
  return ['scope', 'facts', 'hypotheses', 'changes', 'nextAction', 'acknowledgedBy']
    .every((key) => typeof handoff[key] === 'string' && String(handoff[key]).trim().length > 0)
}
