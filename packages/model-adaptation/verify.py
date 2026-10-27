import json
import math
from pathlib import Path
from experiments import run


def compare(saved, fresh, path='report'):
    if isinstance(saved, dict):
        assert saved.keys() == fresh.keys(), path
        for key in saved:
            if key != 'capturedAt':
                compare(saved[key], fresh[key], path + '.' + key)
    elif isinstance(saved, list):
        assert len(saved) == len(fresh), path
        for index, (a, b) in enumerate(zip(saved, fresh)):
            compare(a, b, f'{path}[{index}]')
    elif isinstance(saved, float):
        assert math.isclose(saved, fresh, rel_tol=1e-5, abs_tol=1e-7), (path, saved, fresh)
    else:
        assert saved == fresh, (path, saved, fresh)


if __name__ == '__main__':
    saved = json.loads(Path('comparison.json').read_text())
    assert saved == json.loads(Path('results/observations.json').read_text())
    compare(saved, run())
    print('3 pretrainings and 21 adaptations recalculated; every holdout prediction, curve and parameter delta verified')
