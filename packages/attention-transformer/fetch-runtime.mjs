import{execFileSync}from'node:child_process'
import{readFileSync}from'node:fs'
const runtime=JSON.parse(readFileSync(new URL('runtime.json',import.meta.url)))
execFileSync('docker',['pull','--platform',runtime.platform,runtime.image],{stdio:'inherit'})
