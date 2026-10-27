import copy
import unittest
import torch
from torch import nn
from torch.nn import functional as F
from models import Autoencoder, LoRALinear, Adapter, make_classifier, parameter_counts
from objectives import denoising_loss, contrastive_loss


class Models(unittest.TestCase):
    def test_lora_starts_identical_and_merges_after_update(self):
        torch.manual_seed(7)
        base = nn.Linear(16, 8)
        layer = LoRALinear(base)
        x = torch.randn(4, 16)
        torch.testing.assert_close(layer(x), base(x), rtol=0, atol=0)
        layer(x).square().sum().backward()
        self.assertTrue(torch.equal(layer.a.grad, torch.zeros_like(layer.a)))
        self.assertGreater(layer.b.grad.abs().sum(), 0)
        with torch.no_grad():
            layer.b.add_(-0.1 * layer.b.grad)
        torch.testing.assert_close(layer(x), layer.merged()(x), rtol=1e-5, atol=1e-6)
        self.assertEqual(parameter_counts(layer)['trainable'], 48)

    def test_adapter_identity_and_later_nonlinearity(self):
        torch.manual_seed(7)
        adapter = Adapter()
        x = torch.randn(4, 8)
        torch.testing.assert_close(adapter(x), x, rtol=0, atol=0)
        adapter(x).square().sum().backward()
        self.assertGreater(adapter.up.weight.grad.abs().sum(), 0)
        self.assertEqual(parameter_counts(adapter)['trainable'], 42)

    def test_trainable_sets_and_frozen_weight_preservation(self):
        torch.manual_seed(7)
        base = Autoencoder()
        expected = dict(linear=18, scratch=298, head=18, gradual=18, full=298, lora=66, adapter=60)
        x, y = torch.randn(4, 8), torch.tensor([0, 1, 0, 1])
        for mode, count in expected.items():
            model = make_classifier(base, mode, 7)
            before = {n: p.clone() for n, p in model.named_parameters() if not p.requires_grad}
            self.assertEqual(parameter_counts(model)['trainable'], count)
            optimizer = torch.optim.Adam([p for p in model.parameters() if p.requires_grad], lr=.01)
            F.cross_entropy(model(x), y).backward()
            optimizer.step()
            for name, value in model.named_parameters():
                if name in before:
                    torch.testing.assert_close(value, before[name], rtol=0, atol=0)
                    self.assertIsNone(value.grad)

    def test_same_head_and_reused_encoder(self):
        base = Autoencoder()
        a, b = make_classifier(base, 'full', 7), make_classifier(base, 'lora', 7)
        torch.testing.assert_close(a.head.weight, b.head.weight, rtol=0, atol=0)
        x = torch.randn(4, 8)
        torch.testing.assert_close(a(x), b(x), rtol=0, atol=0)
        with torch.no_grad():
            a.encoder.first.weight.add_(1)
        self.assertFalse(torch.equal(a.encoder.first.weight, base.encoder.first.weight))

    def test_denoising_uses_clean_target(self):
        model = nn.Identity()
        clean = torch.tensor([[1., 2.]])
        noise = torch.tensor([[.5, -.5]])
        self.assertEqual(denoising_loss(model, clean, noise).item(), .25)

    def test_contrastive_manual_denominator_symmetry_and_collapse(self):
        a = torch.tensor([[1., 0.], [0., 1.], [-1., 0.]], dtype=torch.float64, requires_grad=True)
        b = torch.tensor([[.9, .1], [.1, .9], [-.9, .1]], dtype=torch.float64, requires_grad=True)
        logits = F.normalize(a, dim=-1) @ F.normalize(b, dim=-1).T / .2
        manual = ((-logits.diag() + logits.logsumexp(1)).mean() + (-logits.diag() + logits.logsumexp(0)).mean()) / 2
        torch.testing.assert_close(contrastive_loss(a, b), manual)
        torch.testing.assert_close(contrastive_loss(a, b), contrastive_loss(b, a))
        torch.autograd.gradcheck(lambda x, y: contrastive_loss(x, y), (a, b))
        collapsed = contrastive_loss(torch.ones(3, 2), torch.ones(3, 2))
        self.assertAlmostEqual(collapsed.item(), torch.log(torch.tensor(3.)).item())
        with self.assertRaises(ValueError):
            contrastive_loss(a, b, 0)
