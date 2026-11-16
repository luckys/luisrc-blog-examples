import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
export const root=new URL('.',import.meta.url),read=file=>readFile(new URL(file,root)),json=async file=>JSON.parse(await read(file)),digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function requireMissing(file){try{await access(new URL(file,root));throw Error(file+' exists: preserve and version before another experiment');}catch(error){if(error.code!=='ENOENT')throw error;}}
export async function saveNew(file,data){await writeFile(new URL(file,root),JSON.stringify(data,null,2)+'\n',{flag:'wx'});}
export async function preserveBytes(file,bytes){try{assert.equal(digest(await read(file)),digest(bytes),file);}catch(error){if(error.code!=='ENOENT')throw error;await writeFile(new URL(file,root),bytes,{flag:'wx'});}}
export async function hashes(files){return Object.fromEntries(await Promise.all(files.map(async file=>[file,digest(await read(file))])));}
export async function verifyHashes(saved){for(const[file,hash]of Object.entries(saved.sourceHashes))assert.equal(digest(await read(file)),hash,file);}
