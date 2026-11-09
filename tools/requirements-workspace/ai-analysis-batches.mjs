const fail = code => { throw Object.assign(new Error(code), { code }); };
export const MAX_ANALYSIS_BATCHES = 128;
// Bound both input and coverage output per call. The final proposal retains the
// existing 150-requirement / 3,000-clause contract; no source is silently cut.
export function planAnalysisBatches(snapshot, decisions = []) {
  const { sources } = snapshot.backlog;
  if (sources.reduce((count, source) => count + source.clauses.length, 0) > 3000) fail('AI_ANALYSIS_CAPACITY');
  const batches = []; let batch = [], bytes = 0, count = 0;
  for (const source of sources) for (const clause of source.clauses) {
    const size = Buffer.byteLength(JSON.stringify(clause)) + Buffer.byteLength(JSON.stringify({ ...source, clauses: [] }));
    if (size > 40 * 1024) fail('AI_SOURCE_CLAUSE_TOO_LARGE');
    if (count && (bytes + size > 40 * 1024 || count >= 32)) { batches.push(batch); batch = []; bytes = 0; count = 0; }
    let target = batch.at(-1);
    if (target?.id !== source.id) { target = { ...source, clauses: [] }; batch.push(target); }
    target.clauses.push(clause); bytes += size; count++;
  }
  if (count) batches.push(batch);
  if (batches.length > MAX_ANALYSIS_BATCHES) fail('AI_ANALYSIS_CAPACITY');
  return batches;
}
