import {createWorker,OEM} from 'tesseract.js';
import {readFile,writeFile,access,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {parsePdfWords,orderBodyWords,parseHtmlBlocks} from './parsing.mjs';
import {characterErrorRate} from './evaluation.mjs';

const root=new URL('.',import.meta.url),read=file=>readFile(new URL(file,root));
const json=async file=>JSON.parse(await read(file)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
try{await access(new URL('results/extraction.json',root));throw Error('Capture exists; preserve/version it first');}catch(error){if(error.code!=='ENOENT')throw error;}
const protocol=await json('protocol.json'),model=await json('ocr-model.json'),truth=await json('fixtures/truth.json');
assert.equal(sha(await read('.cache/ocr-model/'+model.file)),model.sha256);
const run=(program,args)=>execFileSync(program,args,{encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024});
const versions={};
// Poppler prints its version to stderr, so read it explicitly without a shell.
const {spawnSync}=await import('node:child_process');
for(const program of ['pdftotext','pdftoppm']){
 const result=spawnSync(program,['-v'],{encoding:'utf8',timeout:10000});
 assert.equal(result.status,0);versions[program]=(result.stderr||result.stdout).split('\n')[0];
 assert.ok(versions[program].includes(protocol.pdf.popplerVersion));
}
versions.node=process.version;versions.tesseractJs='7.0.0';
const documents=[];
for(const [id,file] of [['RUNBOOK','digital'],['COLUMNS','columns'],['SCAN','scanned']]){
 const path=fileURLToPath(new URL('fixtures/'+file+'.pdf',root));
 const xml=run('pdftotext',['-bbox-layout',path,'-']);
 const rawText=run('pdftotext',['-raw',path,'-']);
 documents.push({id,file:'fixtures/'+file+'.pdf',rawText,xml,pages:parsePdfWords(xml)});
}
for(const [id,file]of [['HTML','guide'],['HTML-MIRROR','guide-mirror']])documents.push({id,file:'fixtures/'+file+'.html',blocks:parseHtmlBlocks(await read('fixtures/'+file+'.html').then(b=>b.toString()))});
assert.equal(documents.find(d=>d.id==='SCAN').pages.flatMap(p=>p.words).length,0);
const require=createRequire(import.meta.url),engineRequire=createRequire(require.resolve('tesseract.js')),coreRoot=new URL('./',pathToFileURL(engineRequire.resolve('tesseract.js-core/package.json')));
const coreFiles=(await readdir(coreRoot)).filter(name=>name.includes('.wasm'));
const runtime={...versions,coreBundle:Object.fromEntries(await Promise.all(coreFiles.map(async file=>[file,sha(await readFile(new URL(file,coreRoot)))]))),ocrModel:model};
await writeFile(new URL('runtime.json',root),JSON.stringify(runtime,null,2)+'\n');
const lock=await readFile(new URL('../../pnpm-lock.yaml',root));await writeFile(new URL('dependency-lock.capture.json',root),JSON.stringify({originalPath:'../../pnpm-lock.yaml',sha256:sha(lock),content:lock.toString()},null,2)+'\n');
run('pdftoppm',['-r',String(protocol.pdf.rasterDpi),'-f','1','-singlefile','-png',fileURLToPath(new URL('fixtures/scanned.pdf',root)),fileURLToPath(new URL('ocr-input',root))]);
const imageInput=await read('ocr-input.png');assert.equal(imageInput.readUInt32BE(0),0x89504e47);
const imageSize={width:imageInput.readUInt32BE(16),height:imageInput.readUInt32BE(20)};assert.deepEqual(imageSize,{width:1224,height:1584});
const worker=await createWorker('spa',OEM.LSTM_ONLY,{langPath:fileURLToPath(new URL('.cache/ocr-model',root)),gzip:false,cacheMethod:'none'});
let output;
try {
 await worker.setParameters({tessedit_pageseg_mode:String(protocol.ocr.psm),user_defined_dpi:String(protocol.pdf.rasterDpi)});
 output=(await worker.recognize(imageInput,{},{text:true,tsv:true,blocks:true})).data;
}finally{await worker.terminate();}
const tsvLines=output.tsv.trimEnd().split('\n'),header=tsvLines.shift().split('\t');
const words=tsvLines.map(line=>Object.fromEntries(line.split('\t').map((value,i)=>[header[i],value]))).filter(row=>row.level==='5'&&row.text).map((row,ordinal)=>({ordinal,text:row.text,confidence:Number(row.conf),bbox:[Number(row.left),Number(row.top),Number(row.left)+Number(row.width),Number(row.top)+Number(row.height)]}));
const columns=documents.find(d=>d.id==='COLUMNS').pages[0];
const layout=Object.fromEntries(['stream','rows','columns'].map(mode=>[mode,orderBodyWords(columns.words,mode,protocol.layout).map(w=>w.text).join(' ')]));
const metrics={ocr:characterErrorRate(truth.singleText,output.text),layout:Object.fromEntries(Object.entries(layout).map(([mode,text])=>[mode,characterErrorRate(truth.columnsBody,text)]))};
const files=['protocol.json','fixture-content.json','make-fixtures.mjs','parsing.mjs','evaluation.mjs','capture.mjs','ocr-model.json','runtime.json','dependency-lock.capture.json','fixtures/digital.pdf','fixtures/columns.pdf','fixtures/scanned.pdf','fixtures/guide.html','fixtures/guide-mirror.html','fixtures/truth.json','scanned-preview.png','columns-preview.png','ocr-input.png'];
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,sha(await read(file))])));
const capture={capturedAt:new Date().toISOString(),kind:'actual_poppler_extraction_and_tesseract_wasm_ocr',sourceHashes,protocol,runtime,documents,ocr:{input:'ocr-input.png',...imageSize,text:output.text,confidence:output.confidence,tsv:output.tsv,blocks:output.blocks,words},layout,metrics};
await writeFile(new URL('results/extraction.json',root),JSON.stringify(capture,null,2)+'\n');
console.log(JSON.stringify({documents:documents.map(d=>({id:d.id,words:d.pages?.flatMap(p=>p.words).length,blocks:d.blocks?.length})),ocrWords:words.length,confidence:output.confidence,metrics},null,2));
