// Every public offset uses Unicode code points, never JS string indexes.
export function tokensOf(text) {
  if (typeof text !== 'string' || !text.isWellFormed()) throw Error('Texto Unicode inválido');
  const points = Array.from(text);
  // Map UTF-16 regex indexes back to the canonical code-point coordinate system.
  const offsets = new Map();
  let units = 0;
  for (let i = 0; i < points.length; i++) { offsets.set(units, i); units += points[i].length; }
  offsets.set(units, points.length);
  return Array.from(text.matchAll(/[\p{L}\p{M}\p{N}]+|[^\s]/gu), m => ({
    text: m[0], start: offsets.get(m.index), end: offsets.get(m.index + m[0].length),
  }));
}

export function validateRecord(record) {
  const tokens = tokensOf(record.text);
  const points = Array.from(record.text);
  if (!Array.isArray(record.spans)) throw Error('Falta spans');
  let previousEnd = 0;
  for (const span of record.spans) {
    const {start, end, label, text} = span;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < previousEnd || start < 0 || end <= start || end > points.length) throw Error('Límites inválidos o solapados');
    if (!['PER', 'ORG'].includes(label)) throw Error('Tipo fuera del esquema');
    if (points.slice(start, end).join('') !== text) throw Error('Texto del span desactualizado');
    if (!tokens.some(t => t.start === start) || !tokens.some(t => t.end === end)) throw Error('Span corta un token');
    previousEnd = end;
  }
  return tokens;
}

export function toBio(record) {
  const tokens = validateRecord(record);
  return tokens.map(token => {
    const span = record.spans.find(s => token.start >= s.start && token.end <= s.end);
    if (!span) return 'O';
    return (token.start === span.start ? 'B-' : 'I-') + span.label;
  });
}

export function fromBio(tokens, labels) {
  if (tokens.length !== labels.length) throw Error('Longitudes distintas');
  const spans = [];
  let active = null;
  for (let i = 0; i < tokens.length; i++) {
    const tag = labels[i];
    if (!/^(O|[BI]-(PER|ORG))$/.test(tag)) throw Error('Etiqueta inválida');
    if (tag === 'O') { active = null; continue; }
    const label = tag.slice(2);
    if (tag.startsWith('B-')) {
      active = {start: tokens[i].start, end: tokens[i].end, label};
      spans.push(active);
      continue;
    }
    if (!active || active.label !== label) throw Error('Transición I ilegal');
    active.end = tokens[i].end;
  }
  return spans;
}
