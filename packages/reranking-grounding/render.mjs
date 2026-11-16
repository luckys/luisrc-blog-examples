import {writeFile} from 'node:fs/promises';
import {root,read,json,digest,verifyHashes} from './io.mjs';
const inputs=await json('results/inputs.json'),prepared=await json('results/answer-inputs.json'),native=await json('results/reranker.json'),generation=await json('results/generation.json'),evaluation=await json('results/evaluation.json'),annotations=await json('annotations.json'),reviewCorrections=await json('review-corrections.json');
for(const saved of [inputs,prepared,native,generation,evaluation])await verifyHashes(saved);
const outputs=[];for(const row of generation.rows){if(digest(await read(row.file))!==row.sha256)throw Error('Modified output');outputs.push(await json(row.file));}
await writeFile(new URL('viewer-data.json',root),JSON.stringify({kind:'saved_real_reranking_and_rejected_generations',inputs,prepared,native,evaluation,outputs,annotations,reviewCorrections},null,2)+'\n');
await writeFile(new URL('source-data.json',root),JSON.stringify({kind:'immutable_synthetic_source_registry',documents:inputs.documents,registry:inputs.registry},null,2)+'\n');console.log('Derived viewer and source registry; no inference and no repaired answers.');
