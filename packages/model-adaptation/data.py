import hashlib
import torch


def fingerprint(value):
    return hashlib.sha256(value.numpy().tobytes()).hexdigest()


def sample(count, seed, target=False):
    generator = torch.Generator().manual_seed(seed)
    latent = torch.randn(count, 2, generator=generator)
    nuisance = torch.randn(count, 6, generator=generator) * 0.4
    # Same observed coordinates in both domains; target shifts nuisance features.
    features = torch.cat((latent, nuisance + (0.6 if target else 0.0)), dim=1)
    labels = (latent[:, 0] + 0.5 * latent[:, 1] > 0).long()
    return features, labels


def datasets(protocol):
    result = {}
    for domain, base in [('source', 1000), ('target', 2000)]:
        result[domain] = {}
        for offset, split in enumerate(['train', 'validation', 'test']):
            result[domain][split] = sample(protocol[domain][split], base + offset, domain == 'target')
    return result


def audit(data):
    report, seen = {}, set()
    for domain, splits in data.items():
        report[domain] = {}
        for split, (features, labels) in splits.items():
            ids = [fingerprint(row) for row in features]
            if len(set(ids)) != len(ids) or seen.intersection(ids):
                raise ValueError('overlap between observed rows')
            seen.update(ids)
            report[domain][split] = dict(count=len(ids), featuresHash=fingerprint(features),
                labelsHash=fingerprint(labels), ids=ids, classCounts=torch.bincount(labels, minlength=2).tolist())
    return report
