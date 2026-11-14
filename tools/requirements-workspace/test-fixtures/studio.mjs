// Rule-based stand-in for the model in item store tests. Synthetic clauses carry
// their own markers, so the replies are a pure function of the request:
//   [SFR:시설 예약 신청] …   a requirement candidate of that class and name
//   <entity-def:예약> …      relates the clause to a deliverable and names its item
//   속성(예약번호, 이용 일시)  attributes of an entity item
//   (미정) …                 raises a question on the candidate
//   (미결:결제 수단) …        raises the same open point on whatever the clause yields
export const STUDIO_MODEL = 'claude-opus-5-5';
const requirementMark = /\[([A-Z]{3}):([^\]]+)\]/, artifactMark = /<([a-z-]+):([^>]+)>/g, openMark = /\(미결:([^)]+)\)/;
const strip = text => text.replace(requirementMark, '').replace(artifactMark, '').replace(openMark, '').replace(/속성\([^)]*\)/, '').trim();
const label = value => String(value).replace(/\s+/g, '').toLowerCase();
const openPoint = text => { const mark = text.match(openMark); return mark ? [`${mark[1]}이 정해지지 않았습니다. 어떻게 정합니까?`] : []; };

export function classifyReply(request) {
  const clauses = [], candidates = [];
  for (const clause of request.data.clauses) {
    const requirement = clause.text.match(requirementMark), artifacts = [...clause.text.matchAll(artifactMark)].map(match => match[1]);
    clauses.push({ n: clause.n, requirement: Boolean(requirement), artifacts });
    if (requirement) candidates.push({ category: requirement[1], name: requirement[2], definition: strip(clause.text), details: [strip(clause.text)], outputs: [], verification: '', clauses: [clause.n], questions: [...(clause.text.includes('(미정)') ? [`${requirement[2]}의 미정 사항을 결정해 주세요.`] : []), ...openPoint(clause.text)] });
  }
  return { clauses, candidates };
}
export function extractReply(request) {
  const items = [];
  for (const clause of request.data.clauses) for (const match of clause.text.matchAll(artifactMark)) {
    if (match[1] !== request.data.artifact.id) continue;
    const attributes = clause.text.match(/속성\(([^)]*)\)/)?.[1].split(',').map(name => ({ name: name.trim(), description: '', type: '', required: '' })) ?? [];
    items.push({ name: match[2], fields: { description: strip(clause.text), ...(match[1] === 'entity-def' && attributes.length ? { attributes } : {}) }, clauses: [clause.n], questions: openPoint(clause.text) });
  }
  return { items };
}
/** A question repeats an earlier one when the two read the same. Tests that need another judgement pass their own `studio-group`. */
export function groupReply(request) {
  const texts = new Map(request.data.existing.map(question => [question.id, label(question.text)]));
  return { decisions: request.data.questions.map(question => ({ k: question.k, same: question.near.find(id => texts.get(id) === label(question.text)) ?? '' })) };
}
/** Same name means the same thing; anything else is new. Tests that need a conflict pass their own `merge`. */
export function mergeReply(request) {
  const names = new Map(request.data.existing.map(item => [label(item.name), item.id]));
  return { decisions: request.data.candidates.map(candidate => { const target = candidate.near.find(id => names.get(label(candidate.name)) === id); return { k: candidate.k, action: target ? 'same' : 'new', target: target ?? '', field: '', existing: '', incoming: '', note: '' }; }) };
}
export function enrichReply(request, schema) {
  const fields = {}, properties = schema.properties.fields.properties, source = request.data.clauses[0]?.text ?? '';
  for (const key of request.data.missing) {
    const shape = properties[key];
    if (!source.includes('보강 근거')) continue;
    if (shape.type === 'string') fields[key] = shape.enum ? shape.enum[1] : `보강한 ${key}`;
    else if (shape.items.type === 'string') fields[key] = [`보강한 ${key}`];
    else fields[key] = [{ [shape.items.required[0]]: `보강한 ${key}` }];
  }
  return { fields, clauses: Object.keys(fields).length ? [1] : [], question: Object.keys(fields).length ? '' : '등록한 문서에서 찾지 못했습니다. 직접 알려 주세요.' };
}
export function planReply(request) {
  return { stories: request.data.requirements.map(requirement => ({ requirement: requirement.id, epic: request.data.epics[0]?.id ?? '', epicName: request.data.epics.length ? '' : '예약 업무', title: requirement.name, role: '시민', want: requirement.definition, green: requirement.details.length ? requirement.details : [requirement.definition], red: ['권한이 없는 사용자는 이 기능을 쓸 수 없다.'] })) };
}

/**
 * Builds a runner. `overrides` replaces the reply of a phase; `seen` receives
 * every request with its size so tests can assert what was sent.
 */
export function studioRunner({ overrides = {}, seen = [] } = {}) {
  const replies = { 'studio-classify': classifyReply, 'studio-extract': extractReply, 'studio-merge': mergeReply, 'studio-group': groupReply, 'studio-enrich': enrichReply, 'studio-plan': planReply, ...overrides };
  return async ({ request, schema, signal }) => {
    if (signal?.aborted) throw Object.assign(new Error('AI_CANCELLED'), { code: 'AI_CANCELLED' });
    seen.push({ phase: request.phase, bytes: Buffer.byteLength(JSON.stringify(request)), request });
    if (!replies[request.phase]) throw Object.assign(new Error('AI_CLI_FAILED'), { code: 'AI_CLI_FAILED' });
    const output = await replies[request.phase](request, schema, signal);
    return { output, model: STUDIO_MODEL, effort: 'high', usage: { inputTokens: 10, outputTokens: 5 } };
  };
}
export const clause = (id, text, locator = `${id} 위치`) => ({ id, text, locator, disposition: 'question', requirementIds: [], rationale: '합성 자료' });
export const sourceOf = (id, title, clauses) => ({ id, title, sourceType: 'rfp', classification: 'internal', locator: title, clauses });
export const CONSENT = { consent: true, model: STUDIO_MODEL, sensitivityAcknowledged: true };
