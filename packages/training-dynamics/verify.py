import json
from pathlib import Path
import numpy as np
import platform
import torch
from experiments import calculate, hashes


def compare(actual, expected):
    if isinstance(actual, dict):
        assert actual.keys()==expected.keys()
        for key in actual: compare(actual[key],expected[key])
    elif isinstance(actual, list):
        assert len(actual)==len(expected)
        for a,b in zip(actual,expected): compare(a,b)
    elif isinstance(actual, float):
        np.testing.assert_allclose(actual,expected,rtol=1e-10,atol=1e-12)
    else:
        assert actual==expected, (actual, expected)


if __name__=='__main__':
    report=json.loads(Path('results/training.json').read_text())
    assert report['kind']=='optimizer_training_observations'
    assert len(report['runs'])==17
    assert report['runtime']['python']==platform.python_version()
    assert report['runtime']['numpy']==np.__version__
    assert report['runtime']['torch']==torch.__version__
    assert report==json.loads(Path('comparison.json').read_text())
    assert report['sources']==hashes()
    protocol=json.loads(Path('protocol.json').read_text())
    assert report['protocol']==protocol
    recomputed=calculate(protocol)
    for key in recomputed: compare(recomputed[key],report[key])
    print('17 trainings, accumulation controls, scalar trajectories and source hashes reproduced.')
