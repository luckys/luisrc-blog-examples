import json,math,hashlib,platform,datetime
from pathlib import Path
import numpy as np
import torch
from model import TinyCausalLM

torch.set_num_threads(1)
torch.set_num_interop_threads(1)
torch.use_deterministic_algorithms(True)
data=json.loads(Path('tokenized.json').read_text())
protocol=json.loads(Path('protocol.json').read_text())
runtime=json.loads(Path('runtime.json').read_text())
assert platform.python_version()==runtime['python']
assert np.__version__==runtime['numpy']
assert torch.__version__==runtime['torch']
vocabulary=data['vocabulary'];size=len(vocabulary)
train=[r for r in data['records'] if r['split']=='train']
x=torch.tensor([r['input'] for r in train],dtype=torch.long)
y=torch.tensor([r['target'] for r in train],dtype=torch.long)
counts=torch.bincount(y.reshape(-1),minlength=size).double()
unigram=counts/counts.sum()
baseline={}
for split in ['train','dev','test']:
    rows=[r for r in data['records'] if r['split']==split]
    target=torch.tensor([r['target'] for r in rows],dtype=torch.long)
    nll=-unigram[target].log()
    baseline[split]={'tokens':target.numel(),'nll':nll.mean().item(),'perplexity':math.exp(nll.mean().item()),'accuracy':(target==unigram.argmax()).double().mean().item()}
runs=[]
for seed in protocol['training']['seeds']:
    torch.manual_seed(seed)
    model=TinyCausalLM(size)
    optimizer=torch.optim.Adam(model.parameters(),lr=protocol['training']['learningRate'],weight_decay=0)
    history=[]
    for step in range(protocol['training']['updates']+1):
        logits=model(x)
        loss=torch.nn.functional.cross_entropy(logits.reshape(-1,size),y.reshape(-1))
        history.append(loss.item())
        if step<protocol['training']['updates']:
            optimizer.zero_grad(set_to_none=True);loss.backward();optimizer.step()
    model.eval();predictions=[];metrics={};probes=[]
    with torch.no_grad():
        for split in ['train','dev','test']:
            rows=[r for r in data['records'] if r['split']==split]
            inputs=torch.tensor([r['input'] for r in rows],dtype=torch.long)
            target=torch.tensor([r['target'] for r in rows],dtype=torch.long)
            logits=model(inputs);logp=logits.log_softmax(-1)
            nll=-logp.gather(-1,target.unsqueeze(-1)).squeeze(-1)
            correct=(logits.argmax(-1)==target)
            metrics[split]={'tokens':target.numel(),'nll':nll.mean().item(),'perplexity':math.exp(nll.mean().item()),'accuracy':correct.double().mean().item()}
            for i,r in enumerate(rows):
                predictions.append({'id':r['id'],'split':split,'target':r['target'],'logits':logits[i].tolist(),'probabilities':logp[i].exp().tolist(),'tokenNll':nll[i].tolist(),'correct':correct[i].tolist()})
        for probe in data['probes']:
            logits=model(torch.tensor([probe['ids']],dtype=torch.long))[0,-1]
            probes.append({**probe,'logits':logits.tolist(),'probabilities':logits.softmax(-1).tolist()})
        encode=lambda text:[1]+[vocabulary.index(t) for t in text.split()]
        first=torch.tensor([encode('el equipo revisa el informe .')])
        second=torch.tensor([encode('el equipo revisa los datos .')])
        causal_error=(model(first)[:,:4]-model(second)[:,:4]).abs().max().item()
        noncausal_difference=(model(first,causal=False)[:,:4]-model(second,causal=False)[:,:4]).abs().max().item()
        causality={'sharedPrefixIds':first[0,:4].tolist(),'firstIds':first[0].tolist(),'secondIds':second[0].tolist(),'causalPrefixMaxDifference':causal_error,'unmaskedPrefixMaxDifference':noncausal_difference,'warning':'Removing mask is a diagnostic using causal-trained weights, NOT a trained masked LM'}
    runs.append({'seed':seed,'parameterCount':sum(p.numel() for p in model.parameters()),'parameters':[{'name':name,'shape':list(p.shape),'count':p.numel()} for name,p in model.named_parameters()],'state':{name:p.detach().tolist() for name,p in model.state_dict().items()},'loss':history,'metrics':metrics,'predictions':predictions,'probes':probes,'causality':causality})
files=['corpus.json','protocol.json','runtime.json','tokenizer.mjs','tokenized.json','model.py','experiments.py']
report={'kind':'tiny_causal_language_model_observations','capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'runtime':{'python':platform.python_version(),'numpy':np.__version__,'torch':torch.__version__,'threads':torch.get_num_threads(),'device':'cpu'},'sourceHashes':{f:hashlib.sha256(Path(f).read_bytes()).hexdigest() for f in files},'protocol':protocol,'vocabulary':vocabulary,'baseline':{'kind':'unsmoothed target frequency from train only','probabilities':unigram.tolist(),'metrics':baseline},'runs':runs}
print(json.dumps(report,ensure_ascii=False,allow_nan=False))
