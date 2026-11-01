import {readFile,writeFile} from 'node:fs/promises';
import {fitVocabulary,encode,encodePrefix,teacherForce} from './tokenizer.mjs';
const json=async file=>JSON.parse(await readFile(new URL(file,import.meta.url)));
const corpus=await json('corpus.json'),protocol=await json('protocol.json'),vocabulary=fitVocabulary(corpus);
const records=corpus.map(r=>({...r,ids:encode(r.text,vocabulary),...teacherForce(encode(r.text,vocabulary))}));
const data={kind:'fixed_tokenized_language_corpus',vocabulary,records,probes:protocol.probes.map(text=>({text,ids:encodePrefix(text,vocabulary)}))};
await writeFile(new URL('tokenized.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({vocabulary:vocabulary.length,splits:Object.fromEntries(['train','dev','test'].map(s=>[s,records.filter(r=>r.split===s).length]))}));
