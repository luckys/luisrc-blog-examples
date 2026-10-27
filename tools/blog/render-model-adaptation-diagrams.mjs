import{D2}from'@d2lang/d2';import{readFile,writeFile,mkdir}from'node:fs/promises';
import{editorialPath}from'../../scripts/editorial-path.mjs';
const manifest=JSON.parse(await readFile(editorialPath('model-adaptation-series.json'))),d2=new D2();
await mkdir('public/assets/visuals/model-adaptation',{recursive:true});
try{for(const a of manifest.articles){const source=await readFile('assets/model-adaptation/'+a.id+'.d2','utf8');const result=await d2.compile(source,{layout:'elk'});await writeFile('public/assets/visuals/model-adaptation/'+a.id+'.svg',await d2.render(result.diagram,result.renderOptions));}}finally{await d2.dispose();}
console.log('Nine adaptation diagrams rendered');
