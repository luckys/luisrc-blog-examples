function isBoundary(text, index) {
  const before=text.charCodeAt(index-1),after=text.charCodeAt(index);
  return !(before>=0xd800&&before<=0xdbff&&after>=0xdc00&&after<=0xdfff);
}

export function resolveRange(document, start, end) {
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>document.text.length||start>=end) throw Error('Rango UTF16 inválido');
  if(!isBoundary(document.text,start)||!isBoundary(document.text,end)) throw Error('Rango divide un par surrogate');
  const references=document.units.filter(unit=>unit.start<end&&unit.end>start).map(unit=>({
    unitOrdinal:unit.ordinal,start:unit.start,end:unit.end,sourceText:unit.rawText,origin:unit.origin,
  }));
  return {documentId:document.documentId,documentVersion:document.documentVersion,
    representationId:document.representationId,file:document.file,offsetUnit:'UTF16',start,end,
    text:document.text.slice(start,end),references};
}
