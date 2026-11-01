import {readFile,mkdir,writeFile,rename,rm,access} from 'node:fs/promises';
import {createWriteStream,createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createHash} from 'node:crypto';
const protocol=JSON.parse(await readFile(new URL('protocol.json',import.meta.url))), {model,revision,dtype}=protocol.encoder;
const base=new URL('.cache/model/',import.meta.url);
const expected={
 'tokenizer.json':'b60b6b43406a48bf3638526314f3d232d97058bc93472ff2de930d43686fa441',
 'unigram.json':'71b44701d7efd054205115acfa6ef126c5d2f84bd3affe0c59e48163674d19a6',
 'onnx/model_quantized.onnx':'66fc00f5f29afcaff34092e1bdd20008ca3918265a82fb9695a551e510cc4ebc',
};
const files=['config.json','tokenizer_config.json','special_tokens_map.json',...Object.keys(expected)];
const digest=async file=>{const h=createHash('sha256');for await(const c of createReadStream(file))h.update(c);return h.digest('hex');};
const manifest=[];
for(const file of files){
 const target=new URL(file,base);await mkdir(new URL('.',target),{recursive:true});
 const url=`https://huggingface.co/${model}/resolve/${revision}/${file}`;
 try{await access(target);}catch{
  const response=await fetch(url);if(!response.ok)throw Error(`${response.status} ${file}`);
  const part=new URL(target.href+'.part');try{await pipeline(Readable.fromWeb(response.body),createWriteStream(part));await rename(part,target);}catch(e){await rm(part,{force:true});throw e;}
 }
 const sha256=await digest(target);
 if(expected[file]&&sha256!==expected[file])throw Error('Pinned Hub LFS hash mismatch: '+file);
 manifest.push({file,sha256,url});console.log('Verified '+file);
}
const snapshot={model,revision,dtype,files:manifest};let previous;
try{previous=JSON.parse(await readFile(new URL('model-files.json',import.meta.url)));}catch{}
if(previous&&JSON.stringify(previous)!==JSON.stringify(snapshot))throw Error('Snapshot changed');
await writeFile(new URL('model-files.json',import.meta.url),JSON.stringify(snapshot,null,2)+'\n');
