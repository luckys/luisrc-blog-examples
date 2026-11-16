const columns=['level','page_num','block_num','par_num','line_num','word_num','left','top','width','height','conf','text'];
export function parseOcrTsv(tsv) {
  const lines=tsv.trimEnd().split('\n');
  if(lines[0]?.startsWith('level\t')) lines.shift();
  const words=[];
  for(const line of lines) {
    const fields=line.replace(/\r$/,'').split('\t');
    if(fields[0]!=='5') continue;
    if(fields.length!==columns.length) throw Error('TSV de palabra incompatible');
    const row=Object.fromEntries(columns.map((column,i)=>[column,fields[i]]));
    if(!row.text) continue;
    const left=Number(row.left),top=Number(row.top),width=Number(row.width),height=Number(row.height),confidence=Number(row.conf);
    if(![left,top,width,height,confidence].every(Number.isFinite)||width<0||height<0) throw Error('Geometría OCR inválida');
    words.push({ordinal:words.length,text:row.text,confidence,bbox:[left,top,left+width,top+height]});
  }
  return words;
}
