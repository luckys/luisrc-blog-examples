import unittest
import numpy as np
import torch
from probes import normalization_probe, dropout_probe, clipping_probe, activation_probe, initialization_probe, bias_variance

class ProbeTests(unittest.TestCase):
    def test_normalization_matches_formula_and_uses_different_axes(self):
        p=normalization_probe()
        np.testing.assert_allclose(p['batchA'],p['batchManual'],atol=1e-12)
        np.testing.assert_allclose(p['layerA'],p['layerManual'],atol=1e-12)
        np.testing.assert_array_equal(p['layerA'][0],p['layerB'][0])
        self.assertFalse(np.allclose(p['batchA'][0],p['batchB'][0]))
        np.testing.assert_allclose(p['runningMean'],p['expectedRunningMean'],atol=1e-12)
        np.testing.assert_allclose(p['runningVariance'],p['expectedRunningVariance'],atol=1e-12)
        self.assertTrue(p['singletonRejected']);self.assertTrue(p['untrackedEvalUsesBatch'])

    def test_dropout_inverted_scaling_and_eval(self):
        p=dropout_probe()
        self.assertEqual(p['possibleValues'],[0.,1.25]);self.assertTrue(p['evalIdentity'])
        self.assertLess(abs(p['mean']-1),.02)

    def test_clipping_global_norm_and_adam_counterexample(self):
        p=clipping_probe()
        self.assertAlmostEqual(p['vector']['before'],5.)
        self.assertLessEqual(p['vector']['after'],2.)
        np.testing.assert_allclose(np.array(p['vector']['values'])/[3.,4.],[.4,.4],rtol=1e-6)
        self.assertGreater(p['adam']['stepNorm'],p['adam']['lrTimesClip'])
        self.assertTrue(p['nonfiniteRejected'])

    def test_activation_and_initialization_controls(self):
        a=activation_probe();self.assertEqual(a['deadReluBiasGradient'],0.)
        self.assertNotEqual(a['leakyBiasGradient'],0.)
        p=initialization_probe()
        z=next(r for r in p if r['id']=='zeros_relu')
        self.assertTrue(all(h['gradientNorm']==0 for h in z['layers']))
        self.assertTrue(all(h['saturationFraction'] is None for h in z['layers']))

    def test_finite_ensemble_bias_variance_identity(self):
        p=bias_variance({'datasets':8,'trainCount':24,'firstSeed':200,'degrees':[1,5,15],'ridge':.0001,'noiseStd':.25})
        for r in p['models']:
            self.assertAlmostEqual(r['cleanRisk'],r['biasSquared']+r['variance'],places=10)
            self.assertEqual(r['knownNoiseVariance'],.0625)

if __name__=='__main__':unittest.main()
