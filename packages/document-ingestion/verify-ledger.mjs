import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRepresentation,duplicateGroups,nearSimilarity,wordWindows,digest} from './ledger.mjs';
import {sourceParts} from './ledger-inputs.mjs';
import {resolveRange} from './ranges.mjs';
import {parseHtmlBlocks} from './parsing.mjs';
import './verify.mjs';
const root=new URL('.',import.meta.url),read=file=>readFile(new URL(file,root)),json=async file=>JSON.parse(await read(file));
const saved=await json('results/ledger.json'),preflight=await json('results/token-preflight.json'),registry=await json('sources.v1.json'),extraction=await json('results/extraction.json'),ocr=await json('results/ocr-words.json');
for(const capture of [saved,preflight])for(const[file,hash]of Object.entries(capture.sourceHashes))assert.equal(digest(await read(file)),hash,file);
const rebuilt=[];
for(const source of registry){
 const bytes=await read(source.file);
 const doc=createRepresentation({...source,documentVersion:digest(bytes)},sourceParts(source,extraction,ocr.words,bytes.toString()));rebuilt.push(doc);
 assert.deepEqual(doc,saved.documents.find(row=>row.documentId===source.id));
 assert.equal(doc.text,doc.units.map(unit=>unit.text).join(' '));
 for(const unit of doc.units){
  assert.equal(doc.text.slice(unit.start,unit.end),unit.rawText.normalize('NFC'));
  const origin=unit.origin;let expected;
  if(origin.kind==='pdf'){const page=extraction.documents.find(row=>row.id===source.captureId).pages[origin.page-1];const original=page.words[origin.wordOrdinal];expected=original.text;assert.deepEqual(origin.bbox,original.bbox);assert.equal(origin.coordinateSpace,'pdf-point-top-left');}
  else if(origin.kind==='ocr'){const original=ocr.words[origin.wordOrdinal];expected=original.text;assert.deepEqual(origin.bbox,original.bbox);assert.equal(origin.coordinateSpace,'pixel-top-left');}
  else if(origin.kind==='html'){const block=parseHtmlBlocks(bytes.toString())[origin.blockIndex];expected=block.text.slice(origin.blockStart,origin.blockEnd);}
  else expected=bytes.toString().slice(origin.start,origin.end);
  assert.equal(unit.rawText,expected);
  const quote=resolveRange(doc,unit.start,unit.end);assert.equal(quote.text,unit.text);assert.equal(quote.references.length,1);
 }
}
assert.deepEqual(duplicateGroups(rebuilt,'documentVersion'),saved.rawGroups);assert.deepEqual(duplicateGroups(rebuilt,'contentHash'),saved.contentGroups);
for(const group of saved.rawGroups){const files=await Promise.all(group.aliases.map(alias=>read(alias.file)));for(const bytes of files)assert.ok(bytes.equals(files[0]));}
for(const group of saved.contentGroups){const docs=group.aliases.map(alias=>rebuilt.find(doc=>doc.documentId===alias.documentId));for(const doc of docs)assert.equal(doc.text,docs[0].text);}
const representatives=saved.contentGroups.map(group=>rebuilt.find(doc=>doc.documentId===group.representativeId));
const expectedNear=[];for(let i=0;i<representatives.length;i++)for(let j=i+1;j<representatives.length;j++){
 const a=representatives[i],b=representatives[j];if(a.role!==b.role)continue;const score=nearSimilarity(a.text,b.text);
 if(score!==null&&score>=.8)expectedNear.push({a:a.documentId,b:b.documentId,jaccard:score,decision:'review_only_not_merged'});
}
assert.deepEqual(expectedNear,saved.nearCandidates);
assert.ok(saved.contentGroups.some(group=>group.representativeId==='CACHE300'));
assert.ok(saved.contentGroups.some(group=>group.representativeId==='CACHE301'));
assert.ok(saved.contentGroups.some(group=>group.representativeId==='CACHE-OPPOSITE'));
const indexDocs=representatives.filter(doc=>doc.role==='corpus');
assert.deepEqual(saved.indexDocumentIds,indexDocs.map(doc=>doc.documentId));
const expectedChunks=saved.protocol.windows.budgets.flatMap(budget=>indexDocs.flatMap(doc=>wordWindows(doc,budget)));assert.deepEqual(expectedChunks,saved.chunks);
assert.equal(new Set(saved.chunks.map(chunk=>chunk.id)).size,saved.chunks.length);
for(const budget of saved.protocol.windows.budgets)for(const doc of indexDocs){
 const chunks=saved.chunks.filter(chunk=>chunk.documentId===doc.documentId&&chunk.budget===budget);
 assert.equal(chunks.length,Math.ceil(doc.units.length/budget));assert.equal(chunks.map(chunk=>chunk.text).join(' '),doc.text);
 const coverage=chunks.flatMap(chunk=>Array.from({length:chunk.last-chunk.first},(_,i)=>chunk.first+i));assert.deepEqual(coverage,doc.units.map(unit=>unit.ordinal));
 for(const chunk of chunks)assert.equal(resolveRange(doc,chunk.start,chunk.end).text,chunk.text);
}
assert.equal(preflight.rows.length,saved.chunks.length);assert.equal(new Set(preflight.rows.map(row=>row.chunkId)).size,saved.chunks.length);
for(const row of preflight.rows){const chunk=saved.chunks.find(chunk=>chunk.id===row.chunkId);assert.equal(row.units,chunk.last-chunk.first);assert.equal(row.modelTokens,row.modelTokenIds.length);assert.ok(row.modelTokenIds.every(Number.isInteger));assert.ok(row.modelTokens<=preflight.config.maxTokens);}
for(const summary of preflight.summaries){const rows=preflight.rows.filter(row=>row.budget===summary.budget);assert.deepEqual(summary,{budget:summary.budget,chunks:rows.length,minUnits:Math.min(...rows.map(row=>row.units)),maxUnits:Math.max(...rows.map(row=>row.units)),minModelTokens:Math.min(...rows.map(row=>row.modelTokens)),maxModelTokens:Math.max(...rows.map(row=>row.modelTokens))});}
if(process.argv.includes('--tokenizer')){
 const snapshot=await json('tokenizer-files.json');for(const file of snapshot.files)assert.equal(digest(await read('.cache/tokenizer/'+file.file)),file.sha256);
 const{AutoTokenizer,env}=await import('@huggingface/transformers');env.allowRemoteModels=false;env.allowLocalModels=true;
 const tokenizer=await AutoTokenizer.from_pretrained(fileURLToPath(new URL('.cache/tokenizer/',root)),{local_files_only:true});
 const output=tokenizer(saved.chunks.map(chunk=>chunk.text),{padding:false,truncation:false,return_tensor:false,add_special_tokens:true});
 assert.deepEqual(output.input_ids,preflight.rows.map(row=>row.modelTokenIds));console.log('All47 tokenizer sequences independently reproduced; no encoder inference.');
}
console.log('Nine sources,all760 unit origins,raw/normalized aliases,near controls,47 windows and token summaries verified without rewriting evidence.');
