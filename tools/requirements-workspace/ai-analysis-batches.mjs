const fail = code => { throw Object.assign(new Error(code), { code }); };
export const MAX_ANALYSIS_BATCHES = 128;
// Logical partitions stay stable so existing checkpoints remain reusable.
// A CLI call can cover several adjacent partitions without omitting any clause.
export function coalesceAnalysisBatches(batches, start, maxPartitions = 3) {
  const sources = []; let end = start, clauses = 0;
  for (let index = start; index < Math.min(batches.length, start + maxPartitions); index++) {
    const next = structuredClone(sources), map = new Map(next.map(source => [source.id, source]));
    for (const source of batches[index]) {
      if (map.has(source.id)) map.get(source.id).clauses.push(...source.clauses);
      else { const copy = structuredClone(source); next.push(copy); map.set(source.id, copy); }
    }
    const count = next.reduce((sum, source) => sum + source.clauses.length, 0);
    if (index > start && (count > 96 || Buffer.byteLength(JSON.stringify(next)) > 96 * 1024)) break;
    sources.splice(0, sources.length, ...next); clauses = count; end = index;
  }
  return { sources, end, clauses };
}
// Bound both input and coverage output per call. The final proposal retains the
// existing 150-requirement / 3,000-clause contract; no source is silently cut.
export function planAnalysisBatches(snapshot, decisions = []) {
  const { sources } = snapshot.backlog;
  if (sources.reduce((count, source) => count + source.clauses.length, 0) > 3000) fail('AI_ANALYSIS_CAPACITY');
  // Count the serialized array and commas; each grouped source header occurs once.
  const batches = []; let batch = [], bytes = 2, count = 0;
  for (const source of sources) for (const clause of source.clauses) {
    const clauseBytes = Buffer.byteLength(JSON.stringify(clause)), headerBytes = Buffer.byteLength(JSON.stringify({ ...source, clauses: [] }));
    if (2 + headerBytes + clauseBytes > 40 * 1024) fail('AI_SOURCE_CLAUSE_TOO_LARGE');
    const additionalBytes = batch.at(-1)?.id === source.id ? 1 + clauseBytes : (batch.length ? 1 : 0) + headerBytes + clauseBytes;
    if (count && (bytes + additionalBytes > 40 * 1024 || count >= 32)) { batches.push(batch); batch = []; bytes = 2; count = 0; }
    let target = batch.at(-1);
    if (target?.id !== source.id) { bytes += (batch.length ? 1 : 0) + headerBytes; target = { ...source, clauses: [] }; batch.push(target); }
    bytes += (target.clauses.length ? 1 : 0) + clauseBytes;
    target.clauses.push(clause); count++;
  }
  if (count) batches.push(batch);
  if (batches.length > MAX_ANALYSIS_BATCHES) fail('AI_ANALYSIS_CAPACITY');
  return batches;
}
