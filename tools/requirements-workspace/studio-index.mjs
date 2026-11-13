// Local lexical retrieval for the item store (ADR-0055). Finding the few
// existing items that resemble a candidate is what keeps every model request
// the same size however large the project grows. No text leaves the PC here.

const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase();

/**
 * Character bigrams inside each run of Hangul or alphanumerics. Korean attaches
 * particles to words, so whole-word tokens miss "회원을" vs "회원의"; bigrams do not.
 */
export function tokens(value) {
  const result = [];
  for (const run of normalize(value).match(/[가-힣]+|[a-z0-9]+/g) ?? []) {
    if (/^[a-z0-9]/.test(run)) { if (run.length > 1) result.push(run); continue; }
    if (run.length === 1) { result.push(run); continue; }
    for (let index = 0; index < run.length - 1; index++) result.push(run.slice(index, index + 2));
  }
  return result;
}

function vector(parts) {
  // parts: [text, weight] pairs — a name counts more than its long description.
  const counts = new Map();
  for (const [value, weight] of parts) for (const token of tokens(value)) counts.set(token, (counts.get(token) ?? 0) + weight);
  return counts;
}

/**
 * Builds an index over documents `{ id, parts: [[text, weight], …] }`.
 * `search(parts, limit, minimum)` returns `[{ id, score }]` by cosine
 * similarity of tf-idf vectors, best first, ties by id so results are stable.
 */
export function createIndex(documents) {
  const entries = documents.map(document => ({ id: document.id, counts: vector(document.parts) }));
  const frequency = new Map();
  for (const entry of entries) for (const token of entry.counts.keys()) frequency.set(token, (frequency.get(token) ?? 0) + 1);
  const idf = token => Math.log(1 + (entries.length + 1) / ((frequency.get(token) ?? 0) + 1));
  const weigh = counts => {
    const weights = new Map(); let square = 0;
    for (const [token, count] of counts) { const weight = (1 + Math.log(count)) * idf(token); weights.set(token, weight); square += weight * weight; }
    return { weights, norm: Math.sqrt(square) };
  };
  const weighted = entries.map(entry => ({ id: entry.id, ...weigh(entry.counts) }));
  return {
    size: entries.length,
    search(parts, limit = 6, minimum = 0.12) {
      const query = weigh(vector(parts));
      if (!query.norm) return [];
      const hits = [];
      for (const entry of weighted) {
        if (!entry.norm) continue;
        let dot = 0;
        for (const [token, weight] of query.weights) { const other = entry.weights.get(token); if (other) dot += weight * other; }
        const score = dot / (query.norm * entry.norm);
        if (score >= minimum) hits.push({ id: entry.id, score });
      }
      return hits.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1)).slice(0, limit);
    },
  };
}

/** Similarity of two texts on their own, without a corpus: term-frequency cosine, the same in both directions. */
export function similarity(left, right) {
  const a = vector(left), b = vector(right), weight = count => 1 + Math.log(count);
  let dot = 0, squareA = 0, squareB = 0;
  for (const [token, count] of a) { squareA += weight(count) ** 2; if (b.has(token)) dot += weight(count) * weight(b.get(token)); }
  for (const count of b.values()) squareB += weight(count) ** 2;
  return squareA && squareB ? dot / Math.sqrt(squareA * squareB) : 0;
}
