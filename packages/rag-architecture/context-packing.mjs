import {createHash} from 'node:crypto';
const digest = value => createHash('sha256').update(value).digest('hex');

export function encodeContextData(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e');
}

export function contextMessages({system, question, history, selected}) {
  return [
    {role: 'system', content: system},
    ...history.flatMap(pair => [
      {role: 'user', content: encodeContextData({historical_user_text: pair.user})},
      {role: 'assistant', content: encodeContextData({historical_assistant_text: pair.assistant})},
    ]),
    {role: 'user', content: encodeContextData({question,
      evidence: selected.map(source => ({alias: source.alias, text: source.text}))})},
  ];
}

export function packContext({scenario, system, windowTokens, reservedOutputTokens,
  maxSources, policy}, measure) {
  if (!Number.isInteger(windowTokens) || !Number.isInteger(reservedOutputTokens) ||
      reservedOutputTokens < 1 || windowTokens <= reservedOutputTokens ||
      !Number.isInteger(maxSources) || maxSources < 1 || maxSources > 8) {
    throw new Error('Invalid context budget');
  }
  if (!['history_first', 'evidence_first'].includes(policy)) throw new Error('Unknown packing policy');
  const scope = scenario.principal;
  const rejected = !scope || typeof scope.tenant !== 'string' || ![0, 1].includes(scope.maxLevel) ||
    scenario.sources.some(source => source.tenant !== scope.tenant ||
      ![0, 1].includes(source.accessLevel) || source.accessLevel > scope.maxLevel);
  if (rejected) return {status: 'rejected_scope', prompt: null, inputIds: [], selected: [],
    historyIds: [], registry: [], trials: [], inputBudget: windowTokens - reservedOutputTokens};
  if (typeof scenario.question !== 'string' || typeof system !== 'string' ||
      scenario.history.some(pair => typeof pair.user !== 'string' || typeof pair.assistant !== 'string')) {
    throw new Error('Invalid question or paired history');
  }
  const sources = scenario.sources.map((source, index) => {
    if (typeof source.text !== 'string' || typeof source.id !== 'string' ||
        !Number.isInteger(source.revision) || source.revision < 1) throw new Error('Invalid source');
    return {...source, alias: 'S' + String(index + 1).padStart(2, '0')};
  });
  const registry = sources.map(source => ({alias: source.alias, id: source.id,
    generation: source.generation, revision: source.revision, contentHash: digest(source.text)}));
  const inputBudget = windowTokens - reservedOutputTokens;
  const trials = [];
  let history = policy === 'history_first' ? [...scenario.history] : [];
  let selected = [];
  function inspect(stage, candidateHistory, candidateSources) {
    const messages = contextMessages({system, question: scenario.question,
      history: candidateHistory, selected: candidateSources});
    const measured = measure(messages);
    trials.push({stage, tokens: measured.inputIds.length, fits: measured.inputIds.length <= inputBudget,
      historyIds: candidateHistory.map(pair => pair.id), sourceAliases: candidateSources.map(source => source.alias)});
    return {...measured, messages};
  }
  let current = inspect('base', history, selected);
  while (policy === 'history_first' && current.inputIds.length > inputBudget && history.length) {
    history = history.slice(1);
    current = inspect('drop-oldest-history', history, selected);
  }
  if (current.inputIds.length > inputBudget) {
    return {status: 'base_over_budget', prompt: null, inputIds: [], selected: [], historyIds: [],
      registry, trials, inputBudget, rejectedBase: current};
  }
  for (const source of sources) {
    if (selected.length >= maxSources) break;
    const candidate = inspect('try-whole-source', history, [...selected, source]);
    if (candidate.inputIds.length <= inputBudget) {
      selected = [...selected, source];
      current = candidate;
    }
  }
  if (policy === 'evidence_first') {
    for (let index = scenario.history.length - 1; index >= 0; index--) {
      const proposed = [scenario.history[index], ...history];
      const candidate = inspect('try-newest-history', proposed, selected);
      if (candidate.inputIds.length > inputBudget) break;
      history = proposed;
      current = candidate;
    }
  }
  const status = selected.length ? 'ready' : 'no_evidence';
  return {status, prompt: current.prompt, inputIds: current.inputIds, messages: current.messages,
    selected: selected.map(source => source.alias), historyIds: history.map(pair => pair.id),
    registry, trials, inputBudget};
}
