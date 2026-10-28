import{D2}from'@d2lang/d2';import{readFile,writeFile,mkdir}from'node:fs/promises';
import{editorialPath}from'../../scripts/editorial-path.mjs';
const m=JSON.parse(await readFile(editorialPath('lexical-search-series.json'))),d2=new D2();
await mkdir('public/assets/visuals/lexical-search',{recursive:true});
try{for(const a of m.articles){const c=await d2.compile(await readFile('assets/lexical-search/'+a.id+'.d2','utf8'),{layout:'elk'});await writeFile('public/assets/visuals/lexical-search/'+a.id+'.svg',await d2.render(c.diagram,c.renderOptions));}}finally{await d2.dispose();}
console.log('Eleven lexical search diagrams rendered');
