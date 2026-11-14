import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ARTIFACT_TYPES, FIELD_LIMITS, fieldConflicts, fieldsOf, mergeFieldsAdditive, normalizeFields, overflowingFields } from './studio-catalog.mjs';
import { createIndex, similarity, tokens } from './studio-index.mjs';
import { STUDIO_LIMITS, addCandidate, applyStories, applyTag, clauseMap, createItem, crossChecks, decideProposal, demoteProgramConflicts, failTag, groupQuestion, initialStudio, itemReady, openIssues, openVariants, raiseQuestions, orphanStories, pendingWork, planTargets, questionGroup, relatedItems, removeOrphanStories, resolveIssue, saveItem, setItemStatus, settleCandidate, splitQuestion, standsAlone, validateStudio, variantCurrent } from './studio-model.mjs';
import { describeEvidence, documentList, renderDocument } from './studio-render.mjs';
import { CLAUSE_BATCH, REQUEST_LIMIT, batchClauses, classifyRequest, enrichRequest, extractRequest, fitted, groupRequest, mergeRequest, planRequest, readClassify, readEnrich, readExtract, readGroup, readMerge } from './studio-tasks.mjs';
import { clause, sourceOf } from './test-fixtures/studio.mjs';

const NOW = '2026-11-13T00:00:00.000Z';
const backlog = { sources: [sourceOf('SRC-1', '합성 제안요청서', [clause('C-1', '시민은 시설을 예약한다.'), clause('C-2', '예약 정보를 관리한다.'), clause('C-3', '결제는 24시간 안에 한다.')])] };
const clauses = clauseMap(backlog);
const cite = (...ids) => ids.map(id => { const entry = clauses.get(`SRC-1/${id}`); return { s: entry.sourceId, c: entry.clauseId, h: entry.hash }; });
const requirement = (studio, name, details, evidence = cite('C-1'), category = 'SFR') => createItem(studio, { kind: 'requirement', name, fields: { category, definition: `${name}을 제공해야 한다.`, details }, evidence });
const candidate = (studio, name, details, evidence = cite('C-3')) => addCandidate(studio, { kind: 'requirement', name, fields: { category: 'SFR', definition: `${name}을 제공해야 한다.`, details }, evidence, questions: [] });

test('field values are normalised to the catalog and normalising twice changes nothing', () => {
  const long = `${'가나다라마 바사아자차. '.repeat(60)}끝`;
  const fields = normalizeFields('requirement', { category: 'XYZ', definition: `  정의   문장  `, details: [long, long, '', 7], outputs: '문자열', unknown: 'x', priority: '상' });
  assert.deepEqual([fields.category, fields.definition, fields.outputs, fields.priority, 'unknown' in fields], ['', '정의 문장', [], '상', false]);
  // A long entry is kept whole across entries; none of its text is cut away.
  assert.ok(fields.details.length > 1 && fields.details.every(entry => entry.length <= FIELD_LIMITS.listItem));
  assert.equal(fields.details.join(' ').replace(/\s+/g, ''), long.replace(/\s+/g, ''));
  assert.deepEqual(normalizeFields('requirement', fields), fields);
  const rows = normalizeFields('entity-def', { attributes: [{ name: '예약번호', type: '문자', extra: 1 }, { description: '이름 없는 행' }, { name: '예약번호', type: '문자' }, 'x'] });
  assert.deepEqual(rows.attributes, [{ name: '예약번호', description: '', type: '문자', required: '' }]);
  for (const type of ARTIFACT_TYPES) assert.deepEqual(normalizeFields(type.id, normalizeFields(type.id, {})), normalizeFields(type.id, {}));
});

test('an additive merge fills empty text and adds entries, and never replaces what is there', () => {
  const current = normalizeFields('entity-def', { description: '사람이 쓴 설명', attributes: [{ name: '예약번호', type: '문자' }] });
  const merged = mergeFieldsAdditive('entity-def', current, { description: 'AI가 쓴 다른 설명', identifier: '예약번호', attributes: [{ name: '예약번호', type: '숫자' }, { name: '이용 일시' }] });
  assert.equal(merged.fields.description, '사람이 쓴 설명');
  assert.equal(merged.fields.identifier, '예약번호');
  assert.deepEqual(merged.fields.attributes.map(row => [row.name, row.type]), [['예약번호', '문자'], ['이용 일시', '']]);
  assert.deepEqual(merged.changed, ['identifier', 'attributes']);
  assert.deepEqual(merged.added, { identifier: '예약번호', attributes: [{ name: '이용 일시', description: '', type: '', required: '' }] });
  assert.deepEqual(mergeFieldsAdditive('entity-def', merged.fields, { attributes: [{ name: '이용 일시' }] }).changed, []);
});

test('lexical search matches Korean words through their particles and keeps unrelated text out', () => {
  assert.deepEqual(tokens('회원을 관리'), ['회원', '원을', '관리']);
  const index = createIndex([{ id: 'A', parts: [['회원 정보 관리', 3], ['회원의 이름과 연락처를 관리한다', 1]] }, { id: 'B', parts: [['결제 대사 배치', 3], ['전날 결제 내역을 비교한다', 1]] }]);
  assert.deepEqual(index.search([['회원을 관리한다', 1]]).map(hit => hit.id), ['A']);
  assert.deepEqual(index.search([['통계 화면', 1]]), []);
  assert.ok(similarity([['시설 예약', 1]], [['공공시설 예약 신청', 1]]) >= 0.5);
  assert.ok(similarity([['시설 예약', 1]], [['결제 대사', 1]]) < 0.1);
});

test('stored state must be canonical; a value normalisation would change is refused', () => {
  const studio = initialStudio();
  requirement(studio, '시설 예약', ['시설을 검색한다.']);
  assert.equal(validateStudio(structuredClone(studio)), true);
  assert.equal(validateStudio(undefined), true);
  const broken = [
    draft => { draft.extra = 1; },
    draft => { draft.enabled.push('not-a-type'); },
    draft => { draft.items[0].fields.definition += ' '; },
    draft => { draft.items[0].fields.details.push(''); },
    draft => { draft.items[0].evidence.push({ s: 'SRC-1', c: 'C-1' }); },
    draft => { draft.items.push(structuredClone(draft.items[0])); },
    draft => { draft.items[0].number = 'SFR-1'; },
    draft => { draft.items[0].status = 'approved'; },
    draft => { draft.tags['SRC-1/C-1'] = { h: 'short', r: 1, a: [], x: [] }; },
    draft => { draft.proposals.push({ id: 'PRP-0001', itemId: 'REQ-9999', fields: {}, evidence: [], createdAt: NOW }); },
  ];
  for (const mutate of broken) { const draft = structuredClone(studio); mutate(draft); assert.throws(() => validateStudio(draft), { code: 'STUDIO_STATE_INVALID' }, mutate.toString()); }
});

test('candidates never change a confirmed record, and a requirement number is issued once', () => {
  const studio = initialStudio();
  const booking = requirement(studio, '시설 예약', ['시설을 검색한다.']);
  assert.equal(setItemStatus(studio, booking.id, 'confirmed').number, 'SFR-001');
  // Same content from another clause: even the new source is not added to a confirmed record without a person.
  const confirmedRev = booking.rev;
  assert.equal(settleCandidate(studio, candidate(studio, '시설 예약', ['시설을 검색한다.']).id, { action: 'same', target: booking.id }, NOW).outcome, 'proposed');
  assert.deepEqual([booking.evidence.length, booking.rev, studio.proposals[0].fields.details, studio.proposals[0].evidence.length], [1, confirmedRev, [], 1]);
  // The same proposal is not filed twice, and a clause already cited proposes nothing.
  settleCandidate(studio, candidate(studio, '시설 예약', ['시설을 검색한다.']).id, { action: 'same', target: booking.id }, NOW);
  assert.equal(settleCandidate(studio, candidate(studio, '시설 예약', ['시설을 검색한다.'], cite('C-1')).id, { action: 'same', target: booking.id }, NOW).outcome, 'duplicate');
  assert.equal(studio.proposals.length, 1);
  decideProposal(studio, studio.proposals[0].id, true);
  assert.deepEqual([booking.evidence.length, booking.rev], [2, confirmedRev + 1]);
  // New content for a confirmed record waits as a proposal that holds only the additions.
  assert.equal(settleCandidate(studio, candidate(studio, '시설 예약', ['시설을 검색한다.', '30일 전부터 신청한다.']).id, { action: 'same', target: booking.id }, NOW).outcome, 'proposed');
  assert.deepEqual(booking.fields.details, ['시설을 검색한다.']);
  assert.deepEqual(studio.proposals[0].fields.details, ['30일 전부터 신청한다.']);
  // A draft is added to directly, unless the comparison saw only part of the text: then a person decides there too.
  const draft = requirement(studio, '초안 요구', ['처음 내용'], cite('C-2'));
  assert.equal(settleCandidate(studio, candidate(studio, '초안 요구', ['처음 내용', '부분 대조로 온 내용']).id, { action: 'same', target: draft.id, review: true }, NOW).outcome, 'proposed');
  assert.deepEqual(draft.fields.details, ['처음 내용']);
  decideProposal(studio, studio.proposals.at(-1).id, false);
  assert.equal(settleCandidate(studio, candidate(studio, '초안 요구', ['처음 내용', '온전히 대조한 내용']).id, { action: 'same', target: draft.id }, NOW).outcome, 'enriched');
  assert.deepEqual(draft.fields.details, ['처음 내용', '온전히 대조한 내용']);
  setItemStatus(studio, draft.id, 'retired');
  decideProposal(studio, studio.proposals[0].id, true);
  assert.deepEqual(booking.fields.details, ['시설을 검색한다.', '30일 전부터 신청한다.']);
  // A target that does not exist, is retired, or is of another kind is not merged into.
  setItemStatus(studio, booking.id, 'retired');
  const again = settleCandidate(studio, candidate(studio, '시설 예약', ['다시 들어온 내용']).id, { action: 'same', target: booking.id }, NOW);
  assert.deepEqual([again.outcome, again.item.id], ['added', 'REQ-0003']);
  // The retired number is not handed out again, and going back to draft keeps a number.
  assert.equal(setItemStatus(studio, again.item.id, 'confirmed').number, 'SFR-002');
  assert.equal(setItemStatus(studio, again.item.id, 'draft').number, 'SFR-002');
  assert.throws(() => saveItem(studio, { id: again.item.id, name: again.item.name, fields: { ...again.item.fields, category: 'PER' }, rev: again.item.rev }), { code: 'STUDIO_CATEGORY_LOCKED' });
  assert.throws(() => settleCandidate(studio, 'CND-99999', { action: 'new' }, NOW), { code: 'STUDIO_CANDIDATE_NOT_FOUND' });
  assert.equal(validateStudio(studio), true);
});

test('a conflict keeps both statements until a person decides, and blocks confirmation meanwhile', () => {
  const studio = initialStudio();
  const payment = requirement(studio, '이용료 결제', ['승인 후 24시간 안에 결제한다.'], cite('C-3'));
  const settle = decision => settleCandidate(studio, candidate(studio, '이용료 결제', ['승인 후 48시간 안에 결제한다.'], cite('C-2')).id, { action: 'conflict', target: payment.id, note: '기한이 다르다', incoming: '승인 후 48시간 안에 결제한다.', ...decision }, NOW);
  settle({ field: 'details', existing: '승인 후 24시간 안에 결제한다.' });
  // The same contradiction reported again is one issue, not two.
  settle({ field: 'details', existing: '승인 후 24시간 안에 결제한다.' });
  assert.equal(studio.issues.length, 1);
  // A quoted statement that is not in the record is not trusted as the thing to replace.
  settle({ field: 'details', existing: '기록에 없는 문장', note: '기한 표현이 다르다' });
  assert.deepEqual(studio.issues.map(issue => issue.existing), ['승인 후 24시간 안에 결제한다.', undefined]);
  assert.deepEqual(payment.fields.details, ['승인 후 24시간 안에 결제한다.']);
  assert.equal(itemReady(studio, payment), false);
  assert.throws(() => setItemStatus(studio, payment.id, 'confirmed'), { code: 'STUDIO_NOT_READY' });
  assert.throws(() => resolveIssue(studio, studio.issues[0].id, { choice: 'maybe' }), { code: 'STUDIO_CHOICE_INVALID' });
  resolveIssue(studio, studio.issues[0].id, { choice: 'adopt' });
  assert.deepEqual(payment.fields.details, ['승인 후 48시간 안에 결제한다.']);
  resolveIssue(studio, studio.issues[1].id, { choice: 'keep', note: '회의 결정' });
  assert.deepEqual([payment.fields.details, studio.issues[1].resolution], [['승인 후 48시간 안에 결제한다.'], '기존 내용 유지 — 회의 결정']);
  assert.equal(setItemStatus(studio, payment.id, 'confirmed').number, 'SFR-001');
  // A conflict can never move a numbered requirement to another class, and the store refuses a number that does not match its class.
  settle({ field: 'category', existing: 'SFR', incoming: 'PER' });
  assert.equal(studio.issues.at(-1).field, undefined);
  resolveIssue(studio, studio.issues.at(-1).id, { choice: 'adopt' });
  assert.deepEqual([payment.number, payment.fields.category], ['SFR-001', 'SFR']);
  assert.equal(validateStudio(studio), true);
  const forged = structuredClone(studio); forged.items[0].fields.category = 'PER';
  assert.throws(() => validateStudio(forged), { code: 'STUDIO_STATE_INVALID' });
});

test('values that differ are kept as notes that do not block confirmation; additions that do not fit and oversize input are surfaced, never dropped', () => {
  const studio = initialStudio();
  const entity = createItem(studio, { kind: 'entity-def', name: '예약', fields: { description: '예약 건', identifier: '예약번호', attributes: [{ name: '예약번호', type: '문자' }, { name: '이용 일시', type: '일시' }] }, evidence: cite('C-2') });
  const incoming = { description: '다르게 쓴 예약 설명', identifier: '예약ID', attributes: [{ name: '예약번호', type: '숫자' }, { name: '이용 일시', type: '일시' }, { name: '이용 목적' }] };
  // Narrative text never counts as a disagreement; a short value and a table cell do.
  assert.deepEqual(fieldConflicts('entity-def', entity.fields, incoming).map(conflict => [conflict.field, conflict.existing, conflict.incoming]), [['identifier', '예약번호', '예약ID'], ['attributes', '예약번호 / 문자', '예약번호 / 숫자']]);
  const added = addCandidate(studio, { kind: 'entity-def', name: '예약', fields: incoming, evidence: cite('C-3'), questions: [] });
  const result = settleCandidate(studio, added.id, { action: 'same', target: entity.id }, NOW);
  assert.deepEqual([result.outcome, result.conflicts, result.variants, entity.fields.identifier, entity.fields.attributes.map(row => [row.name, row.type])], ['enriched', 0, 2, '예약번호', [['예약번호', '문자'], ['이용 일시', '일시'], ['이용 목적', '']]]);
  // The program cannot tell another wording from a contradiction, so what it found is a note: the record can still be confirmed.
  assert.deepEqual(studio.issues.map(issue => [issue.kind, issue.field, issue.open]), [['variant', 'identifier', 1], ['variant', 'attributes', 1]]);
  assert.deepEqual([itemReady(studio, entity), openVariants(studio, entity.id).length], [true, 2]);
  // Adopting a row note replaces that row only.
  resolveIssue(studio, studio.issues.find(issue => issue.field === 'attributes').id, { choice: 'adopt' });
  resolveIssue(studio, studio.issues.find(issue => issue.field === 'identifier').id, { choice: 'adopt' });
  assert.deepEqual([entity.fields.identifier, entity.fields.attributes.map(row => [row.name, row.type])], ['예약ID', [['예약번호', '숫자'], ['이용 일시', '일시'], ['이용 목적', '']]]);
  // A list that is full cannot take more: the rest is kept in an issue with the candidate's content.
  const full = requirement(studio, '가득 찬 요구', Array.from({ length: FIELD_LIMITS.listItems }, (unused, index) => `조건 ${index}`));
  const overflow = settleCandidate(studio, candidate(studio, '가득 찬 요구', ['넘치는 새 조건']).id, { action: 'same', target: full.id }, NOW);
  assert.deepEqual([overflow.outcome, overflow.conflicts, full.fields.details.length], ['duplicate', 1, FIELD_LIMITS.listItems]);
  assert.deepEqual(studio.issues.at(-1).fields.details, ['넘치는 새 조건']);
  assert.equal(itemReady(studio, full), false);
  // What the model judged a contradiction still blocks, and a field keeps only a few notes however many documents word it differently.
  const worded = createItem(studio, { kind: 'entity-def', name: '시설', fields: { description: '시설 정보', identifier: '시설번호', attributes: [{ name: '시설번호' }] }, evidence: cite('C-2') });
  const reword = identifier => settleCandidate(studio, addCandidate(studio, { kind: 'entity-def', name: '시설', fields: { identifier }, evidence: cite('C-3'), questions: [] }).id, { action: 'same', target: worded.id }, NOW).variants;
  assert.deepEqual(['시설 번호 값', '시설ID', '시설ID', '시설코드', '시설 키', '시설 식별번호'].map(reword), [1, 1, 0, 1, 0, 0]);
  assert.equal(openVariants(studio, worded.id).length, STUDIO_LIMITS.variants);
  // Closing one makes room for the next difference.
  resolveIssue(studio, openVariants(studio, worded.id)[0].id, { choice: 'keep' });
  assert.deepEqual([reword('시설 키'), worded.fields.identifier, itemReady(studio, worded)], [1, '시설번호', true]);
  // Taking one wording and then another changes the value both times: a note is about the field, not about the text it held when the note was written.
  const [one, two] = openVariants(studio, worded.id);
  resolveIssue(studio, one.id, { choice: 'adopt' });
  assert.deepEqual([worded.fields.identifier, two.existing, variantCurrent(studio, two)], ['시설ID', '시설번호', '시설ID']);
  resolveIssue(studio, two.id, { choice: 'adopt' });
  assert.deepEqual([worded.fields.identifier, two.resolution], ['시설코드', '새 문서의 내용을 반영']);
  // What a person types is saved whole or refused.
  const tooLong = { category: 'SFR', definition: '가'.repeat(FIELD_LIMITS.text + 1), details: ['x'] };
  assert.deepEqual(overflowingFields('requirement', tooLong), ['definition']);
  assert.deepEqual(overflowingFields('requirement', { details: Array.from({ length: 31 }, (unused, index) => `줄 ${index}`) }), ['details']);
  assert.deepEqual(overflowingFields('entity-def', { attributes: [{ name: '속성', description: '나'.repeat(FIELD_LIMITS.cell + 1) }] }), ['attributes']);
  assert.throws(() => saveItem(studio, { kind: 'requirement', name: '긴 요구', fields: tooLong }), { code: 'STUDIO_FIELD_TOO_LONG' });
  assert.throws(() => saveItem(studio, { id: full.id, name: '나'.repeat(121), fields: full.fields, rev: full.rev }), { code: 'STUDIO_FIELD_TOO_LONG' });
  // A model candidate that is too large is kept in part with a question that says so, so it cannot be confirmed unseen.
  const cut = addCandidate(studio, { kind: 'requirement', name: '큰 후보', fields: tooLong, evidence: cite('C-1'), questions: ['문서의 질문'] });
  assert.deepEqual([cut.questions.length, /길이 한도를 넘어/.test(cut.questions[0]), cut.questions[1]], [2, true, '문서의 질문']);
  assert.equal(validateStudio(studio), true);
});

test('conflicts an earlier version raised by itself become notes, a model conflict stays even in the same words, and a full store stops questions but not notes', () => {
  const studio = initialStudio();
  const entity = createItem(studio, { kind: 'entity-def', name: '예약', fields: { description: '예약 건', identifier: '예약번호', attributes: [{ name: '예약번호', type: '문자' }] }, evidence: cite('C-2') });
  const issue = (id, text, extra = {}) => ({ id, kind: 'conflict', itemId: entity.id, text, ...extra, evidence: cite('C-3'), open: 1, createdAt: NOW });
  const words = '‘식별자’ 값이 문서마다 다릅니다.', rowWords = '‘속성’ 값이 문서마다 다릅니다.', row = { existing: '예약번호 / 문자', incoming: '예약번호 / 숫자' };
  studio.issues.push(
    // What the earlier version stored for a short value, and for a table row: nothing else, or that one row.
    issue('ISS-0001', words, { field: 'identifier', existing: '예약번호', incoming: '예약ID' }),
    issue('ISS-0002', rowWords, { field: 'attributes', ...row, fields: normalizeFields('entity-def', { attributes: [{ name: '예약번호', type: '숫자' }] }) }),
    // What the model judged: it carries the candidate's content, whatever words its note uses.
    issue('ISS-0003', words, { field: 'identifier', existing: '예약번호', incoming: '접수번호', fields: normalizeFields('entity-def', { identifier: '접수번호' }) }),
    issue('ISS-0004', rowWords, { field: 'attributes', ...row, fields: normalizeFields('entity-def', { description: '다른 설명', attributes: [{ name: '예약번호', type: '숫자' }] }) }),
    issue('ISS-0005', '식별 방법이 서로 다르다.', { field: 'identifier', existing: '예약번호', incoming: '접수번호' }), issue('ISS-0006', words));
  studio.seq.ISS = 6;
  assert.equal(demoteProgramConflicts(studio), 2);
  assert.deepEqual(studio.issues.map(entry => entry.kind), ['variant', 'variant', 'conflict', 'conflict', 'conflict', 'conflict']);
  assert.equal(demoteProgramConflicts(studio), 0);
  assert.equal(variantCurrent(studio, studio.issues[1]), '예약번호 / 문자');
  // A question in the words of a note is still a question: the note does not stand in for it.
  assert.equal(raiseQuestions(studio, entity, [words], [], NOW), 1);
  assert.equal(raiseQuestions(studio, entity, [words], [], NOW), 0);
  // The model's conflicts and the question still have to be decided before the record can be confirmed.
  assert.equal(itemReady(studio, entity), false);
  for (const entry of studio.issues.slice(2, 6)) resolveIssue(studio, entry.id, { choice: 'keep' });
  assert.equal(itemReady(studio, entity), false);
  resolveIssue(studio, studio.issues[6].id, { choice: 'dismiss' });
  assert.equal(itemReady(studio, entity), true);
  // A full store: a note is not taken and nothing stops; a question has to be kept, so the run stops and names the limit.
  studio.issues.push(...Array.from({ length: STUDIO_LIMITS.issues - studio.issues.length }, (unused, index) => ({ id: `ISS-${index + 1000}`, kind: 'question', itemId: entity.id, text: `닫힌 질문 ${index}`, evidence: [], open: 0, createdAt: NOW })));
  const settled = settleCandidate(studio, addCandidate(studio, { kind: 'entity-def', name: '예약', fields: { identifier: '예약 키' }, evidence: cite('C-1'), questions: [] }).id, { action: 'same', target: entity.id }, NOW);
  assert.deepEqual([settled.outcome, settled.variants, studio.issues.length], ['duplicate', 0, STUDIO_LIMITS.issues]);
  assert.throws(() => raiseQuestions(studio, entity, ['새 질문'], [], NOW), { code: 'STUDIO_ISSUE_CAPACITY' });
  assert.equal(validateStudio(studio), true);
});

test('questions that ask the same thing are one decision: grouped only under a question that leads, answered once for every record, and split by a person', () => {
  const studio = initialStudio();
  const booking = requirement(studio, '시설 예약 신청', ['시민은 시설을 예약한다.']), payment = requirement(studio, '이용료 결제', ['결제는 24시간 안에 한다.'], cite('C-3'));
  const entity = createItem(studio, { kind: 'entity-def', name: '결제', fields: { description: '결제 정보' }, evidence: cite('C-2') });
  const asked = '결제 수단이 정해지지 않았습니다. 어떻게 정합니까?';
  raiseQuestions(studio, booking, [asked, '예약 가능 기간은 얼마입니까?', '결제 수단은 언제 확정합니까?'], cite('C-1'), NOW);
  raiseQuestions(studio, payment, ['결제 수단은 무엇으로 합니까?'], cite('C-3'), NOW);
  raiseQuestions(studio, entity, [asked], cite('C-2'), NOW);
  const [first, period, when, second, third] = studio.issues, topics = () => studio.issues.map(issue => issue.topic);
  // Nothing has been compared yet: every question waits and stands for itself.
  assert.deepEqual([pendingWork(studio, backlog).questions, questionGroup(studio, first).length], [5, 1]);
  assert.equal(groupQuestion(studio, second.id, first.id), false, 'the earlier question has not been compared itself, so it leads nothing yet');
  assert.equal(groupQuestion(studio, first.id), true);
  assert.equal(groupQuestion(studio, period.id), true);
  assert.equal(groupQuestion(studio, second.id, first.id), true);
  assert.equal(groupQuestion(studio, third.id, second.id), false, 'a question that repeats another leads nothing');
  assert.equal(groupQuestion(studio, third.id, first.id), true);
  assert.equal(groupQuestion(studio, third.id, period.id), false, 'a question is grouped once');
  assert.equal(groupQuestion(studio, when.id, first.id), true);
  assert.deepEqual(topics(), [first.id, period.id, first.id, first.id, first.id]);
  assert.deepEqual([pendingWork(studio, backlog).questions, questionGroup(studio, third).length, validateStudio(studio)], [0, 4, true]);
  // Grouping changes nothing about what blocks confirmation.
  assert.deepEqual([booking, payment, entity].map(item => openIssues(studio, item.id).length), [3, 1, 1]);

  // A person finds that the one that leads asks something else: it leaves and the earliest of the rest leads.
  splitQuestion(studio, first.id);
  assert.deepEqual(topics(), [first.id, period.id, when.id, when.id, when.id]);
  assert.throws(() => splitQuestion(studio, first.id), { code: 'STUDIO_ISSUE_NOT_GROUPED' });
  splitQuestion(studio, when.id);
  assert.deepEqual([topics(), validateStudio(studio)], [[first.id, period.id, when.id, second.id, second.id], true]);

  // Several questions close only for a person who was shown exactly them: no list, a list that misses one or names another closes nothing.
  const pair = [second.id, third.id];
  for (const group of [undefined, [third.id], [third.id, second.id, first.id], 'all']) assert.throws(() => resolveIssue(studio, third.id, { note: '카드로 한다.', group }), { code: 'STUDIO_GROUP_CHANGED' });
  assert.throws(() => resolveIssue(studio, first.id, { note: '카드로 한다.', group: [first.id, second.id] }), { code: 'STUDIO_GROUP_CHANGED' }, 'a question on its own is not closed with a list that names more');
  // An answer without words closes nothing; an answer closes the whole group and is written to each record it is attached to.
  assert.throws(() => resolveIssue(studio, third.id, { note: '  ', group: pair }), { code: 'STUDIO_ANSWER_REQUIRED' });
  assert.deepEqual([studio.issues.every(issue => issue.open === 1), payment.fields.details], [true, ['결제는 24시간 안에 한다.']]);
  resolveIssue(studio, third.id, { note: '카드와 계좌이체로 한다.', group: [third.id, second.id] });
  assert.deepEqual(studio.issues.map(issue => [issue.open, issue.resolution]), [[1, undefined], [1, undefined], [1, undefined], [0, '카드와 계좌이체로 한다.'], [0, '카드와 계좌이체로 한다.']]);
  assert.deepEqual([payment.fields.details, entity.note, booking.fields.details], [['결제는 24시간 안에 한다.', '카드와 계좌이체로 한다.'], '카드와 계좌이체로 한다.', ['시민은 시설을 예약한다.']]);
  assert.equal(openIssues(studio, payment.id).length, 0);
  // Two questions of one group on the same record: the answer is written to it once.
  assert.equal(groupQuestion(studio, raiseQuestions(studio, booking, ['결제 수단 확정 시점은 언제입니까?'], cite('C-1'), NOW) && studio.issues.at(-1).id, when.id), true);
  const revision = booking.rev;
  resolveIssue(studio, when.id, { note: '착수 보고 때 확정한다.', group: [when.id, studio.issues.at(-1).id] });
  assert.deepEqual([booking.fields.details, booking.rev], [['시민은 시설을 예약한다.', '착수 보고 때 확정한다.'], revision + 1]);
  // Closing without an answer closes the group and leaves the records as they are.
  assert.equal(groupQuestion(studio, raiseQuestions(studio, payment, ['예약 가능 기간은 며칠입니까?'], cite('C-3'), NOW) && studio.issues.at(-1).id, period.id), true);
  const before = JSON.stringify([booking.fields, payment.fields]);
  resolveIssue(studio, period.id, { choice: 'dismiss', group: [period.id, studio.issues.at(-1).id] });
  assert.deepEqual([studio.issues.filter(issue => issue.open).map(issue => issue.id), JSON.stringify([booking.fields, payment.fields]) === before], [[first.id], true]);
  assert.equal(studio.issues.at(-1).resolution, '답하지 않고 닫음');

  // A question about one record's own content is never compared: it is born leading itself, and a notice of cut content stands alone.
  raiseQuestions(studio, entity, ['식별자를 알려 주세요.'], [], NOW, true);
  assert.deepEqual([studio.issues.at(-1).topic === studio.issues.at(-1).id, pendingWork(studio, backlog).questions], [true, 0]);
  const cut = addCandidate(studio, { kind: 'requirement', name: '긴 요구', fields: { category: 'SFR', definition: '가'.repeat(FIELD_LIMITS.text + 10), details: ['세부'] }, evidence: cite('C-1'), questions: [asked] });
  assert.deepEqual(cut.questions.map(text => standsAlone({ text })), [true, false]);
  // Nothing joins a question that stands alone either, whether it was raised as such or is the program's notice.
  const own = studio.issues.at(-1);
  raiseQuestions(studio, payment, ['식별자를 알려 주세요.', cut.questions[0]], cite('C-3'), NOW);
  const [similar, notice] = studio.issues.slice(-2);
  assert.deepEqual([own.alone, groupQuestion(studio, similar.id, own.id), groupQuestion(studio, notice.id), groupQuestion(studio, similar.id, notice.id), groupQuestion(studio, similar.id)], [1, false, true, false, true]);

  // An answer goes to the record's list of details, or to its note when that list is full. When a record of the group can hold it
  // in neither, nothing closes and no record is changed, not even the ones that had room.
  const roomy = requirement(studio, '여유 있는 요구', ['조건']), full = requirement(studio, '가득 찬 요구', Array.from({ length: FIELD_LIMITS.listItems }, (unused, index) => `조건 ${index + 1}`));
  raiseQuestions(studio, roomy, ['보관 기간은 얼마입니까?'], cite('C-1'), NOW); raiseQuestions(studio, full, ['보관 기간을 정해 주세요.'], cite('C-1'), NOW);
  const [kept, joined] = studio.issues.slice(-2), both = [kept.id, joined.id];
  assert.deepEqual([groupQuestion(studio, kept.id), groupQuestion(studio, joined.id, kept.id)], [true, true]);
  full.note = '가'.repeat(FIELD_LIMITS.text - 3);
  assert.throws(() => resolveIssue(studio, kept.id, { note: '5년 보관한다.', group: both }), { code: 'STUDIO_ANSWER_NO_ROOM' });
  assert.deepEqual([kept.open, joined.open, roomy.fields.details, full.fields.details.length], [1, 1, ['조건'], FIELD_LIMITS.listItems]);
  full.note = '기존 메모';
  resolveIssue(studio, kept.id, { note: '5년 보관한다.', group: both });
  assert.deepEqual([kept.open, joined.open, roomy.fields.details, full.fields.details.length, full.note], [0, 0, ['조건', '5년 보관한다.'], FIELD_LIMITS.listItems, '기존 메모 / 5년 보관한다.']);

  // A topic belongs to questions only and names a question that leads; an open question is not left in the group of a closed one;
  // a question that stands alone leads only itself.
  assert.equal(validateStudio(studio), true);
  const stored = (id, open, extra) => ({ id, kind: 'question', itemId: booking.id, text: `저장된 질문 ${id}`, evidence: [], open, createdAt: NOW, ...extra });
  const closedPair = structuredClone(studio); closedPair.issues.push(stored('ISS-7001', 0, { topic: 'ISS-7001' }), stored('ISS-7002', 0, { topic: 'ISS-7001' }));
  assert.equal(validateStudio(closedPair), true, 'a closed group keeps its record');
  for (const broken of [draft => { draft.issues[4].topic = draft.issues[3].id; draft.issues[3].topic = draft.issues[2].id; }, draft => { draft.issues[0].topic = 'ISS-9999'; }, draft => { draft.issues.push({ id: 'ISS-7000', kind: 'conflict', itemId: booking.id, text: '충돌', evidence: [], open: 1, createdAt: NOW, topic: 'ISS-7000' }); },
    draft => { draft.issues.push(stored('ISS-7001', 0, { topic: 'ISS-7001' }), stored('ISS-7002', 1, { topic: 'ISS-7001' })); },
    draft => { draft.issues.push(stored('ISS-7001', 1, { topic: 'ISS-7001', alone: 1 }), stored('ISS-7002', 1, { topic: 'ISS-7001' })); },
    draft => { draft.issues.push(stored('ISS-7001', 1, { alone: 1 })); }, draft => { draft.issues.push(stored('ISS-7001', 1, { topic: 'ISS-7001', alone: true })); }]) {
    const draft = structuredClone(studio); broken(draft);
    assert.throws(() => validateStudio(draft), { code: 'STUDIO_STATE_INVALID' });
  }
});

test('clauses are sent once: a tagged clause is not pending, a changed clause is, and two failures close it', () => {
  const studio = initialStudio(), [first, second, third] = [...clauses.values()];
  assert.equal(pendingWork(studio, backlog).classify.length, 3);
  applyTag(studio, first, { requirement: true, artifacts: ['entity-def', 'process-def', 'bogus'] });
  failTag(studio, second);
  assert.deepEqual(pendingWork(studio, backlog).classify.map(entry => entry.clauseId), ['C-2', 'C-3']);
  failTag(studio, second);
  assert.deepEqual(pendingWork(studio, backlog).classify.map(entry => entry.clauseId), ['C-3']);
  // entity-def is on by default; process-def is off, so its clause only waits.
  assert.deepEqual(Object.fromEntries(Object.entries(pendingWork(studio, backlog).extract).map(([type, list]) => [type, list.length])), { 'function-tree': 0, 'entity-def': 1, 'screen-def': 0 });
  const item = requirement(studio, '시설 예약', ['검색한다.'], cite('C-1'));
  const edited = { sources: [sourceOf('SRC-1', '합성 제안요청서', [clause('C-1', '시민은 시설을 예약하고 결제한다.'), clause('C-2', '예약 정보를 관리한다.')])] };
  assert.deepEqual(pendingWork(studio, edited).classify.map(entry => entry.clauseId), ['C-1']);
  // Evidence that points at changed or removed text is flagged, not silently kept as valid.
  assert.deepEqual(describeEvidence([...item.evidence, ...cite('C-3')], clauseMap(edited)).map(entry => entry.stale), [true, true]);
  assert.equal(third.clauseId, 'C-3');
});

test('trace and cross-deliverable checks are computed from the records', () => {
  const studio = initialStudio();
  studio.enabled = ['function-tree', 'process-def', 'entity-def', 'screen-def', 'menu-tree'];
  const booking = requirement(studio, '시설 예약', ['검색한다.'], cite('C-1'));
  setItemStatus(studio, booking.id, 'confirmed');
  const screen = createItem(studio, { kind: 'screen-def', name: '예약 화면', fields: { description: '예약한다.' }, evidence: cite('C-1') });
  const entity = createItem(studio, { kind: 'entity-def', name: '예약', fields: { description: '예약 건' }, evidence: cite('C-2') });
  createItem(studio, { kind: 'process-def', name: '예약 처리', fields: { description: '처리', entityUsage: [{ entity: '예 약', usage: 'r' }, { entity: '회원', usage: 'C' }] }, evidence: cite('C-2') });
  createItem(studio, { kind: 'menu-tree', name: '예약 메뉴', fields: { description: '메뉴', parent: '없는 상위', screen: '없는 화면' }, evidence: cite('C-3') });
  // The screen cites the requirement's clause; the entity does not until a person links it.
  assert.deepEqual(relatedItems(studio, booking).map(item => item.id), [screen.id]);
  saveItem(studio, { id: entity.id, name: entity.name, fields: entity.fields, links: [booking.id], rev: entity.rev });
  assert.deepEqual(relatedItems(studio, booking).map(item => item.id).sort(), [entity.id, screen.id].sort());
  assert.throws(() => saveItem(studio, { id: entity.id, name: entity.name, fields: entity.fields, links: ['REQ-9999'], rev: entity.rev }), { code: 'STUDIO_LINK_INVALID' });
  const checks = crossChecks(studio);
  assert.deepEqual(checks['function-tree'], ['확정된 기능 요구사항 SFR-001 ‘시설 예약’에 연결된 기능이 없습니다.']);
  assert.equal(checks['screen-def'], undefined);
  assert.deepEqual(checks['process-def'], ['프로세스 ‘예약 처리’이 쓰는 엔터티 ‘회원’가 엔터티정의서에 없습니다.']);
  assert.deepEqual(checks['entity-def'], ['엔터티 ‘예약’을 생성(C)하는 프로세스가 없습니다.']);
  assert.deepEqual(checks['menu-tree'], ['‘예약 메뉴’의 상위 ‘없는 상위’이 목록에 없습니다.', '메뉴 ‘예약 메뉴’이 여는 화면 ‘없는 화면’이 화면설계서에 없습니다.']);
  // A deliverable that is switched off is not checked and drops out of the trace; its items stay stored.
  studio.enabled = ['entity-def'];
  assert.deepEqual(crossChecks(studio), {});
  assert.deepEqual(relatedItems(studio, booking).map(item => item.id), [entity.id]);
  assert.equal(studio.items.some(item => item.id === screen.id), true);
});

test('stories follow confirmed development requirements and are rewritten only when the requirement changed', () => {
  const studio = initialStudio();
  const booking = requirement(studio, '시설 예약', ['검색한다.']), speed = requirement(studio, '응답 시간', ['3초'], cite('C-2'), 'PER'), draft = requirement(studio, '통계', ['조회한다.'], cite('C-3'));
  setItemStatus(studio, booking.id, 'confirmed'); setItemStatus(studio, speed.id, 'confirmed');
  assert.deepEqual(planTargets(studio).map(item => item.id), [booking.id], 'quality and draft requirements do not become stories');
  const story = { requirement: booking.id, epic: '', epicName: '예약 업무', title: '시설 예약', role: '시민', want: '예약한다', green: ['검색된다'], red: ['권한 없으면 막힌다'] };
  assert.deepEqual(applyStories(studio, [booking.id], [story, { ...story, requirement: draft.id }, { ...story, green: [] }, { ...story, epicName: '' }], NOW), { written: [booking.id], missing: [] });
  assert.deepEqual(studio.plan.stories.map(entry => [entry.id, entry.epicId]), [['ST-0001', 'EP-01']]);
  assert.deepEqual(planTargets(studio), []);
  // A reply that leaves the requirement out keeps the stories it had.
  assert.deepEqual(applyStories(studio, [booking.id], [], NOW), { written: [], missing: [booking.id] });
  assert.equal(studio.plan.stories.length, 1);
  saveItem(studio, { id: booking.id, name: booking.name, fields: { ...booking.fields, details: ['검색한다.', '30일 전부터'] }, rev: booking.rev });
  assert.deepEqual(planTargets(studio).map(item => item.id), [booking.id]);
  applyStories(studio, [booking.id], [{ ...story, epic: 'EP-01', epicName: '' }, { ...story, epic: 'EP-01', title: '예약 조회' }], NOW);
  assert.deepEqual(studio.plan.stories.map(entry => entry.id), ['ST-0002', 'ST-0003']);
  assert.equal(studio.plan.epics.length, 1);
  // A confirmed record cannot be saved with a required field emptied.
  assert.throws(() => saveItem(studio, { id: booking.id, name: booking.name, fields: { ...booking.fields, definition: '' }, rev: booking.rev }), { code: 'STUDIO_NOT_READY' });
  // Stories of a requirement that left the confirmed scope are orphans until the plan is updated.
  assert.deepEqual(orphanStories(studio), []);
  setItemStatus(studio, booking.id, 'retired');
  assert.deepEqual(orphanStories(studio).map(entry => entry.id), ['ST-0002', 'ST-0003']);
  assert.equal(removeOrphanStories(studio, NOW), 2);
  assert.deepEqual([studio.plan.stories, removeOrphanStories(studio, NOW)], [[], 0]);
  assert.equal(validateStudio(studio), true);
});

test('every request is built under the size limit and oversize input is reported, not trimmed', () => {
  const heavy = text => clause(`C-${text}`, `${text} ${'가'.repeat(1700)}`);
  const sources = { sources: [sourceOf('SRC-A', '합성 문서 A', Array.from({ length: 40 }, (unused, index) => heavy(index))), sourceOf('SRC-B', '합성 문서 B', [clause('C-1', '짧은 조각'), clause('C-BIG', '나'.repeat(12000))])] };
  const { batches, oversize } = batchClauses([...clauseMap(sources).values()]);
  assert.deepEqual(oversize.map(entry => entry.clauseId), ['C-BIG']);
  assert.ok(batches.every(batch => new Set(batch.map(entry => entry.sourceId)).size === 1 && batch.length <= CLAUSE_BATCH.count));
  assert.equal(batches.flat().length, 41);
  for (const batch of batches) {
    assert.ok(classifyRequest(batch).bytes <= REQUEST_LIMIT);
    for (const type of ARTIFACT_TYPES) assert.ok(extractRequest(type.id, batch).bytes <= REQUEST_LIMIT, type.id);
  }
  const studio = initialStudio(), big = { category: 'SFR', definition: '정'.repeat(2000), details: Array.from({ length: 30 }, (unused, index) => `${index} ${'세'.repeat(390)}`) };
  const items = Array.from({ length: 8 }, (unused, index) => createItem(studio, { kind: 'requirement', name: `큰 요구사항 ${index}`, fields: big, evidence: cite('C-1') }));
  const entries = items.slice(0, 6).map(item => ({ candidate: item, near: items.slice(0, 6).map(other => ({ item: other })) }));
  const merge = fitted(group => mergeRequest('requirement', group), entries);
  assert.ok(merge.bytes <= REQUEST_LIMIT && merge.used >= 1 && merge.used <= 6);
  // Large requirements are planned fewer at a time. One that cannot fit even alone is an error to report.
  assert.equal(fitted(group => planRequest(group, []), items.slice(0, 4).map(item => ({ requirement: item, related: [] }))).used, 1);
  const huge = { ...items[0], fields: { ...items[0].fields, constraints: big.details } };
  assert.throws(() => fitted(group => planRequest(group, []), [{ requirement: huge, related: [] }, { requirement: items[1], related: [] }]), { code: 'STUDIO_REQUEST_TOO_LARGE' });
  const small = items.map(item => ({ requirement: { ...item, fields: { ...item.fields, definition: '짧다', details: ['짧다'] } }, related: [] }));
  assert.equal(fitted(group => planRequest(group, []), small).used, 8);
  assert.ok(enrichRequest(createItem(studio, { kind: 'screen-def', name: '화면', fields: {}, evidence: cite('C-1') }), batches[0]).bytes <= REQUEST_LIMIT);
});

test('model replies are read defensively: only what refers to the request is kept', () => {
  const batch = [...clauses.values()];
  const result = readClassify({ clauses: [{ n: 1, requirement: false, artifacts: ['entity-def', 'bogus'] }, { n: 1, requirement: true, artifacts: [] }, { n: 9, requirement: true, artifacts: [] }, null],
    candidates: [{ category: 'ZZZ', name: '시설 예약', definition: '예약해야 한다.', details: ['검색'], clauses: [1, 1, 7] }, { category: 'SFR', name: '근거 없음', definition: '없다.', clauses: [9] }, { category: 'SFR', name: '', definition: '이름 없음', clauses: [2] }] }, batch);
  assert.deepEqual(result.tags.map(tag => [tag.clause.clauseId, tag.requirement, tag.artifacts]), [['C-1', true, ['entity-def']]]);
  assert.deepEqual(result.missing.map(entry => entry.clauseId), ['C-2', 'C-3']);
  assert.deepEqual(result.candidates.map(entry => [entry.name, entry.fields.category, entry.evidence.length]), [['시설 예약', 'SFR', 1]]);
  assert.equal(result.dropped, 2);
  // A clause called a requirement that grounds no usable candidate is not answered: it is sent again, not closed.
  assert.deepEqual(readClassify({ clauses: [{ n: 1, requirement: true, artifacts: [] }, { n: 2, requirement: false, artifacts: [] }], candidates: [] }, batch).missing.map(entry => entry.clauseId), ['C-1', 'C-3']);
  // Questions beyond what a record holds are counted, so the loss shows in the run.
  const many = readClassify({ clauses: [{ n: 1, requirement: true, artifacts: [] }], candidates: [{ category: 'SFR', name: '질문 많은 후보', definition: '있다.', clauses: [1], questions: Array.from({ length: 11 }, (unused, index) => `질문 ${index}`) }] }, batch);
  assert.deepEqual([many.candidates[0].questions.length, many.dropped], [11, 3]);
  // An extraction reply without an item list is invalid; unusable items are counted.
  assert.deepEqual([readExtract({}, 'entity-def', batch).invalid, readExtract({ items: [] }, 'entity-def', batch).invalid], [true, false]);
  assert.deepEqual(readExtract({ items: [{ name: '예약', fields: {}, clauses: [2] }, { name: '', clauses: [1] }, { name: '근거 없음', clauses: [9] }] }, 'entity-def', batch), { items: [{ kind: 'entity-def', name: '예약', fields: {}, evidence: cite('C-2'), questions: [] }], dropped: 2, invalid: false });
  assert.deepEqual(readClassify(null, batch).missing.length, 3);
  const studio = initialStudio(), item = requirement(studio, '시설 예약', ['검색']), other = requirement(studio, '결제', ['결제']);
  const entries = [{ candidate: item, near: [{ item }] }, { candidate: other, near: [{ item }] }, { candidate: other, near: [{ item }] }];
  assert.deepEqual(readMerge({ decisions: [{ k: 1, action: 'same', target: item.id }, { k: 2, action: 'same', target: other.id }, { k: 3, action: 'delete', target: item.id }] }, entries).map(decision => decision.action), ['same', 'new', 'new']);
  // A record too long to show in full is shown in part, and a judgement on it is marked for a person.
  const long = requirement(studio, '긴 요구', Array.from({ length: 12 }, (unused, index) => `${index}번 ${'조건을 길게 적는다 '.repeat(20)}`));
  const built = mergeRequest('requirement', [{ candidate: item, near: [{ item: long }, { item }] }, { candidate: long, near: [{ item }] }]);
  assert.deepEqual([[...built.partial.items], built.partial.candidates], [[long.id], [false, true]]);
  const marked = readMerge({ decisions: [{ k: 1, action: 'same', target: long.id }, { k: 2, action: 'same', target: item.id }] }, [{ candidate: item, near: [{ item: long }, { item }] }, { candidate: long, near: [{ item }] }], built.partial);
  assert.deepEqual(marked.map(decision => decision.review), [true, true]);
  assert.equal(readMerge({ decisions: [{ k: 1, action: 'same', target: item.id }] }, [{ candidate: item, near: [{ item: long }, { item }] }], built.partial)[0].review, false);
  const screen = createItem(studio, { kind: 'screen-def', name: '화면', fields: { description: '사람이 쓴 설명' }, evidence: cite('C-1') });
  const enriched = readEnrich({ fields: { description: '덮어쓰려는 설명', roles: ['시민'], bogus: 1 }, clauses: [2, 99], question: '  질문  ' }, screen, batch);
  assert.deepEqual([enriched.fields.description, enriched.fields.roles, enriched.evidence.map(entry => entry.c), enriched.question], ['', ['시민'], ['C-2'], '질문']);
  // A question is sent with the record it is attached to and is compared only with its own few earlier questions.
  const asked = (id, text, record) => ({ question: { id, text }, item: record }), earlier = [asked('ISS-0001', '결제 수단은 무엇입니까?', item), asked('ISS-0002', '환불 기한은 얼마입니까?', long)];
  const compared = [{ ...asked('ISS-0003', '결제 수단을 정해 주세요.', screen), near: [earlier[0]] }, { ...asked('ISS-0004', '환불은 며칠 안에 합니까?', item), near: [earlier[1], earlier[0]] }];
  const grouping = groupRequest(compared);
  assert.deepEqual(grouping.request.data, { questions: [{ k: 1, item: '화면설계서 · 화면', text: '결제 수단을 정해 주세요.', near: ['ISS-0001'] }, { k: 2, item: '요구사항 · 시설 예약', text: '환불은 며칠 안에 합니까?', near: ['ISS-0002', 'ISS-0001'] }],
    existing: [{ id: 'ISS-0001', item: '요구사항 · 시설 예약', text: '결제 수단은 무엇입니까?' }, { id: 'ISS-0002', item: '요구사항 · 긴 요구', text: '환불 기한은 얼마입니까?' }] });
  assert.ok(grouping.bytes <= REQUEST_LIMIT);
  // An answer naming a question the entry was not compared with, an unknown number or no answer groups nothing.
  assert.deepEqual(readGroup({ decisions: [{ k: 1, same: 'ISS-0002' }, { k: 2, same: 'ISS-0001' }, { k: 7, same: 'ISS-0001' }] }, compared), [undefined, 'ISS-0001']);
  assert.deepEqual(readGroup({ decisions: [{ k: 2, same: 'ISS-0404' }, 'x', { same: 'ISS-0001' }] }, compared), [undefined, undefined]);
  // A reply with no decision list is not read as "nothing is the same": the questions are compared again.
  for (const reply of [{}, null, { decisions: 'none' }]) assert.throws(() => readGroup(reply, compared), { code: 'STUDIO_REPLY_UNUSABLE' });
});

test('documents are rendered from the records and are safe to open in a sheet or a Markdown viewer', () => {
  const studio = initialStudio();
  const risky = createItem(studio, { kind: 'requirement', name: '=HYPERLINK("x") | 표', fields: { category: 'SFR', definition: '줄\n바꿈과 | 세로줄', details: ['@합계'] }, evidence: cite('C-1') });
  requirement(studio, '초안으로 남는 것', ['x']);
  setItemStatus(studio, risky.id, 'confirmed');
  createItem(studio, { kind: 'entity-def', name: '예약 "건"', fields: { description: '예약', attributes: [{ name: '번호' }], relations: [{ target: '예약 "건"', cardinality: '1:N' }] }, evidence: cite('C-1') });
  const context = { project: { name: '합성 사업' }, clauses, now: NOW };
  assert.deepEqual(documentList(studio).map(entry => entry.id), ['requirements', 'requirements-sheet', 'rtm', 'function-tree', 'entity-def', 'attribute-def', 'erd', 'screen-def']);
  const sheet = renderDocument(studio, 'requirements-sheet', context).content;
  assert.ok(sheet.startsWith('﻿"고유번호"'));
  assert.match(sheet, /"SFR-001","SFR","'=HYPERLINK\(""x""\) \| 표"/);
  assert.match(sheet, /"'@합계"/);
  const definition = renderDocument(studio, 'requirements', context).content;
  assert.match(definition, /\| 요구사항 명칭 \| =HYPERLINK\("x"\) \\\| 표 \|/);
  assert.match(definition, /줄 바꿈과 \\\| 세로줄/);
  assert.doesNotMatch(definition, /초안으로 남는 것/);
  assert.match(definition, /초안 1건은 싣지 않음/);
  assert.match(renderDocument(studio, 'erd', context).content, /E1\["예약 건"\] \{\n {4}string A1 "번호"\n {2}\}\n {2}E1 \|\|--o\{ E1 : "1:N"/);
  assert.match(renderDocument(studio, 'rtm', context).content, /"고유번호","요구사항","출처 문서","기능분해도","엔터티정의서","화면설계서","스토리"/);
  // A stored branch is drawn as stored; a continuation that names no step is shown as text, and a person's answer is in the document.
  studio.enabled.push('business-flow');
  const flow = createItem(studio, { kind: 'business-flow', name: '예약 검토', fields: { description: '검토 흐름', participants: ['담당자'], steps: [{ order: '1', actor: '담당자', activity: '검토', next: '2 또는 3' }, { order: '2', activity: '승인', next: '종료' }, { order: '3', activity: '반려' }, { order: '4', activity: '통지' }] }, evidence: cite('C-1') });
  flow.note = '반려 통지는 문자로 한다';
  const drawn = renderDocument(studio, 'business-flow', context).content;
  assert.match(drawn, / {2}S1 --> S2\n {2}S1 --> S3\n {2}S2 -\.-> T2_1\(\["종료"\]\)\n {2}S3 --> S4\n```/);
  assert.doesNotMatch(drawn, /S2 --> S3/);
  assert.match(drawn, /\| 결정·메모 \| 반려 통지는 문자로 한다 \|/);
  for (const id of ['crud-matrix', 'stories', 'package-ST-0001', 'nope', undefined]) assert.throws(() => renderDocument(studio, id, context), { code: 'STUDIO_DOCUMENT_NOT_FOUND' });
  assert.ok(fieldsOf('requirement').length > 0);
});
