import unittest
import torch
from torch import nn
from cells import cell_step, trace_cell
from probes import arithmetic_probes

class CellTests(unittest.TestCase):
    def test_all_manual_cells_match_native_each_step(self):
        torch.manual_seed(9)
        x=torch.tensor([[.2,-.1],[.5,.3],[-.4,.7]],dtype=torch.float64)
        for kind,klass in [('rnn',nn.RNNCell),('lstm',nn.LSTMCell),('gru',nn.GRUCell)]:
            cell=klass(2,2).double();h=torch.tensor([.3,-.2],dtype=x.dtype);c=torch.tensor([.1,.4],dtype=x.dtype)
            state=(h,c) if kind=='lstm' else h
            rows=trace_cell(kind,cell,x,h,c)
            for token,row in zip(x,rows):
                state=cell(token,state)
                torch.testing.assert_close(torch.tensor(row['hidden']),state[0].float() if kind=='lstm' else state.float(),rtol=1e-6,atol=1e-7)
                if kind=='lstm':torch.testing.assert_close(torch.tensor(row['cell']),state[1].float(),rtol=1e-6,atol=1e-7)
                for name in ['input','forget','output','reset','update']:
                    if name in row:self.assertTrue(all(0<v<1 for v in row[name]))

    def test_gru_reset_placement_is_not_interchangeable(self):
        p=arithmetic_probes()['gruConvention']
        torch.testing.assert_close(torch.tensor(p['manual']),torch.tensor(p['torch']))
        self.assertGreater(p['wrongMaxError'],1e-4)

    def test_controlled_gradient_paths_match_powers(self):
        p=arithmetic_probes()['gradientControls']
        for row in p:
            self.assertAlmostEqual(row['rnnHalf'],.5**row['length'],delta=max(1e-40,.5**row['length']*1e-10))
            self.assertAlmostEqual(row['rnnLarge'],1.2**row['length'],delta=1.2**row['length']*1e-10)
            self.assertAlmostEqual(row['fixedForget'],.99**row['length'],places=12)

if __name__=='__main__':unittest.main()
