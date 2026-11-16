import {readFile,writeFile,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRepresentation,duplicateGroups,nearSimilarity,wordWindows,digest} from './ledger.mjs';
import {sourceParts} from './ledger-inputs.mjs';
const root=new URL('.',import.meta.url),read=file=>readFile(new URL(file,root)),json=async file=>JSON.parse(await read(file));
try{await access(new URL('results/ledger.json',root));throw Error('Ledger exists: preserve/version it before another derivation');}catch(error){if(error.code!=='ENOENT')throw error;}
const extraction=await json('results/extraction.json'),ocr=await json('results/ocr-words.json'),protocol=await json('ledger-protocol.json'),registry=await json('sources.v1.json');
for(const saved of [extraction,ocr])for(const[file,hash]of Object.entries(saved.sourceHashes))assert.equal(digest(await read(file)),hash,file);
const documents=[];
for(const source of registry) {
  const bytes=await read(source.file),versioned={...source,documentVersion:digest(bytes)};
  documents.push(createRepresentation(versioned,sourceParts(source,extraction,ocr.words,bytes.toString())));
}
const rawGroups=duplicateGroups(documents,'documentVersion'),contentGroups=duplicateGroups(documents,'contentHash');
const representatives=contentGroups.map(group=>documents.find(doc=>doc.documentId===group.representativeId));
const nearCandidates=[];
for(let i=0;i<representatives.length;i++)for(let j=i+1;j<representatives.length;j++){
 const a=representatives[i],b=representatives[j];if(a.role!==b.role)continue;
 const jaccard=nearSimilarity(a.text,b.text);if(jaccard!==null&&jaccard>=.8)nearCandidates.push({a:a.documentId,b:b.documentId,jaccard,decision:'review_only_not_merged'});
}
const indexDocuments=representatives.filter(doc=>doc.role==='corpus');
const chunks=protocol.windows.budgets.flatMap(budget=>indexDocuments.flatMap(doc=>wordWindows(doc,budget)));
const sourceFiles=['ledger-protocol.json','sources.v1.json','ledger.mjs','ranges.mjs','ledger-inputs.mjs','build-ledger.mjs','results/extraction.json','results/ocr-words.json',...registry.map(source=>source.file)];
const sourceHashes=Object.fromEntries(await Promise.all([...new Set(sourceFiles)].map(async file=>[file,digest(await read(file))])));
const report={derivedAt:new Date().toISOString(),kind:'derived_provenance_dedup_word_windows_no_new_ocr',sourceHashes,protocol,documents,rawGroups,contentGroups,nearCandidates,indexDocumentIds:indexDocuments.map(doc=>doc.documentId),chunks,
 summary:{sources:documents.length,rawGroups:rawGroups.length,contentGroups:contentGroups.length,indexDocuments:indexDocuments.length,chunks:chunks.length}};
await writeFile(new URL('results/ledger.json',root),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({summary:report.summary,nearCandidates,unitCounts:documents.map(doc=>[doc.documentId,doc.units.length])},null,2));
