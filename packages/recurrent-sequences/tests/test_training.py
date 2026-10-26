import unittest
import torch
from torch import nn
from data import memory_data, continuation_data, decoder_inputs, PAD, BOS, EOS
from networks import MemoryModel, ContinuationModel, embedding, last_hidden
from training import train_memory, memory_metrics, memory_trace, train_continuation, continuation_metrics, rollout

class SequenceTests(unittest.TestCase):
    def test_memory_task_lengths_labels_and_independent_data(self):
        a=memory_data(32,101);b=memory_data(32,102)
        self.assertTrue(torch.equal(a[0],memory_data(32,101)[0]));self.assertFalse(torch.equal(a[0],b[0]))
        tokens,lengths,labels=a
        self.assertEqual(torch.bincount(labels).tolist(),[16,16])
        for x,n,y in zip(tokens,lengths,labels):
            self.assertEqual(x[0],1+y);self.assertEqual(x[n-1],7)
            self.assertTrue(bool(((x[1:n-1]>=3)&(x[1:n-1]<=6)).all()))
            self.assertTrue(bool((x[n:]==PAD).all()))
        self.assertEqual(tokens.dtype,torch.int64)

    def test_embedding_lookup_onehot_and_padding_gradient(self):
        e=embedding(7);ids=torch.tensor([[1,2,1,0]])
        expected=nn.functional.one_hot(ids,10).float()@e.weight
        torch.testing.assert_close(e(ids),expected)
        e(ids).sum().backward()
        self.assertTrue(torch.equal(e.weight.grad[0],torch.zeros(8)))
        torch.testing.assert_close(e.weight.grad[1],torch.full((8,),2.))
        self.assertTrue(torch.equal(e.weight[0],torch.zeros(8)))

    def test_packed_batch_restores_order_and_ignores_extra_padding(self):
        tokens=torch.tensor([[1,3,7,0,0],[2,4,5,6,7],[1,7,0,0,0]])
        lengths=torch.tensor([3,5,2])
        for kind in ['rnn','lstm','gru']:
            model=MemoryModel(kind,7).eval();batched=model(tokens,lengths)
            for i,n in enumerate(lengths):
                individual=model(tokens[i:i+1,:n],torch.tensor([n]))
                torch.testing.assert_close(batched[i],individual[0],rtol=1e-5,atol=1e-6)
            padded=nn.functional.pad(tokens,(0,4))
            torch.testing.assert_close(model(padded,lengths),batched)
            with self.assertRaises(ValueError):model(tokens,torch.tensor([0,5,2]))

    def test_padding_embedding_zero_does_not_freeze_recurrent_state(self):
        cell=nn.RNNCell(1,1).double()
        with torch.no_grad():
            for p in cell.parameters():p.fill_(.5)
        h=torch.tensor([[.2]],dtype=torch.float64);z=torch.zeros_like(h)
        after=cell(z,h)
        self.assertNotEqual(float(after.detach()),float(h))

    def test_shapes_parameters_and_actual_update(self):
        data=memory_data(32,101);val=memory_data(16,102)
        counts={'rnn':530,'lstm':1778,'gru':1362}
        for kind in counts:
            model=MemoryModel(kind,7)
            self.assertEqual(sum(p.numel() for p in model.parameters()),counts[kind])
            self.assertEqual(model(data[0],data[1]).shape,(32,2))
            before=model.embed.weight.detach().clone()
            result=train_memory(model,data,val,7,epochs=1)
            self.assertEqual(result['updates'],1);self.assertFalse(torch.equal(before,model.embed.weight))
            self.assertTrue(torch.equal(model.embed.weight[0],torch.zeros(8)))

    def test_trace_steps_end_at_the_classifier_state_and_gradients_are_real(self):
        data=memory_data(2,99,fixed_length=12)
        for kind in ['rnn','lstm','gru']:
            model=MemoryModel(kind,7).eval();r=memory_trace(model,data,0)
            self.assertEqual(len(r['hidden']),12);self.assertEqual(len(r['gradientNorm']),12)
            self.assertEqual(len(r['embedded'][0]),8)
            self.assertEqual(len(r['hidden'][0]),16)
            torch.testing.assert_close(torch.tensor(r['logits'][-1]),model(data[0][:1],data[1][:1])[0].detach(),rtol=1e-5,atol=1e-6)
            self.assertTrue(all(v>=0 for v in r['gradientNorm']))
            torch.testing.assert_close(torch.tensor([step['hidden'] for step in r['cells']]),torch.tensor(r['hidden']),rtol=1e-5,atol=1e-6)

    def test_continuation_validation_repeats_all_eight_possible_patterns(self):
        a={tuple(row) for row in continuation_data(128,501).tolist()}
        b={tuple(row) for row in continuation_data(64,502).tolist()}
        self.assertEqual(len(a),8);self.assertEqual(a,b)

    def test_decoder_shift_padding_mask_and_causality(self):
        targets=torch.tensor([[1,2,3,EOS],[4,1,EOS,PAD]])
        inputs=decoder_inputs(targets)
        self.assertTrue(torch.equal(inputs[:,0],torch.tensor([BOS,BOS])))
        self.assertTrue(torch.equal(inputs[:,1:],targets[:,:-1]))
        model=ContinuationModel(7).eval();a=model(inputs)
        modified=inputs.clone();modified[:,3]=6
        torch.testing.assert_close(model(modified)[:,:3],a[:,:3])
        loss=nn.functional.cross_entropy(a.flatten(0,1),targets.flatten(),ignore_index=PAD,reduction='sum')/7
        manual=-a.log_softmax(-1).gather(-1,targets[:,:,None]).squeeze(-1)[targets!=PAD].mean()
        torch.testing.assert_close(loss,manual)

    def test_teacher_forcing_and_rollout_are_separate_execution_paths(self):
        model=ContinuationModel(7);data=continuation_data(8,501)
        self.assertEqual(sum(p.numel() for p in model.parameters()),1498)
        r=train_continuation(model,data,continuation_data(8,502),7,epochs=1)
        self.assertEqual(r['updates'],1)
        prefix=data[0,:2].tolist();clean=rollout(model,prefix,7)
        injected=rollout(model,prefix,7,injected=4)
        self.assertLessEqual(len(clean),7);self.assertEqual(injected[0],4)
        # The rollout function has no target argument: later inputs are its own tokens.
        result=continuation_metrics(model,data,0)
        self.assertIn('teacherContinuationAccuracy',result);self.assertIn('rolloutExactMatch',result)

if __name__=='__main__':unittest.main()
