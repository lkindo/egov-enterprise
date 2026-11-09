import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { prepareDocumentInputs } from './document-inputs.mjs';

test('scanned PDF and image inputs reach the vision stage with page identity even without local OCR text', async t => {
  const cwd = mkdtempSync(join(tmpdir(), 'synthetic-ai-inputs-')); t.after(() => rmSync(cwd, { recursive: true, force: true }));
  for (const filename of ['scanned-receipt.pdf', 'receipt.png']) {
    const result = await prepareDocumentInputs({ filename, bytes: readFileSync(new URL(`./test-fixtures/${filename}`, import.meta.url)) }, { cwd });
    assert.ok(result.units.length);
    assert.ok(result.units.every(unit => unit.id && unit.locator && unit.attachment?.base64));
    assert.ok(result.units.some(unit => !unit.text));
    assert.ok(result.units.every(unit => unit.attachment.mediaType === 'image/jpeg'));
  }
});

test('Office/native content preserves exact text as evidence and unknown text extensions remain readable', async t => {
  const cwd = mkdtempSync(join(tmpdir(), 'synthetic-ai-native-')); t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const doc = await prepareDocumentInputs({ filename: 'receipt.docx', bytes: readFileSync(new URL('./test-fixtures/receipt.docx', import.meta.url)) }, { cwd });
  assert.ok(doc.units.some(unit => unit.text?.includes('접수')));
  const raw = '등록자는 접수 상태와 처리 기한을 확인한다.';
  const text = await prepareDocumentInputs({ filename: 'memo.custom', bytes: Buffer.from(raw) }, { cwd });
  assert.equal(text.units.map(unit => unit.text).join(''), raw);
  assert.equal(text.format, 'txt');
  const long = '업무 조건과 예외를 보존한다.\n'.repeat(2500);
  const large = await prepareDocumentInputs({ filename: 'long.txt', bytes: Buffer.from(long) }, { cwd });
  assert.equal(large.units.map(unit => unit.text).join(''), long);
  assert.ok(large.units.every(unit => Buffer.byteLength(unit.text) <= 16 * 1024));
});

test('executables, corrupt declared documents and pre-cancelled preparation do not reach model input; sensitivity is advisory', async () => {
  await assert.rejects(prepareDocumentInputs({ filename: 'document.pdf', bytes: Buffer.from('MZ executable') }), { code: 'FILE_SIGNATURE_INVALID' });
  await assert.rejects(prepareDocumentInputs({ filename: 'payload.exe', bytes: Buffer.from('MZ executable') }), { code: 'FILE_TYPE_UNSUPPORTED' });
  await assert.rejects(prepareDocumentInputs({ filename: '../memo.custom', bytes: Buffer.from('합성 자료') }), { code: 'FILE_NAME_INVALID' });
  const prepared = await prepareDocumentInputs({ filename: 'memo.txt', bytes: Buffer.from('연락처 010-1234-5678') });
  assert.equal(prepared.units[0].text, '연락처 010-1234-5678');
  assert.ok(prepared.sensitivityWarnings.some(warning => warning.kind === 'mobile-phone'));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(prepareDocumentInputs({ filename: 'memo.txt', bytes: Buffer.from('합성 업무 자료') }, { signal: controller.signal }), { code: 'AI_CANCELLED' });
});

test('heterogeneous Office and Korean documents retain their native evidence even when a renderer is available', async t => {
  const cwd = mkdtempSync(join(tmpdir(), 'synthetic-ai-formats-')); t.after(() => rmSync(cwd, { recursive: true, force: true }));
  for (const extension of ['hwp', 'hwpx', 'xls', 'xlsx', 'pptx']) {
    const filename = `receipt.${extension}`;
    const result = await prepareDocumentInputs({ filename, bytes: readFileSync(new URL(`./test-fixtures/${filename}`, import.meta.url)) }, { cwd });
    assert.ok(result.units.some(unit => unit.text?.includes('접수')), `${extension}: native evidence must survive rendering`);
    assert.ok(result.units.every(unit => unit.locator && (unit.text || unit.attachment)));
  }
});

test('HTML tables preserve cell boundaries and missing visual elements are explicit', async t => {
  const cwd = mkdtempSync(join(tmpdir(), 'synthetic-ai-html-')); t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const result = await prepareDocumentInputs({ filename: 'mixed.html', bytes: Buffer.from('<table><tr><th>항목</th><th>한도</th></tr><tr><td>페이지 크기</td><td>20</td></tr></table><img src="https://invalid.example/diagram.png" alt="업무 흐름도">') }, { cwd });
  const text = result.units.map(unit => unit.text ?? '').join('\n');
  assert.match(text, /항목\s*\|\s*한도/); assert.match(text, /페이지 크기\s*\|\s*20/);
  assert.ok(result.warningCodes.includes('DOCUMENT_HTML_VISUAL_UNAVAILABLE'));
});
