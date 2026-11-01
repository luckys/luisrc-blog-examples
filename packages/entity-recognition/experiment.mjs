import {fit,predict,rulesFrom,matchRules,metrics} from './model.mjs';
import {toBio} from './spans.mjs';
export function experiment(corpus,protocol){
 const rules=rulesFrom(corpus),p=protocol.plannedTraining;
 const models=p.seeds.map(seed=>fit(corpus,{seed,epochs:p.epochs,learningRate:p.learningRate}));
 const variants=[{id:'train-gazetteer',model:null,predictions:corpus.map(r=>({id:r.id,spans:matchRules(rules,r.text)}))},...models.map(model=>({id:'linear-seed-'+model.seed,model,predictions:corpus.map(r=>({id:r.id,...predict(model,r.text)}))}))];
 for(const v of variants){v.metrics={};for(const split of ['train','dev','test']){const rows=corpus.filter(r=>r.split===split),ids=new Set(rows.map(r=>r.id)),predictions=v.predictions.filter(r=>ids.has(r.id));
  v.metrics[split]={exact:metrics(rows,predictions),byType:Object.fromEntries(['PER','ORG'].map(type=>[type,metrics(rows.map(r=>({...r,spans:r.spans.filter(s=>s.label===type)})),predictions.map(r=>({...r,spans:r.spans.filter(s=>s.label===type)})))]))};
  if(v.model){let correct=0,total=0;for(const row of rows){const gold=toBio(row),actual=predictions.find(p=>p.id===row.id).labels;gold.forEach((tag,i)=>{total++;if(tag===actual[i])correct++;});}v.metrics[split].tokenAccuracy={correct,total,value:correct/total};}
 }}return {rules,variants};
}
