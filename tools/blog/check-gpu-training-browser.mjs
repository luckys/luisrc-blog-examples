import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {editorialPath} from '../../scripts/editorial-path.mjs';
import {caseId,sampleRows,memoryRows,microbatchWeight,sortedProfiler} from '../../packages/gpu-training/model.mjs';
const origin=process.env.GPU_DRAFT_ORIGIN??'http://127.0.0.1:4322';
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
const manifest=JSON.parse(await readFile(editorialPath('gpu-training-series.json')));
const data=JSON.parse(await readFile(new URL('../../packages/gpu-training/comparison.json',import.meta.url)));
const folder=await mkdtemp('/tmp/gpu-training-layout.'),views=[],errors=[];
const overflow=async page=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
const cells=async(page,id)=>page.locator('#'+id+' tr').evaluateAll(rows=>rows.map(r=>[...r.cells].map(c=>c.textContent)));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(String(e)));
 for(const width of [1440,360]){
  await page.setViewportSize({width,height:1000});
  for(const a of manifest.articles){
   assert.equal((await page.goto(origin+'/posts/'+a.slug,{waitUntil:'networkidle'})).status(),200);
   await page.addStyleTag({content:'astro-dev-toolbar{display:none}'});
   assert.ok((await page.locator('h1').first().textContent()).includes(a.title));
   assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);
   await overflow(page);
   for(const img of await page.locator('article img[src*="/gpu-training/"]').all()){
    await img.scrollIntoViewIfNeeded();await page.waitForFunction(e=>e.complete&&e.naturalWidth>0,await img.elementHandle());
    assert.ok((await img.boundingBox()).width<=380.1);
    if(width===360)await img.screenshot({path:folder+'/'+a.id+'-'+(await img.getAttribute('src')).split('/').at(-1)+'.png'});
   }
   for(const link of await page.locator('article a[href^="/posts/"],article a[href^="/assets/"]').all())assert.equal((await page.request.get(origin+await link.getAttribute('href'))).status(),200);
   const frame=page.locator('iframe[src*="gpu-training"]');await frame.scrollIntoViewIfNeeded();await page.frameLocator('iframe').locator('#summary').filter({hasText:'ms/update'}).waitFor();
   for(const region of await page.locator('article [role="region"]').all()){
    await region.scrollIntoViewIfNeeded();await region.focus();assert.ok(await region.evaluate(e=>document.activeElement===e));
    if(await region.evaluate(e=>e.scrollWidth>e.clientWidth+2)){await region.press('ArrowRight');await page.waitForFunction(e=>e.scrollLeft>0,await region.elementHandle());}
    await region.evaluate(e=>{e.scrollLeft=0});
   }
   await page.screenshot({path:folder+'/'+a.id+'-'+width+'.png',fullPage:true});views.push({id:a.id,width});
  }
  const requests=[],listen=r=>requests.push(new URL(r.url()).pathname);page.on('request',listen);
  await page.goto(origin+'/assets/interactive/gpu-training/explorer.html',{waitUntil:'networkidle'});
  for(const c of data.cases){
   await page.selectOption('#case',{value:caseId(c)});
   assert.ok((await page.locator('#summary').textContent()).includes(c.medianStepMilliseconds.toFixed(6)+' ms/update'));
   assert.ok((await page.locator('#summary').textContent()).includes(c.examplesPerSecond.toFixed(2)+' filas/s'));
   assert.deepEqual(await cells(page,'samples'),sampleRows(c).map(r=>r.map((v,i)=>i?v.toFixed(i===3?2:6):String(v))));
   assert.deepEqual(await cells(page,'memory'),memoryRows(c).map(r=>[r[0],String(r[1]),r[2].toFixed(6)]));
   assert.deepEqual(await page.locator('#samples-chart rect[data-value]').evaluateAll(rs=>rs.map(r=>Number(r.dataset.value))),sampleRows(c).map(r=>r[2]));
  }
  for(let i=0;i<data.transfers.length;i++){
   await page.selectOption('#transfer',{value:String(i)});const t=data.transfers[i];
   assert.ok((await page.locator('#transfer-summary').textContent()).includes(t.medianCopyMilliseconds.toFixed(6)));
   assert.deepEqual(await cells(page,'transfer-samples'),t.sampleSeconds.map((s,j)=>[String(j+1),(s*1000).toFixed(6),(s*1000/t.copiesPerSample).toFixed(6)]));
  }
  assert.deepEqual(await cells(page,'precision'),data.controls.precision.map(r=>[r.precision,r.outputDtype,r.lossDtype,r.maxAbsoluteLogitError.toExponential(6),r.samePredictions+'/'+r.count]));
  for(let i=0;i<3;i++){
   await page.selectOption('#micro',{value:String(i)});const w=microbatchWeight(data,i);
   assert.ok((await page.locator('#weight').textContent()).includes(w.correct.toFixed(6)));
   assert.ok((await page.locator('#weight').textContent()).includes(w.incorrect.toFixed(6)));
  }
  for(const key of ['selfCpuMicroseconds','selfDeviceMicroseconds']){
   await page.selectOption('#sort',{value:key});
   assert.deepEqual(await cells(page,'profile'),sortedProfiler(data,key).slice(0,20).map(r=>[String(r.index),r.name,String(r.count),r.selfCpuMicroseconds.toFixed(3),r.selfDeviceMicroseconds.toFixed(3)]));
  }
  await page.selectOption('#micro','0');await page.locator('#micro').focus();await page.locator('#micro').press('ArrowDown');assert.equal(await page.locator('#micro').inputValue(),'1');
  for(const region of await page.locator('.scroll').all()){
   await region.scrollIntoViewIfNeeded();await region.focus();assert.ok(await region.evaluate(e=>document.activeElement===e));
   if(await region.evaluate(e=>e.scrollWidth>e.clientWidth+2)){await region.press('ArrowRight');await page.waitForFunction(e=>e.scrollLeft>0,await region.elementHandle());}
   await region.evaluate(e=>{e.scrollLeft=0});
  }
  const profileRegion=page.locator('.profile-scroll');await profileRegion.focus();await profileRegion.press('ArrowDown');await page.waitForFunction(e=>e.scrollTop>0,await profileRegion.elementHandle());await profileRegion.evaluate(e=>{e.scrollTop=0});
  await page.locator('.scroll').evaluateAll(es=>es.forEach(e=>{e.scrollLeft=0}));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await overflow(page);
  for(const section of await page.locator('section').all())await section.screenshot({path:folder+'/explorer-'+width+'-'+(await section.locator('h2').textContent()).slice(0,1)+'.png'});
  assert.ok(requests.every(p=>p.startsWith('/assets/interactive/gpu-training/')),requests.join('\n'));page.off('request',listen);
  views.push({id:'explorer',width,cases:12,timingRows:60,transfers:4,transferRows:20,precisionRows:3,microbatches:3,profilerRows:40,keyboard:true});
 }
 assert.deepEqual(errors,[]);await writeFile(folder+'/report.json',JSON.stringify({origin,views,errors},null,2));console.log(folder+'/report.json');
}finally{await browser.close();}
