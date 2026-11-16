import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseOcrTsv} from './ocr-tsv.mjs';
const root=new URL('.',import.meta.url),read=file=>readFile(new URL(file,root));
try{await access(new URL('results/ocr-words.json',root));throw Error('Derived OCR words exist: verify or version before replacing');}catch(error){if(error.code!=='ENOENT')throw error;}
const capture=JSON.parse(await read('results/extraction.json')),words=parseOcrTsv(capture.ocr.tsv);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const files=['results/extraction.json','ocr-tsv.mjs','derive.mjs'];
const derived={kind:'headerless_tsv_parser_correction_without_ocr_rerun',captureTime:capture.capturedAt,
 note:'Original collector assumed a TSV header and recorded an empty convenience words array despite nonempty OCR text/blocks. Original capture and original engine output remain intact. This file derives words from that unchanged TSV.',
 sourceHashes:Object.fromEntries(await Promise.all(files.map(async file=>[file,hash(await read(file))]))),
 words,summary:{words:words.length,minConfidence:Math.min(...words.map(word=>word.confidence)),maxConfidence:Math.max(...words.map(word=>word.confidence))}};
await writeFile(new URL('results/ocr-words.json',root),JSON.stringify(derived,null,2)+'\n');console.log(JSON.stringify(derived.summary));
