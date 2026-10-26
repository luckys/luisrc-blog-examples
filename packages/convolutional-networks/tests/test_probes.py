import unittest
import numpy as np
import torch
from torch.nn import functional as F
from geometry import correlate, contributions, output_size, receptive_field
from probes import arithmetic_probes

class GeometryTests(unittest.TestCase):
    def test_every_output_matches_torch_with_dilation_stride_padding(self):
        x=np.arange(1,26,dtype=np.float64).reshape(5,5)
        k=np.array([[1.,0.],[-1.,2.]])
        for stride in [1,2]:
            for padding in [0,1]:
                for dilation in [1,2]:
                    actual=correlate(x,k,stride,padding,dilation)
                    expected=F.conv2d(torch.tensor(x)[None,None],torch.tensor(k)[None,None],stride=stride,padding=padding,dilation=dilation)[0,0].numpy()
                    np.testing.assert_array_equal(actual,expected)
                    self.assertEqual(actual.shape,(output_size(5,2,stride,padding,dilation),)*2)
                    for row in range(len(actual)):
                        for col in range(len(actual)):
                            terms=contributions(x,k,row,col,stride,padding,dilation)
                            self.assertEqual(sum(t['product'] for t in terms),actual[row,col])
        self.assertEqual(correlate(x,k)[0,0],9)
        self.assertNotEqual(correlate(x,np.flip(k))[0,0],9)
        with self.assertRaises(ValueError): output_size(1,3)

    def test_receptive_field_centers_and_gradient_support(self):
        rows=receptive_field([(3,1,1),(2,2,0),(3,1,1)])
        self.assertEqual(rows[-1],{'size':8,'jump':2,'start':1.})
        x=torch.ones(1,1,24,24,dtype=torch.float64,requires_grad=True)
        y=F.conv2d(F.avg_pool2d(F.conv2d(x,torch.ones(1,1,3,3,dtype=x.dtype),padding=1),2),torch.ones(1,1,3,3,dtype=x.dtype),padding=1)
        for row,col,lo,hi in [(6,6,9,16),(0,0,0,4)]:
            grad=torch.autograd.grad(y[0,0,row,col],x,retain_graph=True)[0][0,0]
            expected=torch.zeros_like(grad,dtype=torch.bool);expected[lo:hi+1,lo:hi+1]=True
            self.assertTrue(torch.equal(grad!=0,expected))

    def test_pooling_values_gradients_and_padding_semantics(self):
        p=arithmetic_probes()
        self.assertEqual(p['pool']['max'],[[6.,5.],[7.,8.]])
        self.assertEqual(p['pool']['average'],[[3.5,2.],[2.5,4.25]])
        self.assertEqual(np.count_nonzero(p['pool']['maxGradient']),4)
        np.testing.assert_array_equal(p['pool']['averageGradient'],np.full((4,4),.25))
        np.testing.assert_array_equal(p['pool']['negativePadding'],np.full((2,2),-2.))
        self.assertEqual(p['pool']['averageWithPadding'],[[1.,1.],[1.,1.]])
        self.assertEqual(p['pool']['averageWithoutPadding'],[[4.,4.],[4.,4.]])
        self.assertEqual(p['pool']['shifted'][0],p['pool']['shifted'][1])
        self.assertNotEqual(p['pool']['shifted'][0],p['pool']['shifted'][2])

    def test_multichannel_matches_sum_of_input_channels(self):
        p=arithmetic_probes()['channels']
        np.testing.assert_allclose(p['manual'],p['torch'],rtol=0,atol=0)
        self.assertEqual(p['parameters'],27)

if __name__=='__main__': unittest.main()
