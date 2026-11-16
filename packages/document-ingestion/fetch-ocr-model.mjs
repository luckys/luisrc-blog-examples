import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('.',import.meta.url),manifest=JSON.parse(await readFile(new URL('ocr-model.json',root))),target=new URL('.cache/ocr-model/'+manifest.file,root);
if(!manifest.sha256)throw Error('Establish and review the model digest before executing this downloader');
let bytes;try{bytes=await readFile(target);}catch(error){if(error.code!=='ENOENT')throw error;const response=await fetch(manifest.url);if(!response.ok)throw Error('Model HTTP '+response.status);bytes=Buffer.from(await response.arrayBuffer());}
assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.sha256,'Model digest');
await writeFile(target,bytes);console.log('Verified Spanish OCR model at pinned revision');
