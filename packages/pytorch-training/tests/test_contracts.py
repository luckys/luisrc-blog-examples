import unittest
import copy
import tempfile
import json
from pathlib import Path
import numpy as np
import torch
from pipeline import make_session, train_until, XorMLP, model_vector
from checkpoints import save_resume, load_resume
from probes import tensor_probe, mode_probe, snapshot_probe


class ContractTests(unittest.TestCase):
    def setUp(self):
        torch.set_num_threads(1)
        self.config=json.loads(Path('protocol.json').read_text())

    def test_tensor_storage_and_shape_controls_are_observed(self):
        p=tensor_probe()
        self.assertEqual(p['badShape'],[4,4]);self.assertEqual(p['goodShape'],[4,1])
        self.assertTrue(p['bceRejected'])
        self.assertEqual(p['sharedAfterMutation'],9);self.assertEqual(p['copiedAfterMutation'],0)
        self.assertNotEqual(p['badMse'],p['goodMse'])

    def test_train_eval_and_grad_are_independent_switches(self):
        p=mode_probe()
        self.assertTrue(p['evalStillRequiresGrad'])
        self.assertTrue(p['noGradStillTraining'])
        self.assertFalse(p['noGradRequiresGrad'])
        self.assertTrue(p['dropoutTrainDiffers'])
        self.assertTrue(p['dropoutEvalIdentity'])

    def test_snapshot_alias_and_copy_have_different_semantics(self):
        p=snapshot_probe()
        self.assertTrue(p['shallowChanged']);self.assertTrue(p['deepUnchanged'])

    def test_epoch20_records_used_rate_and_next_rate(self):
        c=copy.deepcopy(self.config)
        c['dataset']['trainPerQuadrant']=1;c['dataset']['validationPerQuadrant']=1
        s=make_session(c,7);train_until(s,20)
        self.assertEqual(s.history[20]['lrUsed'],.1)
        self.assertEqual(s.history[20]['lrNext'],.05)

    def test_checkpoint_requires_boundary_and_restores_cpu_rng(self):
        s=make_session(self.config,7);train_until(s,1)
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'resume.pt'
            s.in_epoch=True
            with self.assertRaises(ValueError):save_resume(path,s)
            s.in_epoch=False;save_resume(path,s)
            other=make_session(self.config,7)
            torch.rand(11)
            before_load=torch.get_rng_state().clone()
            payload=load_resume(path,other)
            self.assertFalse(torch.equal(before_load,payload['torchRng']))
            self.assertTrue(torch.equal(torch.get_rng_state(),payload['torchRng']))
            self.assertTrue(torch.equal(other.generator.get_state(),payload['loaderRng']))
            incompatible=copy.deepcopy(self.config);incompatible['batchSize']=32
            with self.assertRaises(ValueError):load_resume(path,make_session(incompatible,7))

    def test_strict_state_dict_rejects_different_width(self):
        with self.assertRaises(RuntimeError):XorMLP(3).load_state_dict(XorMLP(4).state_dict(),strict=True)

if __name__=='__main__':unittest.main()
