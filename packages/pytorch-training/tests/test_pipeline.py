import unittest
import tempfile
from pathlib import Path
import numpy as np
import torch
from torch.utils.data import DataLoader
from pipeline import PointDataset, XorMLP, make_data, make_session, train_until, evaluate, model_vector, checked_loss
from checkpoints import save_inference, load_inference, save_resume, load_resume

class PipelineTests(unittest.TestCase):
    def setUp(self):
        import json
        self.config=json.loads(Path('protocol.json').read_text())
        torch.set_num_threads(1)

    def test_shapes_dtype_and_broadcasting_rejection(self):
        x=torch.ones(4,2,dtype=torch.float64);y=torch.tensor([0.,1.,1.,0.],dtype=torch.float64)
        z=XorMLP(4)(x)
        self.assertEqual(tuple(z.shape),(4,1))
        self.assertEqual(tuple((z-y).shape),(4,4))
        with self.assertRaises(ValueError): checked_loss(z,y)
        with self.assertRaises(ValueError): PointDataset(np.zeros((4,2)),np.zeros(4))
        with self.assertRaises(RuntimeError): XorMLP(4)(torch.ones(4,2))

    def test_dataset_owns_data_and_batch_keeps_tail(self):
        x=np.zeros((13,2));y=np.zeros((13,1));d=PointDataset(x,y);x[0,0]=9
        self.assertEqual(d[0][0][0].item(),0)
        g=torch.Generator().manual_seed(420)
        loader=DataLoader(d,batch_size=5,shuffle=True,generator=g,drop_last=False,num_workers=0)
        sizes=[len(a) for a,_,_ in loader]
        self.assertEqual(sizes,[5,5,3])

    def test_module_registration_and_reference_forward(self):
        from pipeline import initialize, forward
        session=make_session(self.config,7)
        self.assertEqual(sum(p.numel() for p in session.model.parameters()),17)
        self.assertEqual(list(session.model.state_dict()),['hidden.weight','hidden.bias','output.weight','output.bias'])
        x,_=make_data(self.config)[0]
        expected=forward(x,initialize(4,7))[0]
        np.testing.assert_allclose(session.model(torch.tensor(x)).detach().numpy(),expected,rtol=1e-12,atol=1e-14)

    def test_training_changes_parameters_and_counts_updates(self):
        s=make_session(self.config,7);before=model_vector(s.model)
        train_until(s,1)
        self.assertEqual((s.epoch,s.updates),(1,9))
        self.assertEqual(s.history[-1]['examplesSeen'],256)
        self.assertFalse(np.array_equal(before,model_vector(s.model)))
        self.assertEqual(len(s.history[-1]['order']),256)
        self.assertEqual(sorted(s.history[-1]['order']),list(range(256)))

    def test_evaluation_is_weighted_and_restores_mode_without_weight_changes(self):
        s=make_session(self.config,7);s.model.train();before=model_vector(s.model)
        contexts=[]
        handle=s.model.register_forward_pre_hook(lambda module,args:contexts.append((module.training,torch.is_grad_enabled())))
        first=evaluate(s.model,s.validation);second=evaluate(s.model,s.validation)
        handle.remove()
        self.assertTrue(contexts)
        self.assertTrue(all(not training and not grad for training,grad in contexts))
        self.assertEqual(first,second);self.assertTrue(s.model.training)
        np.testing.assert_array_equal(before,model_vector(s.model))
        x,y=make_data(self.config)[1]
        expected=float(checked_loss(s.model(torch.tensor(x)),torch.tensor(y)).detach())
        self.assertAlmostEqual(first['loss'],expected,places=14)

    def test_inference_file_reloads_predictions_and_rejects_wrong_schema(self):
        s=make_session(self.config,7);train_until(s,2)
        x=torch.tensor(make_data(self.config)[1][0])
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'inference.pt';save_inference(path,s.model,self.config)
            other=load_inference(path,self.config)
            torch.testing.assert_close(s.model(x),other(x),rtol=0,atol=0)
            self.assertFalse(other.training)
            with self.assertRaises(ValueError): load_resume(path,make_session(self.config,7))

    def test_resume_file_preserves_trajectory_and_rejects_incomplete_state(self):
        full=make_session(self.config,7);train_until(full,4)
        part=make_session(self.config,7);train_until(part,2)
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'resume.pt';save_resume(path,part)
            resumed=make_session(self.config,7);load_resume(path,resumed);train_until(resumed,4)
            np.testing.assert_array_equal(model_vector(full.model),model_vector(resumed.model))
            self.assertEqual(full.history,resumed.history)
            broken=make_session(self.config,7);load_resume(path,broken,variant='weights_only');train_until(broken,4)
            self.assertGreater(np.max(np.abs(model_vector(full.model)-model_vector(broken.model))),1e-5)

if __name__=='__main__': unittest.main()
