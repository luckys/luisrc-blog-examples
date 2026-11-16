import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateDataset} from '../dataset.mjs';
const load=async f=>JSON.parse(await readFile(new URL('../'+f,import.meta.url)));
const fixture=async()=>({corpus:await load('corpus.json'),queries:await load('queries.json'),gold:await load('gold.json')});
test('authored collection retains exhaustive grades and grouped splits',async()=>{
 const report=validateDataset(await fixture());assert.deepEqual(report,{documents:16,facts:32,queries:20,dev:5,test:15,answerable:16,unanswerable:4,grades:{0:296,1:16,2:8},groups:8,modelRuns:0});
});
test('a paraphrase cannot move the same topic group into test',async()=>{const data=await fixture();data.queries.rows[0].split='test';assert.throws(()=>validateDataset(data),/group crosses splits/);});
test('a missing judgement is not silently treated as grade zero',async()=>{const data=await fixture();data.gold.rows[0].qrels.pop();assert.throws(()=>validateDataset(data),/exhaustive qrels/);});
test('an answerable query needs support for every required point',async()=>{const data=await fixture();data.gold.rows[0].requiredFactIds.push('missing');assert.throws(()=>validateDataset(data),/unknown required fact/);});
test('a plausible but wrongly located quotation is rejected',async()=>{const data=await fixture();data.corpus.facts[0].start+=1;assert.throws(()=>validateDataset(data),/quote range/);});
test('a grade cannot be raised to make a ranking score better',async()=>{const data=await fixture();data.gold.rows[0].qrels[0].grade=0;assert.throws(()=>validateDataset(data),/grade disagrees/);});
test('a no-answer label cannot include a required fact',async()=>{const data=await fixture();const row=data.gold.rows.find(r=>r.answerability==='unanswerable');row.requiredFactIds=[data.corpus.facts[0].id];assert.throws(()=>validateDataset(data),/answerability/);});
test('duplicate IDs do not inflate collection size or metrics',async()=>{const data=await fixture();data.queries.rows.push(structuredClone(data.queries.rows[0]));assert.throws(()=>validateDataset(data),/duplicate query/);});
test('qrels cannot judge a document outside the corpus',async()=>{const data=await fixture();data.gold.rows[0].qrels[0].documentId='foreign';assert.throws(()=>validateDataset(data),/exhaustive qrels/);});

 test('a changed gold file fails its manifest hash without touching canonical data',async()=>{
  const {mkdtemp,copyFile,writeFile,rm}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {pathToFileURL}=await import('node:url');
  const {readDataset}=await import('../verify.mjs');const folder=await mkdtemp(join(tmpdir(),'rag-gold-integrity.'));
  try{
   for(const name of ['corpus.json','queries.json','gold.json','dataset-manifest.json'])await copyFile(new URL('../'+name,import.meta.url),join(folder,name));
   await writeFile(join(folder,'gold.json'),'{}');
   await assert.rejects(readDataset(pathToFileURL(folder+'/')),/gold.json changed/);
  }finally{await rm(folder,{recursive:true,force:true});}
 });
