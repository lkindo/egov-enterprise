// Dedicated bounded parser process. It receives bytes through stdin, not a
// caller-controlled path, and returns text/locations, never document scripts.
import { scanBacklogForPiiAndSecrets } from '../../scripts/export-deliverables-workspace.mjs';
import { extractTextUnits } from './artifact-extractor.mjs';
import { collectSensitivityWarnings, mergeSensitivityWarnings } from './privacy-warnings.mjs';
const MAX_INPUT = 29 * 1024 ** 2;
let size = 0;
const chunks = [];
console.log = console.info = console.warn = console.error = () => {};
try {
  for await (const chunk of process.stdin) { size += chunk.length; if (size > MAX_INPUT) throw new Error('FILE_TOO_LARGE'); chunks.push(chunk); }
  const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const bytes = Buffer.from(input.base64, 'base64');
  let parsed, sensitivityWarnings = [];
  if (['html', 'htm'].includes(input.format)) {
    parsed = { units: extractTextUnits(bytes, input.format, { sensitiveData: input.sensitiveData, onSensitivity: text => { sensitivityWarnings = collectSensitivityWarnings({ text }); } }), warningCodes: [], method: 'local-text', needsReview: false };
  } else {
  const parsers = await import('kordoc');
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const parser = ({ hwpx: 'parseHwpx', docx: 'parseDocx', xlsx: 'parseXlsx', xls: 'parseXls', pdf: 'parsePdf', pptx: 'parsePptx', png: 'parseImage', jpg: 'parseImage', jpeg: 'parseImage', webp: 'parseImage', tif: 'parseImage', tiff: 'parseImage', hwp: 'parse' })[input.format];
  if (!parser) throw new Error('FILE_TYPE_UNSUPPORTED');
  const result = await parsers[parser](buffer, { ocr: input.ocr === true, ocrLines: true, ocrDet: 'mobile', plain: true, removeHeaderFooter: false, memos: false });
  if (!result.success) throw new Error(/PASSWORD|ENCRYPT/i.test(result.code ?? '') ? 'FILE_ENCRYPTED' : 'FILE_EXTRACTION_FAILED');
  const decoded = { metadata: [], memos: [], blocks: [] }; let decodedBytes = 0; const seen = new Set();
  function collect(value, bucket, depth = 0) {
    if (depth > 64) throw new Error('FILE_EXTRACTION_FAILED');
    if (typeof value === 'string') { decodedBytes += Buffer.byteLength(value); if (decodedBytes > 4 * 1024 ** 2) throw new Error('FILE_TEXT_TOO_LARGE'); bucket.push(value); return; }
    if (!value || typeof value !== 'object' || ArrayBuffer.isView(value) || value instanceof ArrayBuffer || seen.has(value)) return;
    seen.add(value);
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) if (descriptor.enumerable && 'value' in descriptor) collect(descriptor.value, bucket, depth + 1);
  }
  collect(result.metadata, decoded.metadata); collect(result.memos, decoded.memos); collect(result.blocks, decoded.blocks);
  if (scanBacklogForPiiAndSecrets({ project: decoded }).length) {
    if (input.sensitiveData !== 'warning') throw new Error('FILE_SENSITIVE_INPUT');
    sensitivityWarnings = mergeSensitivityWarnings(sensitivityWarnings, collectSensitivityWarnings(decoded));
  }
  const units = result.pages?.length ? result.pages.map(page => ({ locator: `${result.metadata?.pageMode === 'section' ? '섹션' : ['xlsx', 'xls'].includes(input.format) ? '시트' : '페이지'} ${page.pageNumber}`, text: page.markdown })) : [{ locator: '문서 본문', text: result.markdown }];
  const warningCodes = [...new Set((result.warnings ?? []).map(warning => /^[A-Z][A-Z0-9_]{1,80}$/.test(warning.code ?? '') ? warning.code : 'EXTRACTION_NOTICE'))];
  const usedOcr = Boolean(result.isImageBased || result.ocrLines?.length || ['png', 'jpg', 'jpeg', 'webp', 'tif', 'tiff'].includes(input.format));
  parsed = { units, warningCodes, method: usedOcr ? 'local-ocr' : 'local-document', needsReview: usedOcr || Boolean(result.qualitySummary?.needsOcr) || warningCodes.length > 0 };
  }
  const output = JSON.stringify({ ...parsed, sensitivityWarnings });
  if (Buffer.byteLength(output) > 1024 ** 2) throw new Error('FILE_TEXT_TOO_LARGE');
  process.stdout.write(output, () => process.exit(0));
} catch (error) {
  const code = /^FILE_[A-Z_]{2,80}$/.test(error.message ?? '') ? error.message : 'FILE_EXTRACTION_FAILED';
  process.stdout.write(JSON.stringify({ errorCode: code }), () => process.exit(0));
}
