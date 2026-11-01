import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import assert from 'node:assert/strict';
const data=JSON.parse(await readFile(new URL('../../packages/vector-retrieval/viewer-data.json',import.meta.url)));
const manifest=JSON.parse(await readFile(new URL('../../docs/editorial/vector-retrieval-series.json',import.meta.url))),out=await mkdtemp('/tmp/vector-layout.'),report=[],browser=await chromium.launch({headless:true});
try{
 for(const width of [360,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const a of manifest.articles){
   const response=await page.goto('http://127.0.0.1:4322/posts/'+a.slug);assert.equal(response.status(),200);
   assert.ok((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'));
   await page.locator('article img').evaluateAll(images=>images.forEach(i=>i.loading='eager'));
   await page.waitForFunction(()=>[...document.querySelectorAll('article img')].every(i=>i.complete&&i.naturalWidth>0));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:out+'/'+width+'-'+a.id+'.png',fullPage:true});report.push({id:a.id,width,status:200,noindex:true,noOverflow:true});
  }
  await page.goto('http://127.0.0.1:4322/assets/interactive/vector-retrieval/explorer.html');
  await page.locator('#components tr').nth(383).waitFor({state:'attached'});
  const counts=await page.evaluate(data=>{
   const $=id=>document.getElementById(id),fail=m=>{throw Error(m);},fmt=n=>(Math.abs(n)<5e-10?0:n).toLocaleString('es-ES',{maximumFractionDigits:9}),change=(id,value,event='change')=>{$(id).value=String(value);$(id).dispatchEvent(new Event(event,{bubbles:true}));},close=(a,b)=>{if(Math.abs(a-b)>5e-8)fail('Numeric mismatch '+a+' / '+b);};
   let controls=0,pairs=0,coordinates=0,nativeCases=0,nativeDocuments=0,pgCases=0,pgDocuments=0,qualityCases=0,qualityDocuments=0,timingCases=0;
   const rows=id=>[...$(id).rows].map(r=>[...r.cells].map(c=>c.textContent));
   for(const degrees of [-180,-120,-90,-37,0,37,90,120,180])for(const scale of [.25,.5,1,2,4])for(const unit of [false,true]){
    change('degrees',degrees,'input');change('scale',scale,'input');$('unit').checked=unit;$('unit').dispatchEvent(new Event('change',{bubbles:true}));
    const angle=degrees*Math.PI/180,cos=Math.cos(angle),actual=rows('toy-metrics');
    if(actual[0][1]!==fmt(scale*cos))fail('Raw dot');if(actual[1][1]!==fmt(cos))fail('Raw cosine');
    const numeric=text=>Number(text.replaceAll('.','').replace(',','.'));close(numeric(actual[2][1]),scale*scale+1-2*scale*cos);
    const path=$('diagram').querySelector('path[stroke="#34d399"]').getAttribute('d'),match=path.match(/^M110 170L([-+.\de]+) ([-+.\de]+)/);close(Number(match[1]),110+52*(unit?1:scale));close(Number(match[2]),170);
    if(!$('diagram').textContent.includes(unit?'Vectores normalizados':'Longitud original del control'))fail('Diagram mode');controls++;
   }
   for(const q of data.queries){change('query',q.id);for(const d of data.corpus){change('document',d.id);
    const a=data.rows.find(r=>r.id===q.id).rawVector,b=data.rows.find(r=>r.id===d.id).rawVector,an=Math.hypot(...a),bn=Math.hypot(...b),ua=Array.from(Float32Array.from(a,v=>v/an)),ub=Array.from(Float32Array.from(b,v=>v/bn)),dot=a.reduce((s,v,i)=>s+v*b[i],0),unitDot=ua.reduce((s,v,i)=>s+v*ub[i],0),l2=a.reduce((s,v,i)=>s+(v-b[i])**2,0),unitL2=ua.reduce((s,v,i)=>s+(v-ub[i])**2,0),expected=[an,bn,dot,dot/(an*bn),unitDot,l2,unitL2,2-2*unitDot];
    const actual=rows('real-metrics');expected.forEach((value,i)=>{if(actual[i][1]!==fmt(value))fail('Real metric '+q.id+'/'+d.id+'/'+i);});
    const componentRows=rows('components');if(componentRows.length!==384)fail('Missing dimensions');componentRows.forEach((row,i)=>{const e=[i,a[i],b[i],ua[i]*ub[i]].map(fmt);if(JSON.stringify(row)!==JSON.stringify(e))fail('Component '+i);coordinates++;});
    const relevant=q.relevant.includes(d.id);if($('judgment').textContent!==(relevant?'Relevante según el juicio del autor.':'No relevante según el juicio del autor.'))fail('Judgment');
    if(!$('component-total').textContent.includes(fmt(unitDot)))fail('Component sum');pairs++;
   }}
   for(const query of data.queries)for(const strategy of data.native.strategies){
    change('native-query',query.id);change('native-strategy',strategy.id);
    const ref=data.native.neighbors.find(r=>r.queryId===query.id&&r.strategy==='flat'),selected=data.native.neighbors.find(r=>r.queryId===query.id&&r.strategy===strategy.id),rset=new Set(ref.ids),sset=new Set(selected.ids),shared=selected.ids.filter(id=>rset.has(id)).length;
    if(!$('native-summary').textContent.includes(shared+'/10; recall '+fmt(shared/10)))fail('Native recall');
    for(const[id,row,other]of [['native-exact',ref,sset],['native-selected',selected,rset]]){
     const actual=rows(id),expected=row.ids.map((id,i)=>[fmt(i+1),id,fmt(row.distances[i]),other.has(id)?'sí':'no']);if(JSON.stringify(actual)!==JSON.stringify(expected))fail('Native rows '+query.id+'/'+strategy.id);
    }
    for(const[group,ids,other]of [['reference',ref.ids,sset],['selected',selected.ids,rset]]){
     const nodes=[...$('native-diagram').querySelectorAll('[data-group="'+group+'"]')];if(nodes.length!==ids.length)fail('Native tiles');nodes.forEach((node,i)=>{if(node.dataset.id!==ids[i])fail('Native tile ID');const color=other.has(ids[i])?'#34d399':group==='reference'?'#fb7185':'#fbbf24';if(node.querySelector('rect').getAttribute('fill')!==color)fail('Native tile color');});
    }
    if(JSON.stringify(JSON.parse($('native-build').textContent))!==JSON.stringify(data.native.builds.find(b=>b.id===strategy.index)))fail('Build metadata');
    if(JSON.stringify(JSON.parse($('native-timing').textContent))!==JSON.stringify(data.native.summaries.find(s=>s.strategy===strategy.id)))fail('Timing scope');
    for(const id of new Set([...selected.ids,...ref.ids])){change('native-document',id);const doc=data.indexDocuments.find(d=>d.id===id);if($('native-document-text').textContent!==doc.text)fail('Native source');const expected=doc.kind==='index-control'?'Sin juicio semántico: registro de control del índice.':query.relevant.includes(id)?'Relevante según la etiqueta del corpus original de 20 documentos.':'No relevante según la etiqueta del corpus original de 20 documentos.';if($('native-judgment').textContent!==expected)fail('Unknown labels must stay unknown');nativeDocuments++;}
    nativeCases++;
   }
   for(const query of data.queries)for(const strategy of data.postgres.summaries.map(r=>r.strategy)){
    change('pg-query',query.id);change('pg-strategy',strategy);
    const reference=data.postgres.neighbors.find(r=>r.strategy==='exact'&&r.queryId===query.id),selected=data.postgres.neighbors.find(r=>r.strategy===strategy&&r.queryId===query.id),rset=new Set(reference.ids),sset=new Set(selected.ids),recall=selected.ids.filter(id=>rset.has(id)).length/10;
    if(!$('pg-summary').textContent.includes(selected.ids.length+' filas devueltas; recall geométrico @10: '+fmt(recall)))fail('PG recall or cardinality');
    for(const [id,row,other] of [['pg-exact',reference,sset],['pg-selected',selected,rset]])if(JSON.stringify(rows(id))!==JSON.stringify(row.ids.map((id,i)=>[fmt(i+1),id,fmt(row.distances[i]),other.has(id)?'sí':'no'])))fail('PG ranking');
    const tiles=[...$('pg-diagram').querySelectorAll('[data-group="selected"]')];if(tiles.length!==selected.ids.length)fail('Do not invent PG candidates');
    if(JSON.stringify(JSON.parse($('pg-timing').textContent))!==JSON.stringify(data.postgres.summaries.find(r=>r.strategy===strategy)))fail('PG600request summary');
    const plans=JSON.parse($('pg-raw-plan').textContent);
    if(!$('pg-plans').textContent.includes('top-N heapsort')||!$('pg-plans').textContent.includes('filas 1000'))fail('Actual plan summary');
    if(strategy==='hnsw-ef4'&&!$('pg-plans').textContent.includes('Index Scan | filas 4'))fail('Observed four rows in plan');
    for(const key of ['exact','unforcedAfterIndex',...(strategy==='exact'?[]:[strategy])])if(JSON.stringify(plans[key])!==JSON.stringify(data.postgres.plans[key]))fail('PG original plan');
    for(const id of new Set([...selected.ids,...reference.ids])){change('pg-document',id);const doc=data.indexDocuments.find(d=>d.id===id);if($('pg-document-text').textContent!==doc.text)fail('PG document');if(doc.kind==='index-control'&&!$('pg-judgment').textContent.startsWith('Sin juicio semántico'))fail('Unknown PG label');pgDocuments++;}
    pgCases++;
   }
   for(const query of data.queries)for(const method of ['bm25','dense']){
    change('quality-query',query.id);change('quality-method',method);
    const saved=data.quality.rows.find(r=>r.queryId===query.id),ranking=saved.rankings[method],gold=new Set(query.relevant),top=ranking.slice(0,3),hits=top.filter(r=>gold.has(r.id)).length,first=top.findIndex(r=>gold.has(r.id));
    if(JSON.stringify(rows('quality-ranking'))!==JSON.stringify(ranking.map((r,i)=>[fmt(i+1),r.id,fmt(r.score),gold.has(r.id)?'sí':'no'])))fail('Quality ranking');
    const metrics=$('quality-metrics').textContent;
    if(!gold.size){if(!metrics.startsWith('Métricas null'))fail('Negative not in mean');}
    else if(metrics!=='P@3: '+fmt(hits/3)+'; R@3: '+fmt(hits/gold.size)+'; RR@3: '+fmt(first<0?0:1/(first+1))+'.')fail('Independent relevance metrics');
    const tiles=[...$('quality-diagram').querySelectorAll('[data-relevant]')];if(tiles.length!==top.length)fail('Quality cardinality');tiles.forEach((tile,i)=>{if(tile.dataset.id!==top[i].id||tile.dataset.relevant!==String(gold.has(top[i].id)))fail('Quality tile');});
    for(const result of ranking){change('quality-document',result.id);const doc=data.corpus.find(d=>d.id===result.id);if($('quality-document-text').textContent!==doc.title+' '+doc.body)fail('Quality source');qualityDocuments++;}
    if(!ranking.length&&!$('quality-document-text').textContent.includes('no devolvió'))fail('Empty ranking');
    qualityCases++;
   }
   for(const engine of ['native','postgres']){
    change('timing-engine',engine);const source=data[engine];
    if(engine==='native'&&!$('timing-scope').textContent.includes('Sin encoder, IPC'))fail('Native scope');
    if(engine==='postgres'&&!$('timing-scope').textContent.includes('loopback'))fail('Client scope');
    for(const summary of source.summaries)for(const query of ['all',...data.queries.map(q=>q.id)]){
     change('timing-strategy',summary.strategy);change('timing-query',query);
     const expected=source.measurements.filter(r=>r.strategy===summary.strategy&&(query==='all'||r.queryId===query)),values=expected.map(r=>r.elapsedMs).sort((a,b)=>a-b),p50=values[Math.ceil(.5*values.length)-1],p95=values[Math.ceil(.95*values.length)-1];
     if(!$('timing-summary').textContent.startsWith(values.length+' muestras; p50 '+fmt(p50)+' ms; p95 '+fmt(p95)+' ms.'))fail('Timing subset percentiles');
     if(JSON.stringify(rows('timing-samples'))!==JSON.stringify(expected.map(r=>[fmt(r.round),r.queryId,fmt(r.elapsedMs)])))fail('Measured rows');
     const marker=$('timing-diagram').querySelector('[data-percentile="0.95"]');close(Number(marker.dataset.value),p95);timingCases++;
    }
   }
   return {controls,pairs,coordinates,nativeCases,nativeDocuments,pgCases,pgDocuments,qualityCases,qualityDocuments,timingCases};
  },data);
  await page.locator('[data-panel="toy"]').click();await page.locator('#degrees').fill('0');await page.locator('#degrees').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#degrees').inputValue(),'1');
  for(const panel of ['toy','real','native','pg','quality','timing']){await page.locator(`[data-panel="${panel}"]`).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/'+width+'-'+panel+'.png',fullPage:true});}
  await page.locator('[data-panel="real"]').click();
  const region=page.getByRole('region',{name:'384 componentes de los embeddings'}),horizontal=await region.evaluate(e=>e.scrollWidth>e.clientWidth);await region.focus();await page.keyboard.press(horizontal?'ArrowRight':'ArrowDown');await page.waitForFunction(horizontal=>{const el=document.getElementById('components').closest('.scroll');return horizontal?el.scrollLeft>0:el.scrollTop>0;},horizontal);
  console.log(JSON.stringify({width,...counts,errors}));report.push({width,...counts,keyboard:true,localScroll:true,errors});
  assert.deepEqual(errors,[]);await page.close();
 }
 const page=await browser.newPage({viewport:{width:360,height:520}});
 for(const a of manifest.articles){await page.goto('http://127.0.0.1:4322/assets/visuals/vector-retrieval/'+a.id+'.svg');const overflow=await page.evaluate(()=>[...document.querySelectorAll('text')].flatMap(t=>{const b=t.getBBox();return b.x<0||b.x+b.width>360||b.y<0||b.y+b.height>520?[t.textContent]:[];}));assert.deepEqual(overflow,[]);await page.screenshot({path:out+'/'+a.id+'-diagram.png'});}
 await page.setViewportSize({width:360,height:380});
 for(const file of ['native-recall.svg','serialized-size.svg','quality-comparison.svg','pg-recall.svg','native-latency.svg','postgres-latency.svg']){await page.goto('http://127.0.0.1:4322/assets/interactive/vector-retrieval/'+file);const overflow=await page.evaluate(()=>{const box=document.querySelector('svg').getBoundingClientRect();return [...document.querySelectorAll('text')].flatMap(t=>{const b=t.getBoundingClientRect();return b.left<box.left-.5||b.right>box.right+.5||b.top<box.top-.5||b.bottom>box.bottom+.5?[{text:t.textContent,left:b.left,right:b.right,top:b.top,bottom:b.bottom}]:[];});});assert.deepEqual(overflow,[],file+' clipped labels');await page.screenshot({path:out+'/'+file+'.png'});}
 await page.close();
}finally{await browser.close();await writeFile(out+'/report.json',JSON.stringify({editorialState:manifest.editorialState,writtenArticles:manifest.articles.length,plannedArticles:manifest.plannedIds.length,report},null,2)+'\n');console.log(out+'/report.json');}
