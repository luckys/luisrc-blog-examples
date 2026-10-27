import json
import unittest
from pathlib import Path
import torch
from workload import configure, make_model, make_data, training_step, optimizer_for
from controls import accumulation_control


class Workload(unittest.TestCase):
    def setUp(self):
        self.protocol = json.loads(Path('protocol.json').read_text())
        configure(self.protocol)

    def test_same_initial_weights_and_shapes(self):
        a, b = make_model(self.protocol, 'cpu'), make_model(self.protocol, 'cpu')
        for x,y in zip(a.parameters(),b.parameters()):
            torch.testing.assert_close(x,y,rtol=0,atol=0)
        features, labels = make_data(self.protocol, 32)
        self.assertEqual(a(features).shape,(32,16))
        torch.testing.assert_close(labels,features[:,:16].argmax(1),rtol=0,atol=0)

    def test_training_really_updates_weights_and_uses_fp32_parameters(self):
        model=make_model(self.protocol,'cuda')
        before=model[0].weight.detach().clone()
        features,labels=make_data(self.protocol,32,'cuda')
        optimizer=optimizer_for(model,self.protocol)
        scaler=torch.amp.GradScaler('cuda',enabled=True)
        loss=training_step(model,optimizer,scaler,features,labels,'cuda','fp16')
        self.assertTrue(torch.isfinite(loss))
        self.assertFalse(torch.equal(before,model[0].weight))
        self.assertTrue(all(p.dtype==torch.float32 for p in model.parameters()))

    def test_unequal_microbatches_need_example_weights(self):
        for device in ['cpu','cuda']:
            result=accumulation_control(self.protocol,device)
            self.assertLess(result['weightedUpdateError'],1e-6)
            self.assertGreater(result['unweightedUpdateError'],1e-6)
