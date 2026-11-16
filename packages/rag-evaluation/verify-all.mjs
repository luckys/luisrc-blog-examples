import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
for(const file of ['verify.mjs','verify-rankings.v1.mjs','verify-contexts.v1.mjs']){
 const result=spawnSync(process.execPath,[fileURLToPath(new URL(file,import.meta.url))],{stdio:'inherit'});
 if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);
}
console.log('Dataset, rankings and contexts verified; no model inference.');
