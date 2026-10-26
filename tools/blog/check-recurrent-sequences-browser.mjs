import {editorialPath} from '../../scripts/editorial-path.mjs'
import assert from'node:assert/strict'
import{readFile,writeFile,mkdtemp}from'node:fs/promises'
import{chromium}from'@playwright/test'
import{memoryRun,continuationRun,traceAt,checkpointAt,gateRow,comparisonRows,format,logGradient}from '../../packages/recurrent-sequences/model.mjs'
const origin=process.env.SEQUENCE_DRAFT_ORIGIN??'http://127.0.0.1:4322'
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname))
const data=JSON.parse(await readFile('public/assets/interactive/recurrent-sequences/comparison.json'))
const manifest=JSON.parse(await readFile(editorialPath('recurrent-sequences-series.json')))
const widths=(process.env.SEQUENCE_VIEWPORTS??'1440,360').split(',').map(Number);assert.ok(widths.length&&widths.every(w=>[1440,360].includes(w)))
const folder=await mkdtemp('/tmp/recurrent-sequences-layout.'),views=[],errors=[]
const table=async(page,id)=>page.locator('#'+id+' tbody tr').evaluateAll(rows=>rows.map(r=>[...r.cells].map(c=>c.textContent)))
const values=rows=>rows.map(r=>r.map(v=>typeof v==='number'||v===null?format(v):v))
const set=async(page,id,n)=>page.locator('#'+id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},n)
const overflow=async(page,id)=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow:'+id)
async function points(page,id,name,series,{xMax=80,yMin=0,yMax=1}={}){
 const expected=series.map(p=>`${58+p.x/xMax*300},${232-(p.y-yMin)/(yMax-yMin)*184}`).join(' ')
 assert.equal(await page.locator(`#${id} polyline[data-series="${name}"]`).getAttribute('points'),expected)
}
const browser=await chromium.launch({headless:true})
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(String(e)))
 for(const width of widths){
  await page.setViewportSize({width,height:1000})
  for(const a of manifest.articles){
   assert.equal((await page.goto(origin+'/posts/'+a.slug,{waitUntil:'networkidle'})).status(),200)
   await page.addStyleTag({content:'astro-dev-toolbar{display:none}'})
   assert.ok((await page.locator('h1').first().textContent()).includes(a.title));assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/)
   await overflow(page,a.id)
   for(const img of await page.locator('article img[src*="/recurrent-sequences/"]').all()){
    await img.scrollIntoViewIfNeeded();await page.waitForFunction(e=>e.complete&&e.naturalWidth>0,await img.elementHandle());assert.ok((await img.boundingBox()).width<=380.1)
    if(width===360)await img.screenshot({path:folder+'/'+a.id+'-'+(await img.getAttribute('src')).split('/').at(-1)+'.png'})
   }
   for(const link of await page.locator('article a[href^="/posts/"],article a[href^="/assets/"]').all())assert.equal((await page.request.get(origin+await link.getAttribute('href'))).status(),200)
   for(const frame of await page.locator('iframe[src*="recurrent-sequences"]').all()){
    await frame.scrollIntoViewIfNeeded();await page.frameLocator('iframe').locator('#app:not([hidden])').waitFor()
   }
   const pre=page.locator('article pre').first();await pre.scrollIntoViewIfNeeded();assert.equal(await pre.evaluate(e=>e.scrollLeft),0)
   for(const region of await page.locator('article [role="region"]').all()){
    await region.scrollIntoViewIfNeeded();await region.focus();assert.ok(await region.evaluate(e=>document.activeElement===e))
    if(await region.evaluate(e=>e.scrollWidth>e.clientWidth+2)){await region.press('ArrowRight');await page.waitForFunction(e=>e.scrollLeft>0,await region.elementHandle())}
    await region.evaluate(e=>{e.scrollLeft=0})
   }
   await page.screenshot({path:folder+'/'+a.id+'-'+width+'.png',fullPage:true});views.push({id:a.id,width})
  }
  const requests=[],listen=r=>requests.push(new URL(r.url()).pathname);page.on('request',listen)
  await page.goto(origin+'/assets/interactive/recurrent-sequences/explorer.html',{waitUntil:'networkidle'});await page.locator('#app:not([hidden])').waitFor()
  let checkpoints=0,embeddings=0,states=0,cells=0,generations=0
  assert.deepEqual(await table(page,'padding-values'),values(data.probes.paddingStates.map((v,i)=>[i,v])))
  assert.deepEqual(await table(page,'gradient-controls'),values(data.probes.gradientControls.map(p=>[p.length,p.rnnHalf,p.rnnLarge,p.fixedForget])))
  for(const seed of data.protocol.seeds)for(const kind of data.protocol.memory.kinds){
   await page.selectOption('#seed',String(seed));await page.selectOption('#kind',kind)
   const r=memoryRun(data,seed,kind)
   for(const key of ['trainAccuracy','validationAccuracy'])await points(page,'memory-chart',key,r.history.map(p=>({x:p.epoch,y:p[key]})))
   assert.deepEqual(await table(page,'length-table'),values(r.lengthProbes.map(p=>[p.length,p.length-2,p.loss,p.accuracy])))
   for(const index of [0,8,16]){
    await set(page,'checkpoint',index);const p=checkpointAt(r,index)
    assert.deepEqual(await table(page,'memory-point'),values([[p.epoch,p.trainLoss,p.validationLoss,p.trainAccuracy,p.validationAccuracy]]));checkpoints++
   }
   for(let token=0;token<10;token++){
    await page.selectOption('#token',String(token));assert.deepEqual(await table(page,'embedding-values'),values(r.embedding[token].map((v,i)=>[i,v])));embeddings++
   }
   for(const length of [12,48]){
    await page.selectOption('#length',String(length));const t=traceAt(r,length)
    assert.equal(Number(await page.locator('#time').getAttribute('max')),length-1)
    const ys=t.gradientNorm.map(logGradient),yMin=Math.min(-1,Math.floor(Math.min(...ys))),yMax=Math.max(0,Math.ceil(Math.max(...ys)))
    await points(page,'gradient-chart','Norma del gradiente',ys.map((y,i)=>({x:i,y})),{xMax:length-1,yMin,yMax})
    for(const time of [0,Math.floor(length/2),length-1])for(const unit of [0,15]){
     await set(page,'time',time);await page.selectOption('#unit',String(unit))
     assert.deepEqual(await table(page,'trace-values'),values(Object.entries(gateRow(t,time,unit))))
     assert.deepEqual(await table(page,'input-vector'),values(t.embedded[time].map((v,i)=>[i,v])))
     assert.deepEqual(await table(page,'gradient-point'),values([[time,t.tokens[time],t.gradientNorm[time]]]));states++
    }
   }
  }
  for(const kind of data.protocol.memory.kinds){
   await page.selectOption('#cell-kind',kind);const p=data.probes.cells[kind],t={cells:p.steps,hidden:p.steps.map(s=>s.hidden)}
   for(let time=0;time<3;time++)for(const unit of [0,1]){
    await set(page,'cell-time',time);await page.selectOption('#cell-unit',String(unit))
    assert.deepEqual(await table(page,'cell-values'),values(Object.entries(gateRow(t,time,unit))));cells++
   }
  }
  for(const seed of data.protocol.seeds){
   await page.selectOption('#generation-seed',String(seed));const r=continuationRun(data,seed)
   for(const[key,name]of [['teacherContinuationAccuracy','Teacher tokens'],['rolloutContinuationAccuracy','Rollout tokens'],['rolloutExactMatch','Rollout exacto']])await points(page,'generation-chart',name,r.history.map(p=>({x:p.epoch,y:p[key]})),{xMax:60})
   for(const index of [0,6,12]){
    await set(page,'generation-checkpoint',index);const p=checkpointAt(r,index)
    assert.deepEqual(await table(page,'generation-point'),values([[p.epoch,p.validationLoss,p.teacherContinuationAccuracy,p.rolloutContinuationAccuracy,p.rolloutExactMatch]]));checkpoints++
   }
   for(let i=0;i<8;i++){
    await page.selectOption('#example',String(i));const e=r.examples[i]
    assert.deepEqual(await table(page,'generation-values'),values(comparisonRows(e).map(p=>[p.step,p.expected,p.teacher,p.generated,p.perturbed])))
    assert.ok((await page.locator('#prefix').textContent()).includes(e.prefix.join(', ')));generations++
   }
  }
  assert.equal(await page.locator('#overlap').textContent(),'Patrones únicos: train 8, validation 8, compartidos 8.')
  await page.locator('#generation-checkpoint').focus();await page.locator('#generation-checkpoint').press('ArrowLeft');assert.equal(await page.locator('#generation-checkpoint').inputValue(),'11')
  for(const region of await page.locator('.scroll').all()){
   await region.scrollIntoViewIfNeeded();await region.focus();assert.ok(await region.evaluate(e=>document.activeElement===e))
   if(await region.evaluate(e=>e.scrollWidth>e.clientWidth+2)){await region.press('ArrowRight');await page.waitForFunction(e=>e.scrollLeft>0,await region.elementHandle())}
   await region.evaluate(e=>{e.scrollLeft=0})
  }
  await overflow(page,'explorer')
  await page.selectOption('#seed','7');await page.selectOption('#kind','lstm');await page.selectOption('#length','48');await set(page,'time',0);await page.selectOption('#unit','0')
  for(const section of await page.locator('section').all())await section.screenshot({path:folder+'/explorer-'+width+'-'+(await section.locator('h2').textContent()).slice(0,1)+'.png'})
  assert.ok(requests.every(p=>p.startsWith('/assets/interactive/recurrent-sequences/')),requests.join('\n'));page.off('request',listen)
  views.push({id:'explorer',width,checkpoints,embeddings,states,cells,generations})
 }
 await page.route('**/recurrent-sequences/comparison.json',route=>route.fulfill({status:404,body:'missing'}));await page.goto(origin+'/assets/interactive/recurrent-sequences/explorer.html');await page.getByText('No se pudieron cargar las observaciones: HTTP 404').waitFor();assert.equal(await page.locator('#app').getAttribute('hidden'),'')
 assert.deepEqual(errors,[]);await writeFile(folder+'/report.json',JSON.stringify({views,errors,errorState:'404 verified'},null,2));console.log(folder+'/report.json')
}finally{await browser.close()}
