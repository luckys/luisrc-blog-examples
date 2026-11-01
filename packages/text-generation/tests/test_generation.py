import unittest,math
import torch
from generation import distribution,choose,LCG,generate

class GenerationTests(unittest.TestCase):
    def test_temperature_preserves_order_and_changes_concentration(self):
        base=distribution([2.,1.,0.],temperature=1)
        sharp=distribution([2.,1.,0.],temperature=.5)
        flat=distribution([2.,1.,0.],temperature=2)
        self.assertGreater(sharp['probabilities'][0],base['probabilities'][0])
        self.assertLess(flat['probabilities'][0],base['probabilities'][0])
        for t in [0,-1,float('nan')]:
            with self.assertRaises(ValueError):distribution([1,2],temperature=t)

    def test_top_k_ties_and_top_p_minimal_prefix(self):
        self.assertEqual(distribution([0,0,0,0],top_k=2)['kept'],[0,1])
        result=distribution([math.log(.4),math.log(.3),math.log(.2),math.log(.1)],top_p=.65)
        self.assertEqual(result['kept'],[0,1]);self.assertAlmostEqual(sum(result['probabilities']),1)
        self.assertAlmostEqual(result['retainedMass'],.7)
        self.assertEqual(distribution([0,0,0,0],top_p=.6)['kept'],[0,1,2])
        both=distribution([3,2,1,0],top_k=2,top_p=.5)
        self.assertEqual(both['kept'],[0])

    def test_rng_and_inverse_cdf_have_explicit_boundaries(self):
        self.assertEqual(LCG(0).next(),1013904223/2**32)
        self.assertEqual(choose([.2,.3,.5],0),0);self.assertEqual(choose([.2,.3,.5],.2),1)
        self.assertEqual(choose([0,0,1],.999999),2)
        with self.assertRaises(ValueError):choose([.5,.5],1)

    def test_max_new_tokens_context_and_eos_are_distinct(self):
        class Fixed:
            def __init__(self,token):self.token=token
            def __call__(self,ids):
                z=torch.full((1,ids.shape[1],5),-10.,dtype=torch.float64);z[0,-1,self.token]=10.;return z
        strategy={'mode':'greedy','temperature':1,'topK':None,'topP':None}
        def end(model,ids,limit=10,policy='reject'):
            return list(generate(model,ids,strategy,11,limit,policy))
        self.assertEqual(end(Fixed(4),[1,4],1)[-1]['reason'],'max_new_tokens')
        self.assertEqual(end(Fixed(2),[1,4])[-1]['reason'],'eos')
        self.assertEqual(end(Fixed(4),[1]*16)[-1]['reason'],'context_limit')
        with self.assertRaises(ValueError):end(Fixed(4),[1]*17)
        events=end(Fixed(4),[1]+[4]*20,1,'left_preserve_bos')
        self.assertEqual(len(events[0]['inputIds']),16);self.assertEqual(events[0]['inputIds'][0],1)
        self.assertEqual(events[0]['removed'],5)

if __name__=='__main__':unittest.main()
