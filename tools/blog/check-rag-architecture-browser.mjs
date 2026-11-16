import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import assert from 'node:assert/strict';
const data=JSON.parse(await readFile('packages/rag-architecture/viewer-data.json'));
const dataConversation=JSON.parse(await readFile('packages/rag-architecture/results/conversation.json'));
const dataMultistep=JSON.parse(await readFile('packages/rag-architecture/multistep-data.json'));
const dataCache=JSON.parse(await readFile('packages/rag-architecture/results/cache.json'));
const dataUpdates=JSON.parse(await readFile('packages/rag-architecture/results/updates.json'));
const dataArchitecture=JSON.parse(await readFile('packages/rag-architecture/results/generation-contracts.json'));
const dataContext=JSON.parse(await readFile('packages/rag-architecture/context-data.json'));
const manifest=JSON.parse(await readFile('docs/editorial/rag-architecture-series.json'));
const out=await mkdtemp('/tmp/rag-architecture-layout.'),report=[],origin='http://127.0.0.1:4322',base=origin+'/assets/interactive/rag-architecture/';
const browser=await chromium.launch({headless:true});
try{
 for(const width of [360,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  for(const article of manifest.articles){
   const response=await page.goto(origin+'/posts/'+article.slug);assert.equal(response.status(),200);
   assert.ok((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'));
   await page.locator('article img').evaluateAll(images=>images.forEach(image=>image.loading='eager'));
   await page.waitForFunction(()=>[...document.querySelectorAll('article img')].every(i=>i.complete&&i.naturalWidth>0));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(article.id==='RAG-CONVERSATION'){
    const history=page.getByRole('region',{name:'Elementos del historial, utilidad y límites'});
    if(await history.evaluate(n=>n.scrollWidth>n.clientWidth)){await history.focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('[aria-label="Elementos del historial, utilidad y límites"]').scrollLeft>0);}
   }
   await page.screenshot({path:out+'/'+width+'-'+article.id+'.png',fullPage:true});
   report.push({id:article.id,width,status:200,noindex:true,noOverflow:true});
  }
  await page.goto(base+'explorer.html');await page.locator('#counts svg').waitFor();
  const counts=await page.evaluate(data=>{
   const $=id=>document.getElementById(id),fail=message=>{throw Error(message);};
   const eq=(a,b,label)=>{if(JSON.stringify(a)!==JSON.stringify(b))fail(label);};
   const change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new Event('change',{bubbles:true}));};
   let requestCases=0,probeCases=0,relationCases=0;
   for(const row of data.capture.requests){
    change('layout',row.layout);change('role',row.identity.session_user);change('query',row.caseId);
    const selected=data.capture.requests.find(r=>r.caseId===$('query').value&&r.layout===$('layout').value);
    eq(selected.caseId,row.caseId,'Selected request');
    eq([...$('results').querySelectorAll('strong')].map(n=>n.textContent),row.rows.map(r=>r.id+' · score '+r.score),'Result identifiers and scores');
    eq([...$('results').querySelectorAll('p')].map(n=>n.textContent),row.rows.map(r=>r.body),'Exact result text');
    const probes=data.capture.probes.filter(p=>p.layout===row.layout&&p.role===row.identity.session_user);
    const db=data.capture.databases.find(d=>d.name===row.database),visible=probes.find(p=>p.label==='plain-select').rows.length;
    const values=[db.documentIds.length,visible,row.rows.length];
    const bars=[...$('counts').querySelectorAll('rect')].slice(1);
    eq(bars.map(b=>Number(b.getAttribute('height'))),values.map(v=>v*14),'Bar geometry');
    eq(bars.map(b=>Number(b.getAttribute('y'))),values.map(v=>230-v*14),'Bar positions');
    eq($('counts').querySelector('svg').getAttribute('aria-label'),'Documentos almacenados, visibles y devueltos: '+values.join(', '),'Accessible chart values');
    eq([...$('relations').rows].map(r=>[...r.cells].map(c=>c.textContent)),db.relations.map(r=>[r.relname,r.file,String(r.bytes),r.owner]),'Physical relations');
    const plan=data.capture.plans.find(p=>p.layout===row.layout&&p.role===row.identity.session_user);
    eq(JSON.parse($('plan').textContent),plan.plan,'Unmodified plan');
    if(!row.goldIds.length&&!$('status').textContent.includes('sin denominador'))fail('Empty gold is not zero recall');
    requestCases++;relationCases++;
   }
   for(const layout of ['global','isolated'])for(const principal of data.corpus.principals){
    change('layout',layout);change('role',principal.role);
    const probes=data.capture.probes.filter(p=>p.layout===layout&&p.role===principal.role);
    for(const [i,probe] of probes.entries()){change('probe',String(i));eq(JSON.parse($('probe-result').textContent),probe,'Exact access probe');probeCases++;}
   }
   eq(JSON.parse($('missing-principal').textContent),data.capture.probes.find(p=>p.label==='missing-principal'),'Missing principal');probeCases++;
   if(document.documentElement.scrollWidth>innerWidth)fail('Viewport overflow');
   return {requestCases,probeCases,relationCases};
  },data);
  await page.locator('#role').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#role').inputValue(),'alpha_reader');
  await page.locator('#layout').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#layout').inputValue(),'global');
  await page.locator('#query').focus();await page.keyboard.press('Home');assert.ok((await page.locator('#query').inputValue()).endsWith('Q01'));
  const region=page.getByRole('region',{name:'Tabla de objetos físicos con desplazamiento horizontal'}),horizontal=await region.evaluate(n=>n.scrollWidth>n.clientWidth);
  if(horizontal){await region.focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('.scroll').scrollLeft>0);}
  await page.screenshot({path:out+'/'+width+'-explorer.png',fullPage:true});
  assert.deepEqual(errors,[]);report.push({width,...counts,keyboard:true,localScroll:horizontal?'verified':'not_needed',errors});
  await page.goto(base+'conversation.html');await page.locator('#flow svg').waitFor();
  const conversationCases=await page.evaluate(data=>{
   const $=id=>document.getElementById(id),eq=(a,b,message)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(message);};
   for(const[index,c]of data.capture.cases.entries()){
    $('case').value=String(index);$('case').dispatchEvent(new Event('change',{bubbles:true}));
    eq(JSON.parse($('outcome').textContent),c.outcome,'Conversation outcome');eq(JSON.parse($('loads').textContent),c.loads,'Database source reads');
    eq(JSON.parse($('request').textContent),{role:c.role,principal:c.principal,question:c.question},'Principal and question');
    const values=[c.loads.length,c.loads.reduce((n,r)=>n+r.rows.length,0),c.outcome.evidence.length];
    eq([...$('flow').querySelectorAll('rect')].slice(1).map(n=>Number(n.getAttribute('width'))),values.map(n=>n*150),'Conversation bar geometry');
    eq($('flow').querySelector('svg').getAttribute('aria-label'),'Consultas de fuentes, filas leídas y fuentes en contexto: '+values.join(', '),'Accessible counts');
    eq([...$('evidence').querySelectorAll('li')].map(n=>n.textContent),c.outcome.evidence.length?c.outcome.evidence.map(r=>r.id+' · '+r.body):['No se entrega texto de ninguna fuente al contexto.'],'Context text');
    if(document.documentElement.scrollWidth>innerWidth)throw Error('Conversation overflow');
   }
   return data.capture.cases.length;
  },{capture:JSON.parse(await readFile('packages/rag-architecture/results/conversation.json'))});
  await page.locator('#case').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#case').inputValue(),'0');
  await page.screenshot({path:out+'/'+width+'-conversation.png',fullPage:true});
  const revoked=dataConversation.cases.findIndex(c=>c.kind==='revoked-manager');await page.locator('#case').selectOption(String(revoked));await page.screenshot({path:out+'/'+width+'-revoked.png',fullPage:true});assert.deepEqual(errors,[]);report.push({width,conversationCases,keyboard:true,errors});
  await page.goto(base+'multistep.html');await page.locator('#calls svg').waitFor();
  const workflows=await page.evaluate(data=>{
   const $=id=>document.getElementById(id),eq=(a,b,message)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(message);};let prefixCases=0;
   for(const[index,row]of data.capture.rows.entries()){
    $('workflow').value=String(index);$('workflow').dispatchEvent(new Event('change',{bubbles:true}));const entry=data.cases.find(c=>c.id===row.caseId);
    eq(JSON.parse($('config').textContent),{role:row.role,query:entry.query,requiredKeys:entry.requiredKeys,maxCalls:entry.maxCalls,maxSources:entry.maxSources,maxQueuedReferences:entry.maxQueuedReferences,sourceCalls:row.result.calls},'Workflow contract');
    eq(JSON.parse($('trace').textContent),row.result.trace,'Workflow trace');
    for(let step=0;step<=row.queries.length;step++){
     $('step').value=String(step);$('step').dispatchEvent(new Event('input',{bubbles:true}));const prefix=row.queries.slice(0,step),documents=new Map();for(const query of prefix)for(const doc of query.rows)documents.set(doc.id,doc);
     eq(JSON.parse($('queries').textContent),prefix,'Source reads prefix');eq($('step-count').textContent,step+' / '+row.queries.length,'Replayed call count');
     eq([...$('sources').querySelectorAll('li')].map(n=>n.textContent),documents.size?[...documents.values()].map(d=>d.id+' · '+d.body):['No se han recuperado fuentes en este prefijo.'],'Workflow source text');
     eq($('calls').querySelector('svg').getAttribute('aria-label'),'Llamadas guardadas: '+row.queries.length+'; reproducidas: '+step,'Workflow accessible states');
     eq([...$('calls').querySelectorAll('circle')].map(n=>n.getAttribute('fill')),row.queries.map((_,i)=>i<step?'#38bdf8':'#475569'),'Workflow node state');
     const coverage=entry.goldAuthorizedIds.length?entry.goldAuthorizedIds.filter(id=>documents.has(id)).length/entry.goldAuthorizedIds.length:null;
     eq($('coverage').textContent,'Cobertura de IDs relevantes autorizados en este prefijo: '+(coverage===null?'sin denominador (gold vacío)':coverage)+'.','Prefix coverage');
     if(document.documentElement.scrollWidth>innerWidth)throw Error('Workflow overflow');prefixCases++;
    }
   }
   return{workflowCases:data.capture.rows.length,prefixCases};
  },dataMultistep);
  await page.locator('#workflow').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#workflow').inputValue(),'0');await page.locator('#step').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#step').inputValue(),'0');await page.keyboard.press('End');assert.equal(await page.locator('#step').inputValue(),'1');await page.screenshot({path:out+'/'+width+'-multistep.png',fullPage:true});await page.locator('#workflow').selectOption('1');await page.locator('#step').fill('1');await page.locator('#step').dispatchEvent('input');assert.equal(await page.locator('#step-count').textContent(),'1 / 2');await page.screenshot({path:out+'/'+width+'-multistep-prefix.png',fullPage:true});assert.deepEqual(errors,[]);report.push({width,...workflows,keyboard:true,errors});
  await page.goto(base+'cache.html');await page.locator('#counts svg').waitFor();
  const cacheCases=await page.evaluate(data=>{
   const $=id=>document.getElementById(id),eq=(a,b,message)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(message);};
   for(const[index,row]of data.rows.entries()){
    $('cache-case').value=String(index);$('cache-case').dispatchEvent(new Event('change',{bubbles:true}));
    eq(JSON.parse($('scope').textContent),{principal:row.principal,state:row.state},'Cache trusted scope');eq(JSON.parse($('queries').textContent),row.queries,'Cache source operations');eq(JSON.parse($('record').textContent),row,'Cache raw record');
    eq([...$('key').querySelectorAll('dd')].map(n=>n.textContent),JSON.parse(row.key).map(String),'Cache key dimensions');
    const values=[row.queries.length,row.result?.rows.length??0];eq([...$('counts').querySelectorAll('rect')].slice(1).map(n=>Number(n.getAttribute('width'))),values.map(n=>n*140),'Cache counts geometry');eq($('counts').querySelector('svg').getAttribute('aria-label'),'Consultas de fuentes y documentos devueltos: '+values.join(', '),'Cache accessible counts');
    const expected=row.result?.rows.length?row.result.rows.map(d=>d.id+' · '+d.body):[row.error?'La lectura falló y no se guardó un resultado.':'Resultado correcto sin documentos autorizados coincidentes.'];eq([...$('results').querySelectorAll('li')].map(n=>n.textContent),expected,'Cache output or failure');
    if(!row.lookup.previousExpiresAtMs)eq($('expiry').textContent,'No había una entrada para esta clave.','Missing entry');
    if(document.documentElement.scrollWidth>innerWidth)throw Error('Cache overflow');
   }
   return data.rows.length;
  },dataCache);
  await page.locator('#cache-case').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#cache-case').inputValue(),'0');await page.screenshot({path:out+'/'+width+'-cache.png',fullPage:true});await page.locator('#cache-case').selectOption('20');await page.screenshot({path:out+'/'+width+'-cache-expired.png',fullPage:true});assert.deepEqual(errors,[]);report.push({width,cacheCases,keyboard:true,errors});
  await page.goto(base+'updates.html');await page.locator('#timeline-graph svg').waitFor();
  const updates=await page.evaluate(data=>{
   const $=id=>document.getElementById(id),eq=(a,b,message)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(message);},change=(id,value,event='change')=>{$(id).value=String(value);$(id).dispatchEvent(new Event(event,{bubbles:true}));};
   for(let step=1;step<=data.events.length;step++){
    change('event',step,'input');const prefix=data.events.slice(0,step);let state={generation:'v1',indexRevision:data.revisions.v1,accessRevision:1};
    for(const e of prefix){if(e.kind==='activation-committed')state=e.after;if(e.kind==='acl-and-epoch-committed')state={generation:e.state.generation,indexRevision:e.state.index_revision,accessRevision:e.state.access_revision};}
    const candidate=prefix.some(e=>e.kind==='candidate-completed')?12:11;
    eq(JSON.parse($('event-record').textContent),data.events[step-1],'Activation event');eq($('event-count').textContent,step+' / '+data.events.length,'Event count');
    eq($('pointer').textContent,'Referencia global tras estos eventos: '+state.generation+' · revisión de acceso '+state.accessRevision+'.','Committed global pointer');
    eq([...$('timeline-graph').querySelectorAll('rect')].slice(1).map(n=>Number(n.getAttribute('height'))),[12*15,candidate*15],'Activation chart geometry');
    eq($('timeline-graph').querySelector('svg').getAttribute('aria-label'),'Documentos de la versión activa y de la candidata: 12, '+candidate+'; activa: '+state.generation,'Accessible activation state');
    if(document.documentElement.scrollWidth>innerWidth)throw Error('Timeline overflow');
   }
   document.querySelector('[data-panel="reads"]').click();eq($('reads').hidden,false,'Read panel');
   for(const[index,row]of data.reads.entries()){
    change('read',index);eq(JSON.parse($('read-scope').textContent),{role:row.role,principal:row.principal,state:row.state,snapshot:row.identity.snapshot},'Bound request scope');eq(JSON.parse($('read-record').textContent),row,'Raw request');
    eq([...$('read-results').querySelectorAll('li')].map(n=>n.textContent),row.result.rows.length?row.result.rows.map(d=>d.id+' · '+d.body):['No se entrega texto de fuentes.'],'Generation source text');
    if(document.documentElement.scrollWidth>innerWidth)throw Error('Read overflow');
   }
   document.querySelector('[data-panel="citations"]').click();eq($('citations').hidden,false,'Citation panel');
   for(const[index,row]of data.citations.entries()){
    change('citation',index);eq(JSON.parse($('citation-reference').textContent),{role:row.role,reference:row.reference,accessRevision:row.state.accessRevision},'Historical reference');eq(JSON.parse($('citation-record').textContent),row,'Native citation reads');
    eq([...$('citation-results').querySelectorAll('li')].map(n=>n.textContent),row.rows.length?row.rows.map(d=>d.id+' · '+d.body):['No se entrega texto de fuentes.'],'Current ACL citation text');
    if(document.documentElement.scrollWidth>innerWidth)throw Error('Citation overflow');
   }
   return{activationEvents:data.events.length,generationReads:data.reads.length,historicalCitations:data.citations.length};
  },dataUpdates);
  await page.locator('[data-panel="timeline"]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('[data-panel="timeline"]').getAttribute('aria-pressed'),'true');await page.locator('#event').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#event').inputValue(),'1');await page.keyboard.press('End');assert.equal(await page.locator('#event').inputValue(),'67');await page.screenshot({path:out+'/'+width+'-updates-timeline.png',fullPage:true});
  await page.locator('[data-panel="reads"]').click();await page.locator('#read').selectOption('3');await page.screenshot({path:out+'/'+width+'-updates-old-read.png',fullPage:true});await page.locator('[data-panel="citations"]').click();await page.locator('#citation').selectOption('5');await page.screenshot({path:out+'/'+width+'-updates-restricted.png',fullPage:true});assert.deepEqual(errors,[]);report.push({width,...updates,keyboard:true,errors});
  await page.goto(base+'context.html');await page.locator('#budget svg').waitFor();
  const contextCases=await page.evaluate(data=>{
   const $=id=>document.getElementById(id),eq=(a,b,message)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(message);},close=(a,b)=>{if(Math.abs(a-b)>1e-7)throw Error('Context geometry');},change=(id,value)=>{$(id).value=String(value);$(id).dispatchEvent(new Event('change',{bubbles:true}));};
   for(const row of data.capture.rows){
    change('context-scenario',row.scenarioId);change('context-window',row.windowTokens);change('context-policy',row.policy);const result=row.result,scenario=data.inputs.scenarios.find(s=>s.id===row.scenarioId);
    eq(JSON.parse($('context-scope').textContent),{principal:scenario.principal,authorizationContext:scenario.authorizationContext,historyOrigin:data.inputs.historyOrigin,rankingOrigin:data.inputs.rankingOrigin},'Context origin/scope');
    eq($('context-prompt').textContent,result.prompt??'No hay prompt admitido.','Exact complete chat');eq(JSON.parse($('context-token-ids').textContent),result.inputIds,'Exact token IDs');eq(JSON.parse($('context-trials').textContent),{trials:result.trials,rejectedBase:result.rejectedBase??null},'Packing trials and rejected base');
    if(result.messages)eq(JSON.parse($('context-messages').textContent),result.messages,'Role boundaries');else eq($('context-messages').textContent,'No hay mensajes admitidos.','No admitted roles');
    eq([...$('evidence').querySelectorAll('li')].map(n=>n.textContent),result.selected.length?result.selected.map(alias=>{const reg=result.registry.find(r=>r.alias===alias),source=scenario.sources.find(s=>s.id===reg.id);return alias+' · '+source.id+' · '+source.text;}):['No se seleccionan fuentes para este caso.'],'Whole selected sources');
    const svg=$('budget').querySelector('svg');if(result.status==='rejected_scope'){eq(svg.getAttribute('aria-label'),'Ámbito rechazado: sin tokenización','No tokenization');eq(svg.querySelectorAll('rect').length,1,'No measured token bar');}
    else{const input=result.rejectedBase?.inputIds.length??result.inputIds.length,reserve=row.reservedOutputTokens,domain=Math.ceil(Math.max(row.windowTokens,input+reserve)/64)*64,scale=300/domain,rects=[...svg.querySelectorAll('rect')].slice(2);eq(svg.getAttribute('aria-label'),'Entrada medida: '+input+'; reserva: '+reserve+'; límite: '+row.windowTokens+'; escala: '+domain,'Measured complete input or diagnostic');close(Number(rects[0].getAttribute('width')),input*scale);close(Number(rects[1].getAttribute('width')),reserve*scale);close(Number(rects[1].getAttribute('x')),30+input*scale);close(Number(svg.querySelector('line').getAttribute('x1')),30+row.windowTokens*scale);}
    if(document.documentElement.scrollWidth>innerWidth)throw Error('Context overflow');
   }
   return data.capture.rows.length;
  },dataContext);
  await page.locator('#context-scenario').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#context-scenario').inputValue(),'T01');await page.locator('#context-window').focus();await page.keyboard.press('End');assert.equal(await page.locator('#context-window').inputValue(),'512');await page.locator('#context-policy').focus();await page.keyboard.press('End');assert.equal(await page.locator('#context-policy').inputValue(),'evidence_first');
  await page.locator('#context-scenario').selectOption('T05');await page.locator('#context-window').selectOption('320');for(const policy of ['history_first','evidence_first']){await page.locator('#context-policy').selectOption(policy);await page.screenshot({path:out+'/'+width+'-context-'+policy+'.png',fullPage:true});}
  for(const id of ['T08','T09']){await page.locator('#context-scenario').selectOption(id);await page.screenshot({path:out+'/'+width+'-context-'+id+'.png',fullPage:true});}assert.deepEqual(errors,[]);report.push({width,contextCases,keyboard:true,errors});
  await page.goto(base+'architecture.html');await page.locator('#contract-graph svg').waitFor();
  const contracts=await page.evaluate(data=>{
   const $=id=>document.getElementById(id),eq=(a,b,message)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(message);},change=(id,value)=>{$(id).value=String(value);$(id).dispatchEvent(new Event('change',{bubbles:true}));};
   let layerViews=0;
   for(const[index,row]of data.rows.entries()){
    change('contract-case',index);const descriptor=row.descriptor,prepared=descriptor.status==='prepared_not_executed';
    for(const[layerIndex,layer]of ['data','prompt','weights'].entries()){
     change('contract-layer',layer);eq(JSON.parse($('contract-record').textContent),descriptor,'Unmodified descriptor');
     const summary=prepared?{executed:descriptor.executed,provenance:descriptor.provenance,inputTokens:descriptor.inputTokens,maxNewTokens:descriptor.maxNewTokens,promptHash:descriptor.promptHash,provenanceHash:descriptor.provenanceHash}:{status:descriptor.status,reason:descriptor.reason,executed:false};
     eq(JSON.parse($('contract-summary').textContent),summary,'Exact version metadata');eq(descriptor.executed,false,'No generation execution');
     eq($('contract-status').textContent,prepared?'Descriptor preparado, sin ejecución del modelo':'No se prepara generación · '+descriptor.reason,'Preparation status');
     eq([...$('contract-sources').querySelectorAll('li')].map(n=>n.textContent),prepared?descriptor.evidence.map(r=>r.alias+' · '+r.id+' · '+r.generation+' · revisión '+r.revision):['No hay un descriptor operativo para este contexto.'],'Reference registry');
     const svg=$('contract-graph').querySelector('svg'),rects=[...svg.querySelectorAll('rect')].slice(1);
     eq(svg.getAttribute('aria-label'),'Campos de metadata por responsabilidad; resaltada: '+layer+'; preparado: '+prepared,'Layer chart accessibility');
     eq(rects.map(n=>Number(n.getAttribute('y'))),[16,138,260],'Layer positions');eq(rects.map(n=>Number(n.getAttribute('height'))),[106,106,106],'Layer heights');
     eq(rects.map(n=>n.getAttribute('fill')),['data','prompt','weights'].map(id=>id===layer?'#0c4a6e':'#1e293b'),'Selected layer highlight');
     eq(rects.map(n=>n.getAttribute('stroke-width')),['0','1','2'].map((_,i)=>i===layerIndex?'2':'1'),'Highlight border');
     if(document.documentElement.scrollWidth>innerWidth)throw Error('Contract overflow');layerViews++;
    }
   }
   return{contractCases:data.rows.length,layerViews};
  },dataArchitecture);
  await page.locator('#contract-case').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#contract-case').inputValue(),'0');await page.keyboard.press('End');assert.equal(await page.locator('#contract-case').inputValue(),String(dataArchitecture.rows.length-1));
  await page.locator('#contract-layer').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#contract-layer').inputValue(),'data');await page.keyboard.press('End');assert.equal(await page.locator('#contract-layer').inputValue(),'weights');
  for(const status of ['prepared_not_executed','not_prepared']){const index=dataArchitecture.rows.findIndex(r=>r.descriptor.status===status);await page.locator('#contract-case').selectOption(String(index));await page.screenshot({path:out+'/'+width+'-architecture-'+status+'.png',fullPage:true});}
  assert.deepEqual(errors,[]);report.push({width,...contracts,keyboard:true,errors});
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:360,height:1000}});
 const figures=[...manifest.articles.map((a,i)=>({url:origin+'/assets/visuals/rag-architecture/'+a.id+'.svg',name:a.id,height:[670,630,730,690,820,800,820,850,810][i]})),...['request-counts.svg','visible-counts.svg','index-storage.svg'].map(name=>({url:base+name,name,height:460})),{url:base+'conversation-outcomes.svg',name:'conversation-outcomes.svg',height:470},{url:base+'multistep-stops.svg',name:'multistep-stops.svg',height:470},{url:base+'cache-lookups.svg',name:'cache-lookups.svg',height:440},{url:base+'updates-promotions.svg',name:'updates-promotions.svg',height:440},{url:base+'updates-views.svg',name:'updates-views.svg',height:460},{url:base+'context-priorities.svg',name:'context-priorities.svg',height:480},{url:base+'context-statuses.svg',name:'context-statuses.svg',height:440},{url:base+'architecture-interventions.svg',name:'architecture-interventions.svg',height:600}];
 for(const figure of figures){
  await page.setViewportSize({width:360,height:figure.height});await page.goto(figure.url);
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  const overflow=await page.evaluate(()=>{const root=document.querySelector('svg').getBoundingClientRect();return [...document.querySelectorAll('text')].filter(n=>{const box=n.getBoundingClientRect();return box.left<root.left-.5||box.right>root.right+.5||box.top<root.top-.5||box.bottom>root.bottom+.5;}).map(n=>n.textContent);});
  assert.deepEqual(overflow,[],figure.name);await page.screenshot({path:out+'/'+figure.name+'.png'});
 }
 await page.close();
}finally{
 await browser.close();await writeFile(out+'/report.json',JSON.stringify({drafts:manifest.articles.length,planned:manifest.plannedIds.length,report},null,2)+'\n');console.log(out+'/report.json');
}
