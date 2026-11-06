import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ANALYSIS_SCHEMA, DECOMPOSITION_SCHEMA, aiInputDigest, buildAiRequest, buildCorrectionRequest, validateAnalysisProposal, validateDecompositionProposal } from './ai-contract.mjs';
import { AI_MODEL, AI_EFFORT, createCliRunner, findClaudeExecutable } from './ai-cli.mjs';
import { assertExternalWorkspace } from './store.mjs';
import { prepareVisualAttachments } from './ai-attachments.mjs';

const fail = code => { throw Object.assign(new Error(code), { code }); };
const statuses = ['running', 'ready', 'needs-decisions', 'failed', 'stale', 'cancelled', 'interrupted', 'applied'];
const exact = (value, keys) => { if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) fail('AI_METADATA_INVALID'); };
function reference(value, kind) {
  exact(value, ['id', 'kind', 'sha256', 'bytes']);
  if (!/^[a-f0-9-]{36}$/.test(value.id ?? '') || value.kind !== kind || !/^[a-f0-9]{64}$/.test(value.sha256 ?? '') || !Number.isSafeInteger(value.bytes) || value.bytes < 0 || value.bytes > 8 * 1024 ** 2) fail('AI_METADATA_INVALID');
}
export function validateAiMetadata(value) {
  if (value === undefined) return;
  exact(value, ['version', 'jobs', 'decisions']);
  if (value.version !== 1 || !Array.isArray(value.jobs) || !Array.isArray(value.decisions)) fail('AI_METADATA_INVALID');
  const ids = new Set();
  for (const job of value.jobs) {
    exact(job, ['id', 'phase', 'status', 'inputDigest', 'startedAt', 'completedAt', 'appliedAt', 'model', 'effort', 'includeVisuals', 'attempts', 'inputRef', 'contextRef', 'resultRef', 'errorCode', 'usage']);
    if (!/^[a-f0-9-]{36}$/.test(job.id ?? '') || ids.has(job.id) || !['analysis', 'decomposition'].includes(job.phase) || !statuses.includes(job.status) || !/^[a-f0-9]{64}$/.test(job.inputDigest ?? '') || !Number.isFinite(Date.parse(job.startedAt)) || job.model !== AI_MODEL || job.effort !== AI_EFFORT) fail('AI_METADATA_INVALID');
    ids.add(job.id); reference(job.inputRef, 'baseline'); reference(job.contextRef, 'ai');
    if (job.includeVisuals !== undefined && typeof job.includeVisuals !== 'boolean') fail('AI_METADATA_INVALID');
    if (job.attempts !== undefined && ![1, 2].includes(job.attempts)) fail('AI_METADATA_INVALID');
    if (job.resultRef) reference(job.resultRef, 'ai');
    if (['ready', 'needs-decisions', 'applied'].includes(job.status) && !job.resultRef) fail('AI_METADATA_INVALID');
    for (const key of ['completedAt', 'appliedAt']) if (job[key] !== undefined && !Number.isFinite(Date.parse(job[key]))) fail('AI_METADATA_INVALID');
    if (job.errorCode !== undefined && !/^[A-Z][A-Z0-9_]{2,80}$/.test(job.errorCode)) fail('AI_METADATA_INVALID');
    if (job.usage) { exact(job.usage, ['inputTokens', 'outputTokens']); if (Object.values(job.usage).some(value => !Number.isSafeInteger(value) || value < 0)) fail('AI_METADATA_INVALID'); }
  }
  for (const decision of value.decisions) {
    exact(decision, ['jobId', 'issueId', 'question', 'answer', 'sourceId', 'scope', 'answeredAt']);
    if (!ids.has(decision.jobId) || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/.test(decision.issueId ?? '') || decision.scope !== 'planning' && !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/.test(decision.sourceId ?? '') || decision.scope !== undefined && !['planning', 'requirements'].includes(decision.scope) || !decision.question?.trim() || typeof decision.answer !== 'string' || !decision.answer.trim() || decision.answer.length > 2000 || !Number.isFinite(Date.parse(decision.answeredAt))) fail('AI_METADATA_INVALID');
  }
}
const empty = () => ({ version: 1, jobs: [], decisions: [] });

export function createAiWorkflow({ store, commit, confirmAnalysis, applyDecomposition, baselineCurrent, contextProvider, runner, sourceFile, now = () => new Date().toISOString() }) {
  const execute = runner ?? createCliRunner();
  let active, closed = false;
  const ai = snapshot => snapshot.metadata.ai ?? empty();
  const current = snapshot => ai(snapshot).jobs.at(-1);
  const readJson = ref => JSON.parse(store.readArchive(ref));
  function proposal(job) {
    if (!job?.resultRef) return null;
    const input = { backlog: readJson(job.inputRef), metadata: { context: readJson(job.contextRef) } };
    const output = readJson(job.resultRef).output;
    return job.phase === 'analysis' ? validateAnalysisProposal(output, input) : validateDecompositionProposal(output, input);
  }
  function view(snapshot) {
    let available = true;
    if (!runner) { try { findClaudeExecutable(); } catch { available = false; } }
    const workflow = ai(snapshot), job = current(snapshot);
    let result, unavailable = false;
    try { result = proposal(job); }
    catch (error) {
      if (!/^REQUIREMENTS_/.test(error.code ?? '') && error.code !== 'AI_OUTPUT_INVALID' && !(error instanceof SyntaxError)) throw error;
      unavailable = true; result = null;
    }
    const visible = unavailable ? { ...job, status: 'unavailable', errorCode: 'AI_RECORD_UNAVAILABLE' } : job && ['ready', 'needs-decisions'].includes(job.status) && aiInputDigest(snapshot, job.phase, workflow.decisions) !== job.inputDigest ? { ...job, status: 'stale' } : job?.status === 'ready' && result?.issues.some(issue => issue.severity === 'blocking') ? { ...job, status: 'needs-decisions' } : job;
    return { available, model: AI_MODEL, effort: AI_EFFORT, current: visible ?? null, active: Boolean(active), proposal: result, decisions: workflow.decisions, history: workflow.jobs.slice(-10), inputDigests: { analysis: aiInputDigest(snapshot, 'analysis', workflow.decisions), decomposition: aiInputDigest(snapshot, 'decomposition', workflow.decisions) } };
  }
  function mark(id, mutate) {
    const snapshot = store.read();
    commit(snapshot.revision, next => { const job = next.metadata.ai?.jobs.find(job => job.id === id); if (job) mutate(job, next); });
  }
  async function begin(revision, payload) {
    if (closed) fail('AI_CLOSED');
    if (active) fail('AI_BUSY');
    const snapshot = store.read(), workflow = ai(snapshot);
    if (snapshot.revision !== revision) fail('WORKSPACE_REVISION_CONFLICT');
    if (!['analysis', 'decomposition'].includes(payload.phase)) fail('AI_PHASE_INVALID');
    if (payload.consent !== true || payload.model !== AI_MODEL) fail('AI_CONSENT_REQUIRED');
    if (payload.includeVisuals !== undefined && typeof payload.includeVisuals !== 'boolean') fail('AI_CONSENT_REQUIRED');
    const inputDigest = aiInputDigest(snapshot, payload.phase, workflow.decisions);
    if (payload.inputDigest !== inputDigest) fail('AI_STALE_INPUT');
    if (!snapshot.backlog.project.name || !snapshot.backlog.sources.length) fail('AI_SOURCES_REQUIRED');
    if (snapshot.backlog.sources.some(source => !source.classification || !source.locator?.trim() || !source.clauses?.length || source.clauses.some(clause => !clause.locator?.trim() || !clause.text?.trim()))) fail('AI_SOURCE_METADATA_REQUIRED');
    if (payload.phase === 'decomposition' && !baselineCurrent(snapshot)) fail('BASELINE_REQUIRED');
    const context = await contextProvider();
    if (context.snapshotDigest !== snapshot.metadata.context.snapshotDigest) fail('CONTEXT_CHANGED');
    const request = buildAiRequest(snapshot, payload.phase, workflow.decisions);
    if (!runner) findClaudeExecutable();
    const job = { id: randomUUID(), phase: payload.phase, status: 'running', inputDigest, startedAt: now(), model: AI_MODEL, effort: AI_EFFORT, includeVisuals: payload.includeVisuals !== false,
      inputRef: store.writeArchive('baseline', JSON.stringify(snapshot.backlog)), contextRef: store.writeArchive('ai', JSON.stringify(snapshot.metadata.context)) };
    commit(revision, next => { next.metadata.ai ??= empty(); next.metadata.ai.jobs.push(job); });
    const controller = new AbortController();
    const operation = { id: job.id, controller };
    active = operation;
    operation.promise = Promise.resolve().then(async () => {
      const scratchRoot = assertExternalWorkspace(join(store.directory, '.scratch')); mkdirSync(scratchRoot, { recursive: true, mode: 0o700 });
      const cwd = mkdtempSync(join(scratchRoot, 'ai-'));
      try {
        const visuals = job.includeVisuals ? await prepareVisualAttachments(snapshot, sourceFile, { signal: controller.signal }) : { attachments: [], sources: [] };
        request.data.visualSources = visuals.sources;
        let response, validated, attemptRequest = request;
        for (let attempt = 1; attempt <= 2; attempt++) {
          mark(job.id, stored => { stored.attempts = attempt; });
          response = await execute({ request: attemptRequest, attachments: visuals.attachments, schema: job.phase === 'analysis' ? ANALYSIS_SCHEMA : DECOMPOSITION_SCHEMA, cwd, signal: controller.signal });
          if (controller.signal.aborted || closed) return;
          if (response.model !== AI_MODEL || response.effort !== AI_EFFORT) fail('AI_MODEL_MISMATCH');
          try { validated = job.phase === 'analysis' ? validateAnalysisProposal(response.output, snapshot) : validateDecompositionProposal(response.output, snapshot); break; }
          catch (error) {
            if (error.code !== 'AI_OUTPUT_INVALID' || attempt === 2) throw error;
            const live = await contextProvider();
            if (live.snapshotDigest !== snapshot.metadata.context.snapshotDigest || aiInputDigest(store.read(), job.phase, ai(store.read()).decisions) !== inputDigest) { mark(job.id, stored => { stored.status = 'stale'; stored.completedAt = now(); }); return; }
            attemptRequest = buildCorrectionRequest(request, response.output, error.details);
          }
        }
        const resultRef = store.writeArchive('ai', JSON.stringify({ output: response.output }));
        const live = await contextProvider();
        mark(job.id, (stored, next) => {
          if (stored.status !== 'running') return;
          stored.resultRef = resultRef; stored.completedAt = now(); stored.usage = response.usage;
          stored.status = live.snapshotDigest !== snapshot.metadata.context.snapshotDigest || aiInputDigest(next, job.phase, ai(next).decisions) !== inputDigest ? 'stale' : validated.issues.some(issue => issue.severity === 'blocking') ? 'needs-decisions' : 'ready';
        });
      } finally {
        // The path is allocated by this operation inside the external workspace.
        // Revalidate ownership/boundary before recursively removing its empty CLI cwd.
        assertExternalWorkspace(cwd); rmSync(cwd, { recursive: true, force: true });
      }
    }).catch(error => {
      try { mark(job.id, stored => { if (stored.status !== 'running') return; stored.status = controller.signal.aborted ? 'cancelled' : 'failed'; stored.completedAt = now(); stored.errorCode = /^AI_[A-Z_]{2,70}$/.test(error.code ?? '') ? error.code : 'AI_RUN_FAILED'; }); }
      catch { /* A foreign edit/lock loss must never be overwritten to save status. */ }
    }).finally(() => { if (active === operation) active = undefined; });
  }
  async function action(revision, name, payload) {
    const snapshot = store.read();
    if (snapshot.revision !== revision) fail('WORKSPACE_REVISION_CONFLICT');
    const job = current(snapshot);
    if (name === 'ai.start') { exact(payload, ['phase', 'inputDigest', 'consent', 'model', 'includeVisuals']); await begin(revision, payload); return; }
    if (!job || payload.jobId !== job.id) fail('AI_JOB_REQUIRED');
    if (name === 'ai.cancel') {
      exact(payload, ['jobId']);
      if (job.status !== 'running' || active?.id !== job.id) fail('AI_NOT_RUNNING');
      active.controller.abort(); mark(job.id, stored => { stored.status = 'cancelled'; stored.completedAt = now(); }); return;
    }
    if (job.status === 'stale' || aiInputDigest(snapshot, job.phase, ai(snapshot).decisions) !== job.inputDigest) fail('AI_STALE_RESULT');
    if (!['ready', 'needs-decisions'].includes(job.status)) fail('AI_RESULT_REQUIRED');
    const value = proposal(job);
    if (name === 'ai.answer') {
      exact(payload, ['jobId', 'answers', 'continueWithAI', 'scope']);
      if (payload.scope !== undefined && !['requirements', 'planning'].includes(payload.scope) || payload.scope === 'planning' && job.phase !== 'decomposition') fail('AI_ANSWERS_REQUIRED');
      const planningOnly = payload.scope === 'planning';
      if (!Array.isArray(payload.answers) || !payload.answers.length || new Set(payload.answers.map(answer => answer.issueId)).size !== payload.answers.length) fail('AI_ANSWERS_REQUIRED');
      for (const answer of payload.answers) { exact(answer, ['issueId', 'answer']); if (!value.issues.some(issue => issue.id === answer.issueId) || typeof answer.answer !== 'string' || !answer.answer.trim() || answer.answer.length > 2000) fail('AI_ANSWERS_REQUIRED'); }
      if (value.issues.some(issue => issue.severity === 'blocking' && !payload.answers.some(answer => answer.issueId === issue.id))) fail('AI_ANSWERS_REQUIRED');
      commit(revision, next => {
        for (const answer of payload.answers) {
          const issue = value.issues.find(issue => issue.id === answer.issueId), sourceId = `DEC-${randomUUID()}`;
          next.metadata.ai.decisions.push({ jobId: job.id, issueId: issue.id, question: issue.question, answer: answer.answer.trim(), scope: planningOnly ? 'planning' : 'requirements', ...(!planningOnly ? { sourceId } : {}), answeredAt: now() });
          if (!planningOnly) next.backlog.sources.push({ id: sourceId, title: `사용자 결정: ${issue.id}`, sourceType: 'policy-memo', classification: 'internal', locator: `사용자 결정 ${now()}`, clauses: [{ id: 'DECISION', text: `${issue.question}\n결정: ${answer.answer.trim()}`, locator: '사용자 답변', disposition: 'question', rationale: 'AI가 반영할 사용자 결정', requirementIds: [] }] });
        }
      });
      if (payload.continueWithAI === true) {
        const next = store.read(), phase = planningOnly ? 'decomposition' : 'analysis'; await begin(next.revision, { phase, consent: true, model: AI_MODEL, includeVisuals: job.includeVisuals !== false, inputDigest: aiInputDigest(next, phase, ai(next).decisions) });
      }
      return;
    }
    if (name === 'ai.confirm') {
      exact(payload, ['jobId', 'continueWithAI', 'confirmedScopeChanges', 'confirmedRetirements']);
      if (value.issues.some(issue => issue.severity === 'blocking')) fail('AI_DECISIONS_REQUIRED');
      const verifyAcknowledgments = (supplied, required) => {
        if (supplied === undefined && !required.length) return;
        if (!Array.isArray(supplied) || new Set(supplied).size !== supplied.length || supplied.length !== required.length || required.some(id => !supplied.includes(id))) fail('AI_CHANGE_REVIEW_REQUIRED');
      };
      verifyAcknowledgments(payload.confirmedScopeChanges, value.changes.filter(change => change.requiresScopeReview).map(change => change.id));
      verifyAcknowledgments(payload.confirmedRetirements, (value.retirements ?? []).map(item => `${item.entity}:${item.id}`));
      if (job.phase === 'decomposition' && !baselineCurrent(snapshot)) fail('BASELINE_REQUIRED');
      const live = await contextProvider();
      if (live.snapshotDigest !== snapshot.metadata.context.snapshotDigest) fail('CONTEXT_CHANGED');
      commit(revision, next => {
        if (job.phase === 'analysis') confirmAnalysis(next, value);
        else applyDecomposition(next, value);
        const stored = next.metadata.ai.jobs.find(item => item.id === job.id); stored.status = 'applied'; stored.appliedAt = now();
      });
      if (job.phase === 'analysis' && payload.continueWithAI === true) {
        const next = store.read(); await begin(next.revision, { phase: 'decomposition', consent: true, model: AI_MODEL, includeVisuals: job.includeVisuals !== false, inputDigest: aiInputDigest(next, 'decomposition', ai(next).decisions) });
      }
      return;
    }
    fail('ACTION_UNSUPPORTED');
  }
  const initial = store.read();
  if (ai(initial).jobs.some(job => job.status === 'running')) commit(initial.revision, next => { for (const job of next.metadata.ai.jobs) if (job.status === 'running') { job.status = 'interrupted'; job.completedAt = now(); } });
  return { view, action, async waitForIdle() { while (active) await active.promise; }, async close() { closed = true; active?.controller.abort(); while (active) await active.promise; } };
}
