import {spawn,spawnSync} from 'node:child_process';import {readFile,writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {randomBytes,createHash} from 'node:crypto';import os from 'node:os';import assert from 'node:assert/strict';import {summarize,median} from './stream-metrics.mjs';
const json=async f=>JSON.parse(await readFile(new URL(f,import.meta.url))),runtime=await json('runtime.json'),protocol=await json('protocol.json'),directory=fileURLToPath(new URL('.',import.meta.url)),source=fileURLToPath(new URL('../language-models/',import.meta.url));
const name='luisrc-generation-stream-'+randomBytes(5).toString('hex');if(spawnSync('docker',['container','inspect',name],{stdio:'ignore'}).status===0)throw Error('resource exists');
const args=['run','-i','--rm','--name',name,'--pull=never','--platform',runtime.platform,'--network','none','--read-only','--tmpfs','/tmp','--cpus',String(runtime.cpus),'--memory',runtime.memory,'--user','1000:100','--cap-drop','ALL',...['OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS'].flatMap(k=>['--env',k+'=1']),'--mount',`type=bind,src=${directory},dst=/work/text-generation,readonly`,'--mount',`type=bind,src=${source},dst=/work/language-models,readonly`,'--workdir','/work/text-generation','--entrypoint','python',runtime.image,'-B','stream.py'];
const requests=[],started=process.hrtime.bigint();let ready,buffer='',stderr='',current=null,sentNs=null,chunk=0,startupMs;
const total=protocol.streaming.warmupRequests+protocol.streaming.measuredRequests;
const child=spawn('docker',args,{stdio:['pipe','pipe','pipe']});child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stderr.on('data',s=>stderr+=s);
try{
 await new Promise((resolve,reject)=>{
  let failure;const abort=e=>{failure=e;child.kill('SIGTERM');};const timeout=setTimeout(()=>abort(Error('stream timeout')),300000);
  const send=()=>{const index=requests.length;current={id:'R'+(index+1),warmup:index<protocol.streaming.warmupRequests,events:[]};sentNs=process.hrtime.bigint();child.stdin.write(JSON.stringify({id:current.id})+'\n');};
  child.on('error',abort);
  child.stdout.on('data',part=>{const arrival=process.hrtime.bigint();chunk++;buffer+=part;try{let newline;
   while((newline=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,newline);buffer=buffer.slice(newline+1);if(!line)continue;const event=JSON.parse(line);
    if(event.type==='ready'){assert.ok(!ready);ready=event;startupMs=Number(arrival-started)/1e6;send();continue;}
    assert.ok(current);assert.equal(event.id,current.id);const receivedMs=Number(arrival-sentNs)/1e6;current.events.push({...event,receivedMs,chunk});
    if(event.type==='done'){const tokenEvents=current.events.filter(e=>e.type==='token');assert.ok(tokenEvents.length);assert.deepEqual(tokenEvents.map(e=>e.token),event.generatedIds);current.consumer=summarize(tokenEvents.map(e=>e.receivedMs),receivedMs);current.producer=summarize(tokenEvents.map(e=>e.producerElapsedMs),event.producerElapsedMs);requests.push(current);current=null;if(requests.length<total)send();else child.stdin.end(JSON.stringify({type:'quit'})+'\n');}
   }
  }catch(e){abort(e);}});
  child.on('close',code=>{clearTimeout(timeout);if(failure)return reject(failure);if(code!==0)return reject(Error('stream child failed '+code+':'+stderr));if(requests.length!==total||buffer.trim())return reject(Error('incomplete stream'));resolve();});
 });
 const measured=requests.filter(r=>!r.warmup),medians={};for(const key of ['ttftMs','totalMs','meanInterTokenMs'])medians[key]=median(measured.map(r=>r.consumer[key]));
 const files=['protocol.json','runtime.json','inputs.json','generation.py','stream.py','stream-client.mjs','stream-metrics.mjs','../language-models/model.py','../language-models/results/observations.json'];
 const sourceHashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(new URL(f,import.meta.url))).digest('hex')])));
 const report={kind:'actual_pipe_generation_stream_measurements',capturedAt:new Date().toISOString(),runtime:{node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,container:runtime.image,producer:ready},protocol:protocol.streaming,sourceHashes,startupMs,requests,measuredMedians:medians,limits:'Local Docker stdin/stdout pipe, full forward per token, no KV cache; startup excluded after ready; consumer arrival may coalesce tokens; no HTTP, network, throughput/concurrency benchmark or timing reproducibility claim'};
 await writeFile(new URL('results/streaming.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({measuredRequests:measured.length,consumerMedians:medians,limits:report.limits},null,2));
}finally{spawnSync('docker',['rm','-f',name],{stdio:'ignore'});}
