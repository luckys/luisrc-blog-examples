import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('.',import.meta.url),snapshot=JSON.parse(await readFile(new URL('model-files.json',root))),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const file of snapshot.files){
 const target=new URL('.cache/model/'+file.file,root);await mkdir(new URL('.',target),{recursive:true});let bytes;
 for(const location of [target,new URL('../document-ingestion/.cache/semantic-model/'+file.file,root),new URL('../vector-retrieval/.cache/model/'+file.file,root)]){
  try{bytes=await readFile(location);break;}catch(error){if(error.code!=='ENOENT')throw error;}
 }
 if(!bytes){const response=await fetch(file.url);if(!response.ok)throw Error('Model HTTP '+response.status);bytes=Buffer.from(await response.arrayBuffer());}
 assert.equal(hash(bytes),file.sha256,file.file);await writeFile(target,bytes);console.log('Verified '+file.file);
}
