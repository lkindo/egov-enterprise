import { buildStagePrompt, PROMPT_VERSION } from './ai-prompts.mjs';
import { readDocument, readingOmissions } from './document-reader.mjs';
import { prepareDocumentInputs } from './document-inputs.mjs';
import { BUSINESS_MODEL_SCHEMA, REQUIREMENT_REVIEW_SCHEMA, PLAN_REVIEW_SCHEMA, validateDocumentSummaries, validateBusinessModel, mergeBusinessModels, validateRequirementReview, validatePlanReview, mergeIssues } from './ai-pipeline-contract.mjs';
import { buildAiRequest, DECOMPOSITION_SCHEMA, validateAnalysisProposal, validateDecompositionProposal, projectAnalysisBacklog, selectEvidenceQuote } from './ai-contract.mjs';
import { matchRequirementsToContext } from '../../scripts/export-deliverables-workspace.mjs';
import { privateWorkspaceContracts } from './private-validation.mjs';
const { generateWorkPackagePlan } = privateWorkspaceContracts;
import { createHash } from 'node:crypto';

const fail = code => { throw Object.assign(new Error(code), { code }); };
const groups = (values, count) => Array.from({ length: Math.ceil(values.length / count) }, (_, index) => values.slice(index * count, (index + 1) * count));
export function planningGroups(requirements, priorWork) {
  const parent = new Map(requirements.map(req => [req.id, req.id]));
  const root = id => { while (parent.get(id) !== id) id = parent.get(id); return id; };
  for (const item of priorWork.filter(item => item.workItemType !== 'epic')) {
    const ids = item.requirementIds.filter(id => parent.has(id));
    for (const id of ids.slice(1)) parent.set(root(id), root(ids[0]));
  }
  const connected = new Map();
  for (const req of requirements) { const key = root(req.id); if (!connected.has(key)) connected.set(key, []); connected.get(key).push(req); }
  const result = []; let batch = [];
  for (const component of connected.values()) { if (batch.length && batch.length + component.length > 4) { result.push(batch); batch = []; } batch.push(...component); }
  if (batch.length) result.push(batch);
  return result;
}
function request(stage, data, snapshot) {
  const value = { phase: stage, promptVersion: PROMPT_VERSION, instructions: buildStagePrompt(stage, { sourceTypes: [...snapshot.backlog.sources.map(source => source.sourceType), ...(snapshot.metadata.imports ?? []).flatMap(job => job.detectedTypes ?? []), ...(data.documents ?? []).flatMap(doc => doc.documentTypes ?? [])], formats: (snapshot.metadata.imports ?? []).map(job => job.format), hasExisting: snapshot.backlog.businessRequirements.length > 0, hasDecisions: Boolean(snapshot.metadata.ai?.decisions.length) }), data };
  if (stage === 'synthesis' && data.correction) value.instructions += ' Regenerate the current synthesis once using the supplied invariant failures and original documents. The rejected draft is not supplied. Use exact provided source IDs and verbatim anchors, preserve prior business evidence and human decisions, and never invent facts or approvals to pass validation.';
  if (Buffer.byteLength(JSON.stringify(value)) > 768 * 1024) fail('AI_INPUT_TOO_LARGE');
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
export async function prepareBusinessModel(snapshot, { run, cwd, signal, sourceReading = () => null, onStage = () => {}, onValidated = () => {} }) {
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
    const anchors = documentAnchors(source);
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
    if (!anchor) fail('AI_DOCUMENT_UNREADABLE');
    const details = [...doc.unreadable.map(item => item.reason), ...doc.uncertain.map(item => item.note), ...omissions].join(' / ');
    readingIssues.push({ id, kind: 'missing', severity: 'blocking', question: `${doc.title}: 판독 불확실 구간을 원본과 대조해 주세요. ${details}`.slice(0, 1900), options: ['원본 대조 후 정확한 내용 답변', '판독 가능한 사본을 등록한 후 다시 분석'], requirementIds: [], citations: [anchor] });
  }
  let model;
  const batches = groups(documents, 4);
  for (const [index, batch] of batches.entries()) {
    onStage('synthesis', index, batches.length);
    let data = { documents: batch, previousModel: model ?? null, decisions: snapshot.metadata.ai?.decisions ?? [], coverageRule: 'sourceCoverage must contain exactly the current documents. Return additions/updates for actors/processes/terms; the application retains omitted earlier entries and all unresolved issues. summary integrates previousModel. Use only the supplied anchors as verbatim issue citations.' };
    for (let attempt = 0; attempt < 2; attempt++) {
      if (signal?.aborted) fail('AI_CANCELLED');
      const response = await run({ request: request('synthesis', data, snapshot), schema: BUSINESS_MODEL_SCHEMA, cwd, signal });
      if (signal?.aborted) fail('AI_CANCELLED');
      try {
        const delta = validateBusinessModel(response.output, snapshot, batch.map(doc => doc.sourceId));
        try { model = mergeBusinessModels(model, delta, snapshot); }
        catch (error) { if (error.code === 'AI_OUTPUT_INVALID' && error.details?.some(detail => detail.kind === 'schema')) fail('AI_BUSINESS_MODEL_CAPACITY'); throw error; }
        break;
      } catch (error) {
        if (error.code !== 'AI_OUTPUT_INVALID' || attempt === 1) throw error;
        data = { ...data, correction: { violations: error.details.map(({ kind, path }) => ({ kind, path })) } };
      }
    }
    onStage('synthesis', index + 1, batches.length);
  }
  model.issues = mergeIssues(model.issues, readingIssues);
  validateBusinessModel(model, snapshot, snapshot.backlog.sources.map(source => source.id));
  onValidated('synthesis', model);
  return { documents, businessModel: model };
}

export async function reviewRequirements(output, businessModel, snapshot, { run, cwd, signal, onStage = () => {} }) {
  let result = { ...structuredClone(output), issues: mergeIssues(output.issues, businessModel?.issues ?? []) };
  const batches = groups(output.requirements, 6).map(requirements => ({ requirements, sources: evidence(snapshot, requirements) }));
  const cited = new Set(output.requirements.flatMap(req => req.citations.map(cite => `${cite.sourceId}/${cite.clauseId}`)));
  const omitted = snapshot.backlog.sources.flatMap(source => source.clauses.filter(clause => !cited.has(`${source.id}/${clause.id}`)).map(clause => ({ source, clause })));
  for (const entries of groups(omitted, 32)) {
    const sources = new Map();
    for (const { source, clause } of entries) { if (!sources.has(source.id)) sources.set(source.id, { ...source, clauses: [] }); sources.get(source.id).clauses.push(clause); }
    batches.push({ requirements: [], sources: [...sources.values()] });
  }
  for (const [index, entry] of batches.entries()) {
    const batch = entry.requirements;
    onStage('review-requirements', index, batches.length);
    const ids = new Set(batch.map(req => req.id));
    const declaredIssues = new Set(result.issues.map(issue => issue.id));
    const validationIssues = validateAnalysisProposal(result, snapshot).issues.filter(issue => !declaredIssues.has(issue.id));
    const response = await run({ request: request('review-requirements', { ...reviewContext(snapshot, batch), businessModel, requirements: batch, sources: entry.sources, coverage: output.coverage.filter(item => entry.sources.some(source => source.id === item.sourceId && source.clauses.some(clause => clause.id === item.clauseId))), existingIssues: result.issues, validationIssues, reviewContract: 'Return issues and revisions. Revisions are complete replacements for current requirement IDs only, never new requirements or scope changes. Use supplied decisions and repository evidence to check solutionDisposition; undecided blocks executable planning. For non-functional/data/constraint requirements, nfrCriteria needs a source-supported metric, threshold and verificationMethod; qualitative allow/deny criteria are valid and do not require invented numeric SLAs. validationIssues are recomputed application checks: repair their causes only when supported, never copy a resolved system question into issues. A batch with no requirements independently reviews uncited source clauses and their excluded/deferred coverage: report missing business requirements or unjustified exclusions as source-cited issues; do not silently accept the earlier coverage rationale. Fix wording/structure only when fully supported; policy ambiguity needs a blocking issue. Retain all verified citations. Do not return coverage or a self-awarded pass.' }, snapshot), schema: REQUIREMENT_REVIEW_SCHEMA, cwd, signal });
    if (response.output.revisions?.some(req => !ids.has(req.id))) fail('AI_OUTPUT_INVALID');
    result = validateRequirementReview(response.output, result, snapshot);
    validateAnalysisProposal(result, snapshot);
    onStage('review-requirements', index + 1, batches.length);
  }
  return result;
}

export async function planAndReview(output, businessModel, snapshot, decisions, { run, cwd, signal, onStage = () => {}, onValidated = () => {}, idPrefix = 'PLAN-' }) {
  const analysis = validateAnalysisProposal(output, snapshot), draft = { ...snapshot, backlog: projectAnalysisBacklog(snapshot, analysis) };
  const included = draft.backlog.businessRequirements.filter(req => req.scopeDisposition === 'included');
  if (!included.length) fail('AI_NO_EXECUTABLE_REQUIREMENTS');
  const batches = planningGroups(included, snapshot.backlog.workItems);
  let plan = { workItems: structuredClone(snapshot.backlog.workItems), acceptanceCriteria: structuredClone(snapshot.backlog.acceptanceCriteria), traceLinks: structuredClone(snapshot.backlog.traceLinks), issues: [], retirements: [] };
  const original = Object.fromEntries(['workItems', 'acceptanceCriteria', 'traceLinks'].map(field => [field, new Map(plan[field].map(item => [item.id, structuredClone(item)]))]));
  const touchedEpics = new Set();
  for (const [index, batch] of batches.entries()) {
    onStage('decomposition', index, batches.length);
    const ids = new Set(batch.map(req => req.id)), input = { ...draft, backlog: { ...draft.backlog, businessRequirements: batch, workItems: plan.workItems, acceptanceCriteria: plan.acceptanceCriteria, traceLinks: plan.traceLinks } };
    const req = buildAiRequest(input, 'decomposition', decisions, { analysisEvidence: analysis });
    req.data.businessModel = businessModel;
    req.data.requirementScopeIndex = draft.backlog.businessRequirements.map(req => ({ id: req.id, scopeDisposition: req.scopeDisposition }));
    req.data.planningBatch = { index: index + 1, total: batches.length, idPrefix: `${idPrefix}${index + 1}-`, requirementIds: [...ids] };
    req.data.previousPlanIndex = plan.workItems.map(item => ({ id: item.id, title: item.title, workItemType: item.workItemType, parentEpicId: item.parentEpicId, requirementIds: item.requirementIds }));
    req.instructions += '\nSequential planning contract: Return only new/changed work/AC/trace entries and explicit retirements. Omitted entries remain preserved. Current executable children and ACs may refer only to planningBatch.requirementIds. requirementScopeIndex lists the whole project: included requirements in other batches remain in scope. Leave their child work/AC/trace unchanged and never retire them. Existing children connected across requirements are deliberately kept in the same batch. Existing epics may be shared and their requirement sets are unioned by the application. When total>1, new IDs MUST start with planningBatch.idPrefix; original supplied plan IDs may be updated only for their existing requirement meaning. Do not retire a generated entry from another batch. New dependencies can reference known previousPlanIndex IDs. Every excluded prior original entry needs an explicit retirement.';
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
          if (touchedEpics.has(item.id)) value.requirementIds = [...new Set([...old.requirementIds, ...item.requirementIds])];
          touchedEpics.add(item.id);
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
  onValidated('decomposition', plan);
  const reviewBatches = groups(plan.workItems.filter(item => item.workItemType !== 'epic'), 8);
  for (const [index, children] of reviewBatches.entries()) {
    onStage('review-plan', index, reviewBatches.length);
    const workIds = new Set(children.map(item => item.id)), reqIds = new Set(children.flatMap(item => item.requirementIds));
    const requirements = output.requirements.filter(req => reqIds.has(req.id));
    const response = await run({ request: request('review-plan', { ...reviewContext(snapshot, requirements, plan.traceLinks.filter(link => reqIds.has(link.requirementId))), businessModel, requirements, sources: evidence(snapshot, requirements), workItems: plan.workItems.filter(item => workIds.has(item.id) || children.some(child => child.parentEpicId === item.id)), acceptanceCriteria: plan.acceptanceCriteria.filter(ac => workIds.has(ac.workItemId)), traceLinks: plan.traceLinks.filter(link => reqIds.has(link.requirementId)), existingIssues: plan.issues, reviewContract: 'Return issues, workItemUpdates, acceptanceUpdates and traceUpdates. These are updates of known current-batch IDs only, never new entries or implicit removals. Preserve the complete original requirement set of shared epics and ACs; never reduce it to the current review subset. Preserve work types, parent relationships and required original evidence. Only repair concrete supported defects; missing policy stays a blocking question. Do not manufacture completed tests or human approval.' }, snapshot), schema: PLAN_REVIEW_SCHEMA, cwd, signal });
    const allowed = { workItems: new Set(plan.workItems.filter(item => workIds.has(item.id) || children.some(child => child.parentEpicId === item.id)).map(item => item.id)), acceptanceCriteria: new Set(plan.acceptanceCriteria.filter(ac => workIds.has(ac.workItemId)).map(ac => ac.id)), traceLinks: new Set(plan.traceLinks.filter(link => workIds.has(link.workItemId)).map(link => link.id)) };
    plan = validatePlanReview(response.output, plan, draft, allowed); validateDecompositionProposal(plan, draft);
    onValidated('review-plan', plan);
    onStage('review-plan', index + 1, reviewBatches.length);
  }
  const validatedPlan = validateDecompositionProposal(plan, draft), taskBacklog = { ...draft.backlog, workItems: plan.workItems, acceptanceCriteria: plan.acceptanceCriteria, traceLinks: plan.traceLinks };
  const taskPreview = buildTaskPreview(taskBacklog, snapshot.metadata.context, plan.issues);
  return { planningOutput: plan, validatedPlan, taskPreview };
}
