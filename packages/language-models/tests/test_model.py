import unittest
import json
from pathlib import Path
import torch
from model import TinyCausalLM

class ModelTests(unittest.TestCase):
    def setUp(self):
        torch.manual_seed(7)
        self.data=json.loads(Path('tokenized.json').read_text())
        self.model=TinyCausalLM(len(self.data['vocabulary'])).double().eval()

    def test_causal_future_cannot_change_prefix_logits(self):
        first=torch.tensor([[1,4,5,6,7,8,9]])
        second=torch.tensor([[1,4,5,6,10,11,12]])
        with torch.no_grad():
            a=self.model(first);b=self.model(second)
            self.assertLess((a[:,:4]-b[:,:4]).abs().max().item(),1e-12)
            self.assertGreater((self.model(first,causal=False)[:,:4]-self.model(second,causal=False)[:,:4]).abs().max().item(),1e-8)

    def test_probabilities_loss_and_parameter_count(self):
        record=self.data['records'][0]
        x=torch.tensor([record['input']]);y=torch.tensor([record['target']])
        logits=self.model(x);p=logits.softmax(-1)
        self.assertEqual(logits.shape,(1,len(record['input']),21))
        torch.testing.assert_close(p.sum(-1),torch.ones_like(p.sum(-1)))
        expected=-logits.log_softmax(-1).gather(-1,y.unsqueeze(-1)).mean()
        actual=torch.nn.functional.cross_entropy(logits.reshape(-1,21),y.reshape(-1))
        torch.testing.assert_close(expected,actual)
        self.assertEqual(sum(p.numel() for p in self.model.parameters()),3205)
        actual.backward();self.assertGreater(self.model.head.weight.grad.abs().sum().item(),0)

    def test_context_bounds_are_explicit(self):
        with self.assertRaises(ValueError):self.model(torch.ones((1,17),dtype=torch.long))
        with self.assertRaises(ValueError):self.model(torch.ones((1,0),dtype=torch.long))

if __name__=='__main__':unittest.main()
