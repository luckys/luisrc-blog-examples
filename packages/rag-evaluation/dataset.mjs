import assert from 'node:assert/strict';
const unique=(rows,key,label)=>{const ids=rows.map(row=>row[key]);assert.equal(new Set(ids).size,ids.length,'duplicate '+label);return new Map(rows.map(row=>[row[key],row]));};
export function validateDataset({corpus,queries,gold}) {
 const documents=unique(corpus.documents,'id','document'),facts=unique(corpus.facts,'id','fact'),questions=unique(queries.rows,'id','query'),labels=unique(gold.rows,'queryId','gold');
 assert.deepEqual([...labels.keys()].sort(),[...questions.keys()].sort(),'one gold per query');
 for(const fact of facts.values()){
  const doc=documents.get(fact.documentId);assert.ok(doc,'unknown document');assert.ok(Number.isSafeInteger(fact.start)&&Number.isSafeInteger(fact.end)&&fact.start>=0&&fact.end>fact.start,'quote range');
  assert.equal(doc.body.slice(fact.start,fact.end),fact.quote,'quote range');
 }
 const groups=new Map(),grades={0:0,1:0,2:0};let answerable=0,dev=0;
 for(const query of questions.values()){
  assert.ok(['dev','test'].includes(query.split),'unknown split');assert.ok(query.question.trim(),'empty question');
  if(groups.has(query.group))assert.equal(groups.get(query.group),query.split,'group crosses splits');groups.set(query.group,query.split);if(query.split==='dev')dev++;
  const label=labels.get(query.id),required=label.requiredFactIds;assert.equal(new Set(required).size,required.length,'duplicate required fact');
  assert.ok(['answerable','unanswerable'].includes(label.answerability),'answerability');assert.equal(label.answerability==='answerable',required.length>0,'answerability');
  for(const id of required){const fact=facts.get(id);assert.ok(fact,'unknown required fact');assert.equal(documents.get(fact.documentId).group,query.group,'fact outside topic group');}
  if(required.length)answerable++;
  const qrels=unique(label.qrels,'documentId','judgement');assert.deepEqual([...qrels.keys()].sort(),[...documents.keys()].sort(),'exhaustive qrels');
  for(const doc of documents.values()){
   const supported=required.filter(id=>facts.get(id).documentId===doc.id).length;
   const expected=supported===0?0:supported===required.length?2:1;
   assert.equal(qrels.get(doc.id).grade,expected,'grade disagrees with authored required facts');grades[expected]++;
  }
 }
 return{documents:documents.size,facts:facts.size,queries:questions.size,dev,test:questions.size-dev,answerable,unanswerable:questions.size-answerable,grades,groups:groups.size,modelRuns:0};
}
