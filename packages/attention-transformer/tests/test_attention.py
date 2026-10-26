import unittest
import math
import torch
from torch.nn import functional as F
from attention import stable_softmax, scaled_attention, allowed_keys, MultiHead, native_mha, positional_encoding

torch.set_num_threads(1)

class AttentionTests(unittest.TestCase):
    def test_stable_softmax_large_values_and_normalization_axis(self):
        scores=torch.tensor([[1000.,1001.,999.],[-1000.,-1000.,-1000.]],dtype=torch.float64)
        p=stable_softmax(scores)
        torch.testing.assert_close(p,torch.softmax(scores,-1))
        torch.testing.assert_close(p.sum(-1),torch.ones(2,dtype=p.dtype))
        self.assertTrue(bool(torch.isfinite(p).all()))

    def test_controlled_weighted_sum_and_manual_row(self):
        q=torch.tensor([[[[1.,0.],[0.,1.]]]],dtype=torch.float64)
        k=torch.tensor([[[[1.,0.],[0.,1.]]]],dtype=torch.float64)
        v=torch.tensor([[[[2.,4.],[8.,10.]]]],dtype=torch.float64)
        allow=torch.ones(1,1,2,2,dtype=torch.bool)
        out,weights,scores=scaled_attention(q,k,v,allow)
        p=math.exp(1/math.sqrt(2))/(math.exp(1/math.sqrt(2))+1)
        torch.testing.assert_close(weights[0,0,0],torch.tensor([p,1-p],dtype=q.dtype))
        torch.testing.assert_close(out[0,0,0],p*v[0,0,0]+(1-p)*v[0,0,1])
        self.assertEqual(out.shape,(1,1,2,2))

    def test_masks_zero_weights_and_fully_excluded_rows_rejected(self):
        q=torch.randn(2,2,5,4,dtype=torch.float64);k=torch.randn(2,2,4,4,dtype=q.dtype);v=torch.randn_like(k)
        allow=allowed_keys(torch.tensor([4,2]),5,4)
        out,w,_=scaled_attention(q,k,v,allow)
        expanded=allow.expand_as(w)
        self.assertTrue(bool((w[~expanded]==0).all()))
        torch.testing.assert_close(out,F.scaled_dot_product_attention(q,k,v,attn_mask=allow,dropout_p=0))
        with self.assertRaises(ValueError):scaled_attention(q,k,v,torch.zeros_like(allow))
        with self.assertRaises(ValueError):scaled_attention(q,k,v,allow.double())
        with self.assertRaises(ValueError):scaled_attention(q,k[:,:,:,:3],v,allow)

    def test_multihead_matches_native_outputs_weights_and_parameter_budget(self):
        generator=torch.Generator().manual_seed(101)
        query=torch.randn(2,5,8,dtype=torch.float64,generator=generator)
        context=torch.randn(2,4,8,dtype=query.dtype,generator=generator)
        allow=allowed_keys(torch.tensor([4,2]),5,4)
        for heads in [1,2,4]:
            model=MultiHead(8,heads,7);out,trace=model(query,context,allow)
            native,weights=native_mha(model,query,context,allow)
            torch.testing.assert_close(out,native,rtol=1e-12,atol=1e-12)
            torch.testing.assert_close(trace['weights'],weights,rtol=1e-12,atol=1e-12)
            self.assertEqual(sum(p.numel() for p in model.parameters()),288)
            self.assertEqual(trace['query'].shape,(2,heads,5,8//heads))
        with self.assertRaises(ValueError):MultiHead(8,3,7)

    def test_attention_input_gradients_match_native_sdpa(self):
        generator=torch.Generator().manual_seed(901)
        originals=[torch.randn(*shape,dtype=torch.float64,generator=generator,requires_grad=True) for shape in [(2,2,3,4),(2,2,4,4),(2,2,4,4)]]
        copies=[x.detach().clone().requires_grad_(True) for x in originals]
        allow=allowed_keys(torch.tensor([4,2]),3,4)
        result,_,_=scaled_attention(*originals,allow)
        native=F.scaled_dot_product_attention(*copies,attn_mask=allow,dropout_p=0)
        direction=torch.randn(result.shape,dtype=result.dtype,generator=generator)
        actual=torch.autograd.grad((result*direction).sum(),originals)
        expected=torch.autograd.grad((native*direction).sum(),copies)
        for a,b in zip(actual,expected):torch.testing.assert_close(a,b,rtol=1e-10,atol=1e-12)

    def test_padding_masks_keys_not_queries(self):
        x=torch.randn(2,5,8,dtype=torch.float64,generator=torch.Generator().manual_seed(77))
        model=MultiHead(8,2,7);allow=allowed_keys(torch.tensor([5,3]),5,5)
        out,trace=model(x,x,allow)
        self.assertGreater(float(out[1,4].detach().abs().max()),1e-8)
        self.assertTrue(bool((trace['weights'][1,:,:,3:]==0).all()))
        changed=x.clone();changed[1,3:]+=100
        other,_=model(changed,changed,allow)
        torch.testing.assert_close(other[1,:3],out[1,:3],rtol=1e-12,atol=1e-12)

    def test_positions_and_permutation_equivariance(self):
        x=torch.randn(1,4,8,dtype=torch.float64,generator=torch.Generator().manual_seed(42))
        model=MultiHead(8,2,7);allow=allowed_keys(torch.tensor([4]),4,4);perm=torch.tensor([2,0,3,1])
        base,_=model(x,x,allow);reordered,_=model(x[:,perm],x[:,perm],allow)
        torch.testing.assert_close(reordered,base[:,perm],rtol=1e-12,atol=1e-12)
        pos=positional_encoding(4,8)
        self.assertTrue(torch.equal(pos[0,::2],torch.zeros(4,dtype=x.dtype)))
        self.assertTrue(torch.equal(pos[0,1::2],torch.ones(4,dtype=x.dtype)))
        fixed,_=model(x+pos,x+pos,allow);changed,_=model(x[:,perm]+pos,x[:,perm]+pos,allow)
        self.assertGreater(float((changed-fixed[:,perm]).detach().abs().max()),1e-5)

if __name__=='__main__':unittest.main()
