// Item store model (ADR-0055). Requirements and deliverable items are small
// independent records; documents are rendered from them. Every function here is
// synchronous and takes the state it changes, so the rules can be tested without
// a model, a server or a workspace.
import { createHash } from 'node:crypto';
import { ARTIFACT_IDS, FIELD_LIMITS, REQUIREMENT_KIND, fieldConflicts, fieldLabels, fieldText, fieldsOf, isFilled, isKind, kindPrefix, mergeFieldsAdditive, normalizeField, normalizeFields, overflowingFields, rowKey } from './studio-catalog.mjs';
import { createIndex } from './studio-index.mjs';

export const STUDIO_VERSION = 1;
// `variants` is how many open notes of differing wording one field of one item keeps.
export const STUDIO_LIMITS = { items: 4000, candidates: 2000, issues: 4000, variants: 3, proposals: 1000, evidence: 40, links: 60, jobs: 12, stories: 3000, epics: 200, baselines: 100, questions: 8, tags: 20000 };
/** Issue kinds. A question or a conflict blocks confirmation; a variant only shows that documents word a value differently. */
export const ISSUE_KINDS = ['conflict', 'question', 'variant'];
/** Requirement classes that become stories; the rest are quality criteria or project management. */
export const DEVELOPMENT_CATEGORIES = ['SFR', 'SIR', 'DAR'];
export const QUALITY_CATEGORIES = ['ECR', 'PER', 'TER', 'SER', 'QUR', 'COR'];
export const JOB_KINDS = ['analyze', 'enrich', 'plan'];
export const JOB_STATUSES = ['running', 'done', 'failed', 'cancelled', 'interrupted'];
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/;
const HASH = /^[a-f0-9]{12}$/;
const fail = code => { throw Object.assign(new Error(code), { code }); };
const sha = value => createHash('sha256').update(value).digest('hex');
const clean = (value, limit) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, limit).trim() : '';
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) => { if (!plain(value) || Object.keys(value).some(key => !keys.includes(key))) fail('STUDIO_STATE_INVALID'); };
const count = value => Number.isSafeInteger(value) && value >= 0;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export const clauseKey = (sourceId, clauseId) => `${sourceId}/${clauseId}`;
export const clauseHash = text => sha(text).slice(0, 12);
export const meaningHash = item => sha(JSON.stringify([item.name, item.fields])).slice(0, 16);

export function initialStudio() {
  return { version: STUDIO_VERSION, enabled: ['function-tree', 'entity-def', 'screen-def'], seq: {}, numbers: {}, tags: {}, items: [], candidates: [], proposals: [], issues: [], baselines: [], plan: null, jobs: [] };
}

/** Clauses the store can address. A clause is the unit of evidence and of every model request. */
export function clauseMap(backlog) {
  const map = new Map();
  for (const source of backlog?.sources ?? []) {
    if (!ID.test(source?.id ?? '')) continue;
    for (const clause of source.clauses ?? []) {
      if (!ID.test(clause?.id ?? '') || typeof clause.text !== 'string' || !clause.text.trim()) continue;
      map.set(clauseKey(source.id, clause.id), { key: clauseKey(source.id, clause.id), sourceId: source.id, clauseId: clause.id, title: source.title ?? source.id, sourceType: source.sourceType ?? 'other', summary: source.summary ?? '', locator: clause.locator ?? '', text: clause.text, hash: clauseHash(clause.text) });
    }
  }
  return map;
}

function evidenceList(entries) {
  const seen = new Set(), result = [];
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!plain(entry) || !ID.test(entry.s ?? '') || !ID.test(entry.c ?? '') || !HASH.test(entry.h ?? '') || seen.has(clauseKey(entry.s, entry.c))) continue;
    seen.add(clauseKey(entry.s, entry.c)); result.push({ s: entry.s, c: entry.c, h: entry.h });
    if (result.length >= STUDIO_LIMITS.evidence) break;
  }
  return result;
}
const questionList = values => [...new Set((Array.isArray(values) ? values : []).map(value => clean(value, 500)).filter(Boolean))].slice(0, STUDIO_LIMITS.questions);

function validateEvidence(list) {
  if (!Array.isArray(list) || list.length > STUDIO_LIMITS.evidence || !same(list, evidenceList(list))) fail('STUDIO_STATE_INVALID');
}
function validateFields(kind, fields) {
  if (!isKind(kind) || !same(fields, normalizeFields(kind, fields))) fail('STUDIO_STATE_INVALID');
}
/** Stored state is canonical: anything that normalisation would change is rejected, not repaired. */
export function validateStudio(studio) {
  if (studio === undefined) return true;
  exact(studio, ['version', 'enabled', 'seq', 'numbers', 'tags', 'items', 'candidates', 'proposals', 'issues', 'baselines', 'plan', 'jobs']);
  if (studio.version !== STUDIO_VERSION || !Array.isArray(studio.enabled) || new Set(studio.enabled).size !== studio.enabled.length || studio.enabled.some(id => !ARTIFACT_IDS.includes(id))) fail('STUDIO_STATE_INVALID');
  for (const counters of [studio.seq, studio.numbers]) if (!plain(counters) || Object.entries(counters).some(([key, value]) => !/^[A-Z]{2,4}$/.test(key) || !count(value))) fail('STUDIO_STATE_INVALID');
  if (!plain(studio.tags) || Object.keys(studio.tags).length > STUDIO_LIMITS.tags) fail('STUDIO_STATE_INVALID');
  for (const [key, tag] of Object.entries(studio.tags)) {
    exact(tag, ['h', 'r', 'a', 'x', 'f']);
    if (key.length > 210 || !(tag.h === '' || HASH.test(tag.h)) || ![0, 1].includes(tag.r) || (tag.f !== undefined && !count(tag.f))) fail('STUDIO_STATE_INVALID');
    for (const list of [tag.a, tag.x]) if (!Array.isArray(list) || new Set(list).size !== list.length || list.some(id => !ARTIFACT_IDS.includes(id))) fail('STUDIO_STATE_INVALID');
  }
  const lists = [['items', STUDIO_LIMITS.items], ['candidates', STUDIO_LIMITS.candidates], ['proposals', STUDIO_LIMITS.proposals], ['issues', STUDIO_LIMITS.issues], ['baselines', STUDIO_LIMITS.baselines], ['jobs', STUDIO_LIMITS.jobs]];
  for (const [key, limit] of lists) if (!Array.isArray(studio[key]) || studio[key].length > limit) fail('STUDIO_STATE_INVALID');
  const ids = new Set();
  const unique = id => { if (!ID.test(id ?? '') || ids.has(id)) fail('STUDIO_STATE_INVALID'); ids.add(id); };
  for (const item of studio.items) {
    exact(item, ['id', 'kind', 'name', 'fields', 'evidence', 'links', 'status', 'number', 'origin', 'rev', 'flags', 'baseline', 'changed', 'note']);
    unique(item.id); validateFields(item.kind, item.fields); validateEvidence(item.evidence);
    if (!item.name || item.name !== clean(item.name, FIELD_LIMITS.name) || !['draft', 'confirmed', 'retired'].includes(item.status) || !['ai', 'user'].includes(item.origin) || !count(item.rev)) fail('STUDIO_STATE_INVALID');
    // A number carries its class; the two may not come apart by any path.
    if (item.number !== undefined && (item.kind !== REQUIREMENT_KIND || !/^[A-Z]{3}-\d{3,5}$/.test(item.number) || item.number.slice(0, 3) !== item.fields.category)) fail('STUDIO_STATE_INVALID');
    if (item.links !== undefined && (!Array.isArray(item.links) || item.links.length > STUDIO_LIMITS.links || item.links.some(id => !ID.test(id)))) fail('STUDIO_STATE_INVALID');
    exact(item.flags, ['fresh', 'enriched']);
    if (item.baseline !== undefined && !/^BL-\d{1,4}$/.test(item.baseline)) fail('STUDIO_STATE_INVALID');
    if (item.changed !== undefined && item.changed !== 1) fail('STUDIO_STATE_INVALID');
    if (item.note !== undefined && item.note !== clean(item.note, FIELD_LIMITS.text)) fail('STUDIO_STATE_INVALID');
  }
  for (const candidate of studio.candidates) {
    exact(candidate, ['id', 'kind', 'name', 'fields', 'evidence', 'questions']);
    unique(candidate.id); validateFields(candidate.kind, candidate.fields); validateEvidence(candidate.evidence);
    if (!candidate.name || !same(candidate.questions, questionList(candidate.questions))) fail('STUDIO_STATE_INVALID');
  }
  for (const proposal of studio.proposals) {
    exact(proposal, ['id', 'itemId', 'fields', 'evidence', 'createdAt']);
    unique(proposal.id); validateEvidence(proposal.evidence);
    const item = studio.items.find(entry => entry.id === proposal.itemId);
    if (!item || typeof proposal.createdAt !== 'string') fail('STUDIO_STATE_INVALID');
    validateFields(item.kind, proposal.fields);
  }
  for (const issue of studio.issues) {
    exact(issue, ['id', 'kind', 'itemId', 'text', 'field', 'existing', 'incoming', 'fields', 'evidence', 'open', 'resolution', 'createdAt', 'topic', 'alone']);
    unique(issue.id); validateEvidence(issue.evidence);
    const item = studio.items.find(entry => entry.id === issue.itemId);
    if (!item || !ISSUE_KINDS.includes(issue.kind) || !issue.text || issue.text !== clean(issue.text, 1000) || ![0, 1].includes(issue.open) || typeof issue.createdAt !== 'string') fail('STUDIO_STATE_INVALID');
    if (issue.fields !== undefined) validateFields(item.kind, issue.fields);
    for (const key of ['field', 'existing', 'incoming', 'resolution']) if (issue[key] !== undefined && (typeof issue[key] !== 'string' || issue[key].length > FIELD_LIMITS.text)) fail('STUDIO_STATE_INVALID');
  }
  // Only a question has a topic, and it names a question that leads a group: one whose topic is itself. An open question
  // is never left in the group of a closed one, and a question that stands alone leads only itself.
  const questions = new Map(studio.issues.filter(issue => issue.kind === 'question').map(issue => [issue.id, issue]));
  for (const issue of studio.issues) {
    const lead = questions.get(issue.topic);
    if (issue.topic !== undefined && (issue.kind !== 'question' || lead?.topic !== issue.topic || (issue.open && !lead.open) || (lead !== issue && lead.alone))) fail('STUDIO_STATE_INVALID');
    if (issue.alone !== undefined && (issue.alone !== 1 || issue.topic !== issue.id)) fail('STUDIO_STATE_INVALID');
  }
  for (const baseline of studio.baselines) {
    exact(baseline, ['id', 'name', 'createdAt', 'ref', 'counts']);
    if (!/^BL-\d{1,4}$/.test(baseline.id ?? '') || !baseline.name || baseline.name !== clean(baseline.name, 120) || typeof baseline.createdAt !== 'string' || !plain(baseline.ref) || !plain(baseline.counts) || Object.values(baseline.counts).some(value => !count(value))) fail('STUDIO_STATE_INVALID');
  }
  if (studio.plan !== null) {
    exact(studio.plan, ['epics', 'stories', 'updatedAt']);
    if (!Array.isArray(studio.plan.epics) || studio.plan.epics.length > STUDIO_LIMITS.epics || !Array.isArray(studio.plan.stories) || studio.plan.stories.length > STUDIO_LIMITS.stories || typeof studio.plan.updatedAt !== 'string') fail('STUDIO_STATE_INVALID');
    for (const epic of studio.plan.epics) { exact(epic, ['id', 'name']); unique(epic.id); if (!epic.name || epic.name !== clean(epic.name, FIELD_LIMITS.name)) fail('STUDIO_STATE_INVALID'); }
    for (const story of studio.plan.stories) {
      exact(story, ['id', 'epicId', 'reqId', 'title', 'role', 'want', 'green', 'red', 'hash']);
      unique(story.id);
      if (!studio.plan.epics.some(epic => epic.id === story.epicId) || !ID.test(story.reqId ?? '') || !story.title || !/^[a-f0-9]{16}$/.test(story.hash ?? '')) fail('STUDIO_STATE_INVALID');
      for (const key of ['title', 'role', 'want']) if (story[key] !== clean(story[key], key === 'want' ? FIELD_LIMITS.text : FIELD_LIMITS.name)) fail('STUDIO_STATE_INVALID');
      for (const key of ['green', 'red']) if (!Array.isArray(story[key]) || story[key].length > 12 || story[key].some(line => !line || line !== clean(line, FIELD_LIMITS.listItem))) fail('STUDIO_STATE_INVALID');
    }
  }
  for (const job of studio.jobs) {
    exact(job, ['id', 'kind', 'status', 'startedAt', 'completedAt', 'stage', 'done', 'total', 'calls', 'requestBytes', 'maxRequestBytes', 'outputBytes', 'inputTokens', 'outputTokens', 'failures', 'errorCode', 'summary', 'target', 'promptVersion']);
    unique(job.id);
    if (!JOB_KINDS.includes(job.kind) || !JOB_STATUSES.includes(job.status) || typeof job.startedAt !== 'string' || typeof job.stage !== 'string' || job.stage.length > 80 || !plain(job.summary) || Object.values(job.summary).some(value => !count(value))) fail('STUDIO_STATE_INVALID');
    for (const key of ['done', 'total', 'calls', 'requestBytes', 'maxRequestBytes', 'outputBytes', 'inputTokens', 'outputTokens', 'failures']) if (!count(job[key])) fail('STUDIO_STATE_INVALID');
    if (job.errorCode !== undefined && !/^[A-Z][A-Z0-9_]{2,80}$/.test(job.errorCode)) fail('STUDIO_STATE_INVALID');
    if (job.target !== undefined && !ID.test(job.target)) fail('STUDIO_STATE_INVALID');
  }
  return true;
}

function nextId(studio, prefix, width = 4) {
  studio.seq[prefix] = (studio.seq[prefix] ?? 0) + 1;
  return `${prefix}-${String(studio.seq[prefix]).padStart(width, '0')}`;
}
export const itemById = (studio, id) => studio.items.find(item => item.id === id);
/** Open questions and conflicts of an item: what a person has to decide before it can be confirmed. */
export const openIssues = (studio, id) => studio.issues.filter(issue => issue.open && issue.kind !== 'variant' && issue.itemId === id);
export const openVariants = (studio, id) => studio.issues.filter(issue => issue.open && issue.kind === 'variant' && issue.itemId === id);
export const proposalsOf = (studio, id) => studio.proposals.filter(proposal => proposal.itemId === id);
/** Open questions that have not been compared with the earlier ones yet. `topic` is set once a question has been: to the question it repeats, or to itself. */
export const ungroupedQuestions = studio => studio.issues.filter(issue => issue.open && issue.kind === 'question' && issue.topic === undefined);
/** The open questions that ask what this one asks, itself included. A person answers them once. */
export const questionGroup = (studio, issue) => issue.topic === undefined ? [issue] : studio.issues.filter(entry => entry.open && entry.kind === 'question' && entry.topic === issue.topic);
/**
 * A question about one record's own content is never compared with the
 * questions of other records, in either direction: it joins no group and no
 * question joins it. These are the questions raised as `alone` and the notice
 * the program attaches when content was cut.
 */
const CUT_NOTICE = '길이 한도를 넘어 일부만 담겼습니다';
export const standsAlone = issue => issue.alone === 1 || issue.text.includes(CUT_NOTICE);

/** What still has to be sent to the model, derived from state. Nothing is queued separately, so an interrupted run resumes by running again. */
export function pendingWork(studio, backlog) {
  const classify = [], extract = Object.fromEntries(studio.enabled.map(type => [type, []]));
  for (const clause of clauseMap(backlog).values()) {
    const tag = studio.tags[clause.key];
    if (!tag || tag.h !== clause.hash) { classify.push(clause); continue; }
    for (const type of studio.enabled) if (tag.a.includes(type) && !tag.x.includes(type)) extract[type].push(clause);
  }
  return { classify, extract, merge: studio.candidates.length, questions: ungroupedQuestions(studio).length };
}
export function applyTag(studio, clause, { requirement, artifacts }) {
  studio.tags[clause.key] = { h: clause.hash, r: requirement ? 1 : 0, a: [...new Set(artifacts)].filter(id => ARTIFACT_IDS.includes(id)), x: [] };
}
/** A clause the model twice failed to classify is closed as unrelated and counted, never retried forever. */
export function failTag(studio, clause) {
  const failures = (studio.tags[clause.key]?.f ?? 0) + 1;
  studio.tags[clause.key] = { h: failures >= 2 ? clause.hash : '', r: 0, a: [], x: [], f: failures };
}
export function markExtracted(studio, clauses, type) {
  for (const clause of clauses) { const tag = studio.tags[clause.key]; if (tag && tag.h === clause.hash && !tag.x.includes(type)) tag.x.push(type); }
}

export function addCandidate(studio, { kind, name, fields, evidence, questions }) {
  if (!isKind(kind)) return null;
  // Content beyond a field's limit is not kept; the candidate then carries a question that says so, which blocks confirmation until a person has looked.
  const over = overflowingFields(kind, fields);
  const notice = over.length ? [`‘${fieldLabels(kind, over)}’의 내용이 ${CUT_NOTICE}. 근거 조각과 대조해 나누어 적어 주세요.`] : [];
  const candidate = { id: nextId(studio, 'CND', 5), kind, name: clean(name, FIELD_LIMITS.name), fields: normalizeFields(kind, fields), evidence: evidenceList(evidence), questions: questionList([...notice, ...(Array.isArray(questions) ? questions : [])]) };
  if (!candidate.name || !candidate.evidence.length) return null;
  if (studio.candidates.length >= STUDIO_LIMITS.candidates) fail('STUDIO_CAPACITY');
  studio.candidates.push(candidate);
  return candidate;
}

/** Text of an item for search and for the compact form sent to the model. */
export function itemText(kind, fields, limit = 1200) {
  return fieldsOf(kind).filter(spec => spec.key !== 'category').map(spec => fieldText(spec, fields[spec.key])).filter(Boolean).join(' · ').slice(0, limit);
}
export const searchParts = (kind, name, fields) => [[name, 3], [itemText(kind, fields), 1]];
/**
 * Finds the few existing items of one kind that resemble a candidate. The
 * returned function is reused for a whole round so the index is built once.
 */
export function neighborIndex(studio, kind) {
  const pool = new Map(studio.items.filter(item => item.kind === kind && item.status !== 'retired').map(item => [item.id, item]));
  const index = createIndex([...pool.values()].map(item => ({ id: item.id, parts: searchParts(kind, item.name, item.fields) })));
  return (name, fields, limit = 6) => index.search(searchParts(kind, name, fields), limit, 0.18).map(hit => ({ item: pool.get(hit.id), score: hit.score }));
}

export function createItem(studio, { kind, name, fields, evidence = [], origin = 'ai' }) {
  if (!isKind(kind)) fail('STUDIO_KIND_INVALID');
  if (studio.items.length >= STUDIO_LIMITS.items) fail('STUDIO_CAPACITY');
  const item = { id: nextId(studio, kindPrefix(kind)), kind, name: clean(name, FIELD_LIMITS.name), fields: normalizeFields(kind, fields), evidence: evidenceList(evidence), status: 'draft', origin, rev: 1, flags: { fresh: 1 } };
  if (!item.name) fail('STUDIO_NAME_REQUIRED');
  studio.items.push(item);
  return item;
}
function addEvidence(item, evidence) { item.evidence = evidenceList([...item.evidence, ...evidence]); }
function touch(item) { item.rev += 1; if (item.baseline) item.changed = 1; }
/**
 * Attaches questions a person has to answer to an item. Returns how many were
 * new. A full store is an error: an open question blocks confirmation, so one
 * may not be left out without a trace. `alone` marks questions about this one
 * record only (what would fill its own empty field), which are never compared
 * with the questions of other records.
 */
export function raiseQuestions(studio, item, questions, evidence, now, alone = false) {
  let added = 0;
  for (const text of questionList(questions)) {
    if (studio.issues.some(issue => issue.kind === 'question' && issue.itemId === item.id && issue.text === text)) continue;
    if (studio.issues.length >= STUDIO_LIMITS.issues) fail('STUDIO_ISSUE_CAPACITY');
    const id = nextId(studio, 'ISS');
    studio.issues.push({ id, kind: 'question', itemId: item.id, text, evidence: evidenceList(evidence), open: 1, createdAt: now, ...(alone ? { topic: id, alone: 1 } : {}) });
    added += 1;
  }
  return added;
}
/**
 * Records what the comparison found for one open question: it repeats an
 * earlier open question and joins that one's group, or (no `leadId`) it leads a
 * group of its own. Returns false when nothing was recorded — the question was
 * closed or grouped meanwhile, or the one it was compared with no longer leads
 * an open group or stands alone — so the caller compares it again.
 */
export function groupQuestion(studio, id, leadId) {
  const issue = ungroupedQuestions(studio).find(entry => entry.id === id);
  if (!issue) return false;
  if (leadId === undefined) { issue.topic = issue.id; return true; }
  const lead = studio.issues.find(entry => entry.id === leadId && entry.open && entry.kind === 'question' && entry.topic === entry.id && !standsAlone(entry));
  if (!lead) return false;
  issue.topic = lead.id;
  return true;
}
/** Takes one question out of its group, for a person who finds that it asks something else. The rest stay together under the earliest of them. */
export function splitQuestion(studio, id) {
  const issue = studio.issues.find(entry => entry.id === id && entry.open && entry.kind === 'question');
  if (!issue) fail('STUDIO_ISSUE_NOT_FOUND');
  const rest = questionGroup(studio, issue).filter(entry => entry !== issue);
  if (!rest.length) fail('STUDIO_ISSUE_NOT_GROUPED');
  if (issue.topic === issue.id) for (const entry of rest) entry.topic = rest[0].id;
  issue.topic = issue.id;
  return issue;
}
/** Records two statements that cannot both hold, for a person to decide. Returns false when the same open issue is already there. */
function raiseConflict(studio, target, { text, field, existing, incoming, fields, evidence }, now) {
  if (studio.issues.some(issue => issue.open && issue.kind === 'conflict' && issue.itemId === target.id && issue.text === text && issue.incoming === incoming)) return false;
  if (studio.issues.length >= STUDIO_LIMITS.issues) fail('STUDIO_ISSUE_CAPACITY');
  studio.issues.push({ id: nextId(studio, 'ISS'), kind: 'conflict', itemId: target.id, text, ...(field ? { field } : {}), ...(existing ? { existing } : {}), ...(incoming ? { incoming } : {}),
    ...(fields ? { fields: normalizeFields(target.kind, fields) } : {}), evidence: evidenceList(evidence), open: 1, createdAt: now });
  return true;
}
const variantText = (kind, field) => `‘${fieldLabels(kind, [field])}’ 값이 문서마다 다릅니다.`;
/**
 * Notes that another document words a short value or a table row differently.
 * The program cannot tell wording from contradiction, so this never blocks
 * confirmation and never stops a run: a field keeps a few notes, and a full
 * store takes no more. The candidate's source is still cited on the record.
 */
function raiseVariant(studio, target, { field, existing, incoming, fields, evidence }, now) {
  const open = studio.issues.filter(issue => issue.open && issue.kind === 'variant' && issue.itemId === target.id && issue.field === field);
  if (open.some(issue => issue.incoming === incoming) || open.length >= STUDIO_LIMITS.variants || studio.issues.length >= STUDIO_LIMITS.issues) return false;
  studio.issues.push({ id: nextId(studio, 'ISS'), kind: 'variant', itemId: target.id, text: variantText(target.kind, field), field, existing, incoming,
    ...(fields ? { fields: normalizeFields(target.kind, fields) } : {}), evidence: evidenceList(evidence), open: 1, createdAt: now });
  return true;
}
/**
 * Differences the program itself raised were once stored as conflicts and
 * blocked confirmation. They become notes; what the model judged a conflict
 * stays one, even when its note uses the same words. The two are told apart by
 * what was stored: the program kept nothing else for a text value and only the
 * one differing row for a table, while a model conflict always carries the
 * candidate's whole content and never quotes a table row as the existing
 * statement. Records changed here are all kept, however many a field has.
 * Returns how many were changed.
 */
export function demoteProgramConflicts(studio) {
  let changed = 0;
  for (const issue of studio.issues) {
    if (issue.kind !== 'conflict' || !issue.field || !issue.existing || !issue.incoming) continue;
    const item = itemById(studio, issue.itemId), spec = item && fieldsOf(item.kind).find(entry => entry.key === issue.field);
    if (!spec || issue.text !== variantText(item.kind, spec.key)) continue;
    const own = spec.type === 'text' ? issue.fields === undefined
      : spec.type === 'rows' && issue.fields !== undefined && issue.fields[spec.key].length === 1 && fieldsOf(item.kind).every(entry => entry.key === spec.key || !isFilled(issue.fields[entry.key]));
    if (own) { issue.kind = 'variant'; changed += 1; }
  }
  return changed;
}
/** What the field a note is about holds now. The note's own `existing` is what it held when the note was written. */
export function variantCurrent(studio, issue) {
  const item = itemById(studio, issue.itemId), spec = item && fieldsOf(item.kind).find(entry => entry.key === issue.field);
  if (!spec) return '';
  if (spec.type === 'text') return item.fields[spec.key];
  const row = issue.fields?.[spec.key]?.[0], match = row && spec.type === 'rows' ? item.fields[spec.key].find(entry => rowKey(spec, entry) === rowKey(spec, row)) : null;
  return match ? fieldText(spec, [match]) : '';
}

/**
 * Applies one merge decision. The model only judges identity and names a
 * conflict; what is merged is always the candidate's own extracted content.
 *
 * A confirmed record is never changed here, not even its sources: what the
 * candidate would add waits as a proposal. The same holds for a draft when
 * `decision.review` says the comparison did not see both texts in full.
 * Additions that do not fit are raised as issues, and structured values that
 * differ are kept as notes, so the candidate's content leaves a trace.
 */
export function settleCandidate(studio, candidateId, decision, now) {
  const index = studio.candidates.findIndex(candidate => candidate.id === candidateId);
  if (index < 0) fail('STUDIO_CANDIDATE_NOT_FOUND');
  const [candidate] = studio.candidates.splice(index, 1);
  const target = ['same', 'conflict'].includes(decision?.action) ? studio.items.find(item => item.id === decision.target && item.kind === candidate.kind && item.status !== 'retired') : null;
  if (!target) {
    const item = createItem(studio, candidate);
    raiseQuestions(studio, item, candidate.questions, candidate.evidence, now);
    return { outcome: 'added', item, conflicts: 0 };
  }
  if (decision.action === 'conflict') {
    // The requirement class is never a statement to replace: a numbered requirement keeps its class.
    const spec = fieldsOf(target.kind).find(entry => entry.key === decision.field && entry.key !== 'category');
    const existing = clean(decision.existing, FIELD_LIMITS.text), known = spec && (spec.type === 'text' ? target.fields[spec.key] === existing : spec.type === 'list' && target.fields[spec.key].includes(existing));
    raiseConflict(studio, target, { text: clean(decision.note, 1000) || `‘${candidate.name}’의 내용이 기존 내용과 다릅니다.`, field: known ? spec.key : undefined, existing: known ? existing : undefined,
      incoming: clean(decision.incoming, FIELD_LIMITS.text), fields: candidate.fields, evidence: candidate.evidence }, now);
    return { outcome: 'conflict', item: target, conflicts: 0 };
  }
  const merged = mergeFieldsAdditive(target.kind, target.fields, candidate.fields);
  raiseQuestions(studio, target, candidate.questions, candidate.evidence, now);
  let conflicts = 0, variants = 0;
  for (const conflict of fieldConflicts(target.kind, target.fields, candidate.fields)) {
    if (raiseVariant(studio, target, { field: conflict.field, existing: conflict.existing, incoming: conflict.incoming, fields: conflict.rows ? { [conflict.field]: conflict.rows } : undefined, evidence: candidate.evidence }, now)) variants += 1;
  }
  if (merged.overflow.length && raiseConflict(studio, target, { text: `‘${fieldLabels(target.kind, merged.overflow)}’에 더할 내용이 한도를 넘어 다 담지 못했습니다. 항목을 나누거나 정리한 뒤 아래 내용을 반영해 주세요.`, fields: candidate.fields, evidence: candidate.evidence }, now)) conflicts += 1;
  const cited = new Set(target.evidence.map(entry => clauseKey(entry.s, entry.c))), fresh = candidate.evidence.filter(entry => !cited.has(clauseKey(entry.s, entry.c)));
  if (!merged.changed.length && (!fresh.length || target.status !== 'confirmed')) { addEvidence(target, fresh); return { outcome: 'duplicate', item: target, conflicts, variants }; }
  if (target.status === 'confirmed' || decision.review === true) {
    const fields = normalizeFields(target.kind, merged.added);
    if (!studio.proposals.some(proposal => proposal.itemId === target.id && same(proposal.fields, fields) && same(proposal.evidence, candidate.evidence))) {
      if (studio.proposals.length >= STUDIO_LIMITS.proposals) fail('STUDIO_CAPACITY');
      studio.proposals.push({ id: nextId(studio, 'PRP'), itemId: target.id, fields, evidence: candidate.evidence, createdAt: now });
    }
    return { outcome: 'proposed', item: target, conflicts, variants };
  }
  target.fields = merged.fields; addEvidence(target, candidate.evidence); target.flags.enriched = 1; touch(target);
  return { outcome: 'enriched', item: target, conflicts, variants };
}

export const missingFields = item => fieldsOf(item.kind).filter(spec => spec.required && !isFilled(item.fields[spec.key])).map(spec => spec.key);
export const itemReady = (studio, item) => item.status !== 'retired' && !missingFields(item).length && (item.evidence.length > 0 || item.origin === 'user') && !openIssues(studio, item.id).length;
export function itemScore(studio, item) {
  const specs = fieldsOf(item.kind), required = specs.filter(spec => spec.required), optional = specs.filter(spec => !spec.required);
  const ratio = list => list.length ? list.filter(spec => isFilled(item.fields[spec.key])).length / list.length : 1;
  const grounded = item.evidence.length > 0 || item.origin === 'user';
  return Math.round(ratio(required) * 70 + ratio(optional) * 10 + (grounded ? 10 : 0) + (openIssues(studio, item.id).length ? 0 : 10));
}

export function setItemStatus(studio, id, status) {
  const item = itemById(studio, id);
  if (!item) fail('STUDIO_ITEM_NOT_FOUND');
  if (!['draft', 'confirmed', 'retired'].includes(status)) fail('STUDIO_STATUS_INVALID');
  if (status === 'confirmed') {
    if (!itemReady(studio, item)) fail('STUDIO_NOT_READY');
    if (item.kind === REQUIREMENT_KIND && !item.number) {
      // Numbers are issued once per class and never reused or renumbered.
      const category = item.fields.category;
      studio.numbers[category] = (studio.numbers[category] ?? 0) + 1;
      item.number = `${category}-${String(studio.numbers[category]).padStart(3, '0')}`;
    }
    item.flags = {};
  }
  if (item.status !== status) { item.status = status; touch(item); }
  return item;
}
/** Human edit or manual creation. A numbered requirement keeps its class. */
export function saveItem(studio, { id, kind, name, fields, links, rev }) {
  // What a person typed is saved whole or not at all; nothing is cut to fit.
  if (overflowingFields(id === undefined ? kind : itemById(studio, id)?.kind, fields).length || String(name ?? '').replace(/\s+/g, ' ').trim().length > FIELD_LIMITS.name) fail('STUDIO_FIELD_TOO_LONG');
  if (id === undefined) {
    const item = createItem(studio, { kind, name, fields, origin: 'user' });
    if (links !== undefined) item.links = linkList(studio, item, links);
    return item;
  }
  const item = itemById(studio, id);
  if (!item) fail('STUDIO_ITEM_NOT_FOUND');
  if (item.rev !== rev) fail('STUDIO_ITEM_CONFLICT');
  const next = normalizeFields(item.kind, fields), title = clean(name, FIELD_LIMITS.name);
  if (!title) fail('STUDIO_NAME_REQUIRED');
  if (item.number && next.category !== item.fields.category) fail('STUDIO_CATEGORY_LOCKED');
  // A confirmed record stays complete: emptying a required field needs the confirmation withdrawn first.
  if (item.status === 'confirmed' && fieldsOf(item.kind).some(spec => spec.required && !isFilled(next[spec.key]))) fail('STUDIO_NOT_READY');
  item.name = title; item.fields = next;
  if (links !== undefined) item.links = linkList(studio, item, links);
  touch(item);
  return item;
}
function linkList(studio, item, links) {
  if (!Array.isArray(links)) fail('STUDIO_LINK_INVALID');
  const result = [...new Set(links)].filter(id => id !== item.id && studio.items.some(other => other.id === id));
  if (result.length !== new Set(links).size || result.length > STUDIO_LIMITS.links) fail('STUDIO_LINK_INVALID');
  return result;
}

export function decideProposal(studio, id, accept) {
  const index = studio.proposals.findIndex(proposal => proposal.id === id);
  if (index < 0) fail('STUDIO_PROPOSAL_NOT_FOUND');
  const [proposal] = studio.proposals.splice(index, 1), item = itemById(studio, proposal.itemId);
  if (!accept || !item) return item;
  item.fields = mergeFieldsAdditive(item.kind, item.fields, proposal.fields).fields;
  addEvidence(item, proposal.evidence); touch(item);
  return item;
}
/**
 * Where a person's answer goes on a record: its list of details or rules, or
 * its note when the record has no such list or the list is full. Returns what
 * to change, or null when neither can hold the answer whole.
 */
function withAnswer(item, answer) {
  const spec = fieldsOf(item.kind).find(entry => entry.key === 'details' || entry.key === 'rules');
  const list = spec ? normalizeField(spec, [...item.fields[spec.key], answer]) : [];
  if (list.includes(answer)) return { fields: { ...item.fields, [spec.key]: list } };
  const note = clean([item.note, answer].filter(Boolean).join(' / '), FIELD_LIMITS.text);
  return note.endsWith(answer) ? { note } : null;
}
/**
 * Closes an issue with a person's decision. `adopt` puts the new statement in
 * place of the one it contradicts when that statement is still there, and adds
 * it otherwise. A question is closed with the person's answer, or dismissed;
 * the questions grouped with it ask the same thing and close with it, and the
 * answer is added once to every record they are attached to. Several questions
 * close only when `group` names exactly them: a person decides about the
 * questions that were on screen, not about one that joined the group since.
 */
export function resolveIssue(studio, id, { choice, note, group }) {
  const issue = studio.issues.find(entry => entry.id === id && entry.open);
  if (!issue) fail('STUDIO_ISSUE_NOT_FOUND');
  const item = itemById(studio, issue.itemId), answer = clean(note, FIELD_LIMITS.listItem);
  if (issue.kind === 'question') {
    const members = questionGroup(studio, issue);
    if ((members.length > 1 || group !== undefined) && !(Array.isArray(group) && same([...group].sort(), members.map(entry => entry.id).sort()))) fail('STUDIO_GROUP_CHANGED');
    // A question is the model's; a person may close it without an answer and the record stays as it is.
    if (choice !== 'dismiss' && !answer) fail('STUDIO_ANSWER_REQUIRED');
    // Every record is checked before any is changed: an answer that one of them cannot hold whole closes nothing.
    const written = choice === 'dismiss' ? [] : [...new Set(members.map(entry => entry.itemId))].map(itemId => {
      const target = itemById(studio, itemId), next = withAnswer(target, answer);
      if (!next) fail('STUDIO_ANSWER_NO_ROOM');
      return [target, next];
    });
    for (const [target, next] of written) { Object.assign(target, next); touch(target); }
    for (const entry of members) { entry.resolution = choice === 'dismiss' ? '답하지 않고 닫음' : answer; entry.open = 0; }
  } else {
    if (!['keep', 'adopt'].includes(choice)) fail('STUDIO_CHOICE_INVALID');
    if (choice === 'adopt') {
      const spec = fieldsOf(item.kind).find(entry => entry.key === issue.field && entry.key !== 'category'), rows = spec?.type === 'rows' ? issue.fields?.[spec.key] ?? [] : [];
      // A note offers another wording for the field: the person takes it whatever the field holds by now. A conflict replaces only the statement it quoted.
      if (spec && issue.incoming && spec.type === 'text' && (issue.kind === 'variant' || item.fields[spec.key] === issue.existing)) item.fields[spec.key] = normalizeField(spec, issue.incoming);
      else if (spec && issue.incoming && spec.type === 'list' && item.fields[spec.key].includes(issue.existing)) item.fields[spec.key] = normalizeField(spec, item.fields[spec.key].map(entry => entry === issue.existing ? issue.incoming : entry));
      // A table row is replaced by the row of the same key from the new document; rows it does not name stay.
      else if (rows.length) item.fields[spec.key] = normalizeField(spec, [...item.fields[spec.key].map(row => rows.find(entry => rowKey(spec, entry) === rowKey(spec, row)) ?? row), ...rows.filter(entry => !item.fields[spec.key].some(row => rowKey(spec, row) === rowKey(spec, entry)))]);
      else item.fields = mergeFieldsAdditive(item.kind, item.fields, issue.fields ?? {}).fields;
      addEvidence(item, issue.evidence); touch(item);
    }
    issue.resolution = clean([choice === 'adopt' ? '새 문서의 내용을 반영' : '기존 내용 유지', answer].filter(Boolean).join(' — '), FIELD_LIMITS.text);
  }
  issue.open = 0;
  return item;
}

/**
 * Trace between records: items of another kind that cite the same clause, plus
 * links a person set in either direction. Items of a deliverable that is
 * switched off and retired items are left out. The returned function shares one
 * index, so asking for every item's relations stays linear in the store.
 */
export function createRelations(studio) {
  const visible = item => item.status !== 'retired' && (item.kind === REQUIREMENT_KIND || studio.enabled.includes(item.kind));
  const byClause = new Map(), linkedTo = new Map(), byId = new Map(), order = new Map();
  studio.items.forEach((item, index) => { order.set(item.id, index); if (visible(item)) byId.set(item.id, item); });
  for (const item of byId.values()) {
    for (const entry of item.evidence) { const key = clauseKey(entry.s, entry.c); if (!byClause.has(key)) byClause.set(key, []); byClause.get(key).push(item); }
    for (const id of item.links ?? []) { if (!linkedTo.has(id)) linkedTo.set(id, []); linkedTo.get(id).push(item.id); }
  }
  return item => {
    const ids = new Set([...(item.links ?? []), ...(linkedTo.get(item.id) ?? [])]);
    for (const entry of item.evidence) for (const other of byClause.get(clauseKey(entry.s, entry.c)) ?? []) if (other.kind !== item.kind) ids.add(other.id);
    ids.delete(item.id);
    return [...ids].filter(id => byId.has(id)).sort((left, right) => order.get(left) - order.get(right)).map(id => byId.get(id));
  };
}
export const relatedItems = (studio, item) => createRelations(studio)(item);

/** Name comparison that ignores spacing, case and width. */
export const label = value => String(value ?? '').normalize('NFKC').replace(/\s+/g, '').toLowerCase();
/** Cross-deliverable checks. These are rules over the stored items; no model call is involved. */
export function crossChecks(studio) {
  const result = {}, add = (type, text) => { (result[type] ??= []).push(text); }, related = createRelations(studio);
  const live = type => studio.items.filter(item => item.kind === type && item.status !== 'retired');
  const enabled = type => studio.enabled.includes(type);
  const names = type => new Set(live(type).map(item => label(item.name)));
  const functional = studio.items.filter(item => item.kind === REQUIREMENT_KIND && item.status === 'confirmed' && item.fields.category === 'SFR');
  for (const type of ['function-tree', 'screen-def']) {
    if (!enabled(type)) continue;
    for (const requirement of functional) if (!related(requirement).some(item => item.kind === type)) add(type, `확정된 기능 요구사항 ${requirement.number} ‘${requirement.name}’에 연결된 ${type === 'screen-def' ? '화면' : '기능'}이 없습니다.`);
  }
  for (const type of ['function-tree', 'menu-tree']) if (enabled(type)) {
    const known = names(type);
    for (const item of live(type)) if (item.fields.parent && !known.has(label(item.fields.parent))) add(type, `‘${item.name}’의 상위 ‘${item.fields.parent}’이 목록에 없습니다.`);
  }
  if (enabled('process-def') && enabled('entity-def')) {
    const entities = names('entity-def'), usage = live('process-def').flatMap(item => item.fields.entityUsage.map(row => ({ process: item.name, entity: label(row.entity), raw: row.entity, usage: row.usage.toUpperCase() })));
    for (const row of usage) if (!entities.has(row.entity)) add('process-def', `프로세스 ‘${row.process}’이 쓰는 엔터티 ‘${row.raw}’가 엔터티정의서에 없습니다.`);
    if (live('process-def').length) for (const entity of live('entity-def')) if (!usage.some(row => row.entity === label(entity.name) && row.usage.includes('C'))) add('entity-def', `엔터티 ‘${entity.name}’을 생성(C)하는 프로세스가 없습니다.`);
  }
  if (enabled('menu-tree') && enabled('screen-def')) { const screens = names('screen-def'); for (const menu of live('menu-tree')) if (menu.fields.screen && !screens.has(label(menu.fields.screen))) add('menu-tree', `메뉴 ‘${menu.name}’이 여는 화면 ‘${menu.fields.screen}’이 화면설계서에 없습니다.`); }
  if (enabled('table-def') && enabled('entity-def')) { const entities = names('entity-def'); for (const table of live('table-def')) if (table.fields.entity && !entities.has(label(table.fields.entity))) add('table-def', `테이블 ‘${table.name}’의 대응 엔터티 ‘${table.fields.entity}’가 엔터티정의서에 없습니다.`); }
  return result;
}

/** The confirmed records a baseline freezes. The caller archives this and records the reference. */
export function baselineContent(studio) {
  return studio.items.filter(item => item.status === 'confirmed').map(item => ({ id: item.id, kind: item.kind, number: item.number, name: item.name, fields: item.fields, evidence: item.evidence }));
}
export function recordBaseline(studio, { name, ref, now }) {
  const title = clean(name, 120);
  if (!title) fail('STUDIO_NAME_REQUIRED');
  if (studio.baselines.length >= STUDIO_LIMITS.baselines) fail('STUDIO_CAPACITY');
  const included = studio.items.filter(item => item.status === 'confirmed');
  if (!included.some(item => item.kind === REQUIREMENT_KIND)) fail('STUDIO_BASELINE_EMPTY');
  const id = `BL-${studio.baselines.length + 1}`, counts = {};
  for (const item of included) { item.baseline = id; delete item.changed; counts[item.kind] = (counts[item.kind] ?? 0) + 1; }
  studio.baselines.push({ id, name: title, createdAt: now, ref, counts });
  return id;
}

/** Stories whose requirement is no longer a confirmed development requirement. They are removed the next time the plan is updated. */
export function orphanStories(studio) {
  return (studio.plan?.stories ?? []).filter(story => { const item = itemById(studio, story.reqId); return !item || item.status !== 'confirmed' || !DEVELOPMENT_CATEGORIES.includes(item.fields.category); });
}
export function removeOrphanStories(studio, now) {
  const orphans = new Set(orphanStories(studio).map(story => story.id));
  if (orphans.size) { studio.plan.stories = studio.plan.stories.filter(story => !orphans.has(story.id)); studio.plan.updatedAt = now; }
  return orphans.size;
}
/** Confirmed development requirements that have no stories yet or whose meaning changed since their stories were written. */
export function planTargets(studio) {
  const stories = studio.plan?.stories ?? [];
  return studio.items.filter(item => item.kind === REQUIREMENT_KIND && item.status === 'confirmed' && DEVELOPMENT_CATEGORIES.includes(item.fields.category))
    .filter(item => { const own = stories.filter(story => story.reqId === item.id); return !own.length || own.some(story => story.hash !== meaningHash(item)); });
}
export function applyStories(studio, requirementIds, drafts, now) {
  studio.plan ??= { epics: [], stories: [], updatedAt: now };
  const plan = studio.plan, wanted = new Set(requirementIds), written = new Set();
  const lines = (values, limit) => [...new Set((Array.isArray(values) ? values : []).map(value => clean(value, FIELD_LIMITS.listItem)).filter(Boolean))].slice(0, limit);
  const fresh = [];
  for (const draft of Array.isArray(drafts) ? drafts : []) {
    const requirement = itemById(studio, draft?.requirement), title = clean(draft?.title, FIELD_LIMITS.name), green = lines(draft?.green, 8), red = lines(draft?.red, 4);
    if (!requirement || !wanted.has(requirement.id) || !title || !green.length || !red.length) continue;
    const epicName = clean(draft.epicName, FIELD_LIMITS.name);
    let epic = plan.epics.find(entry => entry.id === draft.epic) ?? plan.epics.find(entry => epicName && label(entry.name) === label(epicName));
    if (!epic) {
      if (!epicName || plan.epics.length >= STUDIO_LIMITS.epics) continue;
      epic = { id: nextId(studio, 'EP', 2), name: epicName }; plan.epics.push(epic);
    }
    fresh.push({ epicId: epic.id, reqId: requirement.id, title, role: clean(draft.role, FIELD_LIMITS.name) || '사용자', want: clean(draft.want, FIELD_LIMITS.text) || requirement.fields.definition, green, red, hash: meaningHash(requirement) });
    written.add(requirement.id);
  }
  // Replace a requirement's stories only when the reply covers it; an omitted requirement keeps what it had.
  plan.stories = plan.stories.filter(story => !written.has(story.reqId));
  if (plan.stories.length + fresh.length > STUDIO_LIMITS.stories) fail('STUDIO_CAPACITY');
  for (const story of fresh) plan.stories.push({ id: nextId(studio, 'ST'), ...story });
  plan.updatedAt = now;
  return { written: [...written], missing: requirementIds.filter(id => !written.has(id)) };
}

export function startJob(studio, { kind, now, target, promptVersion }) {
  const job = { id: nextId(studio, 'JOB'), kind, status: 'running', startedAt: now, stage: '준비', done: 0, total: 0, calls: 0, requestBytes: 0, maxRequestBytes: 0, outputBytes: 0, inputTokens: 0, outputTokens: 0, failures: 0, summary: {}, promptVersion, ...(target ? { target } : {}) };
  studio.jobs.push(job);
  while (studio.jobs.length > STUDIO_LIMITS.jobs) studio.jobs.shift();
  return job;
}
