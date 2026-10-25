import unittest
import numpy as np
from numpy.testing import assert_allclose
from base import initialize
from manual import backward_trace, manual_vector
from framework import torch_gradient, graph_checks, vector_product, scalar_framework

class TorchTests(unittest.TestCase):
    def setUp(self):
        self.x=np.array([[-1.,-1.],[-1.,1.],[1.,-1.],[1.,1.]])
        self.y=np.array([[0.],[1.],[1.],[0.]])
        self.layers=initialize(4,7)

    def test_all_seventeen_manual_gradients_match_pytorch(self):
        vector,loss= torch_gradient(self.x,self.y,self.layers)
        trace=backward_trace(self.x,self.y,self.layers)
        assert_allclose(vector,manual_vector(trace),rtol=1e-12,atol=1e-12)
        self.assertAlmostEqual(loss,trace['loss'],places=12)

    def test_accumulation_reset_does_not_update_parameters(self):
        c=graph_checks(self.x,self.y,self.layers)
        self.assertTrue(c['weightsUnchanged'])
        assert_allclose(c['twice'],2*np.array(c['once']),rtol=1e-12,atol=1e-12)
        assert_allclose(c['reset'],c['once'],rtol=1e-12,atol=1e-12)

    def test_detach_is_missing_path_not_zero_gradient(self):
        c=graph_checks(self.x,self.y,self.layers)
        self.assertEqual(c['detached'][:12],[None]*12)
        self.assertTrue(all(v is not None for v in c['detached'][12:]))

    def test_graph_lifetime_no_grad_and_gradcheck_are_observed(self):
        c=graph_checks(self.x,self.y,self.layers)
        self.assertTrue(c['reuseRejected']);self.assertTrue(c['noGradRejected']);self.assertTrue(c['gradcheck'])
        self.assertEqual(c['nonLeafGradWithoutRetain'],None)
        self.assertTrue(c['leafGradsPresentWithoutRetain'])
        self.assertEqual(c['hiddenGradShape'],[4,4])

    def test_vector_jacobian_product_matches_loss_gradient(self):
        assert_allclose(vector_product(self.x,self.y,self.layers),torch_gradient(self.x,self.y,self.layers)[0],rtol=1e-12,atol=1e-12)

    def test_scalar_shared_paths_match_autograd(self):
        c=scalar_framework(2.,3.)
        self.assertEqual(c['dw'],144);self.assertEqual(c['dx'],96);self.assertEqual(c['dq'],48)

if __name__=='__main__':unittest.main()
