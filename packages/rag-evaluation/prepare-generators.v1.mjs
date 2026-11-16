import {readFile,writeFile,mkdir,stat,link,rename,unlink} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import {Readable,Transform} from 'node:stream';
import assert from 'node:assert/strict';
const root=new URL('./',import.meta.url),read=f=>readFile(new URL(f,root)),json=async f=>JSON.parse(await read(f));
const sha=async file=>{const h=createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);return h.digest('hex');};
const plan=await json('comparison-plan.v1.json'),context=await json('context-tokenizers.v1.json');
const manifestPath=new URL('generation-models.v1.json',root);let previous;
try{previous=JSON.parse(await readFile(manifestPath));}catch(error){if(error.code!=='ENOENT')throw error;}
const profiles=[];
for(const model of plan.models){
 const folder='.cache/generators/'+model.id;await mkdir(new URL(folder+'/onnx/',root),{recursive:true});
 let files=previous?.models.find(m=>m.id===model.id)?.files;
 if(!files){
  const res=await fetch('https://huggingface.co/api/models/'+model.repository+'/tree/'+model.revision+'?recursive=true',{signal:AbortSignal.timeout(30000)});assert.ok(res.ok,'Pinned model tree unavailable');const tree=await res.json();
  files=tree.filter(r=>r.type==='file'&&((!r.path.includes('/')&&r.path.endsWith('.json'))||r.path===model.weightFile)).map(r=>({file:r.path,url:'https://huggingface.co/'+model.repository+'/resolve/'+model.revision+'/'+r.path,bytes:r.size,gitBlob:r.oid,...(r.lfs?{expectedSha256:r.lfs.oid}: {})})).sort((a,b)=>a.file.localeCompare(b.file));
  assert.ok(files.some(f=>f.file===model.weightFile&&f.expectedSha256));
 }
 const saved=[];
 for(const info of files){
  const target=new URL(folder+'/'+info.file,root);let ready=false;
  try{const s=await stat(target);ready=s.size===info.bytes&&await sha(target)===(info.sha256??info.expectedSha256);}catch(error){if(error.code!=='ENOENT')throw error;}
  if(!ready){
   let reusable;
   if(model.id==='A')reusable=new URL('../reranking-grounding/.cache/generator/'+info.file,root);
   else if(!info.file.includes('/')&&context.tokenizers.find(p=>p.id===model.id).files.some(f=>f.file===info.file))reusable=new URL('.cache/tokenizers/'+model.id+'/'+info.file,root);
   if(reusable){
    try{const bytes=await stat(reusable);if(bytes.size===info.bytes){const digest=await sha(reusable),known=info.sha256??info.expectedSha256??context.tokenizers.find(p=>p.id===model.id).files.find(f=>f.file===info.file)?.sha256;if(!known||digest===known){try{await unlink(target);}catch(error){if(error.code!=='ENOENT')throw error;}await link(reusable,target);ready=true;}}}catch(error){if(error.code!=='ENOENT')throw error;}
   }
  }
  if(!ready){
   console.log('Downloading '+model.id+' '+info.file+' '+info.bytes+' bytes');
   const response=await fetch(info.url+'?download=true',{signal:AbortSignal.timeout(600000)});assert.ok(response.ok,'Download failed '+info.file+' HTTP'+response.status);const temporary=new URL(folder+'/'+info.file+'.part',root);let received=0,last=0;
   const progress=new Transform({transform(chunk,encoding,callback){received+=chunk.length;if(received-last>=67108864){console.log(model.id+' '+info.file+' '+received+'/'+info.bytes);last=received;}callback(null,chunk);}});
   await pipeline(Readable.fromWeb(response.body),progress,createWriteStream(temporary));assert.equal(received,info.bytes,'Downloaded byte count');await rename(temporary,target);
  }
  const digest=await sha(target);assert.equal((await stat(target)).size,info.bytes);
  if(info.expectedSha256||info.sha256)assert.equal(digest,info.expectedSha256??info.sha256,info.file+' SHA256');
  if(!info.file.includes('/')){const bytes=await readFile(target);JSON.parse(bytes);assert.equal(createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex'),info.gitBlob,info.file+' Git blob');}
  const {expectedSha256,...meta}=info;saved.push({...meta,sha256:digest});console.log('Verified '+model.id+' '+info.file);
 }
 for(const f of context.tokenizers.find(p=>p.id===model.id).files)assert.equal(saved.find(r=>r.file===f.file)?.sha256,f.sha256,'Generation tokenizer must match counted input');
 profiles.push({...model,cacheFolder:folder,files:saved});
}
const manifest={kind:'pinned_local_generator_artifacts_before_inference',library:'@huggingface/transformers',libraryVersion:'3.8.1',verification:'Immutable public revision,Git blob SHA1 for JSON,LFS SHA256 for weights; recorded SHA256 of every file; not a publisher signature.',models:profiles};
if(previous)assert.deepEqual(manifest,previous);else await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log('Both pinned checkpoints prepared; no inference performed.');
