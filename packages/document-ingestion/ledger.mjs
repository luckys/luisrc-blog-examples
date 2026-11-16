import {createHash} from 'node:crypto';
export const normalizationPolicy='canonical-words-nfc-single-space/v1';
export const digest=value=>createHash('sha256').update(value).digest('hex');

export function createRepresentation(source, parts) {
  if(!parts.length) throw Error('Documento sin unidades: decidir extracción antes de indexar');
  const units=[];let text='';
  for(const part of parts) {
    const normalized=part.text.normalize('NFC');
    if(!normalized||/\s/u.test(normalized)) throw Error('Cada unidad debe ser no vacía y sin whitespace');
    if(units.length) text+=' ';
    const start=text.length;text+=normalized;
    units.push({ordinal:units.length,text:normalized,rawText:part.text,start,end:text.length,origin:part.origin});
  }
  const representationId=digest(JSON.stringify([source.id,source.documentVersion,source.selection,normalizationPolicy,text]));
  return {documentId:source.id,documentVersion:source.documentVersion,file:source.file,kind:source.kind,
    role:source.role,selection:source.selection,normalizationPolicy,representationId,
    contentHash:digest(text),text,units};
}

export function duplicateGroups(documents, field) {
  if(!['documentVersion','contentHash'].includes(field)) throw Error('Clave de deduplicación inválida');
  const groups=new Map();
  for(const doc of documents) {
    const key=doc.role+':'+doc[field];
    if(!groups.has(key)) groups.set(key,{hash:doc[field],role:doc.role,representativeId:doc.documentId,aliases:[]});
    groups.get(key).aliases.push({documentId:doc.documentId,documentVersion:doc.documentVersion,representationId:doc.representationId,file:doc.file});
  }
  return [...groups.values()];
}

export function nearSimilarity(a,b) {
  const tokens=text=>new Set([...text.normalize('NFC').toLocaleLowerCase('es').matchAll(/[\p{L}\p{N}]+/gu)].map(match=>match[0]));
  const left=tokens(a),right=tokens(b),union=new Set([...left,...right]);
  if(!union.size) return null;
  return [...left].filter(token=>right.has(token)).length/union.size;
}

export function wordWindows(document, budget) {
  if(!Number.isInteger(budget)||budget<1) throw Error('Presupuesto de unidades inválido');
  const chunks=[],policy='word-window/v1:budget='+budget+':overlap=0';
  for(let first=0;first<document.units.length;first+=budget) {
    const last=Math.min(first+budget,document.units.length),start=document.units[first].start,end=document.units[last-1].end;
    const text=document.text.slice(start,end);
    const id=digest(JSON.stringify([document.representationId,policy,first,last,start,end,text]));
    chunks.push({id,documentId:document.documentId,documentVersion:document.documentVersion,
      representationId:document.representationId,policy,budget,first,last,start,end,text});
  }
  return chunks;
}
