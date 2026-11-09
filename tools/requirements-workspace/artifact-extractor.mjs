import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertExternalWorkspace } from './store.mjs';
import { scanBacklogForPiiAndSecrets } from '../../scripts/export-deliverables-workspace.mjs';
import { collectSensitivityWarnings } from './privacy-warnings.mjs';
const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
export const MAX_ARTIFACT_BYTES = 20 * 1024 ** 2;
export const ARTIFACT_EXTENSIONS = ['txt', 'md', 'html', 'htm', 'hwp', 'hwpx', 'docx', 'xlsx', 'xls', 'pdf', 'pptx', 'png', 'jpg', 'jpeg', 'webp', 'tif', 'tiff'];
const error = code => Object.assign(new Error(code), { code });
export function validateArtifactInput({ filename, bytes }) {
  if (typeof filename !== 'string' || filename.length > 200 || filename.trim() !== filename || /[\u0000-\u001f/\\:]/.test(filename) || !filename.trim()) throw error('FILE_NAME_INVALID');
  const format = extname(filename).slice(1).toLowerCase();
  if (!ARTIFACT_EXTENSIONS.includes(format)) throw error('FILE_TYPE_UNSUPPORTED');
  if (!Buffer.isBuffer(bytes) || !bytes.length) throw error('FILE_EMPTY');
  if (bytes.length > MAX_ARTIFACT_BYTES) throw error('FILE_TOO_LARGE');
  const hex = bytes.subarray(0, 16).toString('hex');
  const signature = { pdf: /^255044462d/, hwpx: /^504b0304/, docx: /^504b0304/, xlsx: /^504b0304/, pptx: /^504b0304/, xls: /^d0cf11e0a1b11ae1/, hwp: /^(d0cf11e0a1b11ae1|48575020)/, png: /^89504e470d0a1a0a/, jpg: /^ffd8/, jpeg: /^ffd8/, webp: /^52494646[0-9a-f]{8}57454250/, tif: /^(49492a00|4d4d002a)/, tiff: /^(49492a00|4d4d002a)/ }[format];
  if (signature && !signature.test(hex)) throw error('FILE_SIGNATURE_INVALID');
  return format;
}
export function extractTextUnits(bytes, format, { onWarning = () => {}, sensitiveData = 'error', onSensitivity = () => {} } = {}) {
  let text;
  try {
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) text = new TextDecoder('utf-16le', { fatal: true }).decode(bytes);
    else if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) text = new TextDecoder('utf-16be', { fatal: true }).decode(bytes);
    else text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch { throw error('FILE_ENCODING_INVALID'); }
  if (text.includes('\0')) throw error('FILE_ENCODING_INVALID');
  if (scanBacklogForPiiAndSecrets({ project: { rawDocument: text } }).length) {
    if (sensitiveData !== 'warning') throw error('FILE_SENSITIVE_INPUT');
    onSensitivity(text);
  }
  if (['html', 'htm'].includes(format)) {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM(text);
    try {
      const document = dom.window.document;
      if (document.querySelector('img,svg,canvas,video,input[type="image"]')) onWarning('DOCUMENT_HTML_VISUAL_UNAVAILABLE');
      document.querySelectorAll('script,style,head,iframe,object,embed,template,noscript,[hidden],[aria-hidden="true"]').forEach(element => element.remove());
      document.querySelectorAll('img[alt]').forEach(element => element.replaceWith(document.createTextNode(`\n[이미지 대체 텍스트] ${element.getAttribute('alt')}\n`)));
      [...document.querySelectorAll('table')].reverse().forEach((table, index) => {
        const rows = [...table.querySelectorAll('tr')].filter(row => row.closest('table') === table).map(row => '| ' + [...row.children].filter(cell => ['TD', 'TH'].includes(cell.tagName)).map(cell => {
          const spans = `${cell.rowSpan !== 1 ? `[rowspan=${cell.rowSpan}] ` : ''}${cell.colSpan !== 1 ? `[colspan=${cell.colSpan}] ` : ''}`;
          return spans + cell.textContent.trim().replaceAll('|', '\\|').replace(/\s*\n\s*/g, ' ');
        }).join(' | ') + ' |');
        table.replaceWith(document.createTextNode(`\n\n[HTML 표 ${index + 1}]\n${rows.join('\n')}\n\n`));
      });
      document.querySelectorAll('p,div,section,li,tr,h1,h2,h3,h4,h5,h6,br').forEach(element => element.after(document.createTextNode('\n\n')));
      text = document.body.textContent.replace(/\n{3,}/g, '\n\n').trim();
    } finally { dom.window.close(); }
  }
  return [{ locator: '본문', text }];
}
function segments(filename, units) {
  const result = []; let bytes = 0;
  for (const unit of units) {
    if (typeof unit.text !== 'string' || typeof unit.locator !== 'string') throw error('FILE_EXTRACTION_FAILED');
    const paragraphs = unit.text.replace(/\r\n/g, '\n').split(/\n[ \t]*\n+/).filter(text => text.trim());
    for (const [index, paragraph] of paragraphs.entries()) {
      let offset = 0, part = 0;
      while (offset < paragraph.length) {
        let end = Math.min(offset + 1800, paragraph.length);
        if (end < paragraph.length && /[\uD800-\uDBFF]/.test(paragraph[end - 1])) end--;
        const text = paragraph.slice(offset, end); offset = end; part++;
        bytes += Buffer.byteLength(text);
        if (bytes > 512 * 1024 || result.length >= 3000) throw error('FILE_TEXT_TOO_LARGE');
        result.push({ locator: `${filename} / ${unit.locator} / 문단 ${index + 1}.${part}`, text });
      }
    }
  }
  if (!result.length) throw error('FILE_NO_TEXT');
  return result;
}
export function parseInChild(bytes, format, { cwd, ocr, signal, timeoutMs = 180000, documentInput = false, sensitiveData = 'error' }) {
  if (!cwd) throw error('FILE_WORKSPACE_REQUIRED');
  assertExternalWorkspace(cwd);
  if (signal?.aborted) throw error('FILE_CANCELLED');
  return new Promise((resolve, reject) => {
    const allowed = /^(PATH|PATHEXT|SystemRoot|WINDIR|HOME|USERPROFILE|HOMEDRIVE|HOMEPATH|APPDATA|LOCALAPPDATA|TEMP|TMP|TMPDIR|HTTP_PROXY|HTTPS_PROXY|NO_PROXY|KORDOC_OFFLINE)$/i;
    const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.test(key))), KORDOC_ROOT: cwd };
    let child, reason, count = 0, settled = false, forceTimer; const chunks = [];
    const finish = (failure, value) => { if (settled) return; settled = true; clearTimeout(timer); clearTimeout(forceTimer); signal?.removeEventListener('abort', abort); failure ? reject(error(failure)) : resolve(value); };
    const stop = code => { reason ??= code; child?.kill('SIGTERM'); forceTimer ??= setTimeout(() => { if (child?.exitCode === null) child.kill('SIGKILL'); }, 1000); forceTimer.unref(); };
    const abort = () => stop('FILE_CANCELLED');
    const timer = setTimeout(() => stop('FILE_TIMEOUT'), timeoutMs); timer.unref();
    const maxBytes = documentInput ? 32 * 1024 ** 2 : 2 * 1024 ** 2;
    try { child = spawn(process.execPath, ['--max-old-space-size=384', fileURLToPath(new URL(documentInput ? './document-input-worker.mjs' : './artifact-worker.mjs', import.meta.url))], { cwd, shell: false, windowsHide: true, env, stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch { finish('FILE_EXTRACTION_FAILED'); return; }
    signal?.addEventListener('abort', abort, { once: true }); if (signal?.aborted) abort();
    child.stdout.on('data', chunk => { count += chunk.length; if (count > maxBytes) stop('FILE_TEXT_TOO_LARGE'); else if (!reason) chunks.push(chunk); });
    child.stderr.on('data', chunk => { count += chunk.length; if (count > maxBytes) stop('FILE_TEXT_TOO_LARGE'); });
    child.on('error', () => finish('FILE_EXTRACTION_FAILED'));
    child.on('close', code => {
      if (reason || code !== 0) { finish(reason ?? 'FILE_EXTRACTION_FAILED'); return; }
      try {
        const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
        if (value.errorCode) { finish(/^FILE_[A-Z_]{2,80}$/.test(value.errorCode) ? value.errorCode : 'FILE_EXTRACTION_FAILED'); return; }
        if (!Array.isArray(value.units) || !Array.isArray(value.warningCodes) || !['local-text', 'local-ocr', 'local-document'].includes(value.method)) { finish('FILE_EXTRACTION_FAILED'); return; }
        finish(null, value);
      } catch { finish('FILE_EXTRACTION_FAILED'); }
    });
    child.stdin.on('error', () => {}); child.stdin.end(JSON.stringify({ format, base64: bytes.toString('base64'), ocr: ocr === true, sensitiveData }));
  });
}
export async function extractArtifact(input, { cwd, ocr = true, signal, timeoutMs = 180000, sensitiveData = 'error' } = {}) {
  const format = validateArtifactInput(input);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10 * 60 * 1000) throw error('FILE_CONFIGURATION_INVALID');
  if (signal?.aborted) throw error('FILE_CANCELLED');
  const plain = ['txt', 'md'].includes(format);
  let sensitivityWarnings = [];
  const parsed = plain ? { units: extractTextUnits(input.bytes, format, { sensitiveData, onSensitivity: text => { sensitivityWarnings = collectSensitivityWarnings({ text }); } }), sensitivityWarnings, warningCodes: [], method: 'local-text', needsReview: false } : await parseInChild(input.bytes, format, { cwd, ocr, signal, timeoutMs, sensitiveData });
  return { filename: input.filename, format, sha256: createHash('sha256').update(input.bytes).digest('hex'), segments: segments(input.filename, parsed.units), method: parsed.method, warningCodes: parsed.warningCodes, sensitivityWarnings: parsed.sensitivityWarnings ?? [], needsReview: parsed.needsReview === true };
}
