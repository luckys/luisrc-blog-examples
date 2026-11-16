import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateResponse} from './response-contract.v1.mjs';
import {contextEvidenceMetrics} from './context-core.v1.mjs';
const sha=text=>createHash('sha256').update(text).digest('hex');

export function evaluateResponse({record,context,corpus,label,review=null,rubricHash}) {
  const availableIds=context.result.selectedIds;
  const selected=availableIds.map(id=>corpus.documents.find(d=>d.id===id));
  const contextMetrics=contextEvidenceMetrics(selected,corpus,label);
  const corpusAnswerable=label.requiredFactIds.length>0;
  const contextAnswerable=corpusAnswerable&&contextMetrics.requiredFactCoverage===1;
  const technical=record.outcome==='generated'?validateResponse(record.raw,availableIds):{valid:false,reason:record.outcome};
  const base={corpusAnswerable,contextAnswerable,executionStatus:record.outcome,technical,faithfulness:null,requiredCompleteness:null,groundedCompleteness:null,citationCoverage:null,factualClaims:0,supportedClaims:0,coveredFactIds:[],groundedFactIds:[],contractPass:false,answerSuccess:corpusAnswerable?false:null,noAnswerSuccess:corpusAnswerable?null:false};
  if(!technical.valid){assert.equal(review,null,'Invalid outputs cannot be repaired by semantic review');return base;}
  const value=technical.value;
  if(value.status==='no_answer'){
    assert.equal(review,null,'No-answer has no answer-text review');
    return {...base,requiredCompleteness:corpusAnswerable?0:null,groundedCompleteness:corpusAnswerable?0:null,contractPass:!contextAnswerable,noAnswerSuccess:corpusAnswerable?null:true};
  }
  assert.ok(review,'A valid answered output requires explicit editorial review');
  assert.equal(review.kind,'assistant_editorial_judgment_not_independent_human_or_judge_experiment');
  assert.equal(review.rubricSha256,rubricHash,'Review rubric mismatch');
  assert.equal(review.answerSha256,sha(value.answer),'Review answer mismatch');
  let end=0,factualClaims=0,supportedClaims=0,citedClaims=0;
  const covered=new Set(),grounded=new Set();
  for(const segment of review.segments){
    assert.equal(segment.start,end,'Review must partition all answer text');assert.ok(Number.isSafeInteger(segment.end)&&segment.end>segment.start&&segment.end<=value.answer.length);
    assert.equal(segment.text,value.answer.slice(segment.start,segment.end),'Review span mismatch');assert.ok(typeof segment.reason==='string'&&segment.reason.trim());end=segment.end;
    assert.ok(['factual','non_factual'].includes(segment.kind));
    const matches=segment.matchedFactIds??[],evidence=segment.evidence??[];
    assert.equal(new Set(matches).size,matches.length,'Duplicate matched fact');
    if(segment.kind==='non_factual'){assert.equal(matches.length,0);assert.equal(evidence.length,0);assert.equal(segment.verdict,undefined);continue;}
    factualClaims++;assert.ok(['supported','contradicted','unsupported'].includes(segment.verdict));
    for(const id of matches){assert.ok(label.requiredFactIds.includes(id),'Match outside required gold');assert.ok(segment.matchReasons?.[id]?.trim(),'Missing semantic match reason');covered.add(id);}
    if(segment.verdict!=='unsupported')assert.ok(evidence.length,'Supported/contradicted verdict needs evidence');
    for(const ref of evidence){
      const source=selected.find(s=>s.id===ref.documentId);assert.ok(source,'Evidence outside provided context');assert.equal(ref.revision,source.revision);assert.ok(Number.isSafeInteger(ref.start)&&Number.isSafeInteger(ref.end)&&ref.start>=0&&ref.end>ref.start&&ref.end<=source.body.length);assert.equal(ref.quote,source.body.slice(ref.start,ref.end),'Evidence quote mismatch');
    }
    if(segment.verdict==='supported'){
      supportedClaims++;const cited=evidence.every(ref=>value.citations.includes(ref.documentId));
      if(cited){citedClaims++;for(const id of matches)grounded.add(id);}
    }
  }
  assert.equal(end,value.answer.length,'Unreviewed answer text');
  const faithfulness=factualClaims?supportedClaims/factualClaims:null;
  const citationCoverage=factualClaims?citedClaims/factualClaims:null;
  const requiredCompleteness=corpusAnswerable?covered.size/label.requiredFactIds.length:null;
  const groundedCompleteness=corpusAnswerable?grounded.size/label.requiredFactIds.length:null;
  const successful=faithfulness===1&&groundedCompleteness===1&&citationCoverage===1;
  return {...base,faithfulness,requiredCompleteness,groundedCompleteness,citationCoverage,factualClaims,supportedClaims,coveredFactIds:label.requiredFactIds.filter(id=>covered.has(id)),groundedFactIds:label.requiredFactIds.filter(id=>grounded.has(id)),contractPass:contextAnswerable&&successful,answerSuccess:corpusAnswerable?successful:null};
}
