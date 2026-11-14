import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createEmptyBacklogPack } from '../../scripts/export-deliverables-workspace.mjs';
import { createRequirementsEngine, initialRequirementsMetadata, validateRequirementsMetadata } from './engine.mjs';
import { validatePrivateBacklog } from './private-validation.mjs';
import { startRequirementsServer } from './server.mjs';
import { createRequirementsStore } from './store.mjs';
import { REQUEST_LIMIT } from './studio-tasks.mjs';
import { context } from './test-fixtures/ai.mjs';
import { CONSENT, classifyReply, clause, extractReply, groupReply, mergeReply, sourceOf, studioRunner } from './test-fixtures/studio.mjs';

const rfp = sourceOf('SRC-RFP', '합성 제안요청서', [
  clause('C-1', '[SFR:시설 예약 신청] 시민은 시설을 검색하고 예약을 신청한다. <function-tree:예약 신청>'),
  clause('C-2', '<entity-def:예약> 예약 정보를 관리한다. 속성(예약번호, 이용 일시)'),
  clause('C-3', '목차와 인사말'),
  clause('C-4', '[SFR:이용료 결제] 승인 후 24시간 안에 결제한다. <process-def:결제 처리>'),
  clause('C-5', '[PER:응답 시간] 조회는 3초 안에 응답한다.'),
]);
const minutes = sourceOf('SRC-MIN', '합성 회의록', [
  clause('C-1', '[SFR:시설 예약 신청] 예약은 이용일 30일 전부터 신청한다.'),
  clause('C-2', '[SFR:이용료 결제] 결제 기한은 승인 후 48시간으로 한다.'),
  clause('C-3', '[SFR:예약 현황 통계] (미정) 담당자가 이용 현황을 조회한다.'),
  clause('C-4', '<entity-def:예약> 예약 정보에 이용 목적을 더한다. 속성(이용 목적)'),
]);

async function fixture(t, options = {}) {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-studio-'));
  const store = createRequirementsStore({ workspace, initialBacklog: createEmptyBacklogPack(context), initialMetadata: initialRequirementsMetadata(context), validateBacklog: pack => { if (!validatePrivateBacklog(pack).valid) throw new Error('INVALID'); }, validateMetadata: validateRequirementsMetadata });
  const seen = [], engine = createRequirementsEngine({ store, root: process.cwd(), contextProvider: async () => context, aiRunner: studioRunner({ seen, overrides: options.overrides }) });
  t.after(async () => { await engine.close(); store.close(); rmSync(workspace, { recursive: true, force: true }); });
  const act = (action, payload) => engine.action(store.read().revision, action, payload);
  await act('project.save', { code: 'SYNTHETIC', name: '합성 시설예약', institution: '합성 기관', baselineProfile: '' });
  const run = async (action = 'studio.run', payload = {}) => { await act(action, { ...payload, ...CONSENT }); await engine.studio.waitForIdle(); return engine.studio.view(); };
  return { engine, store, act, run, seen, workspace };
}
// Distinct three-syllable names, so candidates differ by name while their descriptions overlap.
const word = index => String.fromCharCode(0xAC00 + (index * 37) % 11000, 0xAC00 + (index * 101 + 13) % 11000, 0xAC00 + (index * 211 + 7) % 11000);
const named = (view, name, kind = 'requirement') => view.items.find(item => item.kind === kind && item.name === name);
const phases = seen => seen.map(entry => entry.phase);

test('a first document becomes drafts without any comparison call, and every request stays under the limit', async t => {
  const { act, run, seen } = await fixture(t);
  await act('source.save', rfp);
  const view = await run();
  assert.equal(view.jobs.at(-1).status, 'done', view.jobs.at(-1).errorCode);
  assert.deepEqual(view.items.filter(item => item.kind === 'requirement').map(item => [item.name, item.fields.category, item.status]), [['시설 예약 신청', 'SFR', 'draft'], ['이용료 결제', 'SFR', 'draft'], ['응답 시간', 'PER', 'draft']]);
  assert.deepEqual(named(view, '예약', 'entity-def').fields.attributes.map(row => row.name), ['예약번호', '이용 일시']);
  assert.equal(named(view, '예약 신청', 'function-tree').sources[0].title, '합성 제안요청서');
  // Nothing existed to compare with, so the model was never asked to merge.
  assert.ok(!phases(seen).includes('studio-merge'));
  assert.ok(seen.every(entry => entry.bytes <= REQUEST_LIMIT));
  assert.equal(view.jobs.at(-1).maxRequestBytes, Math.max(...seen.map(entry => entry.bytes)));
  // process-def is off: the clause is remembered, no item is made, and nothing was sent for it.
  assert.equal(view.pending.waiting['process-def'], 1);
  assert.ok(!view.items.some(item => item.kind === 'process-def'));
  assert.ok(!seen.some(entry => entry.phase === 'studio-extract' && entry.request.data.artifact.id === 'process-def'));
  assert.deepEqual(view.sources[0], { id: 'SRC-RFP', title: '합성 제안요청서', sourceType: 'rfp', summary: '', clauses: 5, tagged: 5, requirementClauses: 3, failed: 0, artifacts: { 'function-tree': 1, 'entity-def': 1, 'process-def': 1 } });
  // The trace needs no model: the requirement and the function cite the same clause.
  assert.deepEqual(named(view, '시설 예약 신청').related, [named(view, '예약 신청', 'function-tree').id]);
});

test('a later document adds to drafts, proposes changes to confirmed records and raises conflicts for a person', async t => {
  const conflict = request => { const reply = mergeReply(request); for (const decision of reply.decisions) { const candidate = request.data.candidates.find(entry => entry.k === decision.k); if (candidate.name === '이용료 결제') Object.assign(decision, { action: 'conflict', target: candidate.near[0], field: 'details', existing: '승인 후 24시간 안에 결제한다.', incoming: '결제 기한은 승인 후 48시간으로 한다.', note: '결제 기한이 24시간과 48시간으로 다릅니다.' }); } return reply; };
  const { act, run, seen, engine } = await fixture(t, { overrides: { 'studio-merge': conflict } });
  await act('source.save', rfp);
  let view = await run();
  const booking = named(view, '시설 예약 신청'), payment = named(view, '이용료 결제');
  view = await act('studio.item.status', { id: booking.id, status: 'confirmed' });
  assert.equal(named(view, '시설 예약 신청').number, 'SFR-001');
  await act('source.save', minutes);
  seen.length = 0;
  view = await run();
  // Only the new document's clauses were sent; the first document was not read again.
  assert.deepEqual(seen.filter(entry => entry.phase === 'studio-classify').map(entry => entry.request.data.document.title), ['합성 회의록']);
  assert.deepEqual(view.jobs.at(-1).summary, { clauses: 4, proposed: 1, conflict: 1, added: 1, enriched: 1 });
  // The marks describe this run only: a draft the run did not touch is no longer "new".
  assert.deepEqual(view.items.filter(item => item.flags.fresh || item.flags.enriched).map(item => [item.name, item.flags]), [['예약', { enriched: 1 }], ['예약 현황 통계', { fresh: 1 }]]);
  // The confirmed requirement is untouched; the addition waits as a proposal.
  assert.deepEqual(named(view, '시설 예약 신청').fields.details, ['시민은 시설을 검색하고 예약을 신청한다.']);
  assert.deepEqual(view.proposals.map(proposal => [proposal.itemId, proposal.fields.details]), [[booking.id, ['예약은 이용일 30일 전부터 신청한다.']]]);
  // The contradiction is not merged. Both statements wait for a person.
  assert.deepEqual(named(view, '이용료 결제').fields.details, ['승인 후 24시간 안에 결제한다.']);
  assert.deepEqual(view.issues.filter(issue => issue.open).map(issue => [issue.kind, issue.itemId]).sort(), [['conflict', payment.id], ['question', named(view, '예약 현황 통계').id]].sort());
  assert.equal(named(view, '이용료 결제').ready, false);
  // The entity of the same name gained an attribute without a model decision.
  assert.deepEqual(named(view, '예약', 'entity-def').fields.attributes.map(row => row.name), ['예약번호', '이용 일시', '이용 목적']);

  view = await act('studio.proposal', { id: view.proposals[0].id, accept: true });
  assert.deepEqual(named(view, '시설 예약 신청').fields.details, ['시민은 시설을 검색하고 예약을 신청한다.', '예약은 이용일 30일 전부터 신청한다.']);
  await assert.rejects(async () => act('studio.item.status', { id: payment.id, status: 'confirmed' }), { code: 'STUDIO_NOT_READY' });
  view = await act('studio.issue', { id: view.issues.find(issue => issue.kind === 'conflict').id, choice: 'adopt' });
  assert.deepEqual(named(view, '이용료 결제').fields.details, ['결제 기한은 승인 후 48시간으로 한다.']);
  assert.equal(named(view, '이용료 결제').sources.length, 2);
  view = await act('studio.item.status', { id: payment.id, status: 'confirmed' });
  assert.equal(named(view, '이용료 결제').number, 'SFR-002');
  await assert.rejects(async () => act('studio.issue', { id: view.issues.find(issue => issue.kind === 'question').id }), { code: 'STUDIO_ANSWER_REQUIRED' });

  view = await act('studio.baseline', { name: '1차 확정' });
  assert.deepEqual(view.baselines.map(baseline => [baseline.id, baseline.counts]), [['BL-1', { requirement: 2 }]]);
  assert.equal(named(view, '시설 예약 신청').baseline, 'BL-1');
  const edited = named(view, '시설 예약 신청');
  view = await act('studio.item.save', { id: edited.id, name: edited.name, fields: { ...edited.fields, outputs: ['예약 신청서'] }, rev: edited.rev });
  assert.equal(named(view, '시설 예약 신청').changed, 1);
  await assert.rejects(async () => act('studio.item.save', { id: edited.id, name: edited.name, fields: { ...edited.fields, category: 'SIR' }, rev: named(view, '시설 예약 신청').rev }), { code: 'STUDIO_CATEGORY_LOCKED' });
  await assert.rejects(async () => act('studio.item.save', { id: edited.id, name: edited.name, fields: edited.fields, rev: edited.rev }), { code: 'STUDIO_ITEM_CONFLICT' });

  // A deliverable switched on later is drafted from the clauses already tagged for it.
  seen.length = 0;
  await act('studio.enable', { type: 'process-def', enabled: true });
  view = await run();
  assert.deepEqual(phases(seen), ['studio-extract']);
  assert.equal(named(view, '결제 처리', 'process-def').missing.includes('actor'), true);
  assert.deepEqual(view.checks['screen-def'].length, 2);

  seen.length = 0;
  view = await run('studio.plan');
  assert.deepEqual(view.plan.stories.map(story => [story.id, story.title, story.stale]), [['ST-0001', '시설 예약 신청', false], ['ST-0002', '이용료 결제', false]]);
  assert.deepEqual(view.plan.epics, [{ id: 'EP-01', name: '예약 업무' }]);
  assert.ok(seen.every(entry => entry.phase === 'studio-plan' && entry.bytes <= REQUEST_LIMIT));
  await assert.rejects(async () => act('studio.plan', CONSENT), { code: 'STUDIO_NOTHING_TO_DO' });
  const definition = engine.studio.document('requirements');
  assert.equal(definition.filename, '요구사항정의서.md');
  assert.match(definition.content, /### SFR-001 시설 예약 신청/);
  assert.match(definition.content, /BL-1 1차 확정/);
  assert.doesNotMatch(definition.content, /예약 현황 통계/, 'drafts are not in the definition document');
  const trace = engine.studio.document('rtm').content;
  assert.match(trace, /"SFR-001","시설 예약 신청","합성 제안요청서\n합성 회의록","예약 신청","","","","ST-0001"/);
  assert.match(engine.studio.document('package-ST-0002').content, /- \[통과 1\] 결제 기한은 승인 후 48시간으로 한다\./);
  assert.throws(() => engine.studio.document('table-def'), { code: 'STUDIO_DOCUMENT_NOT_FOUND' });
});

test('model requests do not grow with the amount of stored work', async t => {
  const { act, run, seen } = await fixture(t);
  const sizes = [];
  for (let round = 0; round < 4; round++) {
    // Each document restates the earlier requirements and adds new ones, so every round has to compare with a larger store.
    const clauses = Array.from({ length: 60 }, (unused, index) => clause(`C-${index + 1}`, `[SFR:${word(round * 60 + index)} 관리] 담당자는 예약 승인 결제 통계 업무 가운데 ${word(round * 60 + index)} 건을 처리한다. ${'세부 조건과 처리 규칙을 정한다. '.repeat(20)}`));
    clauses.push(...Array.from({ length: 20 }, (unused, index) => clause(`D-${index + 1}`, `[SFR:${word(index)} 관리] ${round}차 문서의 ${word(index)} 보충 설명.`)));
    await act('source.save', sourceOf(`SRC-${round}`, `합성 문서 ${round}`, clauses));
    seen.length = 0;
    const view = await run();
    assert.equal(view.jobs.at(-1).status, 'done', view.jobs.at(-1).errorCode);
    sizes.push({ items: view.items.length, max: Math.max(...seen.map(entry => entry.bytes)), merge: Math.max(0, ...seen.filter(entry => entry.phase === 'studio-merge').map(entry => entry.bytes)) });
  }
  assert.ok(sizes.at(-1).items > sizes[0].items * 3, JSON.stringify(sizes));
  assert.ok(sizes.every(size => size.max <= REQUEST_LIMIT), JSON.stringify(sizes));
  // The store quadrupled; the largest comparison request did not follow it.
  assert.ok(sizes.at(-1).merge <= sizes[1].merge * 1.5, JSON.stringify(sizes));
});

test('a value two documents word differently is a note that does not block confirmation, and conflicts stored for such values are released when analysis runs', async t => {
  // The two documents name the identifier of the same entity differently.
  const worded = request => { const reply = extractReply(request); for (const item of reply.items) if (item.name === '예약') item.fields.identifier = request.data.clauses.some(entry => entry.text.includes('이용 목적')) ? '예약ID' : '예약번호'; return reply; };
  const { act, run, store, engine } = await fixture(t, { overrides: { 'studio-extract': worded } });
  await act('source.save', rfp); await run();
  await act('source.save', minutes);
  let view = await run();
  const entity = () => named(engine.studio.view(), '예약', 'entity-def'), notes = () => engine.studio.view().issues.filter(issue => issue.itemId === entity().id).map(issue => [issue.kind, issue.field, issue.existing, issue.incoming, issue.open]);
  assert.deepEqual(notes(), [['variant', 'identifier', '예약번호', '예약ID', 1]]);
  assert.equal(view.issues.find(issue => issue.kind === 'variant').current, '예약번호');
  assert.deepEqual([view.jobs.at(-1).summary.variant, view.jobs.at(-1).summary.conflict, entity().fields.identifier, entity().ready], [1, undefined, '예약번호', true]);
  // A workspace written before the two were told apart holds the same difference as a conflict, which blocks confirmation.
  store.transact(store.read().revision, draft => { draft.metadata.studio.issues.find(issue => issue.kind === 'variant').kind = 'conflict'; });
  assert.equal(entity().ready, false);
  await act('source.save', sourceOf('SRC-MEMO', '합성 메모', [clause('C-1', '목차와 인사말')]));
  view = await run();
  assert.deepEqual([view.jobs.at(-1).status, view.jobs.at(-1).summary.demoted, entity().ready], ['done', 1, true]);
  assert.deepEqual(notes(), [['variant', 'identifier', '예약번호', '예약ID', 1]]);
  assert.equal((await act('studio.item.status', { id: entity().id, status: 'confirmed' })).items.find(item => item.id === entity().id).status, 'confirmed');
});

test('runs need consent, never start on their own after a restart, and unusable replies are counted instead of stored', async t => {
  const broken = { 'studio-classify': request => ({ clauses: [{ n: 1, requirement: true, artifacts: ['not-a-type'] }], candidates: [{ category: 'SFR', name: '근거 없는 후보', definition: '없다.', details: [], outputs: [], verification: '', clauses: [99], questions: [] }] }) };
  const { act, run, store, engine } = await fixture(t, { overrides: broken });
  await assert.rejects(async () => act('studio.run', CONSENT), { code: 'STUDIO_NOTHING_TO_DO' });
  await act('source.save', rfp);
  await assert.rejects(async () => act('studio.run', { ...CONSENT, consent: false }), { code: 'AI_CONSENT_REQUIRED' });
  await assert.rejects(async () => act('studio.run', { ...CONSENT, sensitivityAcknowledged: false }), { code: 'FILE_REDACTION_REQUIRED' });
  await assert.rejects(async () => act('studio.run', { ...CONSENT, extra: 1 }), { code: 'INVALID_REQUEST' });
  let view = await run();
  // The candidate cited a clause that was not sent, so it is dropped and counted. The clause it was meant for was called a
  // requirement but grounds nothing usable, so it is not answered either: all five clauses stay pending.
  assert.equal(view.items.length, 0);
  assert.equal(view.jobs.at(-1).failures, 6);
  assert.equal(view.pending.classify, 5);
  view = await run();
  // After the second unusable answer the clauses are closed and reported per document, not retried forever.
  assert.equal(view.pending.classify, 0);
  assert.equal(view.sources[0].failed, 5);
  // A job left running by a stopped launcher is shown as interrupted.
  const before = store.read();
  store.transact(before.revision, draft => { draft.metadata.studio.jobs.at(-1).status = 'running'; delete draft.metadata.studio.jobs.at(-1).completedAt; });
  await engine.close();
  const restarted = createRequirementsEngine({ store, root: process.cwd(), contextProvider: async () => context, aiRunner: studioRunner() });
  t.after(() => restarted.close());
  assert.equal(restarted.studio.view().jobs.at(-1).status, 'interrupted');
  assert.equal(restarted.studio.view().active, null);
});

test('a failing CLI stops the run and keeps finished work; cancel stops between requests', async t => {
  let calls = 0, release, child, heldSignal, spawned;
  const gate = new Promise(resolve => { release = resolve; }), holding = new Promise(resolve => { spawned = resolve; });
  const { act, run, engine, workspace } = await fixture(t, { overrides: { 'studio-extract': async (request, schema, signal) => {
    calls += 1;
    if (calls === 1) {
      // Like the real CLI, this request runs a process inside the run's working folder (Windows cannot remove a folder
      // a process is working in) and ends that process when it is told to stop.
      heldSignal = signal;
      child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { cwd: join(workspace, '.scratch', readdirSync(join(workspace, '.scratch')).find(name => name.startsWith('studio-'))), stdio: 'ignore' });
      signal.addEventListener('abort', () => child.kill());
      child.once('spawn', spawned);
      await gate;
    } else await holding;
    throw Object.assign(new Error('AI_CLI_FAILED'), { code: 'AI_CLI_FAILED' });
  } } });
  t.after(() => child?.kill());
  await act('source.save', rfp);
  let view = await act('studio.run', CONSENT);
  assert.ok(view.active);
  await assert.rejects(async () => act('studio.run', CONSENT), { code: 'AI_BUSY' });
  await engine.studio.waitForIdle();
  view = engine.studio.view();
  // The reason is the CLI failure, not the folder that could not be removed, and the request still open was told to stop.
  assert.deepEqual([view.jobs.at(-1).status, view.jobs.at(-1).errorCode], ['failed', 'AI_CLI_FAILED']);
  assert.equal(heldSignal.aborted, true);
  release();
  // Classification had been committed before the failure, so the next run does not repeat it,
  // and its requirement candidates had already become drafts.
  assert.equal(view.pending.classify, 0);
  assert.equal(view.pending.merge, 0);
  assert.equal(view.items.filter(item => item.kind === 'requirement').length, 3);
  const { engine: second, act: act2 } = await fixture(t, { overrides: { 'studio-classify': (request, schema, signal) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('AI_CANCELLED'), { code: 'AI_CANCELLED' })))) } });
  await act2('source.save', rfp);
  const started = await act2('studio.run', CONSENT);
  await assert.rejects(async () => act2('studio.cancel', { jobId: 'JOB-9999' }), { code: 'AI_NOT_RUNNING' });
  assert.equal((await act2('studio.cancel', { jobId: started.active })).jobs.at(-1).status, 'cancelled');
  assert.equal(second.studio.view().items.length, 0);
});

test('candidates become items while documents are still being read, so the waiting list stays short however much is read', async t => {
  const probe = { samples: [] };
  const { act, run, engine } = await fixture(t, { overrides: { 'studio-classify': request => { const view = probe.engine.studio.view(); probe.samples.push({ items: view.items.length, waiting: view.pending.merge }); return classifyReply(request); } } });
  probe.engine = engine;
  await act('source.save', sourceOf('SRC-BIG', '합성 대량 문서', Array.from({ length: 240 }, (unused, index) => clause(`C-${index + 1}`, `[SFR:${word(index)}${word(index + 500)}] ${word(index + 1000)} ${word(index + 2000)} ${word(index + 3000)}`))));
  const view = await run();
  assert.equal(view.jobs.at(-1).status, 'done', view.jobs.at(-1).errorCode);
  assert.equal(probe.samples.length, 10);
  // Ten bundles of 24 clauses. By the time the last bundles were sent, the first ones had already become drafts,
  // and what waited to be compared never exceeded the bundles read since the last comparison.
  assert.ok(probe.samples.at(-1).items >= 96, JSON.stringify(probe.samples));
  assert.ok(probe.samples.every(sample => sample.waiting <= 96), JSON.stringify(probe.samples));
  assert.deepEqual([view.items.length, view.pending.merge], [240, 0]);
  assert.deepEqual([view.jobs.at(-1).stage, view.jobs.at(-1).summary.added], ['기존 요구사항·항목과 대조', 240]);
});

test('candidates an unfinished run left behind are compared before anything new is read, several requests at a time', async t => {
  let fail = true, open = 0, widest = 0;
  const merge = async request => {
    if (fail) throw Object.assign(new Error('AI_CLI_FAILED'), { code: 'AI_CLI_FAILED' });
    open += 1; widest = Math.max(widest, open);
    await new Promise(resolve => setImmediate(resolve));
    open -= 1;
    return mergeReply(request);
  };
  const { act, run, seen } = await fixture(t, { overrides: { 'studio-merge': merge } });
  const names = Array.from({ length: 14 }, (unused, index) => `${word(index)}${word(index + 500)}`);
  await act('source.save', sourceOf('SRC-A', '합성 문서 A', names.map((name, index) => clause(`C-${index + 1}`, `[SFR:${name}] ${word(index + 1000)} 업무를 처리한다.`))));
  let view = await run();
  assert.equal(view.items.length, 14);
  await act('source.save', sourceOf('SRC-B', '합성 문서 B', names.map((name, index) => clause(`C-${index + 1}`, `[SFR:${name}] ${word(index + 2000)} 조건을 더한다.`))));
  view = await run();
  assert.deepEqual([view.jobs.at(-1).status, view.jobs.at(-1).errorCode, view.pending.merge], ['failed', 'AI_CLI_FAILED', 14]);
  fail = false; seen.length = 0;
  await act('source.save', sourceOf('SRC-C', '합성 문서 C', [clause('C-1', `[SFR:${word(900)}${word(901)}] 새 업무를 처리한다.`)]));
  view = await run();
  assert.equal(view.jobs.at(-1).status, 'done', view.jobs.at(-1).errorCode);
  // The fourteen waiting candidates were compared first (two requests open at once), then the new document was read.
  assert.deepEqual(phases(seen), ['studio-merge', 'studio-merge', 'studio-merge', 'studio-classify']);
  assert.equal(widest, 2);
  assert.deepEqual([view.items.length, view.pending.merge], [15, 0]);
  assert.ok(view.items.filter(item => names.includes(item.name)).every(item => item.fields.details.length === 2 && item.sources.length === 2));
});

test('a judgement about a record a person changed meanwhile is not applied; the candidate is compared again', async t => {
  let calls = 0, edit;
  const { act, run, engine } = await fixture(t, { overrides: { 'studio-merge': async request => { calls += 1; if (calls === 1) await edit(); return mergeReply(request); } } });
  await act('source.save', sourceOf('SRC-A', '합성 문서 A', [clause('C-1', '[SFR:시설 예약 신청] 시민은 시설을 예약한다.')]));
  let view = await run();
  const booking = named(view, '시설 예약 신청');
  edit = () => act('studio.item.save', { id: booking.id, name: booking.name, fields: { ...booking.fields, outputs: ['예약 신청서'] }, rev: booking.rev });
  await act('source.save', sourceOf('SRC-B', '합성 문서 B', [clause('C-1', '[SFR:시설 예약 신청] 예약은 30일 전부터 받는다.')]));
  view = await run();
  // The first answer was about the record before the edit. It was set aside and the comparison was made once more.
  assert.equal(calls, 2);
  assert.deepEqual([named(view, '시설 예약 신청').fields.outputs, named(view, '시설 예약 신청').fields.details], [['예약 신청서'], ['시민은 시설을 예약한다.', '예약은 30일 전부터 받는다.']]);
  assert.equal(view.pending.merge, 0);
  assert.equal(engine.studio.view().items.filter(item => item.kind === 'requirement').length, 1);
});

test('questions that ask the same thing are grouped by comparison and answered once; an unusable or outdated judgement groups nothing', async t => {
  let broken = true, meanwhile = null;
  const group = async request => { if (broken) return {}; if (meanwhile) { const during = meanwhile; meanwhile = null; await during(); } return groupReply(request); };
  const { act, run, seen, store, engine } = await fixture(t, { overrides: { 'studio-group': group } });
  await act('source.save', sourceOf('SRC-A', '합성 요구 문서', [
    clause('C-1', '[SFR:이용료 결제] (미결:결제 수단) 승인 후 결제한다.'),
    clause('C-2', '[SFR:환불 처리] (미결:환불 기한) 취소하면 환불한다.'),
    clause('C-3', '<entity-def:결제> (미결:결제 수단) 결제 정보를 관리한다. 속성(결제번호)'),
  ]));
  let view = await run();
  const [means, refund, entityMeans] = view.issues.map(issue => issue.id), topics = () => engine.studio.view().issues.map(issue => issue.topic);
  assert.deepEqual(view.issues.map(issue => [issue.kind, issue.text]), [['question', '결제 수단이 정해지지 않았습니다. 어떻게 정합니까?'], ['question', '환불 기한이 정해지지 않았습니다. 어떻게 정합니까?'], ['question', '결제 수단이 정해지지 않았습니다. 어떻게 정합니까?']]);
  // The reply held no decisions: nothing is grouped on a guess, each question stays on its own, and the loss is counted.
  assert.deepEqual([view.jobs.at(-1).status, view.jobs.at(-1).failures, view.jobs.at(-1).summary.grouped, view.pending.questions, topics()], ['done', 2, undefined, 0, [means, refund, entityMeans]]);

  // A workspace written before questions were compared: running the analysis compares them and reads nothing else.
  store.transact(store.read().revision, draft => { for (const issue of draft.metadata.studio.issues) delete issue.topic; });
  assert.equal(engine.studio.view().pending.questions, 3);
  broken = false; seen.length = 0;
  view = await run();
  assert.deepEqual([view.jobs.at(-1).status, phases(seen), view.jobs.at(-1).summary, view.pending.questions], ['done', ['studio-group', 'studio-group'], { grouped: 1 }, 0]);
  assert.deepEqual(topics(), [means, refund, means]);
  // The first question was never sent: nothing earlier resembled it. A question is sent with the record it is attached to and only the few earlier questions that resemble it.
  assert.deepEqual(seen.map(entry => entry.request.data.questions.map(question => [question.item, question.near])), [[['요구사항 · 환불 처리', [means]]], [['엔터티정의서 · 결제', [means, refund]]]]);
  assert.deepEqual(seen.at(-1).request.data.existing.map(question => [question.id, question.item]), [[means, '요구사항 · 이용료 결제'], [refund, '요구사항 · 환불 처리']]);
  assert.ok(seen.every(entry => entry.bytes <= REQUEST_LIMIT));
  // The marks of the analysis before stay: this run read no document.
  assert.ok(view.items.every(item => item.flags.fresh === 1));
  // Grouping does not open the way to confirmation.
  await assert.rejects(async () => act('studio.item.status', { id: named(view, '이용료 결제').id, status: 'confirmed' }), { code: 'STUDIO_NOT_READY' });
  await assert.rejects(async () => act('studio.run', CONSENT), { code: 'STUDIO_NOTHING_TO_DO' });
  // A group is closed only by a request that names its questions: the person decides about what was on screen.
  await assert.rejects(async () => act('studio.issue', { id: entityMeans, note: '카드로 한다.' }), { code: 'STUDIO_GROUP_CHANGED' });
  await assert.rejects(async () => act('studio.issue', { id: means, choice: 'dismiss', group: [means] }), { code: 'STUDIO_GROUP_CHANGED' });
  assert.deepEqual(engine.studio.view().issues.map(issue => issue.open), [1, 1, 1]);

  // A person answers the group while a later question is being compared with it: the judgement names a question that no longer leads an open group, so it is set aside and the comparison is made again.
  await act('source.save', sourceOf('SRC-B', '합성 회의록', [clause('C-1', '[SFR:간편 결제] (미결:결제 수단) 간편 결제를 지원한다.')]));
  meanwhile = () => act('studio.issue', { id: entityMeans, note: '카드와 계좌이체로 한다.', group: [means, entityMeans] });
  seen.length = 0;
  view = await run();
  const later = view.issues.at(-1);
  assert.deepEqual(seen.filter(entry => entry.phase === 'studio-group').map(entry => entry.request.data.questions[0].near), [[means, refund], [refund]]);
  assert.deepEqual([later.open, later.topic === later.id, view.jobs.at(-1).summary.grouped], [1, true, undefined]);
  // One answer closed both questions of the group and was written to both records.
  assert.deepEqual(view.issues.slice(0, 3).map(issue => [issue.open, issue.resolution]), [[0, '카드와 계좌이체로 한다.'], [1, undefined], [0, '카드와 계좌이체로 한다.']]);
  assert.deepEqual([named(view, '이용료 결제').fields.details, named(view, '결제', 'entity-def').note, named(view, '이용료 결제').ready], [['승인 후 결제한다.', '카드와 계좌이체로 한다.'], '카드와 계좌이체로 한다.', true]);

  // The next document repeats the open point on a new record, and two of its records are too long to keep whole.
  const lengthy = '이력을 빠짐없이 적는다 '.repeat(180);
  await act('source.save', sourceOf('SRC-C', '합성 설계 메모', [clause('C-1', '<entity-def:간편 결제 수단> (미결:결제 수단) 간편 결제 수단을 관리한다. 속성(수단 코드)'),
    clause('C-2', `<entity-def:결제 이력> ${lengthy}`), clause('C-3', `<entity-def:환불 이력> ${lengthy}`),
    // An ordinary question in nearly the words of the program's notice: the notice is not compared with it either.
    clause('C-4', '[SFR:설명 점검] (질문:엔터티 설명의 내용이 길이 한도를 넘는지 근거 조각과 대조해 나누어 적어 주세요.) 설명을 점검한다.')]));
  seen.length = 0;
  view = await run();
  const issueOf = id => engine.studio.view().issues.find(issue => issue.id === id), joined = view.issues.find(issue => issue.itemId === named(view, '간편 결제 수단', 'entity-def').id);
  assert.deepEqual([joined.topic, view.jobs.at(-1).status, view.jobs.at(-1).summary.grouped], [later.id, 'done', 1]);
  // The program's notice that content was cut reads the same on both records, but each is about its own record: it is never sent for comparison and never grouped.
  const notices = view.issues.filter(issue => issue.text.includes('길이 한도를 넘어 일부만 담겼습니다'));
  assert.deepEqual(notices.map(issue => [issue.open, issue.topic === issue.id, issue.text === notices[0].text]), [[1, true, true], [1, true, true]]);
  assert.ok(seen.filter(entry => entry.phase === 'studio-group').length > 0 && !seen.some(entry => entry.phase === 'studio-group' && JSON.stringify(entry.request.data).includes('길이 한도')));
  // A person takes a question out of its group; it is then answered on its own.
  await act('studio.issue.split', { id: joined.id });
  assert.equal(issueOf(joined.id).topic, joined.id);
  await assert.rejects(async () => act('studio.issue.split', { id: joined.id }), { code: 'STUDIO_ISSUE_NOT_GROUPED' });
  await act('studio.issue', { id: later.id, choice: 'dismiss' });
  assert.deepEqual([issueOf(later.id).open, issueOf(joined.id).open], [0, 1]);
});

test('a question is compared with the question that leads a group even when only the group\'s other questions resemble it, and never with a question that stands alone', async t => {
  const firstNear = request => ({ decisions: request.data.questions.map(question => ({ k: question.k, same: question.near[0] ?? '' })) });
  const { act, run, seen, store } = await fixture(t, { overrides: { 'studio-group': firstNear } });
  await act('source.save', sourceOf('SRC-A', '합성 요구 문서', [clause('C-1', '[SFR:이용료 결제] (미결:결제 수단) 승인 후 결제한다.'), clause('C-2', '<entity-def:회원> 회원 정보를 관리한다.')]));
  let view = await run();
  const lead = view.issues[0], payment = named(view, '이용료 결제');
  // Enrichment leaves a question about the record's own empty field.
  view = await run('studio.enrich', { itemId: named(view, '회원', 'entity-def').id });
  const own = view.issues.at(-1);
  assert.deepEqual([own.alone, own.topic, own.text], [1, own.id, '등록한 문서에서 찾지 못했습니다. 직접 알려 주세요.']);
  // The group grew: a dozen questions that word the open point in other words than the one that leads it.
  const worded = index => `간편 지불 방식의 허용 범위를 아직 확정하지 못했다. ${index}차 회의에서 다시 논의한다.`;
  store.transact(store.read().revision, draft => { const studio = draft.metadata.studio; for (let index = 1; index <= 12; index++) { studio.seq.ISS += 1; studio.issues.push({ id: `ISS-${String(studio.seq.ISS).padStart(4, '0')}`, kind: 'question', itemId: payment.id, text: worded(index), evidence: [], open: 1, createdAt: 'synthetic', topic: lead.id }); } });
  await act('source.save', sourceOf('SRC-B', '합성 회의록', [clause('C-1', `[SFR:간편 결제] (질문:${worded(13)}) 간편 결제를 지원한다.`), clause('C-2', '[SFR:시설 관리] (질문:등록한 문서에서 찾지 못했습니다. 직접 알려 주세요.) 시설을 등록한다.')]));
  seen.length = 0;
  view = await run();
  const late = view.issues.find(issue => issue.itemId === named(view, '간편 결제').id), apart = view.issues.find(issue => issue.itemId === named(view, '시설 관리').id);
  assert.deepEqual([view.jobs.at(-1).status, late.text, apart.text], ['done', worded(13), own.text]);
  // The new question reads like the twelve, not like the one that leads them. It is still compared with that one, and only with it.
  assert.deepEqual(seen.filter(entry => entry.phase === 'studio-group').map(entry => entry.request.data.questions.map(question => question.near)), [[[lead.id]]]);
  assert.deepEqual([late.topic, view.jobs.at(-1).summary.grouped, view.pending.questions], [lead.id, 1, 0]);
  // The question that reads exactly like the one enrichment left was not compared with it and leads itself.
  assert.deepEqual([apart.topic, seen.some(entry => entry.phase === 'studio-group' && JSON.stringify(entry.request.data).includes(own.id))], [apart.id, false]);
});

test('planning sends only the epics that resemble the requirements, however many epics exist', async t => {
  const { act, run, seen, store } = await fixture(t);
  await act('source.save', sourceOf('SRC-A', '합성 문서 A', [clause('C-1', '[SFR:시설 예약 신청] 시민은 시설을 예약한다.')]));
  let view = await run();
  await act('studio.items.confirm', { kind: 'requirement' });
  const before = store.read();
  store.transact(before.revision, draft => { draft.metadata.studio.plan = { epics: Array.from({ length: 150 }, (unused, index) => ({ id: `EP-${String(index + 1).padStart(3, '0')}`, name: `${'가나다라마바사아자차'.repeat(11)} ${index}` })), stories: [], updatedAt: 'synthetic' }; draft.metadata.studio.seq.EP = 150; });
  seen.length = 0;
  view = await run('studio.plan');
  assert.equal(view.jobs.at(-1).status, 'done', view.jobs.at(-1).errorCode);
  assert.deepEqual(seen.map(entry => [entry.phase, entry.request.data.epics.length, entry.bytes <= REQUEST_LIMIT]), [['studio-plan', 12, true]]);
  assert.equal(view.plan.stories.length, 1);
});

test('enrichment fills only empty fields of a draft and asks when the documents do not say', async t => {
  const { act, run } = await fixture(t);
  await act('source.save', sourceOf('SRC-A', '합성 설계 메모', [clause('C-1', '<entity-def:회원> 회원 정보를 관리한다.'), clause('C-2', '<entity-def:시설> 시설 정보를 관리한다. 보강 근거: 시설ID로 식별한다.')]));
  let view = await run();
  const member = named(view, '회원', 'entity-def'), facility = named(view, '시설', 'entity-def');
  view = await run('studio.enrich', { itemId: facility.id });
  assert.equal(named(view, '시설', 'entity-def').fields.identifier, '보강한 identifier');
  assert.equal(named(view, '시설', 'entity-def').fields.description, '시설 정보를 관리한다. 보강 근거: 시설ID로 식별한다.', 'a filled field is never rewritten');
  assert.deepEqual(named(view, '시설', 'entity-def').missing, []);
  view = await run('studio.enrich', { itemId: member.id });
  assert.deepEqual(view.issues.map(issue => [issue.kind, issue.itemId, issue.open]), [['question', member.id, 1]]);
  // It asks about this record's own field, so it is not left waiting to be compared with the questions of other records.
  assert.deepEqual([view.issues[0].topic, view.pending.questions], [view.issues[0].id, 0]);
  view = await act('studio.item.status', { id: facility.id, status: 'confirmed' });
  await assert.rejects(async () => act('studio.enrich', { itemId: facility.id, ...CONSENT }), { code: 'STUDIO_ITEM_CONFIRMED' });
  view = await act('studio.items.confirm', { kind: 'entity-def' });
  assert.equal(named(view, '회원', 'entity-def').status, 'draft', 'an item with an open question is not confirmed in bulk');
  // The question is the model's. A person can close it without answering, and nothing in the record changes.
  const before = JSON.stringify(named(view, '회원', 'entity-def').fields);
  view = await act('studio.issue', { id: view.issues[0].id, choice: 'dismiss' });
  assert.deepEqual([view.issues[0].open, view.issues[0].resolution, JSON.stringify(named(view, '회원', 'entity-def').fields)], [0, '답하지 않고 닫음', before]);
});

test('the server serves the studio view and documents only to the workspace session', async t => {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-studio-server-'));
  const app = await startRequirementsServer({ workspace, port: 0, contextProvider: async () => context, aiRunner: studioRunner() });
  t.after(async () => { await app.close(); rmSync(workspace, { recursive: true, force: true }); });
  assert.equal(new URL(app.studioUrl).pathname, '/studio.html');
  const page = await fetch(`${app.url}/studio.html`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /script-src 'self'; style-src 'self'/);
  assert.equal((await fetch(`${app.url}/api/studio`)).status, 403);
  const session = await (await fetch(`${app.url}/api/session`, { headers: { 'x-requirements-launch': app.launchSecret } })).json();
  const headers = { 'x-workspace-token': session.token, 'content-type': 'application/json' };
  const view = await (await fetch(`${app.url}/api/studio`, { headers })).json();
  assert.deepEqual([view.items, view.enabled, view.model], [[], ['function-tree', 'entity-def', 'screen-def'], 'claude-opus-5-5']);
  const post = async (action, payload) => fetch(`${app.url}/api/action`, { method: 'POST', headers, body: JSON.stringify({ revision: view.revision, action, payload }) });
  const created = await (await post('studio.item.save', { kind: 'requirement', name: '직접 쓴 요구사항', fields: { category: 'SER', definition: '접속 기록을 보관해야 한다.', details: ['1년 이상 보관한다.'] } })).json();
  assert.deepEqual(created.items.map(item => [item.id, item.origin, item.ready]), [['REQ-0001', 'user', true]]);
  // Studio actions are checked per record, so a stale workspace revision does not block them.
  assert.equal((await post('studio.item.status', { id: 'REQ-0001', status: 'confirmed' })).status, 200);
  const failed = await post('studio.item.status', { id: 'REQ-0404', status: 'confirmed' });
  assert.deepEqual([failed.status, (await failed.json()).code], [400, 'STUDIO_ITEM_NOT_FOUND']);
  const document = await (await fetch(`${app.url}/api/studio/documents/requirements-sheet`, { headers })).json();
  assert.equal(document.filename, '요구사항목록.csv');
  assert.match(document.content, /"SER-001","SER","직접 쓴 요구사항"/);
  assert.equal((await fetch(`${app.url}/api/studio/documents/..%2Fsecret`, { headers })).status, 404);
});
