import unittest
import numpy as np
from numpy.testing import assert_allclose
from neural import (Layer, dense, compose_affine, sigmoid, binary_loss, initialize,
                    forward, gradients, train, xor_features, make_split)

class NeuralTests(unittest.TestCase):
    def test_dense_and_affine_collapse(self):
        x = np.array([[1., 2.], [-1., 3.]])
        first = Layer(np.array([[1., 2., 3.], [4., 5., 6.]]), np.array([.1, .2, .3]))
        second = Layer(np.array([[1.], [-2.], [.5]]), np.array([.4]))
        assert_allclose(dense(dense(x, first), second), dense(x, compose_affine(first, second)))
        with self.assertRaises(ValueError): dense(x, Layer(np.ones((3, 2)), np.zeros(2)))
        with self.assertRaises(ValueError): dense(x, Layer(np.ones((2, 2)), np.zeros((2, 1))))
        with self.assertRaises(ValueError): dense(np.array([[np.nan, 1.]]), first)

    def test_stable_probabilities_and_loss(self):
        z = np.array([[-1000.], [0.], [1000.]])
        with np.errstate(over='raise', invalid='raise'):
            assert_allclose(sigmoid(z), [[0.], [.5], [1.]])
            self.assertTrue(np.isfinite(binary_loss(z, np.array([[0.], [1.], [1.]]))))
        with self.assertRaises(ValueError): binary_loss(z, np.array([0., 1., 1.]))

    def test_relu_features_represent_binary_xor(self):
        x = np.array([[0., 0.], [0., 1.], [1., 0.], [1., 1.]])
        h = xor_features(x)
        assert_allclose(h @ np.array([1., -2.]), [0., 1., 1., 0.])

    def test_gradients_match_finite_differences_for_all_17_parameters(self):
        x, y = make_split(4, 101, .45)
        layers = initialize(4, 7)
        analytical = gradients(x, y, layers)
        for layer, grad in zip(layers, analytical):
            for parameter, derivative in [(layer.weight, grad.weight), (layer.bias, grad.bias)]:
                for index in np.ndindex(parameter.shape):
                    original = parameter[index]; epsilon = 1e-5
                    parameter[index] = original + epsilon
                    high = binary_loss(forward(x, layers)[0], y)
                    parameter[index] = original - epsilon
                    low = binary_loss(forward(x, layers)[0], y)
                    parameter[index] = original
                    assert_allclose(derivative[index], (high-low)/(2*epsilon), rtol=1e-5, atol=1e-8)

    def test_splits_balanced_reproducible_and_disjoint(self):
        a, y = make_split(64, 101, .45); b, _ = make_split(32, 102, .45)
        self.assertEqual(y.shape, (256, 1)); self.assertEqual(y.sum(), 128)
        assert_allclose(a, make_split(64, 101, .45)[0])
        self.assertFalse(set(map(tuple, a)) & set(map(tuple, b)))
        self.assertTrue(np.all(np.abs(a) >= .55))

    def test_mlp_learns_while_zero_initialization_stays_symmetric(self):
        x, y = make_split(64, 101, .45); vx, vy = make_split(32, 102, .45)
        params, history = train(x, y, vx, vy, initialize(4, 7), 3000, .1, 150)
        self.assertEqual(len(history), 21)
        self.assertGreater(np.mean((forward(vx, params)[0] >= 0) == vy), .95)
        self.assertLess(history[-1]['trainLoss'], history[0]['trainLoss'])
        _, failed = train(x, y, vx, vy, initialize(4, 7, zero=True), 3000, .1, 150)
        assert_allclose([h['trainLoss'] for h in failed], np.log(2))
        self.assertEqual(failed[-1]['validationAccuracy'], .5)

if __name__ == '__main__': unittest.main()
