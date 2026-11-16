import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {parsePdfWords,parseHtmlBlocks,orderBodyWords} from './parsing.mjs';
import {characterErrorRate} from './evaluation.mjs';
import {parseOcrTsv} from './ocr-tsv.mjs';
const root=new URL('.',import.meta.url),read=file=>readFile(new URL(file,root)),json=async file=>JSON.parse(await read(file));
const capture=await json('results/extraction.json'),derived=await json('results/ocr-words.json'),truth=await json('fixtures/truth.json');
for(const saved of [capture,derived])for(const [file,sha]of Object.entries(saved.sourceHashes))assert.equal(createHash('sha256').update(await read(file)).digest('hex'),sha,file);
const archive=await json('dependency-lock.capture.json');assert.equal(createHash('sha256').update(archive.content).digest('hex'),archive.sha256);
for(const doc of capture.documents) {
 if(doc.pages){assert.deepEqual(parsePdfWords(doc.xml),doc.pages);for(const page of doc.pages)for(const word of page.words){assert.ok(word.text);assert.ok(word.bbox.every(Number.isFinite));assert.ok(word.bbox[0]>=0&&word.bbox[2]<=page.width&&word.bbox[1]>=0&&word.bbox[3]<=page.height);}}
 else assert.deepEqual(parseHtmlBlocks((await read(doc.file)).toString()),doc.blocks);
}
assert.equal(capture.documents.find(doc=>doc.id==='SCAN').pages[0].words.length,0);
assert.ok(capture.ocr.text.length>1000);assert.equal(capture.ocr.words.length,0,'Preserve the original adapter defect, not rewrite it');
assert.deepEqual(parseOcrTsv(capture.ocr.tsv),derived.words);assert.ok(derived.words.length>0);
const blockWords=capture.ocr.blocks.flatMap(block=>block.paragraphs.flatMap(par=>par.lines.flatMap(line=>line.words)));
assert.deepEqual(derived.words.map(word=>({text:word.text,bbox:word.bbox})),blockWords.map(word=>({text:word.text,bbox:[word.bbox.x0,word.bbox.y0,word.bbox.x1,word.bbox.y1]})));
for(const word of derived.words)assert.ok(word.bbox[0]>=0&&word.bbox[2]<=capture.ocr.width&&word.bbox[1]>=0&&word.bbox[3]<=capture.ocr.height);
assert.deepEqual(characterErrorRate(truth.singleText,capture.ocr.text),capture.metrics.ocr);
const columns=capture.documents.find(doc=>doc.id==='COLUMNS').pages[0];
for(const mode of ['stream','rows','columns']){const text=orderBodyWords(columns.words,mode,capture.protocol.layout).map(word=>word.text).join(' ');assert.equal(text,capture.layout[mode]);assert.deepEqual(characterErrorRate(truth.columnsBody,text),capture.metrics.layout[mode]);}
assert.deepEqual(capture.documents.find(doc=>doc.id==='HTML').blocks,capture.documents.find(doc=>doc.id==='HTML-MIRROR').blocks);
console.log('Original PDFs/HTML,unchanged OCR,headerless TSV correction,boxes,reading orders and CER independently verified; no OCR rerun.');
