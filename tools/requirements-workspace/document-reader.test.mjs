import test from 'node:test';
import assert from 'node:assert/strict';
import { readDocument } from './document-reader.mjs';
const native = { id: 'U-1', locator: '본문', text: '담당자는 본인 접수 목록을 조회한다.', attachment: null };
const visual = { id: 'U-2', locator: '페이지 2', text: null, attachment: { mediaType: 'image/png', base64: 'aGVsbG8=' } };
const input = { filename: 'synthetic.pdf', bytes: Buffer.from('%PDF-synthetic') };
const preparation = units => async () => ({ format: 'pdf', units, warningCodes: [] });
const output = (units, change = {}) => ({ documentTypes: ['other'], summary: '접수 업무의 담당 범위와 조회 절차를 설명한다.', blocks: units.map(unit => ({ inputId: unit.id, heading: '접수 조회', kind: 'paragraph', text: unit.text ? null : '접수 상태를 조회한다.', certainty: 'clear', note: '명시된 조회 업무' })), unreadable: [], ...change });

test('AI reads visual units directly and keeps native text separate from interpretation without a local OCR dependency', async () => {
  let request, calls = 0;
  const result = await readDocument(input, { cwd: 'unused-by-injected-adapter', sourceType: 'interview', prepare: preparation([native, visual]), execute: async arg => { calls++; request = arg; return { output: output([native, visual]) }; } });
  assert.equal(calls, 1);
  assert.equal(request.attachments.length, 1);
  assert.match(request.request.instructions, /발언자의 확정 결정/);
  assert.equal(result.segments[0].text, native.text);
  assert.ok(result.segments.some(segment => segment.text === '접수 상태를 조회한다.'));
  assert.equal(result.reading.provenance[1].kind, 'ai-transcription');
  assert.equal(result.reading.provenance[0].kind, 'native-text');
  assert.equal(result.method, 'ai-document');
  assert.notEqual(result.summary, '로컬 문서 추출');
});

test('unseen units, lost units and fabricated native quotations are rejected before they become source evidence', async () => {
  for (const bad of [
    output([native], { blocks: [{ ...output([native]).blocks[0], inputId: 'U-99' }] }),
    output([native], { blocks: [] }),
    output([native], { blocks: [{ ...output([native]).blocks[0], text: '모든 부서 자료를 수정할 수 있다.' }] }),
  ]) await assert.rejects(readDocument(input, { prepare: preparation([native]), execute: async () => ({ output: bad }) }), { code: 'AI_DOCUMENT_OUTPUT_INVALID' });
});

test('unreadable visual regions remain review findings and a wholly unreadable document is never presented as successfully read', async () => {
  const result = await readDocument(input, { prepare: preparation([native, visual]), execute: async () => ({ output: output([native], { unreadable: [{ inputId: 'U-2', reason: '작은 숫자가 번져 원본 대조가 필요하다.' }] }) }) });
  assert.equal(result.needsReview, true);
  assert.equal(result.reading.unreadable.length, 1);
  await assert.rejects(readDocument(input, { prepare: preparation([visual]), execute: async () => ({ output: output([], { unreadable: [{ inputId: 'U-2', reason: '본문을 읽을 수 없다.' }] }) }) }), { code: 'AI_DOCUMENT_UNREADABLE' });
});

test('reading cancellation stops later chunks and sensitive model output is rejected', async () => {
  const controller = new AbortController(); let calls = 0;
  const units = Array.from({ length: 12 }, (_, index) => ({ ...visual, id: `U-${index + 1}`, locator: `페이지 ${index + 1}` }));
  await assert.rejects(readDocument(input, { signal: controller.signal, prepare: preparation(units), execute: async ({ request }) => { calls++; controller.abort(); return { output: output(request.data.units) }; } }), { code: 'AI_CANCELLED' });
  assert.equal(calls, 1);
  await assert.rejects(readDocument(input, { prepare: preparation([native]), execute: async () => ({ output: output([native], { summary: '연락처 010-1234-5678로 회신한다.' }) }) }), { code: 'AI_DOCUMENT_SENSITIVE_OUTPUT' });
});

test('AI detected document roles select the relevant instructions for following parts of a mixed or unknown document', async () => {
  const units = Array.from({ length: 9 }, (_, index) => ({ ...native, id: `U-${index + 1}`, locator: `구간 ${index + 1}` }));
  const prompts = [];
  const result = await readDocument(input, { sourceType: 'other', prepare: preparation(units), execute: async ({ request }) => {
    prompts.push(request.instructions);
    return { output: { ...output(request.data.units), documentTypes: ['regulation'] } };
  } });
  assert.equal(prompts.length, 2); assert.doesNotMatch(prompts[0], /법령의 적용/); assert.match(prompts[1], /법령의 적용/);
  assert.deepEqual(result.reading.documentTypes, ['regulation']);
});

test('unreadable embedded visuals remain explicit even when the available native text was read successfully', async () => {
  const result = await readDocument(input, { prepare: async () => ({ format: 'docx', units: [native], warningCodes: ['DOCUMENT_IMAGE_UNREADABLE'] }), execute: async () => ({ output: output([native]) }) });
  assert.equal(result.needsReview, true);
  assert.deepEqual(result.reading.warningCodes, ['DOCUMENT_IMAGE_UNREADABLE']);
});

test('a diagram without text remains explicitly labelled visual interpretation rather than fabricated original text', async () => {
  const result = await readDocument(input, { prepare: preparation([visual]), execute: async () => ({ output: output([], { blocks: [{ inputId: visual.id, heading: '업무 흐름도', kind: 'figure', text: null, certainty: 'uncertain', note: '두 단계 사이에 화살표가 있지만 단계 이름은 보이지 않는다.' }] }) }) });
  assert.match(result.segments[0].text, /AI 시각 해석.*원문 전사 아님/);
  assert.equal(result.reading.provenance[0].kind, 'ai-visual-interpretation');
  assert.equal(result.needsReview, true);
});

test('mixed, blank and unreadable visual inputs do not masquerade as a uniform successful transcription', async () => {
  const units = [visual, { ...visual, id: 'U-3' }, { ...visual, id: 'U-4' }];
  const result = await readDocument(input, { prepare: preparation(units), execute: async () => ({ output: output([], {
    blocks: [{ ...output([visual]).blocks[0] }, { inputId: visual.id, heading: '도형', kind: 'figure', text: null, certainty: 'uncertain', note: '표 옆 도형의 의미는 확인이 필요하다.' }, { inputId: 'U-3', heading: '빈 쪽', kind: 'blank', text: null, certainty: 'clear', note: '빈 페이지다.' }], unreadable: [{ inputId: 'U-4', reason: '흐려서 읽을 수 없다.' }]
  }) }) });
  assert.deepEqual(result.reading.provenance.map(item => item.kind), ['ai-mixed', 'blank', 'unreadable']);
});

test('supplemental layout images do not duplicate the preserved native document text', async () => {
  const layout = { ...visual, purpose: 'layout-context' };
  const result = await readDocument(input, { prepare: preparation([native, layout]), execute: async ({ request }) => {
    assert.match(request.instructions, /do not transcribe it again/);
    assert.equal(request.data.units[1].purpose, 'layout-context');
    return { output: output([native], { blocks: [...output([native]).blocks, { inputId: layout.id, heading: '원본 레이아웃', kind: 'note', text: null, certainty: 'clear', note: '네이티브 본문과 같은 내용을 표 형태로 배치했다.' }] }) };
  } });
  assert.equal(result.segments.length, 1); assert.equal(result.segments[0].text, native.text);
  assert.equal(result.reading.provenance[1].kind, 'visual-context');
});

test('native PDF critical facts independently flag a confident wrong transcription and keep a reference hash', async () => {
  const page = { ...visual, nativeReference: '처리기간은 3일이며 타인 자료 열람은 불가하다.' };
  const result = await readDocument(input, { prepare: preparation([page]), execute: async () => ({ output: output([page], { blocks: [{ ...output([page]).blocks[0], text: '처리기간은 8일이며 타인 자료 열람은 가능하다.' }] }) }) });
  assert.equal(result.needsReview, true); assert.equal(result.reading.blocks[0].certainty, 'uncertain');
  assert.equal(result.reading.referenceChecks[0].status, 'mismatch'); assert.match(result.reading.referenceChecks[0].sha256, /^[a-f0-9]{64}$/);
});

test('native PDF content cannot be silently accepted as a clear blank page', async () => {
  const page = { ...visual, nativeReference: '담당자는 본인 소유 접수 목록만 조회할 수 있다.' };
  const result = await readDocument(input, { prepare: preparation([native, page]), execute: async () => ({ output: output([native], { blocks: [...output([native]).blocks, { inputId: page.id, heading: '빈 쪽', kind: 'blank', text: null, certainty: 'clear', note: '본문이 없다.' }] }) }) });
  assert.equal(result.needsReview, true); assert.ok(result.reading.unreadable.some(item => item.inputId === page.id));
});
