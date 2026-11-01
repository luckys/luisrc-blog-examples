import {neighborDiagram} from './neighbor-diagram.mjs';
import {neighborRecall} from './vectors.mjs';

const format = value => value.toLocaleString('es-ES', {maximumFractionDigits: 9});
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function latencyStats(measurements) {
  if (!measurements.length) throw Error('No hay muestras');
  const values = measurements.map(row => row.elapsedMs).toSorted((a,b) => a-b);
  if (values.some(value => !Number.isFinite(value) || value < 0)) throw Error('Tiempo inválido');
  const at = p => values[Math.ceil(p*values.length)-1];
  return {requests: values.length, p50Ms: at(.5), p95Ms: at(.95), maxMs: values.at(-1), values};
}

export function latencyDiagram(measurements) {
  const stats = latencyStats(measurements), max = stats.maxMs || 1;
  const x = rank => 58 + 272*rank/stats.requests;
  const y = value => 260 - 190*value/max;
  const path = stats.values.map((value,i) => `${i ? 'L' : 'M'}${x(i+1)} ${y(value)}`).join('');
  const markers = [.5,.95].map(p => {
    const rank = Math.ceil(p*stats.requests), value = stats.values[rank-1];
    return `<circle data-percentile="${p}" data-value="${value}" cx="${x(rank)}" cy="${y(value)}" r="5" fill="${p===.5?'#34d399':'#fbbf24'}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 350" role="img" aria-label="Tiempos ordenados de menor a mayor, no cronología"><rect width="360" height="350" fill="#0f172a"/><g fill="#e2e8f0" font-family="sans-serif" font-size="13"><text x="12" y="24">Tiempos ordenados: ${stats.requests} muestras</text><text x="12" y="47">Máximo: ${format(stats.maxMs)} ms</text><path d="M58 65V260H335" fill="none" stroke="#94a3b8"/><path d="${path}" fill="none" stroke="#38bdf8" stroke-width="2"/>${markers}<text x="45" y="279">0</text><text x="303" y="279">100 %</text><text x="104" y="302">Posición relativa ordenada</text><text x="12" y="326">p50: ${format(stats.p50Ms)} ms</text><text x="12" y="346">p95: ${format(stats.p95Ms)} ms</text></g></svg>`;
}

export function rankingDiagram(ranking, relevant) {
  const top = ranking.slice(0,3), gold = new Set(relevant);
  const boxes = top.map((row,i) => {
    const color = gold.has(row.id) ? '#34d399' : '#fb7185';
    return `<g data-id="${escape(row.id)}" data-relevant="${gold.has(row.id)}"><rect x="${12+i*116}" y="62" width="104" height="66" rx="6" fill="${color}"/><text x="${64+i*116}" y="86" text-anchor="middle" fill="#0f172a">${i+1}</text><text x="${64+i*116}" y="112" text-anchor="middle" fill="#0f172a">${escape(row.id)}</text></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 185" role="img" aria-label="Relevancia etiquetada de las tres primeras posiciones"><rect width="360" height="185" fill="#0f172a"/><g font-family="sans-serif" font-size="15" fill="#e2e8f0"><text x="12" y="24">Top3: ${top.length} resultados disponibles</text>${boxes}<text x="12" y="155">Verde: relevante. Rojo: no relevante.</text><text x="12" y="177">Solo corpus etiquetado de 20 documentos.</text></g></svg>`;
}

export function planLines(node, depth=0) {
  const fields=[node['Node Type'], 'filas '+node['Actual Rows'], 'loops '+node['Actual Loops']];
  for(const key of ['Index Name','Sort Method']) if(node[key]) fields.push(node[key]);
  return ['  '.repeat(depth)+fields.join(' | '), ...(node.Plans||[]).flatMap(child=>planLines(child,depth+1))];
}

export function initializeSavedPanels(data) {
  const $ = id => document.getElementById(id);
  const show = (id,value) => { $(id).textContent = value; };
  const option = (id,value,label) => { const node=document.createElement('option'); node.value=value; node.textContent=label; $(id).append(node); };
  const table = (id,rows) => {
    $(id).replaceChildren();
    for (const row of rows) {
      const tr=document.createElement('tr');
      for (const value of row) { const td=document.createElement('td'); td.textContent=typeof value==='number'?format(value):value; tr.append(td); }
      $(id).append(tr);
    }
  };
  const bind = (ids,draw) => { for(const id of ids) $(id).addEventListener('change',draw); };
  for(const query of data.queries) {
    for(const id of ['pg-query','quality-query','timing-query']) option(id,query.id,query.id+' · '+query.text);
  }
  const pgStrategies=data.postgres.summaries.map(row=>row.strategy);
  for(const id of pgStrategies) option('pg-strategy',id,id);
  const drawPgDocument = () => {
    const doc=data.indexDocuments.find(row=>row.id===$('pg-document').value),query=data.queries.find(row=>row.id===$('pg-query').value);
    show('pg-document-text',doc.text);
    show('pg-judgment',doc.kind==='index-control'?'Sin juicio semántico: registro de control del índice.':query.relevant.includes(doc.id)?'Relevante según la etiqueta del corpus original.':'No relevante según la etiqueta del corpus original.');
  };
  const drawPg = () => {
    const queryId=$('pg-query').value,strategy=$('pg-strategy').value;
    const reference=data.postgres.neighbors.find(row=>row.strategy==='exact'&&row.queryId===queryId);
    const selected=data.postgres.neighbors.find(row=>row.strategy===strategy&&row.queryId===queryId);
    const referenceSet=new Set(reference.ids),selectedSet=new Set(selected.ids);
    show('pg-summary',selected.ids.length+' filas devueltas; recall geométrico @10: '+format(neighborRecall(selected.ids,reference.ids))+'. Captura '+data.postgres.capturedAt+'.');
    $('pg-diagram').innerHTML=neighborDiagram(reference.ids,selected.ids);
    table('pg-exact',reference.ids.map((id,i)=>[i+1,id,reference.distances[i],selectedSet.has(id)?'sí':'no']));
    table('pg-selected',selected.ids.map((id,i)=>[i+1,id,selected.distances[i],referenceSet.has(id)?'sí':'no']));
    $('pg-document').replaceChildren();
    for(const id of new Set([...selected.ids,...reference.ids])) option('pg-document',id,id);
    const plans=['exact','unforcedAfterIndex',...(strategy==='exact'?[]:[strategy])];
    show('pg-plans',plans.map(key=>key+'\n'+data.postgres.plans[key].flatMap(row=>planLines(row.Plan)).join('\n')).join('\n\n'));
    show('pg-raw-plan',JSON.stringify(Object.fromEntries(plans.map(key=>[key,data.postgres.plans[key]])),null,2));
    show('pg-timing',JSON.stringify(data.postgres.summaries.find(row=>row.strategy===strategy),null,2));
    drawPgDocument();
  };
  option('quality-method','bm25','BM25');option('quality-method','dense','Dense');
  const drawQualityDocument = () => {
    const doc=data.corpus.find(row=>row.id===$('quality-document').value);
    show('quality-document-text',doc ? doc.title+' '+doc.body : 'Este método no devolvió documentos.');
  };
  const drawQuality = () => {
    const row=data.quality.rows.find(row=>row.queryId===$('quality-query').value),method=$('quality-method').value,ranking=row.rankings[method],metrics=row.metrics[method];
    show('quality-labels','Partición '+row.split+'. Relevantes etiquetados: '+(row.relevant.join(', ')||'ninguno; consulta sin respuesta en el corpus')+'.');
    show('quality-metrics',metrics?'P@3: '+format(metrics.precision)+'; R@3: '+format(metrics.recall)+'; RR@3: '+format(metrics.rr)+'.':'Métricas null: sin relevantes; excluida del promedio de respondibles. Los resultados siguen visibles.');
    $('quality-diagram').innerHTML=rankingDiagram(ranking,row.relevant);
    table('quality-ranking',ranking.map((result,i)=>[i+1,result.id,result.score,row.relevant.includes(result.id)?'sí':'no']));
    $('quality-document').replaceChildren();
    for(const result of ranking) option('quality-document',result.id,result.id);
    show('quality-aggregate',JSON.stringify(data.quality.summaries.filter(summary=>summary.split===row.split),null,2));
    drawQualityDocument();
  };
  option('timing-engine','native','FAISS: llamada nativa, sin IPC');option('timing-engine','postgres','pgvector: cliente y comunicación local');
  const measurementSource = () => $('timing-engine').value==='native'?data.native:data.postgres;
  const drawTiming = () => {
    const source=measurementSource(),strategy=$('timing-strategy').value,query=$('timing-query').value;
    const values=source.measurements.filter(row=>row.strategy===strategy&&(query==='all'||row.queryId===query));
    const stats=latencyStats(values);
    show('timing-scope',$('timing-engine').value==='native'?'Ámbito: llamada nativa FAISS y asignación del resultado. Sin encoder, IPC ni mapping posterior.':'Ámbito: cliente pgvector, serialización, loopback, servidor y parsing. Sin encoder ni comandos SET.');
    show('timing-summary',stats.requests+' muestras; p50 '+format(stats.p50Ms)+' ms; p95 '+format(stats.p95Ms)+' ms. Nearest rank; tiempos ordenados, no cronología.');
    $('timing-diagram').innerHTML=latencyDiagram(values);
    table('timing-samples',values.map(row=>[row.round,row.queryId,row.elapsedMs]));
    show('timing-protocol',source.config.schedule+'\n'+source.config.timing);
  };
  const changeTimingEngine = () => {
    $('timing-strategy').replaceChildren();
    for(const summary of measurementSource().summaries) option('timing-strategy',summary.strategy,summary.strategy);
    drawTiming();
  };
  bind(['pg-query','pg-strategy'],drawPg);bind(['pg-document'],drawPgDocument);
  bind(['quality-query','quality-method'],drawQuality);bind(['quality-document'],drawQualityDocument);
  bind(['timing-engine'],changeTimingEngine);bind(['timing-strategy','timing-query'],drawTiming);
  drawPg();drawQuality();changeTimingEngine();
}
