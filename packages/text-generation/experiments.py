import json,hashlib,datetime,platform
from pathlib import Path
import torch,numpy as np
from generation import generate,load_model

torch.set_num_threads(1);torch.set_num_interop_threads(1);torch.use_deterministic_algorithms(True)
protocol=json.loads(Path('protocol.json').read_text());inputs=json.loads(Path('inputs.json').read_text());runtime=json.loads(Path('runtime.json').read_text())
assert torch.__version__==runtime['torch'] and np.__version__==runtime['numpy'] and platform.python_version()==runtime['python']
model,vocabulary=load_model();assert vocabulary==inputs['vocabulary']
rollouts=[]
for prompt in inputs['prompts']:
    for strategy in protocol['strategies']:
        for seed in protocol['samplingSeeds']:
            events=list(generate(model,prompt['ids'],strategy,seed,protocol['maxNewTokens']))
            rollouts.append({'prompt':prompt['text'],'promptIds':prompt['ids'],'strategyId':strategy['id'],'strategy':strategy,'samplingSeed':seed,'steps':events[:-1],'tokenCount':events[-1]['steps'],**{k:v for k,v in events[-1].items() if k not in ['type','steps']}})
greedy=protocol['strategies'][0]
one=list(generate(model,inputs['prompts'][0]['ids'],greedy,11,1))
try:list(generate(model,inputs['longPrompt']['ids'],greedy,11,3));raise AssertionError('must reject')
except ValueError as error:rejected=str(error)
left=list(generate(model,inputs['longPrompt']['ids'],greedy,11,3,'left_preserve_bos'))
files=['protocol.json','inputs.json','runtime.json','generation.py','experiments.py','prepare.mjs','../language-models/model.py','../language-models/tokenizer.mjs','../language-models/results/observations.json']
result={'kind':'frozen_lm_generation_observations','capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'runtime':{'python':platform.python_version(),'torch':torch.__version__,'numpy':np.__version__,'threads':torch.get_num_threads(),'device':'cpu'},'sourceHashes':{f:hashlib.sha256(Path(f).read_bytes()).hexdigest() for f in files},'protocol':protocol,'vocabulary':vocabulary,'rollouts':rollouts,'controls':{'oneToken':one,'rejectLong':{'inputLength':len(inputs['longPrompt']['ids']),'error':rejected},'leftTruncation':left}}
print(json.dumps(result,ensure_ascii=False,allow_nan=False))
