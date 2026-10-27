import copy
import math
import torch
from torch import nn
from torch.nn import functional as F


class Encoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.first = nn.Linear(8, 16)
        self.last = nn.Linear(16, 8)

    def forward(self, features):
        return self.last(torch.tanh(self.first(features)))


class Autoencoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.encoder = Encoder()
        self.decoder = nn.Linear(8, 8)

    def forward(self, features):
        return self.decoder(self.encoder(features))


class LoRALinear(nn.Module):
    def __init__(self, base, rank=2, alpha=2):
        super().__init__()
        if rank < 1:
            raise ValueError('rank must be positive')
        self.base = copy.deepcopy(base).requires_grad_(False)
        self.a = nn.Parameter(torch.empty(rank, base.in_features))
        self.b = nn.Parameter(torch.zeros(base.out_features, rank))
        nn.init.kaiming_uniform_(self.a, a=math.sqrt(5))
        self.scale = alpha / rank

    def forward(self, features):
        update = F.linear(F.linear(features, self.a), self.b)
        return self.base(features) + self.scale * update

    def merged(self):
        result = copy.deepcopy(self.base)
        with torch.no_grad():
            result.weight.add_(self.scale * (self.b @ self.a))
        return result


class Adapter(nn.Module):
    def __init__(self, width=8, bottleneck=2):
        super().__init__()
        self.down = nn.Linear(width, bottleneck)
        self.up = nn.Linear(bottleneck, width)
        nn.init.zeros_(self.up.weight)
        nn.init.zeros_(self.up.bias)

    def forward(self, hidden):
        return hidden + self.up(F.relu(self.down(hidden)))


class Classifier(nn.Module):
    def __init__(self, encoder, adapter=None):
        super().__init__()
        self.encoder = encoder
        self.adapter = adapter if adapter is not None else nn.Identity()
        self.head = nn.Linear(8, 2)

    def representation(self, features):
        return self.adapter(self.encoder(features))

    def forward(self, features):
        return self.head(self.representation(features))


def make_classifier(pretrained, mode, seed):
    # Every MLP mode starts with the same task head; no inherited class semantics.
    torch.manual_seed(seed + 500)
    head = nn.Linear(8, 2)
    if mode == 'linear':
        return head
    torch.manual_seed(seed + 600)
    encoder = Encoder() if mode == 'scratch' else copy.deepcopy(pretrained.encoder)
    encoder.requires_grad_(mode in ['scratch', 'full'])
    if mode == 'lora':
        encoder.last = LoRALinear(encoder.last)
    adapter = Adapter() if mode == 'adapter' else None
    model = Classifier(encoder, adapter)
    model.head = head
    return model


def parameter_counts(model):
    return dict(total=sum(p.numel() for p in model.parameters()),
        trainable=sum(p.numel() for p in model.parameters() if p.requires_grad))
