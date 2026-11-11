import { createHash } from 'node:crypto';
const fail = code => { throw Object.assign(new Error(code), { code }); };
export const CONTEXT_WINDOW_BYTES = 720 * 1024;
// A lone source batch keeps its single-call admission from before bounded
// windows: it was sent unreduced and only the 768KiB wire check applied. So
// bounded comparison only takes over where that call could not be sent.
export const SINGLE_BATCH_REQUEST_BYTES = 768 * 1024;
export function fitsDirectAnalysis(prepared, { singleBatch }) {
  const request = Buffer.byteLength(JSON.stringify(prepared.request));
  return request + Buffer.byteLength(JSON.stringify(prepared.schema)) <= CONTEXT_WINDOW_BYTES || singleBatch === true && request <= SINGLE_BATCH_REQUEST_BYTES;
}

// Store the full canonical ledger locally. A model sees measured, lossless
// windows of it, never an ever-growing copy of the entire ledger.
export function packContextWindows(items, prepare, { limitBytes = CONTEXT_WINDOW_BYTES, maxItems = 64 } = {}) {
  if (!Array.isArray(items) || typeof prepare !== 'function' || !Number.isSafeInteger(limitBytes) || limitBytes < 1 || limitBytes > 768 * 1024 || !Number.isSafeInteger(maxItems) || maxItems < 1) fail('AI_CONTEXT_CONFIGURATION_INVALID');
  const result = [];
  for (let start = 0; start < items.length;) {
    const measure = end => {
      const current = structuredClone(items.slice(start, end)); let prepared;
      try { prepared = prepare(current, { start, end }); }
      catch (error) {
        if (!['AI_INPUT_TOO_LARGE', 'AI_DECOMPOSITION_INPUT_TOO_LARGE', 'AI_EVIDENCE_CAPACITY'].includes(error.code)) throw error;
        return null;
      }
      if (!prepared?.request || !prepared?.schema) fail('AI_CONTEXT_CONFIGURATION_INVALID');
      const bytes = Buffer.byteLength(JSON.stringify(prepared.request)) + Buffer.byteLength(JSON.stringify(prepared.schema));
      return bytes <= limitBytes ? { start, end, items: current, prepared, bytes } : null;
    };
    const maximum = Math.min(items.length, start + maxItems);
    let selected = measure(maximum);
    if (!selected) {
      let low = start + 1, high = maximum - 1;
      while (low <= high) {
        const end = Math.floor((low + high) / 2), current = measure(end);
        if (current) { selected = current; low = end + 1; } else high = end - 1;
      }
    }
    if (!selected) fail('AI_INPUT_TOO_LARGE');
    result.push(selected); start = selected.end;
  }
  return result;
}

// One requirement may have more proof than a model window. Repeat its complete
// semantic header and visit every exact quote page; do not choose representative
// proof or truncate conditions to make an input fit.
export function paginateContextRecords(records, prepare, options = {}) {
  if (!Array.isArray(records)) fail('AI_CONTEXT_CONFIGURATION_INVALID');
  const result = [];
  for (const entry of records) {
    if (!entry?.record || !Array.isArray(entry.record.citations)) fail('AI_CONTEXT_CONFIGURATION_INVALID');
    const total = entry.record.citations.length, { citations: _proof, ...header } = entry.record, { record: _record, ...metadata } = entry;
    const page = (citations, start) => ({ ...structuredClone(metadata), record: { ...structuredClone(header), citations }, proofOffset: start, proofCount: citations.length, proofTotal: total, pageId: `CTX-${'0'.repeat(64)}` });
    const windows = total ? packContextWindows(entry.record.citations, (citations, range) => prepare([page(citations, range.start)]), { maxItems: 128, ...options }) : packContextWindows([null], () => prepare([page([], 0)]), { ...options, maxItems: 1 });
    for (const window of windows) {
      const value = page(total ? window.items : [], total ? window.start : 0);
      value.pageId = `CTX-${createHash('sha256').update(JSON.stringify({ ...value, pageId: undefined })).digest('hex')}`;
      result.push(value);
    }
  }
  return result;
}
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
