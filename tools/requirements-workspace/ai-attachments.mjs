import { createHash } from 'node:crypto';
import sharp from 'sharp';
const images = new Set(['png', 'jpg', 'jpeg', 'webp', 'tif', 'tiff']);
const fail = code => { throw Object.assign(new Error(code), { code }); };
export async function prepareVisualAttachments(snapshot, sourceFile, { signal } = {}) {
  const attachments = [], sources = []; let total = 0;
  if (signal?.aborted) fail('AI_CANCELLED');
  for (const job of snapshot.metadata.imports ?? []) {
    if (job.status !== 'ready' || (!images.has(job.format) && job.format !== 'pdf')) continue;
    const source = snapshot.backlog.sources.find(source => source.id === job.sourceId); if (!source) continue;
    if (signal?.aborted) fail('AI_CANCELLED');
    if (attachments.length >= 100 || typeof sourceFile !== 'function') fail('AI_ATTACHMENT_INVALID');
    const original = sourceFile(job.sourceId);
    if (original.sha256 !== source.fileSha256 || typeof original.base64 !== 'string' || original.base64.length > 28 * 1024 ** 2) fail('AI_ATTACHMENT_INVALID');
    const bytes = Buffer.from(original.base64, 'base64');
    if (bytes.toString('base64') !== original.base64 || createHash('sha256').update(bytes).digest('hex') !== original.sha256) fail('AI_ATTACHMENT_INVALID');
    let normalized, mediaType = 'image/jpeg';
    if (job.format === 'pdf') {
      if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) fail('AI_ATTACHMENT_INVALID');
      normalized = bytes; mediaType = 'application/pdf';
    } else try {
      const options = { failOn: 'error', limitInputPixels: 40_000_000 };
      const metadata = await sharp(bytes, options).metadata();
      if ((metadata.pages ?? 1) > 1) fail('AI_ATTACHMENT_INVALID');
      normalized = await sharp(bytes, options).rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 90 }).toBuffer();
    } catch { fail('AI_ATTACHMENT_INVALID'); }
    total += normalized.length;
    if (signal?.aborted) fail('AI_CANCELLED');
    if (total > 20 * 1024 ** 2) fail('AI_ATTACHMENT_INVALID');
    attachments.push({ mediaType, base64: normalized.toString('base64') });
    sources.push({ sourceId: source.id, title: source.title, originalSha256: original.sha256, attachmentIndex: attachments.length });
  }
  return { attachments, sources };
}
