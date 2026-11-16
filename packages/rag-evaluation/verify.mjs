import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {validateDataset} from './dataset.mjs';
export async function readDataset(baseUrl=new URL('./',import.meta.url)){
 const read=async file=>readFile(new URL(file,baseUrl));
 const manifest=JSON.parse(await read('dataset-manifest.json'));assert.equal(manifest.kind,'dataset_integrity_manifest_not_experiment_result');assert.equal(manifest.modelRuns,0);
 assert.deepEqual(manifest.files.map(r=>r.file),['corpus.json','queries.json','gold.json']);
 const data={};for(const row of manifest.files){const bytes=await read(row.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256,row.file+' changed: create a new dataset version');data[row.file.replace('.json','')]=JSON.parse(bytes);}
 return{manifest,...data};
}
export async function verifyDataset(){return validateDataset(await readDataset());}
if(import.meta.url===new URL(process.argv[1],'file://'+process.cwd()+'/').href)console.log(JSON.stringify({verified:true,...await verifyDataset()},null,2));
