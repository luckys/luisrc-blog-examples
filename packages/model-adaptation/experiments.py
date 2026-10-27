import hashlib
import json
import platform
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import torch
from data import datasets, audit
from models import parameter_counts
from training import pretrain, adapt, reconstruction, classification, retained_reconstruction
from objectives import contrastive_probe

SOURCES = ['data.py', 'models.py', 'objectives.py', 'training.py', 'experiments.py', 'verify.py',
    'protocol.json', 'runtime.json', 'run.mjs', 'tests/test_models.py', 'tests/test_data.py']


def run():
    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)
    protocol = json.loads(Path('protocol.json').read_text())
    data = datasets(protocol)
    split_audit = audit(data)
    pretrained_runs, adaptations, trained = [], [], []
    for seed in protocol['seeds']:
        pretrained, report = pretrain(data, protocol, seed)
        pretrained_runs.append(report)
        for mode in protocol['modes']:
            model, result = adapt(pretrained, data, protocol, mode, seed)
            trained.append((pretrained, model, result))
    # Holdout metrics are evaluated only after all optimizers finish. No configuration is selected from them.
    for pretrained, model, report in trained:
        before = reconstruction(pretrained, data['source']['test'][0])
        report['test'] = classification(model, data['target']['test'], True)
        report['train'] = classification(model, data['target']['train'])
        report['sourceBeforeMSE'] = before if report['mode'] not in ['linear', 'scratch'] else None
        if report['mode'] not in ['linear', 'scratch']:
            report['sourceMSE'] = retained_reconstruction(model, pretrained, data['source']['test'][0])
            report['sourceDeltaMSE'] = report['sourceMSE'] - before
        adaptations.append(report)
    majority = torch.bincount(data['target']['train'][1], minlength=2).argmax().item()
    return dict(kind='model_adaptation_observations', schema=1, capturedAt=datetime.now(timezone.utc).isoformat(),
        protocol=protocol, runtime=dict(python=platform.python_version(), numpy=np.__version__, torch=torch.__version__),
        sourceHashes={name: hashlib.sha256(Path(name).read_bytes()).hexdigest() for name in SOURCES},
        splits=split_audit, pretraining=pretrained_runs, adaptations=adaptations,
        majority=dict(classId=majority, accuracy=(data['target']['test'][1] == majority).float().mean().item()),
        contrastive=contrastive_probe())


if __name__ == '__main__':
    print(json.dumps(run(), allow_nan=False))
