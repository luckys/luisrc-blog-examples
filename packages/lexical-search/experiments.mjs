import {analyzer,normalize,tokenize,wordNgrams,charNgrams,pluralStem,lemmaLookup} from './analysis.mjs';
import {buildIndex,search,bm25Contribution} from './retrieval.mjs';
import {metrics,summarize} from './evaluation.mjs';
import {trainBpe,applyBpe,wordPiece} from './subwords.mjs';

export function experiment(corpus,queries,lexicon,protocol) {
  const ids = new Set(corpus.map(d=>d.id));
  if (ids.size !== corpus.length) throw Error('Corpus IDs duplicados');
  if (new Set(corpus.map(d=>normalize(d.title+' '+d.body))).size !== corpus.length) throw Error('Documento duplicado');
  if (new Set(queries.map(q=>q.id)).size !== queries.length) throw Error('Query duplicada');
  for (const q of queries) {
    if (!['dev','test'].includes(q.split) || q.relevant.some(id=>!ids.has(id)) || new Set(q.relevant).size !== q.relevant.length)
      throw Error('Etiquetas inválidas');
  }
  const variants = protocol.variants.map(id => {
    const [method,mode] = id.split('-'), index=buildIndex(corpus,analyzer(mode,lexicon));
    const rows = queries.map(q => {
      const ranking=search(index,q.text,{method,...protocol.bm25});
      return {id:q.id,split:q.split,category:q.category,tokens:index.analyze(q.text),ranking,
        metrics:metrics(ranking,q.relevant,protocol.metrics.k),missed:q.relevant.filter(id=>!ranking.slice(0,3).some(r=>r.id===id)),
        falseTop:ranking.slice(0,3).filter(r=>!q.relevant.includes(r.id)).map(r=>r.id)};
    });
    return {id,method,mode,avgLength:index.avgLength,vocabulary:index.df.size,
      documents:index.documents.map(d=>({id:d.id,tokens:d.tokens,length:d.length})),
      summary:Object.fromEntries(['dev','test','all'].map(split=>[split,summarize(rows.filter(r=>split==='all'||r.split===split))])),rows};
  });
  const bpe=trainBpe(protocol.subwords.corpus,protocol.subwords.merges);
  const probes=['bajo','bajos','baja','caja','cajo','bajoz','ñ'];
  return {variants,
    analysis:{normalization:['ÍNDICE','I\u0301NDICE','año','ano','acción','accion'].map(text=>({text,literal:normalize(text),fold:normalize(text,{fold:true})})),
      morphology:['reintentos','reintento','contraseñas','contraseña','lunes','fue'].map(token=>({token,stem:pluralStem(token),lemma:lemmaLookup(token,lexicon)})),
      codeTokens:tokenize('C++ C# Node.js sin secretos'),bigrams:wordNgrams(['logs','sin','secretos'],2),trigrams:charNgrams('caché',3)},
    curves:{saturation:[0,1,2,3,5,10,20].map(tf=>({tf,score:bm25Contribution(tf,2,20,40,40,1.2,.75)})),
      length:[10,20,40,80,160].map(length=>({length,score:bm25Contribution(2,2,20,length,40,1.2,.75)}))},
    subwords:{...bpe,probes:probes.map(word=>({word,bpe:applyBpe(word,bpe.merges),wordpiece:wordPiece(word,protocol.subwords.vocabulary)}))}};
}
