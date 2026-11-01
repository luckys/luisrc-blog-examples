export function tokenize(text) {
  if (typeof text !== 'string' || !text.isWellFormed()) throw Error('Texto Unicode inválido');
  return Array.from(text.matchAll(/[\p{L}\p{M}\p{N}]+|[^\s]/gu), m => m[0]);
}
const compareCodePoints = (a,b) => {
  const x=Array.from(a,c=>c.codePointAt(0)),y=Array.from(b,c=>c.codePointAt(0));
  for(let i=0;i<Math.min(x.length,y.length);i++)if(x[i]!==y[i])return x[i]-y[i];
  return x.length-y.length;
};
export function fitVocabulary(corpus) {
  const train=corpus.filter(r=>r.split==='train');
  if (!train.length) throw Error('Falta train');
  return ['<PAD>','<BOS>','<EOS>','<UNK>',...Array.from(new Set(train.flatMap(r=>tokenize(r.text)))).sort(compareCodePoints)];
}
export function encodePrefix(text,vocabulary) {
  const ids=new Map(vocabulary.map((token,i)=>[token,i]));
  return [1,...tokenize(text).map(token=>ids.get(token)??3)];
}
export function encode(text,vocabulary) { return [...encodePrefix(text,vocabulary),2]; }
export function teacherForce(ids) {
  if(ids.length<2 || ids[0]!==1 || ids.at(-1)!==2 || ids.some(id=>!Number.isInteger(id)||id<0))throw Error('Secuencia BOS..EOS inválida');
  return {input:ids.slice(0,-1),target:ids.slice(1)};
}
