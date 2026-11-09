import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequirementsEngine, validateRequirementsMetadata } from './engine.mjs';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEmptyBacklogPack } from '../../scripts/export-deliverables-workspace.mjs';

const context = { snapshotDigest: 'context-one', commit: 'test', capabilities: [], screens: [], interfaces: [], tables: [], gates: [], modules: [], presets: [] };
function setup(t) {
  const directory = mkdtempSync(join(tmpdir(), 'requirements-engine-test-')), archives = new Map();
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  let snapshot = { revision: '0', backlog: createEmptyBacklogPack(context), metadata: { context, baselines: [], reviewedRequirements: {}, uatRecords: [], auditFindings: [], exports: [] } };
  const store = { directory, writeArchive(kind, content) { const id = randomUUID(); archives.set(id, content); return { id, kind, sha256: createHash('sha256').update(content).digest('hex'), bytes: Buffer.byteLength(content) }; }, readArchive: ref => archives.get(ref.id), read: () => structuredClone(snapshot), transact(revision, mutate) { assert.equal(revision, snapshot.revision); const next = structuredClone(snapshot); mutate(next); next.revision = String(Number(snapshot.revision) + 1); snapshot = next; return this.read(); } };
  let liveContext = context;
  const engine = createRequirementsEngine({ store, contextProvider: async () => liveContext, root: process.cwd() });
  return { engine, store, setContext: next => { liveContext = next; }, act: async (action, payload) => engine.action(store.read().revision, action, payload) };
}
const source = { id: 'SRC-1', title: '요구 협의', sourceType: 'interview', classification: 'internal', locator: '회의 1쪽', clauses: [{ id: 'C-1', text: '목록을 조회한다', locator: '1행', disposition: 'question', requirementIds: [], rationale: '열람 범위를 다음 협의에서 확인' }] };
const requirement = { id: 'REQ-1', sourceIds: ['SRC-1'], title: '목록 조회', description: '목록을 조회한다', requirementType: 'functional', solutionDisposition: 'undecided', scopeDisposition: 'proposed', moduleCandidates: [], rationale: '', openQuestions: ['열람 범위 확인'], acceptanceDisposition: 'pending' };

test('private source patterns persist as advisories; unknown actions do not mutate', async t => {
  const { store, act, engine } = setup(t);
  await act('source.save', source);
  await act('requirement.save', { requirement, reviewed: false, clauseIds: ['SRC-1/C-1'] });
  assert.equal(store.read().backlog.businessRequirements[0].title, requirement.title);
  await act('source.save', { ...store.read().backlog.sources[0], title: 'person@example.invalid' });
  assert.ok((await engine.state()).sensitivityWarnings.length);
  const revision = store.read().revision;
  await assert.rejects(act('run.shell', { command: 'anything' }), /ACTION_UNSUPPORTED/);
  assert.equal(store.read().revision, revision);
});

test('baseline and development export reject incomplete analysis and cannot invent acceptance', async t => {
  const { act, store, engine } = setup(t);
  await act('source.save', source);
  await act('requirement.save', { requirement, reviewed: true, clauseIds: ['SRC-1/C-1'] });
  assert.equal((await engine.state()).readiness.valid, false);
  await assert.rejects(act('baseline.create', { label: '검토 1차' }), /ANALYSIS_NOT_READY/);
  await assert.rejects(act('export.create', { kind: 'task' }), /BASELINE_REQUIRED/);
  await assert.rejects(act('requirement.save', { requirement: { ...requirement, acceptanceDisposition: 'accepted' }, reviewed: true }), /ACCEPTANCE_READ_ONLY/);
  assert.equal(store.read().metadata.baselines.length, 0);
});

test('audit observations require evidence when resolving and remain separate from backlog status', async t => {
  const { act, store } = setup(t);
  await act('audit.save', { id: 'F-1', title: '근거 확인', severity: 'blocking', disposition: 'open', evidence: '' });
  await assert.rejects(act('audit.save', { id: 'F-1', title: '근거 확인', severity: 'blocking', disposition: 'resolved', evidence: '' }), /EVIDENCE_REQUIRED/);
  await act('audit.save', { id: 'F-1', title: '근거 확인', severity: 'blocking', disposition: 'resolved', evidence: '검토 문서 R-1 3절' });
  assert.equal(store.read().metadata.auditFindings[0].disposition, 'resolved');
  assert.equal(Object.hasOwn(store.read().backlog, 'status'), false);
});

test('audit exports are immutable identified drafts with digest and recoverable download', async t => {
  const { act, store, engine } = setup(t);
  await act('export.create', { kind: 'audit' });
  const entry = store.read().metadata.exports[0];
  assert.match(entry.sha256, /^[a-f0-9]{64}$/);
  const file = engine.artifact(entry.id);
  assert.match(file.content, /기관.*인수|공식.*승인/);
  assert.match(file.content, /요구사항/);
  assert.throws(() => engine.artifact('../backlog.json'), /ARTIFACT_NOT_FOUND/);
});

test('private artifact content permits patterns while malformed historical records remain invalid', t => {
  const metadata = setup(t).store.read().metadata;
  const content = 'person@example.invalid';
  metadata.exports.push({ id: 'EX-1', kind: 'audit', filename: 'AUDIT-REVIEW.md', content, sha256: createHash('sha256').update(content).digest('hex') });
  assert.doesNotThrow(() => validateRequirementsMetadata(metadata));
  metadata.exports = []; metadata.auditFindings = [{ title: '필수 필드가 없는 기록' }];
  assert.throws(() => validateRequirementsMetadata(metadata), /INVALID_METADATA/);
});

test('clause selection replaces links and follows explicit scope without silently including proposals', async t => {
  const { act, store, engine } = setup(t);
  await act('source.save', { ...source, clauses: [...source.clauses, { ...source.clauses[0], id: 'C-2', locator: '2행' }] });
  await act('requirement.save', { requirement, reviewed: false, clauseIds: ['SRC-1/C-1'] });
  assert.equal(store.read().backlog.sources[0].clauses[0].disposition, 'question');
  await act('requirement.save', { requirement: { ...requirement, scopeDisposition: 'included', solutionDisposition: 'gap-dev', openQuestions: [] }, reviewed: true, clauseIds: ['SRC-1/C-2'] });
  const clauses = store.read().backlog.sources[0].clauses;
  assert.deepEqual(clauses[0].requirementIds, []);
  assert.equal(clauses[1].disposition, 'included');
  assert.equal((await engine.state()).analysisReadiness.valid, false, 'unprocessed original clause still needs a decision');
});

test('two requirements from the same RFP retain independent clause reviews', async t => {
  const { act, engine } = setup(t);
  await act('source.save', { ...source, clauses: [...source.clauses, { ...source.clauses[0], id: 'C-2', locator: '2행', text: '검색 조건을 적용한다' }] });
  const included = { ...requirement, scopeDisposition: 'included', solutionDisposition: 'gap-dev', openQuestions: [] };
  await act('requirement.save', { requirement: included, reviewed: true, clauseIds: ['SRC-1/C-1'] });
  await act('requirement.save', { requirement: { ...included, id: 'REQ-2', title: '검색 조건' }, reviewed: true, clauseIds: ['SRC-1/C-2'] });
  assert.deepEqual((await engine.state()).reviewedRequirementsCurrent, { 'REQ-1': true, 'REQ-2': true });
});

test('older UAT records are archived without losing history or locking future work', async t => {
  const { act, store, engine } = setup(t);
  store.transact(store.read().revision, draft => {
    draft.metadata.uatRecords = Array.from({ length: 501 }, (_, index) => ({ id: randomUUID(), acId: `AC-${index}`, disposition: 'accepted', signer: '검증 역할', date: '2026-11-04', evidence: `TEST-${index}`, buildRef: 'BUILD-1', acHash: 'a'.repeat(32), contextDigest: context.snapshotDigest, recordedAt: '2026-11-04T00:00:00Z' }));
  });
  await act('audit.save', { title: '이력 보관 뒤 작업', severity: 'observation', disposition: 'open', evidence: '' });
  const metadata = store.read().metadata;
  assert.equal(metadata.uatRecords.length, 1);
  assert.equal(metadata.uatHistoryRefs.length, 1);
  assert.equal(JSON.parse(engine.artifact(metadata.uatHistoryRefs[0].id).content).length, 500);
  await act('audit.save', { title: '다음 작업도 계속', severity: 'observation', disposition: 'open', evidence: '' });
  assert.equal(store.read().metadata.auditFindings.length, 2);
});

test('reviewed analysis baseline survives decomposition; evidenced UAT resets when meaning changes', async t => {
  const { act, store, engine, setContext } = setup(t);
  await act('source.save', source);
  const included = { ...requirement, solutionDisposition: 'gap-dev', scopeDisposition: 'included', openQuestions: [] };
  await act('requirement.save', { requirement: included, reviewed: true, clauseIds: ['SRC-1/C-1'] });
  assert.equal((await engine.state()).analysisReadiness.valid, true);
  await act('baseline.create', { label: '분석 검토 1' });
  const epic = { id: 'EP-1', title: '목록 업무', workItemType: 'epic', requirementIds: ['REQ-1'], parentEpicId: null, priority: 'MUST', batch: '1' };
  await act('work.save', epic);
  const story = { id: 'US-1', title: '목록 조회', workItemType: 'story', requirementIds: ['REQ-1'], parentEpicId: 'EP-1', priority: 'MUST', batch: '1', asA: '담당자', iWant: '목록 조회', soThat: '업무 확인', archetype: 'A1', decisionCards: ['D-1: 목록', 'D-2: 소유자만', 'D-3: 업무 식별자', 'D-4: 길이 검증', 'D-5: 거부 시험'] };
  await act('work.save', story);
  for (const polarity of ['allow', 'forbid']) await act('ac.save', { id: `AC-${polarity}`, workItemId: 'US-1', requirementIds: ['REQ-1'], polarity, given: polarity === 'allow' ? '담당자' : '비인가 사용자', when: '목록 요청', then: polarity === 'allow' ? '목록 표시' : '403 거부', verificationMethod: 'manual-uat' });
  await act('trace.save', { id: 'TR-1', requirementId: 'REQ-1', workItemId: 'US-1', targetKind: 'screen', targetId: '/future-list', linkIntent: 'planned', notes: '개발 예정 화면' });
  assert.equal((await engine.state()).baselineCurrent, true);
  assert.equal((await engine.state()).readiness.valid, true);
  await act('requirement.save', { requirement: store.read().backlog.businessRequirements[0], reviewed: false });
  assert.equal((await engine.state()).baselineCurrent, false, 'withdrawn review cannot authorize handoff');
  await act('requirement.save', { requirement: store.read().backlog.businessRequirements[0], reviewed: true });
  await act('export.create', { kind: 'task' });
  assert.equal((await engine.state()).metadata.exports.at(-1).stale, false);
  for (const polarity of ['allow', 'forbid']) await act('uat.record', { acId: `AC-${polarity}`, disposition: 'accepted', signer: '기관 검토 역할', date: '2026-11-04', evidence: 'TEST-001 시험 기록', buildRef: 'BUILD-001' });
  assert.equal(store.read().backlog.businessRequirements[0].acceptanceDisposition, 'accepted');
  await act('export.create', { kind: 'uat' });
  const csv = engine.artifact(store.read().metadata.exports.find(item => item.kind === 'uat').id).content;
  await assert.rejects(act('uat.import', { csv }), /EVIDENCE_REQUIRED/);
  await act('uat.import', { csv, buildRef: 'BUILD-002' });
  assert.equal(store.read().metadata.uatRecords.length, 2, 'unchanged CSV cannot create new build attestations');
  await act('uat.import', { csv: csv.replace('TEST-001 시험 기록', 'TEST-002 새 시험 기록'), buildRef: 'BUILD-002' });
  assert.equal(store.read().metadata.uatRecords.length, 3);
  assert.equal(store.read().metadata.uatRecords.at(-1).buildRef, 'BUILD-002');
  setContext({ ...context, snapshotDigest: 'unrelated-catalog-change', gates: [{ id: 'unrelated-gate', status: 'blocking' }] });
  assert.equal((await engine.state()).contextChanged, true);
  await act('context.refresh', {});
  assert.equal((await engine.state()).baselineCurrent, true, 'implementation catalogs do not withdraw business analysis');
  assert.equal(store.read().backlog.businessRequirements[0].acceptanceDisposition, 'accepted');
  await act('work.save', { ...story, decisionCards: story.decisionCards.map(card => card.startsWith('D-2') ? 'D-2: 기관 관리자만' : card) });
  assert.ok(store.read().backlog.acceptanceCriteria.every(ac => ac.acceptanceDisposition === 'pending'));
  assert.equal(store.read().backlog.businessRequirements[0].acceptanceDisposition, 'pending');
  const changed = { ...store.read().backlog.businessRequirements[0], description: '승인된 목록만 조회한다' };
  await act('requirement.save', { requirement: changed, reviewed: false });
  assert.equal((await engine.state()).baselineCurrent, false);
  assert.equal((await engine.state()).metadata.exports.find(item => item.kind === 'task').stale, true);
  assert.equal(store.read().metadata.uatRecords.length, 3);
  await assert.rejects(act('export.create', { kind: 'task' }), /BASELINE_REQUIRED/);
});
