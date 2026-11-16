import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('.',import.meta.url),read=file=>readFile(new URL(file,root)),json=async file=>JSON.parse(await read(file));
const inputs=await json('results/inputs.json'),embeddings=await json('results/embeddings.json'),results=await json('results/retrieval.json');
for(const saved of [inputs,embeddings,results])for(const[file,hash]of Object.entries(saved.sourceHashes))assert.equal(createHash('sha256').update(await read(file)).digest('hex'),hash,file);
const vectors=embeddings.rows.map(({id,rawVector})=>({id,vector:rawVector}));
await writeFile(new URL('viewer-data.json',root),JSON.stringify({kind:'saved_retrieval_outcomes_no_live_model',capturedAt:results.capturedAt,inputs,results,vectors},null,2)+'\n');
console.log('Viewer data derived from original captures; no model inference or new rankings.');
