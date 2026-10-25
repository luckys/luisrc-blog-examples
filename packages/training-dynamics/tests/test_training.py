import unittest
import numpy as np
from training import batches, flatten, initialize, make_split, gradients, accumulated_gradient, train_run

class BatchTests(unittest.TestCase):
    def test_epoch_covers_every_sample_once_and_keeps_tail(self):
        groups=batches(13,5,420,0)
        self.assertEqual([len(g) for g in groups],[5,5,3])
        self.assertEqual(sorted(np.concatenate(groups).tolist()),list(range(13)))
        np.testing.assert_array_equal(np.concatenate(groups),np.concatenate(batches(13,4,420,0)))
        self.assertFalse(np.array_equal(np.concatenate(groups),np.concatenate(batches(13,5,420,1))))

    def test_weighted_microbatches_match_whole_batch_and_reject_naive(self):
        x,y=make_split(4,101,.45);x,y=x[:13],y[:13]
        layers=initialize(4,7)
        whole=flatten(gradients(x,y,layers))
        correct=accumulated_gradient(x,y,layers,5)
        naive=accumulated_gradient(x,y,layers,5,naive=True)
        np.testing.assert_allclose(flatten(correct),whole,rtol=1e-12,atol=1e-14)
        self.assertGreater(np.max(np.abs(flatten(naive)-whole)),1e-4)

    def test_accumulated_training_has_one_step_per_effective_batch(self):
        x,y=make_split(4,101,.45)
        for kind in ['sgd','momentum','adam','adamw']:
            opts={'lr':.01,'decay':.01 if kind=='adamw' else 0.}
            a=train_run(x,y,x,y,7,kind,opts,3,7,420)
            b=train_run(x,y,x,y,7,kind,opts,3,7,420,micro_size=3)
            self.assertEqual(a['updates'],9)
            self.assertEqual(b['updates'],9)
            np.testing.assert_allclose(a['parameters'],b['parameters'],rtol=1e-11,atol=1e-13)
            self.assertEqual(a['examplesSeen'],48)

if __name__=='__main__': unittest.main()
