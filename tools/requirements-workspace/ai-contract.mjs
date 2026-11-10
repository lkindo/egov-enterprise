import { createHash } from 'node:crypto';
import { buildStagePrompt, PROMPT_VERSION } from './ai-prompts.mjs';
import { PRIVATE_ANALYSIS_VALIDATION } from './privacy-warnings.mjs';
import { REQUIREMENT_TYPES, SOLUTION_DISPOSITIONS, WORK_ITEM_TYPES, PRIORITIES, VERIFICATION_METHODS, TARGET_KINDS, DECISION_CARD_AXES, ARCHETYPE_CATALOG, scanBacklogForPiiAndSecrets, validateBacklogPack, validateDevelopmentReadiness, matchRequirementsToContext } from '../../scripts/export-deliverables-workspace.mjs';

const invalid = (kind = 'schema', path = '$', requirementId) => { throw Object.assign(new Error('AI_OUTPUT_INVALID'), { code: 'AI_OUTPUT_INVALID', details: [{ kind, path, ...(requirementId ? { requirementId } : {}) }] }); };
const capacity = code => { throw Object.assign(new Error(code), { code }); };
const string = (maxLength = 2000) => ({ type: 'string', minLength: 1, maxLength });
const identifier = { ...string(100), pattern: '^[A-Za-z0-9][A-Za-z0-9_.:-]*$' };
const enumeration = values => ({ type: 'string', enum: values });
const array = (items, minItems = 0, maxItems = 150) => ({ type: 'array', items, minItems, maxItems });
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });
const nullable = schema => ({ anyOf: [schema, { type: 'null' }] });
const citationSchema = object({ sourceId: identifier, clauseId: identifier, quote: string(2000) });
const nfrSchema = object({ metric: string(), threshold: string(), verificationMethod: enumeration(VERIFICATION_METHODS) });
const issueSchema = object({ id: identifier, kind: enumeration(['decision', 'conflict', 'missing', 'ambiguity', 'risk']), severity: enumeration(['blocking', 'observation']), question: string(), options: array(string(500), 0, 8), requirementIds: array(identifier), citations: array(citationSchema, 1, 30) });
const requirementSchema = object({ id: identifier, title: string(200), description: string(6000), requirementType: enumeration(REQUIREMENT_TYPES), solutionDisposition: enumeration(SOLUTION_DISPOSITIONS), moduleCandidates: array(identifier, 0, 20), rationale: string(), nfrCriteria: nullable(nfrSchema), citations: array(citationSchema, 1, 30), scope: enumeration(['included', 'deferred', 'excluded']) }, ['id', 'title', 'description', 'requirementType', 'solutionDisposition', 'moduleCandidates', 'rationale', 'nfrCriteria', 'citations']);
export const ANALYSIS_SCHEMA = object({ requirements: array(requirementSchema), issues: array(issueSchema, 0, 100), coverage: array(object({ sourceId: identifier, clauseId: identifier, disposition: enumeration(['included', 'merged', 'excluded', 'deferred']), requirementIds: array(identifier), rationale: string() }, ['sourceId', 'clauseId', 'disposition', 'rationale']), 1, 3000) });
export const BATCH_ANALYSIS_SCHEMA = object({ ...ANALYSIS_SCHEMA.properties, updatedRequirementIds: array(identifier) }, Object.keys(ANALYSIS_SCHEMA.properties));
const workSchema = object({ id: identifier, workItemType: enumeration(WORK_ITEM_TYPES), parentEpicId: nullable(identifier), requirementIds: array(identifier, 1), title: string(200), description: string(6000), asA: string(), iWant: string(), soThat: string(), priority: enumeration(PRIORITIES), batch: { anyOf: [string(80), { type: 'integer', minimum: 1, maximum: 1000 }] }, dependsOn: array(identifier), archetype: enumeration(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7']), decisionCards: array(string(2000), 0, 20) }, ['id', 'workItemType', 'parentEpicId', 'requirementIds', 'title']);
const acSchema = object({ id: identifier, workItemId: identifier, requirementIds: array(identifier, 1), polarity: enumeration(['allow', 'forbid']), given: string(), when: string(), then: string(), verificationMethod: enumeration(VERIFICATION_METHODS) });
const traceSchema = object({ id: identifier, requirementId: identifier, workItemId: identifier, acId: identifier, targetKind: enumeration(TARGET_KINDS), targetId: string(300), linkIntent: enumeration(['candidate', 'planned', 'existing']), notes: string() }, ['id', 'requirementId', 'targetKind', 'targetId', 'linkIntent']);
export const DECOMPOSITION_SCHEMA = object({ workItems: array(workSchema, 1, 500), acceptanceCriteria: array(acSchema, 1, 1500), traceLinks: array(traceSchema, 0, 3000), issues: array(issueSchema, 0, 100), retirements: array(object({ entity: enumeration(['workItem', 'acceptanceCriterion', 'traceLink']), id: identifier, reason: string() }), 0, 3000) }, ['workItems', 'acceptanceCriteria', 'traceLinks', 'issues']);

const failureKinds = new Set(['schema', 'output-size', 'sensitive-output', 'duplicate-id', 'citation-quote', 'citation-capacity', 'citation-reference', 'coverage-source', 'coverage-reference', 'coverage-disposition', 'coverage-missing', 'coverage-scope', 'batch-update-intent', 'batch-new-id', 'batch-unseen-citation', 'batch-issue-replacement', 'requirement-omission', 'issue-reference', 'module-reference', 'analysis-backlog-structure', 'backlog-structure', 'development-readiness', 'existing-target', 'implicit-removal', 'retirement-reference', 'trace-ac-relation', 'trace-requirement', 'business-model-coverage', 'business-model-source', 'business-model-budget', 'document-source', 'issue-id-collision', 'plan-review-id', 'plan-review-requirement', 'plan-review-scope', 'quality-scope-change']);
const failureFields = new Set(['items', 'sourceCoverage', 'actors', 'responsibility', 'sourceIds', 'processes', 'trigger', 'steps', 'exceptions', 'rules', 'data', 'terms', 'term', 'meaning', 'documents', 'documentTypes', 'sections', 'warningCodes', 'unreadable', 'uncertain', 'anchors', 'clauseCount', 'anchorScope', 'inputId', 'note', 'reason', 'revisions', 'workItemUpdates', 'acceptanceUpdates', 'traceUpdates']);
function collectFailureFields(schema) {
  for (const [key, value] of Object.entries(schema.properties ?? {})) { failureFields.add(key); collectFailureFields(value); }
  if (schema.items) collectFailureFields(schema.items);
  for (const branch of schema.anyOf ?? []) collectFailureFields(branch);
}
for (const schema of [ANALYSIS_SCHEMA, BATCH_ANALYSIS_SCHEMA, DECOMPOSITION_SCHEMA]) collectFailureFields(schema);
function failureValue(value, key) {
  try { return value && typeof value === 'object' ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined; } catch { return undefined; }
}
export function safeValidationFailures(details) {
  const values = Array.isArray(details) && details.length ? details.slice(0, 10) : [{}];
  return values.map(detail => {
    const path = failureValue(detail, 'path'), kind = failureValue(detail, 'kind');
    const safe = typeof path === 'string' && path.length <= 200 && /^(?:\$|[A-Za-z_][A-Za-z_0-9]*)(?:\.[A-Za-z_][A-Za-z_0-9]*|\[\d{1,4}\])*$/.test(path) && (path.match(/[A-Za-z_][A-Za-z_0-9]*/g) ?? []).every(field => failureFields.has(field));
    return { kind: failureKinds.has(kind) ? kind : 'schema', path: safe ? path : '$' };
  });
}

// Validate precisely the small JSON-Schema vocabulary above. No coercion, defaults,
// accessor execution, prototype-bearing fields or unknown properties are accepted.
function check(value, schema, depth = 0, path = '$') {
  if (depth > 30) invalid();
  if (schema.anyOf) {
    for (const branch of schema.anyOf) { try { check(value, branch, depth + 1, path); return; } catch (error) { if (error.code !== 'AI_OUTPUT_INVALID') throw error; } }
    invalid('schema', path);
  }
  if (schema.type === 'null') { if (value !== null) invalid(); return; }
  if (schema.type === 'string') {
    if (typeof value !== 'string' || !value.isWellFormed() || !value.trim() || value.length < (schema.minLength ?? 0) || value.length > (schema.maxLength ?? Infinity) || (schema.enum && !schema.enum.includes(value)) || (schema.pattern && !new RegExp(schema.pattern).test(value))) invalid('schema', path);
    return;
  }
  if (schema.type === 'integer') { if (!Number.isSafeInteger(value) || value < schema.minimum || value > schema.maximum) invalid(); return; }
  if (schema.type === 'array') {
    if (!Array.isArray(value) || value.length < schema.minItems || value.length > schema.maxItems) invalid();
    for (const [index, item] of value.entries()) check(item, schema.items, depth + 1, `${path}[${index}]`);
    return;
  }
  if (!value || Array.isArray(value) || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid();
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key) || !Object.hasOwn(schema.properties, key)) invalid();
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) invalid();
    check(descriptor.value, schema.properties[key], depth + 1, `${path}.${key}`);
  }
  if (schema.required.some(key => !Object.hasOwn(value, key))) invalid();
}
export function validateAiValue(value, schema, { maxBytes = 1024 ** 2, sensitiveData = 'error' } = {}) {
  if (!['error', 'warning'].includes(sensitiveData)) throw new TypeError('Sensitivity validation policy');
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 8 * 1024 ** 2) throw new TypeError('AI validation size configuration');
  check(value, schema);
  if (Buffer.byteLength(JSON.stringify(value)) > maxBytes) invalid('output-size');
  if (sensitiveData === 'error' && scanBacklogForPiiAndSecrets({ project: value }).length) invalid('sensitive-output');
}
export const validatePrivateAiValue = (value, schema, options = {}) => validateAiValue(value, schema, { ...options, ...PRIVATE_ANALYSIS_VALIDATION });
const privateValue = validatePrivateAiValue;
const unique = items => { const ids = items.map(item => item.id); if (new Set(ids).size !== ids.length) invalid('duplicate-id'); return new Set(ids); };
const clauseMap = snapshot => new Map(snapshot.backlog.sources.flatMap(source => (source.clauses ?? []).map(clause => [`${source.id}/${clause.id}`, clause])));
const meaningful = text => (text.match(/[\p{L}\p{N}]/gu) ?? []).length;
export function selectEvidenceQuote(text) {
  const chars = Array.from(text), counts = chars.map(character => meaningful(character));
  const required = Math.min(12, counts.reduce((sum, count) => sum + count, 0));
  if (!required) return null;
  let count = 0;
  for (let end = 0; end < chars.length; end++) {
    count += counts[end];
    if (end >= 180) count -= counts[end - 180];
    if (count >= required) { let start = Math.max(0, end - 179); while (!counts[start]) start++; return chars.slice(start, start + 180).join(''); }
  }
  return null;
}
function citations(items, clauses, prefix = 'items') {
  for (const [index, item] of items.entries()) for (const [citationIndex, citation] of item.citations.entries()) {
    const original = clauses.get(`${citation.sourceId}/${citation.clauseId}`);
    if (!original?.text.includes(citation.quote) || !meaningful(citation.quote) || meaningful(citation.quote) < Math.min(12, meaningful(original.text))) invalid('citation-quote', `${prefix}[${index}].citations[${citationIndex}]`, prefix === 'requirements' ? item.id : undefined);
  }
}
export function validateEvidenceCitations(items, snapshot) { citations(items, clauseMap(snapshot)); }
function issues(items, requirements, clauses, citationPrefix = 'items') {
  unique(items); citations(items, clauses, citationPrefix);
  for (const issue of items) if (new Set(issue.requirementIds).size !== issue.requirementIds.length || issue.requirementIds.some(id => !requirements.has(id))) invalid('issue-reference', 'issues');
}
export function seedAnalysis(snapshot) {
  const requirements = snapshot.backlog.businessRequirements.map(req => {
    const cites = req.sourceIds.map(sourceId => {
      const source = snapshot.backlog.sources.find(source => source.id === sourceId), clause = source?.clauses.find(clause => clause.requirementIds?.includes(req.id));
      if (!clause) capacity('AI_EXISTING_REQUIREMENT_REVIEW_REQUIRED');
      const quote = Array.from(clause.text).slice(0, 220).join('');
      return { sourceId, clauseId: clause.id, quote };
    });
    const result = { id: req.id, title: req.title, description: req.description, requirementType: req.requirementType, solutionDisposition: req.solutionDisposition, moduleCandidates: req.moduleCandidates ?? [], rationale: req.rationale, nfrCriteria: req.nfrCriteria ?? null, citations: cites, ...(['included', 'excluded', 'deferred'].includes(req.scopeDisposition) ? { scope: req.scopeDisposition } : {}) };
    try { check(result, requirementSchema); citations([result], clauseMap(snapshot)); } catch { capacity('AI_EXISTING_REQUIREMENT_REVIEW_REQUIRED'); }
    return result;
  });
  return { requirements, issues: [], coverage: [] };
}
export function validateAnalysisBatchProposal(value, snapshot, sources, previous, { idPrefix } = {}) {
  privateValue(value, BATCH_ANALYSIS_SCHEMA);
  unique(value.requirements);
  unique(value.issues);
  const oldIds = new Set((previous?.requirements ?? []).map(req => req.id)), updates = new Set(value.updatedRequirementIds ?? []);
  if (updates.size !== (value.updatedRequirementIds ?? []).length || [...updates].some(id => !oldIds.has(id) || !value.requirements.some(req => req.id === id))) invalid('batch-update-intent', 'updatedRequirementIds');
  for (const req of value.requirements) {
    if (oldIds.has(req.id) && !updates.has(req.id)) invalid('batch-update-intent', 'requirements', req.id);
    if (!oldIds.has(req.id) && idPrefix && !req.id.startsWith(idPrefix)) invalid('batch-new-id', 'requirements', req.id);
  }
  const result = structuredClone(value), incoming = new Map(result.requirements.map(req => [req.id, req]));
  delete result.updatedRequirementIds;
  result.requirements = [...(previous?.requirements ?? []).map(req => incoming.get(req.id) ?? structuredClone(req)), ...result.requirements.filter(req => !previous?.requirements.some(old => old.id === req.id))];
  const ids = unique(result.requirements);
  if ([...snapshot.backlog.businessRequirements, ...(previous?.requirements ?? [])].some(req => !ids.has(req.id))) invalid('requirement-omission', 'requirements');
  for (const req of result.requirements) {
    const old = previous?.requirements.find(item => item.id === req.id);
    if (!old) continue;
    if (req.scope === undefined && old.scope !== undefined) req.scope = old.scope;
    for (const cite of old.citations) if (!req.citations.some(item => item.sourceId === cite.sourceId && item.clauseId === cite.clauseId && item.quote === cite.quote)) req.citations.push(structuredClone(cite));
  }
  const issueMeaning = issue => JSON.stringify(canonical({ ...issue, id: undefined }));
  result.issues = result.issues.flatMap(issue => {
    if (previous?.issues.some(old => issueMeaning(old) === issueMeaning(issue))) return [];
    const collision = previous?.issues.some(old => old.id === issue.id);
    return [{ ...issue, ...(collision || idPrefix && !issue.id.startsWith(idPrefix) ? { id: `${idPrefix ?? 'BATCH-'}ISSUE-${createHash('sha256').update(issueMeaning(issue)).digest('hex').slice(0, 24)}` } : {}) }];
  });
  const issueIds = new Map(result.issues.map(issue => [issue.id, issue]));
  for (const issue of previous?.issues ?? []) {
    const next = issueIds.get(issue.id);
    if (next && JSON.stringify(canonical(next)) !== JSON.stringify(canonical(issue))) invalid('batch-issue-replacement', 'issues');
    if (!next) result.issues.push(structuredClone(issue));
  }
  if (result.requirements.length > 150) capacity('AI_REQUIREMENT_CAPACITY');
  if (result.issues.length > 100) capacity('AI_ISSUE_CAPACITY');
  for (const req of result.requirements) if (req.citations.length > 30) invalid('citation-capacity', 'requirements', req.id);
  if (Buffer.byteLength(JSON.stringify(result)) > 1024 ** 2) capacity('AI_PROPOSAL_CAPACITY');
  privateValue(result, ANALYSIS_SCHEMA);
  const clauses = clauseMap(snapshot), current = new Set(sources.flatMap(source => source.clauses.map(clause => `${source.id}/${clause.id}`)));
  const allowed = new Set([...current, ...(previous?.requirements ?? []).flatMap(req => req.citations.map(cite => `${cite.sourceId}/${cite.clauseId}`)), ...(previous?.issues ?? []).flatMap(issue => issue.citations.map(cite => `${cite.sourceId}/${cite.clauseId}`)), ...snapshot.backlog.sources.flatMap(source => source.clauses.filter(clause => source.id.startsWith('DEC-') && source.sourceType === 'policy-memo' || clause.requirementIds?.some(id => snapshot.backlog.businessRequirements.some(req => req.id === id))).map(clause => `${source.id}/${clause.id}`))]);
  citations(result.requirements, clauses, 'requirements'); issues(result.issues, ids, clauses, 'issues');
  if ([...result.requirements, ...result.issues].some(item => item.citations.some(cite => !allowed.has(`${cite.sourceId}/${cite.clauseId}`)))) invalid('batch-unseen-citation', 'citations');
  const modules = new Set((snapshot.metadata.context.modules ?? []).map(module => typeof module === 'string' ? module : module.id));
  if (result.requirements.some(req => req.moduleCandidates.some(id => !modules.has(id)))) invalid('module-reference', 'requirements');
  const covered = new Set();
  for (const entry of result.coverage) {
    const key = `${entry.sourceId}/${entry.clauseId}`, claimed = entry.requirementIds ?? [];
    if (!current.has(key) || covered.has(key)) invalid('coverage-source', 'coverage');
    if (new Set(claimed).size !== claimed.length || claimed.some(id => !ids.has(id))) invalid('coverage-reference', 'coverage');
    const proven = result.requirements.filter(req => req.citations.some(cite => cite.sourceId === entry.sourceId && cite.clauseId === entry.clauseId)).map(req => req.id);
    if (['included', 'merged'].includes(entry.disposition) && !proven.length) invalid('coverage-disposition', 'coverage');
    entry.requirementIds = proven; covered.add(key);
  }
  if (covered.size !== current.size) invalid('coverage-missing', 'coverage');
  const included = new Set(result.requirements.filter(req => (req.scope ?? snapshot.backlog.businessRequirements.find(old => old.id === req.id && ['included', 'excluded', 'deferred'].includes(old.scopeDisposition))?.scopeDisposition ?? 'included') === 'included').map(req => req.id));
  const references = new Map();
  for (const req of result.requirements) for (const cite of req.citations) { const key = `${cite.sourceId}/${cite.clauseId}`; if (!references.has(key)) references.set(key, new Set()); references.get(key).add(req.id); }
  const coverage = [...(previous?.coverage ?? []), ...result.coverage].map(entry => {
    const key = `${entry.sourceId}/${entry.clauseId}`, proven = [...(references.get(key) ?? [])].sort();
    // Earlier batch dispositions are unapproved drafts. A later verified
    // citation may link that draft clause to an included requirement. The live
    // source and every human scope/decision remain protected until confirmation.
    const relinked = !current.has(key) && !['included', 'merged'].includes(entry.disposition) && proven.some(id => included.has(id));
    return { ...entry, requirementIds: proven, ...(relinked ? { disposition: 'merged', rationale: '후속 묶음의 검증된 원문 인용으로 요구사항과 연결했습니다.' } : {}) };
  });
  const processed = new Set(coverage.map(entry => `${entry.sourceId}/${entry.clauseId}`));
  for (const req of result.requirements) if (included.has(req.id)) for (const sourceId of new Set(req.citations.filter(cite => processed.has(`${cite.sourceId}/${cite.clauseId}`)).map(cite => cite.sourceId))) {
    if (!coverage.some(entry => entry.sourceId === sourceId && ['included', 'merged'].includes(entry.disposition) && entry.requirementIds.includes(req.id))) invalid('coverage-scope', 'requirements');
  }
  const accumulated = { requirements: result.requirements, issues: result.issues, coverage };
  if (Buffer.byteLength(JSON.stringify(accumulated)) > 1024 ** 2) capacity('AI_PROPOSAL_CAPACITY');
  return accumulated;
}
export function validateAnalysisProposal(value, snapshot) {
  privateValue(value, ANALYSIS_SCHEMA);
  const ids = unique(value.requirements), clauses = clauseMap(snapshot), coverage = new Map();
  const scopeFor = req => req.scope ?? snapshot.backlog.businessRequirements.find(previous => previous.id === req.id && ['included', 'excluded', 'deferred'].includes(previous.scopeDisposition))?.scopeDisposition ?? 'included';
  let relationCorrections = 0;
  citations(value.requirements, clauses); issues(value.issues, ids, clauses);
  if (!ids.size && !value.issues.some(issue => issue.severity === 'blocking')) invalid();
  if (snapshot.backlog.businessRequirements.some(req => !ids.has(req.id))) invalid('requirement-omission', 'requirements');
  const modules = new Set((snapshot.metadata.context.modules ?? []).map(module => typeof module === 'string' ? module : module.id));
  for (const requirement of value.requirements) if (requirement.moduleCandidates.some(module => !modules.has(module))) invalid('module-reference', 'requirements');
  for (const entry of value.coverage) {
    const key = `${entry.sourceId}/${entry.clauseId}`;
    if (!clauses.has(key) || coverage.has(key)) invalid('coverage-source', 'coverage');
    const claimed = entry.requirementIds ?? [];
    if (new Set(claimed).size !== claimed.length || claimed.some(id => !ids.has(id))) invalid('coverage-reference', 'coverage');
    const proven = value.requirements.filter(req => req.citations.some(cite => cite.sourceId === entry.sourceId && cite.clauseId === entry.clauseId)).map(req => req.id).sort();
    if (['included', 'merged'].includes(entry.disposition) && !proven.length) invalid('coverage-disposition', 'coverage');
    if (entry.requirementIds) relationCorrections += claimed.filter(id => !proven.includes(id)).length + proven.filter(id => !claimed.includes(id)).length;
    coverage.set(key, { ...entry, requirementIds: proven });
  }
  if (coverage.size !== clauses.size) invalid('coverage-missing', 'coverage');
  for (const [index, req] of value.requirements.entries()) if (scopeFor(req) === 'included') {
    for (const sourceId of new Set(req.citations.map(cite => cite.sourceId))) {
      if (![...coverage.values()].some(entry => entry.sourceId === sourceId && ['included', 'merged'].includes(entry.disposition) && entry.requirementIds.includes(req.id))) invalid('coverage-scope', `requirements[${index}].citations`);
    }
  }
  const decisions = structuredClone(value.issues), issueIds = new Set(decisions.map(issue => issue.id));
  if (!value.requirements.some(req => scopeFor(req) === 'included') && !decisions.some(issue => issue.severity === 'blocking')) {
    let id = 'SYS-SCOPE'; while (issueIds.has(id)) id += '-S'; issueIds.add(id);
    decisions.push({ id, kind: 'decision', severity: 'blocking', question: '포함할 업무 요구사항이 없습니다. 포함할 범위를 결정하거나 추가 자료를 등록해 주세요.', options: ['추가 자료 제공', '업무 포함 범위 결정'], requirementIds: [...ids], citations: value.requirements.length ? structuredClone(value.requirements[0].citations) : [] });
  }
  const raiseHumanQuestion = (question, requirementIds, cites, seed) => {
    const base = `SYS-Q-${createHash('sha256').update(seed).digest('hex').slice(0, 20)}`;
    const answered = snapshot.backlog.sources.some(source => source.sourceType === 'policy-memo' && source.id.startsWith('DEC-') && (source.title === `사용자 결정: ${base}` || source.title.startsWith(`사용자 결정: ${base}-`)) && source.clauses?.some(clause => clause.text.startsWith(`${question}\n결정: `)));
    if (answered) return;
    let id = base, suffix = 0; while (issueIds.has(id)) id = `${base}-${++suffix}`; issueIds.add(id);
    decisions.push({ id, kind: 'decision', severity: 'blocking', question, options: ['담당 역할의 확인 결과와 결정 기록'], requirementIds, citations: structuredClone(cites) });
  };
  for (const previous of snapshot.backlog.businessRequirements) {
    const next = value.requirements.find(req => req.id === previous.id);
    if (scopeFor(next) !== 'included') continue;
    for (const question of previous.openQuestions ?? []) raiseHumanQuestion(question, [previous.id], next.citations, `${previous.id}/${previous.description}/${question}`);
  }
  for (const source of snapshot.backlog.sources) for (const clause of source.clauses ?? []) {
    if (clause.disposition !== 'question' || !clause.rationale?.trim() || !(clause.requirementIds ?? []).some(id => snapshot.backlog.businessRequirements.some(req => req.id === id) && value.requirements.some(req => req.id === id && scopeFor(req) === 'included'))) continue;
    const question = `기존 원문 질문 (${source.id}/${clause.id}): ${clause.rationale}`;
    raiseHumanQuestion(question, clause.requirementIds.filter(id => ids.has(id)), [{ sourceId: source.id, clauseId: clause.id, quote: clause.text }], `${source.id}/${clause.id}/${clause.text}/${clause.rationale}`);
  }
  for (const req of value.requirements) {
    if (scopeFor(req) !== 'included') continue;
    const missingFit = req.solutionDisposition === 'undecided', missingCriteria = ['non-functional', 'data', 'constraint'].includes(req.requirementType) && !req.nfrCriteria;
    if ((!missingFit && !missingCriteria) || decisions.some(issue => issue.severity === 'blocking' && issue.requirementIds.includes(req.id))) continue;
    const base = `SYS-${createHash('sha256').update(req.id).digest('hex').slice(0, 16)}`; let id = base, suffix = 0;
    while (issueIds.has(id)) id = `${base}-${++suffix}`; issueIds.add(id);
    decisions.push({ id, kind: 'decision', severity: 'blocking', question: `${req.title}: ${[missingFit ? '기존 기능 활용·추가 개발의 해결 방향' : '', missingCriteria ? '측정 항목·기준값·검증 기준' : ''].filter(Boolean).join('과 ')}이 정해지지 않았습니다. 업무 요구로 포함할지, 개발 전 확인사항으로 보류할지, 제외할지와 필요한 기준을 결정해 주세요.`, options: ['업무 범위에 포함하고 해결 방향·검증 기준 제시', '개발 착수 전 확인사항으로 보류하고 사유 기록', '이번 범위에서 제외하고 사유 기록'], requirementIds: [req.id], citations: structuredClone(req.citations) });
  }
  const result = { ...structuredClone(value), issues: decisions, coverage: [...coverage.values()], relationCorrections, requirements: value.requirements.map(requirement => ({ ...structuredClone(requirement), proposedScope: scopeFor(requirement), scopeDisposition: 'proposed', acceptanceDisposition: 'pending' })) };
  result.changes = describeChanges(snapshot.backlog.businessRequirements, projectAnalysisBacklog(snapshot, result).businessRequirements, 'requirement', ['title', 'description', 'requirementType', 'moduleCandidates', 'scopeDisposition', 'solutionDisposition', 'nfrCriteria', 'rationale', 'sourceIds', 'openQuestions']);
  if (!decisions.some(issue => issue.severity === 'blocking')) {
    const draft = projectAnalysisBacklog(snapshot, result);
    // Validate proposed meaning without claiming that old institutional
    // judgments approve it. The live judgments are untouched until confirmation.
    for (const req of draft.businessRequirements) req.acceptanceDisposition = 'pending';
    for (const ac of draft.acceptanceCriteria) ac.acceptanceDisposition = 'pending';
    if (!validateBacklogPack(draft, snapshot.metadata.context, PRIVATE_ANALYSIS_VALIDATION).valid) invalid('analysis-backlog-structure', 'requirements');
  }
  return result;
}
export function projectAnalysisBacklog(snapshot, proposal) {
  const pack = structuredClone(snapshot.backlog);
  pack.businessRequirements = proposal.requirements.map(value => {
    const { citations, scope, proposedScope, scopeDisposition, acceptanceDisposition, ...requirement } = value;
    const previous = snapshot.backlog.businessRequirements.find(req => req.id === value.id);
    if (previous && !Object.hasOwn(previous, 'nfrCriteria') && requirement.nfrCriteria === null) delete requirement.nfrCriteria;
    if (previous && !Object.hasOwn(previous, 'moduleCandidates') && requirement.moduleCandidates?.length === 0) delete requirement.moduleCandidates;
    return { ...requirement, sourceIds: [...new Set(citations.map(cite => cite.sourceId))], scopeDisposition: proposedScope, acceptanceDisposition: previous?.acceptanceDisposition ?? 'pending', openQuestions: proposedScope === 'included' ? [] : structuredClone(previous?.openQuestions ?? []) };
  });
  const coverage = new Map(proposal.coverage.map(entry => [`${entry.sourceId}/${entry.clauseId}`, entry]));
  for (const source of pack.sources) for (const clause of source.clauses ?? []) {
    const entry = coverage.get(`${source.id}/${clause.id}`);
    clause.requirementIds = entry.requirementIds; clause.disposition = entry.disposition; clause.rationale = entry.rationale;
  }
  return pack;
}
export function validateDecompositionProposal(value, snapshot) {
  privateValue(value, DECOMPOSITION_SCHEMA);
  unique(value.workItems); unique(value.acceptanceCriteria); unique(value.traceLinks);
  const included = new Set(snapshot.backlog.businessRequirements.filter(req => req.scopeDisposition === 'included').map(req => req.id));
  const groups = [['workItem', 'workItems', Object.keys(workSchema.properties)], ['acceptanceCriterion', 'acceptanceCriteria', Object.keys(acSchema.properties)], ['traceLink', 'traceLinks', Object.keys(traceSchema.properties)]];
  const retirements = structuredClone(value.retirements ?? []), retirementIds = new Set();
  for (const item of retirements) {
    const group = groups.find(([entity]) => entity === item.entity), key = `${item.entity}:${item.id}`;
    if (retirementIds.has(key) || !snapshot.backlog[group[1]].some(old => old.id === item.id) || value[group[1]].some(next => next.id === item.id)) invalid('retirement-reference', 'retirements');
    retirementIds.add(key);
  }
  for (const [entity, field] of groups) for (const old of snapshot.backlog[field]) if (!value[field].some(next => next.id === old.id) && !retirementIds.has(`${entity}:${old.id}`)) invalid('implicit-removal', field);
  issues(value.issues, new Set(snapshot.backlog.businessRequirements.map(req => req.id)), clauseMap(snapshot));
  for (const item of [...value.workItems, ...value.acceptanceCriteria]) if (item.requirementIds.some(id => !included.has(id))) invalid();
  const acs = new Map(value.acceptanceCriteria.map(ac => [ac.id, ac]));
  for (const [index, link] of value.traceLinks.entries()) {
    if (!included.has(link.requirementId)) invalid('trace-requirement', `traceLinks[${index}].requirementId`);
    if (link.acId) {
      const ac = acs.get(link.acId);
      if (!ac || !ac.requirementIds.includes(link.requirementId) || link.workItemId && ac.workItemId !== link.workItemId) invalid('trace-ac-relation', `traceLinks[${index}].acId`);
    }
    if (link.linkIntent === 'existing') {
      const field = { capability: 'capabilities', screen: 'screens', interface: 'interfaces', table: 'tables', gate: 'gates', 'migration-mapping': 'migrationMappings' }[link.targetKind];
      const normalize = id => ['table', 'migration-mapping'].includes(link.targetKind) ? String(id).toLowerCase() : id;
      if (!(snapshot.metadata.context[field] ?? []).some(target => normalize(link.targetKind === 'screen' ? target.route : target.id) === normalize(link.targetId))) invalid('existing-target', `traceLinks[${index}].targetId`);
    }
  }
  const pack = structuredClone(snapshot.backlog);
  // This is a structural draft, not a new institutional judgment. Evaluate
  // draft ACs without inheriting a prior accepted aggregate from the live pack.
  for (const req of pack.businessRequirements) req.acceptanceDisposition = 'pending';
  pack.workItems = value.workItems;
  pack.acceptanceCriteria = value.acceptanceCriteria.map(ac => ({ ...ac, acceptanceDisposition: 'pending' }));
  pack.traceLinks = value.traceLinks;
  if (!validateBacklogPack(pack, snapshot.metadata.context, PRIVATE_ANALYSIS_VALIDATION).valid) invalid('backlog-structure', 'workItems');
  for (const reqId of included) {
    const children = value.workItems.filter(item => item.workItemType !== 'epic' && item.requirementIds.includes(reqId));
    if (!children.length) invalid();
    for (const child of children) if (!['allow', 'forbid'].every(polarity => value.acceptanceCriteria.some(ac => ac.workItemId === child.id && ac.requirementIds.includes(reqId) && ac.polarity === polarity))) invalid();
  }
  if (!value.issues.some(issue => issue.severity === 'blocking') && !validateDevelopmentReadiness(pack, snapshot.metadata.context, PRIVATE_ANALYSIS_VALIDATION).valid) invalid('development-readiness', 'workItems');
  return { ...structuredClone(value), acceptanceCriteria: pack.acceptanceCriteria, retirements, changes: groups.flatMap(([entity, field, keys]) => describeChanges(snapshot.backlog[field], value[field], entity, keys).map(change => ({ ...change, ...(change.action === 'removed' ? { reason: retirements.find(item => item.entity === entity && item.id === change.id).reason } : {}) }))) };
}
function describeChanges(previous, next, entity, keys) {
  const before = new Map(previous.map(item => [item.id, item])), after = new Map(next.map(item => [item.id, item]));
  return [...new Set([...before.keys(), ...after.keys()])].flatMap(id => {
    const old = before.get(id), value = after.get(id);
    const fields = keys.filter(key => JSON.stringify(canonical(old?.[key] ?? null)) !== JSON.stringify(canonical(value?.[key] ?? null))).map(name => ({ name, before: old?.[name] ?? null, after: value?.[name] ?? null }));
    if (!fields.length) return [];
    return [{ entity, id, title: value?.title ?? old?.title ?? id, action: !old ? 'added' : !value ? 'removed' : 'changed', fields, requiresScopeReview: entity === 'requirement' && Boolean(old && value && ['included', 'excluded', 'deferred'].includes(old.scopeDisposition) && old.scopeDisposition !== value.scopeDisposition), hasJudgment: entity === 'acceptanceCriterion' && Boolean(old && old.acceptanceDisposition !== 'pending' && old.acceptanceDisposition), judgment: old?.acceptanceDisposition ?? 'pending' }];
  });
}
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export function aiInputDigest(snapshot, phase, decisions = []) {
  const readings = new Map((snapshot.metadata.imports ?? []).filter(job => job.status === 'ready' && job.readingRef).map(job => [job.sourceId, { sourceId: job.sourceId, sha256: job.readingRef.sha256, promptVersion: job.promptVersion }]));
  return createHash('sha256').update(JSON.stringify(canonical({ phase, promptVersion: PROMPT_VERSION, backlog: snapshot.backlog, context: snapshot.metadata.context.snapshotDigest, decisions, readings: [...readings.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId)) }))).digest('hex');
}
function decompositionSources(snapshot, analysisEvidence) {
  const included = snapshot.backlog.businessRequirements.filter(req => req.scopeDisposition === 'included');
  const fields = ['title', 'description', 'requirementType', 'solutionDisposition', 'moduleCandidates', 'rationale', 'nfrCriteria'];
  const reviewed = new Map((analysisEvidence?.requirements ?? []).filter(req => included.some(current => current.id === req.id && fields.every(key => JSON.stringify(canonical(current[key] ?? null)) === JSON.stringify(canonical(req[key] ?? null))))).map(req => [req.id, req]));
  return snapshot.backlog.sources.flatMap(source => {
    const clauses = source.clauses.flatMap(clause => {
      const linked = included.filter(req => clause.requirementIds?.includes(req.id));
      if (!linked.length) return source.sourceType === 'policy-memo' && source.id.startsWith('DEC-') ? [clause] : [];
      const quoted = linked.map(req => reviewed.get(req.id)?.citations.filter(cite => cite.sourceId === source.id && cite.clauseId === clause.id && clause.text.includes(cite.quote)) ?? []);
      return [{ ...clause, ...(quoted.every(items => items.length) ? { text: [...new Set(quoted.flat().map(cite => cite.quote))].join('\n'), citationEvidence: true } : {}) }];
    });
    return clauses.length ? [{ ...source, clauses }] : [];
  });
}
function batchPolicySources(snapshot, sources) {
  const current = new Set(sources.flatMap(source => source.clauses.map(clause => `${source.id}/${clause.id}`)));
  return snapshot.backlog.sources.filter(source => source.sourceType === 'policy-memo' && source.id.startsWith('DEC-')).flatMap(source => {
    const clauses = source.clauses.filter(clause => !current.has(`${source.id}/${clause.id}`));
    return clauses.length ? [{ ...source, clauses }] : [];
  });
}
export function buildAiRequest(snapshot, phase, decisions = [], { sources = snapshot.backlog.sources, batch, previousAnalysis, analysisEvidence, evidenceReferences = false } = {}) {
  if (!['analysis', 'decomposition'].includes(phase)) invalid();
  if (phase === 'decomposition') sources = decompositionSources(snapshot, analysisEvidence);
  const context = snapshot.metadata.context;
  const request = {
    phase,
    promptVersion: PROMPT_VERSION,
    instructions: buildStagePrompt(phase, { sourceTypes: [...sources.map(source => source.sourceType), ...(snapshot.metadata.imports ?? []).filter(job => job.status === 'ready' && sources.some(source => source.id === job.sourceId)).flatMap(job => job.detectedTypes ?? [])], formats: (snapshot.metadata.imports ?? []).filter(job => sources.some(source => source.id === job.sourceId)).map(job => job.format), hasExisting: snapshot.backlog.businessRequirements.length > 0, hasDecisions: decisions.length > 0 }) + '\nData contract: Cite exact verbatim source clauses for every requirement and issue. Cover every supplied source clause exactly once. Clause-to-requirement IDs are derived by the application from verified citations; you may omit coverage.requirementIds. An included/merged clause must be cited by at least one requirement. Identify conflicts, ambiguities, missing measurable criteria and human policy decisions as issues; never invent their resolution. Preserve stable requirement IDs and existing questions; propose explicit excluded/deferred scopes with reasons instead of dropping requirements. Do not invent existing repository targets, physical columns or actual acceptance evidence.',
    data: {
      project: snapshot.backlog.project,
      sources,
      decisions,
      previousRequirements: batch ? snapshot.backlog.businessRequirements.map(req => ({ id: req.id, scopeDisposition: req.scopeDisposition, openQuestions: req.openQuestions ?? [] })) : snapshot.backlog.businessRequirements,
      ...(batch ? { analysisBatch: { ...batch, capacity: { requirementsRemaining: Math.max(0, 150 - (previousAnalysis?.requirements.length ?? 0)), issuesRemaining: Math.max(0, 100 - (previousAnalysis?.issues.length ?? 0)), maxRequirements: 150, maxIssues: 100, maxCitationsPerRequirement: 30, maxProposalBytes: 1024 ** 2, citationCounts: Object.fromEntries((previousAnalysis?.requirements ?? []).map(req => [req.id, req.citations.length])) } }, previousAnalysis: { requirements: previousAnalysis?.requirements ?? [], issues: previousAnalysis?.issues ?? [] }, policySources: batchPolicySources(snapshot, sources) } : {}),
      ...(phase === 'decomposition' ? {
        previousWorkItems: snapshot.backlog.workItems,
        previousAcceptanceCriteria: snapshot.backlog.acceptanceCriteria.map(ac => Object.fromEntries(Object.keys(acSchema.properties).filter(key => Object.hasOwn(ac, key)).map(key => [key, ac[key]]))),
        previousTraceLinks: snapshot.backlog.traceLinks,
      } : {}),
      sourceReadingNotes: [...new Map((snapshot.metadata.imports ?? []).filter(job => job.status === 'ready' && snapshot.backlog.sources.some(source => source.id === job.sourceId)).map(job => [job.sourceId, { sourceId: job.sourceId, format: job.format, method: job.method, keptExistingClauses: job.keptExistingClauses === true, documentTypes: job.detectedTypes ?? [], needsReview: job.needsReview, warningCodes: job.warningCodes }])).values()],
      modules: context.modules ?? [],
      ...(phase === 'decomposition' ? { matches: matchRequirementsToContext(snapshot.backlog, context), archetypes: ARCHETYPE_CATALOG, decisionCardAxes: DECISION_CARD_AXES, verificationMethods: VERIFICATION_METHODS, planningRules: 'Only scopeDisposition=included requirements belong in executable work. Every child must have an epic covering all its requirementIds. Every child/requirement pair needs allow and forbid ACs. Stories require archetype and D-1: through D-5: decisionCards. Each included requirement needs a planned/existing trace. If a trace has acId, that AC must cover the trace requirementId and belong to its workItemId. Unknown future targets are planned, never existing. Issues may reference any known requirement. Cite only exact source clauses. Visual attachmentIndex is one-based in the attached content order; Office non-text diagrams are not available unless separately registered.' } : {}),
    },
  };
  request.instructions += ' On regeneration preserve human scope decisions, previous work, AC and trace IDs and exact wording when their meaning is unchanged. Use the existing plan as the starting point; change only what the confirmed requirements or explicit decisions require. Never copy human UAT judgments. Every omitted previous work/AC/trace ID requires an explicit retirements entry {entity:workItem|acceptanceCriterion|traceLink,id,reason}; the application will require separate human confirmation. Existing openQuestions are human questions and cannot disappear without an explicit recorded decision. Every citation must contain at least 12 letters/numbers, or all letters/numbers of a shorter clause, and must be an exact verbatim substring.';
  if (phase === 'decomposition') request.instructions += ' Plan from the confirmed requirements. Sources contain their linked clauses and explicit policy decisions, not unrelated background. A clause marked citationEvidence contains only exact previously reviewed quotations, separated by newlines; those are evidence excerpts, not a complete source paragraph. Quote a single supplied verbatim excerpt, never invent text across omitted sections. Human-edited requirements fall back to their linked original clauses.';
  if (batch) request.instructions += ' This is a sequential batch of ONE analysis. Cover exactly the clauses under data.sources in coverage, not previous batches or policySources. Return ONLY new or changed requirements and new issues for this batch; the application retains unchanged previousAnalysis requirements, citations and unresolved issues automatically. Reuse an existing requirement ID when meaning matches. To link a current clause to an existing requirement, return the updated requirement with its new exact citation. Never reprint all unchanged requirements or issues. Keep descriptions concrete and coverage rationales concise. Add only requirements grounded in this batch or previous citations. Existing human previousRequirements must all be represented in the accumulated result; propose explicit scopes instead of dropping them. Do not replace or downgrade an earlier issue. policySources contains explicit human answers applicable to every batch. Previous citations are verified verbatim evidence; do not invent text for a previous source. Other document parts may appear in attached PDFs but are not this batch coverage.';
  if (batch) request.instructions += ' New requirement IDs MUST start with analysisBatch.idPrefix. An existing ID may be changed ONLY when explicitly listed in updatedRequirementIds; include only changed existing IDs that actually appear in this delta. Never reuse an old ID for unrelated meaning. Human requirements are already seeded in previousAnalysis, so unchanged human requirements do not need to be returned. Observe analysisBatch.capacity including existing citation counts; earlier verified citations cannot be removed. If a genuinely new fact cannot fit the remaining capacity, preserve it as deferred coverage with a blocking decision issue rather than silently dropping it, inventing a split, or exceeding capacity. When an included requirement cites a processed source, that source needs at least one included/merged clause linked by a verified citation. Extra policySources are reference-only for this call and receive their own coverage when they appear under data.sources.';
  // Reference-capable callers materialize a smaller wire request before the
  // unchanged 768KiB forwarding guard. This internal canonical object is never
  // sent directly, and remains bounded by the archive's 8MiB ceiling.
  if (Buffer.byteLength(JSON.stringify(request)) > (evidenceReferences ? 8 * 1024 ** 2 : 768 * 1024)) capacity(phase === 'decomposition' ? 'AI_DECOMPOSITION_INPUT_TOO_LARGE' : 'AI_INPUT_TOO_LARGE');
  return request;
}

export function buildCorrectionRequest(request, output, details = [], { evidenceReferences = false } = {}) {
  if (request.phase === 'analysis' && request.data.analysisBatch) {
    const next = structuredClone(request), known = new Set((request.data.previousAnalysis?.requirements ?? []).map(req => req.id));
    next.instructions += ' Correct the CURRENT batch delta using the original inputs and bounded invariant failures. The rejected draft is not supplied. Return current coverage, only new/changed requirements, explicit updatedRequirementIds and new issues. Retain prior verified evidence and human decisions. Use exact provided source IDs, clause IDs and verbatim quotations; do not invent facts, approvals or policy to pass validation. Earlier verified citations remain preserved; defer genuinely new evidence with a decision issue when remaining capacity cannot accept it. Cite only current data.sources, previously verified previousAnalysis citations or explicit policySources. businessModel is global context and does not authorize unseen source citations. requirements/issues positions describe the accumulated candidate, not necessarily the current delta; a supplied requirementId identifies an existing requirement.';
    next.data.correction = { violations: safeValidationFailures(details).map((failure, index) => { const id = failureValue(details?.[index], 'requirementId'); return { ...failure, ...(known.has(id) ? { requirementId: id } : {}) }; }) };
    if (Buffer.byteLength(JSON.stringify(next)) > (evidenceReferences ? 8 * 1024 ** 2 : 768 * 1024)) capacity('AI_INPUT_TOO_LARGE');
    return next;
  }
  // Never retransmit malformed output. Only a schema-valid private draft can
  // be returned as untrusted data for one structural correction.
  privateValue(output, request.phase === 'analysis' ? request.data.analysisBatch ? BATCH_ANALYSIS_SCHEMA : ANALYSIS_SCHEMA : DECOMPOSITION_SCHEMA);
  const next = structuredClone(request);
  next.instructions += request.data.analysisBatch ? ' Correct the CURRENT batch delta using the listed failures, whose requirementId may refer to previousAnalysis. Return one complete JSON object for this batch, not the entire accumulated analysis: current coverage only, new/changed requirements, explicit updatedRequirementIds and new issues. Unchanged earlier entries remain preserved. Never drop prior citations to fit capacity; defer redundant/new current evidence and raise a blocking capacity decision when appropriate. Preserve human policy decisions.' : ' Correct the previous untrusted draft using the listed invariant failures and the original source/confirmed requirements. Return a complete corrected JSON. Preserve policy decisions; never fabricate approvals or facts to pass validation. Each trace acId must belong to its workItemId and explicitly cover its requirementId. Deferred/excluded requirements may appear in issues but must not be executable work.';
  next.data.correction = { previousOutput: structuredClone(output), violations: structuredClone(details) };
  if (Buffer.byteLength(JSON.stringify(next)) > 768 * 1024) capacity(request.phase === 'decomposition' ? 'AI_DECOMPOSITION_INPUT_TOO_LARGE' : 'AI_INPUT_TOO_LARGE');
  return next;
}
