import unittest
import copy
import json
from pathlib import Path
import numpy as np
import torch
from training import make_data, make_model, optimizer_for, train_run, Tracker

class TrainingTests(unittest.TestCase):
    def setUp(self):
        torch.set_num_threads(1)
        self.c=json.loads(Path('protocol.json').read_text())

    def test_data_contract_and_declared_corruption(self):
        d=make_data(self.c['data'])
        self.assertEqual(d['x'].shape,(24,1));self.assertEqual(d['vx'].shape,(256,1))
        self.assertEqual(d['grid'].shape,(101,1))
        np.testing.assert_allclose(d['y']-d['unshiftedY'],np.eye(24)[:,8:9]*1.25)

    def test_initial_linear_weights_identical_between_interventions(self):
        reference=make_model(7,{})
        for opts in self.c['variants'].values():
            other=make_model(7,opts)
            a=[m for m in reference.modules() if isinstance(m,torch.nn.Linear)]
            b=[m for m in other.modules() if isinstance(m,torch.nn.Linear)]
            for x,y in zip(a,b):torch.testing.assert_close(x.weight,y.weight,rtol=0,atol=0)

    def test_weight_decay_only_applies_to_matrices(self):
        model=make_model(7,{})
        opt=optimizer_for(model,.01,.01)
        self.assertTrue(all(p.ndim>1 for p in opt.param_groups[0]['params']))
        self.assertTrue(all(p.ndim==1 for p in opt.param_groups[1]['params']))
        self.assertEqual(opt.param_groups[0]['weight_decay'],.01)
        self.assertEqual(opt.param_groups[1]['weight_decay'],0)

    def test_tracker_ties_delta_and_patience(self):
        t=Tracker(2,.01)
        self.assertEqual(t.observe(1.,0),(True,False))
        self.assertEqual(t.observe(.995,10),(False,False))
        self.assertEqual(t.observe(.99,20),(False,True))
        self.assertEqual(t.best_epoch,0)
        with self.assertRaises(ValueError):t.observe(float('nan'),30)

    def test_early_stop_restores_independent_best_snapshot(self):
        c=copy.deepcopy(self.c);c['epochs']=30;c['earlyStopping']={'patience':1,'minDelta':100.}
        r=train_run(c,7,'early_stopping')
        self.assertEqual(r['last']['epoch'],10)
        self.assertEqual(r['selected']['epoch'],0)
        self.assertEqual(r['selected']['prediction'],r['initial']['prediction'])
        self.assertNotEqual(r['last']['prediction'],r['selected']['prediction'])
        self.assertTrue(r['restoredBest'])

if __name__=='__main__':unittest.main()
