import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { prepareVisualAttachments } from './ai-attachments.mjs';
import sharp from 'sharp';
const bytes = readFileSync(new URL('./test-fixtures/receipt.png', import.meta.url));
const digest = createHash('sha256').update(bytes).digest('hex');
function snapshot() { return { backlog: { sources: [{ id: 'SRC-IMAGE', title: '합성 화면', fileSha256: digest }] }, metadata: { imports: [{ status: 'ready', sourceId: 'SRC-IMAGE', format: 'png' }] } }; }
const sourceFile = () => ({ base64: bytes.toString('base64'), sha256: digest });
test('only registered original images are normalized, stripped of metadata and explicitly mapped to source IDs', async () => {
  const result = await prepareVisualAttachments(snapshot(), sourceFile);
  assert.equal(result.attachments.length, 1);
  assert.equal(result.attachments[0].mediaType, 'image/jpeg');
  assert.deepEqual(result.sources.map(source => source.sourceId), ['SRC-IMAGE']);
  assert.equal(result.sources[0].originalSha256, digest);
  assert.equal(result.sources[0].attachmentIndex, 1);
  assert.equal(Buffer.from(result.attachments[0].base64, 'base64').subarray(0, 2).toString('hex'), 'ffd8');
});

test('actual JPEG/WebP/TIFF visual copies strip attached metadata and stay bound to their original hash', async () => {
  for (const format of ['jpeg', 'webp', 'tiff']) {
    const original = await sharp(bytes).withMetadata({ exif: { IFD0: { Artist: 'SYNTHETIC-METADATA' } } }).toFormat(format).toBuffer();
    const metadata = await sharp(original).metadata();
    assert.ok(metadata.icc);
    if (format !== 'tiff') assert.ok(metadata.exif, `${format} fixture must actually contain EXIF`);
    const hash = createHash('sha256').update(original).digest('hex'), state = snapshot();
    state.metadata.imports[0].format = format; state.backlog.sources[0].fileSha256 = hash;
    const result = await prepareVisualAttachments(state, () => ({ sha256: hash, base64: original.toString('base64') }));
    assert.equal((await sharp(Buffer.from(result.attachments[0].base64, 'base64')).metadata()).exif, undefined);
    assert.equal((await sharp(Buffer.from(result.attachments[0].base64, 'base64')).metadata()).icc, undefined);
    assert.equal(result.sources[0].originalSha256, hash);
  }
});
test('a changed original hash, cancelled operation and malformed image fail before model transmission', async () => {
  const state = snapshot(); state.backlog.sources[0].fileSha256 = 'f'.repeat(64);
  await assert.rejects(prepareVisualAttachments(state, sourceFile), { code: 'AI_ATTACHMENT_INVALID' });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(prepareVisualAttachments(snapshot(), sourceFile, { signal: controller.signal }), { code: 'AI_CANCELLED' });
  await assert.rejects(prepareVisualAttachments(snapshot(), () => ({ base64: 'AAAA', sha256: digest })), { code: 'AI_ATTACHMENT_INVALID' });
});
test('unregistered files and office-document bytes are never implicitly read or attached as images', async () => {
  const state = snapshot(); state.metadata.imports[0].format = 'docx';
  const result = await prepareVisualAttachments(state, () => { throw Error('must not read'); });
  assert.equal(result.attachments.length, 0);
});

test('registered PDF originals are attached as documents with the exact verified bytes', async () => {
  const pdf = readFileSync(new URL('./test-fixtures/receipt.pdf', import.meta.url));
  const hash = createHash('sha256').update(pdf).digest('hex'), state = snapshot();
  state.metadata.imports[0].format = 'pdf'; state.backlog.sources[0].fileSha256 = hash;
  const result = await prepareVisualAttachments(state, () => ({ sha256: hash, base64: pdf.toString('base64') }));
  assert.equal(result.attachments[0].mediaType, 'application/pdf');
  assert.ok(result.attachments[0].base64 === pdf.toString('base64'));
});
