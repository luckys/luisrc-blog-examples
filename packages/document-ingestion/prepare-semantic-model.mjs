import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {digest} from './ledger.mjs';
import assert from 'node:assert/strict';
const root=new URL('.',import.meta.url),snapshot=JSON.parse(await readFile(new URL('semantic-model-files.json',root)));
for(const file of snapshot.files){
 const target=new URL('.cache/semantic-model/'+file.file,root);await mkdir(new URL('.',target),{recursive:true});let bytes;
 try{bytes=await readFile(target);}catch(error){if(error.code!=='ENOENT')throw error;
  try{bytes=await readFile(new URL('../vector-retrieval/.cache/model/'+file.file,root));}catch(error){if(error.code!=='ENOENT')throw error;const response=await fetch(file.url);if(!response.ok)throw Error('Model HTTP '+response.status);bytes=Buffer.from(await response.arrayBuffer());}
 }
 assert.equal(digest(bytes),file.sha256,file.file);await writeFile(target,bytes);console.log('Verified semantic model '+file.file);
}
