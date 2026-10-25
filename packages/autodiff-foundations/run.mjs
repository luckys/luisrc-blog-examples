import{spawnSync}from'node:child_process'
import{readFileSync,writeFileSync,renameSync}from'node:fs'
import{fileURLToPath}from'node:url'
import{randomBytes}from'node:crypto'
const directory=fileURLToPath(new URL('.',import.meta.url)),dependency=fileURLToPath(new URL('../neural-foundations/',import.meta.url))
const runtime=JSON.parse(readFileSync(new URL('runtime.json',import.meta.url)))
const mode=process.argv[2]??'tests',commands={tests:['-B','-m','unittest','discover','-s','tests','-v'],results:['-B','experiments.py'],verify:['-B','verify.py']}
if(!(mode in commands))throw Error('tests | results | verify')
const name='luisrc-autodiff-'+randomBytes(5).toString('hex')
if(spawnSync('docker',['container','inspect',name],{stdio:'ignore'}).status===0)throw Error('resource exists')
try{
 const r=spawnSync('docker',['run','--rm','--name',name,'--pull=never','--platform',runtime.platform,'--network','none','--read-only','--tmpfs','/tmp','--cpus',String(runtime.cpus),'--memory',runtime.memory,'--user','1000:100','--cap-drop','ALL',
  ...['OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS'].flatMap(k=>['--env',k+'=1']),
  '--mount',`type=bind,src=${directory},dst=/work/autodiff-foundations,readonly`,'--mount',`type=bind,src=${dependency},dst=/work/neural-foundations,readonly`,
  '--workdir','/work/autodiff-foundations','--entrypoint','python',runtime.image,...commands[mode]],{encoding:'utf8',maxBuffer:32*1024*1024,timeout:180000})
 if(r.stderr)process.stderr.write(r.stderr)
 if(r.error||r.status!==0)throw r.error??Error('experiment failed:'+r.status)
 if(mode==='results'){
  const report=JSON.parse(r.stdout)
  if(report.kind!=='manual_finite_difference_and_pytorch_autograd_observations'||report.cases.length!==3)throw Error('incomplete report')
  for(const f of ['results/gradients.json','comparison.json']){writeFileSync(new URL(f+'.pending',import.meta.url),JSON.stringify(report,null,2)+'\n');renameSync(new URL(f+'.pending',import.meta.url),new URL(f,import.meta.url))}
  console.log(JSON.stringify(report.cases.map(c=>({id:c.id,loss:c.trace.loss,maxTorchError:c.maxTorchError,gradcheck:c.checks.gradcheck,detachedMissing:c.checks.detached.filter(v=>v===null).length})),null,2))
 }else process.stdout.write(r.stdout)
}finally{spawnSync('docker',['rm','-f',name],{stdio:'ignore'})}
