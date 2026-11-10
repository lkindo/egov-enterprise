import { buildStagePrompt, PROMPT_VERSION } from './ai-prompts.mjs';
import { readDocument, readingOmissions } from './document-reader.mjs';
import { prepareDocumentInputs } from './document-inputs.mjs';
import { BUSINESS_MODEL_MAX_BYTES, BUSINESS_MODEL_SCHEMA, REQUIREMENT_REVIEW_SCHEMA, PLAN_REVIEW_SCHEMA, validateDocumentSummaries, validateBusinessModel, mergeBusinessModels, validateRequirementReview, validatePlanReview, mergeIssues } from './ai-pipeline-contract.mjs';
import { buildAiRequest, DECOMPOSITION_SCHEMA, MAX_PROJECT_ISSUES, validateAnalysisProposal, validateDecompositionProposal, projectAnalysisBacklog, selectEvidenceQuote, validatePrivateAiValue } from './ai-contract.mjs';
import { matchRequirementsToContext } from '../../scripts/export-deliverables-workspace.mjs';
import { privateWorkspaceContracts } from './private-validation.mjs';
const { generateWorkPackagePlan } = privateWorkspaceContracts;
import { createHash } from 'node:crypto';
import { prepareEvidenceRequest } from './ai-evidence.mjs';
import { CONTEXT_WINDOW_BYTES } from './ai-analysis-batches.mjs';
export { reconcileAnalysisBatch } from './ai-context-reconciliation.mjs';

const fail = code => { throw Object.assign(new Error(code), { code }); };
const groups = (values, count) => Array.from({ length: Math.ceil(values.length / count) }, (_, index) => values.slice(index * count, (index + 1) * count));
function independentReviewGroups(first, second, issues) {
  // Uncited-clause reviews can discover related missing requirements; keep
  // those sequential. Known requirements need disjoint evidence and issues.
  if (!first?.requirements.length || !second?.requirements.length) return false;
  if ([...first.requirements, ...second.requirements].some(req => req.requirementType !== 'functional')) return false;
  const keys = entry => new Set(entry.sources.flatMap(source => source.clauses.map(clause => JSON.stringify([source.id, clause.id]))));
  const left = keys(first), right = keys(second);
  if ([...left].some(key => right.has(key))) return false;
  const texts = new Set(first.sources.flatMap(source => source.clauses.map(clause => clause.text)));
  if (second.sources.some(source => source.clauses.some(clause => texts.has(clause.text)))) return false;
  const firstIds = new Set(first.requirements.map(req => req.id)), secondIds = new Set(second.requirements.map(req => req.id));
  if ([...firstIds].some(id => secondIds.has(id))) return false;
  const touches = (issue, ids, clauses) => issue.requirementIds.some(id => ids.has(id)) || issue.citations.some(cite => clauses.has(JSON.stringify([cite.sourceId, cite.clauseId])));
  return !issues.some(issue => touches(issue, firstIds, left) && touches(issue, secondIds, right));
}
export function planningGroups(requirements, priorWork, priorAcceptance = [], maxItems = 4) {
  const parent = new Map(requirements.map(req => [req.id, req.id]));
  const root = id => { while (parent.get(id) !== id) id = parent.get(id); return id; };
  for (const item of [...priorWork.filter(item => item.workItemType !== 'epic'), ...priorAcceptance]) {
    const ids = item.requirementIds.filter(id => parent.has(id));
    for (const id of ids.slice(1)) parent.set(root(id), root(ids[0]));
  }
  const connected = new Map();
  for (const req of requirements) { const key = root(req.id); if (!connected.has(key)) connected.set(key, []); connected.get(key).push(req); }
  const result = []; let batch = [];
  for (const component of connected.values()) { if (batch.length && batch.length + component.length > maxItems) { result.push(batch); batch = []; } batch.push(...component); }
  if (batch.length) result.push(batch);
  return result;
}
function fitsRequest(value, schema) {
  try {
    const prepared = prepareEvidenceRequest(value, schema);
    return Buffer.byteLength(JSON.stringify(prepared.request)) + Buffer.byteLength(JSON.stringify(prepared.schema)) <= CONTEXT_WINDOW_BYTES;
  } catch (error) {
    if (!['AI_INPUT_TOO_LARGE', 'AI_DECOMPOSITION_INPUT_TOO_LARGE', 'AI_EVIDENCE_CAPACITY'].includes(error.code)) throw error;
    return false;
  }
}
function sourceEntries(sources) { return sources.flatMap(source => source.clauses.map(clause => ({ source, clause }))); }
function groupedSources(entries) {
  const sources = new Map();
  for (const { source, clause } of entries) {
    if (!sources.has(source.id)) sources.set(source.id, { ...source, clauses: [] });
    sources.get(source.id).clauses.push(clause);
  }
  return [...sources.values()];
}
function scopedIssueProof(issues, sources) {
  const clauses = sourceEntries(sources);
  return issues.map(issue => ({ ...issue, citations: issue.citations.filter(cite => clauses.some(({ source, clause }) => source.id === cite.sourceId && clause.id === cite.clauseId && clause.text.includes(cite.quote))) }));
}
function crossRequirementContext(output, requirements, snapshot) {
  const current = new Set(requirements.map(req => req.id)), linked = new Set();
  for (const issue of output.issues) if (issue.requirementIds.some(id => current.has(id))) for (const id of issue.requirementIds) linked.add(id);
  return output.requirements.filter(req => !current.has(req.id) && (req.requirementType !== 'functional' || linked.has(req.id))).map(({ citations: _proof, ...req }) => ({ ...structuredClone(req), scope: req.scope ?? snapshot.backlog.businessRequirements.find(old => old.id === req.id && ['included', 'excluded', 'deferred'].includes(old.scopeDisposition))?.scopeDisposition ?? 'included' }));
}
function proofWindow(entry) {
  // Every linked original clause is still supplied in full across these
  // windows. Avoid retransmitting its same historical quotes as a second copy.
  return { ...entry, requirements: entry.requirements.map(req => ({ ...req, citations: [] })), proofWindow: true };
}
function splitReviewEntries(entries, make, schema, splitMembers) {
  const result = [];
  function visit(entry) {
    if (fitsRequest(make(entry), schema)) { result.push(entry); return; }
    const split = splitMembers(entry);
    if (split.length > 1) { split.forEach(visit); return; }
    if (!entry.proofWindow) { visit(proofWindow(entry)); return; }
    const clauses = sourceEntries(entry.sources);
    if (clauses.length < 2) fail('AI_INPUT_TOO_LARGE');
    const middle = Math.ceil(clauses.length / 2);
    for (const items of [clauses.slice(0, middle), clauses.slice(middle)]) visit({ ...entry, sources: groupedSources(items) });
  }
  entries.forEach(visit); return result;
}
function assertSuppliedProof(output, input) {
  const proof = [], visit = value => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) if (key === 'citations') proof.push(...item); else visit(item);
  };
  visit(input.data);
  const clauses = sourceEntries(input.data.sources ?? []);
  const check = value => {
    if (Array.isArray(value)) { value.forEach(check); return; }
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (key !== 'citations') { check(item); continue; }
      for (const cite of item) if (!clauses.some(({ source, clause }) => source.id === cite.sourceId && clause.id === cite.clauseId && clause.text.includes(cite.quote)) && !proof.some(old => old.sourceId === cite.sourceId && old.clauseId === cite.clauseId && old.quote.includes(cite.quote))) throw Object.assign(Error('AI_OUTPUT_INVALID'), { code: 'AI_OUTPUT_INVALID', details: [{ kind: 'review-unseen-citation', path: '$' }] });
    }
  };
  check(output);
}
function request(stage, data, snapshot, { evidenceReferences = false } = {}) {
  const value = { phase: stage, promptVersion: PROMPT_VERSION, instructions: buildStagePrompt(stage, { sourceTypes: [...snapshot.backlog.sources.map(source => source.sourceType), ...(snapshot.metadata.imports ?? []).flatMap(job => job.detectedTypes ?? []), ...(data.documents ?? []).flatMap(doc => doc.documentTypes ?? [])], formats: (snapshot.metadata.imports ?? []).map(job => job.format), hasExisting: snapshot.backlog.businessRequirements.length > 0, hasDecisions: Boolean(snapshot.metadata.ai?.decisions.length) }), data };
  if (stage === 'synthesis' && data.correction) value.instructions += ' Regenerate the current synthesis once using the supplied invariant failures and original documents. The rejected draft is not supplied. Use exact provided source IDs for business entities and choose supplied evidenceIndex references for issue citations; the application restores verbatim source quotes. Preserve prior business evidence and human decisions, and never invent facts or approvals to pass validation.';
  if (Buffer.byteLength(JSON.stringify(value)) > (evidenceReferences ? 8 * 1024 ** 2 : 768 * 1024)) fail('AI_INPUT_TOO_LARGE');
  return value;
}
function evidence(snapshot, requirements) {
  const refs = new Set(requirements.flatMap(req => req.citations.map(cite => `${cite.sourceId}/${cite.clauseId}`)));
  return snapshot.backlog.sources.flatMap(source => { const clauses = source.clauses.filter(clause => refs.has(`${source.id}/${clause.id}`)); return clauses.length ? [{ ...source, clauses }] : []; });
}
function reviewContext(snapshot, requirements, links = []) {
  const context = snapshot.metadata.context;
  const fields = { capability: 'capabilities', screen: 'screens', interface: 'interfaces', table: 'tables', gate: 'gates', 'migration-mapping': 'migrationMappings' };
  const unique = new Map(links.map(link => [`${link.targetKind}/${link.targetId}`, link]));
  const observedTargets = [...unique.values()].map(link => {
    const normalize = id => ['table', 'migration-mapping'].includes(link.targetKind) ? String(id).toLowerCase() : id;
    const entry = (context[fields[link.targetKind]] ?? []).find(target => normalize(link.targetKind === 'screen' ? target.route : target.id) === normalize(link.targetId)) ?? null;
    return { targetKind: link.targetKind, targetId: link.targetId, entry };
  });
  return { project: snapshot.backlog.project, decisions: snapshot.metadata.ai?.decisions ?? [], modules: context.modules ?? [], repositoryMatches: matchRequirementsToContext({ businessRequirements: requirements }, context), observedTargets, contextRule: 'Repository matches are bounded candidates, not approval or exhaustive proof. observedTargets are exact observations in this supplied snapshot only; null does not prove global absence. Planned targets remain future work. Respect supplied human decisions; do not ask again about explicitly delegated implementation verification.' };
}
export function buildTaskPreview(pack, context, issues) {
  return issues.some(issue => issue.severity === 'blocking') ? '' : `> AI 검토 초안 — 사람의 최종 확인 전이며 기관 승인·개발 완료가 아닙니다.\n\n${generateWorkPackagePlan(pack, context).markdown}`;
}

export function documentAnchors(source) {
  const quotable = source.clauses.flatMap(clause => { const quote = selectEvidenceQuote(clause.text); return quote ? [{ sourceId: source.id, clauseId: clause.id, quote }] : []; });
  return quotable.length <= 32 ? quotable : Array.from({ length: 32 }, (_, at) => quotable[Math.round(at * (quotable.length - 1) / 31)]);
}
function discoveryEvidence(batch, previousModel) {
  const citations = [], indexes = new Map();
  const indexFor = citation => {
    const value = { sourceId: citation.sourceId, clauseId: citation.clauseId, quote: citation.quote };
    const key = JSON.stringify(value);
    if (!indexes.has(key)) { indexes.set(key, citations.length); citations.push(value); }
    return indexes.get(key);
  };
  const documents = batch.map(document => ({ ...structuredClone(document), anchors: document.anchors.map(anchor => ({ ...anchor, evidenceIndex: indexFor(anchor) })) }));
  const previousIssueEvidence = (previousModel?.issues ?? []).map(issue => ({ issueId: issue.id, evidenceIndexes: issue.citations.map(indexFor) }));
  return { documents, previousIssueEvidence, citations };
}
function resolveDiscoveryEvidence(output, citations) {
  const value = structuredClone(output);
  for (const [issueIndex, issue] of value.issues.entries()) {
    const selectedIndexes = new Set();
    issue.citations = issue.citations.map(({ evidenceIndex }, citationIndex) => {
      if (!Number.isSafeInteger(evidenceIndex) || evidenceIndex < 0 || evidenceIndex >= citations.length || selectedIndexes.has(evidenceIndex)) throw Object.assign(new Error('AI_OUTPUT_INVALID'), { code: 'AI_OUTPUT_INVALID', details: [{ kind: 'citation-reference', path: `$.issues[${issueIndex}].citations[${citationIndex}]` }] });
      selectedIndexes.add(evidenceIndex);
      return structuredClone(citations[evidenceIndex]);
    });
  }
  return value;
}
function invalidDiscoveryBudget() {
  throw Object.assign(new Error('AI_OUTPUT_INVALID'), { code: 'AI_OUTPUT_INVALID', details: [{ kind: 'business-model-budget', path: '$' }] });
}
export async function prepareBusinessModel(snapshot, { run, cwd, signal, sourceReading = () => null, onStage = () => {}, onValidated = () => {} }) {
  const anchorsBySource = new Map(snapshot.backlog.sources.map(source => [source.id, documentAnchors(source)]));
  if ([...anchorsBySource.values()].some(anchors => !anchors.length)) fail('AI_DOCUMENT_UNREADABLE');
  const documents = [];
  for (const [index, source] of snapshot.backlog.sources.entries()) {
    onStage('reading', index, snapshot.backlog.sources.length);
    let reading = sourceReading(source.id);
    if (!reading) {
      if (source.fileSha256 && snapshot.metadata.imports?.some(job => job.status === 'ready' && job.sourceId === source.id && job.originalRef)) fail('AI_DOCUMENT_READING_REQUIRED');
      const bytes = Buffer.from(source.clauses.map(clause => clause.text).join('\n\n'));
      const result = await readDocument({ filename: `${source.id}.txt`, bytes }, { cwd, signal, sourceType: source.sourceType, execute: run,
        prepare: async () => ({ ...await prepareDocumentInputs({ filename: `${source.id}.txt`, bytes }, { cwd, signal }), warningCodes: ['DOCUMENT_REGISTERED_TEXT_ONLY'] }) });
      reading = result.reading;
    }
    onValidated('reading', reading);
    const anchors = anchorsBySource.get(source.id);
    documents.push({ sourceId: source.id, title: source.title, sourceType: source.sourceType, documentTypes: reading.documentTypes ?? [source.sourceType], summary: reading.summary, sections: [...new Set(reading.blocks.map(block => block.heading))], warningCodes: reading.warningCodes ?? [], unreadable: reading.unreadable, uncertain: reading.blocks.filter(block => block.certainty === 'uncertain').map(block => ({ inputId: block.inputId, note: block.note })), clauseCount: source.clauses.length, anchorScope: 'Representative quotations only; all original clauses remain available to requirement analysis.', anchors });
  }
  onStage('reading', documents.length, documents.length);
  try { validateDocumentSummaries(documents, snapshot); }
  catch (error) { if (error.code === 'AI_OUTPUT_INVALID') fail('AI_DOCUMENT_INPUT_INVALID'); throw error; }
  const readingIssues = [];
  for (const doc of documents) {
    const omissions = readingOmissions(doc.warningCodes);
    if (!doc.unreadable.length && !doc.uncertain.length && !omissions.length) continue;
    const original = snapshot.backlog.sources.find(source => source.id === doc.sourceId);
    const id = `DOC-${createHash('sha256').update(JSON.stringify([original.id, original.fileSha256 ?? original.clauses, PROMPT_VERSION, doc.unreadable, doc.uncertain, omissions])).digest('hex').slice(0, 24)}`;
    if (snapshot.metadata.ai?.decisions.some(decision => decision.issueId === id)) continue;
    const anchor = doc.anchors[0];
    const details = [...doc.unreadable.map(item => item.reason), ...doc.uncertain.map(item => item.note), ...omissions].join(' / ');
    readingIssues.push({ id, kind: 'missing', severity: 'blocking', question: `${doc.title}: 판독 불확실 구간을 원본과 대조해 주세요. ${details}`.slice(0, 1900), options: ['원본 대조 후 정확한 내용 답변', '판독 가능한 사본을 등록한 후 다시 분석'], requirementIds: [], citations: [anchor] });
  }
  let model;
  const synthesisSchema = structuredClone(BUSINESS_MODEL_SCHEMA);
  synthesisSchema.properties.summary.maxLength = 2000;
  synthesisSchema.properties.actors.items.properties.responsibility.maxLength = 240;
  synthesisSchema.properties.terms.items.properties.meaning.maxLength = 240;
  synthesisSchema.properties.sourceCoverage.items.properties.rationale.maxLength = 240;
  const processFields = synthesisSchema.properties.processes.items.properties;
  processFields.trigger.maxLength = 240;
  for (const field of ['steps', 'exceptions', 'rules', 'data']) {
    processFields[field].maxItems = 6;
    processFields[field].items.maxLength = field === 'data' ? 180 : 240;
  }
  synthesisSchema.description += ' 중간 업무 지도는 행위자·업무 흐름·용어를 찾는 간결한 색인이다. 문서 통합의 구체성은 이 형식 상한과 색인 지시 안에서 충족한다. discoveryBudget.absoluteMaxBytes는 판독 질문까지 합친 최종 전체 UTF-8 상한이다. targetBatchBytes와 targetMergedBytesForBatch는 판독 질문 공간을 예약한 뒤 남은 공간의 75%를 묶음 수에 따라 나눈 간결성 목표다. 첫 응답이 목표를 넘으면 한 번 보정한다. maxMergedBytesForBatch는 판독 질문과 아직 처리하지 않은 문서의 최소 출처 색인 공간을 예약한 실제 수용 상한이다. 보정 후 필요한 근거·질문이 목표보다 크더라도 실제 수용 상한 이내면 보존한다. 마지막 묶음도 첫 응답은 목표 기준으로 확인하며, 보정 후 실제 상한까지 사용할 수 있다. readingIssueCount개의 판독 질문도 보존하므로 업무 지도 질문과 합친 전체 질문 개수가 maxIssues를 넘지 않게 한다. previousModelBytes와 비교해 남은 용량을 사용한다. correction.budget의 reason과 실제/허용 바이트를 보고 해당 원인만 보정한다. 요약·행위자·흐름·용어·sourceCoverage·issues·선택한 원문 인용 전체를 계산한다. summary는 교체되지만 나머지 항목과 미해결 질문은 누적되므로 처음부터 전체 공간을 소비하지 않는다. 흐름·규칙·데이터와 질문은 짧고 명확한 식별 문장으로 정리한다. 세부 조건·필드·인수 기준은 다음 단계에서 전체 원문 조항을 읽어 요구사항으로 만든다. 변경 없는 기존 항목은 반환에서 생략한다. 기존 항목에는 새 사실·배열 원소만 추가하며 이전 설명을 바꿔 쓰거나 반복하지 않는다. 새 근거 문서만 연결할 때는 기존 설명의 짧은 문구를 그대로 쓰고 새 배열 원소가 없으면 빈 배열을 반환한다. 병합은 기존 설명·배열·출처를 보존한다. 같은 결정과 근거의 질문만 통합하고 질문마다 실제로 필요한 인용을 선택한다. 서로 다른 업무·정책을 합치거나 미해결 질문·상충 근거·원문을 삭제하여 줄이지 않는다. 필요한 질문을 숨기거나 없는 정책으로 용량을 맞추지 않는다.';
  if (!snapshot.backlog.businessRequirements.length) {
    synthesisSchema.properties.issues.items.properties.requirementIds.maxItems = 0;
    synthesisSchema.description += ' No project requirements are registered yet: every issue.requirementIds must be []. Keep questions and choose evidenceIndex references for citations; source document labels are not registered project requirement IDs.';
  }
  const batches = groups(documents, 4);
  const maximumEvidenceIndex = Math.max(0, documents.reduce((count, document) => count + document.anchors.length, 0) - 1);
  const readingIssueBytes = readingIssues.length ? Buffer.byteLength(JSON.stringify(readingIssues)) : 0;
  const targetBatchBytes = Math.max(0, Math.floor((BUSINESS_MODEL_MAX_BYTES - readingIssueBytes) * 0.75 / batches.length));
  const minimumCoverage = documents.map(doc => ({ sourceId: doc.sourceId, role: 'business', rationale: 'x' }));
  const minimum = { summary: 'x', actors: [], processes: [], terms: [], sourceCoverage: minimumCoverage, issues: [] };
  const availableModelBytes = BUSINESS_MODEL_MAX_BYTES - readingIssueBytes;
  if (Buffer.byteLength(JSON.stringify(minimum)) > availableModelBytes) fail('AI_BUSINESS_MODEL_CAPACITY');
  for (const [index, batch] of batches.entries()) {
    onStage('synthesis', index, batches.length);
    const evidence = discoveryEvidence(batch, model);
    const reference = { type: 'object', properties: { evidenceIndex: { type: 'integer' } }, required: ['evidenceIndex'], additionalProperties: false };
    const nativeSchema = structuredClone(synthesisSchema), transportSchema = structuredClone(BUSINESS_MODEL_SCHEMA);
    for (const schema of [nativeSchema, transportSchema]) schema.properties.issues.items.properties.citations.items = structuredClone(reference);
    // Keep the archived generation schema stable across batches; the local
    // resolver enforces this call's smaller, exact evidence range.
    nativeSchema.properties.issues.items.properties.citations.items.properties.evidenceIndex.minimum = 0;
    nativeSchema.properties.issues.items.properties.citations.items.properties.evidenceIndex.maximum = maximumEvidenceIndex;
    nativeSchema.description += ' 인용 출력은 { evidenceIndex: 정수 }만 사용한다. 실제 선택 범위는 0 이상 evidenceCount 미만이며 이번 documents[].anchors[].evidenceIndex 또는 previousIssueEvidence의 evidenceIndexes에서 질문에 실제로 관련된 근거 번호만 선택한다. 한 질문 안에서 같은 근거 번호를 중복 선택하지 않는다. previousIssueEvidence는 같은 issueId의 이전 citations 순서와 대응한다. 출처·조항 ID나 인용문을 새로 작성하거나 덧붙이지 않는다. 프로그램이 선택한 번호의 검증된 원문 인용을 그대로 연결한다. 번호를 짧게 반환해도 연결된 인용문 전체가 실제 누적 용량에 포함되므로 필요한 근거만 선택한다. 이전 질문을 생략해도 병합에서 유지된다.';
    let data = { documents: evidence.documents, previousModel: model ? structuredClone(model) : null, previousIssueEvidence: evidence.previousIssueEvidence, evidenceCount: evidence.citations.length, decisions: snapshot.metadata.ai?.decisions ?? [], coverageRule: 'sourceCoverage must contain exactly the current documents. Return additions/updates for actors/processes/terms; the application retains omitted earlier entries and all unresolved issues. summary integrates previousModel. Choose supplied evidenceIndex references for issue citations; the application resolves them to immutable source quotations.' };
    const remainingCoverage = minimumCoverage.slice((index + 1) * 4);
    const remainingCoverageBytes = remainingCoverage.length ? Buffer.byteLength(JSON.stringify(remainingCoverage)) - 1 : 0;
    data.discoveryBudget = { absoluteMaxBytes: BUSINESS_MODEL_MAX_BYTES, targetBatchBytes, targetMergedBytesForBatch: targetBatchBytes * (index + 1), maxMergedBytesForBatch: availableModelBytes - remainingCoverageBytes, readingIssueBytes, readingIssueCount: readingIssues.length, maxIssues: MAX_PROJECT_ISSUES, maxIssuesPerResponse: BUSINESS_MODEL_SCHEMA.properties.issues.maxItems, previousModelBytes: model ? Buffer.byteLength(JSON.stringify(model)) : 0, batch: index + 1, batches: batches.length };
    for (let attempt = 0; attempt < 2; attempt++) {
      if (signal?.aborted) fail('AI_CANCELLED');
      let budgetFeedback;
      try {
        const response = await run({ request: request('synthesis', structuredClone(data), snapshot), schema: structuredClone(nativeSchema), cwd, signal });
        if (signal?.aborted) fail('AI_CANCELLED');
        try { validatePrivateAiValue(response.output, transportSchema, { maxBytes: BUSINESS_MODEL_MAX_BYTES }); }
        catch (error) { if (error.code === 'AI_OUTPUT_INVALID' && error.details?.some(detail => detail.kind === 'output-size')) fail('AI_BUSINESS_MODEL_CAPACITY'); throw error; }
        const delta = validateBusinessModel(resolveDiscoveryEvidence(response.output, evidence.citations), snapshot, batch.map(doc => doc.sourceId));
        validatePrivateAiValue(response.output, nativeSchema, { maxBytes: BUSINESS_MODEL_MAX_BYTES });
        let candidate;
        try { candidate = mergeBusinessModels(model, delta, snapshot); mergeIssues(candidate.issues, readingIssues); }
        catch (error) {
          const mergedSchemaCapacity = error.code === 'AI_OUTPUT_INVALID' && error.details?.some(detail => detail.kind === 'schema');
          if (attempt === 0 && (mergedSchemaCapacity || ['AI_BUSINESS_MODEL_CAPACITY', 'AI_ISSUE_CAPACITY'].includes(error.code))) {
            budgetFeedback = { reason: error.code === 'AI_ISSUE_CAPACITY' ? 'issues' : mergedSchemaCapacity ? 'merged-schema' : 'merged-bytes', maxIssues: data.discoveryBudget.maxIssues, readingIssueCount: readingIssues.length };
            invalidDiscoveryBudget();
          }
          if (mergedSchemaCapacity) fail('AI_BUSINESS_MODEL_CAPACITY');
          throw error;
        }
        const candidateBytes = Buffer.byteLength(JSON.stringify(candidate)), hardLimitBytes = data.discoveryBudget.maxMergedBytesForBatch;
        if (candidateBytes > hardLimitBytes || (attempt === 0 && candidateBytes > data.discoveryBudget.targetMergedBytesForBatch)) {
          if (attempt === 1) fail('AI_BUSINESS_MODEL_CAPACITY');
          budgetFeedback = { reason: 'bytes', actualBytes: candidateBytes, limitBytes: Math.min(hardLimitBytes, data.discoveryBudget.targetMergedBytesForBatch), hardLimitBytes };
          invalidDiscoveryBudget();
        }
        model = candidate;
        break;
      } catch (error) {
        if (signal?.aborted) fail('AI_CANCELLED');
        if (error.code !== 'AI_OUTPUT_INVALID' || attempt === 1) throw error;
        const details = Array.isArray(error.details) && error.details.length ? error.details : [{ kind: 'schema', path: '$' }];
        const violations = details.map(detail => ({ kind: typeof detail?.kind === 'string' && /^[a-z-]{1,80}$/.test(detail.kind) ? detail.kind : 'schema', path: typeof detail?.path === 'string' && /^[a-zA-Z0-9_$.\[\]-]{1,200}$/.test(detail.path) ? detail.path : '$' }));
        if (violations.some(detail => detail.kind === 'output-size')) throw error;
        data = { ...data, correction: { violations, budget: budgetFeedback ?? { reason: 'target', limitBytes: data.discoveryBudget.targetMergedBytesForBatch, hardLimitBytes: data.discoveryBudget.maxMergedBytesForBatch } } };
      }
    }
    onStage('synthesis', index + 1, batches.length);
  }
  model.issues = mergeIssues(model.issues, readingIssues);
  validateBusinessModel(model, snapshot, snapshot.backlog.sources.map(source => source.id));
  onValidated('synthesis', model);
  return { documents, businessModel: model };
}

export async function reviewRequirements(output, businessModel, snapshot, { run, cwd, signal, onStage = () => {}, concurrency = 1, resumeReplies = [], resumeTaskIds = null, onReset = () => {}, onReply = () => {}, onReuse = () => {}, evidenceReferences = false }) {
  let result = { ...structuredClone(output), issues: mergeIssues(output.issues, businessModel?.issues ?? []) };
  let batches = groups(output.requirements, 6).map(requirements => ({ requirements, sources: evidence(snapshot, requirements) }));
  const cited = new Set(output.requirements.flatMap(req => req.citations.map(cite => `${cite.sourceId}/${cite.clauseId}`)));
  const omitted = snapshot.backlog.sources.flatMap(source => source.clauses.filter(clause => !cited.has(`${source.id}/${clause.id}`)).map(clause => ({ source, clause })));
  for (const entries of groups(omitted, 32)) {
    const sources = new Map();
    for (const { source, clause } of entries) { if (!sources.has(source.id)) sources.set(source.id, { ...source, clauses: [] }); sources.get(source.id).clauses.push(clause); }
    batches.push({ requirements: [], sources: [...sources.values()] });
  }
  const makeReview = (entry, index, total, base, checkedIssues) => {
    const batch = entry.requirements.map(item => {
      const current = base.requirements.find(req => req.id === item.id) ?? item;
      return entry.proofWindow ? { ...current, citations: [] } : current;
    }), ids = new Set(batch.map(req => req.id));
    const declaredIssues = new Set(base.issues.map(issue => issue.id));
    const validationIssues = checkedIssues.filter(issue => !declaredIssues.has(issue.id) && (!issue.requirementIds.length || issue.requirementIds.some(id => ids.has(id))));
    const issueProof = issues => scopedIssueProof(issues, entry.sources);
    return request('review-requirements', { ...reviewContext(snapshot, batch), reviewBatch: { index: index + 1, total, proofWindow: Boolean(entry.proofWindow) }, businessModel: businessModel ? { ...businessModel, issues: issueProof(businessModel.issues) } : businessModel, crossRequirementContext: crossRequirementContext(base, batch, snapshot), requirements: batch, sources: entry.sources, coverage: output.coverage.filter(item => entry.sources.some(source => source.id === item.sourceId && source.clauses.some(clause => clause.id === item.clauseId))), existingIssues: issueProof(base.issues), validationIssues: issueProof(validationIssues), reviewContract: 'Return issues and revisions. Revisions are complete replacements for current requirement IDs only, never new requirements or scope changes. Use supplied decisions and repository evidence to check solutionDisposition; undecided blocks executable planning. For non-functional/data/constraint requirements, nfrCriteria needs a source-supported metric, threshold and verificationMethod; qualitative allow/deny criteria are valid and do not require invented numeric SLAs. validationIssues are recomputed application checks: repair their causes only when supported, never copy a resolved system question into issues. A batch with no requirements independently reviews uncited source clauses and their excluded/deferred coverage: report missing business requirements or unjustified exclusions as source-cited issues; do not silently accept the earlier coverage rationale. crossRequirementContext preserves the complete meanings of other global constraints and linked requirements, which receive their own original-proof review. Apply these conditions without changing their IDs or scope. Fix wording/structure only when fully supported; policy ambiguity needs a blocking issue. Retain all verified citations. In proofWindow mode complete requirement and question meanings are repeated and every original clause is visited across windows. Only proof within the supplied full clauses is repeated here; the host retains ALL original requirement/question citations. Cite this supplied window only. Never remove a condition because another source window is absent. Do not return coverage or a self-awarded pass.' }, snapshot, { evidenceReferences });
  };
  const originalBatches = batches, checked = validateAnalysisProposal(result, snapshot).issues;
  batches = splitReviewEntries(batches, entry => makeReview(entry, 0, 3000, result, checked), REQUIREMENT_REVIEW_SCHEMA, entry => {
    if (entry.requirements.length < 2) return [entry];
    return groups(entry.requirements, Math.ceil(entry.requirements.length / 2)).map(requirements => ({ requirements, sources: evidence(snapshot, requirements) }));
  });
  const taskIds = batches.map(entry => createHash('sha256').update(JSON.stringify(entry)).digest('hex'));
  if (!Array.isArray(resumeReplies) || resumeTaskIds !== null && (!Array.isArray(resumeTaskIds) || resumeTaskIds.length !== resumeReplies.length || resumeTaskIds.some((id, index) => id !== taskIds[index]))) fail('AI_CHECKPOINT_INVALID');
  if (resumeTaskIds === null && resumeReplies.length && JSON.stringify(originalBatches) !== JSON.stringify(batches)) { resumeReplies = []; onReset(); }
  if (![1, 2].includes(concurrency) || resumeReplies.length > batches.length) fail('AI_CHECKPOINT_INVALID');
  const pending = new Map(), controller = new AbortController(), abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true }); if (signal?.aborted) abort();
  const launch = (index, base, checkedIssues) => {
    const value = makeReview(batches[index], index, batches.length, base, checkedIssues);
    if (!fitsRequest(value, REQUIREMENT_REVIEW_SCHEMA)) fail('AI_INPUT_TOO_LARGE');
    return run({ request: value, schema: REQUIREMENT_REVIEW_SCHEMA, cwd, signal: controller.signal }).then(response => ({ response, request: value }), error => ({ error }));
  };
  try {
  for (const [index, entry] of batches.entries()) {
    onStage('review-requirements', index, batches.length);
    if (controller.signal.aborted) fail('AI_CANCELLED');
    const cached = index < resumeReplies.length;
    if (!cached && !pending.size) {
      const checkedIssues = validateAnalysisProposal(result, snapshot).issues;
      pending.set(index, launch(index, result, checkedIssues));
      if (concurrency === 2 && independentReviewGroups(entry, batches[index + 1], checkedIssues)) pending.set(index + 1, launch(index + 1, result, checkedIssues));
    }
    const received = cached ? { response: { output: resumeReplies[index] } } : await pending.get(index); pending.delete(index);
    if (received.error) throw received.error;
    const response = received.response, ids = new Set(entry.requirements.map(req => req.id));
    validatePrivateAiValue(response.output, REQUIREMENT_REVIEW_SCHEMA);
    assertSuppliedProof(response.output, received.request ?? makeReview(entry, index, batches.length, result, validateAnalysisProposal(result, snapshot).issues));
    if (response.output.revisions?.some(req => !ids.has(req.id))) fail('AI_OUTPUT_INVALID');
    result = validateRequirementReview(response.output, result, snapshot);
    validateAnalysisProposal(result, snapshot);
    if (!cached) await onReply(index, response.output, result, taskIds[index]); else await onReuse(index, result, taskIds[index]);
    onStage('review-requirements', index + 1, batches.length);
  }
  } finally { abort(); await Promise.allSettled(pending.values()); signal?.removeEventListener('abort', abort); }
  return result;
}

export async function planAndReview(output, businessModel, snapshot, decisions, { run, cwd, signal, onStage = () => {}, onValidated = () => {}, idPrefix = 'PLAN-', evidenceReferences = false, resumePlanning = null, resumeReplies = [], resumeTaskIds = null, onReset = () => {}, onGenerated = () => {}, onReviewReply = () => {}, onReuse = () => {} }) {
  const analysis = validateAnalysisProposal(output, snapshot), draft = { ...snapshot, backlog: projectAnalysisBacklog(snapshot, analysis) };
  const included = draft.backlog.businessRequirements.filter(req => req.scopeDisposition === 'included');
  if (!included.length) fail('AI_NO_EXECUTABLE_REQUIREMENTS');
  const batches = planningGroups(included, snapshot.backlog.workItems, snapshot.backlog.acceptanceCriteria);
  let plan = { workItems: structuredClone(snapshot.backlog.workItems), acceptanceCriteria: structuredClone(snapshot.backlog.acceptanceCriteria), traceLinks: structuredClone(snapshot.backlog.traceLinks), issues: [], retirements: [] };
  const original = Object.fromEntries(['workItems', 'acceptanceCriteria', 'traceLinks'].map(field => [field, new Map(plan[field].map(item => [item.id, structuredClone(item)]))]));
  if (!resumePlanning) {
  for (let index = 0; index < batches.length; index++) {
    const batch = batches[index];
    onStage('decomposition', index, batches.length);
    const ids = new Set(batch.map(req => req.id)), executable = new Set(included.map(req => req.id));
    // Full shared epics and explicit retirement candidates remain visible.
    // Unrelated executable children keep their full records in the canonical
    // plan and expose only the global dependency index to this group.
    const details = plan.workItems.filter(item => item.workItemType === 'epic' || item.requirementIds.some(id => ids.has(id)) || item.requirementIds.every(id => !executable.has(id)));
    const childIds = new Set(details.filter(item => item.workItemType !== 'epic').map(item => item.id));
    const acceptance = plan.acceptanceCriteria.filter(item => childIds.has(item.workItemId) || item.requirementIds.some(id => ids.has(id)) || item.requirementIds.every(id => !executable.has(id)));
    const traces = plan.traceLinks.filter(item => childIds.has(item.workItemId) || ids.has(item.requirementId) || !executable.has(item.requirementId));
    const input = { ...draft, backlog: { ...draft.backlog, businessRequirements: batch, workItems: details, acceptanceCriteria: acceptance, traceLinks: traces } };
    const req = buildAiRequest(input, 'decomposition', decisions, { analysisEvidence: analysis, evidenceReferences });
    req.data.businessModel = businessModel ? { ...businessModel, issues: scopedIssueProof(businessModel.issues, req.data.sources) } : businessModel;
    req.data.analysisIssues = scopedIssueProof(output.issues, req.data.sources);
    req.data.crossRequirementContext = crossRequirementContext(output, batch, draft);
    req.data.requirementScopeIndex = draft.backlog.businessRequirements.map(req => ({ id: req.id, scopeDisposition: req.scopeDisposition }));
    req.data.planningBatch = { index: index + 1, total: batches.length, idPrefix: `${idPrefix}${index + 1}-`, requirementIds: [...ids] };
    req.data.previousPlanIndex = plan.workItems.map(item => ({ id: item.id, title: item.title, workItemType: item.workItemType, parentEpicId: item.parentEpicId, requirementIds: item.requirementIds, dependsOn: item.dependsOn ?? [], priority: item.priority ?? null, batch: item.batch ?? null }));
    req.instructions += '\nSequential planning contract: Return only new/changed work/AC/trace entries and explicit retirements. Omitted entries remain preserved. Current executable children and ACs may refer only to planningBatch.requirementIds. requirementScopeIndex lists the whole project: included requirements in other batches remain in scope. Leave their child work/AC/trace unchanged and never retire them. Existing children connected across requirements are deliberately kept in the same batch. Existing epics may be shared and their requirement sets are unioned by the application. When total>1, new IDs MUST start with planningBatch.idPrefix; original supplied plan IDs may be updated only for their existing requirement meaning. Do not retire a generated entry from another batch. New dependencies can reference known previousPlanIndex IDs. Every excluded prior original entry needs an explicit retirement. crossRequirementContext gives complete meanings of other global constraints and linked requirements; apply their source-backed conditions while respecting scope and requirementScopeIndex. They remain outside this batch work scope. analysisIssues preserves all source-analysis questions and relationship notes; their proof is repeated only where its original clause is supplied, and the host preserves all original proof.';
    if (!fitsRequest(req, DECOMPOSITION_SCHEMA)) {
      const smaller = planningGroups(batch, snapshot.backlog.workItems, snapshot.backlog.acceptanceCriteria, 1);
      if (smaller.length < 2) fail('AI_DECOMPOSITION_INPUT_TOO_LARGE');
      batches.splice(index, 1, ...smaller); index--; continue;
    }
    const response = await run({ request: req, schema: DECOMPOSITION_SCHEMA, cwd, signal });
    const delta = response.output;
    // Check the delta vocabulary before merging; the full structural contract
    // is checked below against the complete projected requirement scope.
    const { validatePrivateAiValue } = await import('./ai-contract.mjs'); validatePrivateAiValue(delta, DECOMPOSITION_SCHEMA);
    for (const [field, items] of [['workItems', delta.workItems], ['acceptanceCriteria', delta.acceptanceCriteria], ['traceLinks', delta.traceLinks]]) {
      for (const item of items) {
        const old = plan[field].find(value => value.id === item.id), itemReqs = item.requirementIds ?? [item.requirementId];
        if (field !== 'workItems' || item.workItemType !== 'epic') if (itemReqs.some(id => !ids.has(id))) fail('AI_OUTPUT_INVALID');
        const previous = original[field].get(item.id);
        if (batches.length > 1 && !previous && !(field === 'workItems' && old?.workItemType === 'epic') && !item.id.startsWith(req.data.planningBatch.idPrefix)) fail('AI_OUTPUT_INVALID');
        const sharedEpic = field === 'workItems' && previous?.workItemType === 'epic' && item.workItemType === 'epic';
        if (previous && !sharedEpic && !(itemReqs.some(id => (previous.requirementIds ?? [previous.requirementId]).includes(id)))) fail('AI_OUTPUT_INVALID');
        const value = structuredClone(item);
        if (field === 'workItems' && item.workItemType === 'epic') {
          if (old) value.requirementIds = [...new Set([...old.requirementIds.filter(id => executable.has(id)), ...item.requirementIds])];
        }
        if (old) plan[field][plan[field].findIndex(entry => entry.id === item.id)] = value; else plan[field].push(value);
      }
    }
    const epicRetirement = item => item.entity === 'workItem' && original.workItems.get(item.id)?.workItemType === 'epic' ? 1 : 0;
    for (const retirement of [...(delta.retirements ?? [])].sort((a, b) => epicRetirement(a) - epicRetirement(b))) {
      if (plan.retirements.some(item => item.entity === retirement.entity && item.id === retirement.id)) continue;
      const field = { workItem: 'workItems', acceptanceCriterion: 'acceptanceCriteria', traceLink: 'traceLinks' }[retirement.entity];
      if (!original[field].has(retirement.id)) fail('AI_OUTPUT_INVALID');
      const previous = original[field].get(retirement.id), priorIds = previous.requirementIds ?? [previous.requirementId];
      if (priorIds.some(id => included.some(req => req.id === id)) && !priorIds.some(id => ids.has(id))) fail('AI_OUTPUT_INVALID');
      if (field === 'workItems' && previous.workItemType === 'epic' && plan.workItems.some(item => item.parentEpicId === retirement.id)) fail('AI_OUTPUT_INVALID');
      plan[field] = plan[field].filter(item => item.id !== retirement.id);
      if (!plan.retirements.some(item => item.entity === retirement.entity && item.id === retirement.id)) plan.retirements.push(retirement);
    }
    plan.issues = mergeIssues(plan.issues, delta.issues);
    onStage('decomposition', index + 1, batches.length);
  }
  // Epic coverage follows the actual proposed children, including unchanged
  // children retained by delta merging. Scope exclusions remain separately
  // visible and require the existing final acknowledgements.
  for (const epic of plan.workItems.filter(item => item.workItemType === 'epic')) {
    const covered = [...new Set(plan.workItems.filter(item => item.parentEpicId === epic.id).flatMap(item => item.requirementIds))];
    if (covered.length) epic.requirementIds = covered;
  }
  validateDecompositionProposal(plan, draft);
  } else {
    validateDecompositionProposal(resumePlanning, draft);
    plan = structuredClone(resumePlanning);
    onStage('decomposition', batches.length, batches.length);
    await onReuse('generation');
  }
  onValidated('decomposition', plan);
  if (!resumePlanning) await onGenerated(plan);
  const entryFor = children => {
    const ids = new Set(children.flatMap(item => item.requirementIds)), requirements = output.requirements.filter(req => ids.has(req.id));
    return { children, requirements, sources: evidence(snapshot, requirements) };
  };
  const makeReview = (entry, index, total) => {
    const children = entry.children, requirements = entry.requirements, workIds = new Set(children.map(item => item.id)), reqIds = new Set(requirements.map(req => req.id));
    return request('review-plan', { ...reviewContext(snapshot, requirements, plan.traceLinks.filter(link => reqIds.has(link.requirementId))), reviewBatch: { index: index + 1, total, proofWindow: Boolean(entry.proofWindow) }, businessModel: businessModel ? { ...businessModel, issues: scopedIssueProof(businessModel.issues, entry.sources) } : businessModel, analysisIssues: scopedIssueProof(output.issues, entry.sources), crossRequirementContext: crossRequirementContext(output, requirements, draft), requirements, sources: entry.sources, workItems: plan.workItems.filter(item => workIds.has(item.id) || children.some(child => child.parentEpicId === item.id)), acceptanceCriteria: plan.acceptanceCriteria.filter(ac => workIds.has(ac.workItemId)), traceLinks: plan.traceLinks.filter(link => reqIds.has(link.requirementId)), existingIssues: scopedIssueProof(plan.issues, entry.sources), reviewContract: 'Return issues, workItemUpdates, acceptanceUpdates and traceUpdates. These are updates of known current-batch IDs only, never new entries or implicit removals. Preserve the complete original requirement set of shared epics and ACs; never reduce it to the current review subset. Preserve work types, parent relationships and required original evidence. Apply the complete meanings of global constraints and linked requirements in crossRequirementContext, respecting their scope. Preserve the relationships in analysisIssues. Only repair concrete supported defects; missing policy stays a blocking question. Do not manufacture completed tests or human approval. In proofWindow mode complete requirement meaning and complete shared work/AC scope remain supplied; every linked original clause is visited across windows. Cite this supplied window only; never remove conditions because other windows are absent.' }, snapshot, { evidenceReferences });
  };
  const originalReviews = groups(plan.workItems.filter(item => item.workItemType !== 'epic'), 8).map(entryFor);
  const reviewBatches = splitReviewEntries(originalReviews, entry => makeReview(entry, 0, 3000), PLAN_REVIEW_SCHEMA, entry => entry.children.length < 2 ? [entry] : groups(entry.children, Math.ceil(entry.children.length / 2)).map(entryFor));
  const taskIds = reviewBatches.map(entry => createHash('sha256').update(JSON.stringify(entry)).digest('hex'));
  if (resumeTaskIds !== null && (!Array.isArray(resumeTaskIds) || resumeTaskIds.length !== resumeReplies.length || resumeTaskIds.some((id, index) => id !== taskIds[index]))) fail('AI_CHECKPOINT_INVALID');
  if (resumeTaskIds === null && resumeReplies.length && JSON.stringify(originalReviews) !== JSON.stringify(reviewBatches)) { resumeReplies = []; onReset(); }
  if (!Array.isArray(resumeReplies) || resumeReplies.length > reviewBatches.length) fail('AI_CHECKPOINT_INVALID');
  for (const [index, entry] of reviewBatches.entries()) {
    const children = entry.children;
    onStage('review-plan', index, reviewBatches.length);
    const workIds = new Set(children.map(item => item.id));
    const cached = index < resumeReplies.length;
    const value = makeReview(entry, index, reviewBatches.length);
    if (!fitsRequest(value, PLAN_REVIEW_SCHEMA)) fail('AI_INPUT_TOO_LARGE');
    const response = cached ? { output: resumeReplies[index] } : await run({ request: value, schema: PLAN_REVIEW_SCHEMA, cwd, signal });
    const allowed = { workItems: new Set(plan.workItems.filter(item => workIds.has(item.id) || children.some(child => child.parentEpicId === item.id)).map(item => item.id)), acceptanceCriteria: new Set(plan.acceptanceCriteria.filter(ac => workIds.has(ac.workItemId)).map(ac => ac.id)), traceLinks: new Set(plan.traceLinks.filter(link => workIds.has(link.workItemId)).map(link => link.id)) };
    validatePrivateAiValue(response.output, PLAN_REVIEW_SCHEMA); assertSuppliedProof(response.output, value);
    plan = validatePlanReview(response.output, plan, draft, allowed); validateDecompositionProposal(plan, draft);
    onValidated('review-plan', plan);
    if (!cached) await onReviewReply(index, response.output, taskIds[index]); else await onReuse(index, taskIds[index]);
    onStage('review-plan', index + 1, reviewBatches.length);
  }
  const validatedPlan = validateDecompositionProposal(plan, draft), taskBacklog = { ...draft.backlog, workItems: plan.workItems, acceptanceCriteria: plan.acceptanceCriteria, traceLinks: plan.traceLinks };
  const taskPreview = buildTaskPreview(taskBacklog, snapshot.metadata.context, plan.issues);
  return { planningOutput: plan, validatedPlan, taskPreview };
}
