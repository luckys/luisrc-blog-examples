import json
import unittest
from pathlib import Path
from data import datasets, audit


class Splits(unittest.TestCase):
    def test_disjoint_reproducible_rows_and_both_classes(self):
        protocol = json.loads(Path('protocol.json').read_text())
        data = datasets(protocol)
        report = audit(data)
        self.assertEqual(report, audit(datasets(protocol)))
        for domain in report.values():
            for split in domain.values():
                self.assertGreater(min(split['classCounts']), 0)

    def test_overlap_is_rejected(self):
        protocol = json.loads(Path('protocol.json').read_text())
        data = datasets(protocol)
        data['target']['test'] = data['target']['train']
        with self.assertRaises(ValueError):
            audit(data)

    def test_optimizers_need_no_holdout_and_pretraining_needs_no_class_labels(self):
        from training import pretrain, adapt
        protocol = json.loads(Path('protocol.json').read_text())
        protocol['source']['steps'] = 2
        protocol['target']['steps'] = 2
        protocol['target']['unfreezeAt'] = 1
        data = datasets(protocol)
        restricted = {domain: {split: pair for split, pair in values.items() if split != 'test'}
            for domain, values in data.items()}
        # Labels are deliberately absent from the self-supervised inputs.
        restricted['source'] = {split: (pair[0], None) for split, pair in restricted['source'].items()}
        pretrained, _ = pretrain(restricted, protocol, 7)
        model, report = adapt(pretrained, restricted, protocol, 'gradual', 7)
        self.assertEqual(report['initialParameters']['trainable'], 18)
        self.assertEqual(report['finalParameters']['trainable'], 298)
        self.assertTrue(any(name.startswith('encoder.') for name in report['changedParameters']))
