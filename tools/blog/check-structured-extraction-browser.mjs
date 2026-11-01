import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import assert from 'node:assert/strict';
const json=async p=>JSON.parse(await readFile(new URL('../../'+p,import.meta.url)));
const manifest=await json('docs/editorial/structured-extraction-series.json'),data=await json('packages/structured-extraction/viewer-data.json');
const out=await mkdtemp('/tmp/structured-layout.'),browser=await chromium.launch({headless:true}),report=[];
try{
 for(const width of [360,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const a of manifest.articles){
   const response=await page.goto('http://127.0.0.1:4322/posts/'+a.slug);assert.equal(response.status(),200);await page.locator('iframe').waitFor();assert.ok((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'));
   await page.locator('article img').evaluateAll(images=>images.forEach(i=>i.loading='eager'));await page.waitForFunction(()=>Array.from(document.querySelectorAll('article img')).every(i=>i.complete&&i.naturalWidth>0));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),a.id+' overflow');
   await page.screenshot({path:out+'/'+width+'-'+a.id+'.png',fullPage:true});report.push({width,id:a.id,status:200,noOverflow:true});
  }
  await page.goto('http://127.0.0.1:4322/assets/interactive/structured-extraction/explorer.html');await page.locator('#metric-rows tr').nth(2).waitFor({state:'attached'});
  const checks=await page.evaluate(data=>{
   const $=id=>document.getElementById(id),fail=m=>{throw Error(m);},same=(actual,expected,m)=>{if(JSON.stringify(actual)!==JSON.stringify(expected))fail(m);},change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new Event('change',{bubbles:true}));};let responses=0,fixtures=0,subsets=0;
   for(const run of data.capture.runs){change('variant',run.variant);change('document',run.documentId);const doc=data.documents.find(d=>d.id===run.documentId),checked=data.validation.rows.find(r=>r.variant===run.variant&&r.documentId===run.documentId);same($('source').textContent,doc.source,'source');same($('raw').textContent,run.raw,'raw');same(JSON.parse($('messages').textContent),run.messages,'messages');same($('chat').textContent,run.renderedChat,'chat');same(JSON.parse($('gold').textContent),doc.expected,'gold');same(JSON.parse($('checked').textContent),checked,'validation');if(!$('tokens').textContent.includes('Entrada: '+run.inputIds.length+' tokens. Generados: '+run.tokenCount))fail('tokens');responses++;}
   for(const f of data.fixtures.rows){change('fixture',f.id);same($('fixture-source').textContent,f.source,'fixture source');same($('fixture-raw').textContent,f.raw,'fixture raw');same(JSON.parse($('fixture-result').textContent),f.result,'fixture result');if(!$('fixture-outcome').textContent.includes(f.expectedSemanticCorrect===null?'no evaluado':f.expectedSemanticCorrect?'correcto':'incorrecto'))fail('author semantic label');fixtures++;}
   const inputs=[...$('subset').querySelectorAll('input')],names={instructions:'Instrucciones',schema:'+ schema','few-shot':'+ dos ejemplos'};
   for(let mask=0;mask<256;mask++){
    inputs.forEach((input,i)=>{input.checked=Boolean(mask&(1<<i));});$('subset').dispatchEvent(new Event('change',{bubbles:true}));const ids=new Set(inputs.filter(i=>i.checked).map(i=>i.value));
    for(const [variantIndex,variant] of data.capture.protocol.variants.entries()){const counts={tp:0,fp:0,fn:0};for(const r of data.validation.rows.filter(r=>r.variant===variant&&ids.has(r.documentId)))for(const k of Object.keys(counts))counts[k]+=r.counts[k];const{tp,fp,fn}=counts,fmt=n=>n===null?'No definida':n.toLocaleString('es-ES',{maximumFractionDigits:3}),expected=[names[variant],tp,fp,fn,fmt(tp+fp?tp/(tp+fp):null),fmt(tp+fn?tp/(tp+fn):null),fmt(2*tp+fp+fn?2*tp/(2*tp+fp+fn):null)].map(String),actual=[...document.querySelector(`[data-variant="${variant}"]`).cells].map(c=>c.textContent);same(actual,expected,'subset '+mask+'/'+variant);for(const [key,color] of [['tp','#34d399'],['fp','#fb7185'],['fn','#fbbf24']]){const width=Number($('selected-chart').querySelectorAll('rect[fill="'+color+'"]')[variantIndex].getAttribute('width'));if(Math.abs(width-counts[key]/12*238)>1e-10)fail('Dynamic chart '+mask+'/'+variant+'/'+key);}}
    if(!$('denominator').textContent.startsWith(ids.size+' documentos'))fail('denominator');subsets++;
   }
   for(const button of document.querySelectorAll('[data-panel]')){button.click();for(const b of document.querySelectorAll('[data-panel]')){if($(b.dataset.panel).hidden!==(b!==button))fail('panel visibility');if(b.getAttribute('aria-pressed')!==String(b===button))fail('panel accessibility');}}
   return {responses,fixtures,subsets,metricRows:subsets*3,dynamicBars:subsets*9};
  },data);
  await page.locator('[data-panel="responses"]').click();await page.selectOption('#document','E01');await page.focus('#document');await page.keyboard.press('ArrowDown');assert.equal(await page.locator('#document').inputValue(),'E02');
  for(const panel of ['responses','controls','evaluation']){await page.locator(`[data-panel="${panel}"]`).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/'+width+'-'+panel+'.png',fullPage:true});}
  assert.deepEqual(errors,[]);report.push({width,...checks,keyboard:true,errors});await page.close();
 }
 const page=await browser.newPage();
 for(const file of [...manifest.articles.map(a=>'/assets/visuals/structured-extraction/'+a.id+'.svg'),...['stages','entities','context'].map(f=>'/assets/interactive/structured-extraction/'+f+'.svg')]){
  await page.goto('http://127.0.0.1:4322'+file);
  const overflow=await page.evaluate(()=>{const svg=document.querySelector('svg'),box=svg.viewBox.baseVal;return [...svg.querySelectorAll('text')].flatMap(t=>{const b=t.getBBox();return b.x<0||b.x+b.width>box.width||b.y<0||b.y+b.height>box.height?[{text:t.textContent,x:b.x,width:b.width}]:[];});});
  assert.deepEqual(overflow,[],file+' clipped text');
 }
 await page.close();
}finally{await browser.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(out+'/report.json');}
