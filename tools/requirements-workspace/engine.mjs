import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { assertExternalWorkspace } from './store.mjs';
import * as shared from '../../scripts/export-deliverables-workspace.mjs';
import { backlogDetailSheet, projectUatChecklistSheet, computeAcHash, computeRequirementAcceptanceDisposition, toMarkdown } from '../../scripts/export-deliverables.mjs';
import { createAiWorkflow, validateAiMetadata } from './ai-workflow.mjs';
import { createArtifactImports, validateImportMetadata, documentReadingProfile, sourceEvidenceDigest } from './artifact-imports.mjs';
import { projectAnalysisBacklog } from './ai-contract.mjs';
import { PROMPT_VERSION, promptManifest } from './ai-prompts.mjs';
import { validateReadingRecord } from './document-reader.mjs';

const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(canonical(value))).digest('hex');
const fail = (code, errors) => { throw Object.assign(new Error(code), { code, errors }); };
const exact = (value, keys) => { if (!value || Array.isArray(value) || typeof value !== 'object' || Object.keys(value).some(key => !keys.includes(key))) fail('INVALID_REQUEST'); };
const text = (value, maximum = 2000) => typeof value === 'string' && value.trim() && value.length <= maximum;
const idValid = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/.test(value);
function sensitive(value) {
  const hits = shared.scanBacklogForPiiAndSecrets({ project: value });
  if (hits.length) fail('SENSITIVE_INPUT', hits.map(hit => ({ path: /^[A-Za-z0-9_.[\]-]{1,180}$/.test(hit.path) ? hit.path.replace(/^project\.?/, '') : '입력 항목', kind: hit.kind })));
}
function upsert(items, entity) {
  if (!idValid(entity?.id)) fail('INVALID_ID');
  const index = items.findIndex(item => item.id === entity.id);
  if (index < 0) items.push(structuredClone(entity)); else items[index] = structuredClone(entity);
}
const reqMeaning = (req, pack) => {
  const { acceptanceDisposition, ...meaning } = req;
  return digest({ meaning, sources: pack.sources.filter(source => req.sourceIds.includes(source.id)).map(source => ({ id: source.id, title: source.title, reference: source.reference, locator: source.locator, fileSha256: source.fileSha256, classification: source.classification, clauses: (source.clauses ?? []).filter(clause => clause.requirementIds?.includes(req.id)).map(clause => ({ id: clause.id, locator: clause.locator, text: clause.text })) })) });
};
const sourceMeaning = pack => digest({ project: pack.project, sources: pack.sources, requirements: pack.businessRequirements.map(req => { const { acceptanceDisposition, ...meaning } = req; return meaning; }) });
export function initialRequirementsMetadata(context) {
  return { context, baselines: [], reviewedRequirements: {}, uatRecords: [], uatHistoryRefs: [], auditFindings: [], exports: [] };
}
function validateArchiveRef(ref, kind) {
  exact(ref, ['id', 'kind', 'sha256', 'bytes']);
  if (!/^[a-f0-9-]{36}$/.test(ref.id ?? '') || ref.kind !== kind || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '') || !Number.isSafeInteger(ref.bytes) || ref.bytes < 0 || ref.bytes > 8 * 1024 ** 2) fail('INVALID_ARCHIVE');
}
export function validateRequirementsMetadata(metadata) {
  exact(metadata, ['context', 'baselines', 'reviewedRequirements', 'uatRecords', 'uatHistoryRefs', 'auditFindings', 'exports', 'composition', 'ai', 'imports']);
  validateAiMetadata(metadata.ai);
  validateImportMetadata(metadata.imports);
  if (!metadata.context || !Array.isArray(metadata.baselines) || !Array.isArray(metadata.uatRecords) || !Array.isArray(metadata.auditFindings) || !Array.isArray(metadata.exports) || !metadata.reviewedRequirements || Array.isArray(metadata.reviewedRequirements)) fail('INVALID_METADATA');
  sensitive(metadata);
  for (const [id, hash] of Object.entries(metadata.reviewedRequirements)) if (!idValid(id) || !/^[a-f0-9]{64}$/.test(hash)) fail('INVALID_METADATA');
  for (const baseline of metadata.baselines) {
    exact(baseline, ['id', 'label', 'createdAt', 'analysisHash', 'contextDigest', 'backlog', 'backlogRef']);
    if (!idValid(baseline.id) || !text(baseline.label, 120) || !text(baseline.createdAt, 50) || !/^[a-f0-9]{64}$/.test(baseline.analysisHash)) fail('INVALID_METADATA');
    if (baseline.backlogRef) validateArchiveRef(baseline.backlogRef, 'baseline');
    else if (!baseline.backlog || baseline.backlog.kind !== 'egov-enterprise-requirements-backlog' || !Array.isArray(baseline.backlog.businessRequirements)) fail('INVALID_METADATA');
  }
  for (const finding of metadata.auditFindings) {
    exact(finding, ['id', 'title', 'severity', 'disposition', 'evidence', 'updatedAt']);
    if (!idValid(finding.id) || !text(finding.title, 500) || !['blocking', 'observation'].includes(finding.severity) || !['open', 'resolved'].includes(finding.disposition) || (finding.disposition === 'resolved' && !text(finding.evidence))) fail('INVALID_METADATA');
  }
  for (const record of metadata.uatRecords) {
    exact(record, ['id', 'acId', 'disposition', 'signer', 'date', 'evidence', 'buildRef', 'acHash', 'contextDigest', 'recordedAt']);
    if (!idValid(record.id) || !idValid(record.acId) || !['accepted', 'conditional', 'rejected'].includes(record.disposition) || !text(record.signer, 100) || !validDate(record.date) || !text(record.evidence) || !text(record.buildRef, 200) || !/^[a-f0-9]{32}$/.test(record.acHash)) fail('INVALID_METADATA');
  }
  for (const entry of metadata.exports) {
    if (!idValid(entry.id) || !['task', 'audit', 'sheets', 'uat'].includes(entry.kind) || !text(entry.filename, 150)) fail('INVALID_ARTIFACT');
    if (entry.contentRef) { validateArchiveRef(entry.contentRef, 'export'); if (entry.sha256 !== entry.contentRef.sha256) fail('INVALID_ARTIFACT'); }
    else if (typeof entry.content !== 'string' || entry.content.length > 8 * 1024 ** 2 || digest(entry.content) !== entry.sha256) fail('INVALID_ARTIFACT');
  }
  for (const ref of metadata.uatHistoryRefs ?? []) validateArchiveRef(ref, 'history');
  return true;
}
function analysisReadiness(snapshot) {
  const { backlog: pack, metadata } = snapshot, errors = [];
  const included = pack.businessRequirements.filter(req => req.scopeDisposition === 'included');
  if (!included.length) errors.push('포함 범위의 요구사항이 없습니다.');
  for (const source of pack.sources) {
    if (!source.classification || !source.locator || !source.clauses?.length) errors.push(`${source.id}: 자료 분류·위치·조항이 필요합니다.`);
    for (const clause of source.clauses ?? []) {
      if (!clause.locator?.trim() || !clause.text?.trim()) errors.push(`${source.id}/${clause.id}: 원문 위치와 조항 본문이 필요합니다.`);
      if (clause.disposition === 'question') errors.push(`${source.id}/${clause.id}: 조항 처분을 확인하세요.`);
      if (['deferred', 'excluded'].includes(clause.disposition) && !clause.rationale?.trim()) errors.push(`${clause.id}: 보류·제외 사유가 필요합니다.`);
    }
  }
  for (const req of pack.businessRequirements) {
    if (req.scopeDisposition === 'proposed') errors.push(`${req.id}: 범위를 확정하세요.`);
    if (!req.sourceIds?.length || !pack.sources.some(source => source.clauses?.some(clause => clause.requirementIds?.includes(req.id)))) errors.push(`${req.id}: 원문 조항을 연결하세요.`);
    if (metadata.reviewedRequirements[req.id] !== reqMeaning(req, pack)) errors.push(`${req.id}: 현재 내용의 분석 검토가 필요합니다.`);
    if (req.scopeDisposition === 'included') {
      if (req.solutionDisposition === 'undecided') errors.push(`${req.id}: Fit-Gap 판정을 확정하세요.`);
      if (req.openQuestions?.length) errors.push(`${req.id}: 미해결 질문이 있습니다.`);
      if (['non-functional', 'data', 'constraint'].includes(req.requirementType) && (!req.nfrCriteria?.metric || !req.nfrCriteria?.threshold || !req.nfrCriteria?.verificationMethod)) errors.push(`${req.id}: 측정 기준과 검증 방법이 필요합니다.`);
    } else if (['excluded', 'deferred'].includes(req.scopeDisposition) && !req.rationale?.trim()) errors.push(`${req.id}: 보류·제외 사유가 필요합니다.`);
  }
  return { valid: errors.length === 0, errors, warnings: [] };
}
function clearStaleAcceptance(pack, before) {
  const old = new Map(before.acceptanceCriteria.map(ac => [ac.id, ac]));
  for (const ac of pack.acceptanceCriteria) {
    if (!old.has(ac.id) || computeAcHash(ac, pack) !== computeAcHash(old.get(ac.id), before)) {
      ac.acceptanceDisposition = 'pending';
      for (const key of ['uatSignedBy', 'uatVerifiedAt', 'uatEvidence', 'uatBuildRef', 'acContentHash']) delete ac[key];
    }
  }
  for (const req of pack.businessRequirements) req.acceptanceDisposition = computeRequirementAcceptanceDisposition(req, pack.acceptanceCriteria.filter(ac => ac.requirementIds.includes(req.id)), pack);
}
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Domain actions share CLI contracts. Customer content never becomes shell arguments. */
export function createRequirementsEngine({ store, contextProvider, root, aiRunner, artifactExtractor, documentReader, now = () => new Date().toISOString() }) {
  const validate = pack => {
    const result = shared.validateBacklogPack(pack);
    if (!result.valid) fail('BACKLOG_INVALID', result.errors);
  };
  const baselineCurrent = snapshot => snapshot.metadata.baselines.at(-1)?.analysisHash === sourceMeaning(snapshot.backlog) && analysisReadiness(snapshot).valid;
  function commitMutation(revision, mutate) {
    const previous = store.read();
    if (previous.revision !== revision) fail('WORKSPACE_REVISION_CONFLICT');
    const next = structuredClone(previous); mutate(next); persist(previous, next, 'ai.update');
  }
  const imports = createArtifactImports({ store, commit: commitMutation, extractor: artifactExtractor, documentReader, aiRunner, now });
  const workflow = createAiWorkflow({ store, contextProvider, runner: aiRunner, sourceFile: imports.sourceFile, now, baselineCurrent,
    commit: commitMutation,
    sourceReading(sourceId) {
      const snapshot = store.read(), source = snapshot.backlog.sources.find(source => source.id === sourceId);
      const job = snapshot.metadata.imports?.findLast(job => job.sourceId === sourceId && job.status === 'ready' && job.readingRef && job.promptVersion === PROMPT_VERSION && job.sha256 === source?.fileSha256 && job.readingProfile === documentReadingProfile(source.sourceType, source.classification) && job.sourceDigest === sourceEvidenceDigest(source));
      if (!job) return null;
      const reading = JSON.parse(store.readArchive(job.readingRef));
      if (reading.promptVersion !== job.promptVersion) fail('AI_DOCUMENT_OUTPUT_INVALID');
      return validateReadingRecord(reading, job.sha256);
    },
    completePipeline(next) {
      next.backlog.contextBindings = shared.computeContextBindings(next.backlog, next.metadata.context);
      const content = shared.generateWorkPackagePlan(next.backlog, next.metadata.context).markdown;
      next.metadata.exports.push({ id: randomUUID(), kind: 'task', filename: 'TASK-PACKAGE.md', content, sha256: digest(content), createdAt: now(), inputRevision: store.read().revision, analysisHash: sourceMeaning(next.backlog) });
    },
    confirmAnalysis(next, proposal) {
      next.backlog = projectAnalysisBacklog(next, proposal);
      for (const req of next.backlog.businessRequirements) next.metadata.reviewedRequirements[req.id] = reqMeaning(req, next.backlog);
      const readiness = analysisReadiness(next);
      if (!readiness.valid) fail('ANALYSIS_NOT_READY', readiness.errors);
      next.metadata.baselines.push({ id: `BL-${next.metadata.baselines.length + 1}`, label: `AI 요구사항 확인 ${now()}`, createdAt: now(), analysisHash: sourceMeaning(next.backlog), contextDigest: next.backlog.contextSnapshotDigest, backlog: structuredClone(next.backlog) });
    },
    applyDecomposition(next, proposal) {
      const before = structuredClone(next.backlog), previous = new Map(before.acceptanceCriteria.map(ac => [ac.id, ac]));
      next.backlog.workItems = proposal.workItems;
      next.backlog.acceptanceCriteria = proposal.acceptanceCriteria;
      next.backlog.traceLinks = proposal.traceLinks;
      for (const ac of next.backlog.acceptanceCriteria) {
        const old = previous.get(ac.id);
        if (!old?.acContentHash || computeAcHash(old, before) !== old.acContentHash || computeAcHash(ac, next.backlog) !== old.acContentHash) continue;
        for (const field of ['acceptanceDisposition', 'uatSignedBy', 'uatVerifiedAt', 'uatEvidence', 'uatBuildRef', 'acContentHash']) if (old[field] !== undefined) ac[field] = old[field];
      }
    },
  });
  function readSnapshot() {
    try { return store.read(); }
    catch (error) {
      if (!/^REQUIREMENTS_(?:EXTERNAL_CHANGE|LOCK_LOST|RECOVERY_REQUIRED|RECOVERY_CONFLICT|IO_ERROR|UNSAFE_PATH|CORRUPT_JSON)$/.test(error.code ?? '') || !store.getTrustedSnapshot) throw error;
      return store.getTrustedSnapshot();
    }
  }
  async function state() {
    const snapshot = readSnapshot(), current = await contextProvider();
    const analysis = analysisReadiness(snapshot);
    const ready = shared.validateDevelopmentReadiness?.(snapshot.backlog, snapshot.metadata.context) ?? { valid: false, errors: ['개발 준비 검사가 필요합니다.'], warnings: [] };
    const contextChanged = current.snapshotDigest !== snapshot.backlog.contextSnapshotDigest || current.snapshotDigest !== snapshot.metadata.context.snapshotDigest || Boolean(snapshot.contextConflict);
    if (contextChanged) { ready.valid = false; ready.errors.push('저장소 원장이 변경되었습니다. 문맥 차이를 검토하고 갱신하세요.'); }
    if (store.readOnly) { ready.valid = false; ready.errors.push('마지막으로 확인한 자료를 읽기 전용으로 표시합니다. 원본과 잠금 상태를 확인한 뒤 실행기를 다시 여세요.'); }
    const metadata = { ...snapshot.metadata, exports: snapshot.metadata.exports.map(entry => ({ ...entry, stale: entry.inputBacklogHash !== digest(snapshot.backlog) || contextChanged })) };
    const prompts = promptManifest({ sourceTypes: [...snapshot.backlog.sources.map(source => source.sourceType), ...(snapshot.metadata.imports ?? []).filter(job => job.status === 'ready').flatMap(job => job.detectedTypes ?? [])], formats: (snapshot.metadata.imports ?? []).filter(job => job.status === 'ready').map(job => job.format), hasExisting: snapshot.backlog.businessRequirements.length > 0, hasDecisions: Boolean(snapshot.metadata.ai?.decisions.length) });
    return { ...snapshot, metadata, prompts, ai: workflow.view(snapshot), imports: imports.view(snapshot), context: snapshot.metadata.context, analysisReadiness: analysis, readiness: ready, contextChanged, contextDiff: shared.diffContextSnapshots(snapshot.metadata.context, current, snapshot.backlog), baselineCurrent: baselineCurrent(snapshot), reviewedRequirementsCurrent: Object.fromEntries(snapshot.backlog.businessRequirements.map(req => [req.id, snapshot.metadata.reviewedRequirements[req.id] === reqMeaning(req, snapshot.backlog)])), composition: snapshot.metadata.composition, matches: shared.matchRequirementsToContext(snapshot.backlog, snapshot.metadata.context), readOnly: Boolean(store.readonly ?? store.readOnly), reason: store.reason };
  }
  async function scratch(snapshot, run) {
    // Existing CLI writers run only in an isolated copy; the checked CAS commit owns the real workspace.
    validate(snapshot.backlog); sensitive(snapshot.backlog);
    const base = assertExternalWorkspace(join(store.directory, '.scratch'));
    mkdirSync(base, { recursive: true, mode: 0o700 });
    assertExternalWorkspace(base);
    const folder = mkdtempSync(join(base, 'operation-'));
    try {
      shared.assertWorkspaceOutsideCheckout(root, folder);
      writeFileSync(join(folder, 'backlog.json'), JSON.stringify(snapshot.backlog), { mode: 0o600 });
      writeFileSync(join(folder, 'context.snapshot.json'), JSON.stringify(snapshot.metadata.context), { mode: 0o600 });
      mkdirSync(join(folder, 'sheets'));
      return await run(folder);
    } finally {
      const rel = relative(base, resolve(folder));
      if (rel && !rel.startsWith('..') && !isAbsolute(rel)) { assertExternalWorkspace(folder); rmSync(folder, { recursive: true, force: true }); }
    }
  }
  function artifact(id) {
    const meta = readSnapshot().metadata;
    const previousSource = meta.imports?.find(job => job.previousSourceRef?.id === id);
    if (previousSource) {
      const content = store.readArchive(previousSource.previousSourceRef); sensitive({ content });
      return { filename: `BEFORE-AI-${previousSource.sourceId}.json`, content, type: 'application/json;charset=utf-8', sha256: digest(content) };
    }
    const readingJob = meta.imports?.find(job => job.status === 'ready' && job.readingRef?.id === id);
    if (readingJob) {
      const reading = validateReadingRecord(JSON.parse(store.readArchive(readingJob.readingRef)), readingJob.sha256), content = JSON.stringify(reading, null, 2);
      return { filename: `AI-READING-${readingJob.sourceId}.json`, content, type: 'application/json;charset=utf-8', sha256: digest(content) };
    }
    const prompt = meta.ai?.jobs.flatMap(job => job.promptRefs ?? []).find(item => item.ref.id === id);
    if (prompt) {
      const content = store.readArchive(prompt.ref), value = JSON.parse(content);
      if (value.stage !== prompt.stage || createHash('sha256').update(JSON.stringify(value)).digest('hex') !== prompt.sha256 || typeof value.instructions !== 'string') fail('AI_OUTPUT_INVALID');
      sensitive(value); return { filename: `AI-PROMPT-${prompt.stage}.json`, content, type: 'application/json;charset=utf-8', sha256: digest(content) };
    }
    if (meta.imports?.some(job => job.requestId === id && job.originalRef)) return { ...imports.originalFile(id), type: 'application/octet-stream' };
    if (meta.imports?.some(job => job.sourceId === id && job.status === 'ready')) return { ...imports.sourceFile(id), type: 'application/octet-stream' };
    const aiJob = meta.ai?.jobs.find(job => job.id === id && job.resultRef);
    if (aiJob) {
      const content = JSON.stringify({ job: aiJob, inputBacklog: JSON.parse(store.readArchive(aiJob.inputRef)), inputContext: JSON.parse(store.readArchive(aiJob.contextRef)), result: JSON.parse(store.readArchive(aiJob.resultRef)) }, null, 2);
      sensitive({ content }); return { filename: `AI-${aiJob.phase}-${aiJob.id}.json`, content, type: 'application/json;charset=utf-8', sha256: digest(content) };
    }
    const entry = meta.exports.find(item => item.id === id);
    if (entry) {
      const content = entry.contentRef ? store.readArchive(entry.contentRef) : entry.content;
      if (digest(content) !== entry.sha256) fail('ARTIFACT_NOT_FOUND');
      sensitive({ content });
      return { filename: entry.filename, content, type: entry.filename.endsWith('.csv') ? 'text/csv;charset=utf-8' : 'text/markdown;charset=utf-8', sha256: entry.sha256 };
    }
    const ref = (meta.uatHistoryRefs ?? []).find(item => item.id === id) ?? meta.baselines.find(item => item.backlogRef?.id === id)?.backlogRef;
    if (!ref) fail('ARTIFACT_NOT_FOUND');
    const content = store.readArchive(ref); sensitive({ content });
    return { filename: `${ref.kind}-${ref.id}.json`, content, type: 'application/json;charset=utf-8', sha256: ref.sha256 };
  }
  async function action(revision, actionName, payload) {
    if (typeof actionName !== 'string' || !payload || typeof payload !== 'object' || Array.isArray(payload)) fail('INVALID_REQUEST');
    if (actionName === 'source.ingest') { const { base64, ...labels } = payload; sensitive(labels); }
    else sensitive(payload);
    if (actionName.startsWith('source.ingest') || actionName === 'source.reingest') { await imports.action(revision, actionName, payload); return state(); }
    if (actionName.startsWith('ai.')) { if (actionName === 'ai.start' && imports.active) fail('AI_DOCUMENTS_PROCESSING'); await workflow.action(revision, actionName, payload); return state(); }
    const previous = store.read();
    if (previous.revision !== revision) fail('WORKSPACE_REVISION_CONFLICT');
    const next = structuredClone(previous), pack = next.backlog, meta = next.metadata;
    const timestamp = now();
    switch (actionName) {
      case 'project.save': {
        exact(payload, ['code', 'name', 'institution', 'baselineProfile']);
        if (!text(payload.code, 80) || !text(payload.name, 200)) fail('PROJECT_REQUIRED');
        pack.project = structuredClone(payload); break;
      }
      case 'source.save': upsert(pack.sources, payload); break;
      case 'requirement.save': {
        exact(payload, ['requirement', 'reviewed', 'clauseIds']);
        const existing = pack.businessRequirements.find(req => req.id === payload.requirement?.id);
        if (payload.requirement?.acceptanceDisposition && payload.requirement.acceptanceDisposition !== (existing?.acceptanceDisposition ?? 'pending')) fail('ACCEPTANCE_READ_ONLY');
        upsert(pack.businessRequirements, { ...payload.requirement, acceptanceDisposition: existing?.acceptanceDisposition ?? 'pending' });
        const selectedIds = payload.clauseIds ?? pack.sources.flatMap(source => (source.clauses ?? []).filter(clause => clause.requirementIds?.includes(payload.requirement.id)).map(clause => `${source.id}/${clause.id}`));
        if (!Array.isArray(selectedIds) || !selectedIds.length) fail('SOURCE_CLAUSE_REQUIRED');
        const selected = new Set(selectedIds);
        for (const source of pack.sources) for (const clause of source.clauses ?? []) {
          const key = `${source.id}/${clause.id}`, wasLinked = clause.requirementIds?.includes(payload.requirement.id);
          if (!selected.has(key) && !wasLinked) continue;
          clause.requirementIds = (clause.requirementIds ?? []).filter(id => id !== payload.requirement.id);
          if (selected.has(key)) {
            if (!payload.requirement.sourceIds.includes(source.id)) fail('SOURCE_CLAUSE_INVALID');
            clause.requirementIds.push(payload.requirement.id); clause.requirementIds.sort(); selected.delete(key);
          }
          const refs = clause.requirementIds.map(id => pack.businessRequirements.find(req => req.id === id)).filter(Boolean);
          if (refs.some(req => req.scopeDisposition === 'included')) clause.disposition = clause.disposition === 'merged' ? 'merged' : 'included';
          else if (refs.length && refs.every(req => req.scopeDisposition === 'excluded')) { clause.disposition = 'excluded'; clause.rationale = refs.map(req => req.rationale).join('; '); }
          else if (refs.length && refs.every(req => req.scopeDisposition === 'deferred')) { clause.disposition = 'deferred'; clause.rationale = refs.map(req => req.rationale).join('; '); }
          else { clause.disposition = 'question'; clause.rationale ||= '연결된 요구사항과 조항 범위 재검토 필요'; }
        }
        if (selected.size) fail('SOURCE_CLAUSE_INVALID');
        if (payload.reviewed === true) meta.reviewedRequirements[payload.requirement.id] = reqMeaning(pack.businessRequirements.find(req => req.id === payload.requirement.id), pack); else delete meta.reviewedRequirements[payload.requirement.id];
        break;
      }
      case 'work.save': upsert(pack.workItems, payload); break;
      case 'ac.save': {
        const existing = pack.acceptanceCriteria.find(ac => ac.id === payload.id);
        if (['uatSignedBy', 'uatVerifiedAt', 'uatEvidence', 'uatBuildRef', 'acContentHash'].some(key => payload[key] !== undefined && payload[key] !== existing?.[key]) || (payload.acceptanceDisposition && payload.acceptanceDisposition !== (existing?.acceptanceDisposition ?? 'pending'))) fail('ACCEPTANCE_READ_ONLY');
        upsert(pack.acceptanceCriteria, { ...payload, acceptanceDisposition: existing?.acceptanceDisposition ?? 'pending' }); break;
      }
      case 'trace.save': upsert(pack.traceLinks, payload); break;
      case 'baseline.create': {
        exact(payload, ['label']);
        const analysis = analysisReadiness(next);
        if (!analysis.valid) fail('ANALYSIS_NOT_READY', analysis.errors);
        const current = await contextProvider();
        if (current.snapshotDigest !== pack.contextSnapshotDigest) fail('CONTEXT_CHANGED');
        if (!text(payload.label, 120)) fail('LABEL_REQUIRED');
        meta.baselines.push({ id: `BL-${meta.baselines.length + 1}`, label: payload.label, createdAt: timestamp, analysisHash: sourceMeaning(pack), contextDigest: pack.contextSnapshotDigest, backlog: structuredClone(pack) }); break;
      }
      case 'context.refresh': {
        exact(payload, []);
        meta.context = await contextProvider(); pack.contextSnapshotDigest = meta.context.snapshotDigest;
        break;
      }
      case 'composition.check': {
        exact(payload, ['selection']);
        if (!Array.isArray(payload.selection) || payload.selection.some(module => !idValid(module))) fail('INVALID_SELECTION');
        meta.composition = { selection: payload.selection, analysisHash: sourceMeaning(pack), result: shared.compareBacklogWithComposition(pack, meta.context, { selectedModules: payload.selection }) }; break;
      }
      case 'uat.record': {
        exact(payload, ['acId', 'disposition', 'signer', 'date', 'evidence', 'buildRef']);
        const ac = pack.acceptanceCriteria.find(item => item.id === payload.acId);
        if (!ac) fail('AC_NOT_FOUND');
        if (!baselineCurrent(next)) fail('BASELINE_REQUIRED');
        if ((await contextProvider()).snapshotDigest !== pack.contextSnapshotDigest) fail('CONTEXT_CHANGED');
        if (!(shared.validateDevelopmentReadiness?.(pack, meta.context)?.valid)) fail('DEVELOPMENT_NOT_READY');
        if (!['accepted', 'conditional', 'rejected'].includes(payload.disposition)) fail('INVALID_DISPOSITION');
        if (!text(payload.signer, 100) || !validDate(payload.date) || !text(payload.evidence) || !text(payload.buildRef, 200)) fail('EVIDENCE_REQUIRED');
        const hash = computeAcHash(ac, pack);
        Object.assign(ac, { acceptanceDisposition: payload.disposition, uatSignedBy: payload.signer, uatVerifiedAt: payload.date, uatEvidence: payload.evidence, uatBuildRef: payload.buildRef, acContentHash: hash });
        meta.uatRecords.push({ id: randomUUID(), ...payload, acHash: hash, contextDigest: pack.contextSnapshotDigest, recordedAt: timestamp });
        break;
      }
      case 'audit.save': {
        exact(payload, ['id', 'title', 'severity', 'disposition', 'evidence']);
        if (!text(payload.title, 500) || !['blocking', 'observation'].includes(payload.severity) || !['open', 'resolved'].includes(payload.disposition)) fail('INVALID_FINDING');
        if (payload.disposition === 'resolved' && !text(payload.evidence)) fail('EVIDENCE_REQUIRED');
        upsert(meta.auditFindings, { ...payload, id: payload.id || randomUUID(), updatedAt: timestamp }); break;
      }
      case 'sheets.import': {
        exact(payload, ['requirements', 'workItems']);
        if (typeof payload.requirements !== 'string' || typeof payload.workItems !== 'string') fail('CSV_REQUIRED');
        packFrom(await scratch(next, async folder => {
          writeFileSync(join(folder, 'sheets/requirements-review.csv'), payload.requirements, { mode: 0o600 });
          writeFileSync(join(folder, 'sheets/stories-ac-review.csv'), payload.workItems, { mode: 0o600 });
          await shared.importReviewSheets(root, folder, { contextSnapshot: meta.context });
          return JSON.parse(readFileSync(join(folder, 'backlog.json'), 'utf8'));
        })); break;
      }
      case 'uat.import': {
        exact(payload, ['csv', 'buildRef']); if (typeof payload.csv !== 'string') fail('CSV_REQUIRED');
        if (!text(payload.buildRef, 200)) fail('EVIDENCE_REQUIRED');
        if (!baselineCurrent(next)) fail('BASELINE_REQUIRED');
        if ((await contextProvider()).snapshotDigest !== pack.contextSnapshotDigest) fail('CONTEXT_CHANGED');
        if (!shared.validateDevelopmentReadiness(pack, meta.context).valid) fail('DEVELOPMENT_NOT_READY');
        packFrom(await scratch(next, async folder => {
          writeFileSync(join(folder, 'sheets/uat-checklist.csv'), payload.csv, { mode: 0o600 });
          await shared.importUatChecklist(root, folder, { contextSnapshot: meta.context, buildRef: payload.buildRef });
          return JSON.parse(readFileSync(join(folder, 'backlog.json'), 'utf8'));
        }));
        const previousAcs = new Map(previous.backlog.acceptanceCriteria.map(ac => [ac.id, ac]));
        const decision = ac => Object.fromEntries(['acceptanceDisposition', 'uatSignedBy', 'uatVerifiedAt', 'uatEvidence', 'uatBuildRef', 'acContentHash'].map(key => [key, ac?.[key] ?? null]));
        for (const ac of next.backlog.acceptanceCriteria) if (ac.acceptanceDisposition !== 'pending' && digest(decision(ac)) !== digest(decision(previousAcs.get(ac.id)))) {
          if (!text(ac.uatEvidence) || !text(ac.uatSignedBy) || !validDate(String(ac.uatVerifiedAt ?? '').slice(0, 10))) fail('EVIDENCE_REQUIRED');
          meta.uatRecords.push({ id: randomUUID(), acId: ac.id, disposition: ac.acceptanceDisposition, signer: ac.uatSignedBy, date: ac.uatVerifiedAt.slice(0, 10), evidence: ac.uatEvidence, buildRef: ac.uatBuildRef, acHash: computeAcHash(ac, next.backlog), contextDigest: next.backlog.contextSnapshotDigest, recordedAt: timestamp });
        }
        break;
      }
      case 'export.create': {
        exact(payload, ['kind']);
        if (!['task', 'audit', 'sheets', 'uat'].includes(payload.kind)) fail('EXPORT_UNSUPPORTED');
        const current = await contextProvider();
        const stable = current.snapshotDigest === pack.contextSnapshotDigest && baselineCurrent(next);
        let files;
        if (payload.kind === 'task') {
          if (!stable) fail('BASELINE_REQUIRED');
          const ready = shared.validateDevelopmentReadiness(pack, meta.context);
          if (!ready.valid) fail('DEVELOPMENT_NOT_READY');
          files = [{ filename: 'TASK-PACKAGE.md', content: shared.generateWorkPackagePlan(pack, meta.context).markdown }];
        } else if (['sheets', 'uat'].includes(payload.kind)) {
          files = await scratch(next, async folder => {
            if (payload.kind === 'sheets') {
              await shared.exportReviewSheets(root, folder, { contextSnapshot: meta.context });
              return ['requirements-review.csv', 'stories-ac-review.csv'].map(filename => ({ filename, content: readFileSync(join(folder, 'sheets', filename), 'utf8') }));
            }
            await shared.exportUatChecklist(root, folder, { contextSnapshot: meta.context });
            // Export stamps the same content-bound hashes without claiming acceptance.
            packFrom(JSON.parse(readFileSync(join(folder, 'backlog.json'), 'utf8')));
            return [{ filename: 'uat-checklist.csv', content: readFileSync(join(folder, 'sheets/uat-checklist.csv'), 'utf8') }];
          });
        } else {
          const readiness = shared.validateDevelopmentReadiness?.(pack, meta.context);
          const accepted = pack.businessRequirements.filter(req => req.scopeDisposition === 'included').every(req => req.acceptanceDisposition === 'accepted');
          const closed = stable && readiness?.valid && accepted && pack.businessRequirements.some(req => req.scopeDisposition === 'included') && !meta.auditFindings.some(finding => finding.severity === 'blocking' && finding.disposition === 'open');
          const content = [
            '# 요구사항·개발·인수 감리 검토 자료', '', `자료 구분: ${closed ? '제출 전 검토 가능' : '보완 중 초안'}`, `생성 시각: ${timestamp}`, `입력 버전: ${previous.revision}`, `분석 기준선: ${meta.baselines.at(-1)?.id ?? '없음'} / 현재 내용 일치: ${stable}`, '',
            '이 자료는 도구가 수집한 검토 초안입니다. 기관 인수 기록·시험 근거를 별도로 확인해야 하며 공식 승인이나 전자서명을 대신하지 않습니다.', '',
            toMarkdown(backlogDetailSheet(pack)), '', toMarkdown(projectUatChecklistSheet(pack)), '', '## 요구사항 추적표', shared.backlogToRtmCsv(pack), '', '## 감리 지적사항',
            ...meta.auditFindings.map(finding => `- ${finding.id} [${finding.severity}/${finding.disposition}] ${finding.title} / 근거: ${finding.evidence || '미등록'}`), '', '## 개발 준비 보완', ...(readiness?.errors ?? []).map(error => `- ${error}`), '',
          ].join('\n');
          files = [{ filename: 'AUDIT-REVIEW.md', content }];
        }
        for (const file of files) meta.exports.push({ id: randomUUID(), kind: payload.kind, ...file, sha256: digest(file.content), createdAt: timestamp, inputRevision: previous.revision, analysisHash: sourceMeaning(pack) });
        break;
      }
      default: fail('ACTION_UNSUPPORTED');
    }
    function packFrom(value) { next.backlog = value; }
    persist(previous, next, actionName);
    return state();
  }
  function persist(previous, next, actionName) {
    const meta = next.metadata;
    next.backlog.contextBindings = shared.computeContextBindings(next.backlog, meta.context);
    if (!['uat.record', 'uat.import'].includes(actionName)) clearStaleAcceptance(next.backlog, previous.backlog);
    else for (const req of next.backlog.businessRequirements) req.acceptanceDisposition = computeRequirementAcceptanceDisposition(req, next.backlog.acceptanceCriteria.filter(ac => ac.requirementIds.includes(req.id)), next.backlog);
    const previousArtifacts = new Set(previous.metadata.exports.map(entry => entry.id));
    for (const entry of meta.exports) if (!previousArtifacts.has(entry.id)) entry.inputBacklogHash = digest(next.backlog);
    validate(next.backlog); validateRequirementsMetadata(meta);
    const archive = (kind, content) => { sensitive({ content }); return store.writeArchive(kind, content); };
    for (const baseline of meta.baselines) if (baseline.backlog) { baseline.backlogRef = archive('baseline', JSON.stringify(baseline.backlog)); delete baseline.backlog; }
    for (const entry of meta.exports) if (entry.content !== undefined) { entry.contentRef = archive('export', entry.content); delete entry.content; }
    meta.uatHistoryRefs ??= [];
    while (meta.uatRecords.length > 500) meta.uatHistoryRefs.push(archive('history', JSON.stringify(meta.uatRecords.splice(0, 500))));
    validateRequirementsMetadata(meta);
    store.transact(previous.revision, draft => { draft.backlog = next.backlog; draft.metadata = meta; }, { refreshContext: actionName === 'context.refresh' });
  }
  return { state, action, artifact, sourceFile: imports.sourceFile, waitForAi: workflow.waitForIdle, waitForImports: imports.waitForIdle, async close() { await imports.close(); await workflow.close(); } };
}
