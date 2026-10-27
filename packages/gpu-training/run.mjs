import{spawnSync}from'node:child_process';
import{readFileSync,writeFileSync,renameSync,realpathSync}from'node:fs';
import{fileURLToPath}from'node:url';
import{randomBytes}from'node:crypto';
import{dirname,basename,join}from'node:path';
const directory=fileURLToPath(new URL('.',import.meta.url)),runtime=JSON.parse(readFileSync(new URL('runtime.json',import.meta.url)));
const mode=process.argv[2]??'tests';
const commands={tests:['-B','-m','unittest','discover','-s','tests','-v'],results:['-B','experiments.py'],observe:['-B','experiments.py'],preflight:['-B','-c',`import json,torch; x=torch.ones(128,128,device='cuda'); print(json.dumps(dict(torch=torch.__version__,cuda=torch.version.cuda,device=torch.cuda.get_device_name(),capability=torch.cuda.get_device_capability(),result=(x@x).mean().item())))`]};
if(!(mode in commands))throw Error('tests | results | observe | preflight');
const cuda=realpathSync(process.env.GPU_DRIVER_LIBDIR?join(process.env.GPU_DRIVER_LIBDIR,'libcuda.so.1'):'/usr/lib/x86_64-linux-gnu/libcuda.so.1');
const version=basename(cuda).replace('libcuda.so.',''),libdir=dirname(cuda);
const libraries=['libcuda.so.1','libnvidia-ptxjitcompiler.so.1','libnvidia-nvvm.so.4','libnvidia-gpucomp.so.'+version];
const name='luisrc-gpu-training-'+randomBytes(5).toString('hex');
if(spawnSync('docker',['container','inspect',name],{stdio:'ignore'}).status===0)throw Error('resource exists');
try{
 const args=['run','--rm','--name',name,'--pull=never','--platform',runtime.platform,'--network','none','--read-only','--tmpfs','/tmp','--cpus',String(runtime.cpus),'--memory',runtime.memory,'--user','1000:100','--cap-drop','ALL',
 '--env','LD_LIBRARY_PATH=/usr/local/nvidia/lib64:/opt/conda/lib:/usr/local/cuda/lib64','--env','CUBLAS_WORKSPACE_CONFIG=:4096:8',
 ...['OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS'].flatMap(k=>['--env',k+'=1']),
 ...runtime.devices.flatMap(path=>['--device',path]),
 ...libraries.flatMap(lib=>['--mount',`type=bind,src=${realpathSync(join(libdir,lib))},dst=/usr/local/nvidia/lib64/${lib},readonly`]),
 '--mount',`type=bind,src=${directory},dst=/work/gpu-training,readonly`,'--workdir','/work/gpu-training','--entrypoint','python',runtime.image,...commands[mode]];
 const r=spawnSync('docker',args,{encoding:'utf8',maxBuffer:64*1024*1024,timeout:300000});
 if(r.stderr)process.stderr.write(r.stderr);
 if(r.error||r.status!==0)throw r.error??Error('experiment failed:'+r.status);
 if(mode==='results'||mode==='observe'){
  const report=JSON.parse(r.stdout);
  if(report.kind!=='gpu_training_observations'||report.cases.length!==12||report.profiler.kernelEvents===0)throw Error('missing GPU evidence');
  const trace=report.profiler.trace;delete report.profiler.trace;
  if(mode==='observe'){
   const path='/tmp/gpu-training-reobservation-'+randomBytes(4).toString('hex')+'.json';writeFileSync(path,JSON.stringify(report,null,2)+'\n');console.log(path);
  }else{
   for(const[path,data]of [['results/observations.json',report],['comparison.json',report],['results/profiler-trace.json',trace]]){
    writeFileSync(new URL(path+'.pending',import.meta.url),JSON.stringify(data,null,2)+'\n');renameSync(new URL(path+'.pending',import.meta.url),new URL(path,import.meta.url));
   }
   console.log(JSON.stringify(report.cases.map(c=>({device:c.device,precision:c.precision,batch:c.batch,stepMs:c.medianStepMilliseconds,peakAllocated:c.memory?.peakAllocated})),null,2));
  }
 }else process.stdout.write(r.stdout);
}finally{spawnSync('docker',['rm','-f',name],{stdio:'ignore'});}
