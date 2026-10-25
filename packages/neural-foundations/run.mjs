import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, renameSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
const directory=fileURLToPath(new URL('.',import.meta.url))
const runtime=JSON.parse(readFileSync(new URL('runtime.json',import.meta.url)))
const mode=process.argv[2]??'tests'
const commands={tests:['-B','-m','unittest','discover','-s','tests','-v'],results:['-B','experiments.py'],verify:['-B','verify.py']}
if(!(mode in commands))throw Error('tests | results | verify')
const name='luisrc-neural-'+randomBytes(5).toString('hex')
if(spawnSync('docker',['container','inspect',name],{stdio:'ignore'}).status===0)throw Error('resource already exists')
let result
try{
 result=spawnSync('docker',['run','--name',name,'--rm','--pull=never','--network','none','--read-only','--tmpfs','/tmp',
  '--cpus',String(runtime.cpus),'--memory',runtime.memory,'--user','1000:100','--cap-drop','ALL',
  ...['OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS'].flatMap(k=>['--env',k+'=1']),
  '--mount',`type=bind,src=${directory},dst=/work,readonly`,'--workdir','/work','--entrypoint','python',runtime.image,...commands[mode]],
  {encoding:'utf8',maxBuffer:64*1024*1024,timeout:180000})
 if(result.stderr)process.stderr.write(result.stderr)
 if(result.error||result.status!==0)throw result.error??Error('container failed:'+result.status)
 if(mode==='results'){
  const report=JSON.parse(result.stdout)
  if(report.results.cases.length!==5)throw Error('incomplete training output')
  const text=JSON.stringify(report,null,2)+'\n'
  for(const file of ['results/training.json','training.json']){
   writeFileSync(new URL(file+'.pending',import.meta.url),text)
   renameSync(new URL(file+'.pending',import.meta.url),new URL(file,import.meta.url))
  }
  console.log(JSON.stringify(report.results.cases.map(c=>({id:c.id,initialLoss:c.history[0].trainLoss,finalLoss:c.history.at(-1).trainLoss,validation:c.history.at(-1).validationAccuracy,test:c.test})),null,2))
 }else process.stdout.write(result.stdout)
}finally{
 // Only this random, preflighted name can be removed. No global prune.
 spawnSync('docker',['rm','-f',name],{stdio:'ignore'})
}
