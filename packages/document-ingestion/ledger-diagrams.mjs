export function windowDiagram(document,chunks,selectedId) {
  const count=document.units.length;
  if(!count||!chunks.length) throw Error('Sin ventanas');
  const rects=chunks.map((chunk,index)=>{
    const x=12+336*chunk.first/count,width=336*(chunk.last-chunk.first)/count;
    return `<g data-chunk="${chunk.id}"><rect x="${x}" y="60" width="${width}" height="44" fill="${chunk.id===selectedId?'#fbbf24':'#38bdf8'}" stroke="#0f172a"/>${width>23?`<text x="${x+width/2}" y="87" text-anchor="middle" fill="#0f172a">${index+1}</text>`:''}</g>`;
  }).join('');
  const selected=chunks.find(chunk=>chunk.id===selectedId);if(!selected)throw Error('Ventana no seleccionada');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 180" role="img" aria-label="Ventanas sobre ordinales de unidades, sin overlap"><rect width="360" height="180" fill="#0f172a"/><g font-family="sans-serif" font-size="14" fill="#e2e8f0"><text x="12" y="24">${chunks.length} ventanas; ${count} unidades</text>${rects}<text x="12" y="127">0</text><text x="348" y="127" text-anchor="end">${count}</text><text x="12" y="153">Selección: [${selected.first}, ${selected.last})</text><text x="12" y="176">La escala cuenta unidades, no tokens.</text></g></svg>`;
}
export function candidateDiagram(score) {
  if(!Number.isFinite(score)||score<0||score>1)throw Error('Jaccard inválido');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 140" role="img" aria-label="Jaccard del candidato, solo revisión"><rect width="360" height="140" fill="#0f172a"/><g font-family="sans-serif" font-size="14" fill="#e2e8f0"><text x="12" y="24">Jaccard: ${score.toLocaleString('es-ES',{maximumFractionDigits:9})}</text><rect x="12" y="45" width="336" height="25" fill="#334155"/><rect data-score="${score}" x="12" y="45" width="${336*score}" height="25" fill="#38bdf8"/><text x="12" y="94">0</text><text x="348" y="94" text-anchor="end">1</text><text x="12" y="125">Solo revisión; no se fusionó el contenido.</text></g></svg>`;
}
