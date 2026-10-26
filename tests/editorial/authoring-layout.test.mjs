import test from'node:test'
import assert from'node:assert/strict'
import{readFile,readdir,access}from'node:fs/promises'
import{createRequire}from'node:module'
import{resolve}from'node:path'
import{blogPath}from'../../scripts/blog-path.mjs'
import{editorialPath}from'../../scripts/editorial-path.mjs'
test('autoría: planificación y herramientas viven fuera del blog y sus imports existen',async()=>{
 await assert.rejects(access(blogPath('docs/editorial')),{code:'ENOENT'})
 await access(blogPath('docs/roadmap-editorial-ingenieria-paysafe-ia.md'))
 const scripts=await readdir(blogPath('scripts'))
 assert.ok(!scripts.some(f=>/^(check-|render-|audit-editorial)/.test(f)))
 const tools=await readdir('tools/blog');assert.ok(tools.length>=46)
 const require=createRequire(new URL('../../package.json',import.meta.url))
 for(const name of tools){const source=await readFile('tools/blog/'+name,'utf8')
  for(const[,reference]of source.matchAll(/from\s*['"]([^'"]+)['"]/g)){
   if(reference.startsWith('node:'))continue
   if(reference.startsWith('.'))await access(resolve('tools/blog',reference))
   else require.resolve(reference)
  }
 }
 assert.throws(()=>editorialPath('../../package.json'))
 await access(editorialPath('roadmap-continuation.md'))
})
