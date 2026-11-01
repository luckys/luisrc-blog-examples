import sys,json,time,platform
from pathlib import Path
import torch
from generation import generate,load_model

torch.set_num_threads(1);torch.set_num_interop_threads(1);torch.use_deterministic_algorithms(True)
protocol=json.loads(Path('protocol.json').read_text());inputs=json.loads(Path('inputs.json').read_text())
model,vocabulary=load_model()
def emit(event):print(json.dumps(event,ensure_ascii=False,allow_nan=False),flush=True)
emit({'type':'ready','python':platform.python_version(),'torch':torch.__version__,'modelSeed':7,'threads':torch.get_num_threads()})
for line in sys.stdin:
    request=json.loads(line)
    if request.get('type')=='quit':break
    identifier=request['id'];prompt=inputs['prompts'][0]['ids'];strategy=protocol['strategies'][0]
    start=time.perf_counter_ns()
    iterator=generate(model,prompt,strategy,11,protocol['streaming']['maxNewTokens'])
    while True:
        before=time.perf_counter_ns();event=next(iterator);ready=time.perf_counter_ns()
        elapsed=(ready-start)/1e6
        if event['type']=='done':
            emit({'type':'done','id':identifier,'reason':event['reason'],'generatedIds':event['generatedIds'],'producerElapsedMs':elapsed})
            break
        emit({'type':'token','id':identifier,'index':event['index'],'token':event['token'],'text':vocabulary[event['token']],'producerElapsedMs':elapsed,'inferenceStepMs':(ready-before)/1e6,'modelProbability':event['modelProbability']})
