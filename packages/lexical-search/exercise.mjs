import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {experiment} from './experiments.mjs';
process.chdir(fileURLToPath(new URL('.',import.meta.url)));
const sources=['analysis.mjs','retrieval.mjs','evaluation.mjs','subwords.mjs','experiments.mjs','corpus.json','queries.json','lexicon.json','protocol.json'];
export async function inputs() {
 const values=await Promise.all(sources.map(async f=>[f,await readFile(f,'utf8')]));
 return {sourceHashes:Object.fromEntries(values.map(([f,s])=>[f,createHash('sha256').update(s).digest('hex')])),
   json:Object.fromEntries(values.filter(([f])=>f.endsWith('.json')).map(([f,s])=>[f,JSON.parse(s)]))};
}
if (process.argv[1]===fileURLToPath(import.meta.url)) {
 const {sourceHashes,json}=await inputs();
 const report={kind:'lexical_search_observations',createdAt:new Date().toISOString(),runtime:{node:process.version,icu:process.versions.icu,unicode:process.versions.unicode},sourceHashes,
   protocol:json['protocol.json'],corpus:json['corpus.json'],queries:json['queries.json'],lexicon:json['lexicon.json'],
   ...experiment(json['corpus.json'],json['queries.json'],json['lexicon.json'],json['protocol.json'])};
 await mkdir('results',{recursive:true});
 const text=JSON.stringify(report,null,2)+'\n';
 await writeFile('results/observations.json',text);await writeFile('comparison.json',text);
 console.log(JSON.stringify({createdAt:report.createdAt,summary:report.variants.map(v=>({id:v.id,...v.summary})),subwords:report.subwords},null,2));
}
