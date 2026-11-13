// Documents of the item store (ADR-0055). A document is assembled from the
// stored items every time it is asked for; the model never writes a whole
// document, so a document's length never becomes a model request.
import { ARTIFACT_TYPES, DERIVED_DOCUMENTS, REQUIREMENT_CATEGORIES, REQUIREMENT_KIND, artifactType, fieldText, fieldsOf, isFilled, kindName } from './studio-catalog.mjs';
import { DEVELOPMENT_CATEGORIES, QUALITY_CATEGORIES, clauseKey, createRelations, itemById, itemScore, label, meaningHash, missingFields, openIssues } from './studio-model.mjs';

const fail = code => { throw Object.assign(new Error(code), { code }); };
const cell = value => String(value ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>').trim() || '-';
const table = (headers, rows) => [`| ${headers.map(cell).join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map(row => `| ${row.map(cell).join(' | ')} |`)].join('\n');
// A leading =, +, - or @ would run as a formula when the sheet is opened.
const csvCell = value => { const text = String(value ?? ''); const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text; return `"${safe.replace(/"/g, '""')}"`; };
const csv = (headers, rows) => `﻿${[headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
const statusName = item => item.status === 'confirmed' ? '확정' : item.status === 'retired' ? '제외' : '초안';
const live = (studio, kind) => studio.items.filter(item => item.kind === kind && item.status !== 'retired');
const quoted = value => `"${String(value ?? '').replace(/["\r\n]/g, ' ').replace(/\s+/g, ' ').trim()}"`;

/** Where an item's evidence points: document title and clause position, flagged when the clause text changed or is gone. */
export function describeEvidence(evidence, clauses) {
  return evidence.map(entry => {
    const clause = clauses.get(clauseKey(entry.s, entry.c));
    return clause ? { s: entry.s, c: entry.c, title: clause.title, at: clause.locator, excerpt: clause.text.slice(0, 240), stale: clause.hash !== entry.h } : { s: entry.s, c: entry.c, title: entry.s, at: entry.c, excerpt: '', stale: true };
  });
}
const sourceLines = (item, clauses) => item.evidence.length ? describeEvidence(item.evidence, clauses).map(entry => `${entry.title} ${entry.at}`.trim()) : ['직접 작성'];
const requirementNumber = item => item.number ?? `${item.id}(초안)`;
function head(title, context, lines = []) {
  return [`# ${title}`, '', `- 사업: ${context.project?.name || '(프로젝트 이름 없음)'}`, `- 작성 기준: ${context.now}`, ...lines.map(line => `- ${line}`), ''];
}
const byNumber = (left, right) => (left.number ?? left.id).localeCompare(right.number ?? right.id, 'en', { numeric: true });

function requirementsDocument(studio, context) {
  const confirmed = live(studio, REQUIREMENT_KIND).filter(item => item.status === 'confirmed').sort(byNumber), drafts = live(studio, REQUIREMENT_KIND).length - confirmed.length;
  const baseline = studio.baselines.at(-1);
  const lines = head('요구사항정의서', context, [`기준선: ${baseline ? `${baseline.id} ${baseline.name} (${baseline.createdAt})` : '없음'}`, `확정 요구사항 ${confirmed.length}건${drafts ? ` · 초안 ${drafts}건은 싣지 않음` : ''}`]);
  lines.push('## 요구사항 목록', '', table(['고유번호', '분류', '명칭', '기준선'], confirmed.map(item => [item.number, REQUIREMENT_CATEGORIES.find(category => category.code === item.fields.category)?.name, item.name, item.baseline ? `${item.baseline}${item.changed ? ' 이후 변경' : ''}` : '기준선 밖'])), '');
  for (const category of REQUIREMENT_CATEGORIES) {
    const group = confirmed.filter(item => item.fields.category === category.code);
    if (!group.length) continue;
    lines.push(`## ${category.name} (${category.code})`, '');
    for (const item of group) {
      const related = context.related(item).filter(other => other.kind === REQUIREMENT_KIND).map(requirementNumber);
      lines.push(`### ${item.number} ${item.name}`, '', table(['항목', '내용'], [
        ['요구사항 고유번호', item.number], ['요구사항 명칭', item.name], ['요구사항 분류', `${category.name} (${category.code})`],
        ['요구사항 상세설명 · 정의', item.fields.definition], ['요구사항 상세설명 · 세부 내용', item.fields.details.map(detail => `- ${detail}`).join('\n')],
        ['산출 정보', item.fields.outputs.join(', ')], ['제약·전제', item.fields.constraints.join('\n')], ['검증 방법·기준', item.fields.verification], ['중요도', item.fields.priority],
        ['관련 요구사항', related.join(', ')], ['요구사항 출처', sourceLines(item, context.clauses).join('\n')],
      ]), '');
    }
  }
  return lines.join('\n');
}
function requirementsSheet(studio, context) {
  return csv(['고유번호', '분류', '명칭', '정의', '세부 내용', '산출 정보', '검증 방법·기준', '관련 요구사항', '출처', '상태', '기준선'], live(studio, REQUIREMENT_KIND).sort(byNumber).map(item => [
    item.number ?? '', item.fields.category, item.name, item.fields.definition, item.fields.details.join('\n'), item.fields.outputs.join('\n'), item.fields.verification,
    context.related(item).filter(other => other.kind === REQUIREMENT_KIND).map(requirementNumber).join(', '), sourceLines(item, context.clauses).join('\n'), statusName(item), item.baseline ?? '']));
}
/** Requirement to source, deliverables and stories. An empty cell is a link that does not exist yet. */
function traceRows(studio, context) {
  const types = ARTIFACT_TYPES.filter(type => studio.enabled.includes(type.id));
  const rows = live(studio, REQUIREMENT_KIND).filter(item => item.status === 'confirmed').sort(byNumber).map(item => {
    const related = context.related(item), stories = (studio.plan?.stories ?? []).filter(story => story.reqId === item.id);
    const scope = DEVELOPMENT_CATEGORIES.includes(item.fields.category) ? stories.map(story => story.id).join(', ') : QUALITY_CATEGORIES.includes(item.fields.category) ? '품질 기준(전체 스토리)' : '개발 범위 밖';
    return [item.number, item.name, [...new Set(describeEvidence(item.evidence, context.clauses).map(entry => entry.title))].join('\n') || '직접 작성',
      ...types.map(type => related.filter(other => other.kind === type.id).map(other => other.name).join(', ')), scope];
  });
  return { headers: ['고유번호', '요구사항', '출처 문서', ...types.map(type => type.name), '스토리'], rows };
}
function artifactDocument(studio, context, type) {
  const items = live(studio, type.id), scores = items.map(item => itemScore(studio, item));
  const lines = head(type.name, context, [`${type.phase} 단계 산출물`, `${type.noun} ${items.length}건 · 확정 ${items.filter(item => item.status === 'confirmed').length}건 · 평균 완성도 ${items.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / items.length) : 0}%`]);
  lines.push(`## 1. ${type.noun} 목록`, '', table(['번호', type.noun, '설명', '관련 요구사항', '상태'], items.map((item, index) => [index + 1, item.name, item.fields.description,
    context.related(item).filter(other => other.kind === REQUIREMENT_KIND).map(requirementNumber).join(', '), `${statusName(item)}${missingFields(item).length ? ` · 빈칸 ${missingFields(item).length}` : ''}`])), '');
  if (type.id === 'function-tree' || type.id === 'menu-tree') lines.push('## 구조', '', ...tree(items), '');
  if (type.id === 'business-flow') for (const item of items.filter(entry => entry.fields.steps.length)) lines.push(`## 흐름도 — ${item.name}`, '', '```mermaid', 'flowchart TD', ...item.fields.steps.map((step, index, steps) => `  S${index + 1}[${quoted(`${step.actor ? `${step.actor}: ` : ''}${step.activity || step.order}`)}]${index + 1 < steps.length ? ` --> S${index + 2}` : ''}`), '```', '');
  lines.push(`## 2. ${type.noun}별 정의`, '');
  for (const item of items) {
    lines.push(`### ${item.name}`, '');
    const rows = [];
    for (const spec of fieldsOf(type.id)) if (spec.type !== 'rows') rows.push([spec.label, spec.type === 'list' ? item.fields[spec.key].join('\n') : item.fields[spec.key]]);
    rows.push(['관련 요구사항', context.related(item).filter(other => other.kind === REQUIREMENT_KIND).map(other => `${requirementNumber(other)} ${other.name}`).join('\n')], ['출처', sourceLines(item, context.clauses).join('\n')], ['상태', statusName(item)]);
    lines.push(table(['항목', '내용'], rows), '');
    for (const spec of fieldsOf(type.id)) if (spec.type === 'rows') lines.push(`**${spec.label}**`, '', isFilled(item.fields[spec.key]) ? table(spec.columns.map(([, name]) => name), item.fields[spec.key].map(row => spec.columns.map(([key]) => row[key]))) : '(비어 있음)', '');
    for (const issue of openIssues(studio, item.id)) lines.push(`> 미결: ${issue.text}`, '');
  }
  return lines.join('\n');
}
function tree(items) {
  const names = new Set(items.map(item => label(item.name))), lines = [], seen = new Set();
  const walk = (parent, depth) => { for (const item of items.filter(entry => label(entry.fields.parent) === parent)) { if (seen.has(item.id) || depth > 8) continue; seen.add(item.id); lines.push(`${'  '.repeat(depth)}- ${item.name}`); walk(label(item.name), depth + 1); } };
  // Roots are items without a parent, or whose parent is not in the list.
  for (const item of items) if (!item.fields.parent || !names.has(label(item.fields.parent))) { if (seen.has(item.id)) continue; seen.add(item.id); lines.push(`- ${item.name}`); walk(label(item.name), 1); }
  return lines.length ? lines : ['(항목 없음)'];
}
function attributeDocument(studio, context) {
  const entities = live(studio, 'entity-def');
  return [...head('속성정의서', context, ['엔터티정의서의 속성에서 만든 문서']), table(['엔터티', '속성명', '설명', '유형·길이', '필수', '식별자'], entities.flatMap(entity => entity.fields.attributes.length
    ? entity.fields.attributes.map(attribute => [entity.name, attribute.name, attribute.description, attribute.type, attribute.required, label(attribute.name) === label(entity.fields.identifier) ? '예' : ''])
    : [[entity.name, '(속성 없음)', '', '', '', '']])), ''].join('\n');
}
function erdDocument(studio, context) {
  const entities = live(studio, 'entity-def'), ids = new Map(entities.map((entity, index) => [label(entity.name), `E${index + 1}`]));
  const marks = cardinality => /n\s*:\s*m|m\s*:\s*n|다\s*:\s*다/i.test(cardinality) ? '}o--o{' : /1\s*:\s*1/.test(cardinality) ? '||--||' : /n\s*:\s*1|다\s*:\s*1/i.test(cardinality) ? '}o--||' : '||--o{';
  const lines = [...head('논리 ERD', context, ['엔터티정의서의 엔터티와 관계에서 만든 그림 (Mermaid)']), '```mermaid', 'erDiagram'];
  for (const entity of entities) lines.push(`  ${ids.get(label(entity.name))}[${quoted(entity.name)}] {`, ...entity.fields.attributes.slice(0, 20).map((attribute, index) => `    string A${index + 1} ${quoted(attribute.name)}`), '  }');
  for (const entity of entities) for (const relation of entity.fields.relations) { const target = ids.get(label(relation.target)); if (target) lines.push(`  ${ids.get(label(entity.name))} ${marks(relation.cardinality)} ${target} : ${quoted(relation.description || relation.cardinality || '관계')}`); }
  lines.push('```', '');
  return lines.join('\n');
}
function crudDocument(studio, context) {
  const entities = live(studio, 'entity-def'), processes = live(studio, 'process-def');
  const usage = (process, entity) => [...new Set(process.fields.entityUsage.filter(row => label(row.entity) === label(entity.name)).flatMap(row => row.usage.toUpperCase().match(/[CRUD]/g) ?? []))].join('');
  return [...head('CRUD 매트릭스', context, ['프로세스정의서의 엔터티 사용에서 만든 문서']), table(['프로세스 \\ 엔터티', ...entities.map(entity => entity.name)], processes.map(process => [process.name, ...entities.map(entity => usage(process, entity))])), ''].join('\n');
}
function storyLines(studio, context, story) {
  const requirement = itemById(studio, story.reqId), epic = studio.plan.epics.find(entry => entry.id === story.epicId);
  const lines = [`# ${story.id} ${story.title}`, '', `- 에픽: ${epic?.name ?? '-'}`, `- 요구사항: ${requirement ? `${requirementNumber(requirement)} ${requirement.name}` : story.reqId}`];
  if (requirement && story.hash !== meaningHash(requirement)) lines.push('- 주의: 이 스토리를 쓴 뒤 요구사항이 바뀌었습니다. 스토리를 다시 만드세요.');
  lines.push('', '## 사용자 스토리', '', `- 사용자: ${story.role}`, `- 하려는 일: ${story.want}`, '', '## 인수조건', '', ...story.green.map((line, index) => `- [통과 ${index + 1}] ${line}`), ...story.red.map((line, index) => `- [차단 ${index + 1}] ${line}`), '');
  if (!requirement) return lines;
  lines.push('## 요구사항', '', table(['항목', '내용'], [['정의', requirement.fields.definition], ['세부 내용', requirement.fields.details.map(detail => `- ${detail}`).join('\n')], ['제약·전제', requirement.fields.constraints.join('\n')], ['검증 방법·기준', requirement.fields.verification], ['출처', sourceLines(requirement, context.clauses).join('\n')]]), '', '## 관련 산출물', '');
  const related = context.related(requirement).filter(item => item.kind !== REQUIREMENT_KIND);
  if (!related.length) lines.push('(연결된 산출물 항목 없음)', '');
  for (const item of related) lines.push(`### ${kindName(item.kind)} · ${item.name}`, '', ...fieldsOf(item.kind).filter(spec => isFilled(item.fields[spec.key])).map(spec => `- ${spec.label}: ${fieldText(spec, item.fields[spec.key])}`), '');
  const quality = live(studio, REQUIREMENT_KIND).filter(item => item.status === 'confirmed' && QUALITY_CATEGORIES.includes(item.fields.category)).sort(byNumber);
  lines.push('## 함께 지킬 품질 기준', '', ...(quality.length ? quality.map(item => `- ${item.number} ${item.name}: ${[item.fields.definition, ...item.fields.details].join(' ')}`) : ['(확정된 성능·보안·품질·제약 요구사항 없음)']), '');
  return lines;
}
function storiesDocument(studio, context) {
  const plan = studio.plan, lines = head('에픽·스토리', context, [`에픽 ${plan.epics.length}개 · 스토리 ${plan.stories.length}건`]);
  for (const epic of plan.epics) {
    const stories = plan.stories.filter(story => story.epicId === epic.id);
    if (!stories.length) continue;
    lines.push(`## ${epic.id} ${epic.name}`, '', table(['스토리', '제목', '요구사항', '사용자', '인수조건'], stories.map(story => [story.id, story.title, requirementNumber(itemById(studio, story.reqId) ?? { id: story.reqId }), story.role, `통과 ${story.green.length} · 차단 ${story.red.length}`])), '');
  }
  return lines.join('\n');
}

/** Documents that can be produced now, in the order the screens list them. */
export function documentList(studio) {
  const list = [{ id: 'requirements', name: '요구사항정의서', format: 'md' }, { id: 'requirements-sheet', name: '요구사항 목록', format: 'csv' }, { id: 'rtm', name: '요구사항추적표', format: 'csv' }];
  for (const type of ARTIFACT_TYPES) {
    if (!studio.enabled.includes(type.id)) continue;
    list.push({ id: type.id, name: type.name, format: 'md' });
    for (const derived of DERIVED_DOCUMENTS) if (derived.from[0] === type.id && derived.from.every(id => studio.enabled.includes(id)) && !['requirements', 'rtm'].includes(derived.id)) list.push({ id: derived.id, name: derived.name, format: 'md' });
  }
  if (studio.plan?.stories.length) list.push({ id: 'stories', name: '에픽·스토리', format: 'md' });
  return list;
}
/** `input` is `{ project, clauses, now }`. Returns `{ filename, content, type }`. */
export function renderDocument(studio, id, input) {
  const context = { ...input, related: createRelations(studio) };
  const markdown = (name, content) => ({ filename: `${name}.md`, content, type: 'text/markdown;charset=utf-8' });
  const sheet = (name, content) => ({ filename: `${name}.csv`, content, type: 'text/csv;charset=utf-8' });
  if (typeof id === 'string' && id.startsWith('package-')) {
    const story = studio.plan?.stories.find(entry => entry.id === id.slice('package-'.length));
    if (!story) fail('STUDIO_DOCUMENT_NOT_FOUND');
    return markdown(`개발패키지-${story.id}`, storyLines(studio, context, story).join('\n'));
  }
  const entry = documentList(studio).find(document => document.id === id);
  if (!entry) fail('STUDIO_DOCUMENT_NOT_FOUND');
  if (id === 'requirements') return markdown(entry.name, requirementsDocument(studio, context));
  if (id === 'requirements-sheet') return sheet('요구사항목록', requirementsSheet(studio, context));
  if (id === 'rtm') { const trace = traceRows(studio, context); return sheet(entry.name, csv(trace.headers, trace.rows)); }
  if (id === 'attribute-def') return markdown(entry.name, attributeDocument(studio, context));
  if (id === 'erd') return markdown('논리ERD', erdDocument(studio, context));
  if (id === 'crud-matrix') return markdown('CRUD매트릭스', crudDocument(studio, context));
  if (id === 'stories') return markdown('에픽스토리', storiesDocument(studio, context));
  return markdown(entry.name, artifactDocument(studio, context, artifactType(id)));
}
