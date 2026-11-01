const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const names = {'instructions': 'Instrucciones', 'schema': '+ schema', 'few-shot': '+ dos ejemplos'};
const start = (title, height) => `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="${height}" viewBox="0 0 360 ${height}" role="img" aria-labelledby="title"><title id="title">${esc(title)}</title><rect width="360" height="${height}" fill="#0f172a"/><g fill="#e2e8f0" font-family="sans-serif" font-size="15"><text x="16" y="27" font-size="18">${esc(title)}</text>`;
const end = '</g></svg>\n';
export function stagesChart(summaries) {
  const stages = [['parse', '#fb7185', 'Parsing'], ['schema', '#fbbf24', 'Schema'], ['evidence', '#c084fc', 'Evidencia'], ['accepted', '#34d399', 'Aceptada']];
  let svg = start('Primer fallo: 8 respuestas por variante', 350);
  for (const [i, row] of summaries.entries()) {
    const y = 62 + i * 73;
    svg += `<text x="16" y="${y}">${esc(names[row.variant])}</text>`;
    let x = 16;
    for (const [key, color] of stages) {
      const n = row.stages[key], width = n / row.documents * 328;
      if (n) svg += `<rect x="${x}" y="${y+10}" width="${width}" height="24" fill="${color}"/><text x="${x+width/2}" y="${y+27}" text-anchor="middle" fill="#0f172a">${n}</text>`;
      x += width;
    }
  }
  stages.forEach(([,color,label],i) => {const x=16+i%2*170,y=300+Math.floor(i/2)*26;svg+=`<rect x="${x}" y="${y-12}" width="12" height="12" fill="${color}"/><text x="${x+18}" y="${y}">${label}</text>`;});
  return svg + end;
}
export function entitiesChart(summaries) {
  let svg = start('Entidades: conteos efectivos', 470);
  for (const [i,row] of summaries.entries()) {
    const y = 60 + i*119; svg += `<text x="16" y="${y}">${esc(names[row.variant])}</text>`;
    for (const [j,[key,color]] of [['tp','#34d399'],['fp','#fb7185'],['fn','#fbbf24']].entries()) {
      const yy=y+15+j*26, width=row[key]/12*238;
      svg+=`<text x="16" y="${yy+15}">${key.toUpperCase()}</text><rect x="48" y="${yy}" width="${width}" height="19" fill="${color}"/><text x="${58+width}" y="${yy+15}">${row[key]}</text>`;
    }
  }
  return svg + '<text x="16" y="436">Escala común: 0–12 entidades.</text><text x="16" y="459">Rechazo: cero predicciones efectivas.</text>' + end;
}
export function contextChart(runs) {
  const rows = runs.filter(r => r.documentId === 'E01'), max = Math.max(...rows.map(r => r.inputIds.length));
  let svg = start('E01: tokens de entrada completos', 325);
  rows.forEach((r,i)=>{const y=65+i*70,width=r.inputIds.length/max*265;svg+=`<text x="16" y="${y}">${esc(names[r.variant])}</text><rect x="16" y="${y+10}" width="${width}" height="23" fill="#38bdf8"/><text x="${24+width}" y="${y+27}">${r.inputIds.length}</text>`;});
  return svg+'<text x="16" y="290">Incluye roles, schema y ejemplos.</text><text x="16" y="313">Longitud observada; no mide latencia.</text>'+end;
}
