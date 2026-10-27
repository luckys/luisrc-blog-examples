import{D2}from'@d2lang/d2';import{readFile,writeFile,mkdir}from'node:fs/promises';
import{editorialPath}from'../../scripts/editorial-path.mjs';
const manifest=JSON.parse(await readFile(editorialPath('gpu-training-series.json'))),d2=new D2();
await mkdir('public/assets/visuals/gpu-training',{recursive:true});
try{for(const a of manifest.articles){const source=await readFile('assets/gpu-training/'+a.id+'.d2','utf8');const result=await d2.compile(source,{layout:'elk'});await writeFile('public/assets/visuals/gpu-training/'+a.id+'.svg',await d2.render(result.diagram,result.renderOptions));}}finally{await d2.dispose();}
console.log('Eight GPU diagrams rendered');
