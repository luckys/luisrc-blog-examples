import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {accessSync} from 'node:fs'
import {blogPath} from './blog-path.mjs'
const [name,...args]=process.argv.slice(2)
if(!name||! /^(?:check-[a-z0-9-]+|render-[a-z0-9-]+|audit-editorial-roadmap)$/.test(name))throw Error('Indica el nombre de una herramienta editorial, sin ruta ni extensión')
const tool=fileURLToPath(new URL('../tools/blog/'+name+'.mjs',import.meta.url));accessSync(tool)
const result=spawnSync(process.execPath,[tool,...args],{cwd:blogPath('.'),env:{...process.env,BLOG_ROOT:blogPath('.')},stdio:'inherit'})
if(result.error)throw result.error
process.exitCode=result.status??1
