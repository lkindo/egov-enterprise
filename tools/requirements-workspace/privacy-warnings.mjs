import { scanBacklogForPiiAndSecrets } from '../../scripts/export-deliverables-workspace.mjs';

// Only the authenticated, Git-external requirements workspace opts into this
// policy. Repository/public deliverable validators retain their strict default.
export const PRIVATE_ANALYSIS_VALIDATION = Object.freeze({ sensitiveData: 'warning' });
const kinds = ['resident-registration-number', 'mobile-phone', 'email-address', 'secret-or-credential', 'private-ip-literal'];
const stages = ['input', 'reading', 'synthesis', 'analysis', 'review-requirements', 'decomposition', 'review-plan'];
const fields = ['field', 'project', 'backlog', 'metadata', 'id', 'sourceId', 'inputId', 'clauseId', 'sources', 'clauses', 'text', 'title', 'summary', 'summaries', 'units', 'filename', 'locator', 'nativeReference', 'blocks', 'heading', 'note', 'unreadable', 'reason', 'businessRequirements', 'requirements', 'description', 'rationale', 'citations', 'quote', 'issues', 'question', 'options', 'workItems', 'acceptanceCriteria', 'traceLinks', 'given', 'when', 'then', 'notes', 'decisions', 'documents', 'businessModel', 'actors', 'processes', 'terms', 'revisions', 'workItemUpdates', 'acceptanceUpdates', 'traceUpdates', 'steps', 'exceptions', 'rules', 'data', 'meaning', 'responsibility', 'openQuestions', 'auditFindings', 'name', 'trigger', 'sourceCoverage', 'role'];
const pathPattern = new RegExp(`^project(?:(?:\\.(?:${fields.join('|')}))|(?:\\[\\d+\\]))*$`);
const safePath = path => {
  if (!/^project(?:\.[A-Za-z_][A-Za-z0-9_]*|\[\d+\])*$/.test(path)) return 'project';
  const safe = path.replace(/\.([A-Za-z_][A-Za-z0-9_]*)/g, (_, field) => `.${fields.includes(field) ? field : 'field'}`);
  return safe.length <= 300 ? safe : 'project';
};
export function validateSensitivityWarnings(warnings) {
  if (!Array.isArray(warnings) || warnings.length > kinds.length * stages.length) throw new Error('INVALID_SENSITIVITY_WARNINGS');
  const keys = new Set();
  for (const warning of warnings) {
    if (!warning || Object.keys(warning).sort().join(',') !== 'count,kind,paths,stage' || !kinds.includes(warning.kind) || !stages.includes(warning.stage) || !Number.isSafeInteger(warning.count) || warning.count < 1 || !Array.isArray(warning.paths) || warning.paths.length < 1 || warning.paths.length > 20 || warning.paths.some(path => typeof path !== 'string' || path.length > 300 || !pathPattern.test(path)) || new Set(warning.paths).size !== warning.paths.length || keys.has(`${warning.stage}/${warning.kind}`)) throw new Error('INVALID_SENSITIVITY_WARNINGS');
    keys.add(`${warning.stage}/${warning.kind}`);
  }
  return warnings;
}
export function mergeSensitivityWarnings(...groups) {
  const merged = new Map();
  for (const group of groups) for (const warning of validateSensitivityWarnings(group ?? [])) {
    const key = `${warning.stage}/${warning.kind}`, previous = merged.get(key);
    merged.set(key, { ...warning, count: Math.min(Number.MAX_SAFE_INTEGER, (previous?.count ?? 0) + warning.count), paths: [...new Set([...(previous?.paths ?? []), ...warning.paths])].sort().slice(0, 20) });
  }
  return [...merged.values()].sort((a, b) => `${a.stage}/${a.kind}`.localeCompare(`${b.stage}/${b.kind}`));
}
export function collectSensitivityWarnings(value, stage = 'input') {
  if (!stages.includes(stage)) throw new TypeError('Sensitivity warning stage');
  const grouped = new Map();
  for (const { kind: description, path } of scanBacklogForPiiAndSecrets({ project: value })) {
    const kind = description.split(' ')[0];
    const warning = grouped.get(kind) ?? { kind, stage, count: 0, paths: [] };
    warning.count++;
    const location = safePath(path);
    if (!warning.paths.includes(location) && warning.paths.length < 20) warning.paths.push(location);
    grouped.set(kind, warning);
  }
  return mergeSensitivityWarnings([...grouped.values()]);
}
