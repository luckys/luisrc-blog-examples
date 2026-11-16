import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import assert from 'node:assert/strict';
const root=new URL('.',import.meta.url),specs=[{role:'reranker',model:'onnx-community/bge-reranker-v2-m3-ONNX',revision:'6f5ff65298512715a1e669753bc754d2bc8f367b',dtype:'q8'},{role:'generator',model:'onnx-community/Qwen2.5-0.5B-Instruct',revision:'22942cb7d7ba4cc81bb4673549ca4d4614469b5e',dtype:'q8'}],digest=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const spec of specs){
 const response=await fetch('https://huggingface.co/api/models/'+spec.model+'/revision/'+spec.revision+'?blobs=true');if(!response.ok)throw Error('Metadata HTTP '+response.status);const metadata=await response.json();assert.equal(metadata.sha,spec.revision);
 const selected=metadata.siblings.filter(f=>f.rfilename.endsWith('.json')||f.rfilename==='onnx/model_quantized.onnx'),files=[];
 for(const file of selected){
  const name=file.rfilename,url='https://huggingface.co/'+spec.model+'/resolve/'+spec.revision+'/'+name,target=new URL('.cache/'+spec.role+'/'+name,root);await mkdir(new URL('.',target),{recursive:true});let bytes;
  try{bytes=await readFile(target);}catch(error){if(error.code!=='ENOENT')throw error;}
  if(!bytes){
   const response=await fetch(url);if(!response.ok)throw Error('File HTTP '+response.status+' '+name);
   if(file.lfs){let received=0,last=0;const hash=createHash('sha256'),partial=new URL(target.href+'.part');
    await pipeline(Readable.fromWeb(response.body),new Transform({transform(chunk,encoding,callback){received+=chunk.length;hash.update(chunk);if(received-last>=64*1024*1024){last=received;console.log(spec.role+' '+name+' '+received+'/'+file.size+' bytes');}callback(null,chunk);}}),createWriteStream(partial));
    const sha256=hash.digest('hex');assert.equal(received,file.size);assert.equal(sha256,file.lfs.sha256);await rename(partial,target);files.push({file:name,url,bytes:received,sha256,gitBlob:file.blobId});console.log('Verified '+spec.role+' '+name);continue;
   }
   bytes=Buffer.from(await response.arrayBuffer());await writeFile(target,bytes);
  }
  assert.equal(bytes.length,file.size);if(file.lfs)assert.equal(digest(bytes),file.lfs.sha256);else assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),file.blobId);
  files.push({file:name,url,bytes:bytes.length,sha256:digest(bytes),gitBlob:file.blobId});console.log('Verified '+spec.role+' '+name);
 }
 const manifest={...spec,baseModel:metadata.cardData?.base_model??null,verification:'Pinned public revision; LFS SHA256 or Git blob SHA1 verified, SHA256 recorded before inference; not a publisher signature.',files};
 const output=new URL(spec.role+'-model-files.json',root);try{const previous=JSON.parse(await readFile(output));assert.deepEqual(previous,manifest,'Do not rewrite a different model manifest');}catch(error){if(error.code!=='ENOENT')throw error;await writeFile(output,JSON.stringify(manifest,null,2)+'\n');}
}
