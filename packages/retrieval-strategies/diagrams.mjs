const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const fmt=value=>value.toLocaleString('es-ES',{maximumFractionDigits:6});
export function evidenceDiagram(facts){
 const height=Math.max(100,facts.length*52+45),rows=facts.map((fact,i)=>{
  const y=28+i*52;return `<g data-fact="${i}" data-coverage="${fact.coverage}"><text x="12" y="${y+24}" fill="#e2e8f0" font-size="13">Hecho ${i+1}</text><text x="340" y="${y+10}" text-anchor="end" fill="#e2e8f0" font-size="12">${fmt(fact.coverage*100)}%</text><rect x="90" y="${y+16}" width="250" height="14" fill="#334155"/><rect data-covered="true" x="90" y="${y+16}" width="${250*fact.coverage}" height="14" fill="${fact.complete?'#4ade80':'#38bdf8'}"/></g>`;
 }).join('');
 const empty=facts.length?'':'<text x="12" y="52" fill="#e2e8f0" font-size="13">Sin hechos gold: cobertura no aplicable</text>';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 ${height}" width="360" height="${height}" role="img" aria-label="Cobertura por hecho, escala fija de cero a cien por ciento"><text x="12" y="18" fill="#e2e8f0" font-size="13">Cobertura de los hechos · escala 0–100%</text>${rows}${empty}</svg>`;
}
export function fusionDiagram(ranking,labels,constant){
 const rows=ranking.slice(0,5),height=Math.max(110,rows.length*52+70),max=2/(constant+1),scale=250/max;
 const bars=rows.map((row,i)=>{
  const a=row.contributions.find(c=>c.listIndex===0)?.contribution??0,b=row.contributions.find(c=>c.listIndex===1)?.contribution??0,y=28+i*52;
  return `<g data-id="${escape(row.id)}"><text x="12" y="${y+27}" fill="#e2e8f0" font-size="12">${escape(labels.get(row.id))}</text><text x="340" y="${y+10}" text-anchor="end" fill="#e2e8f0" font-size="12">${fmt(row.score)}</text><rect data-list="0" data-value="${a}" x="90" y="${y+18}" width="${a*scale}" height="14" fill="#38bdf8"/><rect data-list="1" data-value="${b}" x="${90+a*scale}" y="${y+18}" width="${b*scale}" height="14" fill="#fbbf24"/></g>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 ${height}" width="360" height="${height}" role="img" data-max="${max}" aria-label="Aportes RRF de los cinco primeros candidatos, azul BM25 y oro denso"><text x="12" y="18" fill="#e2e8f0" font-size="12">Azul BM25 · oro denso · hasta 5 candidatos</text>${bars}<text x="12" y="${height-12}" fill="#e2e8f0" font-size="12">Escala de 0 a ${fmt(max)} = 2 / (${constant} + 1)</text>${rows.length?'':'<text x="12" y="52" fill="#e2e8f0" font-size="13">Sin candidatos en las listas</text>'}</svg>`;
}
