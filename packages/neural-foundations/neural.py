"""Small, float64, full-batch network for an explicitly bounded XOR experiment."""
from dataclasses import dataclass
import numpy as np
from numpy.typing import NDArray

Array = NDArray[np.float64]

@dataclass
class Layer:
    weight: Array
    bias: Array


def dense(x: Array, layer: Layer) -> Array:
    if (x.ndim != 2 or layer.weight.ndim != 2
            or x.shape[1] != layer.weight.shape[0]
            or layer.bias.shape != (layer.weight.shape[1],)):
        raise ValueError("dense requires (batch,in) @ (in,out) + (out,)")
    if not all(np.all(np.isfinite(a)) for a in (x, layer.weight, layer.bias)):
        raise ValueError("finite arrays required")
    return x @ layer.weight + layer.bias


def compose_affine(first: Layer, second: Layer) -> Layer:
    if first.weight.shape[1] != second.weight.shape[0]:
        raise ValueError("incompatible layers")
    return Layer(first.weight @ second.weight,
                 first.bias @ second.weight + second.bias)


def sigmoid(logits: Array) -> Array:
    exponential = np.exp(-np.abs(logits))
    return np.where(logits >= 0, 1 / (1 + exponential),
                    exponential / (1 + exponential))


def binary_loss(logits: Array, targets: Array) -> float:
    if (logits.ndim != 2 or logits.shape[1] != 1
            or targets.shape != logits.shape or not len(logits)
            or not np.all(np.isfinite(logits))
            or not np.all((targets == 0) | (targets == 1))):
        raise ValueError("finite (batch,1) logits and binary targets required")
    return float(np.mean(np.logaddexp(0, logits) - targets * logits))


def initialize(width: int, seed: int, zero: bool = False) -> list[Layer]:
    if not isinstance(width, int) or width < 0 or width > 8:
        raise ValueError("width must be 0 (linear) or 1..8")
    rng = np.random.default_rng(seed)
    dimensions = [2, width, 1] if width else [2, 1]
    layers = []
    for inputs, outputs in zip(dimensions[:-1], dimensions[1:]):
        bound = np.sqrt(6 / (inputs + outputs))
        weight = rng.uniform(-bound, bound, (inputs, outputs))
        # A zero linear baseline is intentional; hidden zeros are a negative control.
        if zero or width == 0:
            weight = np.zeros_like(weight)
        layers.append(Layer(weight, np.zeros(outputs)))
    return layers


def forward(x: Array, layers: list[Layer]) -> tuple[Array, Array]:
    if len(layers) not in (1, 2):
        raise ValueError("this example supports one or two dense layers")
    hidden = np.tanh(dense(x, layers[0])) if len(layers) == 2 else x
    logits = dense(hidden, layers[-1])
    return logits, hidden


def gradients(x: Array, y: Array, layers: list[Layer]) -> list[Layer]:
    logits, hidden = forward(x, layers)
    binary_loss(logits, y)
    dz = (sigmoid(logits) - y) / len(x)
    output = Layer(hidden.T @ dz, dz.sum(axis=0))
    if len(layers) == 1:
        return [output]
    dz_hidden = (dz @ layers[-1].weight.T) * (1 - hidden ** 2)
    return [Layer(x.T @ dz_hidden, dz_hidden.sum(axis=0)), output]


def metrics(x: Array, y: Array, layers: list[Layer]) -> dict[str, float]:
    logits, _ = forward(x, layers)
    return {"loss": binary_loss(logits, y),
            "accuracy": float(np.mean((logits >= 0) == y))}


def serialize(layers: list[Layer]) -> list[dict]:
    return [{"weight": layer.weight.tolist(), "bias": layer.bias.tolist()}
            for layer in layers]


def deserialize(layers: list[dict]) -> list[Layer]:
    return [Layer(np.asarray(layer["weight"], dtype=np.float64),
                  np.asarray(layer["bias"], dtype=np.float64)) for layer in layers]


def train(x: Array, y: Array, vx: Array, vy: Array, layers: list[Layer],
          epochs: int, learning_rate: float, record_every: int) -> tuple[list[Layer], list[dict]]:
    if (not isinstance(epochs, int) or not 1 <= epochs <= 5000
            or not isinstance(record_every, int) or record_every < 1
            or not np.isfinite(learning_rate) or not 0 < learning_rate <= 1):
        raise ValueError("training parameters outside the bounded example")
    history = []
    for epoch in range(epochs + 1):
        if epoch % record_every == 0 or epoch == epochs:
            training = metrics(x, y, layers)
            validation = metrics(vx, vy, layers)
            history.append({"epoch": epoch, "trainLoss": training["loss"],
                            "validationLoss": validation["loss"],
                            "trainAccuracy": training["accuracy"],
                            "validationAccuracy": validation["accuracy"],
                            "layers": serialize(layers)})
        if epoch == epochs:
            break
        derivatives = gradients(x, y, layers)
        layers = [Layer(layer.weight - learning_rate * grad.weight,
                        layer.bias - learning_rate * grad.bias)
                  for layer, grad in zip(layers, derivatives)]
    return layers, history


def xor_features(bits: Array) -> Array:
    if bits.ndim != 2 or bits.shape[1] != 2 or not np.all((bits == 0) | (bits == 1)):
        raise ValueError("this exact construction is for two binary inputs")
    total = bits.sum(axis=1)
    return np.column_stack([np.maximum(0, total), np.maximum(0, total - 1)])


def make_split(per_quadrant: int, seed: int, half_width: float) -> tuple[Array, Array]:
    if (not isinstance(per_quadrant, int) or not 1 <= per_quadrant <= 256
            or not np.isfinite(half_width) or not 0 < half_width < 1):
        raise ValueError("bounded four-cluster dataset required")
    rng = np.random.default_rng(seed)
    xs, ys = [], []
    for centre in [(-1, -1), (-1, 1), (1, -1), (1, 1)]:
        xs.append(np.asarray(centre) + rng.uniform(-half_width, half_width, (per_quadrant, 2)))
        ys.append(np.full((per_quadrant, 1), int(centre[0] * centre[1] < 0), dtype=np.float64))
    order = rng.permutation(4 * per_quadrant)
    return np.concatenate(xs)[order], np.concatenate(ys)[order]
