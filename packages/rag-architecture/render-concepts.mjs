import {mkdir,writeFile} from 'node:fs/promises';
import {blogPath} from '../../scripts/blog-path.mjs';
import {conceptDiagram} from './concepts.mjs';
for(const directory of ['assets/rag-architecture','public/assets/visuals/rag-architecture']){
 await mkdir(blogPath(directory),{recursive:true});
 for(const id of ['P115','RAG-TENANTS','RAG-ISOLATION','RAG-CONVERSATION','RAG-MULTISTEP','RAG-CACHE','RAG-UPDATES','RAG-CONTEXT-DESIGN','RAG-VS-FINETUNING'])await writeFile(blogPath(directory+'/'+id+'.svg'),conceptDiagram(id));
}
console.log('Nine conceptual diagrams generated in blog asset directories.');
