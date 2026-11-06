import { createHash } from 'node:crypto';
import { prepareDocumentInputs } from './document-inputs.mjs';
import { buildStagePrompt, PROMPT_VERSION } from './ai-prompts.mjs';
import { validateAiValue } from './ai-contract.mjs';
import { AI_MODEL, AI_EFFORT, createCliRunner } from './ai-cli.mjs';

const string = maxLength => ({ type: 'string', minLength: 1, maxLength });
const array = (items, maxItems = 500) => ({ type: 'array', items, minItems: 0, maxItems });
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export const DOCUMENT_READING_SCHEMA = object({
  documentTypes: { ...array({ type: 'string', enum: ['rfp', 'interview', 'as-is-artifact', 'regulation', 'policy-memo', 'other'] }, 6), minItems: 1 },
  summary: string(4000),
  blocks: array(object({ inputId: string(100), heading: string(300), kind: { type: 'string', enum: ['heading', 'paragraph', 'table', 'figure', 'note', 'blank'] }, text: { anyOf: [string(12000), { type: 'null' }] }, certainty: { type: 'string', enum: ['clear', 'uncertain'] }, note: string(1000) })),
  unreadable: array(object({ inputId: string(100), reason: string(1000) }), 200),
});
const integer = (minimum, maximum) => ({ type: 'integer', minimum, maximum });
const readingRecordProperties = {
  warningCodes: array({ type: 'string', pattern: '^[A-Z][A-Z0-9_]+$', maxLength: 100 }, 100),
  version: integer(1, 1), promptVersion: string(64), originalSha256: { ...string(64), pattern: '^[a-f0-9]{64}$' }, summary: string(4000), summaries: array(string(4000), 128), documentTypes: DOCUMENT_READING_SCHEMA.properties.documentTypes,
  blocks: array(DOCUMENT_READING_SCHEMA.properties.blocks.items, 4000), unreadable: array(DOCUMENT_READING_SCHEMA.properties.unreadable.items, 200),
  provenance: array(object({ inputId: string(100), locator: string(500), kind: { type: 'string', enum: ['native-text', 'ai-transcription', 'ai-visual-interpretation', 'ai-mixed', 'blank', 'unreadable', 'visual-context'] } }), 200),
  usage: object({ inputTokens: integer(0, Number.MAX_SAFE_INTEGER), outputTokens: integer(0, Number.MAX_SAFE_INTEGER) }),
  prompts: array(object({ stage: { type: 'string', enum: ['reading'] }, version: string(64), sha256: { ...string(64), pattern: '^[a-f0-9]{64}$' }, instructions: string(20000) }), 64),
  clauseInputs: array(object({ clauseId: string(100), inputId: string(100) }), 3000),
  referenceChecks: array(object({ inputId: string(100), sha256: { ...string(64), pattern: '^[a-f0-9]{64}$' }, status: { type: 'string', enum: ['matched', 'mismatch'] } }), 200),
};
const READING_RECORD_SCHEMA = { ...object(readingRecordProperties), required: Object.keys(readingRecordProperties).filter(key => !['clauseInputs', 'referenceChecks'].includes(key)) };
const fail = code => { throw Object.assign(new Error(code), { code }); };
export const readingOmissions = codes => (codes ?? []).filter(code => !['DOCUMENT_LAYOUT_APPROXIMATE', 'DOCUMENT_NATIVE_HINT_OMITTED', 'DOCUMENT_REGISTERED_TEXT_ONLY'].includes(code));
export function validateReadingRecord(value, originalSha256) {
  try { validateAiValue(value, READING_RECORD_SCHEMA, { maxBytes: 8 * 1024 ** 2 }); } catch { fail('AI_DOCUMENT_OUTPUT_INVALID'); }
  if (originalSha256 && value.originalSha256 !== originalSha256) fail('AI_DOCUMENT_OUTPUT_INVALID');
  const units = new Set(value.provenance.map(item => item.inputId));
  if (units.size !== value.provenance.length || [...value.blocks, ...value.unreadable, ...(value.clauseInputs ?? []), ...(value.referenceChecks ?? [])].some(item => !units.has(item.inputId))) fail('AI_DOCUMENT_OUTPUT_INVALID');
  for (const prompt of value.prompts) if (prompt.version !== value.promptVersion || createHash('sha256').update(prompt.instructions).digest('hex') !== prompt.sha256) fail('AI_DOCUMENT_OUTPUT_INVALID');
  return value;
}

export function documentReadingBatches(units) {
  const batches = []; let batch = [], bytes = 0, visuals = 0;
  for (const unit of units) {
    const size = Buffer.byteLength(JSON.stringify({ ...unit, attachment: null }));
    if (size > 40 * 1024) fail('FILE_DOCUMENT_CAPACITY');
    if (batch.length && (bytes + size > 40 * 1024 || batch.length >= 8 || unit.attachment && visuals >= 4)) { batches.push(batch); batch = []; bytes = 0; visuals = 0; }
    batch.push(unit); bytes += size; if (unit.attachment) visuals++;
  }
  if (batch.length) batches.push(batch);
  if (batches.length > 128) fail('FILE_DOCUMENT_CAPACITY');
  return batches;
}

function validateReading(value, units) {
  try { validateAiValue(value, DOCUMENT_READING_SCHEMA); } catch (error) { fail(error.details?.some(detail => detail.kind === 'sensitive-output') ? 'AI_DOCUMENT_SENSITIVE_OUTPUT' : 'AI_DOCUMENT_OUTPUT_INVALID'); }
  const byId = new Map(units.map(unit => [unit.id, unit])), covered = new Set(), unreadable = new Set();
  for (const block of value.blocks) {
    const unit = byId.get(block.inputId);
    if (!unit || unit.text && block.text !== null && !unit.text.includes(block.text) || unit.purpose === 'layout-context' && block.text !== null || !unit.text && unit.purpose !== 'layout-context' && !['blank', 'figure'].includes(block.kind) && !block.text?.trim()) fail('AI_DOCUMENT_OUTPUT_INVALID');
    covered.add(block.inputId);
  }
  for (const item of value.unreadable) {
    if (!byId.has(item.inputId) || unreadable.has(item.inputId)) fail('AI_DOCUMENT_OUTPUT_INVALID');
    unreadable.add(item.inputId); covered.add(item.inputId);
  }
  if (covered.size !== units.length) fail('AI_DOCUMENT_OUTPUT_INVALID');
  return value;
}

function criticalTokens(text) {
  const normalized = text.normalize('NFKC').toLowerCase().replaceAll('−', '-'), compact = normalized.replace(/\s+/gu, ''), tokens = [];
  for (const match of compact.matchAll(/[+-]?\d+(?:[.,:/-]\d+)*/g)) {
    const number = match[0].replace(/,(?=\d{3}(?:\D|$))/g, ''); tokens.push(`number:${number}`);
    const unit = /^(?:개월|시간|천원|만원|분|초|일|월|년|원|건|명|회|개|%|ms|mb|gb)/.exec(compact.slice(match.index + match[0].length));
    if (unit) tokens.push(`quantity:${number}${unit[0]}`);
  }
  for (const match of compact.matchAll(/불가능|불가|금지|허용|거부|제외|필수|선택|초과|이상|이하|미만|않|없|못|가능/gu)) tokens.push(`rule:${match[0]}`);
  for (const match of normalized.matchAll(/\b(?:not|no|never|without|cannot|prohibited|must|may|shall|only|except|required|optional|allowed|allow|deny|denied)\b/g)) tokens.push(`rule:${match[0]}`);
  const counts = new Map(); for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1); return counts;
}
function compareNativeReferences(value, units) {
  const checks = [];
  for (const unit of units.filter(unit => unit.nativeReference?.trim())) {
    const blocks = value.blocks.filter(block => block.inputId === unit.id), text = blocks.map(block => block.text ?? '').join('\n');
    const expected = criticalTokens(unit.nativeReference), actual = criticalTokens(text);
    // A PDF text layer can be incomplete or misordered. Extra visible content
    // is allowed; a missing/conflicting native critical fact requires review.
    const mismatch = !text.trim() || [...expected].some(([token, count]) => (actual.get(token) ?? 0) < count);
    checks.push({ inputId: unit.id, sha256: createHash('sha256').update(unit.nativeReference).digest('hex'), status: mismatch ? 'mismatch' : 'matched' });
    if (!mismatch) continue;
    const note = 'PDF 텍스트 보조정보와 시각 판독이 다릅니다. 원본의 숫자·단위·부정어와 누락 여부를 대조해 주세요.';
    for (const block of blocks) { block.certainty = 'uncertain'; block.note = `${note} ${block.note}`.slice(0, 1000); }
    if (!text.trim() && !value.unreadable.some(item => item.inputId === unit.id)) value.unreadable.push({ inputId: unit.id, reason: note });
  }
  return checks;
}

function sourceSegments(units, blocks) {
  const result = [];
  for (const unit of units) {
    let index = 0;
    const parts = unit.text ? [{ text: unit.text, heading: '' }] : blocks.filter(block => block.inputId === unit.id && (block.text || block.kind === 'figure')).map(block => ({ text: block.text ?? `[AI 시각 해석 — 원문 전사 아님] ${block.note}`, heading: block.heading }));
    for (const part of parts) for (const paragraph of part.text.split(/\n[ \t]*\n+/).filter(value => value.trim())) {
      let offset = 0;
      while (offset < paragraph.length) {
        let end = Math.min(offset + 1800, paragraph.length);
        if (end < paragraph.length && /[\uD800-\uDBFF]/.test(paragraph[end - 1])) end--;
        result.push({ text: paragraph.slice(offset, end), locator: `${unit.locator}${part.heading ? ` / ${part.heading}` : ''} / ${++index}`, inputId: unit.id }); offset = end;
      }
    }
  }
  if (result.length > 3000 || result.reduce((size, part) => size + Buffer.byteLength(part.text), 0) > 512 * 1024) fail('FILE_TEXT_TOO_LARGE');
  if (!result.length) fail('AI_DOCUMENT_UNREADABLE');
  return result;
}

export async function readDocument(input, { cwd, signal, sourceType = 'other', execute = createCliRunner(), prepare = prepareDocumentInputs, onProgress = () => {} } = {}) {
  const cancelled = () => { if (signal?.aborted) fail('AI_CANCELLED'); };
  cancelled();
  const prepared = await prepare(input, { cwd, signal }); cancelled();
  const batches = documentReadingBatches(prepared.units), blocks = [], unreadable = [], summaries = [], referenceChecks = [], prompts = new Map(), documentTypes = new Set();
  const usage = { inputTokens: 0, outputTokens: 0 };
  let lastSummary = '';
  for (const [index, units] of batches.entries()) {
    cancelled(); onProgress({ stage: 'reading', completed: index, total: batches.length });
    const attachments = [], unitData = units.map(unit => {
      let attachmentIndex = null;
      if (unit.attachment) { attachments.push(unit.attachment); attachmentIndex = attachments.length; }
      return { id: unit.id, locator: unit.locator, text: unit.text, ...(unit.purpose ? { purpose: unit.purpose } : {}), ...(unit.nativeReference ? { nativeReference: unit.nativeReference } : {}), attachmentIndex };
    });
    const request = { phase: 'reading', promptVersion: PROMPT_VERSION, instructions: buildStagePrompt('reading', { sourceTypes: [sourceType, ...documentTypes], formats: [prepared.format] }) + '\nOutput contract: documentTypes identifies all actual document roles; sourceType is only a hint and mixed documents can have several roles. blocks.inputId must match a supplied unit. Native text is already preserved by the application: use text=null for a native-text block, or an exact supplied substring. For visual-only units transcribe visible content into text; never paraphrase it. nativeReference is a fallible text hint, not the final transcription; read the actual image and mark discrepancies uncertain. For purpose=layout-context units, exact native text is preserved in other units: do not transcribe it again (text must be null). Use kind=note for repeated text/layout context; use kind=figure only to describe additional visually supported relationships absent from native text, and use unreadable for missing visual information. For diagrams without readable labels use kind=figure, text=null and describe only visually supported relationships in note; the application labels this as AI interpretation, never literal transcription. Mark ambiguous relationships uncertain. Blank pages use kind=blank. Every supplied unit must be represented by a block or unreadable entry. summary integrates previousSummary and this batch; blocks/unreadable refer only to current units.', data: { filename: input.filename, format: prepared.format, sourceType, units: unitData, warningCodes: prepared.warningCodes, batch: { index: index + 1, total: batches.length }, previousSummary: lastSummary } };
    const promptHash = createHash('sha256').update(request.instructions).digest('hex');
    prompts.set(promptHash, { stage: 'reading', version: PROMPT_VERSION, sha256: promptHash, instructions: request.instructions });
    const response = await execute({ request, schema: DOCUMENT_READING_SCHEMA, attachments, cwd, signal }); cancelled();
    if (response.model !== undefined && response.model !== AI_MODEL || response.effort !== undefined && response.effort !== AI_EFFORT) fail('AI_MODEL_MISMATCH');
    const value = structuredClone(validateReading(response.output, units));
    referenceChecks.push(...compareNativeReferences(value, units));
    for (const type of value.documentTypes) documentTypes.add(type);
    blocks.push(...value.blocks); unreadable.push(...value.unreadable); summaries.push(value.summary); lastSummary = value.summary;
    usage.inputTokens += response.usage?.inputTokens ?? 0; usage.outputTokens += response.usage?.outputTokens ?? 0;
    onProgress({ stage: 'reading', completed: index + 1, total: batches.length });
  }
  const segments = sourceSegments(prepared.units, blocks), sha256 = createHash('sha256').update(input.bytes).digest('hex');
  const reading = { version: 1, promptVersion: PROMPT_VERSION, originalSha256: sha256, summary: lastSummary, summaries, blocks, unreadable, warningCodes: prepared.warningCodes, referenceChecks,
    provenance: prepared.units.map(unit => {
      const content = blocks.filter(block => block.inputId === unit.id), transcribed = content.some(block => block.text), interpreted = content.some(block => block.kind === 'figure' && block.text === null);
      return { inputId: unit.id, locator: unit.locator, kind: unit.text ? 'native-text' : unit.purpose === 'layout-context' ? 'visual-context' : transcribed && interpreted ? 'ai-mixed' : transcribed ? 'ai-transcription' : interpreted ? 'ai-visual-interpretation' : unreadable.some(item => item.inputId === unit.id) ? 'unreadable' : 'blank' };
    }), usage, prompts: [...prompts.values()], documentTypes: [...documentTypes] };
  validateReadingRecord(reading, sha256);
  return { filename: input.filename, sha256, format: prepared.format, method: 'ai-document', summary: lastSummary, segments, reading, warningCodes: prepared.warningCodes, needsReview: readingOmissions(prepared.warningCodes).length > 0 || unreadable.length > 0 || blocks.some(block => block.certainty === 'uncertain'), usage };
}
