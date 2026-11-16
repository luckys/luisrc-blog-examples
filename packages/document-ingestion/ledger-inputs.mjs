import {orderBodyWords} from './parsing.mjs';

export function sourceParts(source,capture,ocrWords,decoded) {
  const doc=capture.documents.find(row=>row.id===source.captureId);
  if(source.kind==='ocr') return ocrWords.map(word=>({text:word.text,origin:{kind:'ocr',page:1,wordOrdinal:word.ordinal,bbox:word.bbox,coordinateSpace:'pixel-top-left',confidence:word.confidence}}));
  if(source.kind==='pdf') {
    return doc.pages.flatMap(page=>{
      const words=source.selection==='known-columns-body'?orderBodyWords(page.words,'columns',capture.protocol.layout):page.words;
      return words.map(word=>({text:word.text,origin:{kind:'pdf',page:page.number,wordOrdinal:word.ordinal,bbox:word.bbox,coordinateSpace:'pdf-point-top-left'}}));
    });
  }
  if(source.kind==='html') return doc.blocks.flatMap((block,blockIndex)=>[...block.text.matchAll(/\S+/gu)].map(match=>({text:match[0],origin:{kind:'html',blockIndex,blockKind:block.kind,blockStart:match.index,blockEnd:match.index+match[0].length,offsetUnit:'UTF16 in parsed block text'}})));
  if(source.kind!=='text') throw Error('Tipo de fuente desconocido');
  return [...decoded.matchAll(/\S+/gu)].map(match=>({text:match[0],origin:{kind:'text',start:match.index,end:match.index+match[0].length,offsetUnit:'UTF16 in decoded source'}}));
}
