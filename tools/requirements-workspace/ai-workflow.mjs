import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ANALYSIS_SCHEMA, BATCH_ANALYSIS_SCHEMA, DECOMPOSITION_SCHEMA, aiInputDigest, buildAiRequest, buildCorrectionRequest, seedAnalysis, validateAnalysisProposal, validateAnalysisBatchProposal, validateDecompositionProposal, projectAnalysisBacklog, safeValidationFailures } from './ai-contract.mjs';
import { planAnalysisBatches, MAX_ANALYSIS_BATCHES } from './ai-analysis-batches.mjs';
import { AI_MODEL, AI_EFFORT, AI_ANALYSIS_EFFORT, aiEffortForPhase, createCliRunner, findClaudeExecutable } from './ai-cli.mjs';
import { assertExternalWorkspace } from './store.mjs';
import { prepareVisualAttachments } from './ai-attachments.mjs';
import { PROMPT_VERSION } from './ai-prompts.mjs';
import { prepareBusinessModel, documentAnchors, reviewRequirements, planAndReview, buildTaskPreview } from './ai-pipeline.mjs';
import { validateBusinessModel, validateDocumentSummaries, mergeIssues } from './ai-pipeline-contract.mjs';
import { collectSensitivityWarnings, mergeSensitivityWarnings, validateSensitivityWarnings } from './privacy-warnings.mjs';
import { prepareEvidenceRequest } from './ai-evidence.mjs';

const fail = code => { throw Object.assign(new Error(code), { code }); };
const statuses = ['running', 'ready', 'needs-decisions', 'failed', 'stale', 'cancelled', 'interrupted', 'applied'];
const checkpointKeys = ['discovery', 'analysis', 'review', 'planning'];
const checkpointPhases = { discovery: ['reading', 'synthesis'], analysis: ['analysis'], review: ['review-requirements'], planning: ['decomposition', 'review-plan'] };
const exact = (value, keys) => { if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) fail('AI_METADATA_INVALID'); };
function reference(value, kind) {
  exact(value, ['id', 'kind', 'sha256', 'bytes']);
  if (!/^[a-f0-9-]{36}$/.test(value.id ?? '') || value.kind !== kind || !/^[a-f0-9]{64}$/.test(value.sha256 ?? '') || !Number.isSafeInteger(value.bytes) || value.bytes < 0 || value.bytes > 8 * 1024 ** 2) fail('AI_METADATA_INVALID');
}
const metricFields = ['requests', 'corrections', 'reusedResponses', 'inputBytes', 'logicalInputBytes', 'outputBytes', 'measuredOutputs', 'modelWaitMs', 'peakConcurrency', 'cacheReadInputTokens', 'cacheCreationInputTokens', 'cacheReports'];
const emptyCallMetrics = () => ({ version: 1, ...Object.fromEntries(metricFields.map(field => [field, 0])), activeCalls: [] });
function validateCallMetrics(value, job) {
  exact(value, ['version', ...metricFields, 'activeCalls']);
  if (!job.fullPipeline || value.version !== 1 || metricFields.some(field => !Number.isSafeInteger(value[field]) || value[field] < 0) || value.requests !== job.modelCalls || value.requests > 256 || value.corrections > value.requests || value.measuredOutputs > value.requests || value.cacheReports > value.requests || value.peakConcurrency > 2 || !Array.isArray(value.activeCalls) || value.activeCalls.length > value.peakConcurrency || !value.requests && (value.inputBytes || value.logicalInputBytes || value.outputBytes || value.modelWaitMs || value.peakConcurrency)) fail('AI_METADATA_INVALID');
  const ids = new Set();
  for (const call of value.activeCalls) {
    exact(call, ['call', 'stage', 'batch', 'startedAt']);
    if (!Number.isSafeInteger(call.call) || call.call < 1 || call.call > value.requests || ids.has(call.call) || !Object.values(checkpointPhases).flat().includes(call.stage) || call.batch !== null && (!Number.isSafeInteger(call.batch) || call.batch < 1 || call.batch > 3000) || !Number.isFinite(Date.parse(call.startedAt))) fail('AI_METADATA_INVALID');
    ids.add(call.call);
  }
}
export function validateAiMetadata(value) {
  if (value === undefined) return;
  exact(value, ['version', 'jobs', 'decisions']);
  if (value.version !== 1 || !Array.isArray(value.jobs) || !Array.isArray(value.decisions)) fail('AI_METADATA_INVALID');
  const ids = new Set();
  for (const job of value.jobs) {
    exact(job, ['id', 'phase', 'status', 'inputDigest', 'startedAt', 'completedAt', 'appliedAt', 'model', 'effort', 'includeVisuals', 'attempts', 'batches', 'inputRef', 'contextRef', 'resultRef', 'errorCode', 'usage', 'fullPipeline', 'promptVersion', 'stage', 'stageProgress', 'modelCalls', 'checkpoints', 'reusedStages', 'resumeFrom', 'promptRefs', 'sensitivityWarnings', 'validationFailures', 'callMetrics']);
    try { validateSensitivityWarnings(job.sensitivityWarnings ?? []); } catch { fail('AI_METADATA_INVALID'); }
    if (!/^[a-f0-9-]{36}$/.test(job.id ?? '') || ids.has(job.id) || !['analysis', 'decomposition'].includes(job.phase) || !statuses.includes(job.status) || !/^[a-f0-9]{64}$/.test(job.inputDigest ?? '') || !Number.isFinite(Date.parse(job.startedAt)) || job.model !== AI_MODEL || ![AI_EFFORT, AI_ANALYSIS_EFFORT].includes(job.effort)) fail('AI_METADATA_INVALID');
    ids.add(job.id); reference(job.inputRef, 'baseline'); reference(job.contextRef, 'ai');
    if (job.includeVisuals !== undefined && typeof job.includeVisuals !== 'boolean') fail('AI_METADATA_INVALID');
    if (job.fullPipeline !== undefined && typeof job.fullPipeline !== 'boolean' || job.fullPipeline && job.phase !== 'analysis' || job.promptVersion !== undefined && !/^[A-Za-z0-9_.-]{1,64}$/.test(job.promptVersion)) fail('AI_METADATA_INVALID');
    if (job.stage !== undefined && !['reading', 'synthesis', 'analysis', 'review-requirements', 'decomposition', 'review-plan'].includes(job.stage)) fail('AI_METADATA_INVALID');
    if (job.modelCalls !== undefined && (!Number.isSafeInteger(job.modelCalls) || job.modelCalls < 0 || job.modelCalls > 256)) fail('AI_METADATA_INVALID');
    if (job.callMetrics !== undefined) validateCallMetrics(job.callMetrics, job);
    if (job.stageProgress) { exact(job.stageProgress, ['completed', 'total']); if (!Number.isSafeInteger(job.stageProgress.total) || job.stageProgress.total < 0 || job.stageProgress.total > 3000 || !Number.isSafeInteger(job.stageProgress.completed) || job.stageProgress.completed < 0 || job.stageProgress.completed > job.stageProgress.total) fail('AI_METADATA_INVALID'); }
    if (job.checkpoints) { exact(job.checkpoints, checkpointKeys); for (const ref of Object.values(job.checkpoints)) reference(ref, 'ai'); }
    if (job.reusedStages !== undefined && (!Array.isArray(job.reusedStages) || new Set(job.reusedStages).size !== job.reusedStages.length || job.reusedStages.some(stage => !checkpointKeys.includes(stage)))) fail('AI_METADATA_INVALID');
    if (job.resumeFrom !== undefined && !/^[a-f0-9-]{36}$/.test(job.resumeFrom)) fail('AI_METADATA_INVALID');
    if (job.promptRefs !== undefined) {
      if (!Array.isArray(job.promptRefs) || job.promptRefs.length > 64) fail('AI_METADATA_INVALID');
      for (const item of job.promptRefs) { exact(item, ['stage', 'sha256', 'ref']); if (!['reading', 'synthesis', 'analysis', 'review-requirements', 'decomposition', 'review-plan'].includes(item.stage) || !/^[a-f0-9]{64}$/.test(item.sha256)) fail('AI_METADATA_INVALID'); reference(item.ref, 'ai'); }
    }
    if (job.attempts !== undefined && ![1, 2].includes(job.attempts)) fail('AI_METADATA_INVALID');
    if (job.batches !== undefined) { exact(job.batches, ['completed', 'total']); if (job.phase !== 'analysis' || !Number.isSafeInteger(job.batches.total) || job.batches.total < 1 || job.batches.total > MAX_ANALYSIS_BATCHES || !Number.isSafeInteger(job.batches.completed) || job.batches.completed < 0 || job.batches.completed > job.batches.total) fail('AI_METADATA_INVALID'); }
    if (job.resultRef) reference(job.resultRef, 'ai');
    if (['ready', 'needs-decisions', 'applied'].includes(job.status) && !job.resultRef) fail('AI_METADATA_INVALID');
    for (const key of ['completedAt', 'appliedAt']) if (job[key] !== undefined && !Number.isFinite(Date.parse(job[key]))) fail('AI_METADATA_INVALID');
    if (job.errorCode !== undefined && !/^[A-Z][A-Z0-9_]{2,80}$/.test(job.errorCode)) fail('AI_METADATA_INVALID');
    if (job.validationFailures !== undefined) {
      if (job.status !== 'failed' || job.errorCode !== 'AI_OUTPUT_INVALID' || !Array.isArray(job.validationFailures) || !job.validationFailures.length || job.validationFailures.length > 10) fail('AI_METADATA_INVALID');
      for (const item of job.validationFailures) { exact(item, ['kind', 'path']); const safe = safeValidationFailures([item])[0]; if (item.kind !== safe.kind || item.path !== safe.path) fail('AI_METADATA_INVALID'); }
    }
    if (job.usage) { exact(job.usage, ['inputTokens', 'outputTokens']); if (Object.values(job.usage).some(value => !Number.isSafeInteger(value) || value < 0)) fail('AI_METADATA_INVALID'); }
  }
  for (const decision of value.decisions) {
    exact(decision, ['jobId', 'issueId', 'question', 'answer', 'sourceId', 'scope', 'answeredAt']);
    if (!ids.has(decision.jobId) || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/.test(decision.issueId ?? '') || decision.scope !== 'planning' && !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/.test(decision.sourceId ?? '') || decision.scope !== undefined && !['planning', 'requirements'].includes(decision.scope) || !decision.question?.trim() || typeof decision.answer !== 'string' || !decision.answer.trim() || decision.answer.length > 2000 || !Number.isFinite(Date.parse(decision.answeredAt))) fail('AI_METADATA_INVALID');
  }
}
const empty = () => ({ version: 1, jobs: [], decisions: [] });

export function createAiWorkflow({ store, commit, confirmAnalysis, applyDecomposition, completePipeline, baselineCurrent, contextProvider, runner, sourceFile, sourceReading, now = () => new Date().toISOString() }) {
  const execute = runner ?? createCliRunner();
  let active, closed = false, planCache;
  const ai = snapshot => snapshot.metadata.ai ?? empty();
  const current = snapshot => ai(snapshot).jobs.at(-1);
  const readJson = ref => JSON.parse(store.readArchive(ref));
  function proposal(job) {
    if (!job?.resultRef) return null;
    const input = { backlog: readJson(job.inputRef), metadata: { context: readJson(job.contextRef) } };
    const record = readJson(job.resultRef), output = record.output;
    const result = job.phase === 'analysis' ? validateAnalysisProposal(output, input) : validateDecompositionProposal(output, input);
    const audit = record.batchAudit ?? [], ids = new Set(result.requirements?.map(req => req.id) ?? []), clauses = new Set(input.backlog.sources.flatMap(source => source.clauses.map(clause => `${source.id}/${clause.id}`)));
    const shape = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));
    if (!Array.isArray(audit) || audit.length > MAX_ANALYSIS_BATCHES || audit.some((entry, index) => !shape(entry, ['batch', 'requirementIds', 'coverageChanges']) || !Number.isInteger(entry.batch) || entry.batch < 1 || entry.batch > MAX_ANALYSIS_BATCHES || index && audit[index - 1].batch >= entry.batch || !Array.isArray(entry.requirementIds) || new Set(entry.requirementIds).size !== entry.requirementIds.length || entry.requirementIds.some(id => !ids.has(id)) || !Array.isArray(entry.coverageChanges) || entry.coverageChanges.length > 3000 || entry.coverageChanges.some(change => !shape(change, ['sourceId', 'clauseId', 'beforeDisposition', 'beforeRationale', 'afterDisposition', 'afterRationale']) || !clauses.has(`${change.sourceId}/${change.clauseId}`) || !['included', 'merged', 'excluded', 'deferred'].includes(change.beforeDisposition) || !['included', 'merged', 'excluded', 'deferred'].includes(change.afterDisposition) || ['beforeRationale', 'afterRationale'].some(key => typeof change[key] !== 'string' || !change[key].trim() || change[key].length > 2000)))) fail('AI_OUTPUT_INVALID');
    if (!job.fullPipeline) return { ...result, batchAudit: audit };
    const pipeline = record.pipeline;
    if (!pipeline || !Array.isArray(pipeline.documents) || pipeline.documents.length !== input.backlog.sources.length) fail('AI_OUTPUT_INVALID');
    validateDocumentSummaries(pipeline.documents, input);
    const businessModel = validateBusinessModel(pipeline.businessModel, input, input.backlog.sources.map(source => source.id));
    if (!pipeline.planningOutput) return { ...result, batchAudit: audit, fullPipeline: true, businessModel, documents: pipeline.documents, taskPreview: '' };
    const draft = { ...input, backlog: projectAnalysisBacklog(input, result) };
    const planned = validateDecompositionProposal(pipeline.planningOutput, draft);
    const taskPreview = buildTaskPreview({ ...draft.backlog, workItems: planned.workItems, acceptanceCriteria: planned.acceptanceCriteria, traceLinks: planned.traceLinks }, input.metadata.context, mergeIssues(result.issues, planned.issues));
    return { ...result, ...planned, requirements: result.requirements, changes: [...result.changes, ...planned.changes], issues: mergeIssues(result.issues, planned.issues), batchAudit: audit, fullPipeline: true, businessModel, documents: pipeline.documents, taskPreview };
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
    const inputDigests = { analysis: aiInputDigest(snapshot, 'analysis', workflow.decisions), decomposition: aiInputDigest(snapshot, 'decomposition', workflow.decisions) };
    if (planCache?.digest !== inputDigests.analysis) {
      try { const batches = planAnalysisBatches(snapshot, workflow.decisions); if (batches.length > 1) seedAnalysis(snapshot); planCache = { digest: inputDigests.analysis, value: { batches: batches.length } }; }
      catch (error) { planCache = { digest: inputDigests.analysis, value: { errorCode: /^[A-Z][A-Z_]+$/.test(error.code ?? '') ? error.code : 'AI_RUN_FAILED' } }; }
    }
    return { available, model: AI_MODEL, effort: AI_ANALYSIS_EFFORT, readingEffort: AI_EFFORT, current: visible ?? null, active: Boolean(active), proposal: result, decisions: workflow.decisions, history: workflow.jobs.slice(-10), analysisPlan: planCache.value, inputDigests };
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
    if (payload.fullPipeline !== undefined && typeof payload.fullPipeline !== 'boolean' || payload.fullPipeline && payload.phase !== 'analysis') fail('AI_PHASE_INVALID');
    if (payload.reuseCheckpoints !== undefined && typeof payload.reuseCheckpoints !== 'boolean') fail('AI_PHASE_INVALID');
    const inputDigest = aiInputDigest(snapshot, payload.phase, workflow.decisions);
    if (payload.inputDigest !== inputDigest) fail('AI_STALE_INPUT');
    if (!snapshot.backlog.project.name || !snapshot.backlog.sources.length) fail('AI_SOURCES_REQUIRED');
    if (snapshot.backlog.sources.some(source => !source.classification || !source.locator?.trim() || !source.clauses?.length || source.clauses.some(clause => !clause.locator?.trim() || !clause.text?.trim()))) fail('AI_SOURCE_METADATA_REQUIRED');
    if (payload.phase === 'decomposition' && !baselineCurrent(snapshot)) fail('BASELINE_REQUIRED');
    const context = await contextProvider();
    if (context.snapshotDigest !== snapshot.metadata.context.snapshotDigest) fail('CONTEXT_CHANGED');
    const batches = payload.phase === 'analysis' ? planAnalysisBatches(snapshot, workflow.decisions) : null;
    const initialAnalysis = batches?.length > 1 ? seedAnalysis(snapshot) : undefined;
    const jobId = randomUUID();
    const batchOptions = index => batches?.length > 1 ? { sources: batches[index], batch: { index: index + 1, total: batches.length, idPrefix: `B${jobId.slice(0, 8)}-${index + 1}-` } } : {};
    let analysisEvidence;
    if (payload.phase === 'decomposition') {
      const reviewed = workflow.jobs.findLast(job => job.phase === 'analysis' && job.status === 'applied');
      try { analysisEvidence = proposal(reviewed); } catch (error) { if (!/^REQUIREMENTS_/.test(error.code ?? '') && error.code !== 'AI_OUTPUT_INVALID' && !(error instanceof SyntaxError)) throw error; }
    }
    const request = buildAiRequest(snapshot, payload.phase, workflow.decisions, { ...batchOptions(0), previousAnalysis: initialAnalysis, analysisEvidence, evidenceReferences: payload.fullPipeline === true });
    if (!runner) findClaudeExecutable();
    const resumable = payload.fullPipeline && payload.reuseCheckpoints !== false && workflow.jobs.findLast(job => job.fullPipeline && job.effort === AI_ANALYSIS_EFFORT && job.promptVersion === PROMPT_VERSION && job.inputDigest === inputDigest && job.checkpoints && Object.keys(job.checkpoints).length);
    const callMetrics = payload.fullPipeline ? emptyCallMetrics() : null;
    const job = { id: jobId, phase: payload.phase, status: 'running', inputDigest, startedAt: now(), model: AI_MODEL, effort: AI_ANALYSIS_EFFORT, includeVisuals: payload.includeVisuals !== false, promptVersion: PROMPT_VERSION, ...(payload.fullPipeline ? { fullPipeline: true, stage: 'reading', modelCalls: 0, callMetrics: structuredClone(callMetrics), promptRefs: [], checkpoints: structuredClone(resumable?.checkpoints ?? {}), reusedStages: [], ...(resumable ? { resumeFrom: resumable.id } : {}) } : {}),
      ...(batches?.length > 1 ? { batches: { completed: 0, total: batches.length } } : {}), sensitivityWarnings: collectSensitivityWarnings({ backlog: snapshot.backlog, decisions: workflow.decisions }), inputRef: store.writeArchive('baseline', JSON.stringify(snapshot.backlog)), contextRef: store.writeArchive('ai', JSON.stringify(snapshot.metadata.context)) };
    commit(revision, next => { next.metadata.ai ??= empty(); next.metadata.ai.jobs.push(job); });
    const controller = new AbortController();
    const operation = { id: job.id, controller };
    active = operation;
    operation.promise = Promise.resolve().then(async () => {
      const scratchRoot = assertExternalWorkspace(join(store.directory, '.scratch')); mkdirSync(scratchRoot, { recursive: true, mode: 0o700 });
      const cwd = mkdtempSync(join(scratchRoot, 'ai-'));
      try {
        let corrected = false, runCorrected = false, validated, output = initialAnalysis, pipeline;
        const batchAudit = [];
        const usage = { inputTokens: 0, outputTokens: 0 };
        const writeMetrics = () => { if (callMetrics) mark(job.id, stored => { stored.callMetrics = structuredClone(callMetrics); }); };
        const reusedResponse = () => { if (callMetrics) { callMetrics.reusedResponses++; writeMetrics(); } };
        const isCurrent = async () => {
          if (controller.signal.aborted || closed) return false;
          const live = await contextProvider();
          if (controller.signal.aborted || closed) return false;
          const state = store.read();
          if (live.snapshotDigest === snapshot.metadata.context.snapshotDigest && aiInputDigest(state, job.phase, ai(state).decisions) === inputDigest) return true;
          mark(job.id, stored => { if (stored.status === 'running') { stored.status = 'stale'; stored.completedAt = now(); } }); return false;
        };
        const onStage = (stage, completed, total) => mark(job.id, stored => { if (stored.status === 'running') { stored.stage = stage; stored.stageProgress = { completed, total }; } });
        const onValidated = (stage, value) => {
          const warnings = collectSensitivityWarnings(value, stage);
          if (warnings.length) mark(job.id, stored => { if (stored.status === 'running') stored.sensitivityWarnings = mergeSensitivityWarnings(stored.sensitivityWarnings, warnings); });
        };
        const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
        const checkpointWarnings = new Map();
        const restoreCheckpointWarnings = stage => {
          if (!checkpointWarnings.has(stage)) return false;
          mark(job.id, stored => { if (stored.status === 'running') stored.sensitivityWarnings = mergeSensitivityWarnings(stored.sensitivityWarnings, checkpointWarnings.get(stage)); });
          return true;
        };
        const readCheckpoint = (stage, upstream) => {
          const ref = job.checkpoints?.[stage]; if (!ref) return null;
          const value = readJson(ref);
          if (value.version !== 1 || value.stage !== stage || value.inputDigest !== inputDigest || value.promptVersion !== PROMPT_VERSION) fail('AI_CHECKPOINT_INVALID');
          if (value.upstreamDigest !== hash(upstream)) return null;
          if (value.sensitivityWarnings !== undefined) {
            try { validateSensitivityWarnings(value.sensitivityWarnings); } catch { fail('AI_CHECKPOINT_INVALID'); }
            if (value.sensitivityWarnings.some(warning => !checkpointPhases[stage].includes(warning.stage))) fail('AI_CHECKPOINT_INVALID');
            checkpointWarnings.set(stage, value.sensitivityWarnings);
          }
          mark(job.id, stored => { if (stored.status === 'running') stored.reusedStages = [...new Set([...stored.reusedStages, stage])]; });
          return value.output;
        };
        const saveCheckpoint = (stage, upstream, value, mutate = () => {}) => {
          const sensitivityWarnings = (current(store.read()).sensitivityWarnings ?? []).filter(warning => checkpointPhases[stage].includes(warning.stage));
          const ref = store.writeArchive('ai', JSON.stringify({ version: 1, stage, inputDigest, promptVersion: PROMPT_VERSION, upstreamDigest: hash(upstream), output: value, sensitivityWarnings }));
          mark(job.id, stored => { if (stored.status === 'running') { stored.checkpoints[stage] = ref; mutate(stored); } });
          job.checkpoints[stage] = ref;
        };
        let modelCalls = 0;
        const sentPrompts = new Set();
        const run = async args => {
          if (!await isCurrent()) fail('AI_STALE_INPUT');
          if (modelCalls >= 256) fail('AI_CALL_CAPACITY');
          const evidence = job.fullPipeline && !['reading', 'synthesis'].includes(args.request.phase) ? prepareEvidenceRequest(args.request, args.schema) : null;
          const wire = evidence ? { ...args, request: evidence.request, schema: evidence.schema } : args;
          const inputBytes = Buffer.byteLength(JSON.stringify(wire.request));
          if (inputBytes > (job.fullPipeline ? 768 * 1024 : 1024 ** 2)) fail('AI_INPUT_TOO_LARGE');
          if (job.fullPipeline) {
            const prompt = { version: PROMPT_VERSION, stage: wire.request.phase, instructions: wire.request.instructions, schema: wire.schema };
            const sha256 = hash(prompt);
            if (!sentPrompts.has(sha256)) {
              const ref = store.writeArchive('ai', JSON.stringify(prompt)); sentPrompts.add(sha256);
              if (sentPrompts.size > 64) fail('AI_PROMPT_CAPACITY');
              mark(job.id, stored => { if (stored.status === 'running') stored.promptRefs.push({ stage: prompt.stage, sha256, ref }); });
            }
          }
          let ticket = null;
          if (callMetrics) {
            if (callMetrics.activeCalls.length >= 2) fail('AI_CALL_CONCURRENCY');
            ticket = ++modelCalls; callMetrics.requests = modelCalls;
            callMetrics.corrections += args.request.data?.correction ? 1 : 0;
            callMetrics.inputBytes += inputBytes; callMetrics.logicalInputBytes += evidence ? Buffer.byteLength(JSON.stringify(args.request)) : inputBytes;
            callMetrics.activeCalls.push({ call: ticket, stage: args.request.phase, batch: args.request.data?.analysisBatch?.index ?? args.request.data?.planningBatch?.index ?? args.request.data?.reviewBatch?.index ?? args.request.data?.batch?.index ?? null, startedAt: now() });
            callMetrics.peakConcurrency = Math.max(callMetrics.peakConcurrency, callMetrics.activeCalls.length);
            mark(job.id, stored => { stored.modelCalls = modelCalls; stored.callMetrics = structuredClone(callMetrics); });
          }
          let response, waitMs = 0; const began = performance.now();
          try {
            try { response = await execute(wire); } finally { waitMs = Math.max(0, Math.round(performance.now() - began)); }
            if (response.model !== AI_MODEL || response.effort !== aiEffortForPhase(args.request.phase)) fail('AI_MODEL_MISMATCH');
            usage.inputTokens += response.usage?.inputTokens ?? 0; usage.outputTokens += response.usage?.outputTokens ?? 0; operation.usage = { ...usage };
            if (!await isCurrent()) fail('AI_STALE_INPUT');
            return evidence ? { ...response, output: evidence.resolve(response.output) } : response;
          } finally {
            if (callMetrics) {
              callMetrics.modelWaitMs += waitMs; callMetrics.activeCalls = callMetrics.activeCalls.filter(call => call.call !== ticket);
              const telemetry = response && Object.getOwnPropertyDescriptor(response, 'telemetry')?.value;
              const numeric = key => { try { const value = telemetry && Object.getOwnPropertyDescriptor(telemetry, key)?.value; return Number.isSafeInteger(value) && value >= 0 && value <= 1024 ** 3 ? value : undefined; } catch { return undefined; } };
              const outputBytes = numeric('outputBytes'), cacheRead = numeric('cacheReadInputTokens'), cacheCreated = numeric('cacheCreationInputTokens');
              if (outputBytes !== undefined && outputBytes <= 8 * 1024 ** 2) { callMetrics.outputBytes += outputBytes; callMetrics.measuredOutputs++; }
              if (cacheRead !== undefined || cacheCreated !== undefined) { callMetrics.cacheReadInputTokens += cacheRead ?? 0; callMetrics.cacheCreationInputTokens += cacheCreated ?? 0; callMetrics.cacheReports++; }
              writeMetrics();
            }
          }
        };
        if (job.fullPipeline) {
          pipeline = readCheckpoint('discovery', inputDigest);
          if (pipeline) {
            validateBusinessModel(pipeline.businessModel, snapshot, snapshot.backlog.sources.map(source => source.id));
            let refreshedAnchors = false;
            try { validateDocumentSummaries(pipeline.documents, snapshot); }
            catch (error) {
              if (error.code !== 'AI_OUTPUT_INVALID' || !error.details?.some(detail => detail.kind === 'citation-quote')) throw error;
              pipeline = { ...pipeline, documents: pipeline.documents.map(doc => {
                const source = snapshot.backlog.sources.find(source => source.id === doc.sourceId);
                return source ? { ...doc, anchors: documentAnchors(source) } : doc;
              }) };
              validateDocumentSummaries(pipeline.documents, snapshot); refreshedAnchors = true;
            }
            if (!restoreCheckpointWarnings('discovery')) { onValidated('reading', pipeline.documents); onValidated('synthesis', pipeline.businessModel); }
            if (refreshedAnchors) saveCheckpoint('discovery', inputDigest, pipeline);
          }
          else { pipeline = await prepareBusinessModel(snapshot, { run, cwd, signal: controller.signal, sourceReading, onStage, onValidated }); saveCheckpoint('discovery', inputDigest, pipeline); }
        }
        let startIndex = 0;
        const analysisUpstream = pipeline?.businessModel;
        const validateAnalysisCheckpoint = cached => {
          const total = batches?.length ?? 1;
          if (cached.total !== total || !Number.isInteger(cached.completed) || cached.completed < 1 || cached.completed > total || typeof cached.corrected !== 'boolean' || !Array.isArray(cached.batchAudit)) fail('AI_CHECKPOINT_INVALID');
          if (cached.completed === total) validateAnalysisProposal(cached.output, snapshot);
          else {
            const processed = new Map();
            for (const batch of batches.slice(0, cached.completed)) for (const src of batch) { const old = processed.get(src.id); if (old) old.clauses.push(...src.clauses); else processed.set(src.id, structuredClone(src)); }
            const updates = snapshot.backlog.businessRequirements.map(req => req.id).filter(id => cached.output.requirements.some(req => req.id === id));
            validateAnalysisBatchProposal({ ...cached.output, updatedRequirementIds: updates }, snapshot, [...processed.values()], initialAnalysis);
          }
        };
        if (pipeline) {
          const cached = readCheckpoint('analysis', analysisUpstream);
          if (cached) {
            const total = batches?.length ?? 1;
            validateAnalysisCheckpoint(cached);
            output = cached.output; startIndex = cached.completed; corrected = cached.corrected; batchAudit.push(...cached.batchAudit);
            if (!restoreCheckpointWarnings('analysis')) onValidated('analysis', output);
            if (batches?.length > 1) mark(job.id, stored => { if (stored.status === 'running') stored.batches.completed = startIndex; });
            onStage('analysis', startIndex, total);
          }
        }
        // The same aggregate is required by the later quality review. Reject a
        // known capacity failure before paying to analyze any remaining source.
        if (pipeline) mergeIssues(output?.issues ?? [], pipeline.businessModel.issues);
        for (let index = startIndex; index < (batches?.length ?? 1); index++) {
          if (pipeline) onStage('analysis', index, batches?.length ?? 1);
          if (!await isCurrent()) return;
          const currentRequest = index === 0 ? structuredClone(request) : buildAiRequest(snapshot, job.phase, workflow.decisions, { ...batchOptions(index), previousAnalysis: output, evidenceReferences: Boolean(pipeline) });
          if (pipeline) currentRequest.data.businessModel = pipeline.businessModel;
          const batchSnapshot = { ...snapshot, backlog: { ...snapshot.backlog, sources: currentRequest.data.sources } };
          const visuals = job.includeVisuals && !job.fullPipeline ? await prepareVisualAttachments(batchSnapshot, sourceFile, { signal: controller.signal }) : { attachments: [], sources: [] };
          currentRequest.data.visualSources = visuals.sources;
          let attemptRequest = currentRequest, next, delta, batchCorrected = false;
          for (;;) {
            if (!await isCurrent()) return;
            if (current(store.read()).attempts !== (runCorrected ? 2 : 1)) mark(job.id, stored => { stored.attempts = runCorrected ? 2 : 1; });
            if (controller.signal.aborted || closed) return;
            let response;
            try {
              response = await run({ request: attemptRequest, attachments: visuals.attachments, schema: job.phase === 'analysis' ? batches?.length > 1 ? BATCH_ANALYSIS_SCHEMA : ANALYSIS_SCHEMA : DECOMPOSITION_SCHEMA, cwd, signal: controller.signal });
              if (!await isCurrent()) return;
              if (response.model !== AI_MODEL || response.effort !== aiEffortForPhase(attemptRequest.phase)) fail('AI_MODEL_MISMATCH');
              delta = response.output;
              next = batches?.length > 1 ? validateAnalysisBatchProposal(response.output, snapshot, batches[index], output, { idPrefix: currentRequest.data.analysisBatch.idPrefix }) : response.output;
              if (!(batches?.length > 1) || index === batches.length - 1) validated = job.phase === 'analysis' ? validateAnalysisProposal(next, snapshot) : validateDecompositionProposal(next, snapshot);
              break;
            } catch (error) {
              if (controller.signal.aborted || closed) return;
              if (error.code !== 'AI_OUTPUT_INVALID' || batchCorrected || safeValidationFailures(error.details).some(detail => detail.kind === 'output-size')) throw error;
              attemptRequest = buildCorrectionRequest(currentRequest, response?.output, error.details, { evidenceReferences: Boolean(pipeline) }); batchCorrected = true; corrected = true; runCorrected = true;
            }
          }
          if (batches?.length > 1) {
            const before = new Map((output?.coverage ?? []).map(entry => [`${entry.sourceId}/${entry.clauseId}`, entry]));
            const coverageChanges = next.coverage.flatMap(entry => { const old = before.get(`${entry.sourceId}/${entry.clauseId}`); return old && old.disposition !== entry.disposition ? [{ sourceId: entry.sourceId, clauseId: entry.clauseId, beforeDisposition: old.disposition, beforeRationale: old.rationale, afterDisposition: entry.disposition, afterRationale: entry.rationale }] : []; });
            if (delta.updatedRequirementIds?.length || coverageChanges.length) batchAudit.push({ batch: index + 1, requirementIds: [...(delta.updatedRequirementIds ?? [])], coverageChanges });
          }
          output = next;
          onValidated(job.phase, output);
          if (pipeline) saveCheckpoint('analysis', analysisUpstream, { completed: index + 1, total: batches?.length ?? 1, corrected, output, batchAudit }, stored => {
            if (stored.batches) stored.batches.completed = index + 1;
            stored.usage = { ...usage };
          });
          else if (batches?.length > 1) mark(job.id, stored => { if (stored.status === 'running') { stored.batches.completed = index + 1; stored.usage = { ...usage }; } });
          if (pipeline) mergeIssues(output.issues, pipeline.businessModel.issues);
        }
        if (pipeline) {
          const reviewUpstream = { output, businessModel: pipeline.businessModel };
          const reviewed = readCheckpoint('review', reviewUpstream);
          const partialReview = reviewed?.version === 2;
          const reviewRefs = [], resumeReplies = [];
          if (partialReview) {
            exact(reviewed, ['version', 'replies']);
            if (!Array.isArray(reviewed.replies) || reviewed.replies.length < 1 || reviewed.replies.length > 128) fail('AI_CHECKPOINT_INVALID');
            for (const [index, ref] of reviewed.replies.entries()) {
              reference(ref, 'ai'); const item = readJson(ref); exact(item, ['version', 'batch', 'output']);
              if (item.version !== 1 || item.batch !== index + 1) fail('AI_CHECKPOINT_INVALID');
              reviewRefs.push(ref); resumeReplies.push(item.output);
            }
          }
          if (reviewed && !partialReview) output = reviewed;
          else output = await reviewRequirements(output, pipeline.businessModel, snapshot, { run, cwd, signal: controller.signal, onStage, concurrency: 2, evidenceReferences: true, resumeReplies, onReply(index, value, merged) {
            if (index !== reviewRefs.length) fail('AI_CHECKPOINT_INVALID');
            onValidated('review-requirements', merged);
            reviewRefs.push(store.writeArchive('ai', JSON.stringify({ version: 1, batch: index + 1, output: value })));
            saveCheckpoint('review', reviewUpstream, { version: 2, replies: reviewRefs });
          }, onReuse(_index, merged) { reusedResponse(); onValidated('review-requirements', merged); } });
          validated = validateAnalysisProposal(output, snapshot);
          if (!reviewed || partialReview || !restoreCheckpointWarnings('review')) onValidated('review-requirements', output);
          if (!reviewed || partialReview) saveCheckpoint('review', reviewUpstream, output);
          if (!validated.issues.some(issue => issue.severity === 'blocking')) {
            const planningUpstream = { output, businessModel: pipeline.businessModel };
            let plan = readCheckpoint('planning', planningUpstream);
            const partialPlan = plan?.version === 2;
            if (plan && !partialPlan) { plan.validatedPlan = validateDecompositionProposal(plan.planningOutput, { ...snapshot, backlog: projectAnalysisBacklog(snapshot, validated) }); if (!restoreCheckpointWarnings('planning')) { onValidated('decomposition', plan.planningOutput); onValidated('review-plan', plan.planningOutput); } }
            else {
              const replies = [], refs = []; let generated = partialPlan ? plan.planningOutput : null;
              if (partialPlan) {
                exact(plan, ['version', 'planningOutput', 'replies']);
                if (!Array.isArray(plan.replies) || plan.replies.length > 128) fail('AI_CHECKPOINT_INVALID');
                for (const [index, ref] of plan.replies.entries()) {
                  reference(ref, 'ai'); const item = readJson(ref); exact(item, ['version', 'batch', 'output']);
                  if (item.version !== 1 || item.batch !== index + 1) fail('AI_CHECKPOINT_INVALID');
                  refs.push(ref); replies.push(item.output);
                }
              }
              plan = await planAndReview(output, pipeline.businessModel, snapshot, workflow.decisions, { run, cwd, signal: controller.signal, onStage, onValidated, idPrefix: `P${jobId.slice(0, 8)}-`, evidenceReferences: true, resumePlanning: generated, resumeReplies: replies,
                onGenerated(value) { generated = structuredClone(value); saveCheckpoint('planning', planningUpstream, { version: 2, planningOutput: generated, replies: [] }); },
                onReviewReply(index, value) {
                  if (index !== refs.length) fail('AI_CHECKPOINT_INVALID');
                  refs.push(store.writeArchive('ai', JSON.stringify({ version: 1, batch: index + 1, output: value })));
                  saveCheckpoint('planning', planningUpstream, { version: 2, planningOutput: generated, replies: refs });
                },
                onReuse() { reusedResponse(); },
              });
              saveCheckpoint('planning', planningUpstream, { planningOutput: plan.planningOutput, taskPreview: plan.taskPreview });
            }
            pipeline = { ...pipeline, planningOutput: plan.planningOutput, taskPreview: plan.taskPreview };
            validated.issues = mergeIssues(validated.issues, plan.validatedPlan.issues);
          }
        }
        const record = JSON.stringify({ output, ...(pipeline ? { pipeline } : {}), ...(batchAudit.length ? { batchAudit } : {}) });
        if (Buffer.byteLength(record) > 8 * 1024 ** 2) fail('AI_AUDIT_CAPACITY');
        const resultRef = store.writeArchive('ai', record);
        const live = await contextProvider();
        mark(job.id, (stored, next) => {
          if (stored.status !== 'running') return;
          stored.resultRef = resultRef; stored.completedAt = now(); stored.usage = usage;
          stored.status = live.snapshotDigest !== snapshot.metadata.context.snapshotDigest || aiInputDigest(next, job.phase, ai(next).decisions) !== inputDigest ? 'stale' : validated.issues.some(issue => issue.severity === 'blocking') ? 'needs-decisions' : 'ready';
        });
      } finally {
        // The path is allocated by this operation inside the external workspace.
        // Revalidate ownership/boundary before recursively removing its empty CLI cwd.
        assertExternalWorkspace(cwd); rmSync(cwd, { recursive: true, force: true });
      }
    }).catch(error => {
      try { mark(job.id, stored => { if (stored.status !== 'running') return; stored.status = controller.signal.aborted ? 'cancelled' : 'failed'; stored.completedAt = now(); stored.errorCode = /^AI_[A-Z_]{2,70}$/.test(error.code ?? '') ? error.code : 'AI_RUN_FAILED'; if (!controller.signal.aborted && error.code === 'AI_OUTPUT_INVALID') stored.validationFailures = safeValidationFailures(error.details); if (operation.usage) stored.usage = operation.usage; }); }
      catch { /* A foreign edit/lock loss must never be overwritten to save status. */ }
    }).finally(() => { if (active === operation) active = undefined; });
  }
  async function action(revision, name, payload) {
    const snapshot = store.read();
    if (snapshot.revision !== revision) fail('WORKSPACE_REVISION_CONFLICT');
    const job = current(snapshot);
    if (name === 'ai.start') { exact(payload, ['phase', 'inputDigest', 'consent', 'model', 'includeVisuals', 'fullPipeline', 'reuseCheckpoints']); await begin(revision, payload); return; }
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
        const next = store.read(), phase = planningOnly ? 'decomposition' : 'analysis'; await begin(next.revision, { phase, consent: true, model: AI_MODEL, includeVisuals: job.includeVisuals !== false, ...(job.fullPipeline ? { fullPipeline: true } : {}), inputDigest: aiInputDigest(next, phase, ai(next).decisions) });
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
        if (job.phase === 'analysis') { confirmAnalysis(next, value); if (job.fullPipeline && value.workItems) { applyDecomposition(next, value); completePipeline(next); } }
        else applyDecomposition(next, value);
        const stored = next.metadata.ai.jobs.find(item => item.id === job.id); stored.status = 'applied'; stored.appliedAt = now();
      });
      if (job.phase === 'analysis' && !job.fullPipeline && payload.continueWithAI === true) {
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
