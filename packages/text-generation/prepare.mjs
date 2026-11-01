import {readFile,writeFile} from 'node:fs/promises';import {encodePrefix} from '../language-models/tokenizer.mjs';
const json=async u=>JSON.parse(await readFile(new URL(u,import.meta.url))),p=await json('protocol.json'),upstream=await json('../language-models/results/observations.json');
const data={vocabulary:upstream.vocabulary,prompts:p.prompts.map(text=>({text,ids:encodePrefix(text,upstream.vocabulary)})),longPrompt:{text:Array(20).fill('el').join(' '),ids:encodePrefix(Array(20).fill('el').join(' '),upstream.vocabulary)}};
await writeFile(new URL('inputs.json',import.meta.url),JSON.stringify(data,null,2)+'\n');console.log('Inputs prepared using frozen P108 tokenizer');
