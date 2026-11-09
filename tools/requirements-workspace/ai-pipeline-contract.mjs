import { createHash } from 'node:crypto';
import { ANALYSIS_SCHEMA, DECOMPOSITION_SCHEMA, validatePrivateAiValue, validateEvidenceCitations } from './ai-contract.mjs';
const string = (maxLength = 2000) => ({ type: 'string', minLength: 1, maxLength });
const array = (items, maxItems = 100) => ({ type: 'array', items, minItems: 0, maxItems });
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const sources = { ...array(string(100), 100), minItems: 1 };
const issueArray = ANALYSIS_SCHEMA.properties.issues;
const DOCUMENT_SUMMARY_SCHEMA = object({ sourceId: string(100), title: string(300), sourceType: string(100), documentTypes: array(string(100), 6), summary: string(4000), sections: array(string(300), 4000), warningCodes: array(string(100), 100), unreadable: array(object({ inputId: string(100), reason: string(1000) }), 200), uncertain: array(object({ inputId: string(100), note: string(1000) }), 4000), clauseCount: { type: 'integer', minimum: 1, maximum: 3000 }, anchorScope: string(300), anchors: array(object({ sourceId: string(100), clauseId: string(100), quote: string(360) }), 32) });
export function validateDocumentSummaries(documents, snapshot) {
  validatePrivateAiValue(documents, array(DOCUMENT_SUMMARY_SCHEMA, 100), { maxBytes: 8 * 1024 ** 2 });
  const sourcesById = new Map(snapshot.backlog.sources.map(source => [source.id, source]));
  if (documents.length !== sourcesById.size || new Set(documents.map(doc => doc.sourceId)).size !== sourcesById.size) invalid('document-source');
  for (const doc of documents) {
    const source = sourcesById.get(doc.sourceId);
    if (!source || doc.title !== source.title || doc.sourceType !== source.sourceType || doc.clauseCount !== source.clauses.length || doc.anchors.some(anchor => anchor.sourceId !== doc.sourceId)) invalid('document-source');
    validateEvidenceCitations([{ citations: doc.anchors }], snapshot);
  }
  return documents;
}
export const BUSINESS_MODEL_MAX_BYTES = 160 * 1024;
export const BUSINESS_MODEL_SCHEMA = { ...object({
  summary: string(8000),
  actors: array(object({ name: string(200), responsibility: string(), sourceIds: sources }), 80),
  processes: array(object({ name: string(200), trigger: string(), steps: array(string(1000), 40), exceptions: array(string(1000), 40), rules: array(string(1000), 40), data: array(string(500), 40), sourceIds: sources }), 150),
  terms: array(object({ term: string(200), meaning: string(), sourceIds: sources }), 200),
  sourceCoverage: array(object({ sourceId: string(100), role: { type: 'string', enum: ['business', 'reference', 'duplicate', 'unreadable'] }, rationale: string() }), 200),
  issues: issueArray,
}), description: `Return a compact business discovery map, not a transcription. Both this batch delta and the accumulated model must fit ${BUSINESS_MODEL_MAX_BYTES} bytes of serialized UTF-8 JSON. Detailed requirements are analyzed from every original clause later. Summarize roles, processes and terminology concisely; retain source IDs and unresolved issues. Never invent facts or silently hide conflicts to fit the budget.` };
export const REQUIREMENT_REVIEW_SCHEMA = object({ issues: issueArray, revisions: array(ANALYSIS_SCHEMA.properties.requirements.items, 20) });
export const PLAN_REVIEW_SCHEMA = object({ issues: issueArray, workItemUpdates: array(DECOMPOSITION_SCHEMA.properties.workItems.items, 50), acceptanceUpdates: array(DECOMPOSITION_SCHEMA.properties.acceptanceCriteria.items, 100), traceUpdates: array(DECOMPOSITION_SCHEMA.properties.traceLinks.items, 100) });
const invalid = kind => { throw Object.assign(new Error('AI_OUTPUT_INVALID'), { code: 'AI_OUTPUT_INVALID', details: [{ kind, path: '$' }] }); };
const capacity = code => { throw Object.assign(new Error(code), { code }); };
const unique = values => { if (new Set(values.map(value => value.id)).size !== values.length) invalid('duplicate-id'); };
function validIssues(issues, snapshot, requirementIds) {
  unique(issues); validateEvidenceCitations(issues, snapshot);
  for (const issue of issues) if (issue.requirementIds.some(id => !requirementIds.has(id))) invalid('issue-reference');
}
export function mergeIssues(previous, incoming) {
  const result = structuredClone(previous), ids = new Set(result.map(issue => issue.id));
  for (const item of incoming) {
    const same = result.find(old => old.question === item.question && JSON.stringify(old.citations) === JSON.stringify(item.citations));
    if (same) { if (item.severity === 'blocking') same.severity = 'blocking'; continue; }
    const copy = structuredClone(item);
    if (ids.has(copy.id)) copy.id = `Q-${createHash('sha256').update(JSON.stringify(copy)).digest('hex').slice(0, 24)}`;
    if (ids.has(copy.id)) invalid('issue-id-collision');
    ids.add(copy.id); result.push(copy);
  }
  if (result.length > 100) capacity('AI_ISSUE_CAPACITY');
  return result;
}
export function validateBusinessModel(value, snapshot, expectedSources) {
  try { validatePrivateAiValue(value, BUSINESS_MODEL_SCHEMA, { maxBytes: BUSINESS_MODEL_MAX_BYTES }); }
  catch (error) { if (error.code === 'AI_OUTPUT_INVALID' && error.details?.some(detail => detail.kind === 'output-size')) capacity('AI_BUSINESS_MODEL_CAPACITY'); throw error; }
  const known = new Set(snapshot.backlog.sources.map(source => source.id));
  for (const item of [...value.actors, ...value.processes, ...value.terms]) if (new Set(item.sourceIds).size !== item.sourceIds.length || item.sourceIds.some(id => !known.has(id))) invalid('business-model-source');
  const coverage = new Set();
  for (const item of value.sourceCoverage) { if (!known.has(item.sourceId) || coverage.has(item.sourceId)) invalid('business-model-source'); coverage.add(item.sourceId); }
  if (expectedSources && (coverage.size !== expectedSources.length || expectedSources.some(id => !coverage.has(id)))) invalid('business-model-coverage');
  validIssues(value.issues, snapshot, new Set(snapshot.backlog.businessRequirements.map(req => req.id)));
  return structuredClone(value);
}
export function mergeBusinessModels(previous, next, snapshot) {
  if (!previous) return next;
  const merge = (old, incoming, key) => {
    const result = structuredClone(old);
    for (const item of incoming) {
      const at = result.findIndex(value => value[key] === item[key]);
      if (at < 0) result.push(structuredClone(item));
      else {
        const previous = result[at];
        result[at] = { ...structuredClone(item), sourceIds: [...new Set([...previous.sourceIds, ...item.sourceIds])] };
        for (const field of ['responsibility', 'meaning', 'trigger']) if (previous[field] && previous[field] !== item[field] && !item[field].includes(previous[field])) result[at][field] = previous[field].includes(item[field]) ? previous[field] : `${previous[field]}\n${item[field]}`;
        for (const field of ['steps', 'exceptions', 'rules', 'data']) if (Array.isArray(previous[field])) result[at][field] = [...new Set([...previous[field], ...item[field]])];
      }
    }
    return result;
  };
  const cover = new Map(previous.sourceCoverage.map(item => [item.sourceId, item])); for (const item of next.sourceCoverage) cover.set(item.sourceId, item);
  return validateBusinessModel({ summary: next.summary, actors: merge(previous.actors, next.actors, 'name'), processes: merge(previous.processes, next.processes, 'name'), terms: merge(previous.terms, next.terms, 'term'), sourceCoverage: [...cover.values()], issues: mergeIssues(previous.issues, next.issues) }, snapshot);
}
export function validateRequirementReview(value, proposal, snapshot) {
  validatePrivateAiValue(value, REQUIREMENT_REVIEW_SCHEMA); unique(value.revisions);
  const requirements = new Map(proposal.requirements.map(req => [req.id, structuredClone(req)]));
  validIssues(value.issues, snapshot, new Set(requirements.keys())); validateEvidenceCitations(value.revisions, snapshot);
  for (const revision of value.revisions) {
    const old = requirements.get(revision.id);
    if (!old || (revision.scope ?? 'included') !== (old.scope ?? 'included')) invalid('quality-scope-change');
    const quotes = new Map([...old.citations, ...revision.citations].map(cite => [`${cite.sourceId}/${cite.clauseId}/${cite.quote}`, cite]));
    if (quotes.size > 30) capacity('AI_CITATION_CAPACITY');
    requirements.set(revision.id, { ...structuredClone(revision), citations: [...quotes.values()] });
  }
  return { ...structuredClone(proposal), requirements: [...requirements.values()], issues: mergeIssues(proposal.issues, value.issues) };
}
export function validatePlanReview(value, proposal, snapshot, allowed) {
  validatePrivateAiValue(value, PLAN_REVIEW_SCHEMA);
  const known = new Set(snapshot.backlog.businessRequirements.filter(req => req.scopeDisposition === 'included').map(req => req.id));
  validIssues(value.issues, snapshot, new Set(snapshot.backlog.businessRequirements.map(req => req.id)));
  for (const item of [...value.workItemUpdates, ...value.acceptanceUpdates]) if (item.requirementIds.some(id => !known.has(id))) invalid('plan-review-requirement');
  for (const link of value.traceUpdates) if (!known.has(link.requirementId)) invalid('plan-review-requirement');
  const upsert = (items, incoming, field) => {
    unique(incoming); const byId = new Map(items.map(item => [item.id, structuredClone(item)]));
    for (const item of incoming) {
      const old = byId.get(item.id);
      if (!old || allowed && !allowed[field].has(item.id)) invalid('plan-review-id');
      const next = structuredClone(item);
      if (old.requirementIds) {
        if (item.requirementIds.some(id => !old.requirementIds.includes(id))) invalid('plan-review-scope');
        next.requirementIds = [...old.requirementIds];
        if (field === 'workItems' && (old.workItemType !== next.workItemType || old.parentEpicId !== next.parentEpicId)) invalid('plan-review-scope');
      } else if (old.requirementId !== next.requirementId || old.workItemId !== next.workItemId) invalid('plan-review-scope');
      byId.set(item.id, next);
    }
    return [...byId.values()];
  };
  return { ...structuredClone(proposal), workItems: upsert(proposal.workItems, value.workItemUpdates, 'workItems'), acceptanceCriteria: upsert(proposal.acceptanceCriteria, value.acceptanceUpdates, 'acceptanceCriteria'), traceLinks: upsert(proposal.traceLinks, value.traceUpdates, 'traceLinks'), issues: mergeIssues(proposal.issues, value.issues) };
}
