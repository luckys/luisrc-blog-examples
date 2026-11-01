const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const number = value => value.toLocaleString('es',{maximumFractionDigits:4});
const start=(title,height)=>`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="${height}" viewBox="0 0 360 ${height}" role="img" aria-label="${escape(title)}"><rect width="360" height="${height}" fill="#0f172a"/><g fill="#e2e8f0" font-family="sans-serif" font-size="15"><text x="16" y="25">${escape(title)}</text>`;
export function distributionChart(ranking) {
  const top=ranking.slice(0,5),rest=ranking.slice(5).reduce((s,r)=>s+r.probability,0);
  let svg=start('Probabilidad del siguiente token',390);
  [...top,{token:'resto',probability:rest}].forEach((r,i)=>{const y=52+i*48;svg+=`<text x="16" y="${y+17}">${escape(r.token)}</text><rect x="110" y="${y}" width="${Math.max(0,r.probability*170)}" height="24" fill="#22d3ee"/><text x="${Math.min(288,116+r.probability*170)}" y="${y+17}">${number(r.probability)}</text>`;});
  return svg+'<text x="16" y="367">Top 5 + masa de los otros 16 tokens</text></g></svg>';
}
export function lossChart(runs) {
 let svg=start('Cross-entropy de train por paso',300)+'<path d="M48 50V220H335" stroke="#94a3b8" fill="none"/><text x="15" y="60">3,5</text><text x="24" y="225">0</text><text x="48" y="245">0</text><text x="170" y="245">150</text><text x="300" y="245">300</text>';
 runs.forEach((r,i)=>{const color=['#22d3ee','#fbbf24','#c4b5fd'][i],points=r.loss.flatMap((y,x)=>x%5===0?[(48+x/300*280)+','+(220-y/3.5*160)]:[]).join(' ');svg+=`<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2"/><text x="${20+i*112}" y="280" fill="${color}">seed ${r.seed}</text>`;});return svg+'</g></svg>';
}
export function nllChart(baseline,runs) {
 let svg=start('NLL de test, menor es mejor',300);const rows=[{name:'unigramas',value:baseline.metrics.test.nll},...runs.map(r=>({name:'seed '+r.seed,value:r.metrics.test.nll}))];rows.forEach((r,i)=>{const y=55+i*50;svg+=`<text x="16" y="${y+17}">${r.name}</text><rect x="105" y="${y}" width="${r.value/3*150}" height="25" fill="#c4b5fd"/><text x="${112+r.value/3*150}" y="${y+17}">${number(r.value)}</text>`;});return svg+'<text x="16" y="280">Nats por token · corpus sintético</text></g></svg>';
}
