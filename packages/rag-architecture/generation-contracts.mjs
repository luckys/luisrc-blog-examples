import {createHash} from 'node:crypto';
const hash = text => createHash('sha256').update(text).digest('hex');

export function prepareGenerationDescriptor({row, scenario, tokenizerProfile,
  modelProfile, promptRevision}) {
  if (row.result.status !== 'ready') {
    return {status: 'not_prepared', reason: row.result.status, executed: false};
  }
  if (modelProfile.tokenizerRevision !== tokenizerProfile.revision) {
    throw new Error('Model and context tokenizer revisions do not match');
  }
  if (modelProfile.adapter && modelProfile.adapter.baseRevision !== modelProfile.revision) {
    throw new Error('Adapter declares another base revision');
  }
  if (!row.result.selected.length || !row.result.prompt) throw new Error('Ready context needs evidence');
  if (row.result.inputIds.length + row.reservedOutputTokens > row.windowTokens) {
    throw new Error('Context exceeds its declared work budget');
  }
  const evidence = row.result.selected.map(alias => {
    const source = row.result.registry.find(entry => entry.alias === alias);
    if (!source) throw new Error('Selected alias is not registered');
    return {...source};
  });
  const provenance = {
    model: {...modelProfile},
    tokenizerRevision: tokenizerProfile.revision,
    promptRevision,
    retrievalRevision: scenario.authorizationContext.indexRevision,
    accessRevision: scenario.authorizationContext.accessRevision,
    principalRevision: scenario.principal.authorizationRevision,
    principal: scenario.principal.role,
    tenant: scenario.principal.tenant,
    packingPolicy: row.policy,
    windowTokens: row.windowTokens,
  };
  return {
    status: 'prepared_not_executed', executed: false,
    provenance, evidence,
    inputTokens: row.result.inputIds.length,
    maxNewTokens: row.reservedOutputTokens,
    prompt: row.result.prompt,
    inputIds: [...row.result.inputIds],
    promptHash: hash(row.result.prompt),
    provenanceHash: hash(JSON.stringify(provenance)),
  };
}
