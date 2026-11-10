import { createHash } from 'node:crypto';
import { ANALYSIS_SCHEMA, BATCH_ANALYSIS_SCHEMA, buildAiRequest, validatePrivateAiValue, validateEvidenceCitations, validateAnalysisBatchProposal, projectProposalSchema, MAX_PROJECT_CITATIONS_PER_ITEM, MAX_PROJECT_PROPOSAL_BYTES, safeValidationFailures } from './ai-contract.mjs';
import { REQUIREMENT_REVIEW_SCHEMA, mergeIssues } from './ai-pipeline-contract.mjs';
import { packContextWindows, paginateContextRecords, CONTEXT_WINDOW_BYTES } from './ai-analysis-batches.mjs';
import { prepareEvidenceRequest } from './ai-evidence.mjs';

export const ANALYSIS_CONTEXT_VERSION = 'bounded-reconciliation-1';
const fail = (code, kind) => { throw Object.assign(Error(code), { code, ...(kind ? { details: [{ kind, path: '$' }] } : {}) }); };
const invalid = kind => fail('AI_OUTPUT_INVALID', kind);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const string = maxLength => ({ type: 'string', minLength: 1, maxLength });
const array = (items, maxItems) => ({ type: 'array', items, minItems: 0, maxItems });
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const MATCH_SCHEMA = object({ inspectedPageIds: array(string(100), 256), matches: array(object({ candidateId: string(100), requirementId: string(100), relation: { type: 'string', enum: ['same', 'related', 'conflict'] }, rationale: string(500) }), 512), issues: ANALYSIS_SCHEMA.properties.issues });
const candidateInstruction = '한국어로 응답한다. Bounded candidate extraction: Return source-grounded PENDING business requirement candidates for the CURRENT clauses only, with temporary analysisBatch.idPrefix IDs. These IDs are not committed requirement identities. The host will compare every candidate with the complete historical ledger in bounded proof windows before deciding identity. Do not recreate or update old IDs, and do not invent policy. Preserve compound-clause conditions, prohibitions, scope, exception and proposal-vs-confirmed distinctions. Cover every current clause, including explicit background/exclusion. Stored historical requirements/questions and registered human scope remain preserved outside this call. Return only this batch; updatedRequirementIds must be empty.';
const matchInstruction = '역할: 기존 요구사항과 임시 후보의 관계를 원문 근거로 비교하는 분석가. 한국어로 응답한다. 현재 sources, 후보 requirements, previousAnalysis의 완전한 의미 본문과 이번 proof 페이지, businessQuestions를 검토한다. contextPages는 완전한 인용 페이지이며 다른 페이지도 별도 호출에서 모두 검사한다. 모든 제공 페이지를 검사하고 inspectedPageIds를 정확히 반환한다. same은 같은 업무 가치·대상·완료 결과의 구체화, 명시적 예외, 참조된 권한표의 정의를 기존 요구사항에 통합하는 경우도 포함한다. 주체·대상·범위가 독립적인 별개 업무는 단지 관련 있다는 이유로 합치지 않는다. 전역 제약이 다른 기능에도 적용되면 related로 연결하고 적용 조건을 rationale에 명시한다. 기본 규칙과 명시적 예외는 양립하며 conflict가 아니다. 예: 마감 후 거부+비상 신청 접수 허용, 일반14일+긴급3일, 내보내기 허용+식별정보 포함 시 금지. 원문이 이미 정한 조건을 다시 결정하거나 기존 문구에 예외를 추가해도 되는지 묻지 않는다. conflict는 같은 조건에서 동시에 충족할 수 없는 실제 상충에만 쓴다. 다른 조건은 함께 보존한다. 같은 이름·역할·어휘만으로 동일하다고 판단하지 않는다. globalRequirementIndex는 탐색용이며 전체 조건을 대신하지 않는다. 현재 페이지의 기존 요구 ID만 match 대상으로 선택한다. 임시 ID나 기존 ID를 새로 만들거나 삭제하지 않는다. 진짜 미결 정책만 근거와 대상 ID를 연결해 질문으로 남기고, 다른 페이지를 아직 안 봤다는 이유로 질문하지 않는다. 확정 규칙·제안·문서별 별칭 범위와 사람 결정을 보존한다. businessQuestions는 아직 처리하지 않은 문맥일 수도 있으므로 이것만으로 보지 않은 원문을 인용할 수 없다. host는 모든 역사 기록을 보존한다. 이 호출은 관계 판정이며 최종 승인이 아니다.';
const mergeInstruction = '역할: 동일한 업무 의미로 검증된 기존 요구사항에 새 근거를 통합하는 분석가. 한국어로 응답한다. mergeTargets의 기존 전체 의미 본문과 현재 후보·원문을 읽어 target의 기존 ID로 revisions를 반환한다. 제공된 target을 모두 반환하고 다른 ID를 만들거나 삭제하지 않는다. 기존 조건·권한·부정어·예외·기준·범위를 빠뜨리지 않는다. 기존 인용 전체는 host가 원문 그대로 자동 보존한다. 이번 응답에는 새로 제공된 현재/정책 근거만 인용하고 오래된 인용을 다시 쓰지 않는다. 신규 후보의 모든 근거도 host가 보존한다. 실제 모순은 임의 덮어쓰기 대신 차단 질문으로 남긴다. 제안 문서를 확정 정책으로 만들지 않는다. 요구사항 개수를 줄이려 독립 업무를 합치거나 조건을 생략하지 않는다. 현재 전체 기존 설명은 제공되지만 과거 인용 전문은 앞선 비교 페이지에서 별도 검사했다. 스키마 통과나 관계 일치를 사람 승인으로 표현하지 않는다.';
const policyDigest = hash({ version: ANALYSIS_CONTEXT_VERSION, candidateInstruction, matchInstruction, mergeInstruction, MATCH_SCHEMA, REQUIREMENT_REVIEW_SCHEMA });
const withoutProof = record => ({ ...structuredClone(record), citations: [] });
const sameQuote = (a, b) => a.sourceId === b.sourceId && a.clauseId === b.clauseId && a.quote === b.quote;

function assertIssues(issues, snapshot, knownIds, sources, pages = []) {
  validatePrivateAiValue(issues, ANALYSIS_SCHEMA.properties.issues);
  validateEvidenceCitations(issues, snapshot);
  const text = new Map(sources.flatMap(source => source.clauses.map(clause => [`${source.id}/${clause.id}`, clause.text])));
  const proof = pages.filter(page => page.kind !== 'business-question').flatMap(page => page.record.citations);
  for (const issue of issues) {
    if (issue.requirementIds.some(id => !knownIds.has(id))) invalid('context-reference');
    for (const cite of issue.citations) if (!text.get(`${cite.sourceId}/${cite.clauseId}`)?.includes(cite.quote) && !proof.some(old => old.sourceId === cite.sourceId && old.clauseId === cite.clauseId && old.quote.includes(cite.quote))) invalid('context-unseen-citation');
  }
}

// This is the bounded fallback for the existing canonical delta workflow, not
// a second requirements database. Pending IDs are resolved only after every
// historical proof page has been inspected. No partial source batch is applied.
export async function reconcileAnalysisBatch({ snapshot, sources, previous = { requirements: [], issues: [], coverage: [] }, request, run, writePart, readPart, resume = null, onCheckpoint = () => {}, onProgress = () => {}, onReuse = () => {}, onCorrection = () => {}, onValidated = () => {}, signal, limitBytes = CONTEXT_WINDOW_BYTES, attachments = [] }) {
  const check = () => { if (signal?.aborted) fail('AI_CANCELLED'); };
  check();
  const businessModel = request.data.businessModel ?? null;
  const signatureRequest = structuredClone(request); signatureRequest.data.analysisBatch.idPrefix = 'CANONICAL-PREFIX';
  const historyDigest = hash({ request: signatureRequest, previous, snapshot: snapshot.metadata.context.snapshotDigest });
  const prefix = request.data.analysisBatch?.idPrefix;
  if (!prefix || typeof writePart !== 'function' || typeof readPart !== 'function') fail('AI_CONTEXT_CONFIGURATION_INVALID');
  const logicalEnd = request.data.analysisBatch.lastIndex ?? request.data.analysisBatch.index;
  let state = resume ? structuredClone(resume) : { version: 1, policyDigest, historyDigest, prefix, logicalEnd, candidateRef: null, contexts: [], merges: [] };
  const fields = ['version', 'policyDigest', 'historyDigest', 'prefix', 'logicalEnd', 'candidateRef', 'contexts', 'merges'];
  if (!state || Object.keys(state).length !== fields.length || fields.some(key => !Object.hasOwn(state, key)) || state.version !== 1 || state.historyDigest !== historyDigest || state.logicalEnd !== logicalEnd || !Number.isSafeInteger(logicalEnd) || !/^[a-f0-9]{64}$/.test(state.policyDigest ?? '') || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,59}$/.test(state.prefix ?? '') || !Array.isArray(state.contexts) || !Array.isArray(state.merges)) fail('AI_CHECKPOINT_INVALID');
  // A changed pending-work policy invalidates only that work. The outer caller
  // has independently validated the completed canonical source prefix.
  if (state.policyDigest !== policyDigest) state = { version: 1, policyDigest, historyDigest, prefix, logicalEnd, candidateRef: null, contexts: [], merges: [] };
  for (const entries of [state.contexts, state.merges]) {
    if (entries.length > 4096 || new Set(entries.map(entry => entry.taskId)).size !== entries.length || entries.some(entry => !entry || Object.keys(entry).length !== 2 || !/^[a-f0-9]{64}$/.test(entry.taskId ?? '') || !entry.ref)) fail('AI_CHECKPOINT_INVALID');
  }
  if (!state.candidateRef && (state.contexts.length || state.merges.length)) fail('AI_CHECKPOINT_INVALID');
  const persist = async () => { check(); await onCheckpoint(structuredClone(state)); check(); };
  const base = structuredClone(request), candidatePrefix = `${state.prefix}TMP-`;
  base.data.previousAnalysis = { requirements: [], issues: [] }; base.data.previousRequirements = [];
  base.data.sources = structuredClone(sources);
  base.data.sourceReadingNotes = base.data.sourceReadingNotes?.filter(note => sources.some(source => source.id === note.sourceId)) ?? [];
  if (businessModel) base.data.businessModel = { ...structuredClone(businessModel), issues: [] };
  base.data.analysisBatch.idPrefix = candidatePrefix;
  base.data.analysisBatch.capacity = { ...base.data.analysisBatch.capacity, requirementsRemaining: 150, citationCounts: {} };
  const allowedSources = [...sources, ...(base.data.policySources ?? [])];
  const prepare = (value, schema) => prepareEvidenceRequest(value, schema);
  let corrected = false;
  async function invoke(value, schema, validate, measured) {
    let violations;
    for (let attempt = 0; attempt < 2; attempt++) {
      check();
      const current = attempt ? { ...structuredClone(value), instructions: `${value.instructions}\nRegenerate once using the original provided inputs and safe invariant failures only. The rejected response is not supplied. Preserve all conditions, exact proof, known identities and the requested output contract.`, data: { ...structuredClone(value.data), correction: { violations: safeValidationFailures(violations) } } } : value;
      const prepared = attempt || !measured ? prepare(current, schema) : measured;
      if (Buffer.byteLength(JSON.stringify(prepared.request)) + Buffer.byteLength(JSON.stringify(prepared.schema)) > limitBytes) fail('AI_INPUT_TOO_LARGE');
      try {
        const response = await run({ request: current, schema, preparedEvidence: prepared, signal, ...(current.phase === 'analysis' ? { attachments } : {}) }); check();
        validatePrivateAiValue(response.output, schema); validate(response.output); onValidated(response.output);
        return response.output;
      } catch (error) {
        if (signal?.aborted) fail('AI_CANCELLED');
        if (error.code !== 'AI_OUTPUT_INVALID' || attempt || safeValidationFailures(error.details).some(detail => detail.kind === 'output-size')) throw error;
        violations = error.details; corrected = true; onCorrection();
      }
    }
  }
  const candidateRequest = { ...base, promptVersion: ANALYSIS_CONTEXT_VERSION, instructions: `${base.instructions}\n${candidateInstruction}` };
  const candidateSnapshot = { ...snapshot, backlog: { ...snapshot.backlog, businessRequirements: [] } };
  const validateCandidate = value => validateAnalysisBatchProposal(value, candidateSnapshot, sources, undefined, { idPrefix: candidatePrefix });
  let candidates;
  if (state.candidateRef) { candidates = readPart(state.candidateRef); validateCandidate(candidates); onReuse('candidate'); }
  else {
    onProgress('analysis', 0, 1);
    candidates = await invoke(candidateRequest, BATCH_ANALYSIS_SCHEMA, validateCandidate);
    state.candidateRef = await writePart(candidates); await persist();
  }
  const candidateIds = new Set(candidates.requirements.map(item => item.id));
  const knownIds = new Set([...previous.requirements.map(item => item.id), ...candidateIds]);
  const globalRequirementIndex = previous.requirements.map(({ id, title, requirementType, scope }) => ({ id, title, requirementType, ...(scope ? { scope } : {}) }));
  const records = [...previous.requirements.map(record => ({ kind: 'requirement', record })), ...previous.issues.map(record => ({ kind: 'issue', record })), ...(businessModel?.issues ?? []).map(record => ({ kind: 'business-question', record }))];
  const contextRequest = (currentCandidates, pages) => {
    const history = { requirements: [], issues: [] }, businessQuestions = [];
    for (const page of pages) {
      const values = page.kind === 'requirement' ? history.requirements : page.kind === 'issue' ? history.issues : businessQuestions;
      const old = values.find(item => item.id === page.record.id);
      if (old) old.citations.push(...structuredClone(page.record.citations)); else values.push(structuredClone(page.record));
    }
    return { phase: 'analysis-context', promptVersion: ANALYSIS_CONTEXT_VERSION, instructions: matchInstruction, data: { project: base.data.project, sources: base.data.sources, policySources: base.data.policySources ?? [], decisions: base.data.decisions, businessModel: base.data.businessModel, requirements: currentCandidates, previousAnalysis: history, businessQuestions, globalRequirementIndex, analysisBatch: { ...base.data.analysisBatch, idPrefix: state.prefix }, contextPages: pages.map(({ pageId, kind, proofOffset, proofCount, proofTotal, record }) => ({ pageId, kind, recordId: record.id, proofOffset, proofCount, proofTotal })) } };
  };
  const work = [];
  function planComparisons(currentCandidates) {
    if (!currentCandidates.length || !records.length) return;
    try {
      const pages = paginateContextRecords(records, entries => prepare(contextRequest(currentCandidates, entries), MATCH_SCHEMA), { limitBytes });
      const windows = packContextWindows(pages, entries => prepare(contextRequest(currentCandidates, entries), MATCH_SCHEMA), { limitBytes, maxItems: Math.min(256, Math.floor(512 / currentCandidates.length)) });
      for (const window of windows) work.push({ candidates: currentCandidates, pages: window.items, prepared: window.prepared, taskId: hash({ policyDigest, candidates: currentCandidates, pages: window.items.map(page => page.pageId) }) });
    } catch (error) {
      if (error.code !== 'AI_INPUT_TOO_LARGE' || currentCandidates.length === 1) throw error;
      const middle = Math.ceil(currentCandidates.length / 2); planComparisons(currentCandidates.slice(0, middle)); planComparisons(currentCandidates.slice(middle));
    }
  }
  for (let index = 0; index < candidates.requirements.length; index += 8) planComparisons(candidates.requirements.slice(index, index + 8));
  const contextCache = new Map(state.contexts.map(entry => [entry.taskId, entry.ref])), usedContext = new Set(), matchResults = [];
  if (state.contexts.some((entry, index) => entry.taskId !== work[index]?.taskId)) fail('AI_CHECKPOINT_INVALID');
  for (const [index, task] of work.entries()) {
    check(); onProgress('analysis-context', index, work.length);
    const value = contextRequest(task.candidates, task.pages), localCandidates = new Set(task.candidates.map(item => item.id)), localExisting = new Set(task.pages.filter(page => page.kind === 'requirement').map(page => page.record.id));
    const validate = reply => {
      const ids = new Set(reply.inspectedPageIds), expected = new Set(task.pages.map(page => page.pageId));
      if (ids.size !== reply.inspectedPageIds.length || ids.size !== expected.size || [...ids].some(id => !expected.has(id))) invalid('context-inspection');
      const links = new Set();
      for (const match of reply.matches) {
        const key = `${match.candidateId}/${match.requirementId}`;
        if (!localCandidates.has(match.candidateId) || !localExisting.has(match.requirementId) || links.has(key)) invalid('context-reference'); links.add(key);
      }
      assertIssues(reply.issues, snapshot, knownIds, allowedSources, task.pages);
    };
    let reply;
    if (contextCache.has(task.taskId)) { reply = readPart(contextCache.get(task.taskId)); validatePrivateAiValue(reply, MATCH_SCHEMA); validate(reply); onReuse('context'); }
    else {
      reply = await invoke(value, MATCH_SCHEMA, validate, task.prepared);
      state.contexts.push({ taskId: task.taskId, ref: await writePart(reply) }); await persist();
    }
    usedContext.add(task.taskId); matchResults.push(reply);
  }
  if ([...contextCache.keys()].some(id => !usedContext.has(id))) fail('AI_CHECKPOINT_INVALID');
  onProgress('analysis-context', work.length, work.length);
  const aliases = new Map(), additionalIssues = [];
  for (const candidate of candidates.requirements) {
    const targets = new Set(matchResults.flatMap(reply => reply.matches).filter(match => match.candidateId === candidate.id && match.relation === 'same').map(match => match.requirementId));
    aliases.set(candidate.id, targets.size === 1 ? [...targets][0] : candidate.id);
    if (targets.size > 1) additionalIssues.push({ id: `CTX-AMBIG-${hash({ candidate: candidate.id, targets: [...targets].sort() }).slice(0, 24)}`, kind: 'ambiguity', severity: 'blocking', question: `${candidate.title}: 기존 요구사항 ${[...targets].join(', ')}에 동시에 대응합니다. 기존 ID들을 보존했습니다. 동일 업무인지 별개의 범위인지 확인해 주세요.`, options: ['동일 업무의 대표 ID와 범위 결정', '별개 업무로 유지하고 범위 명시'], requirementIds: [candidate.id, ...targets], citations: structuredClone(candidate.citations.slice(0, 1)) });
  }
  const remapIssue = issue => ({ ...structuredClone(issue), requirementIds: [...new Set(issue.requirementIds.map(id => aliases.get(id) ?? id))] });
  for (const match of matchResults.flatMap(reply => reply.matches).filter(match => match.relation === 'conflict')) {
    const candidate = candidates.requirements.find(item => item.id === match.candidateId);
    additionalIssues.push({ id: `CTX-CONFLICT-${hash(match).slice(0, 24)}`, kind: 'conflict', severity: 'blocking', question: `${candidate.title}: 기존 ${match.requirementId}와 현재 근거 사이의 상충을 확인해 주세요. ${match.rationale}`, options: ['근거의 적용 범위와 우선순위 확인'], requirementIds: [candidate.id, match.requirementId], citations: structuredClone(candidate.citations.slice(0, 1)) });
  }
  const related = new Map();
  for (const match of matchResults.flatMap(reply => reply.matches).filter(match => match.relation === 'related')) {
    const id = aliases.get(match.candidateId);
    if (id === match.requirementId) continue;
    const key = JSON.stringify([id, match.requirementId]), candidate = candidates.requirements.find(item => item.id === match.candidateId);
    if (!related.has(key)) related.set(key, { id: `CTX-REL-${hash(key).slice(0, 24)}`, kind: 'risk', severity: 'observation', question: `계획 연계: ${id} ↔ ${match.requirementId}. ${match.rationale}`, options: [], requirementIds: [id, match.requirementId], citations: structuredClone(candidate.citations.slice(0, 1)) });
    else {
      const note = related.get(key), detail = ` ${match.rationale}`;
      if (!note.question.includes(match.rationale)) note.question += detail;
      if (note.question.length > 2000) fail('AI_ISSUE_CAPACITY');
    }
  }
  additionalIssues.push(...related.values());
  let newIssues = [...candidates.issues, ...matchResults.flatMap(reply => reply.issues), ...additionalIssues].map(remapIssue);
  const finalRequirements = new Map(previous.requirements.map(item => [item.id, structuredClone(item)])), groups = new Map();
  for (const candidate of candidates.requirements) {
    const target = aliases.get(candidate.id);
    if (target === candidate.id) finalRequirements.set(target, structuredClone(candidate));
    else { if (!groups.has(target)) groups.set(target, []); groups.get(target).push(candidate); }
  }
  const mergeCache = new Map(state.merges.map(entry => [entry.taskId, entry.ref])), usedMerges = new Set();
  let mergeCompleted = 0;
  for (const [targetId, pending] of groups) {
    for (let cursor = 0; cursor < pending.length;) {
      check();
      const existing = finalRequirements.get(targetId);
      const make = entries => ({ phase: 'analysis-merge', promptVersion: ANALYSIS_CONTEXT_VERSION, instructions: mergeInstruction, data: { project: base.data.project, sources: base.data.sources, policySources: base.data.policySources ?? [], decisions: base.data.decisions, businessModel: base.data.businessModel, analysisBatch: { ...base.data.analysisBatch, idPrefix: state.prefix }, mergeTargets: [{ existing: withoutProof(existing), candidates: entries }] } });
      const window = packContextWindows(pending.slice(cursor, cursor + 8), entries => prepare(make(entries), REQUIREMENT_REVIEW_SCHEMA), { limitBytes, maxItems: 8 })[0];
      const value = make(window.items), taskId = hash({ policyDigest, existing, candidates: window.items });
      if (usedMerges.size < state.merges.length && state.merges[usedMerges.size].taskId !== taskId) fail('AI_CHECKPOINT_INVALID');
      const validate = reply => {
        if (reply.revisions.length !== 1 || reply.revisions[0].id !== targetId) invalid('context-reference');
        validateEvidenceCitations(reply.revisions, snapshot);
        assertIssues(reply.issues, snapshot, knownIds, allowedSources);
        for (const cite of reply.revisions[0].citations) if (!allowedSources.some(source => source.id === cite.sourceId && source.clauses.some(clause => clause.id === cite.clauseId && clause.text.includes(cite.quote)))) invalid('context-unseen-citation');
      };
      onProgress('analysis-merge', mergeCompleted, Math.max(groups.size, mergeCompleted + 1));
      let reply;
      if (mergeCache.has(taskId)) { reply = readPart(mergeCache.get(taskId)); validatePrivateAiValue(reply, REQUIREMENT_REVIEW_SCHEMA); validate(reply); onReuse('merge'); }
      else {
        reply = await invoke(value, REQUIREMENT_REVIEW_SCHEMA, validate, window.prepared);
        state.merges.push({ taskId, ref: await writePart(reply) }); await persist();
      }
      usedMerges.add(taskId);
      const next = structuredClone(reply.revisions[0]);
      if (next.scope === undefined && existing.scope !== undefined) next.scope = existing.scope;
      next.citations = [];
      for (const cite of [...existing.citations, ...window.items.flatMap(item => item.citations), ...reply.revisions[0].citations]) if (!next.citations.some(old => sameQuote(old, cite))) next.citations.push(structuredClone(cite));
      if (next.citations.length > MAX_PROJECT_CITATIONS_PER_ITEM) fail('AI_CITATION_CAPACITY');
      finalRequirements.set(targetId, next); newIssues.push(...reply.issues.map(remapIssue));
      cursor += window.end; mergeCompleted++;
    }
  }
  if ([...mergeCache.keys()].some(id => !usedMerges.has(id))) fail('AI_CHECKPOINT_INVALID');
  onProgress('analysis-merge', mergeCompleted, mergeCompleted);
  const updates = [...groups.keys()], delta = { requirements: [...finalRequirements.values()].filter(item => !previous.requirements.some(old => old.id === item.id) || groups.has(item.id)), issues: mergeIssues([], newIssues), coverage: candidates.coverage.map(entry => ({ ...entry, requirementIds: [...new Set((entry.requirementIds ?? []).map(id => aliases.get(id) ?? id))] })), updatedRequirementIds: updates };
  const output = validateAnalysisBatchProposal(delta, snapshot, sources, previous, { idPrefix: candidatePrefix, aggregate: true });
  validatePrivateAiValue(output, projectProposalSchema(ANALYSIS_SCHEMA), { maxBytes: MAX_PROJECT_PROPOSAL_BYTES });
  return { output, delta, corrected, pending: structuredClone(state), comparisons: work.length };
}
