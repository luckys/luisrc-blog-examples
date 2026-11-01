import {chromium} from '@playwright/test';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const out=await mkdtemp('/tmp/ner-layout.'),browser=await chromium.launch({headless:true});const report=[];
const manifest=JSON.parse(await readFile(new URL('../../docs/editorial/entity-recognition-series.json',import.meta.url)));const slugs=manifest.articles.map(a=>a.slug);
try{for(const width of [360,1440]){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const slug of slugs){const response=await page.goto('http://127.0.0.1:4322/posts/'+slug);assert.equal(response.status(),200);await page.locator('iframe').waitFor();assert.ok(await page.locator('meta[name="robots"]').getAttribute('content').then(s=>s.includes('noindex')));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('article img').evaluateAll(images=>images.forEach(img=>img.loading='eager'));await page.waitForFunction(()=>Array.from(document.querySelectorAll('article img')).every(i=>i.complete&&i.naturalWidth>0));await page.screenshot({path:out+'/'+width+'-'+slug+'.png',fullPage:true});report.push({width,slug,status:200,noOverflow:true});}
 await page.goto('http://127.0.0.1:4322/assets/interactive/entity-recognition/explorer.html');await page.locator('#record option').nth(31).waitFor({state:'attached'});
 const corpus=JSON.parse(await readFile(new URL('../../packages/entity-recognition/corpus.json',import.meta.url)));
 for(const row of corpus){await page.selectOption('#record',row.id);assert.equal(await page.locator('#highlight').innerText(),row.text);assert.equal(await page.locator('#highlight mark').count(),row.spans.length);await page.getByRole('button',{name:'Decodificar etiquetas'}).click();assert.ok((await page.locator('#status').innerText()).includes('válida'));assert.deepEqual(JSON.parse(await page.locator('#decoded').innerText()),row.spans.map(({text,...s})=>s));}
 await page.selectOption('#record','N01');await page.locator('#labels').fill('I-PER');await page.getByRole('button',{name:'Decodificar etiquetas'}).click();assert.equal(await page.locator('#status').innerText(),'Longitudes distintas');
 const original=await page.locator('#tokens tr').count();await page.locator('#labels').fill(['I-PER',...Array(original-1).fill('O')].join(' '));await page.getByRole('button',{name:'Decodificar etiquetas'}).click();assert.equal(await page.locator('#status').innerText(),'Transición I ilegal');
 await page.selectOption('#record','N30');await page.screenshot({path:out+'/'+width+'-viewer.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#labels').fill('<img src=x onerror=alert(1)>');await page.getByRole('button',{name:'Decodificar etiquetas'}).click();assert.equal(await page.locator('img').count(),1);

 const saved=JSON.parse(await readFile(new URL('../../packages/entity-recognition/observations.json',import.meta.url)));
 let checked=0;
 for(const variant of saved.variants){await page.selectOption('#variant',variant.id);for(const split of ['train','dev','test']){await page.selectOption('#split',split);const metric=variant.metrics[split].exact;assert.ok((await page.locator('#metrics').innerText()).includes(`TP ${metric.tp} · FP ${metric.fp} · FN ${metric.fn}`));
 for(const row of corpus.filter(r=>r.split===split)){await page.selectOption('#result-record',row.id);const expected=variant.predictions.find(p=>p.id===row.id).spans;assert.equal(await page.locator('#prediction mark').count(),expected.length);assert.deepEqual(await page.locator('#prediction mark').allTextContents(),expected.map(s=>Array.from(row.text).slice(s.start,s.end).join('')+' ['+s.label+']'));checked++;}
 if(variant.loss){const chartText=await page.locator('#chart').innerText();assert.ok(chartText.includes(String(variant.epochs)));}
 }}
 assert.equal(checked,320);
 await page.selectOption('#variant','800-7');await page.selectOption('#split','test');await page.selectOption('#result-record','N29');
 await page.locator('#variant').locator('xpath=ancestor::section').screenshot({path:out+'/'+width+'-predictions.png'});
 await page.locator('#word-ids').fill('[null,0,0,1,2,2,null]');await page.locator('#word-labels').fill('[1,2,0]');await page.getByRole('button',{name:'Alinear etiquetas'}).click();assert.equal(await page.locator('#aligned').innerText(),'[-100,1,-100,2,0,-100,-100]');
 await page.locator('#word-ids').fill('[0,1,0]');await page.getByRole('button',{name:'Alinear etiquetas'}).click();assert.equal(await page.locator('#aligned').innerText(),'Word ID no contiguo');
 await page.locator('#word-ids').fill('[null,0,0,1,2,2,null]');await page.getByRole('button',{name:'Alinear etiquetas'}).click();
 await page.locator('#word-ids').locator('xpath=ancestor::section').screenshot({path:out+'/'+width+'-alignment.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);report.push({width,viewer:'32 annotation round trips, 320 saved predictions, 30 metrics, chart axes, invalid BIO and subword alignment checked',errors});await page.close();
}}finally{await browser.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(out);}
