import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('./',import.meta.url),read=file=>readFile(new URL(file,root)),digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const target=new URL('context-tokenizers.v1.json',root);
let manifest;
try{manifest=JSON.parse(await readFile(target));}catch(error){if(error.code!=='ENOENT')throw error;}
const plan=JSON.parse(await read('comparison-plan.v1.json'));
const names=['added_tokens.json','config.json','special_tokens_map.json','tokenizer.json','tokenizer_config.json'];
if(!manifest){
 const tokenizers=[];
 for(const model of plan.models){
  const response=await fetch('https://huggingface.co/api/models/'+model.repository+'/tree/'+model.revision,{signal:AbortSignal.timeout(30000)});assert.ok(response.ok,'Pinned metadata tree unavailable');const tree=await response.json();
  const files=[];await mkdir(new URL('.cache/tokenizers/'+model.id+'/',root),{recursive:true});
  for(const file of names){
   const entry=tree.find(row=>row.path===file&&row.type==='file');assert.ok(entry&&/^[a-f0-9]{40}$/.test(entry.oid),'Missing immutable JSON metadata '+file);
   const url='https://huggingface.co/'+model.repository+'/resolve/'+model.revision+'/'+file;
   let bytes;
   if(model.id==='A')try{bytes=await read('../rag-architecture/.cache/context-tokenizer/'+file);}catch(error){if(error.code!=='ENOENT')throw error;}
   if(!bytes){const res=await fetch(url,{signal:AbortSignal.timeout(60000)});assert.ok(res.ok,'Metadata file unavailable '+file);bytes=Buffer.from(await res.arrayBuffer());}
   assert.equal(bytes.length,entry.size);assert.equal(createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex'),entry.oid,file+' Git blob');JSON.parse(bytes);
   await writeFile(new URL('.cache/tokenizers/'+model.id+'/'+file,root),bytes);
   files.push({file,url,bytes:bytes.length,sha256:digest(bytes),gitBlob:entry.oid});
  }
  tokenizers.push({id:model.id,repository:model.repository,revision:model.revision,cacheFolder:'.cache/tokenizers/'+model.id,files});
 }
 manifest={kind:'pinned_tokenizer_json_metadata_only_no_weights',library:'@huggingface/transformers',libraryVersion:'3.8.1',tokenizers};
 await writeFile(target,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
}else{
 for(const tokenizer of manifest.tokenizers){await mkdir(new URL(tokenizer.cacheFolder+'/',root),{recursive:true});for(const file of tokenizer.files){let bytes;try{bytes=await read(tokenizer.cacheFolder+'/'+file.file);}catch(error){if(error.code!=='ENOENT')throw error;const res=await fetch(file.url,{signal:AbortSignal.timeout(60000)});assert.ok(res.ok);bytes=Buffer.from(await res.arrayBuffer());}assert.equal(bytes.length,file.bytes);assert.equal(digest(bytes),file.sha256);await writeFile(new URL(tokenizer.cacheFolder+'/'+file.file,root),bytes);}}
}
console.log(JSON.stringify({tokenizers:manifest.tokenizers.length,metadataFiles:manifest.tokenizers.reduce((n,r)=>n+r.files.length,0),bytes:manifest.tokenizers.reduce((n,r)=>n+r.files.reduce((s,f)=>s+f.bytes,0),0),weightsDownloaded:false}));
