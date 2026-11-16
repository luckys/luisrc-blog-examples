import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
for(const file of ['render.mjs','render-rankings.mjs','render-contexts.mjs']){
 const result=spawnSync(process.execPath,[fileURLToPath(new URL(file,import.meta.url))],{stdio:'inherit'});
 if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);
}
