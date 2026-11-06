import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, extname } from 'node:path';
import { SOURCE_TYPES, SOURCE_CLASSIFICATIONS, scanBacklogForPiiAndSecrets } from '../../scripts/export-deliverables-workspace.mjs';
import { ARTIFACT_EXTENSIONS, MAX_ARTIFACT_BYTES, extractArtifact } from './artifact-extractor.mjs';
import { assertExternalWorkspace } from './store.mjs';
const fail = code => { throw Object.assign(new Error(code), { code }); };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
const exact = (value, keys) => { if (!value || Array.isArray(value) || typeof value !== 'object' || Object.keys(value).some(key => !keys.includes(key))) fail('FILE_METADATA_INVALID'); };
function reference(ref) { exact(ref, ['id', 'kind', 'sha256', 'bytes']); if (!uuid(ref.id) || ref.kind !== 'source' || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '') || !Number.isSafeInteger(ref.bytes) || ref.bytes < 0 || ref.bytes > 8 * 1024 ** 2) fail('FILE_METADATA_INVALID'); }
export function validateImportMetadata(jobs) {
  if (jobs === undefined) return;
  if (!Array.isArray(jobs)) fail('FILE_METADATA_INVALID');
  const ids = new Set();
  for (const job of jobs) {
    exact(job, ['requestId', 'requestDigest', 'filename', 'status', 'startedAt', 'completedAt', 'sourceId', 'sha256', 'originalRef', 'method', 'format', 'warningCodes', 'needsReview', 'errorCode', 'duplicateOf']);
    if (!uuid(job.requestId) || ids.has(job.requestId) || !['extracting', 'ready', 'failed', 'cancelled', 'interrupted', 'stale'].includes(job.status) || typeof job.filename !== 'string' || !job.filename.trim() || job.filename.length > 200 || /[\u0000-\u001f/\\:]/.test(job.filename) || !Number.isFinite(Date.parse(job.startedAt))) fail('FILE_METADATA_INVALID');
    ids.add(job.requestId);
    if (!/^[a-f0-9]{64}$/.test(job.requestDigest ?? '') || job.sha256 !== undefined && !/^[a-f0-9]{64}$/.test(job.sha256)) fail('FILE_METADATA_INVALID');
    if (job.originalRef) reference(job.originalRef);
    if (job.status === 'ready' && (!job.originalRef || typeof job.sourceId !== 'string' || !/^[a-f0-9]{64}$/.test(job.sha256 ?? '') || !ARTIFACT_EXTENSIONS.includes(job.format) || !['local-text', 'local-document', 'local-ocr'].includes(job.method) || typeof job.needsReview !== 'boolean')) fail('FILE_METADATA_INVALID');
    if (job.completedAt !== undefined && !Number.isFinite(Date.parse(job.completedAt))) fail('FILE_METADATA_INVALID');
    if (job.errorCode !== undefined && !/^[A-Z][A-Z0-9_]{2,80}$/.test(job.errorCode)) fail('FILE_METADATA_INVALID');
    if (job.warningCodes !== undefined && (!Array.isArray(job.warningCodes) || job.warningCodes.some(code => !/^[A-Z][A-Z0-9_]{1,80}$/.test(code)))) fail('FILE_METADATA_INVALID');
    if (job.duplicateOf !== undefined && (!uuid(job.duplicateOf) || job.duplicateOf === job.requestId || job.status !== 'ready' || !jobs.some(parent => parent.requestId === job.duplicateOf && parent.status === 'ready' && parent.sourceId === job.sourceId && parent.sha256 === job.sha256))) fail('FILE_METADATA_INVALID');
  }
}
export function createArtifactImports({ store, commit, extractor = extractArtifact, now = () => new Date().toISOString() }) {
  let active, closed = false;
  function mark(id, mutate) { const snapshot = store.read(); commit(snapshot.revision, next => { const job = next.metadata.imports?.find(job => job.requestId === id); if (job) mutate(job, next); }); }
  function archiveOriginal(filename, bytes) {
    const chunks = [];
    for (let offset = 0; offset < bytes.length; offset += 3 * 1024 ** 2) chunks.push(store.writeArchive('source', bytes.subarray(offset, offset + 3 * 1024 ** 2).toString('base64')));
    return store.writeArchive('source', JSON.stringify({ version: 1, filename, bytes: bytes.length, sha256: sha(bytes), chunks }));
  }
  function sourceFile(sourceId) {
    const job = store.read().metadata.imports?.find(job => job.sourceId === sourceId && job.status === 'ready');
    if (!job?.originalRef) fail('SOURCE_FILE_NOT_FOUND');
    const manifest = JSON.parse(store.readArchive(job.originalRef));
    exact(manifest, ['version', 'filename', 'bytes', 'sha256', 'chunks']);
    if (manifest.version !== 1 || manifest.filename !== job.filename || manifest.sha256 !== job.sha256 || !Number.isSafeInteger(manifest.bytes) || manifest.bytes < 1 || manifest.bytes > MAX_ARTIFACT_BYTES || !Array.isArray(manifest.chunks) || manifest.chunks.length > 8) fail('FILE_ARCHIVE_INVALID');
    const chunks = []; let size = 0;
    for (const ref of manifest.chunks) {
      reference(ref); const encoded = store.readArchive(ref);
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4) fail('FILE_ARCHIVE_INVALID');
      const bytes = Buffer.from(encoded, 'base64'); size += bytes.length;
      if (bytes.toString('base64') !== encoded || size > MAX_ARTIFACT_BYTES) fail('FILE_ARCHIVE_INVALID');
      chunks.push(bytes);
    }
    const bytes = Buffer.concat(chunks);
    if (bytes.length !== manifest.bytes || sha(bytes) !== job.sha256) fail('FILE_ARCHIVE_INVALID');
    return { filename: job.filename, base64: bytes.toString('base64'), format: job.format, sha256: job.sha256 };
  }
  async function action(revision, name, payload) {
    const snapshot = store.read();
    if (snapshot.revision !== revision) fail('WORKSPACE_REVISION_CONFLICT');
    if (name === 'source.ingest.cancel') {
      exact(payload, ['requestId']);
      if (!active || payload.requestId !== active.id || snapshot.metadata.imports?.find(job => job.requestId === active.id)?.status !== 'extracting') fail('FILE_NOT_PROCESSING');
      active.controller.abort(); mark(active.id, job => { job.status = 'cancelled'; job.completedAt = now(); }); return;
    }
    if (name !== 'source.ingest') fail('ACTION_UNSUPPORTED');
    exact(payload, ['requestId', 'filename', 'base64', 'classification', 'sourceType', 'redacted']);
    if (closed) fail('FILE_CLOSED');
    if (payload.redacted !== true) fail('FILE_REDACTION_REQUIRED');
    if (!uuid(payload.requestId) || typeof payload.filename !== 'string' || payload.filename.length > 200 || payload.filename.trim() !== payload.filename || /[\u0000-\u001f/\\:]/.test(payload.filename) || !ARTIFACT_EXTENSIONS.includes(extname(payload.filename).slice(1).toLowerCase()) || !SOURCE_TYPES.includes(payload.sourceType) || !SOURCE_CLASSIFICATIONS.includes(payload.classification)) fail('FILE_METADATA_INVALID');
    if (typeof payload.base64 !== 'string' || !payload.base64.length || payload.base64.length > Math.ceil(MAX_ARTIFACT_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(payload.base64) || payload.base64.length % 4) fail('FILE_ENCODING_INVALID');
    const bytes = Buffer.from(payload.base64, 'base64');
    if (bytes.toString('base64') !== payload.base64 || bytes.length > MAX_ARTIFACT_BYTES) fail('FILE_ENCODING_INVALID');
    const requestDigest = sha(JSON.stringify({ sha256: sha(bytes), filename: payload.filename, classification: payload.classification, sourceType: payload.sourceType, redacted: true }));
    const previous = snapshot.metadata.imports?.find(job => job.requestId === payload.requestId);
    if (previous) {
      if (previous.requestDigest !== requestDigest) fail('FILE_REQUEST_CONFLICT');
      return;
    }
    if (active) fail('FILE_BUSY');
    if (scanBacklogForPiiAndSecrets({ project: { filename: payload.filename } }).length) fail('SENSITIVE_INPUT');
    const duplicate = snapshot.metadata.imports?.find(job => job.status === 'ready' && job.sha256 === sha(bytes) && snapshot.backlog.sources.some(source => source.id === job.sourceId && source.fileSha256 === job.sha256 && source.classification === payload.classification && source.sourceType === payload.sourceType));
    if (duplicate) {
      commit(revision, next => {
        next.metadata.imports.push({ requestId: payload.requestId, requestDigest, filename: payload.filename, status: 'ready', startedAt: now(), completedAt: now(), sourceId: duplicate.sourceId, sha256: duplicate.sha256, originalRef: duplicate.originalRef, method: duplicate.method, format: duplicate.format, warningCodes: duplicate.warningCodes, needsReview: duplicate.needsReview, duplicateOf: duplicate.requestId });
      });
      return;
    }
    const project = JSON.stringify(snapshot.backlog.project);
    const job = { requestId: payload.requestId, requestDigest, sha256: sha(bytes), filename: payload.filename, status: 'extracting', startedAt: now() };
    commit(revision, next => { next.metadata.imports ??= []; next.metadata.imports.push(job); });
    const controller = new AbortController(), operation = { id: job.requestId, controller }; active = operation;
    operation.promise = Promise.resolve().then(async () => {
      const scratchRoot = assertExternalWorkspace(join(store.directory, '.scratch')); mkdirSync(scratchRoot, { recursive: true, mode: 0o700 });
      const cwd = mkdtempSync(join(scratchRoot, 'import-'));
      try {
        const result = await extractor({ filename: payload.filename, bytes }, { cwd, ocr: true, signal: controller.signal });
        if (controller.signal.aborted || closed) return;
        if (result.sha256 !== sha(bytes) || result.filename !== payload.filename || !Array.isArray(result.segments) || !result.segments.length || result.segments.some(segment => typeof segment.text !== 'string' || !segment.text.trim() || segment.text.length > 1800 || typeof segment.locator !== 'string' || !segment.locator.trim())) fail('FILE_EXTRACTION_FAILED');
        if (scanBacklogForPiiAndSecrets({ project: result }).length) fail('SENSITIVE_INPUT');
        const live = store.read();
        if (JSON.stringify(live.backlog.project) !== project) { mark(job.requestId, item => { item.status = 'stale'; item.completedAt = now(); }); return; }
        const originalRef = archiveOriginal(payload.filename, bytes), sourceId = `SRC-${randomUUID()}`;
        mark(job.requestId, (item, next) => {
          if (item.status !== 'extracting') return;
          next.backlog.sources.push({ id: sourceId, title: payload.filename, sourceType: payload.sourceType, classification: payload.classification, locator: payload.filename, fileSha256: result.sha256, summary: `${result.method === 'local-ocr' ? '로컬 OCR 판독' : '로컬 문서 추출'}${result.needsReview ? ' · 판독 결과를 원본과 대조하세요.' : ''}`, clauses: result.segments.map((segment, index) => ({ id: `C-${index + 1}`, text: segment.text, locator: segment.locator, disposition: 'question', rationale: 'AI 요구사항 정리 대상', requirementIds: [] })) });
          Object.assign(item, { status: 'ready', completedAt: now(), sourceId, sha256: result.sha256, originalRef, method: result.method, format: result.format, warningCodes: result.warningCodes, needsReview: result.needsReview });
        });
      } finally { assertExternalWorkspace(cwd); rmSync(cwd, { recursive: true, force: true }); }
    }).catch(error => {
      try { mark(job.requestId, item => { if (item.status !== 'extracting') return; item.status = controller.signal.aborted ? 'cancelled' : 'failed'; item.completedAt = now(); item.errorCode = /^(FILE_[A-Z_]{2,70}|SENSITIVE_INPUT)$/.test(error.code ?? '') ? error.code : 'FILE_EXTRACTION_FAILED'; }); }
      catch { /* Do not overwrite foreign changes or an unowned workspace. */ }
    }).finally(() => { if (active === operation) active = undefined; });
  }
  const initial = store.read();
  if (initial.metadata.imports?.some(job => job.status === 'extracting')) commit(initial.revision, next => { for (const job of next.metadata.imports) if (job.status === 'extracting') { job.status = 'interrupted'; job.completedAt = now(); } });
  return { action, sourceFile, get active() { return Boolean(active); }, view: snapshot => ({ active: Boolean(active), jobs: snapshot.metadata.imports ?? [] }), async waitForIdle() { while (active) await active.promise; }, async close() { closed = true; active?.controller.abort(); while (active) await active.promise; } };
}
