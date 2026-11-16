import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import assert from 'node:assert/strict';
const data=JSON.parse(await readFile(new URL('../../packages/document-ingestion/viewer-data.json',import.meta.url)));
const manifest=JSON.parse(await readFile(new URL('../../docs/editorial/document-ingestion-series.json',import.meta.url))),out=await mkdtemp('/tmp/ingestion-layout.'),report=[];
const browser=await chromium.launch({headless:true});
try{
 for(const width of [360,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const article of manifest.articles){
   const response=await page.goto('http://127.0.0.1:4322/posts/'+article.slug);assert.equal(response.status(),200);
   assert.ok((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'));
   await page.locator('article img').evaluateAll(images=>images.forEach(image=>image.loading='eager'));
   await page.waitForFunction(()=>[...document.querySelectorAll('article img')].every(image=>image.complete&&image.naturalWidth>0));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:out+'/'+width+'-'+article.id+'.png',fullPage:true});report.push({id:article.id,width,status:200,noindex:true,noOverflow:true});
  }
  await page.goto('http://127.0.0.1:4322/assets/interactive/document-ingestion/explorer.html');await page.locator('#pdf-table tr').nth(177).waitFor({state:'attached'});
  const counts=await page.evaluate(data=>{
   const $=id=>document.getElementById(id),fail=message=>{throw Error(message);},change=(id,value,event='change')=>{$(id).value=String(value);$(id).dispatchEvent(new Event(event,{bubbles:true}));},fmt=value=>value.toLocaleString('es-ES',{maximumFractionDigits:9});
   const rows=id=>[...$(id).rows].map(row=>[...row.cells].map(cell=>cell.textContent));
   const close=(a,b)=>{if(Math.abs(a-b)>1e-8)fail('Box mismatch '+a+'/'+b);};
   function boxes(id,words,scale,selected,threshold=null){
    const nodes=[...$(id).querySelectorAll('[data-word]')];if(nodes.length!==words.length)fail('Missing boxes');
    nodes.forEach((node,i)=>{const word=words[i],[x0,y0,x1,y1]=word.bbox.map(value=>value*scale);if(Number(node.dataset.word)!==word.ordinal)fail('Wrong word identity');
     for(const [key,value]of Object.entries({x:x0,y:y0,width:x1-x0,height:y1-y0}))close(Number(node.getAttribute(key)),value);
     if(node.dataset.low!==String(threshold!==null&&word.confidence<threshold))fail('Low confidence flag');
     if(word.ordinal===selected&&node.getAttribute('stroke')!=='#b45309')fail('Selected word');
    });
   }
   let pdfCases=0,ocrCases=0,layoutCases=0,htmlCases=0,provenanceCases=0,duplicateGroups=0,nearCases=0,windowCases=0;
   for(const doc of data.documents.filter(doc=>doc.pages)){
    change('pdf-document',doc.id);const words=doc.pages[0].words;
    const expected=words.map(word=>[fmt(word.ordinal),word.text,JSON.stringify(word.bbox)]);if(JSON.stringify(rows('pdf-table'))!==JSON.stringify(expected))fail('PDF table');
    if(!words.length){if(!$('pdf-word').disabled||!$('pdf-details').textContent.includes('vacía'))fail('Empty PDF requires explicit state');boxes('pdf-diagram',[],1,-1);pdfCases++;}
    for(const word of words){change('pdf-word',word.ordinal);const details=JSON.parse($('pdf-details').textContent);if(details.text!==word.text||JSON.stringify(details.bbox)!==JSON.stringify(word.bbox))fail('PDF details');boxes('pdf-diagram',words,1,word.ordinal);pdfCases++;}
   }
   const ocr=data.ocr.words;
   if(JSON.stringify(rows('ocr-table'))!==JSON.stringify(ocr.map(word=>[fmt(word.ordinal),word.text,fmt(word.confidence),JSON.stringify(word.bbox)])))fail('OCR table');
   if($('ocr-text').textContent!==data.ocr.text||$('ocr-truth').textContent!==data.truth.singleText)fail('Original OCR and truth');
   for(const threshold of [0,50,90,100]){change('threshold',threshold,'input');const marked=ocr.filter(word=>word.confidence<threshold).length;if($('ocr-marked').textContent!==marked+(marked===1?' palabra resaltada de ':' palabras resaltadas de ')+ocr.length+'. Se conservan todas.')fail('Never drop low-confidence words');
    for(const word of ocr){change('ocr-word',word.ordinal);const details=JSON.parse($('ocr-details').textContent);if(details.text!==word.text||details.confidence!==word.confidence||JSON.stringify(details.bbox)!==JSON.stringify(word.bbox))fail('OCR details');boxes('ocr-diagram',ocr,.5,word.ordinal,threshold);ocrCases++;}
   }
   const original=data.documents.find(doc=>doc.id==='COLUMNS').pages[0].words;
   for(const mode of ['stream','rows','columns']){change('layout-mode',mode);const words=data.layoutOrders[mode].map(ordinal=>original.find(word=>word.ordinal===ordinal)),metric=data.metrics.layout[mode];
    if($('layout-text').textContent!==data.layout[mode])fail('Reading sequence');
    if(!$('layout-summary').textContent.includes(metric.edits+' ediciones / '+metric.referenceCharacters))fail('Order metric denominator');
    if(JSON.stringify(rows('layout-table'))!==JSON.stringify(words.map((word,i)=>[fmt(i+1),fmt(word.ordinal),word.text])))fail('Word order rows');
    const expectedPath=words.map((word,i)=>(i?'L':'M')+(word.bbox[0]+word.bbox[2])/2+' '+(word.bbox[1]+word.bbox[3])/2).join('');
    for(const word of words){change('layout-word',word.ordinal);boxes('layout-diagram',words,1,word.ordinal);if($('layout-diagram').querySelector('path').getAttribute('d')!==expectedPath)fail('Reconstructed path');layoutCases++;}
   }
   for(const doc of data.documents.filter(doc=>doc.blocks)){change('html-document',doc.id);const actual=[...$('html-blocks').children].map(node=>node.textContent),expected=doc.blocks.map(block=>block.kind+': '+block.text);if(JSON.stringify(actual)!==JSON.stringify(expected)||$('html-source').textContent!==doc.source)fail('HTML extraction');htmlCases++;}
   for(const doc of data.ledger.documents){
    change('provenance-document',doc.documentId);
    for(let first=0;first<doc.units.length;first++)for(const last of [first,...(first+1<doc.units.length?[first+1]:[])]){
     change('provenance-first',first);change('provenance-last',last);
     const start=doc.units[first].start,end=doc.units[last].end,units=doc.units.slice(first,last+1),quote=JSON.parse($('provenance-quote').textContent);
     if(quote.documentId!==doc.documentId||quote.documentVersion!==doc.documentVersion||quote.representationId!==doc.representationId||quote.start!==start||quote.end!==end||quote.text!==doc.text.slice(start,end))fail('Quote identity/range');
     const references=units.map(unit=>({unitOrdinal:unit.ordinal,start:unit.start,end:unit.end,sourceText:unit.rawText,origin:unit.origin}));
     if(JSON.stringify(quote.references)!==JSON.stringify(references))fail('Quote origins');
     if($('provenance-text').textContent!==doc.text||$('provenance-text').querySelector('mark').textContent!==quote.text)fail('Canonical selection');
     const physical=units.filter(unit=>unit.origin.bbox),nodes=[...$('provenance-page').querySelectorAll('[data-word]')];
     if(nodes.length!==physical.length||$('provenance-page').hidden!==(physical.length===0))fail('Stale or missing provenance boxes');
     nodes.forEach((node,i)=>{const o=physical[i].origin,scale=o.kind==='ocr'?.5:1,[x0,y0,x1,y1]=o.bbox.map(value=>value*scale);if(Number(node.dataset.word)!==o.wordOrdinal)fail('Original ordinal');for(const[k,v]of Object.entries({x:x0,y:y0,width:x1-x0,height:y1-y0}))close(Number(node.getAttribute(k)),v);});provenanceCases++;
    }
   }
   for(const kind of ['rawGroups','contentGroups']){
    change('dedup-kind',kind);if(!$('dedup-summary').textContent.startsWith('9 fuentes; '+data.ledger[kind].length+' grupos'))fail('Dedup denominator');
    for(let i=0;i<data.ledger[kind].length;i++){change('dedup-group',i);const group=data.ledger[kind][i];if(JSON.stringify(JSON.parse($('dedup-detail').textContent))!==JSON.stringify(group))fail('Group metadata');if(JSON.stringify(rows('dedup-aliases'))!==JSON.stringify(group.aliases.map(a=>[a.documentId,a.file,a.documentVersion])))fail('Lost alias');duplicateGroups++;}
   }
   for(let i=0;i<data.ledger.nearCandidates.length;i++){
    change('dedup-pair',i);const pair=data.ledger.nearCandidates[i];for(const side of ['a','b'])if($('dedup-'+side).textContent!==data.ledger.documents.find(d=>d.documentId===pair[side]).text)fail('Near source');
    if($('dedup-decision').dataset.decision!=='review_only_not_merged')fail('Similarity must not merge');const bar=$('dedup-diagram').querySelector('[data-score]');close(Number(bar.dataset.score),pair.jaccard);close(Number(bar.getAttribute('width')),336*pair.jaccard);nearCases++;
   }
   for(const id of data.ledger.indexDocumentIds)for(const budget of data.ledger.protocol.windows.budgets){
    change('size-document',id);change('size-budget',budget);const doc=data.ledger.documents.find(d=>d.documentId===id),chunks=data.ledger.chunks.filter(c=>c.documentId===id&&c.budget===budget);
    const expected=chunks.map((c,i)=>{const t=data.preflight.rows.find(t=>t.chunkId===c.id);return[i+1,c.first,c.last,c.start,c.end,c.last-c.first,t.modelTokens].map(String);});if(JSON.stringify(rows('size-chunks'))!==JSON.stringify(expected))fail('Window rows');
    for(const chunk of chunks){change('size-chunk',chunk.id);const tokens=data.preflight.rows.find(t=>t.chunkId===chunk.id);if(JSON.stringify(JSON.parse($('size-detail').textContent))!==JSON.stringify({chunk,tokenization:tokens}))fail('Window metadata/token IDs');if($('size-text').textContent!==doc.text.slice(chunk.start,chunk.end))fail('Window text');if(!$('size-summary').textContent.startsWith((chunk.last-chunk.first)+' unidades; '+tokens.modelTokens+' tokens'))fail('Window units');
     const nodes=[...$('size-diagram').querySelectorAll('[data-chunk]')];if(nodes.length!==chunks.length)fail('Window count');nodes.forEach((node,i)=>{if(node.dataset.chunk!==chunks[i].id)fail('Window ID');const rect=node.querySelector('rect');close(Number(rect.getAttribute('x')),12+336*chunks[i].first/doc.units.length);close(Number(rect.getAttribute('width')),336*(chunks[i].last-chunks[i].first)/doc.units.length);if(rect.getAttribute('fill')!==(chunks[i].id===chunk.id?'#fbbf24':'#38bdf8'))fail('Window highlight');});windowCases++;
    }
   }
   let semanticCases=0,overlapCases=0,retrievalCases=0;
   for(const segment of data.chunkInputs.segments){
    const doc=data.ledger.documents.find(d=>d.documentId===segment.documentId),actual=data.chunking.semanticDocuments.find(d=>d.documentId===doc.documentId);
    change('semantic-document',doc.documentId);
    for(let i=0;i<actual.boundaries.length;i++){change('semantic-boundary',i);if($('semantic-left').textContent!==segment.pieces[i].text||$('semantic-right').textContent!==segment.pieces[i+1].text)fail('Adjacent semantic text');if(JSON.stringify(JSON.parse($('semantic-detail').textContent))!==JSON.stringify(actual.boundaries[i]))fail('Preserved boundary');semanticCases++;}
    for(const threshold of [0,.35,.5,1,2]){
     change('semantic-threshold',threshold,'input');let first=0;const expected=[];
     for(let i=1;i<segment.pieces.length;i++)if(actual.boundaries[i-1].distance>threshold||segment.pieces[i].last-first>32){expected.push([String(first),String(segment.pieces[i].first),String(segment.pieces[i].first-first),doc.text.slice(doc.units[first].start,doc.units[segment.pieces[i].first-1].end)]);first=segment.pieces[i].first;}
     expected.push([String(first),String(doc.units.length),String(doc.units.length-first),doc.text.slice(doc.units[first].start,doc.units.at(-1).end)]);
     if(JSON.stringify(rows('semantic-ranges'))!==JSON.stringify(expected))fail('Counterfactual ranges');if(!$('semantic-summary').textContent.includes('No recalcula embeddings'))fail('Simulation scope');
    }
   }
   for(const strategy of data.chunking.strategies.filter(s=>s.id!=='semantic32'))for(const documentId of data.ledger.indexDocumentIds){
    const doc=data.ledger.documents.find(d=>d.documentId===documentId),chunks=strategy.chunks.filter(c=>c.documentId===documentId),counts=doc.units.map(unit=>chunks.filter(c=>unit.ordinal>=c.first&&unit.ordinal<c.last).length);
    change('overlap-document',documentId);change('overlap-policy',strategy.id);
    for(let i=0;i<chunks.length;i++){change('overlap-chunk',i);const chunk=chunks[i];if($('overlap-text').textContent!==chunk.text||JSON.stringify(JSON.parse($('overlap-detail').textContent))!==JSON.stringify(chunk))fail('Overlap text or metadata');const nodes=[...$('overlap-diagram').querySelectorAll('[data-unit]')];if(nodes.length!==counts.length)fail('Missing unit cells');nodes.forEach((node,n)=>{if(Number(node.dataset.unit)!==n||Number(node.dataset.count)!==counts[n])fail('Overlap coverage count');if(node.getAttribute('stroke')!==(n>=chunk.first&&n<chunk.last?'#f8fafc':'#0f172a'))fail('Overlap selection');});overlapCases++;}
   }
   for(const row of data.retrieval.rows){
    const query=data.retrieval.queries.find(q=>q.id===row.queryId),chunks=data.chunking.strategies.find(s=>s.id===row.strategy).chunks;
    change('retrieval-query',query.id);change('retrieval-strategy',row.strategy);
    for(const k of [1,2,3,4,5]){
     change('retrieval-k',k,'input');const top=row.ranking.slice(0,k).map(r=>chunks.find(c=>c.id===r.id)),units=new Set();let total=0;
     for(const c of top)for(let n=c.first;n<c.last;n++){units.add(c.representationId+':'+n);total++;}
     const coverages=query.facts.map(f=>Math.max(...f.alternatives.map(a=>a.requiredUnitIds.filter(n=>units.has(a.representationId+':'+n)).length/a.requiredUnitIds.length))),coverage=coverages.length?coverages.reduce((s,v)=>s+v,0)/coverages.length:null,complete=coverages.length?coverages.every(v=>v===1):null;
     const metric=JSON.parse($('retrieval-detail').textContent);
     for(const[key,value]of Object.entries({coverage,complete,returned:top.length,contextUnits:total,uniqueContextUnits:units.size,contextRedundancy:total?1-units.size/total:0}))if(metric[key]!==value)fail('Retrieval metric '+row.queryId+'/'+key);
     if(JSON.stringify(JSON.parse($('retrieval-gold').textContent))!==JSON.stringify(query.facts))fail('Gold evidence changed');
     if(JSON.stringify([...$('retrieval-chunks').children].map(s=>s.querySelector('pre').textContent))!==JSON.stringify(top.map(c=>c.text)))fail('Retrieved texts');
     retrievalCases++;
    }
   }
   return {pdfCases,ocrCases,layoutCases,htmlCases,provenanceCases,duplicateGroups,nearCases,windowCases,semanticCases,overlapCases,retrievalCases};
  },data);
  await page.locator('[data-panel="pdf"]').click();await page.locator('#pdf-document').selectOption('COLUMNS');
  await page.locator('[data-panel="ocr"]').click();await page.locator('#ocr-word').selectOption('27');await page.locator('#threshold').fill('50');await page.locator('#threshold').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#threshold').inputValue(),'51');await page.locator('#threshold').fill('50');
  await page.locator('[data-panel="semantic"]').click();await page.locator('#semantic-document').selectOption('RUNBOOK');await page.locator('#semantic-boundary').selectOption('12');await page.locator('#semantic-threshold').fill('0.35');await page.locator('#semantic-threshold').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#semantic-threshold').inputValue(),'0.36');await page.locator('#semantic-threshold').fill('0.35');
  await page.locator('[data-panel="overlap"]').click();await page.locator('#overlap-document').selectOption('RUNBOOK');await page.locator('#overlap-policy').selectOption('overlap8');await page.locator('#overlap-chunk').selectOption('1');
  await page.locator('[data-panel="retrieval"]').click();await page.locator('#retrieval-query').selectOption('Q04');await page.locator('#retrieval-strategy').selectOption('overlap8');await page.locator('#retrieval-k').fill('3');await page.locator('#retrieval-k').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#retrieval-k').inputValue(),'4');await page.locator('#retrieval-k').fill('3');
  for(const panel of ['pdf','ocr','layout','html','provenance','dedup','size','semantic','overlap','retrieval']){await page.locator(`[data-panel="${panel}"]`).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const image=page.locator('#'+panel+' svg image');if(await image.count())await image.evaluate(async node=>{const img=new Image();img.src=new URL(node.href.baseVal,document.baseURI).href;await img.decode();});
   await page.screenshot({path:out+'/'+width+'-'+panel+'.png',fullPage:true});
  }
  await page.locator('[data-panel="ocr"]').click();const region=page.getByRole('region',{name:'Palabras OCR y confidence'}),horizontal=await region.evaluate(node=>node.scrollWidth>node.clientWidth);await region.focus();await page.keyboard.press(horizontal?'ArrowRight':'ArrowDown');await page.waitForFunction(horizontal=>{const node=document.getElementById('ocr-table').closest('.scroll');return horizontal?node.scrollLeft>0:node.scrollTop>0;},horizontal);
  assert.deepEqual(errors,[]);report.push({width,...counts,keyboard:true,localScroll:true,errors});console.log(JSON.stringify({width,...counts,errors}));await page.close();
 }
 const page=await browser.newPage({viewport:{width:360,height:520}});
 for(const article of manifest.articles){await page.goto('http://127.0.0.1:4322/assets/visuals/document-ingestion/'+article.id+'.svg');await page.evaluate(async()=>{scrollTo(0,0);await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('text')].filter(node=>{const box=node.getBBox();return box.x<0||box.y<0||box.x+box.width>360||box.y+box.height>520;}).map(node=>node.textContent)),[]);await page.screenshot({path:out+'/'+article.id+'-diagram.png'});}
 await page.setViewportSize({width:360,height:380});
 for(const file of ['extraction-counts.svg','ocr-confidence.svg','layout-order.svg','dedup-groups.svg','window-budgets.svg','semantic-boundaries.svg','overlap-cost.svg','retrieval-evidence.svg']){await page.setViewportSize({width:360,height:({'window-budgets.svg':520,'semantic-boundaries.svg':660,'overlap-cost.svg':420,'retrieval-evidence.svg':480}[file]??380)});await page.goto('http://127.0.0.1:4322/assets/interactive/document-ingestion/'+file);await page.evaluate(async()=>{scrollTo(0,0);await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});assert.deepEqual(await page.evaluate(()=>{const root=document.querySelector('svg').getBoundingClientRect();return [...document.querySelectorAll('text')].filter(node=>{const box=node.getBoundingClientRect();return box.left<root.left-.5||box.right>root.right+.5||box.top<root.top-.5||box.bottom>root.bottom+.5;}).map(node=>node.textContent);}),[],file);await page.screenshot({path:out+'/'+file+'.png'});}
 await page.close();
}finally{await browser.close();await writeFile(out+'/report.json',JSON.stringify({written:manifest.articles.length,planned:manifest.plannedIds.length,report},null,2)+'\n');console.log(out+'/report.json');}
