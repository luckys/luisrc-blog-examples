import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
for(const file of ['verify-isolation.mjs','verify-conversation.mjs','verify-multistep.mjs','verify-cache.mjs','verify-updates.mjs','verify-context.mjs','verify-generation-contracts.mjs']){
 const result=spawnSync(process.execPath,[fileURLToPath(new URL(file,import.meta.url))],{stdio:'inherit'});
 if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);
}
console.log('Seven verifiers passed; no model or SQL execution.');
