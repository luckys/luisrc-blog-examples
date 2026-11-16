import {readFile,writeFile,mkdir,link,unlink,appendFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=new URL('./',import.meta.url);
export const read=file=>readFile(new URL(file,root));
export const json=async file=>JSON.parse(await read(file));
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function fileDigest(path){const h=createHash('sha256');for await(const chunk of createReadStream(path))h.update(chunk);return h.digest('hex');}
export async function exists(file){try{await read(file);return true;}catch(error){if(error.code!=='ENOENT')throw error;return false;}}
export async function saveNew(file,record){
 const target=new URL(file,root);await mkdir(dirname(fileURLToPath(target)),{recursive:true});const temp=new URL(file+'.'+process.pid+'.part',root);
 await writeFile(temp,JSON.stringify(record,null,2)+'\n',{flag:'wx'});try{await link(temp,target);}finally{await unlink(temp);}
}
export const event=record=>appendFile(new URL('results/response-v2/events.jsonl',root),JSON.stringify({...record,at:new Date().toISOString(),pid:process.pid})+'\n');
export async function journal(){try{return(await read('results/response-v2/events.jsonl')).toString().trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));}catch(error){if(error.code==='ENOENT')return[];throw error;}}
export function attemptState(id,events,saved){if(saved)return'reused';return events.some(e=>e.event==='case_started'&&e.id===id)?'interrupted_unknown':'not_started';}
