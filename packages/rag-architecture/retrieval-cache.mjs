import {performance} from 'node:perf_hooks';

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${name}`);
}

export function retrievalCacheKey({principal, state, configuration, query}) {
  if (!principal || typeof principal.role !== 'string' || !principal.role ||
      typeof principal.tenant !== 'string' || !principal.tenant ||
      ![0, 1].includes(principal.maxLevel)) throw new Error('Trusted principal required');
  positiveInteger(principal.authorizationRevision, 'authorizationRevision');
  positiveInteger(state?.accessRevision, 'accessRevision');
  if (typeof state.indexRevision !== 'string' || !state.indexRevision) throw new Error('Index revision required');
  if (configuration.analyzer !== 'simple' || configuration.rankNormalization !== 0 ||
      !Number.isInteger(configuration.k) || configuration.k < 1 || configuration.k > 3) {
    throw new Error('Unsupported search configuration');
  }
  if (typeof query !== 'string') throw new Error('Query must be a string');
  return JSON.stringify([
    'retrieval-cache-v1', principal.role, principal.tenant, principal.maxLevel,
    principal.authorizationRevision, state.accessRevision, state.indexRevision,
    configuration.analyzer, configuration.rankNormalization, configuration.k, query,
  ]);
}

export class RetrievalCache {
  #entries = new Map();
  #ttlMs;
  #maxEntries;
  #clock;

  constructor({ttlMs, maxEntries = 128, clock = () => performance.now()}) {
    positiveInteger(ttlMs, 'ttlMs');
    positiveInteger(maxEntries, 'maxEntries');
    this.#ttlMs = ttlMs;
    this.#maxEntries = maxEntries;
    this.#clock = clock;
  }

  async getOrLoad(key, load, observeLookup = () => {}) {
    const checkedAtMs = this.#clock();
    const entry = this.#entries.get(key);
    const status = !entry ? 'miss' : checkedAtMs >= entry.expiresAtMs ? 'expired' : 'hit';
    const lookup = {status, checkedAtMs, previousExpiresAtMs: entry?.expiresAtMs ?? null};
    observeLookup(lookup);
    if (status === 'hit') return {lookup, rows: structuredClone(entry.rows)};
    this.#entries.delete(key);
    const rows = await load();
    if (!Array.isArray(rows)) throw new Error('Retrieval rows must be an array');
    const savedAtMs = this.#clock();
    while (this.#entries.size >= this.#maxEntries) {
      this.#entries.delete(this.#entries.keys().next().value);
    }
    this.#entries.set(key, {rows: structuredClone(rows), expiresAtMs: savedAtMs + this.#ttlMs});
    return {lookup, rows: structuredClone(rows), savedAtMs, expiresAtMs: savedAtMs + this.#ttlMs};
  }
}
