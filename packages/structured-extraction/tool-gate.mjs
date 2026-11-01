// validateArguments is trusted application wiring, never supplied by the model.
export async function acceptToolProposal(proposal, context, validateArguments) {
  if (!context.canSubmit) throw Error('Action not authorized');
  if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) {
    throw Error('Invalid tool proposal');
  }
  const keys = Object.keys(proposal).toSorted();
  if (keys.join(',') !== 'arguments,name' || proposal.name !== 'submit_entities') {
    throw Error('Tool is not allowed');
  }
  if (typeof proposal.arguments !== 'string') throw Error('Raw arguments required');
  const checked = await validateArguments(proposal.arguments, context.source);
  if (!checked.accepted) throw Error('Arguments rejected: ' + checked.stage);
  // Return a draft; persistence or external actions require their own policy.
  return {sourceId: context.sourceId, entities: checked.data.entities};
}
