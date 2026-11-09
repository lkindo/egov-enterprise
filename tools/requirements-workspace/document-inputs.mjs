import { extname } from 'node:path';
import { createHash } from 'node:crypto';
import { ARTIFACT_EXTENSIONS, validateArtifactInput, extractTextUnits, parseInChild } from './artifact-extractor.mjs';
import { collectSensitivityWarnings, mergeSensitivityWarnings, PRIVATE_ANALYSIS_VALIDATION } from './privacy-warnings.mjs';
const fail = code => { throw Object.assign(new Error(code), { code }); };
const executable = /^(?:4d5a|7f454c46|cafebabe|feedface|feedfacf)/i;
const forbidden = new Set(['exe', 'dll', 'com', 'bat', 'cmd', 'ps1', 'sh', 'msi', 'scr', 'jar']);
export function documentFormat(input) {
  if (typeof input.filename !== 'string' || input.filename.length > 200 || !input.filename.trim() || input.filename.trim() !== input.filename || /[\u0000-\u001f/\\:]/.test(input.filename)) fail('FILE_NAME_INVALID');
  const extension = extname(input.filename ?? '').slice(1).toLowerCase();
  if (ARTIFACT_EXTENSIONS.includes(extension)) return validateArtifactInput(input);
  if (forbidden.has(extension) || !Buffer.isBuffer(input.bytes) || executable.test(input.bytes.subarray(0, 4).toString('hex'))) fail('FILE_TYPE_UNSUPPORTED');
  validateArtifactInput({ ...input, filename: 'document.txt' });
  // Unknown text containers can still be read. Unknown binary formats need a
  // converter; a renamed binary must never be claimed as readable text.
  try { extractTextUnits(input.bytes, 'txt', PRIVATE_ANALYSIS_VALIDATION); } catch { fail('FILE_TYPE_UNSUPPORTED'); }
  return 'txt';
}
export async function prepareDocumentInputs(input, options = {}) {
  if (options.signal?.aborted) fail('AI_CANCELLED');
  const format = documentFormat(input);
  const raw = ['txt', 'md'].includes(format)
    ? { units: extractTextUnits(input.bytes, format, PRIVATE_ANALYSIS_VALIDATION).map(unit => ({ ...unit, attachment: null })), warningCodes: [], method: 'local-text' }
    : await parseInChild(input.bytes, format, { ...options, ...PRIVATE_ANALYSIS_VALIDATION, documentInput: true });
  if (options.signal?.aborted) fail('AI_CANCELLED');
  if (raw.units.length > 200 || !raw.units.length) fail('FILE_DOCUMENT_CAPACITY');
  let textBytes = 0, visualBytes = 0;
  const parts = raw.units.flatMap(unit => {
    if (!unit.text || Buffer.byteLength(unit.text) <= 16 * 1024) return [unit];
    const result = []; let text = unit.text;
    while (text) {
      let length = 0, size = 0;
      for (const character of text) { const bytes = Buffer.byteLength(character); if (size + bytes > 16 * 1024) break; size += bytes; length += character.length; }
      if (length < text.length) { const newline = text.lastIndexOf('\n', length - 1); if (newline > length / 2) length = newline + 1; }
      result.push({ ...unit, locator: `${unit.locator} / 구간 ${result.length + 1}`, text: text.slice(0, length), attachment: result.length ? null : unit.attachment }); text = text.slice(length);
    }
    return result;
  });
  if (parts.length > 200) fail('FILE_DOCUMENT_CAPACITY');
  const units = parts.map((unit, index) => {
    if (typeof unit.locator !== 'string' || !unit.locator.trim() || !(unit.text === null || typeof unit.text === 'string')) fail('FILE_EXTRACTION_FAILED');
    textBytes += Buffer.byteLength(unit.text ?? '');
    if (textBytes > 512 * 1024) fail('FILE_TEXT_TOO_LARGE');
    if (unit.attachment) {
      if (unit.attachment.mediaType !== 'image/jpeg' || typeof unit.attachment.base64 !== 'string') fail('FILE_EXTRACTION_FAILED');
      const bytes = Buffer.from(unit.attachment.base64, 'base64'); visualBytes += bytes.length;
      if (bytes.toString('base64') !== unit.attachment.base64 || !bytes.subarray(0, 2).equals(Buffer.from([0xff, 0xd8])) || bytes.length > 5 * 1024 ** 2 || visualBytes > 22 * 1024 ** 2) fail('FILE_DOCUMENT_CAPACITY');
    }
    if (unit.purpose !== undefined && unit.purpose !== 'layout-context') fail('FILE_EXTRACTION_FAILED');
    return { id: `U-${index + 1}`, locator: unit.locator, text: unit.text?.trim() ? unit.text : null, ...(unit.purpose ? { purpose: unit.purpose } : {}), ...(unit.nativeReference ? { nativeReference: unit.nativeReference } : {}), attachment: unit.attachment ?? null };
  });
  const sensitivityWarnings = mergeSensitivityWarnings(raw.sensitivityWarnings, collectSensitivityWarnings({ filename: input.filename, units: units.map(({ attachment, ...unit }) => unit) }));
  return { format, sha256: createHash('sha256').update(input.bytes).digest('hex'), units, warningCodes: raw.warningCodes, sensitivityWarnings };
}
