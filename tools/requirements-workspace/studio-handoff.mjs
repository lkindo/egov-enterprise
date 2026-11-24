import { createHash, randomUUID } from 'node:crypto';
import { ARCHETYPE_CATALOG, DECISION_CARD_AXES, TARGET_KINDS, computeContextBindings, findContextTarget, storyDevelopmentProblems } from '../../scripts/export-deliverables-workspace.mjs';
import { REQUIREMENT_KIND } from './studio-catalog.mjs';
import { QUALITY_CATEGORIES, STUDIO_LIMITS, baselineItem, clauseMap, createRelations, meaningHash } from './studio-model.mjs';
import { describeEvidence, renderDocument } from './studio-render.mjs';

const STORY_ID = /^ST-\d{4,}$/u;
const DIGEST = /^[a-f0-9]{64}$/u;
const TARGET_ID = /^[A-Za-z0-9_/.{}\[\]():# >-]{1,200}$/u;
const fail = code => { throw Object.assign(new Error(code), { code }); };
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
const only = (value, fields) => plain(value) && Object.keys(value).every(key => fields.includes(key));
const line = (value, max) => typeof value === 'string' && value.length > 0 && value.length <= max && value.trim() === value && !/[\p{Cc}\p{Zl}\p{Zp}]/u.test(value);
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : plain(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const hash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const storyIdentifier = value => typeof value === 'string' && STORY_ID.test(value);
const proof = value => typeof value === 'string' && DIGEST.test(value);
const sourceCommit = value => typeof value === 'string' && /^[a-f0-9]{40}$/u.test(value);
const followUpFields = ['fixture', 'localScope', 'remaining', 'owner'];
const list = (value, max) => Array.isArray(value) && value.length <= max;

const targetKey = target => target.kind + ':' + (['table', 'migration-mapping'].includes(target.kind) ? target.id.toLowerCase() : target.id);
function validSetup(setup) {
  return only(setup, ['archetype', 'decisions', 'targets', 'dependencies', 'followUp'])
    && (setup.followUp === undefined || (only(setup.followUp, followUpFields) && followUpFields.every(field => line(setup.followUp[field], field === 'owner' ? 120 : 500))))
    && ARCHETYPE_CATALOG.some(entry => entry.id === setup.archetype)
    && Array.isArray(setup.decisions) && setup.decisions.length === DECISION_CARD_AXES.length && setup.decisions.every(value => line(value, 500))
    && list(setup.targets, 12) && setup.targets.length > 0
    && setup.targets.every(target => only(target, ['kind', 'id', 'intent']) && TARGET_KINDS.includes(target.kind)
      && line(target.id, 200) && TARGET_ID.test(target.id) && ['existing', 'planned'].includes(target.intent))
    && new Set(setup.targets.map(targetKey)).size === setup.targets.length
    && list(setup.dependencies, 20) && setup.dependencies.every(storyIdentifier)
    && new Set(setup.dependencies).size === setup.dependencies.length;
}
function validRun(run) {
  return only(run, ['digest', 'scopeDigest', 'ticket', 'baseline', 'repository', 'startedAt'])
    && proof(run.digest) && proof(run.scopeDigest) && proof(run.ticket) && /^BL-\d{1,4}$/u.test(run.baseline)
    && line(run.repository, 64) && line(run.startedAt, 30);
}

function validResult(result) {
  return only(result, ['run', 'digest', 'repository', 'commit', 'evidence', 'reportedAt']) && validRun(result.run)
    && proof(result.digest) && line(result.repository, 64) && sourceCommit(result.commit)
    && line(result.evidence, 500) && line(result.reportedAt, 30);
}

export function validateStudioHandoff(handoff) {
  if (handoff === undefined) return;
  if (!only(handoff, ['entries', 'active', 'paused', 'stopAfterCurrent', 'history']) || !list(handoff.entries, STUDIO_LIMITS.stories) || !list(handoff.history, STUDIO_LIMITS.stories)
    || typeof handoff.paused !== 'boolean' || typeof handoff.stopAfterCurrent !== 'boolean'
    || (handoff.active === null && handoff.stopAfterCurrent) || (handoff.active && handoff.paused)) fail('STUDIO_HANDOFF_INVALID');
  const ids = new Set();
  for (const event of handoff.history) {
    if (!only(event, ['storyId', 'status', 'closedAt', 'run', 'result']) || !storyIdentifier(event.storyId)
      || !line(event.closedAt, 30) || !validRun(event.run)
      || (event.status === 'reported' ? !validResult(event.result) || event.result.run.ticket !== event.run.ticket
        : event.status !== 'released' || event.result !== undefined)) fail('STUDIO_HANDOFF_INVALID');
  }
  for (const entry of handoff.entries) {
    if (!only(entry, ['storyId', 'setup', 'result']) || !storyIdentifier(entry.storyId) || ids.has(entry.storyId) || !validSetup(entry.setup)
      || (entry.result !== undefined && !validResult(entry.result))) fail('STUDIO_HANDOFF_INVALID');
    ids.add(entry.storyId);
  }
  if (handoff.active !== null && (!only(handoff.active, ['storyId', 'run']) || !ids.has(handoff.active.storyId) || !validRun(handoff.active.run))) fail('STUDIO_HANDOFF_INVALID');
}

function stateOf(snapshot) {
  return snapshot.metadata.studioHandoff ?? { entries: [], active: null, paused: false, stopAfterCurrent: false, history: [] };
}

function checkStory(snapshot, context, storyId, readArchive) {
  const studio = snapshot.metadata.studio;
  const stories = new Map((studio?.plan?.stories ?? []).map(story => [story.id, story]));
  if (!stories.has(storyId)) fail('STUDIO_HANDOFF_STORY_NOT_FOUND');
  const byId = new Map(studio.items.map(item => [item.id, item]));
  const entries = new Map(stateOf(snapshot).entries.map(entry => [entry.storyId, entry]));
  const clauses = clauseMap(snapshot.backlog), relations = createRelations(studio);
  const qualities = studio.items.filter(item => item.kind === REQUIREMENT_KIND && item.status === 'confirmed' && QUALITY_CATEGORIES.includes(item.fields.category));
  const baselineItems = new Map(), baselineRefs = new Map(studio.baselines.map(baseline => [baseline.id, baseline.ref]));
  function hasCurrentBaseline(item) {
    if (item.status !== 'confirmed' || item.changed || !baselineRefs.has(item.baseline)) return false;
    if (!baselineItems.has(item.baseline)) {
      const content = readArchive(baselineRefs.get(item.baseline));
      let archive;
      try { archive = JSON.parse(content); } catch { fail('STUDIO_HANDOFF_INVALID'); }
      if (!plain(archive) || archive.version !== 1 || !Array.isArray(archive.items)) fail('STUDIO_HANDOFF_INVALID');
      baselineItems.set(item.baseline, new Map(archive.items.map(entry => [entry.id, entry])));
    }
    const record = baselineItems.get(item.baseline).get(item.id);
    if (!record) return false;
    return hash(baselineItem(item)) === hash(record);
  }
  const memo = new Map(), visiting = new Set();
  function inspect(id) {
    if (!stories.has(id) || visiting.has(id)) return null;
    if (memo.has(id)) return memo.get(id);
    visiting.add(id);
    const entry = entries.get(id), story = stories.get(id);
    const checked = checkStoryInputs({ studio, story, req: byId.get(story.reqId), clauses, setup: entry?.setup ?? null, context, relations, qualities, hasCurrentBaseline });
    const dependencies = (checked.setup?.dependencies ?? []).map(depId => {
      const report = entries.get(depId)?.result;
      const dependency = report && inspect(depId);
      if (!dependency?.reported) checked.blockers.push({ code: 'dependency', storyId: depId });
      return [depId, dependency?.reported ? [dependency.digest, report.commit, report.evidence] : null];
    });
    checked.dependencyProof = dependencies;
    checked.scopeDigest = hash([checked.scopeDigest, dependencies]);
    checked.digest = hash([checked.scopeDigest, checked.binding]);
    checked.reported = reportProblems(checked).length === 0 && entry?.result?.digest === checked.digest;
    checked.result = entry?.result ?? null;
    visiting.delete(id);
    memo.set(id, checked);
    return checked;
  }
  return inspect(storyId);
}

function checkStoryInputs({ studio, story, req, clauses, setup, context, relations, qualities, hasCurrentBaseline }) {
  const blockers = [], missingOutputs = [];
  const add = (code, detail) => blockers.push({ code, ...detail });
  if (!req || req.status !== 'confirmed' || story.hash !== meaningHash(req)) add('story-changed');
  if (!req?.evidence.length) add('evidence', { itemId: req?.id });

  const related = req ? relations(req).filter(item => item.status === 'confirmed' || req.links?.includes(item.id) || item.links?.includes(req.id)) : [];
  const records = new Map([...qualities, ...related, ...(req ? [req] : [])].map(item => [item.id, item]));
  const openTopics = new Set();
  for (const issue of studio.issues) {
    if (issue.open && issue.kind !== 'variant' && records.has(issue.itemId)) {
      const topic = issue.topic ?? issue.id;
      if (!openTopics.has(topic)) add('decision', { itemId: issue.itemId, issueId: topic });
      openTopics.add(topic);
    }
  }
  for (const proposal of studio.proposals) {
    if (records.has(proposal.itemId)) add('proposal', { itemId: proposal.itemId });
  }
  const evidence = [];
  for (const record of records.values()) {
    if (!hasCurrentBaseline(record)) add('baseline', { itemId: record.id });
    const sources = describeEvidence(record.evidence, clauses);
    if (sources.some(source => source.stale)) add('evidence', { itemId: record.id });
    evidence.push([record.id, record.number ?? null, record.status, record.name, record.fields, record.note ?? null, record.evidence, sources]);
  }

  if (!setup) add('setup');
  const links = (setup?.targets ?? []).map(target => ({ requirementId: story.reqId, targetKind: target.kind, targetId: target.id }));
  const binding = computeContextBindings({ businessRequirements: [{ id: story.reqId }], traceLinks: links }, context)[story.reqId];
  const decisionCards = setup?.decisions.map((value, index) => DECISION_CARD_AXES[index].id + ': ' + value) ?? [];
  if (setup) {
    const acs = [...story.green.map(() => ({ polarity: 'allow' })), ...story.red.map(() => ({ polarity: 'forbid' }))];
    for (const problem of storyDevelopmentProblems({ archetype: setup.archetype, decisionCards }, acs)) add('contract', { problem });
    for (const target of setup.targets) {
      const found = Boolean(findContextTarget(context, target.kind, target.id));
      if (found !== (target.intent === 'existing')) add('repository-target', { target });
      if (!found && target.intent === 'planned') missingOutputs.push({ code: 'output-pending', target });
    }
  }
  return { req, blockers, missingOutputs, setup, decisionCards, clauses, binding, relatedIds: new Set(related.map(item => item.id)),
    scopeDigest: hash(['studio-handoff-v1', story, setup, evidence]) };
}

const reportProblems = checked => [
  ...checked.blockers.filter(problem => !(problem.code === 'repository-target' && problem.target.intent === 'planned')),
  ...checked.missingOutputs,
];
function requireActive(state, storyId, ticket) {
  if (state.active?.storyId !== storyId) fail('STUDIO_HANDOFF_NOT_ACTIVE');
  if (state.active.run.ticket !== ticket) fail('STUDIO_HANDOFF_STALE');
  return state.active;
}
function closeHandoff(state, event, pause) {
  if (state.history.length === STUDIO_LIMITS.stories) fail('STUDIO_CAPACITY');
  state.history.push(event);
  state.active = null;
  state.paused = pause;
  state.stopAfterCurrent = false;
}

export function createStudioHandoff({ store, commit, contextProvider, now, view }) {
  async function action(revision, name, payload) {
    const storyId = payload.storyId;
    const queueAction = ['studio.handoff.pause', 'studio.handoff.resume'].includes(name);
    if (!queueAction && !storyIdentifier(storyId)) fail('INVALID_REQUEST');
    if (name === 'studio.handoff.inspect') {
      if (!only(payload, ['storyId'])) fail('INVALID_REQUEST');
      const context = await contextProvider(), snapshot = store.read();
      const checked = checkStory(snapshot, context, storyId, store.readArchive);
      const state = stateOf(snapshot), active = state.active, ownRun = active?.storyId === storyId ? active.run : null;
      const resultProblems = reportProblems(checked);
      let status, blockers = checked.blockers;
      if (ownRun) {
        if (ownRun.digest === checked.digest && !checked.blockers.length) status = 'active';
        else if (ownRun.scopeDigest === checked.scopeDigest && !resultProblems.some(problem => problem.code !== 'output-pending')) status = 'result-review';
        else status = 'stale';
        if (status !== 'stale') blockers = resultProblems;
      } else if (checked.reported) {
        status = 'reported';
        blockers = [];
      } else status = blockers.length ? 'blocked' : 'ready';
      return { storyId, status, revision: snapshot.revision, setup: checked.setup, digest: checked.digest, blockers, active,
        paused: state.paused, result: checked.result,
        stories: snapshot.metadata.studio.plan.stories.map(story => ({ id: story.id, name: story.title })),
        archetypes: ARCHETYPE_CATALOG, axes: DECISION_CARD_AXES, targetKinds: TARGET_KINDS };
    }
    const snapshot = store.read();
    if (revision !== snapshot.revision) fail('WORKSPACE_REVISION_CONFLICT');
    const state = structuredClone(stateOf(snapshot));
    const stories = snapshot.metadata.studio?.plan?.stories ?? [];
    if (queueAction) {
      if (!only(payload, [])) fail('INVALID_REQUEST');
      if (name === 'studio.handoff.pause') {
        state.paused = !state.active;
        state.stopAfterCurrent = Boolean(state.active);
      } else {
        state.paused = false;
        state.stopAfterCurrent = false;
      }
    } else if (name === 'studio.handoff.release') {
      if (!only(payload, ['storyId', 'ticket']) || !proof(payload.ticket)) fail('INVALID_REQUEST');
      const { run } = requireActive(state, storyId, payload.ticket);
      closeHandoff(state, { storyId, status: 'released', run, closedAt: now() }, true);
    } else if (name === 'studio.handoff.configure') {
      const { storyId: id, ...setup } = payload;
      if (!validSetup(setup)) fail('INVALID_REQUEST');
      const live = new Set(stories.map(story => story.id));
      if (!live.has(id)) fail('STUDIO_HANDOFF_STORY_NOT_FOUND');
      if (setup.dependencies.some(dep => !live.has(dep))) fail('INVALID_REQUEST');
      if (state.active?.storyId === id) fail('STUDIO_HANDOFF_ACTIVE');
      const result = state.entries.find(entry => entry.storyId === id)?.result;
      state.entries = state.entries.filter(entry => entry.storyId !== id && (live.has(entry.storyId) || state.active?.storyId === entry.storyId));
      const dependencies = new Map(state.entries.map(entry => [entry.storyId, entry.setup.dependencies]));
      const pending = [...setup.dependencies], seen = new Set();
      for (const dep of pending) {
        if (dep === id) fail('STUDIO_HANDOFF_DEPENDENCY_CYCLE');
        if (seen.has(dep)) continue;
        seen.add(dep);
        pending.push(...(dependencies.get(dep) ?? []));
      }
      state.entries.push({ storyId: id, setup, ...(result ? { result } : {}) });
    } else if (name === 'studio.handoff.start') {
      if (!only(payload, ['storyId', 'digest']) || !proof(payload.digest)) fail('INVALID_REQUEST');
      if (state.active) fail('STUDIO_HANDOFF_ACTIVE');
      if (state.paused) fail('STUDIO_HANDOFF_PAUSED');
      if (state.history.length === STUDIO_LIMITS.stories) fail('STUDIO_CAPACITY');
      const context = await contextProvider();
      const checked = checkStory(snapshot, context, storyId, store.readArchive);
      if (checked.blockers.length) fail('STUDIO_HANDOFF_BLOCKED');
      if (checked.digest !== payload.digest) fail('STUDIO_HANDOFF_STALE');
      if (checked.reported) fail('STUDIO_HANDOFF_REPORTED');
      state.active = { storyId, run: { digest: checked.digest, scopeDigest: checked.scopeDigest, ticket: hash([checked.digest, randomUUID()]),
        baseline: checked.req.baseline, repository: context.commit, startedAt: now() } };
    } else if (name === 'studio.handoff.finish') {
      if (!only(payload, ['storyId', 'ticket', 'digest', 'commit', 'evidence']) || !proof(payload.ticket) || !proof(payload.digest)
        || !sourceCommit(payload.commit) || !line(payload.evidence, 500)) fail('INVALID_REQUEST');
      const { run } = requireActive(state, storyId, payload.ticket);
      const context = await contextProvider();
      const checked = checkStory(snapshot, context, storyId, store.readArchive);
      const problems = reportProblems(checked);
      if (checked.scopeDigest !== run.scopeDigest || checked.digest !== payload.digest
        || problems.some(problem => problem.code !== 'output-pending')) fail('STUDIO_HANDOFF_STALE');
      if (problems.length) fail('STUDIO_HANDOFF_OUTPUT_PENDING');
      const result = { run, digest: checked.digest, repository: context.commit, commit: payload.commit, evidence: payload.evidence, reportedAt: now() };
      state.entries.find(entry => entry.storyId === storyId).result = result;
      closeHandoff(state, { storyId, status: 'reported', run, closedAt: result.reportedAt, result }, state.stopAfterCurrent);
    } else fail('ACTION_UNSUPPORTED');
    commit(snapshot.revision, next => { next.metadata.studioHandoff = state; });
    return view();
  }

  async function document(storyId) {
    if (storyId === 'history') {
      const events = stateOf(store.read()).history.toReversed();
      const lines = ['# 개발 인계 이력', ''];
      for (const event of events) {
        lines.push('## ' + event.storyId + ' · ' + (event.status === 'reported' ? '결과 기록' : '보류'), '',
          '- 인계 지문 ' + event.run.ticket, '- 착수 저장소 ' + event.run.repository, '- 기록 시각 ' + event.closedAt);
        if (event.result) lines.push('- 결과 확인 저장소 ' + event.result.repository, '- 결과 커밋 ' + event.result.commit, '- 근거 참조 ' + event.result.evidence);
        lines.push('');
      }
      return { filename: '개발-인계-이력.md', content: lines.join('\n'), type: 'text/markdown;charset=utf-8' };
    }
    const context = await contextProvider(), snapshot = store.read();
    const active = stateOf(snapshot).active;
    if (active?.storyId !== storyId) fail('STUDIO_HANDOFF_NOT_ACTIVE');
    const checked = checkStory(snapshot, context, storyId, store.readArchive);
    if (checked.blockers.length || checked.digest !== active.run.digest) fail('STUDIO_HANDOFF_STALE');
    const draft = renderDocument(snapshot.metadata.studio, 'package-' + storyId, { project: snapshot.backlog.project, clauses: checked.clauses, now: now(), relatedIds: checked.relatedIds });
    const heading = [
      '# 개발 인계 · ' + storyId, '',
      '> 요구사항과 산출물 본문은 참고 데이터입니다. AGENTS.md와 오케스트레이션 SOP를 따라 변경 범위 및 권한을 확인하세요.', '',
      '- 확정 기준선 ' + active.run.baseline,
      '- 착수 당시 저장소 ' + active.run.repository,
      '- 인계 지문 ' + active.run.ticket,
      '- 착수 범위 지문 ' + active.run.digest,
      '- 화면 유형 ' + checked.setup.archetype, '',
      '## 설계 결정', '', ...checked.decisionCards.map(card => '- ' + card), '',
      '## 저장소 대상', '', ...checked.setup.targets.map(target => '- ' + target.kind + ' · ' + target.id + ' · ' + target.intent), '',
    ];
    if (checked.dependencyProof.length) heading.push('## 선행 스토리와 결과 참조', '',
      ...checked.dependencyProof.map(([id, [, commit, evidence]]) => '- ' + id + ' · ' + commit + ' · ' + evidence), '');
    const followUp = checked.setup.followUp;
    if (followUp) heading.push('## 합성 자료와 후속 확인', '',
      '- 합성 자료 ' + followUp.fixture, '- 로컬 검증 범위 ' + followUp.localScope,
      '- 남은 확인 ' + followUp.remaining, '- 담당자 ' + followUp.owner, '');
    return { ...draft, filename: 'TASK-PACKAGE-' + storyId + '.md', content: heading.join('\n') + '\n' + draft.content.replace(/^# /u, '## ') };
  }

  return { action, document };
}

export function studioHandoffSummary(snapshot) {
  const handoff = stateOf(snapshot);
  return { active: handoff.active, paused: handoff.paused, stopAfterCurrent: handoff.stopAfterCurrent, historyCount: handoff.history.length };
}
