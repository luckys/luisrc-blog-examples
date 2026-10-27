import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {editorialPath} from '../../scripts/editorial-path.mjs';
import {predictionCounts} from '../../packages/model-adaptation/model.mjs';
const origin=process.env.ADAPTATION_DRAFT_ORIGIN??'http://127.0.0.1:4322';
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
const manifest=JSON.parse(await readFile(editorialPath('model-adaptation-series.json')));
const data=JSON.parse(await readFile(new URL('../../packages/model-adaptation/comparison.json',import.meta.url)));
const folder=await mkdtemp('/tmp/model-adaptation-layout.'),views=[],errors=[];
const browser=await chromium.launch({headless:true});
const overflow=async page=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
try {
 const page=await browser.newPage();
 page.on('pageerror',e=>errors.push(String(e)));
 for(const width of [1440,360]) {
  await page.setViewportSize({width,height:1000});
  for(const a of manifest.articles) {
   assert.equal((await page.goto(origin+'/posts/'+a.slug,{waitUntil:'networkidle'})).status(),200);
   await page.addStyleTag({content:'astro-dev-toolbar{display:none}'});
   assert.ok((await page.locator('h1').first().textContent()).includes(a.title));
   assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);
   await overflow(page);
   for(const img of await page.locator('article img[src*="/model-adaptation/"]').all()) {
    await img.scrollIntoViewIfNeeded();await page.waitForFunction(e=>e.complete&&e.naturalWidth>0,await img.elementHandle());
    assert.ok((await img.boundingBox()).width<=380.1);
    if(width===360)await img.screenshot({path:folder+'/'+a.id+'-'+(await img.getAttribute('src')).split('/').at(-1)+'.png'});
   }
   for(const link of await page.locator('article a[href^="/posts/"],article a[href^="/assets/"]').all())assert.equal((await page.request.get(origin+await link.getAttribute('href'))).status(),200);
   const frame=page.locator('iframe[src*="model-adaptation"]');await frame.scrollIntoViewIfNeeded();await page.frameLocator('iframe').locator('#summary').filter({hasText:'test accuracy'}).waitFor();
   for(const region of await page.locator('article [role="region"]').all()) {
    await region.scrollIntoViewIfNeeded();await region.focus();assert.ok(await region.evaluate(e=>document.activeElement===e));
    if(await region.evaluate(e=>e.scrollWidth>e.clientWidth+2)){await region.press('ArrowRight');await page.waitForFunction(e=>e.scrollLeft>0,await region.elementHandle());}
    await region.evaluate(e=>{e.scrollLeft=0});
   }
   await page.screenshot({path:folder+'/'+a.id+'-'+width+'.png',fullPage:true});views.push({id:a.id,width});
  }
  const requests=[],listen=r=>requests.push(new URL(r.url()).pathname);page.on('request',listen);
  await page.goto(origin+'/assets/interactive/model-adaptation/explorer.html',{waitUntil:'networkidle'});
  for(const run of data.adaptations) {
   await page.selectOption('#mode',{value:run.mode});await page.selectOption('#seed',{value:String(run.seed)});
   assert.ok((await page.locator('#summary').textContent()).includes((100*run.test.accuracy).toFixed(2)+'%'));
   assert.ok((await page.locator('#summary').textContent()).includes(run.finalParameters.trainable+'/'+run.finalParameters.total));
   const rows=await page.locator('#steps tr').evaluateAll(rs=>rs.map(r=>[...r.cells].map(c=>c.textContent)));
   assert.deepEqual(rows,run.curve.map(v=>[String(v.step),v.validation.loss.toFixed(5),v.validation.accuracy.toFixed(5),String(v.trainable)]));
   const cm=await page.locator('#confusion tr').evaluateAll(rs=>rs.map(r=>[...r.cells].slice(1).map(c=>Number(c.textContent))));
   assert.deepEqual(cm,predictionCounts(run));
   for(const sample of [0,127,255]) {
    await page.locator('#sample').evaluate((e,value)=>{e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));},sample);
    assert.equal(await page.locator('#prediction').textContent(),`Ejemplo ${sample}: etiqueta ${run.test.labels[sample]}, predicción ${run.test.predictions[sample]}.`);
   }
   const text=await page.locator('#retention').textContent();
   if(run.sourceMSE===null)assert.match(text,/no aplicable/);else assert.ok(text.includes(run.sourceMSE.toFixed(6)));
  }
  await page.fill('#input','64');await page.fill('#output','32');await page.fill('#rank','4');
  assert.match(await page.locator('#budget').textContent(),/Factores A\/B: 384/);
  assert.match(await page.locator('#budget').textContent(),/head: 402/);
  await page.fill('#rank','0');assert.match(await page.locator('#budget').textContent(),/dimensiones enteras/);
  await page.fill('#rank','2');await page.fill('#input','16');await page.fill('#output','8');
  for(let i=0;i<3;i++) {await page.selectOption('#temperature',{value:String(i)});assert.ok((await page.locator('#contrast').textContent()).includes(data.contrastive.temperatures[i].loss.toFixed(6)));}
  await page.selectOption('#mode','head');await page.selectOption('#seed','7');
  await page.locator('#sample').evaluate(e=>{e.value=0;e.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('#sample').focus();await page.locator('#sample').press('ArrowRight');assert.equal(await page.locator('#sample').inputValue(),'1');
  for(const region of await page.locator('.scroll').all()) {
   await region.scrollIntoViewIfNeeded();await region.focus();assert.ok(await region.evaluate(e=>document.activeElement===e));
   if(await region.evaluate(e=>e.scrollWidth>e.clientWidth+2)){await region.press('ArrowRight');await page.waitForFunction(e=>e.scrollLeft>0,await region.elementHandle());}
   await region.evaluate(e=>{e.scrollLeft=0});
  }
  await overflow(page);
  for(const section of await page.locator('section').all())await section.screenshot({path:folder+'/explorer-'+width+'-'+(await section.locator('h2').textContent()).slice(0,1)+'.png'});
  assert.ok(requests.every(p=>p.startsWith('/assets/interactive/model-adaptation/')),requests.join('\n'));page.off('request',listen);
  views.push({id:'explorer',width,runs:21,curveRows:168,predictions:63,temperatures:3,calculator:true,keyboard:true});
 }
 assert.deepEqual(errors,[]);
 await writeFile(folder+'/report.json',JSON.stringify({origin,views,errors},null,2));console.log(folder+'/report.json');
}finally{await browser.close();}
