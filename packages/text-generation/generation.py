import math,json,importlib.util
from pathlib import Path
import torch

class LCG:
    def __init__(self,seed):self.state=int(seed)&0xffffffff
    def next(self):
        self.state=(1664525*self.state+1013904223)&0xffffffff
        return self.state/2**32

def distribution(logits,temperature=1,top_k=None,top_p=None):
    if not logits or not all(math.isfinite(x) for x in logits):raise ValueError('finite logits required')
    if not math.isfinite(temperature) or temperature<=0:raise ValueError('temperature must be positive')
    if top_k is not None and (isinstance(top_k,bool) or not isinstance(top_k,int) or not 1<=top_k<=len(logits)):raise ValueError('top_k out of range')
    if top_p is not None and (not math.isfinite(top_p) or not 0<top_p<=1):raise ValueError('top_p out of range')
    scaled=[x/temperature for x in logits]
    if not all(math.isfinite(x) for x in scaled):raise ValueError('scaled logits overflow')
    maximum=max(scaled);weights=[math.exp(x-maximum) for x in scaled];total=sum(weights)
    original=[x/total for x in weights];probabilities=original.copy()
    ordered=sorted(range(len(logits)),key=lambda i:(-probabilities[i],i))
    kept=ordered[:top_k] if top_k is not None else ordered
    mass=sum(probabilities[i] for i in kept)
    probabilities=[probabilities[i]/mass if i in kept else 0. for i in range(len(logits))]
    if top_p is not None:
        nucleus=[];cumulative=0.
        for i in kept:
            nucleus.append(i);cumulative+=probabilities[i]
            if cumulative>=top_p:break
        kept=nucleus
        mass=sum(probabilities[i] for i in kept)
        probabilities=[probabilities[i]/mass if i in kept else 0. for i in range(len(logits))]
    return {'probabilities':probabilities,'temperatureProbabilities':original,'kept':sorted(kept),'retainedMass':sum(original[i] for i in kept)}

def choose(probabilities,uniform):
    if not 0<=uniform<1 or any(p<0 or not math.isfinite(p) for p in probabilities) or not math.isclose(sum(probabilities),1,abs_tol=1e-12):raise ValueError('invalid categorical draw')
    cumulative=0.;last=None
    for i,p in enumerate(probabilities):
        if p>0:last=i
        cumulative+=p
        if uniform<cumulative:return i
    return last

def generate(model,prompt_ids,strategy,sampling_seed,max_new_tokens,context_policy='reject'):
    if not prompt_ids or prompt_ids[0]!=1 or any(not isinstance(i,int) or i<0 for i in prompt_ids):raise ValueError('BOS prefix required')
    if not isinstance(max_new_tokens,int) or max_new_tokens<1:raise ValueError('positive max_new_tokens required')
    if context_policy not in ['reject','left_preserve_bos']:raise ValueError('unknown context policy')
    if len(prompt_ids)>16 and context_policy=='reject':raise ValueError('prompt exceeds context16')
    if strategy['mode'] not in ['greedy','sample']:raise ValueError('unknown strategy')
    ids=list(prompt_ids);generated=[];rng=LCG(sampling_seed);reason='max_new_tokens'
    for step in range(max_new_tokens):
        removed=0;window=ids
        if len(ids)>16:
            if context_policy=='reject':reason='context_limit';break
            removed=len(ids)-16;window=[1]+ids[-15:]
        with torch.inference_mode():logits=model(torch.tensor([window],dtype=torch.long))[0,-1].tolist()
        base=distribution(logits)['probabilities'];uniform=None
        if strategy['mode']=='greedy':
            token=max(range(len(logits)),key=lambda i:(logits[i],-i))
            selected={'probabilities':[float(i==token) for i in range(len(logits))],'temperatureProbabilities':base,'kept':[token],'retainedMass':base[token]}
        else:
            selected=distribution(logits,strategy['temperature'],strategy['topK'],strategy['topP'])
            uniform=rng.next();token=choose(selected['probabilities'],uniform)
        event={'type':'token','index':step,'inputIds':window.copy(),'removed':removed,'logits':logits,'modelProbabilities':base,'temperatureProbabilities':selected['temperatureProbabilities'],'selectionProbabilities':selected['probabilities'],'kept':selected['kept'],'retainedMass':selected['retainedMass'],'uniform':uniform,'token':token,'modelProbability':base[token],'selectionProbability':selected['probabilities'][token]}
        generated.append(token);ids.append(token)
        yield event
        if token==2:reason='eos';break
    yield {'type':'done','reason':reason,'generatedIds':generated,'promptIds':list(prompt_ids),'steps':len(generated)}

def load_model():
    upstream=Path(__file__).resolve().parent.parent/'language-models'
    spec=importlib.util.spec_from_file_location('frozen_p108_model',upstream/'model.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    report=json.loads((upstream/'results/observations.json').read_text())
    run=next(r for r in report['runs'] if r['seed']==7)
    model=module.TinyCausalLM(len(report['vocabulary']))
    model.load_state_dict({k:torch.tensor(v,dtype=torch.float64) for k,v in run['state'].items()},strict=True)
    model.eval();return model,report['vocabulary']
