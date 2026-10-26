import assert from'node:assert/strict'
import{readFile,writeFile,mkdtemp}from'node:fs/promises'
import{chromium}from'@playwright/test'
import{editorialPath}from'../../scripts/editorial-path.mjs'
import{attentionAt,rowAt,contributionsAt,modelAt,positionAt,format,stages}from'../../packages/attention-transformer/model.mjs'
const origin=process.env.ATTENTION_DRAFT_ORIGIN??'http://127.0.0.1:4322'
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname))
const manifest=JSON.parse(await readFile(editorialPath('attention-transformer-series.json')))
const data=JSON.parse(await readFile(new URL('../../packages/attention-transformer/comparison.json',import.meta.url)))
const widths=(process.env.ATTENTION_VIEWPORTS??'1440,360').split(',').map(Number);assert.ok(widths.length&&widths.every(w=>[1440,360].includes(w)))
const folder=await mkdtemp('/tmp/attention-transformer-layout.'),views=[],errors=[]
const table=async(page,id)=>page.locator('#'+id+' tbody tr').evaluateAll(rows=>rows.map(r=>[...r.cells].map(c=>c.textContent)))
const values=rows=>rows.map(r=>r.map(v=>typeof v==='number'||v===null?format(v):v))
const set=async(page,id,n)=>page.locator('#'+id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},n)
const overflow=async(page,id)=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow:'+id)
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
   for(const img of await page.locator('article img[src*="/attention-transformer/"]').all()){
    await img.scrollIntoViewIfNeeded();await page.waitForFunction(e=>e.complete&&e.naturalWidth>0,await img.elementHandle());assert.ok((await img.boundingBox()).width<=380.1)
    if(width===360)await img.screenshot({path:folder+'/'+a.id+'-'+(await img.getAttribute('src')).split('/').at(-1)+'.png'})
   }
   for(const link of await page.locator('article a[href^="/posts/"],article a[href^="/assets/"]').all())assert.equal((await page.request.get(origin+await link.getAttribute('href'))).status(),200)
   for(const frame of await page.locator('iframe[src*="attention-transformer"]').all()){
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
  await page.goto(origin+'/assets/interactive/attention-transformer/explorer.html',{waitUntil:'networkidle'});await page.locator('#app:not([hidden])').waitFor()
  let matrices=0,rows=0,products=0
  for(const seed of data.protocol.seeds)for(const stage of stages){
   await page.selectOption('#seed',String(seed));await page.selectOption('#stage',stage)
   const c=attentionAt(data,seed,stage)
   for(let b=0;b<2;b++)for(let h=0;h<2;h++){
    await page.selectOption('#batch',String(b));await page.selectOption('#head',String(h))
    const weights=c.trace.weights[b][h],allowed=c.trace.allowed[b][h]
    assert.deepEqual(await page.locator('#weights-chart rect[data-value]').evaluateAll(rs=>rs.map(r=>Number(r.dataset.value))),weights.flat())
    assert.deepEqual(await page.locator('#weights-chart rect[data-value]').evaluateAll(rs=>rs.map(r=>r.dataset.allowed==='true')),allowed.flat());matrices++
    for(const q of [0,weights.length-1]){
     await set(page,'query',q);const k=weights[0].length-1;await set(page,'key',k)
     const expected=rowAt(c,b,h,q).map(r=>[r.key,r.raw,r.scaled,r.allowed?'Sí':'No',r.weight])
     assert.deepEqual(await table(page,'row-values'),values(expected));rows++
     assert.deepEqual(await table(page,'vectors'),values(c.trace.query[b][h][q].map((v,i)=>[i,v,c.trace.key[b][h][k][i],c.trace.value[b][h][k][i]])))
     for(const component of [0,3]){
      await page.selectOption('#component',String(component))
      const p=contributionsAt(c,b,h,q,component)
      assert.deepEqual(await table(page,'products'),values(p.map(v=>[v.key,v.weight,v.value,v.product])))
      assert.ok((await page.locator('#weighted-sum').textContent()).includes(format(c.trace.attended[b][h][q][component])));products++
     }
    }
   }
  }
  for(let i=0;i<4;i++){
   await page.selectOption('#depth',{value:String(i)});const p=data.probes.scale[i]
   assert.deepEqual(await table(page,'scale-values'),values([['Sin escala',p.raw.scoreStd,p.raw.meanEntropy,p.raw.meanMaximumWeight],['Con escala',p.scaled.scoreStd,p.scaled.meanEntropy,p.scaled.meanMaximumWeight]]))
  }
  for(let i=0;i<16;i++){
   await page.selectOption('#position',String(i));assert.deepEqual(await table(page,'position-values'),values(positionAt(data,i).map((v,j)=>[j,v])))
  }
  for(const seed of data.protocol.seeds){
   await page.selectOption('#seed',String(seed));const m=modelAt(data,seed)
   assert.deepEqual(await page.locator('#gradient-chart rect[data-value]').evaluateAll(rs=>rs.map(r=>Number(r.dataset.value))),m.inputGradient[0].flat())
   for(let time=0;time<5;time++){
    await page.selectOption('#gradient-step',String(time));assert.deepEqual(await table(page,'gradient-values'),values(m.inputGradient[0][time].map((v,i)=>[time,i,v])))
   }
  }
  await page.locator('#key').focus();await page.locator('#key').press('ArrowDown');assert.equal(await page.locator('#key').inputValue(),'2')
  for(const region of await page.locator('.scroll').all()){
   await region.scrollIntoViewIfNeeded();await region.focus();assert.ok(await region.evaluate(e=>document.activeElement===e))
   if(await region.evaluate(e=>e.scrollWidth>e.clientWidth+2)){await region.press('ArrowRight');await page.waitForFunction(e=>e.scrollLeft>0,await region.elementHandle())}
   await region.evaluate(e=>{e.scrollLeft=0})
  }
  await overflow(page,'explorer')
  await page.selectOption('#seed','7');await page.selectOption('#stage','self_causal');await page.selectOption('#batch','0');await page.selectOption('#head','0');await set(page,'query',2)
  for(const section of await page.locator('section').all())await section.screenshot({path:folder+'/explorer-'+width+'-'+(await section.locator('h2').textContent()).slice(0,1)+'.png'})
  assert.ok(requests.every(p=>p.startsWith('/assets/interactive/attention-transformer/')),requests.join('\n'));page.off('request',listen)
  views.push({id:'explorer',width,matrices,rows,products,positions:16,gradients:15})
 }
 await page.route('**/attention-transformer/comparison.json',route=>route.fulfill({status:404,body:'missing'}));await page.goto(origin+'/assets/interactive/attention-transformer/explorer.html');await page.getByText('No se pudieron cargar las observaciones: HTTP 404').waitFor();assert.equal(await page.locator('#app').getAttribute('hidden'),'')
 assert.deepEqual(errors,[]);await writeFile(folder+'/report.json',JSON.stringify({views,errors,errorState:'404 verified'},null,2));console.log(folder+'/report.json')
}finally{await browser.close()}
