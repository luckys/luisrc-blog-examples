import {resolveRange} from '../document-ingestion/ranges.mjs';
export function rerankCandidates(original,queryId,scores,budget){
 if(!Number.isInteger(budget)||budget<1)throw Error('Presupuesto de candidatos inválido');
 return original.slice(0,budget).map(row=>{const logit=scores.get(queryId+':'+row.id);if(!Number.isFinite(logit))throw Error('Falta logit del candidato');return {id:row.id,score:logit};}).sort((a,b)=>b.score-a.score||(a.id<b.id?-1:a.id>b.id?1:0));
}
export function renderContext(chunks){return chunks.map(chunk=>'['+chunk.alias+']\n'+chunk.text).join('\n\n');}
export function selectEvidence(ranking,registry,{maxChunks,tokenBudget},countTokens){
 if(!Number.isInteger(maxChunks)||maxChunks<1||!Number.isInteger(tokenBudget)||tokenBudget<1)throw Error('Presupuesto de contexto inválido');
 const selected=[],skipped=[];
 for(const row of ranking){const chunk=registry.find(c=>c.id===row.id);if(!chunk)throw Error('Candidato desconocido');
  if(selected.length===maxChunks){skipped.push({id:row.id,reason:'chunk_limit'});continue;}
  const tokens=countTokens(renderContext([...selected,chunk]));
  if(tokens>tokenBudget){skipped.push({id:row.id,reason:'token_budget',candidateTokens:tokens});continue;}
  selected.push(chunk);
 }
 const text=renderContext(selected);return {selected,skipped,text,tokens:countTokens(text),tokenBudget,maxChunks};
}
export function parseAnswer(raw){
 let text=raw.trim(),envelope='json';const fence=text.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);if(fence){text=fence[1];envelope='fenced_json';}
 let value;try{value=JSON.parse(text);}catch{return {ok:false,reason:'invalid_json',envelope};}
 const keys=(object,expected)=>object&&typeof object==='object'&&!Array.isArray(object)&&Object.keys(object).sort().join(',')===[...expected].sort().join(',');
 if(!keys(value,['estado','afirmaciones'])||!['respuesta','sin_respuesta'].includes(value.estado)||!Array.isArray(value.afirmaciones))return {ok:false,reason:'invalid_schema',envelope};
 if(value.estado==='sin_respuesta'&&value.afirmaciones.length!==0||value.estado==='respuesta'&&(value.afirmaciones.length<1||value.afirmaciones.length>3))return {ok:false,reason:'invalid_state_claims',envelope};
 for(const claim of value.afirmaciones)if(!keys(claim,['texto','citas'])||typeof claim.texto!=='string'||!claim.texto.trim()||!Array.isArray(claim.citas)||claim.citas.length<1||claim.citas.length>3||claim.citas.some(c=>typeof c!=='string'||!c.trim()||c.length>64))return {ok:false,reason:'invalid_claim',envelope};
 return {ok:true,envelope,value};
}
export function citationFor(alias,selected,registry){
 const chunk=registry.find(c=>c.alias===alias);if(!chunk)return {valid:false,alias,reason:'unknown_alias'};
 if(!selected.some(c=>c.id===chunk.id))return {valid:false,alias,reason:'outside_provided_context'};
 return {valid:true,alias,chunkId:chunk.id,documentId:chunk.documentId,documentVersion:chunk.documentVersion,representationId:chunk.representationId,start:chunk.start,end:chunk.end,text:chunk.text};
}
export function sourceLink(citation){
 if(!citation.valid)throw Error('No enlazar una cita inválida');
 const hash=new URLSearchParams({alias:citation.alias,chunk:citation.chunkId,document:citation.documentId,version:citation.documentVersion,representation:citation.representationId,start:String(citation.start),end:String(citation.end)});
 return 'source.html#'+hash.toString();
}
export function resolveSource(params,documents,registry){
 const chunk=registry.find(c=>c.alias===params.get('alias'));if(!chunk)throw Error('Alias desconocido');
 for(const [parameter,field]of [['chunk','id'],['document','documentId'],['version','documentVersion'],['representation','representationId']])if(params.get(parameter)!==chunk[field])throw Error('Identidad o versión de cita incompatible');
 const start=params.get('start'),end=params.get('end');if(!/^\d+$/.test(start??'')||!/^\d+$/.test(end??''))throw Error('Offsets inválidos');
 if(Number(start)!==chunk.start||Number(end)!==chunk.end)throw Error('Rango distinto del chunk citado');
 const document=documents.find(d=>d.documentId===chunk.documentId&&d.documentVersion===chunk.documentVersion&&d.representationId===chunk.representationId);if(!document)throw Error('Fuente o versión ausente');
 const quote=resolveRange(document,Number(start),Number(end));if(quote.text!==chunk.text)throw Error('Texto distinto de la cita');
 return {document,chunk,quote};
}
