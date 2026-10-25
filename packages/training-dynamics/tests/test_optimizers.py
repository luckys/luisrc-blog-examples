import unittest
import numpy as np
import torch
from optimizers import Optimizer, schedule_rate

class UpdateTests(unittest.TestCase):
    def test_sgd_exact_sign(self):
        p = [np.array([2., -3.])]
        result = Optimizer(p, 'sgd').step(p, [np.array([4., -2.])], .1)
        np.testing.assert_allclose(result[0], [1.6, -2.8], atol=1e-15)
        np.testing.assert_array_equal(p[0], [2., -3.])

    def test_all_updates_match_pytorch_with_and_without_decay(self):
        for kind in ['sgd', 'momentum', 'adam', 'adamw']:
            for decay in [0., .01]:
                p = [np.array([2., -3.]), np.array([.2])]
                tp = [torch.tensor(a, dtype=torch.float64, requires_grad=True) for a in p]
                manual = Optimizer(p, kind, decay=decay)
                if kind in ['sgd','momentum']:
                    reference = torch.optim.SGD(tp, lr=.03, momentum=.9 if kind=='momentum' else 0., weight_decay=decay)
                else:
                    reference = (torch.optim.AdamW if kind=='adamw' else torch.optim.Adam)(tp, lr=.03, weight_decay=decay, foreach=False)
                for step, lr in enumerate([.03,.01,.02,.005]):
                    grads = [np.array([.4, -.7]) * (-1)**step, np.array([0. if step==2 else .1])]
                    for t,g in zip(tp,grads): t.grad=torch.tensor(g,dtype=torch.float64)
                    reference.param_groups[0]['lr']=lr
                    reference.step()
                    p=manual.step(p,grads,lr)
                    for a,b in zip(p,tp): np.testing.assert_allclose(a,b.detach().numpy(),rtol=1e-12,atol=1e-14)
                self.assertEqual(manual.t,4)

    def test_zero_gradient_decay_is_not_none(self):
        p=[np.array([2.])]
        adam=Optimizer(p,'adam',decay=.1).step(p,[np.array([0.])],.01)[0][0]
        adamw=Optimizer(p,'adamw',decay=.1).step(p,[np.array([0.])],.01)[0][0]
        self.assertAlmostEqual(adam,1.9900000005)
        self.assertAlmostEqual(adamw,1.998)
        self.assertNotAlmostEqual(adam,adamw)

    def test_schedule_uses_update_index(self):
        self.assertEqual(schedule_rate(.1,0,640,40,.1),.0025)
        self.assertEqual(schedule_rate(.1,39,640,40,.1),.1)
        self.assertEqual(schedule_rate(.1,40,640,40,.1),.1)
        self.assertAlmostEqual(schedule_rate(.1,639,640,40,.1),.01)
        with self.assertRaises(ValueError): schedule_rate(.1,640,640,40,.1)

if __name__=='__main__': unittest.main()
