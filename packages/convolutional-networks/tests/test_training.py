import unittest
from copy import deepcopy
import torch
from torch import nn
from networks import TinyCNN, ResidualBlock, configure_target
from training import make_data, train, feature_record, datasets

class TrainingTests(unittest.TestCase):
    def test_dataset_independent_reproducible_and_target_labels(self):
        a=make_data('source','train');b=make_data('source','validation')
        self.assertEqual(a[0].shape,(256,1,24,24));self.assertEqual(b[0].shape,(128,1,24,24))
        self.assertTrue(torch.equal(a[0],make_data('source','train')[0]))
        self.assertFalse(torch.equal(a[0][:128],b[0]))
        x,y=make_data('target','train');self.assertEqual(x.shape[0],32)
        self.assertEqual(torch.bincount(y).tolist(),[16,16])
        self.assertEqual(x.dtype,torch.float32);self.assertEqual(y.dtype,torch.int64)
        self.assertGreaterEqual(float(x.min()),0);self.assertLessEqual(float(x.max()),1)

    def test_model_logits_shapes_parameter_counts_and_forward(self):
        m=TinyCNN(4,7);x=torch.randn(2,1,24,24)
        self.assertEqual(m(x).shape,(2,4));self.assertEqual(sum(p.numel() for p in m.parameters()),372)
        self.assertEqual(sum(p.numel() for p in TinyCNN(2,7).parameters()),354)
        self.assertEqual(m.backbone(x).shape,(2,8))
        self.assertTrue(torch.isfinite(nn.CrossEntropyLoss()(m(x),torch.tensor([0,3]))))
        with self.assertRaises(RuntimeError):m(torch.randn(2,24,24,1))

    def test_residual_shapes_projection_and_post_relu(self):
        x=torch.randn(2,4,12,12)
        identity=ResidualBlock(4,4).eval()
        for p in identity.branch.parameters():nn.init.zeros_(p)
        self.assertTrue(torch.equal(identity(x),torch.relu(x)))
        self.assertEqual(ResidualBlock(4,8,2)(x).shape,(2,8,6,6))
        with self.assertRaises(RuntimeError): _=x+torch.randn(2,8,6,6)

    def test_transfer_initialization_freezing_and_updates(self):
        source=TinyCNN(4,7);state=deepcopy(source.backbone.state_dict())
        configured=[configure_target(state,7,mode) for mode in ['scratch','random_frozen','frozen','fine_tune']]
        for m in configured[1:]:self.assertTrue(torch.equal(m.head.weight,configured[0].head.weight))
        self.assertTrue(torch.equal(configured[0].backbone.conv1.weight,configured[1].backbone.conv1.weight))
        self.assertTrue(torch.equal(configured[2].backbone.conv1.weight,source.backbone.conv1.weight))
        for mode,m in zip(['scratch','random_frozen','frozen','fine_tune'],configured):
            self.assertEqual(sum(p.numel() for p in m.parameters() if p.requires_grad),18 if 'frozen' in mode else 354)
        with self.assertRaises(RuntimeError):configured[2].load_state_dict(source.state_dict(),strict=True)
        observed=[]
        m=configured[2]
        hook=m.backbone.register_forward_hook(lambda mod,args,out:observed.append((mod.training,torch.is_grad_enabled())))
        run=train(m,datasets('target'),7,'frozen',epochs=2)
        hook.remove()
        self.assertTrue(all(not a and not b for a,b in observed))
        self.assertEqual(run['backboneMaxChange'],0);self.assertGreater(run['headMaxChange'],0)
        self.assertEqual(run['updates'],4)

    def test_feature_maps_are_actual_forward_and_gradient_is_local(self):
        model=TinyCNN(4,7);x,y=make_data('source','validation')
        r=feature_record(model,x[0:1],int(y[0]),0)
        import numpy as np
        np.testing.assert_array_equal(r['maps']['conv1_relu'],np.maximum(r['maps']['conv1_pre'],0))
        self.assertEqual(len(r['maps']['conv2_pre']),8)
        for gradient in r['gradients']:
            g=np.array(gradient);outside=g.copy();outside[9:17,9:17]=0
            self.assertEqual(np.count_nonzero(outside),0)
        gap=torch.tensor(r['gap']);expected=model.head(gap).detach()
        torch.testing.assert_close(expected,torch.tensor(r['logits']))

if __name__=='__main__': unittest.main()
