// Decode/render only. No customer scripts, macros, URLs, or local paths are run.
import sharp from 'sharp';
import { extractTextUnits } from './artifact-extractor.mjs';
import { scanBacklogForPiiAndSecrets } from '../../scripts/export-deliverables-workspace.mjs';
import { collectSensitivityWarnings, mergeSensitivityWarnings } from './privacy-warnings.mjs';
const fail = code => { throw new Error(code); };
const chunks = []; let inputBytes = 0, imageBytes = 0;
console.log = console.info = console.warn = console.error = () => {};
async function image(bytes, options = {}) {
  const data = await sharp(bytes, { failOn: 'error', limitInputPixels: 40_000_000, ...options }).rotate().resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 92 }).toBuffer();
  imageBytes += data.length;
  if (data.length > 5 * 1024 ** 2 || imageBytes > 22 * 1024 ** 2) fail('FILE_DOCUMENT_CAPACITY');
  return { mediaType: 'image/jpeg', base64: data.toString('base64') };
}
try {
  for await (const chunk of process.stdin) { inputBytes += chunk.length; if (inputBytes > 29 * 1024 ** 2) fail('FILE_TOO_LARGE'); chunks.push(chunk); }
  const { format, base64, sensitiveData } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const bytes = Buffer.from(base64, 'base64'), units = [], warningCodes = [];
  let sensitivityWarnings = [];
  if (['html', 'htm'].includes(format)) {
    units.push(...extractTextUnits(bytes, format, { sensitiveData, onSensitivity: text => { sensitivityWarnings = collectSensitivityWarnings({ text }); }, onWarning: code => warningCodes.push(code) }).map(unit => ({ ...unit, attachment: null })));
  } else if (['png', 'jpg', 'jpeg', 'webp', 'tif', 'tiff'].includes(format)) {
    const metadata = await sharp(bytes, { failOn: 'error', limitInputPixels: 40_000_000 }).metadata();
    const pages = metadata.pages ?? 1; if (pages > 100) fail('FILE_DOCUMENT_CAPACITY');
    for (let index = 0; index < pages; index++) units.push({ locator: `이미지 ${index + 1}`, text: null, attachment: await image(bytes, { page: index, pages: 1 }) });
  } else if (format === 'pdf') {
    const { createCanvas } = await import('@napi-rs/canvas');
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: true, disableFontFace: true, useWorkerFetch: false, disableAutoFetch: true, stopAtErrors: true });
    let document;
    try {
      document = await task.promise;
      if (document.numPages > 100) fail('FILE_DOCUMENT_CAPACITY');
      for (let index = 1; index <= document.numPages; index++) {
        const page = await document.getPage(index), original = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2.5, 2560 / Math.max(original.width, original.height)) });
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const content = await page.getTextContent();
        const text = content.items.map(item => item.str ? `${item.str}${item.hasEOL ? '\n' : ' '}` : '').join('').trim();
        // Native PDF strings are hints. AI reads the rendered page, including
        // layout and tables, rather than treating PDF glyph order as final OCR.
        const nativeReference = Buffer.byteLength(text) <= 16 * 1024 ? text : null;
        if (text && !nativeReference) warningCodes.push('DOCUMENT_NATIVE_HINT_OMITTED');
        units.push({ locator: `페이지 ${index}`, text: null, ...(nativeReference ? { nativeReference } : {}), attachment: await image(canvas.toBuffer('image/png')) });
        page.cleanup();
      }
    // pdfjs 5 부터 문서 정리는 로딩 작업이 맡는다(PDFDocumentProxy.destroy 는 6 에서 없어졌다) — task.destroy 가 문서까지 닫는다.
    } finally { await task.destroy(); }
  } else {
    const parsers = await import('kordoc');
    const method = ({ hwp: 'parse', hwpx: 'parseHwpx', docx: 'parseDocx', xlsx: 'parseXlsx', xls: 'parseXls', pptx: 'parsePptx' })[format];
    if (!method) fail('FILE_TYPE_UNSUPPORTED');
    const result = await parsers[method](bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), { ocr: false, plain: false, removeHeaderFooter: false, memos: true });
    if (!result.success) fail(/PASSWORD|ENCRYPT/i.test(result.code ?? '') ? 'FILE_ENCRYPTED' : 'FILE_EXTRACTION_FAILED');
    // Include parser metadata in the sensitive-input check, but never serialize
    // arbitrary binary image buffers into that text scan.
    const strings = { metadata: [], memos: [], blocks: [] }; let decodedBytes = 0;
    function collect(value, bucket, depth = 0) {
      if (depth > 64) fail('FILE_EXTRACTION_FAILED');
      if (typeof value === 'string') { decodedBytes += Buffer.byteLength(value); if (decodedBytes > 4 * 1024 ** 2) fail('FILE_TEXT_TOO_LARGE'); bucket.push(value); }
      else if (value && typeof value === 'object' && !ArrayBuffer.isView(value) && !(value instanceof ArrayBuffer)) for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) if (descriptor.enumerable && 'value' in descriptor) collect(descriptor.value, bucket, depth + 1);
    }
    collect(result.metadata, strings.metadata); collect(result.memos, strings.memos); collect(result.blocks, strings.blocks);
    if (scanBacklogForPiiAndSecrets({ project: strings }).length) {
      if (sensitiveData !== 'warning') fail('FILE_SENSITIVE_INPUT');
      sensitivityWarnings = mergeSensitivityWarnings(sensitivityWarnings, collectSensitivityWarnings(strings));
    }
    const native = result.pages?.length ? result.pages.map(page => ({ locator: `${['xlsx', 'xls'].includes(format) ? '시트' : result.metadata?.pageMode === 'section' ? '섹션' : '페이지'} ${page.pageNumber}`, text: page.markdown || null, attachment: null })) : [{ locator: '문서 본문', text: result.markdown || null, attachment: null }];
    units.push(...native);
    warningCodes.push(...(result.warnings ?? []).map(warning => /^[A-Z][A-Z0-9_]{1,80}$/.test(warning.code ?? '') ? warning.code : 'EXTRACTION_NOTICE'));
    let renderedPages = false;
    if (['hwp', 'hwpx'].includes(format)) {
      try {
        const rendered = await parsers.renderDocument(bytes, { format: 'jpeg', maxWidthPx: 2560, quality: 92, maxImageBytes: 20 * 1024 ** 2 });
        if (!rendered.assets?.length) throw new Error('EMPTY_RENDER');
        if (rendered.assets.length > 100) fail('FILE_DOCUMENT_CAPACITY');
        // Renderers may omit footnotes, headers, equations or unsupported shapes.
        // Keep native evidence as well; visual pages provide layout context.
        if (rendered.scene?.warnings?.length) warningCodes.push('DOCUMENT_RENDER_NOTICE');
        for (const asset of rendered.assets) units.push({ locator: `원본 렌더 페이지 ${asset.page}`, text: null, purpose: 'layout-context', attachment: await image(Buffer.from(asset.data)) });
        renderedPages = true;
      } catch (error) { if (error.message === 'FILE_DOCUMENT_CAPACITY') throw error; warningCodes.push('DOCUMENT_LAYOUT_UNAVAILABLE'); }
    } else warningCodes.push('DOCUMENT_LAYOUT_APPROXIMATE');
    for (const [index, embedded] of (renderedPages ? [] : result.images ?? []).entries()) {
      try { units.push({ locator: `내장 그림 ${index + 1}`, text: null, attachment: await image(Buffer.from(embedded.data)) }); }
      catch (error) { if (error.message === 'FILE_DOCUMENT_CAPACITY') throw error; warningCodes.push('DOCUMENT_IMAGE_UNREADABLE'); }
    }
  }
  if (units.length > 200 || units.reduce((count, unit) => count + Buffer.byteLength(unit.text ?? ''), 0) > 512 * 1024) fail('FILE_DOCUMENT_CAPACITY');
  const result = JSON.stringify({ units, warningCodes: [...new Set(warningCodes)], method: 'local-document', sensitivityWarnings });
  if (Buffer.byteLength(result) > 32 * 1024 ** 2) fail('FILE_DOCUMENT_CAPACITY');
  process.stdout.write(result, () => process.exit(0));
} catch (error) {
  const code = /^FILE_[A-Z_]{2,80}$/.test(error.message ?? '') ? error.message : /password|encrypt/i.test(error.message ?? '') ? 'FILE_ENCRYPTED' : 'FILE_EXTRACTION_FAILED';
  process.stdout.write(JSON.stringify({ errorCode: code }), () => process.exit(0));
}
