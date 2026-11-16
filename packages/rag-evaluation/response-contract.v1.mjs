function hasDuplicateKeys(raw) {
  const tokens = raw.match(/"(?:\\.|[^"\\])*"|[{}\[\]:]/g) ?? [];
  const stack = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === '{') stack.push(new Set());
    else if (token === '[') stack.push(null);
    else if (token === '}' || token === ']') stack.pop();
    else if (token.startsWith('"') && tokens[i + 1] === ':') {
      const keys = stack.at(-1), key = JSON.parse(token);
      if (keys.has(key)) return true;
      keys.add(key);
    }
  }
  return false;
}

export function validateResponse(raw, availableIds) {
  let value;
  try { value = JSON.parse(raw); } catch { return {valid: false, reason: 'invalid_json'}; }
  if (hasDuplicateKeys(raw)) return {valid: false, reason: 'duplicate_keys'};
  if (!value || Array.isArray(value) || typeof value !== 'object' || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(['answer', 'citations', 'status'])) return {valid: false, reason: 'schema'};
  if (!['answered', 'no_answer'].includes(value.status) || typeof value.answer !== 'string' || !Array.isArray(value.citations) || !value.citations.every(id => typeof id === 'string')) return {valid: false, reason: 'schema'};
  if (new Set(value.citations).size !== value.citations.length) return {valid: false, reason: 'duplicate_citation'};
  if (!value.citations.every(id => availableIds.includes(id))) return {valid: false, reason: 'unknown_citation'};
  if (value.status === 'answered' && (!value.answer.trim() || !value.citations.length)) return {valid: false, reason: 'state_contract'};
  if (value.status === 'no_answer' && (value.answer !== '' || value.citations.length)) return {valid: false, reason: 'state_contract'};
  return {valid: true, value};
}
