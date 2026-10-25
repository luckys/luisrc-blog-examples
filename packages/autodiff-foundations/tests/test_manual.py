import unittest
import numpy as np
from numpy.testing import assert_allclose
from manual import backward_trace, pack, unpack, finite_gradient, scalar_trace, manual_vector
from base import initialize, gradients

class ManualTests(unittest.TestCase):
    def setUp(self):
        self.x=np.array([[-1.,-1.],[-1.,1.],[1.,-1.],[1.,1.]])
        self.y=np.array([[0.],[1.],[1.],[0.]])
        self.layers=initialize(4,7)

    def test_shared_scalar_accumulates_both_paths(self):
        trace=scalar_trace(2.,3.)
        self.assertEqual(trace['q'],6);self.assertEqual(trace['r'],12);self.assertEqual(trace['loss'],144)
        self.assertEqual(trace['dqLeft'],24);self.assertEqual(trace['dqRight'],24)
        self.assertEqual(trace['dq'],48);self.assertEqual(trace['dw'],144);self.assertEqual(trace['dx'],96)

    def test_matrix_backward_matches_canonical_gradient_and_shapes(self):
        t=backward_trace(self.x,self.y,self.layers)
        self.assertEqual(t['dz2'].shape,(4,1));self.assertEqual(t['dh'].shape,(4,4));self.assertEqual(t['dz1'].shape,(4,4))
        expected=pack(gradients(self.x,self.y,self.layers))
        actual=np.concatenate([t[k].ravel()for k in ['dw1','db1','dw2','db2']])
        assert_allclose(actual,expected,rtol=1e-12,atol=1e-12)
        assert_allclose(t['db2'],t['dz2'].sum(axis=0))
        short=backward_trace(self.x[:3],self.y[:3],self.layers)
        self.assertEqual(short['dh'].shape,(3,4))
        self.assertEqual(short['dw1'].shape,(2,4))
        assert_allclose(manual_vector(short),pack(gradients(self.x[:3],self.y[:3],self.layers)),rtol=1e-12,atol=1e-12)

    def test_finite_differences_detect_missing_mean_without_mutation(self):
        before=pack(self.layers).copy()
        num=finite_gradient(self.x,self.y,self.layers,1e-5)
        grad=pack(gradients(self.x,self.y,self.layers))
        assert_allclose(num,grad,rtol=1e-5,atol=1e-8)
        self.assertFalse(np.allclose(num,4*grad,rtol=1e-5,atol=1e-8))
        assert_allclose(pack(self.layers),before,rtol=0,atol=0)
        with self.assertRaises(ValueError):finite_gradient(self.x,self.y,self.layers,0)

    def test_parameter_order_roundtrips_and_rejects_bad_vector(self):
        vector=pack(self.layers)
        self.assertEqual(len(vector),17)
        assert_allclose(pack(unpack(self.layers,vector)),vector)
        with self.assertRaises(ValueError):unpack(self.layers,vector[:-1])

if __name__=='__main__':unittest.main()
