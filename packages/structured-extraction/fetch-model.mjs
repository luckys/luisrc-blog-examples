import {readFile,mkdir,writeFile,rename,rm,access} from 'node:fs/promises';
import {createWriteStream,createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createHash} from 'node:crypto';
const runtime=JSON.parse(await readFile(new URL('runtime.json',import.meta.url)));
const base=new URL('.cache/model/',import.meta.url);
const files=['config.json','generation_config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','added_tokens.json','vocab.json','merges.txt','onnx/model_q4.onnx'];
const digest=async path=>{const h=createHash('sha256');for await(const c of createReadStream(path))h.update(c);return h.digest('hex');};
const manifest=[];
for(const file of files){
 const target=new URL(file,base);await mkdir(new URL('.',target),{recursive:true});
 const url=`https://huggingface.co/${runtime.model}/resolve/${runtime.revision}/${file}`;
 try{await access(target);}catch{
  const r=await fetch(url);if(!r.ok)throw Error(`${r.status} ${file}`);const part=new URL(target.href+'.part');
  try{await pipeline(Readable.fromWeb(r.body),createWriteStream(part));await rename(part,target);}catch(e){await rm(part,{force:true});throw e;}
 }
 const sha256=await digest(target);
 if(file==='onnx/model_q4.onnx'&&sha256!=='09235a3b1c135cd04ef570e5053b5c079e028078a2cc5f76ba6a251e91bf3296')throw Error('Model hash differs from pinned Hub LFS object');
 manifest.push({file,sha256,url});console.log('Verified '+file);
}
const snapshot={model:runtime.model,revision:runtime.revision,dtype:runtime.dtype,files:manifest};
let previous;try{previous=JSON.parse(await readFile(new URL('model-files.json',import.meta.url)));}catch{}
if(previous&&JSON.stringify(previous)!==JSON.stringify(snapshot))throw Error('Model snapshot changed');
await writeFile(new URL('model-files.json',import.meta.url),JSON.stringify(snapshot,null,2)+'\n');
