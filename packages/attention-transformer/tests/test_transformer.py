import unittest
import torch
from torch import nn
from attention import allowed_keys
from transformer import TransformerBlock, DecoderOnly, EncoderDecoder, example_inputs
from probes import observations

class TransformerTests(unittest.TestCase):
    def test_zero_sublayers_leave_residual_unchanged_in_pre_norm_block(self):
        model=TransformerBlock(7)
        with torch.no_grad():
            model.attention.output.weight.zero_();model.attention.output.bias.zero_()
            model.feed_forward[-1].weight.zero_();model.feed_forward[-1].bias.zero_()
        x=torch.randn(2,5,8,dtype=torch.float64)
        out,_=model(x,allowed_keys(torch.tensor([5,3]),5,5,causal=True))
        torch.testing.assert_close(out,x,rtol=0,atol=0)

    def test_pre_norm_block_matches_native_encoder_layer_with_copied_weights(self):
        model=TransformerBlock(7).eval()
        native=nn.TransformerEncoderLayer(8,2,16,dropout=0,activation='relu',batch_first=True,norm_first=True,dtype=torch.float64).eval()
        with torch.no_grad():
            attention=model.attention
            native.self_attn.in_proj_weight.copy_(torch.cat([attention.query.weight,attention.key.weight,attention.value.weight]))
            native.self_attn.in_proj_bias.copy_(torch.cat([attention.query.bias,attention.key.bias,attention.value.bias]))
            native.self_attn.out_proj.load_state_dict(attention.output.state_dict())
            native.linear1.load_state_dict(model.feed_forward[0].state_dict())
            native.linear2.load_state_dict(model.feed_forward[-1].state_dict())
            native.norm1.load_state_dict(model.norm1.state_dict());native.norm2.load_state_dict(model.norm2.state_dict())
        x=torch.randn(2,5,8,dtype=torch.float64,generator=torch.Generator().manual_seed(102))
        allow=allowed_keys(torch.tensor([5,3]),5,5,causal=True)
        actual,_=model(x,allow)
        expected=native(x,src_mask=(~allow).expand(2,2,5,5).reshape(4,5,5))
        torch.testing.assert_close(actual,expected,rtol=1e-12,atol=1e-12)

    def test_causal_lm_rejects_future_influence_and_negative_control_detects_it(self):
        _,tokens,_,lengths=example_inputs()
        model=DecoderOnly(7).eval();changed=tokens.clone();changed[0,3:]=torch.tensor([5,6]);changed[1,3:]=torch.tensor([10,11])
        before,_=model(tokens,lengths,causal=True);after,_=model(changed,lengths,causal=True)
        torch.testing.assert_close(before[:,:3],after[:,:3],rtol=0,atol=0)
        unmasked,_=model(tokens,lengths,causal=False);leaked,_=model(changed,lengths,causal=False)
        self.assertGreater(float((unmasked[0,:3]-leaked[0,:3]).detach().abs().max()),1e-5)
        embeddings=model.embed(tokens).detach().requires_grad_(True)
        logits,_=model.from_embeddings(embeddings,lengths,causal=True)
        grad=torch.autograd.grad(logits[0,1,1],embeddings)[0]
        self.assertTrue(bool((grad[0,2:]==0).all()));self.assertTrue(bool((grad[1]==0).all()))

    def test_encoder_decoder_uses_source_and_keeps_target_prefix_causal(self):
        source,target,source_lengths,target_lengths=example_inputs()
        model=EncoderDecoder(7).eval();base,trace=model(source,target,source_lengths,target_lengths)
        self.assertEqual(base.shape,(2,5,12));self.assertEqual(trace['cross']['weights'].shape,(2,2,5,4))
        changed=target.clone();changed[0,3:]=torch.tensor([5,6])
        future,_=model(source,changed,source_lengths,target_lengths)
        torch.testing.assert_close(base[0,:3],future[0,:3],rtol=0,atol=0)
        padded=source.clone();padded[1,2:]=torch.tensor([10,11])
        padding_only,_=model(padded,target,source_lengths,target_lengths)
        torch.testing.assert_close(base[1,:3],padding_only[1,:3],rtol=0,atol=0)
        source_change=source.clone();source_change[0,3]=6
        updated,_=model(source_change,target,source_lengths,target_lengths)
        self.assertGreater(float((updated[0,0]-base[0,0]).detach().abs().max()),1e-5)

    def test_native_conventions_and_numerical_controls_are_observable(self):
        report=observations()
        self.assertTrue(report['softmax']['naiveNonfinite'])
        self.assertTrue(report['softmax']['stableFinite'])
        self.assertGreater(report['wrongMaskError'],1e-5)
        self.assertEqual(report['costs'][1]['scoreBytes'],4*report['costs'][0]['scoreBytes'])
        self.assertEqual(report['fullyMaskedPolicy'],'manual rejects')

if __name__=='__main__':unittest.main()
