# Lexical search and subword laboratory

P106: eleven Spanish draft articles. Node >=24.19.0, no network, API keys,
downloaded models or package dependencies. Root installation uses pnpm.

```bash
pnpm install --frozen-lockfile
pnpm --filter @luisrc-examples/lexical-search test
pnpm --filter @luisrc-examples/lexical-search verify
```

`exercise` runs a new capture and replaces `comparison.json` and
`results/observations.json`; `render` derives four SVG figures from that capture.
`verify` verifies nine hashes, then recomputes all 120 rankings, contributions,
metrics, analysis and subword traces with absolute tolerance 1e-12. No performance
timing is claimed. Runtime Node/ICU/Unicode is archived in the report.

## Protocol and judgments

`protocol.json`, `corpus.json`, `queries.json` and `lexicon.json` were created
before the first scoring run. 20 original synthetic Spanish title+body documents,
equal field weight, stable IDs, 20 queries, all 400 pairs judged under a documented
closed-world convention: listed IDs relevant, all other corpus IDs nonrelevant.
Judgments are author-created educational labels, not independent user evidence.
Ten dev queries and ten test queries. Test Q20 has no relevant document.
No winner selected, tuning or post-result label edits.

Six fixed contrasts: BM25 literal, accent fold, limited plural reduction, lookup,
character trigrams, and TF-IDF cosine with fold. Corpus statistics come only from
documents. Same analyzer for documents and queries. No stopword removal. NFC and
Spanish lowercase; fold changes áéíóúü only, preserving ñ. Original text retained.

BM25 uses k1=1.2, b=.75, positive log(1+(N-df+.5)/(df+.5)), unique query terms,
OR candidates, positive scores, lexicographic ID tie break. The code is not a
Lucene implementation. TF-IDF: raw TF, log((N+1)/(df+1))+1, L2 cosine; unknown
query terms omitted from the vocabulary. Documents without any known query term
have zero score and are not returned.

The plural reducer is deliberately incomplete, NOT Snowball. The 13-entry lemma
lookup does not predict POS or disambiguate. Character n-grams use Unicode code
points inside each word, not all grapheme clusters or cross-word windows. Word
bigrams are demonstrated separately, not a seventh retrieval experiment.

## Observed results and limitations

Capture: 2026-10-27T18:40:34.660Z, Node v24.19.0, ICU78.3, Unicode17.0.
Nine answerable test queries: BM25 fold P@3=.296296, R@3=.833333, MRR@3=.888889.
Char3 P@3=.370370, R@3=1, MRR@3=.925926. These are macro averages; P always
divides by 3, RR is truncated at 3. Q20 excluded from these averages and reviewed
separately, with false positive matches. One negative query cannot estimate a
production false-positive rate or calibrate abstention.

Q19 typo: char3 retrieves D17 first; fold returns nothing. Q17: fold ranks D15
first, char3 ranks D06/D07/D15, a reciprocal-rank regression from 1 to 1/3.
Q12: fold misses D06 (R@3=.5), char3 retrieves D07/D06 (R@3=1). Q10 is recovered
by folding retención; anios was NOT corrected to año. Q18 keeps the incident D19
as a nonrelevant match behind preventive guide D18. No semantics/negation claim.

BPE is character-level on four weighted words, five learned ordered merges,
deterministic tie break and non-overlapping application. It is NOT byte-level.
Unseen characters are displayed as pieces for demonstration, NOT guaranteed
model token IDs. WordPiece only runs greedy inference on a fixed nine-item toy
vocabulary, with ## continuations and whole-word UNK. No WordPiece trainer,
language-model training or vocabulary quality comparison is claimed.

## Files and browser

- `analysis.mjs`: shared normalization and analyzers.
- `retrieval.mjs`: postings, BM25 decomposition, TF-IDF cosine.
- `evaluation.mjs`: top-k metrics and macro means.
- `subwords.mjs`: BPE training/application and WordPiece inference.
- `experiments.mjs`: six contrasts, raw rankings, analytical curves and probes.
- `tests/search.test.mjs`: independently derived numerical fixtures and edge cases.
- `results/observations.json`: full results, protocol and inputs with hashes.
- `explorer.html`/`explorer.mjs`: browser search over the same corpus, including
  custom unlabelled queries, token audit, metrics and subword traces.

Browser assets run the same retrieval sources. They make no remote inference
request. The blog receives an allowlisted static export, not the whole lab.
Complete sources and documentation remain in this monorepo.

From the root, with an Astro draft server already running on localhost:4322:

```bash
BLOG_ROOT=/path/to/luisrc-blog pnpm blog:tool render-lexical-search-diagrams
BLOG_ROOT=/path/to/luisrc-blog pnpm blog:sync
BLOG_ROOT=/path/to/luisrc-blog pnpm blog:tool check-lexical-search-browser
```
