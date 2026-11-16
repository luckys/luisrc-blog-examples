export function canonicalText(text) {
  return text.normalize('NFC').replace(/\s+/gu,' ').trim();
}
export function characterErrorRate(reference,observed) {
  const a=Array.from(canonicalText(reference)),b=Array.from(canonicalText(observed));
  if(!a.length) throw Error('Referencia vacía');
  let previous=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++) {
    const current=[i];
    for(let j=1;j<=b.length;j++) current[j]=Math.min(previous[j]+1,current[j-1]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));
    previous=current;
  }
  return {edits:previous[b.length],referenceCharacters:a.length,rate:previous[b.length]/a.length};
}
