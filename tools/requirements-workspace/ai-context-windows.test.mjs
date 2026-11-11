import test from 'node:test';
import assert from 'node:assert/strict';
import * as batching from './ai-analysis-batches.mjs';

const size = value => Buffer.byteLength(JSON.stringify(value));
const prepare = entries => ({ request: { phase: 'analysis-context', data: { entries } }, schema: { type: 'object', description: '응답 스키마 비용'.repeat(20) } });

test('context packing visits all 96 records once, counts schema bytes and retains the chosen prepared request', () => {
  assert.equal(typeof batching.packContextWindows, 'function');
  const entries = Array.from({ length: 96 }, (_, index) => ({ id: `ENTRY-${index}`, text: '조건과 예외를 보존한다.'.repeat(index % 4 + 1) })), original = structuredClone(entries), calls = [];
  const windows = batching.packContextWindows(entries, (items, range) => { const result = prepare(items); calls.push({ range, result }); return result; }, { limitBytes: 2400, maxItems: 12 });
  assert.deepEqual(windows.flatMap(window => window.items), entries);
  assert.deepEqual(entries, original);
  for (const window of windows) {
    assert.ok(size(window.prepared.request) + size(window.prepared.schema) <= 2400);
    assert.ok(calls.some(call => call.result === window.prepared), 'send the measured request without a second preprocessing pass');
  }
  assert.equal(windows[0].start, 0); assert.equal(windows.at(-1).end, 96);
});

test('one irreducible context record fails explicitly instead of clipping text or skipping it', () => {
  assert.equal(typeof batching.packContextWindows, 'function');
  const value = [{ id: 'UNCHANGED', text: '반드시 보존할 조건'.repeat(1000) }], before = structuredClone(value);
  assert.throws(() => batching.packContextWindows(value, prepare, { limitBytes: 1000 }), { code: 'AI_INPUT_TOO_LARGE' });
  assert.deepEqual(value, before);
  assert.deepEqual(batching.packContextWindows([], prepare), []);
});

test('a single requirement larger than forwarding capacity pages complete quotes with the complete semantic header', () => {
  assert.equal(typeof batching.paginateContextRecords, 'function');
  const record = { kind: 'requirement', record: { id: 'REQ-EXISTING', title: '모든 단말의 동기화', description: '일반 단말은 24시간 이내 동기화하며 오프라인 단말은 72시간 유예한다.', nfrCriteria: { metric: '동기화 기한', threshold: '24시간 / 오프라인 72시간', verificationMethod: 'integration-test' }, citations: Array.from({ length: 200 }, (_, index) => ({ sourceId: 'SYNTHETIC', clauseId: `C-${index}`, quote: `${index}번째 조건: ${'해당되는 원문 조건과 예외를 그대로 읽는다. '.repeat(65)}` })) } };
  assert.ok(size(record) > 768 * 1024);
  const original = structuredClone(record), pages = batching.paginateContextRecords([record], prepare, { limitBytes: 100 * 1024 });
  assert.deepEqual(pages.flatMap(page => page.record.citations), record.record.citations);
  const { citations, ...header } = record.record;
  for (const page of pages) {
    const { citations: current, ...actual } = page.record; assert.deepEqual(actual, header);
    assert.equal(page.proofCount, current.length); assert.equal(page.proofTotal, 200);
    assert.ok(size(prepare([page]).request) + size(prepare([page]).schema) <= 100 * 1024);
  }
  assert.deepEqual(record, original);
  assert.deepEqual(batching.paginateContextRecords([record], prepare, { limitBytes: 100 * 1024 }), pages);
  record.record.citations[0].quote += '추가된 예외';
  assert.notEqual(batching.paginateContextRecords([record], prepare, { limitBytes: 100 * 1024 })[0].pageId, pages[0].pageId);
});

test('an unknown preparation failure is not treated as an oversized record', () => {
  assert.equal(typeof batching.packContextWindows, 'function');
  const failure = Object.assign(Error('synthetic failure'), { code: 'SYNTHETIC_INVALID' });
  assert.throws(() => batching.packContextWindows([1], () => { throw failure; }), error => error === failure);
});

test('a lone source batch keeps its former single-call admission while several batches use bounded windows', () => {
  const prepared = bytes => ({ request: { phase: 'analysis', data: { text: 'x'.repeat(bytes) } }, schema: { type: 'object', description: '응답 스키마'.repeat(500) } });
  const between = prepared(740 * 1024), edge = prepared(766 * 1024), over = prepared(770 * 1024), small = prepared(100 * 1024);
  assert.ok(size(between.request) + size(between.schema) > batching.CONTEXT_WINDOW_BYTES && size(between.request) <= batching.SINGLE_BATCH_REQUEST_BYTES);
  assert.equal(batching.fitsDirectAnalysis(between, { singleBatch: true }), true, 'one batch between 720KiB and 768KiB is still sent in one call');
  assert.equal(batching.fitsDirectAnalysis(edge, { singleBatch: true }), true, 'the former 768KiB wire limit, not a tighter one, admits a lone batch');
  assert.equal(batching.fitsDirectAnalysis(between, { singleBatch: false }), false, 'several batches compare a crowded block through bounded windows');
  assert.equal(batching.fitsDirectAnalysis(over, { singleBatch: true }), false);
  assert.equal(batching.fitsDirectAnalysis(small, { singleBatch: false }), true);
});
