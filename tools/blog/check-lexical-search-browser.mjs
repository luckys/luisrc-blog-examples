import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {editorialPath} from '../../scripts/editorial-path.mjs';
const origin=process.env.LEXICAL_DRAFT_ORIGIN??'http://127.0.0.1:4322';
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
const manifest=JSON.parse(await readFile(editorialPath('lexical-search-series.json')));
const data=JSON.parse(await readFile(new URL('../../packages/lexical-search/comparison.json',import.meta.url)));
const folder=await mkdtemp('/tmp/lexical-search-layout.'),views=[],errors=[];
const browser=await chromium.launch({headless:true});
const overflow=async page=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
const cells=async(page,id)=>page.locator('#'+id+' tr').evaluateAll(rs=>rs.map(r=>[...r.cells].map(c=>c.textContent)));
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
   for(const img of await page.locator('article img[src*="/lexical-search/"]').all()){
    await img.scrollIntoViewIfNeeded();await page.waitForFunction(e=>e.complete&&e.naturalWidth>0,await img.elementHandle());
    assert.ok((await img.boundingBox()).width<=380.1);
    if(width===360)await img.screenshot({path:folder+'/'+a.id+'-'+(await img.getAttribute('src')).split('/').at(-1)+'.png'});
   }
   for(const link of await page.locator('article a[href^="/posts/"],article a[href^="/assets/"]').all())assert.equal((await page.request.get(origin+await link.getAttribute('href'))).status(),200);
   await page.locator('iframe').scrollIntoViewIfNeeded();await page.frameLocator('iframe').locator('#ranking article').first().waitFor();
   for(const box of await page.locator('article [role="region"]').all()){
    await box.focus();assert.ok(await box.evaluate(e=>document.activeElement===e));
    if(await box.evaluate(e=>e.scrollWidth>e.clientWidth+2)){await box.press('ArrowRight');await page.waitForFunction(e=>e.scrollLeft>0,await box.elementHandle());}
    await box.evaluate(e=>{e.scrollLeft=0});
   }
   await page.screenshot({path:folder+'/'+a.id+'-'+width+'.png',fullPage:true});views.push({id:a.id,width});
  }
  const requests=[];const listen=r=>requests.push(r.url());page.on('request',listen);
  await page.goto(origin+'/assets/interactive/lexical-search/explorer.html',{waitUntil:'networkidle'});
  for(const variant of data.variants){
   await page.selectOption('#variant',{value:variant.id});
   for(const row of variant.rows){
    await page.selectOption('#query',{value:row.id});
    assert.deepEqual(await page.locator('#ranking article').evaluateAll(es=>es.map(e=>e.dataset.document)),row.ranking.slice(0,3).map(r=>r.id));
    const text=await page.locator('#ranking').textContent();for(const r of row.ranking.slice(0,3))assert.ok(text.includes(r.score.toFixed(6)));
    const expected=row.metrics?`P@3 ${row.metrics.precision.toFixed(6)} · R@3 ${row.metrics.recall.toFixed(6)} · RR@3 ${row.metrics.rr.toFixed(6)}`:'Sin respuesta en el corpus. Coincidencias no implican relevancia.';
    assert.equal(await page.locator('#query-metrics').textContent(),expected);
    for(const [i,r]of row.ranking.slice(0,3).entries())if(r.terms.length){const actual=await page.locator('#ranking article').nth(i).locator('tbody tr').evaluateAll(rs=>rs.map(r=>[...r.cells].map(c=>c.textContent)));assert.deepEqual(actual,r.terms.map(t=>[t.term,String(t.tf),String(t.df),String(t.length),t.idf.toFixed(6),t.contribution.toFixed(6)]));}
   }
  }
  await page.selectOption('#variant','bm25-fold');await page.selectOption('#query','Q18');
  await page.locator('#text').fill('<img src=x onerror=alert(1)> logs sin secretos');await page.locator('#custom button').click();
  assert.match(await page.locator('#intent').textContent(),/no tiene etiquetas/);assert.equal(await page.locator('#ranking img').count(),0);
  await page.locator('[data-section="analysis"]').click();await page.locator('#analysis-text').fill('I\u0301NDICE año C++');
  assert.match(await page.locator('#analysis-results').textContent(),/índice/);assert.match(await page.locator('#analysis-results').textContent(),/año/);
  await page.locator('[data-section="metrics"]').click();
  for(const split of ['dev','test','all']){await page.selectOption('#split',split);assert.deepEqual(await cells(page,'metrics-rows'),data.variants.map(v=>{const m=v.summary[split];return[v.id,String(m.answerable),m.precision.toFixed(6),m.recall.toFixed(6),m.mrr.toFixed(6),String(v.vocabulary)]}));}
  await page.locator('[data-section="subwords"]').click();
  for(const probe of data.subwords.probes){await page.locator('#word').fill(probe.word);const text=await page.locator('#pieces').textContent();assert.ok(text.includes(JSON.stringify(probe.bpe)));assert.ok(text.includes(JSON.stringify(probe.wordpiece)));}
  await page.selectOption('#step','0');await page.locator('#word').fill('bajos');assert.match(await page.locator('#pieces').textContent(),/\["b","a","j","o","s"\]/);
  await page.locator('#step').focus();await page.locator('#step').press('ArrowDown');assert.equal(await page.locator('#step').inputValue(),'1');
  await page.locator('[data-section="search"]').click();await page.selectOption('#query','Q18');await page.locator('#text').fill('logs sin secretos');await page.locator('[data-section="metrics"]').click();await page.selectOption('#split','test');await page.locator('[data-section="subwords"]').click();await page.selectOption('#step','5');await page.locator('#word').fill('bajos');
  for(const section of ['search','analysis','metrics','subwords']){
   await page.locator(`[data-section="${section}"]`).click();await overflow(page);
   for(const box of await page.locator('section:not([hidden]) .scroll').all()){
    await box.focus();assert.ok(await box.evaluate(e=>document.activeElement===e));
    if(await box.evaluate(e=>e.scrollWidth>e.clientWidth+2)){await box.press('ArrowRight');await page.waitForFunction(e=>e.scrollLeft>0,await box.elementHandle());}
    if(await box.evaluate(e=>e.scrollHeight>e.clientHeight+2)){await box.press('ArrowDown');await page.waitForFunction(e=>e.scrollTop>0,await box.elementHandle());}
    await box.evaluate(e=>{e.scrollLeft=0;e.scrollTop=0});
   }
   await page.screenshot({path:folder+'/viewer-'+section+'-'+width+'.png',fullPage:true});
  }
  assert.ok(requests.every(u=>new URL(u).origin===origin),JSON.stringify(requests));page.off('request',listen);
  views.push({id:'viewer',width,rankings:120,metricSplits:3,subwordProbes:7});
 }
 assert.deepEqual(errors,[]);await writeFile(folder+'/report.json',JSON.stringify({views,errors},null,2));console.log(folder+'/report.json');
}finally{await browser.close()}
