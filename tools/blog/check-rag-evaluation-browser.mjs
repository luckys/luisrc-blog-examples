import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import assert from 'node:assert/strict';
const contextPack=JSON.parse(await readFile('packages/rag-evaluation/context-data.json'));
const rankingPack=JSON.parse(await readFile('packages/rag-evaluation/ranking-data.json'));
const manifest=JSON.parse(await readFile('docs/editorial/rag-evaluation-series.json'));
const pack=JSON.parse(await readFile('packages/rag-evaluation/viewer-data.json')),out=await mkdtemp('/tmp/rag-evaluation-layout.'),report=[],origin='http://127.0.0.1:4322',base=origin+'/assets/interactive/rag-evaluation/';
const browser=await chromium.launch({headless:true});
try{
 for(const width of [360,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(origin+'/posts/evaluar-rag-gold-dataset-splits-etiquetas');assert.equal(response.status(),200);assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);
  await page.locator('article img').evaluateAll(images=>images.forEach(i=>i.loading='eager'));await page.waitForFunction(()=>[...document.querySelectorAll('article img')].every(i=>i.complete&&i.naturalWidth>0));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/'+width+'-post.png',fullPage:true});
  for(const article of manifest.articles.slice(1)){
   const response=await page.goto(origin+'/posts/'+article.slug);assert.equal(response.status(),200);assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);
   await page.locator('article img').evaluateAll(images=>images.forEach(i=>i.loading='eager'));await page.waitForFunction(()=>[...document.querySelectorAll('article img')].every(i=>i.complete&&i.naturalWidth>0));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(article.id==='RAG-RECALL-PRECISION'){const region=page.getByRole('region',{name:'Resultados por cutoff con desplazamiento horizontal'});if(await region.evaluate(n=>n.scrollWidth>n.clientWidth)){await region.focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('[aria-label="Resultados por cutoff con desplazamiento horizontal"]').scrollLeft>0);}}
   await page.screenshot({path:out+'/'+width+'-'+article.id+'.png',fullPage:true});
  }
  await page.goto(base+'viewer.html');await page.locator('#grade-chart svg').waitFor();
  const checked=await page.evaluate(pack=>{
   const $=id=>document.getElementById(id),eq=(a,b,label)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(label);},change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new Event('change',{bubbles:true}));};
   let queries=0,documents=0;
   eq(JSON.parse($('dataset-manifest').textContent),{manifest:pack.data.manifest,report:pack.report},'Dataset provenance');
   for(const query of pack.data.queries.rows){
    change('dataset-split',query.split);change('dataset-query',query.id);const gold=pack.data.gold.rows.find(g=>g.queryId===query.id);
    eq($('question').textContent,query.question,'Exact question');eq($('query-status').textContent,query.id+' · '+query.split+' · grupo '+query.group+' · '+gold.answerability,'Split and answerability');eq($('review-note').textContent,gold.reviewNote,'Annotation note');eq(JSON.parse($('qrels').textContent),gold.qrels,'All 16 judgments');
    eq([...$('required-facts').querySelectorAll('li')].map(n=>n.textContent),gold.requiredFactIds.length?gold.requiredFactIds.map(id=>{const f=pack.data.corpus.facts.find(r=>r.id===id);return id+' · '+f.documentId+' ['+f.start+','+f.end+') · '+f.quote;}):['No hay hechos de referencia que respondan a esta pregunta.'],'Exact evidence ranges');
    const counts=[0,1,2].map(g=>gold.qrels.filter(r=>r.grade===g).length),svg=$('grade-chart').querySelector('svg');eq(svg.getAttribute('aria-label'),'Documentos por grado 0,1,2: '+counts.join(', '),'Grade chart label');eq([...svg.querySelectorAll('rect')].slice(1).map(r=>Number(r.getAttribute('width'))),counts.map(n=>n*13),'Grade bar geometry');
    eq([...$('dataset-query').options].map(n=>n.value),pack.data.queries.rows.filter(q=>q.split===query.split).map(q=>q.id),'No cross-split options');queries++;
    if(document.documentElement.scrollWidth>innerWidth)throw Error('Query overflow');
   }
   for(const source of pack.data.corpus.documents){change('dataset-document',source.id);eq($('document-text').textContent,source.body,'Full corpus body');eq(JSON.parse($('document-metadata').textContent),{id:source.id,group:source.group,revision:source.revision},'Document version');documents++;if(document.documentElement.scrollWidth>innerWidth)throw Error('Document overflow');}
   return{queries,documents};
  },pack);
  await page.locator('#dataset-split').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#dataset-split').inputValue(),'dev');await page.keyboard.press('End');assert.equal(await page.locator('#dataset-split').inputValue(),'test');await page.locator('#dataset-query').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#dataset-query').inputValue(),'Q005');await page.keyboard.press('End');assert.equal(await page.locator('#dataset-query').inputValue(),'Q020');
  for(const query of ['Q007','Q008','Q018']){await page.locator('#dataset-query').selectOption(query);await page.screenshot({path:out+'/'+width+'-'+query+'.png',fullPage:true});}
  await page.locator('#dataset-document').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#dataset-document').inputValue(),'backups-1');await page.keyboard.press('End');assert.equal(await page.locator('#dataset-document').inputValue(),'pagination-2');assert.deepEqual(errors,[]);report.push({width,...checked,noindex:true,noOverflow:true,keyboard:true,errors});await page.goto(base+'ranking.html');await page.locator('#ranking-chart svg').waitFor();
  const rankingChecked=await page.evaluate(pack=>{
   const $=id=>document.getElementById(id),keys=['precision','recall','rr','ndcg'],eq=(a,b,label)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(label);},change=(id,value)=>{$(id).value=String(value);$(id).dispatchEvent(new Event('change',{bubbles:true}));};let evaluations=0,focusViews=0;
   for(const mode of ['native','control']){
    change('ranking-mode',mode);const native=mode==='native',rows=native?pack.capture.rows:pack.controls.rows;
    eq([...$('ranking-query').options].map(n=>n.value),rows.map(r=>r.queryId??r.id),'Exact case options');
    for(const row of rows){
     change('ranking-query',row.queryId??row.id);
     for(const m of row.evaluations){
      change('ranking-cutoff',m.k);
      for(const focus of keys){
       change('ranking-focus',focus);const values=Object.fromEntries(keys.map(key=>[key,m[key]]));
       eq(JSON.parse($('metric-numbers').textContent),{k:m.k,returned:m.returned,missingSlots:m.missingSlots,hits:m.hits,relevantTotal:m.relevantTotal,firstRelevantRank:m.firstRelevantRank,...values,dcg:m.dcg,idcg:m.idcg},'Exact scalar metrics');
       eq($('ranking-origin').textContent,native?'Búsqueda BM25 guardada · '+row.queryId+' · '+row.split:'Control redactado · '+row.id+' · no es una búsqueda ni una generación','Origin label');eq($('ranking-question').textContent,row.question??row.label,'Question or authored label');
       eq([...$('ranking-items').querySelectorAll('strong')].map(n=>n.textContent),m.positions.map(p=>p.id+' · grado '+p.grade),'Actual ranked IDs/grades');
       eq([...$('ranking-items').querySelectorAll('li p:last-child')].map(n=>n.textContent),m.positions.map(p=>native?pack.corpus.documents.find(d=>d.id===p.id).body:'ID ficticio de un control escrito; no documento recuperado.'),'Whole source or labelled control');
       eq(JSON.parse($('ranking-ideal').textContent),m.ideal,'Ideal from all qrels');
       const qrels=native?pack.gold.rows.find(g=>g.queryId===row.queryId).qrels:row.qrels;eq(JSON.parse($('ranking-record').textContent),{kind:native?pack.capture.kind:pack.controls.kind,row,qrels},'Unmodified raw record');
       if(native)eq(JSON.parse($('ranking-summary').textContent),pack.capture.summaries.find(s=>s.split===row.split&&s.k===m.k),'Exact split denominator');else eq($('ranking-summary').textContent,'Control individual redactado. No se mezcla con las medias de las veinte búsquedas.','Controls not pooled');
       const svg=$('ranking-chart').querySelector('svg'),defined=keys.filter(key=>m[key]!==null),bars=[...svg.querySelectorAll('rect[data-metric]')];eq(svg.getAttribute('aria-label'),'Métricas con null no definido: '+JSON.stringify(values),'Null-aware graph');eq(bars.map(n=>n.getAttribute('data-metric')),defined,'No bars for null');eq(bars.map(n=>Number(n.getAttribute('width'))),defined.map(key=>m[key]*190),'Metric geometry');eq(bars.map(n=>n.getAttribute('fill')),defined.map(key=>key===focus?'#fbbf24':'#38bdf8'),'Selected metric highlight');
       if(document.documentElement.scrollWidth>innerWidth)throw Error('Ranking viewport overflow');focusViews++;
      }
      evaluations++;
     }
    }
   }
   return{rankingEvaluations:evaluations,focusViews};
  },rankingPack);
  await page.locator('#ranking-mode').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#ranking-mode').inputValue(),'native');await page.keyboard.press('End');assert.equal(await page.locator('#ranking-mode').inputValue(),'control');await page.locator('#ranking-query').focus();await page.keyboard.press('End');assert.equal(await page.locator('#ranking-query').inputValue(),'C08');await page.locator('#ranking-cutoff').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#ranking-cutoff').inputValue(),'1');await page.keyboard.press('End');assert.equal(await page.locator('#ranking-cutoff').inputValue(),'5');await page.locator('#ranking-focus').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#ranking-focus').inputValue(),'precision');await page.keyboard.press('End');assert.equal(await page.locator('#ranking-focus').inputValue(),'ndcg');
  for(const[mode,id,k,focus]of [['native','Q008','1','rr'],['native','Q002','3','recall'],['control','C06','3','ndcg'],['control','C07','3','ndcg'],['control','C04','3','precision']]){await page.locator('#ranking-mode').selectOption(mode);await page.locator('#ranking-query').selectOption(id);await page.locator('#ranking-cutoff').selectOption(k);await page.locator('#ranking-focus').selectOption(focus);await page.screenshot({path:out+'/'+width+'-ranking-'+id+'.png',fullPage:true});}
  assert.deepEqual(errors,[]);report.push({width,...rankingChecked,keyboard:true,errors});
  await page.goto(base+'context.html');await page.locator('#context-graph svg').waitFor();
  const contextCases=await page.evaluate(pack=>{
   const $=id=>document.getElementById(id),eq=(a,b,message)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(message);},change=(id,value)=>{$(id).value=String(value);$(id).dispatchEvent(new Event('change',{bubbles:true}));};
   eq([...$('context-tokenizer').options].map(n=>n.value),pack.tokenizers.tokenizers.map(p=>p.id),'Tokenizer profiles');eq([...$('context-query').options].map(n=>n.value),pack.queries.rows.map(q=>q.id),'Context queries');
   for(const row of pack.capture.rows){
    change('context-tokenizer',row.tokenizerId);change('context-query',row.queryId);change('context-limit',row.inputLimit);const label=pack.gold.rows.find(g=>g.queryId===row.queryId),query=pack.queries.rows.find(q=>q.id===row.queryId),m=row.metrics;
    const profile=pack.tokenizers.tokenizers.find(p=>p.id===row.tokenizerId);eq(JSON.parse($('context-profile').textContent),{id:profile.id,repository:profile.repository,revision:profile.revision,library:pack.tokenizers.library,libraryVersion:pack.tokenizers.libraryVersion,weightsLoaded:false},'Pinned tokenizer identity');
    eq($('context-state').textContent,row.result.status==='ready'?'Entrada con fuentes admitidas; no demuestra que permitan responder todos los puntos.':row.result.status==='empty_context'?(row.result.emptyReason==='no_candidates'?'Entrada admitida sin fuentes: la búsqueda no produjo candidatos.':'Entrada admitida sin fuentes: ninguna fuente completa cabe en este límite.'):'Base demasiado grande: no hay prompt operativo.','Human-readable context state');
    eq($('context-origin').textContent,'Contexto guardado · tokenizer '+row.tokenizerId+' · '+row.queryId+' · '+row.split+' · límite '+row.inputLimit,'Context origin');eq($('context-question').textContent,query.question,'Context question');eq(JSON.parse($('context-metrics').textContent),m,'Three distinct metric denominators');
    eq([...$('context-candidates').querySelectorAll('li')].map(n=>n.textContent),row.candidateIds.map(id=>id+' · '+(row.result.selectedIds.includes(id)?'seleccionado':'no entra en esta composición')),'Unchanged retrieval candidates');
    eq([...$('context-sources').querySelectorAll('strong')].map(n=>n.textContent),row.result.selectedIds.map(id=>{const d=pack.corpus.documents.find(d=>d.id===id);return id+' · revisión '+d.revision;}),'Canonical selected sources');eq([...$('context-sources').querySelectorAll('li p')].map(n=>n.textContent),row.result.selectedIds.map(id=>pack.corpus.documents.find(d=>d.id===id).body),'Whole literal source text');
    eq([...$('context-sources').querySelectorAll('mark')].reduce((n,r)=>n+r.textContent.length,0),m?.requiredEvidenceUnits??0,'Highlight union UTF16 units');
    eq(JSON.parse($('context-reference').textContent),{answerability:label.answerability,requiredFactIds:label.requiredFactIds,coveredFactIds:m?.coveredFactIds??null,unit:'gold de evaluación; no datos enviados al modelo'},'Gold excluded from prompt');
    if(row.result.messages)eq(JSON.parse($('context-messages').textContent),row.result.messages,'Exact admitted message boundaries');else eq($('context-messages').textContent,'No hay mensajes admitidos.','No operational messages');eq($('context-prompt').textContent,row.result.prompt??'No hay prompt admitido.','Exact chat template');eq(JSON.parse($('context-ids').textContent),row.result.inputIds,'Real token IDs');eq(JSON.parse($('context-trials').textContent),{attempts:row.result.attempts,diagnosticInputTokens:row.result.diagnosticInputTokens,measurements:row.measurements},'All measured attempts');
    const input=row.result.diagnosticInputTokens??row.result.inputIds.length,values=m?{documents:m.selectedDocumentRelevance,facts:m.requiredFactCoverage,text:m.requiredEvidenceShareOfSourceText}:null,svg=$('context-graph').querySelector('svg'),domain=Math.max(input,row.inputLimit),scale=300/domain;eq(svg.getAttribute('aria-label'),'Entrada '+input+'; límite '+row.inputLimit+'; ratios '+JSON.stringify(values),'Budget and null accessible values');eq(Number(svg.querySelector('[data-bar="limit"]').getAttribute('width')),row.inputLimit*scale,'Budget width');eq(Number(svg.querySelector('[data-bar="input"]').getAttribute('width')),input*scale,'Measured complete-chat width');
    const keys=['documents','facts','text'].filter(key=>values?.[key]!==null&&values?.[key]!==undefined),bars=[...svg.querySelectorAll('rect[data-ratio]')];eq(bars.map(n=>n.getAttribute('data-ratio')),keys,'Undefined is not zero');eq(bars.map(n=>Number(n.getAttribute('width'))),keys.map(key=>values[key]*240),'Proxy ratio geometry');
    if(document.documentElement.scrollWidth>innerWidth)throw Error('Context viewport overflow');
   }
   return pack.capture.rows.length;
  },contextPack);
  await page.locator('#context-tokenizer').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#context-tokenizer').inputValue(),'A');await page.keyboard.press('End');assert.equal(await page.locator('#context-tokenizer').inputValue(),'B');await page.locator('#context-query').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#context-query').inputValue(),'Q001');await page.keyboard.press('End');assert.equal(await page.locator('#context-query').inputValue(),'Q020');await page.locator('#context-limit').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#context-limit').inputValue(),'256');await page.keyboard.press('End');assert.equal(await page.locator('#context-limit').inputValue(),'1536');
  await page.locator('#context-tokenizer').selectOption('A');for(const[id,limit]of [['Q008','256'],['Q008','384'],['Q007','1536'],['Q018','1536']]){await page.locator('#context-query').selectOption(id);await page.locator('#context-limit').selectOption(limit);await page.screenshot({path:out+'/'+width+'-context-'+id+'-'+limit+'.png',fullPage:true});}assert.deepEqual(errors,[]);report.push({width,contextCases,keyboard:true,errors});
  await page.close();
 }
 const page=await browser.newPage();
 for(const figure of [{name:'P116',url:origin+'/assets/visuals/rag-evaluation/P116.svg',height:760},{name:'split-counts',url:base+'split-counts.svg',height:460},...['RAG-RECALL-PRECISION','RAG-MRR','RAG-NDCG'].map((id,i)=>({name:id,url:origin+'/assets/visuals/rag-evaluation/'+id+'.svg',height:[750,750,850][i]})),{name:'precision-recall',url:base+'precision-recall.svg',height:620},{name:'mrr-coverage',url:base+'mrr-coverage.svg',height:620},{name:'ndcg-controls',url:base+'ndcg-controls.svg',height:540},{name:'RAG-CONTEXT-RELEVANCE',url:origin+'/assets/visuals/rag-evaluation/RAG-CONTEXT-RELEVANCE.svg',height:850},{name:'context-budgets',url:base+'context-budgets.svg',height:620},{name:'context-docs-facts',url:base+'context-docs-facts.svg',height:570}]){
  await page.setViewportSize({width:360,height:figure.height});await page.goto(figure.url);await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  const overflow=await page.evaluate(()=>{const root=document.querySelector('svg').getBoundingClientRect();return[...document.querySelectorAll('text')].filter(n=>{const b=n.getBoundingClientRect();return b.left<root.left-.5||b.right>root.right+.5||b.top<root.top-.5||b.bottom>root.bottom+.5;}).map(n=>n.textContent);});assert.deepEqual(overflow,[],figure.name);await page.screenshot({path:out+'/'+figure.name+'.png'});
 }
 await page.close();
}finally{await browser.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(out+'/report.json');}
