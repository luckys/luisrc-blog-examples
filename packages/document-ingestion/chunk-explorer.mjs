// Browser-only inspection of saved outcomes. No encoder, tokenizer or search runs here.
export function partitionAtThreshold(document,pieces,boundaries,threshold,budget=32){
 if(!Number.isFinite(threshold)||threshold<0||threshold>2)throw Error('Umbral fuera de rango');
 const chunks=[];let first=0;
 for(let i=1;i<pieces.length;i++){
  if(boundaries[i-1].distance>threshold||pieces[i].last-first>budget){chunks.push({first,last:pieces[i].first});first=pieces[i].first;}
 }
 chunks.push({first,last:document.units.length});return chunks;
}
export function contextEvidence(chunks,query){
 const units=new Set();let total=0;
 for(const chunk of chunks)for(let i=chunk.first;i<chunk.last;i++){units.add(chunk.representationId+':'+i);total++;}
 const facts=query.facts.map(fact=>{
  const alternatives=fact.alternatives.map(a=>{
   const matched=a.requiredUnitIds.filter(i=>units.has(a.representationId+':'+i));
   return {documentId:a.documentId,quote:a.quote,required:a.requiredUnitIds.length,matched:matched.length,coverage:matched.length/a.requiredUnitIds.length};
  });
  return {coverage:Math.max(...alternatives.map(a=>a.coverage)),complete:alternatives.some(a=>a.matched===a.required),alternatives};
 });
 return {coverage:facts.length?facts.reduce((s,f)=>s+f.coverage,0)/facts.length:null,complete:facts.length?facts.every(f=>f.complete):null,returned:chunks.length,contextUnits:total,uniqueContextUnits:units.size,contextRedundancy:total?1-units.size/total:0,facts};
}
export function coverageCounts(document,chunks){
 const counts=Array(document.units.length).fill(0);
 for(const chunk of chunks)for(let i=chunk.first;i<chunk.last;i++)counts[i]++;
 return counts;
}
export function coverageDiagram(counts,selected={first:0,last:0}){
 const columns=16,cell=20,rows=Math.ceil(counts.length/columns),height=rows*cell+38;
 const boxes=counts.map((count,i)=>`<rect data-unit="${i}" data-count="${count}" x="${i%columns*cell+10}" y="${Math.floor(i/columns)*cell+8}" width="17" height="17" fill="${count>1?'#fbbf24':'#38bdf8'}" stroke="${i>=selected.first&&i<selected.last?'#f8fafc':'#0f172a'}" stroke-width="2"><title>Unidad ${i}: ${count} apariciones</title></rect>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cobertura por ordinal, azul una vez y amarillo repetido; borde blanco para el chunk seleccionado" viewBox="0 0 340 ${height}" width="340" height="${height}">${boxes}<text x="10" y="${height-8}" fill="#e2e8f0" font-size="12" font-family="sans-serif">Azul: 1 · amarillo: 2 · borde: selección</text></svg>`;
}
