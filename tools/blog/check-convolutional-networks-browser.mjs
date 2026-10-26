import {editorialPath} from '../../scripts/editorial-path.mjs'
import assert from 'node:assert/strict'
import{readFile,writeFile,mkdtemp}from'node:fs/promises'
import{chromium}from'@playwright/test'
import{terms,selectFeature,scaleBounds,selectRun,checkpoint,format}from '../../packages/convolutional-networks/model.mjs'
const origin=process.env.CNN_DRAFT_ORIGIN??'http://127.0.0.1:4322'
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname))
const data=JSON.parse(await readFile('public/assets/interactive/convolutional-networks/comparison.json'))
const manifest=JSON.parse(await readFile(editorialPath('convolutional-networks-series.json')))
const folder=await mkdtemp('/tmp/convolutional-networks-layout.'),views=[],errors=[]
const table=async(page,id)=>page.locator('#'+id+' tbody tr').evaluateAll(rows=>rows.map(r=>[...r.cells].map(c=>c.textContent)))
const set=async(page,id,n)=>page.locator('#'+id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},n)
const overflow=async page=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'global horizontal overflow')
const browser=await chromium.launch({headless:true})
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(String(e)))
 const widths=(process.env.CNN_VIEWPORTS??'1440,360').split(',').map(Number)
 assert.ok(widths.length&&widths.every(w=>[1440,360].includes(w)))
 for(const width of widths){
  await page.setViewportSize({width,height:1000})
  for(const a of manifest.articles){
   assert.equal((await page.goto(origin+'/posts/'+a.slug,{waitUntil:'networkidle'})).status(),200)
   await page.addStyleTag({content:'astro-dev-toolbar{display:none}'})
   assert.ok((await page.locator('h1').first().textContent()).includes(a.title))
   assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/)
   await overflow(page)
   for(const img of await page.locator('article img[src*="/convolutional-networks/"]').all()){
    await img.scrollIntoViewIfNeeded();await page.waitForFunction(e=>e.complete&&e.naturalWidth>0,await img.elementHandle())
    assert.ok((await img.boundingBox()).width<=380.1)
    if(width===360)await img.screenshot({path:folder+'/'+a.id+'-'+(await img.getAttribute('src')).split('/').at(-1)+'.png'})
   }
   for(const link of await page.locator('article a[href^="/posts/"],article a[href^="/assets/"]').all())assert.equal((await page.request.get(origin+await link.getAttribute('href'))).status(),200)
   for(const frame of await page.locator('iframe[src*="convolutional-networks"]').all()){
    await frame.scrollIntoViewIfNeeded();await page.frameLocator('iframe').locator('#app:not([hidden])').waitFor()
   }
   const firstCode=page.locator('article pre').first();await firstCode.scrollIntoViewIfNeeded();assert.equal(await firstCode.evaluate(e=>e.scrollLeft),0)
   for(const region of await page.locator('article [role="region"]').all()){
    await region.scrollIntoViewIfNeeded();await region.focus();assert.ok(await region.evaluate(e=>document.activeElement===e))
    if(await region.evaluate(e=>e.scrollWidth>e.clientWidth+2)){await region.press('ArrowRight');await page.waitForFunction(e=>e.scrollLeft>0,await region.elementHandle())}
    await region.evaluate(e=>{e.scrollLeft=0})
   }
   await page.screenshot({path:folder+'/'+a.id+'-'+width+'.png',fullPage:true});views.push({id:a.id,width})
  }
  const requests=[],listen=r=>requests.push(new URL(r.url()).pathname)
  page.on('request',listen)
  await page.goto(origin+'/assets/interactive/convolutional-networks/explorer.html',{waitUntil:'networkidle'});await page.locator('#app:not([hidden])').waitFor()
  let cells=0,maps=0,gradients=0,points=0
  for(let i=0;i<data.probes.cases.length;i++){
   const c=data.probes.cases[i];await page.selectOption('#geometry',String(i))
   for(let row=0;row<c.output.length;row++)for(let col=0;col<c.output[0].length;col++){
    await set(page,'out-row',row);await set(page,'out-col',col)
    const expected=terms(data.probes,c,row,col).map(t=>[t.row,t.col,t.padded?'Sí':'No',t.value,t.weight,t.product].map(v=>typeof v==='number'?format(v):v))
    assert.deepEqual(await table(page,'terms'),expected)
    assert.match(await page.locator('#sum').textContent(),new RegExp(`Celda \\(${row}, ${col}\\) = ${format(c.output[row][col]).replaceAll('.','\\.')}\\.`))
    cells++
   }
  }
  for(const key of ['max','average']){
   await page.selectOption('#pool',key)
   assert.deepEqual(await table(page,'pool-values'),data.probes.pool[key].map((r,i)=>[i,...r].map(format)))
   assert.deepEqual(await table(page,'pool-gradient'),data.probes.pool[key+'Gradient'].map((r,i)=>[i,...r].map(format)))
  }
  for(let sample=0;sample<4;sample++){
   await page.selectOption('#sample',String(sample))
   for(const stage of Object.keys(data.features[sample].maps)){
    await page.selectOption('#stage',stage)
    assert.equal(await page.locator('#channel option').count(),data.features[sample].maps[stage].length)
    for(let channel=0;channel<data.features[sample].maps[stage].length;channel++){
     await page.selectOption('#channel',String(channel));const m=selectFeature(data,sample,stage,channel)
     const actual=await page.locator('#feature-map rect[data-value]').evaluateAll(rs=>rs.map(r=>Number(r.dataset.value)))
     assert.deepEqual(actual,m.flat())
     for(const scale of ['shared','local']){
      await page.selectOption('#scale',scale);const [lo,hi]=scaleBounds(data,sample,stage,channel,scale==='local')
      assert.ok((await page.locator('#scale-summary').textContent()).includes(`${format(lo)} a ${format(hi)}`))
     }
     await set(page,'pixel-row',m.length-1);await set(page,'pixel-col',m[0].length-1)
     assert.equal(await page.locator('#pixel-value').textContent(),`Fila ${m.length-1}, columna ${m[0].length-1}: ${format(m.at(-1).at(-1))}.`);maps++
    }
   }
   for(let c=0;c<8;c++){
    await page.selectOption('#grad-channel',String(c))
    const actual=await page.locator('#gradient-map rect[data-value]').evaluateAll(rs=>rs.map(r=>Number(r.dataset.value)))
    assert.deepEqual(actual,data.features[sample].gradients[c].flat());gradients++
   }
  }
  for(const seed of data.protocol.seeds)for(const mode of ['source',...data.protocol.targetModes]){
   await page.selectOption('#seed',String(seed));await page.selectOption('#mode',mode)
   const r=selectRun(data,seed,mode)
   for(const metric of ['trainLoss','validationLoss']){
    const max=Math.max(...r.history.flatMap(p=>[p.trainLoss,p.validationLoss]),.001)*1.05
    const expected=r.history.map(p=>`${58+p.epoch/40*306},${230-p[metric]/max*190}`).join(' ')
    assert.equal(await page.locator(`#curve polyline[data-series="${metric}"]`).getAttribute('points'),expected)
   }
   for(const epoch of [0,20,40]){
    await set(page,'epoch',epoch);const p=checkpoint(r,epoch)
    assert.deepEqual(await table(page,'checkpoint'),[[p.epoch,p.trainLoss,p.validationLoss,p.trainAccuracy,p.validationAccuracy].map(format)]);points++
   }
  }
  await page.locator('#epoch').focus();await page.locator('#epoch').press('ArrowLeft');assert.equal(await page.locator('#epoch').inputValue(),'39')
  for(const region of await page.locator('.scroll').all()){
   await region.scrollIntoViewIfNeeded();await region.focus();assert.ok(await region.evaluate(e=>document.activeElement===e))
   if(await region.evaluate(e=>e.scrollWidth>e.clientWidth+2)){await region.press('ArrowRight');await page.waitForFunction(e=>e.scrollLeft>0,await region.elementHandle())}
  }
  await overflow(page)
  await page.selectOption('#sample','0');await page.selectOption('#stage','conv2_pre');await page.selectOption('#channel','0');await page.selectOption('#scale','shared')
  for(const section of await page.locator('section').all()){
   await section.screenshot({path:folder+'/explorer-'+width+'-'+(await section.locator('h2').textContent()).slice(0,1)+'.png'})
  }
  assert.ok(requests.every(p=>p.startsWith('/assets/interactive/convolutional-networks/')),requests.join('\n'));page.off('request',listen)
  views.push({id:'explorer',width,cells,maps,gradients,points})
 }
 await page.route('**/convolutional-networks/comparison.json',route=>route.fulfill({status:404,body:'missing'}))
 await page.goto(origin+'/assets/interactive/convolutional-networks/explorer.html');await page.getByText('No se pudieron cargar las observaciones: HTTP 404').waitFor();assert.equal(await page.locator('#app').getAttribute('hidden'),'')
 assert.deepEqual(errors,[])
 await writeFile(folder+'/report.json',JSON.stringify({views,errors,errorState:'404 verified'},null,2));console.log(folder+'/report.json')
}finally{await browser.close()}
