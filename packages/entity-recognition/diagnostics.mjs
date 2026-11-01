// Handcrafted word IDs exercise the alignment contract, not a downloaded tokenizer.
export function alignFirstSubwords(wordIds, wordLabels) {
  let previous = null;
  const seen = new Set();
  return wordIds.map(id => {
    if (id === null) { previous = null; return -100; }
    if (!Number.isInteger(id) || id < 0 || id >= wordLabels.length) throw Error('Word ID fuera de rango');
    if (id === previous) return -100;
    if (seen.has(id)) throw Error('Word ID no contiguo');
    seen.add(id); previous = id;
    return wordLabels[id];
  });
}
const same = (a,b) => a.start === b.start && a.end === b.end && a.label === b.label;
export function reviewErrors(gold, predicted) {
  const usedGold = new Set(), usedPredicted = new Set(), errors = [];
  gold.forEach((g,i) => { const j = predicted.findIndex((p,j) => !usedPredicted.has(j) && same(g,p)); if (j >= 0) { usedGold.add(i); usedPredicted.add(j); } });
  const pairs = [];
  gold.forEach((g,i) => predicted.forEach((p,j) => {
    if (usedGold.has(i) || usedPredicted.has(j)) return;
    const intersection = Math.max(0, Math.min(g.end,p.end) - Math.max(g.start,p.start));
    if (intersection) pairs.push({i,j,iou:intersection/(Math.max(g.end,p.end)-Math.min(g.start,p.start))});
  }));
  // Greedy highest IoU, then input order. Diagnostic grouping, not the scoring rule.
  pairs.sort((a,b) => b.iou-a.iou || a.i-b.i || a.j-b.j);
  for (const {i,j,iou} of pairs) {
    if (usedGold.has(i) || usedPredicted.has(j)) continue;
    usedGold.add(i); usedPredicted.add(j);
    const g=gold[i],p=predicted[j],bounds=g.start===p.start && g.end===p.end;
    errors.push({kind:bounds?'type':g.label===p.label?'boundary':'boundary_and_type',gold:g,predicted:p,iou});
  }
  gold.forEach((g,i) => { if (!usedGold.has(i)) errors.push({kind:'omission',gold:g}); });
  predicted.forEach((p,j) => { if (!usedPredicted.has(j)) errors.push({kind:'spurious',predicted:p}); });
  return errors;
}
