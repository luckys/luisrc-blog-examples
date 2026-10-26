# Scaled dot-product: por qué dividir antes de softmax y cómo evitar overflow

Draft español. Qué controla la escala del producto escalar y qué no garantiza.

- [packages/attention-transformer/attention.py](../../../packages/attention-transformer/attention.py)
- [packages/attention-transformer/transformer.py](../../../packages/attention-transformer/transformer.py)
- [packages/attention-transformer/probes.py](../../../packages/attention-transformer/probes.py)
- [packages/attention-transformer/experiments.py](../../../packages/attention-transformer/experiments.py)
- [packages/attention-transformer/verify.py](../../../packages/attention-transformer/verify.py)
- [packages/attention-transformer/protocol.json](../../../packages/attention-transformer/protocol.json)
- [packages/attention-transformer/tests/test_attention.py](../../../packages/attention-transformer/tests/test_attention.py)
- [packages/attention-transformer/tests/test_transformer.py](../../../packages/attention-transformer/tests/test_transformer.py)
- [packages/attention-transformer/results/observations.json](../../../packages/attention-transformer/results/observations.json)
- [packages/attention-transformer/README.md](../../../packages/attention-transformer/README.md)

README: reproducción, controles y límites.
