import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractArtifact } from './artifact-extractor.mjs';

test('UTF-8 text and Markdown preserve original hash and explicit source locations without truncation', async () => {
  const bytes = Buffer.from('담당자는 본인 접수를 조회한다.\n\n승인자는 접수를 검토한다.', 'utf8');
  for (const filename of ['meeting.txt', 'meeting.md']) {
    const result = await extractArtifact({ filename, bytes });
    assert.match(result.sha256, /^[a-f0-9]{64}$/);
    assert.equal(result.segments.map(segment => segment.text).join('\n\n'), bytes.toString('utf8'));
    assert.ok(result.segments.every(segment => segment.locator.includes(filename)));
    assert.equal(result.method, 'local-text');
  }
});
test('HTML is read as inert content without scripts, hidden head metadata or external requests', async t => {
  const cwd = mkdtempSync(join(tmpdir(), 'synthetic-html-')); t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const result = await extractArtifact({ filename: 'screen.html', bytes: Buffer.from('<!doctype html><html><head><script>throw Error("EXECUTED")</script><title>숨김 제목</title></head><body><h1>접수 목록</h1><p>본인 접수만 조회</p><img src="https://unreachable.invalid/private"></body></html>') }, { cwd });
  const text = result.segments.map(segment => segment.text).join('\n');
  assert.match(text, /접수 목록/); assert.match(text, /본인 접수/);
  assert.doesNotMatch(text, /EXECUTED|숨김 제목|unreachable/);
});

test('sensitive text hidden in HTML attributes or scripts is detected before an original can be retained', async t => {
  const cwd = mkdtempSync(join(tmpdir(), 'synthetic-html-sensitive-')); t.after(() => rmSync(cwd, { recursive: true, force: true }));
  await assert.rejects(extractArtifact({ filename: 'hidden.html', bytes: Buffer.from('<html><head><script>const hidden="person@example.invalid"</script></head><body>접수 목록</body></html>') }, { cwd }), { code: 'FILE_SENSITIVE_INPUT' });
});

test('HTML parsing obeys the worker deadline instead of occupying the server event loop', async t => {
  const cwd = mkdtempSync(join(tmpdir(), 'synthetic-html-timeout-')); t.after(() => rmSync(cwd, { recursive: true, force: true }));
  await assert.rejects(extractArtifact({ filename: 'screen.html', bytes: Buffer.from('<p>합성 문서</p>') }, { cwd, timeoutMs: 1 }), { code: 'FILE_TIMEOUT' });
});
test('unsafe names, unsupported executables, malformed UTF-8, empty files and mismatched binary signatures fail closed', async () => {
  for (const input of [{ filename: '../private.txt', bytes: Buffer.from('text') }, { filename: 'file.exe', bytes: Buffer.from('text') }, { filename: 'broken.txt', bytes: Buffer.from([0xff, 0xfe, 0xff]) }, { filename: 'empty.txt', bytes: Buffer.alloc(0) }, { filename: 'wrong.pdf', bytes: Buffer.from('not a PDF') }]) {
    await assert.rejects(extractArtifact(input), error => /^FILE_/.test(error.code ?? '') && !error.message.includes('private'));
  }
});

test('BMP is rejected as unsupported before registration because the visual pipeline cannot decode it', async () => {
  await assert.rejects(extractArtifact({ filename: 'synthetic.bmp', bytes: Buffer.from('BMsynthetic') }), { code: 'FILE_TYPE_UNSUPPORTED' });
});
test('a large paragraph is split into traceable nonempty clauses, preserving every character', async () => {
  const text = '접수💡'.repeat(1200);
  const result = await extractArtifact({ filename: 'long.txt', bytes: Buffer.from(text) });
  assert.equal(result.segments.map(segment => segment.text).join(''), text);
  assert.ok(result.segments.every(segment => segment.text.length <= 1800 && segment.text.isWellFormed()));
  assert.ok(new Set(result.segments.map(segment => segment.locator)).size === result.segments.length);
});

test('local HWP/HWPX, DOCX, XLS/XLSX, PPTX and PDF parsers preserve known synthetic content and locations', async t => {
  const cwd = mkdtempSync(join(tmpdir(), 'synthetic-artifact-test-')); t.after(() => rmSync(cwd, { recursive: true, force: true }));
  for (const extension of ['hwp', 'hwpx', 'docx', 'xls', 'xlsx', 'pptx', 'pdf']) {
    const filename = `receipt.${extension}`, bytes = readFileSync(new URL(`./test-fixtures/${filename}`, import.meta.url));
    const result = await extractArtifact({ filename, bytes }, { cwd, ocr: false });
    assert.equal(result.format, extension);
    assert.match(result.segments.map(segment => segment.text).join('\n'), extension === 'pdf' ? /SYNTHETIC RECEIPT/ : /본인 접수/);
    assert.ok(result.segments.every(segment => segment.locator.includes(filename)));
  }
});

test('decoded document properties are scanned before original Office bytes can be retained', async t => {
  const cwd = mkdtempSync(join(tmpdir(), 'synthetic-metadata-test-')); t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const bytes = readFileSync(new URL('./test-fixtures/negative-metadata.docx', import.meta.url));
  await assert.rejects(extractArtifact({ filename: 'negative-metadata.docx', bytes }, { cwd, ocr: false }), { code: 'FILE_SENSITIVE_INPUT' });
});

test('actual local Korean OCR reads an image and a scanned PDF with traceable text', async t => {
  const cwd = mkdtempSync(join(tmpdir(), 'synthetic-ocr-test-')); t.after(() => rmSync(cwd, { recursive: true, force: true }));
  for (const filename of ['receipt.png', 'receipt.jpeg', 'receipt.webp', 'receipt.tiff', 'scanned-receipt.pdf']) {
    const bytes = readFileSync(new URL(`./test-fixtures/${filename}`, import.meta.url));
    const result = await extractArtifact({ filename, bytes }, { cwd });
    assert.equal(result.method, 'local-ocr');
    assert.equal(result.needsReview, true);
    assert.match(result.segments.map(segment => segment.text).join('\n'), /본인/);
    assert.ok(result.segments.every(segment => segment.locator.includes(filename)));
  }
});
