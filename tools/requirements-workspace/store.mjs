import { createHash, randomUUID } from 'node:crypto';
import { constants, closeSync, fstatSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { isAbsolute, join, parse, relative, resolve, sep } from 'node:path';

export const REQUIREMENTS_LOCK_FILE = '.requirements-ui.lock';
const BACKLOG = 'backlog.json';
const METADATA = 'requirements-ui.json';
const CONTEXT = 'context.snapshot.json';
const JOURNAL = '.requirements-ui.transaction.json';
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_JOURNAL_BYTES = MAX_BYTES * 7;
const FILES = [['backlog', BACKLOG], ['metadata', METADATA], ['context', CONTEXT]];
const READ_ONLY_ERRORS = new Set(['REQUIREMENTS_EXTERNAL_CHANGE', 'REQUIREMENTS_LOCK_LOST', 'REQUIREMENTS_RECOVERY_REQUIRED', 'REQUIREMENTS_RECOVERY_CONFLICT', 'REQUIREMENTS_IO_ERROR', 'REQUIREMENTS_UNSAFE_PATH', 'REQUIREMENTS_CORRUPT_JSON']);
const WAIT = new Int32Array(new SharedArrayBuffer(4));
const ARCHIVE_KINDS = new Set(['baseline', 'export', 'history', 'ai', 'source']);
const ARCHIVE_UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

export class RequirementsStoreError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RequirementsStoreError';
    this.code = `REQUIREMENTS_${code}`;
  }
}

function fail(code, message) { throw new RequirementsStoreError(code, message); }
function guarded(action) {
  try { return action(); }
  catch (error) {
    if (error instanceof RequirementsStoreError) throw error;
    fail('IO_ERROR', '작업공간 파일을 안전하게 읽거나 저장하지 못했습니다. 파일 권한과 사용 중인 프로그램을 확인하세요.');
  }
}
function statOrNull(file) {
  try { return lstatSync(file); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

// Filesystem ancestry is authoritative: it also detects .git files in linked
// worktrees and bare repositories, without treating failed Git subprocesses as permission.
export function assertExternalWorkspace(workspace) {
  return guarded(() => {
    if (typeof workspace !== 'string' || !isAbsolute(workspace) || workspace.includes('\0') || /^[/\\]{2}/.test(workspace)) {
      fail('DIRECTORY_REQUIRED', 'Git 밖의 절대 로컬 작업공간 경로가 필요합니다.');
    }
    const directory = resolve(workspace);
    const root = parse(directory).root;
    let current = root;
    for (const part of ['', ...relative(root, directory).split(sep).filter(Boolean)]) {
      if (part) current = join(current, part);
      const stat = statOrNull(current);
      if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) fail('UNSAFE_PATH', '연결 경로가 아닌 실제 디렉터리를 선택하세요.');
      if (part.toLowerCase() === '.git' || statOrNull(join(current, '.git')) ||
          (statOrNull(join(current, 'HEAD')) && statOrNull(join(current, 'objects')) && statOrNull(join(current, 'refs')))) {
        fail('GIT_WORKSPACE', '고객 작업공간은 모든 Git 작업 트리 밖에 있어야 합니다.');
      }
    }
    return directory;
  });
}

function checkedFile(file, missing = false) {
  const stat = statOrNull(file);
  if (!stat && missing) return null;
  if (!stat || !stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) {
    fail('UNSAFE_PATH', '작업공간 파일은 심볼릭 링크나 하드 링크가 아닌 일반 파일이어야 합니다.');
  }
  return stat;
}
function readBytes(directory, name, limit = MAX_BYTES) {
  assertExternalWorkspace(directory);
  const file = join(directory, name);
  const before = checkedFile(file, true);
  if (!before) return null;
  if (before.size > limit) fail('TOO_LARGE', '작업공간 파일의 크기 제한을 초과했습니다.');
  const fd = openSync(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  let bytes;
  try {
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.nlink !== 1 || opened.ino !== before.ino || opened.dev !== before.dev) fail('UNSAFE_PATH', '파일 경로가 읽는 중 변경되었습니다.');
    if (opened.size > limit) fail('TOO_LARGE', '작업공간 파일의 크기 제한을 초과했습니다.');
    // Preserve a leading BOM as content so archive hashes cover the exact UTF-8 bytes.
    try { bytes = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(readFileSync(fd)); }
    catch (error) {
      if (error instanceof TypeError) fail('CORRUPT_JSON', 'UTF-8 형식이 손상되었습니다. 원본 파일을 보존하고 인코딩을 확인하세요.');
      throw error;
    }
  } finally { closeSync(fd); }
  assertExternalWorkspace(directory);
  checkedFile(file);
  if (Buffer.byteLength(bytes) > limit) fail('TOO_LARGE', '작업공간 파일의 크기 제한을 초과했습니다.');
  return bytes;
}
function parseJson(bytes) {
  try { return JSON.parse(bytes); }
  catch { fail('CORRUPT_JSON', '손상된 JSON 파일이 있습니다. 원본을 보존하고 복구본을 확인하세요.'); }
}
function isObject(value) { return value !== null && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value)); }
function validateJson(value, depth = 0, seen = new Set()) {
  if (depth > 64) fail('INVALID_JSON', 'JSON 중첩 깊이 제한을 초과했습니다.');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object' || (!Array.isArray(value) && !isObject(value)) || seen.has(value)) fail('INVALID_JSON', '일반 JSON 값만 저장할 수 있습니다.');
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === 'length') continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || ['__proto__', 'prototype', 'constructor'].includes(key) || !descriptor.enumerable || !('value' in descriptor)) fail('INVALID_JSON', '일반 JSON 필드만 저장할 수 있습니다.');
    if (Array.isArray(value) && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length)) fail('INVALID_JSON', '배열에는 순서가 있는 JSON 값만 저장할 수 있습니다.');
    validateJson(descriptor.value, depth + 1, seen);
  }
  if (Array.isArray(value) && Object.keys(value).length !== value.length) fail('INVALID_JSON', '빈 배열 인덱스는 지원하지 않습니다.');
  seen.delete(value);
}
function serialize(value, limit = MAX_BYTES) {
  validateJson(value);
  const bytes = `${JSON.stringify(value, null, 2)}\n`;
  if (Buffer.byteLength(bytes) > limit) fail('TOO_LARGE', '작업공간 파일의 크기 제한을 초과했습니다.');
  return bytes;
}
function validateWith(validator, value, section) {
  if (!validator) return;
  let result;
  try { result = validator(value); }
  catch { fail(`INVALID_${section}`, '입력 검증에 실패했습니다. 민감정보와 필수 항목을 확인하세요.'); }
  if (result === false || (result && (result.valid === false || typeof result.then === 'function'))) {
    fail(`INVALID_${section}`, '입력 검증에 실패했습니다. 민감정보와 필수 항목을 확인하세요.');
  }
}
function hash(bytes) { return bytes === null ? null : createHash('sha256').update(bytes).digest('hex'); }
function revisionOf(bytes) { return createHash('sha256').update(JSON.stringify(FILES.map(([key]) => bytes[key] ?? null))).digest('hex'); }
function currentBytes(directory) { return Object.fromEntries(FILES.map(([key, name]) => [key, readBytes(directory, name)])); }
function canonicalValue(value) {
  return Array.isArray(value) ? value.map(canonicalValue) :
    isObject(value) ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])])) : value;
}
const canonicalJson = (value) => JSON.stringify(canonicalValue(value));
function contextValue(bytes) {
  if (bytes === null) return null;
  const context = parseJson(bytes);
  validateJson(context);
  if (!isObject(context) || typeof context.snapshotDigest !== 'string' || !context.snapshotDigest.trim() || context.snapshotDigest.length > 200) {
    fail('INVALID_CONTEXT', '문맥 교환 파일의 형식과 snapshotDigest를 확인하세요.');
  }
  return context;
}

function syncDirectory(directory) {
  // Windows does not expose directory fsync. File bytes are synced before rename.
  if (process.platform === 'win32') return;
  const fd = openSync(directory, 'r');
  try { fsyncSync(fd); } finally { closeSync(fd); }
}
function archiveReference(value) {
  validateJson(value);
  if (!isObject(value) || Object.keys(value).some((key) => !['id', 'kind', 'sha256', 'bytes'].includes(key)) ||
      !ARCHIVE_KINDS.has(value.kind) || typeof value.id !== 'string' || !ARCHIVE_UUID.test(value.id) ||
      typeof value.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.sha256) ||
      !Number.isSafeInteger(value.bytes) || value.bytes < 0 || value.bytes > MAX_BYTES) {
    fail('INVALID_ARCHIVE', '유효한 보관 기록 참조가 필요합니다.');
  }
  return value;
}
function immutableArchive(directory, name, bytes) {
  assertExternalWorkspace(directory);
  const temporary = join(directory, `.archive-${randomUUID()}.tmp`);
  let fd;
  let identity;
  function removeOwnedTemporary() {
    const current = statOrNull(temporary);
    if (!current) return;
    if (!identity || current.isSymbolicLink() || !current.isFile() || current.dev !== identity.dev || current.ino !== identity.ino) {
      fail('UNSAFE_PATH', '보관 기록의 임시 파일이 변경되었습니다. 파일을 보존하고 확인하세요.');
    }
    unlinkSync(temporary);
  }
  try {
    fd = openSync(temporary, 'wx', 0o600);
    identity = fstatSync(fd);
    writeFileSync(fd, bytes, 'utf8');
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    assertExternalWorkspace(directory);
    const prepared = checkedFile(temporary);
    if (prepared.dev !== identity.dev || prepared.ino !== identity.ino) fail('UNSAFE_PATH', '보관 기록의 임시 파일이 변경되었습니다.');
    // link is an atomic, no-replace publication of the fully synced inode. Once
    // the private temporary name is unlinked, the archive has exactly one link.
    // A collision can never replace an earlier record as rename could.
    try { linkSync(temporary, join(directory, name)); }
    catch (error) { if (error.code === 'EEXIST') fail('ARCHIVE_EXISTS', '같은 식별자의 보관 기록이 이미 있습니다. 기존 파일은 보존했습니다.'); throw error; }
    removeOwnedTemporary();
    syncDirectory(directory);
    checkedFile(join(directory, name));
  } finally {
    if (fd !== undefined) closeSync(fd);
    removeOwnedTemporary();
  }
}
function atomicWrite(directory, name, bytes) {
  assertExternalWorkspace(directory);
  checkedFile(join(directory, name), true);
  const temporary = join(directory, `.requirements-${randomUUID()}.tmp`);
  let fd;
  try {
    fd = openSync(temporary, 'wx', 0o600);
    writeFileSync(fd, bytes, 'utf8');
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    for (let attempt = 0; ; attempt++) {
      assertExternalWorkspace(directory);
      checkedFile(join(directory, name), true);
      try { renameSync(temporary, join(directory, name)); break; }
      catch (error) {
        if (process.platform !== 'win32' || !['EPERM', 'EBUSY'].includes(error.code) || attempt >= 11) throw error;
        Atomics.wait(WAIT, 0, 0, Math.min(5 * (2 ** attempt), 250));
      }
    }
    syncDirectory(directory);
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (statOrNull(temporary)) { checkedFile(temporary); unlinkSync(temporary); }
  }
}
function removeFile(directory, name) {
  assertExternalWorkspace(directory);
  checkedFile(join(directory, name));
  unlinkSync(join(directory, name));
  syncDirectory(directory);
}
function createLock(directory, name, record) {
  assertExternalWorkspace(directory);
  let fd;
  try { fd = openSync(join(directory, name), 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') { checkedFile(join(directory, name)); return false; } throw error; }
  try { writeFileSync(fd, JSON.stringify(record)); fsyncSync(fd); } finally { closeSync(fd); }
  return true;
}
function lockRecord(directory) {
  const bytes = readBytes(directory, REQUIREMENTS_LOCK_FILE, 4096);
  if (bytes === null) return null;
  try { return JSON.parse(bytes); } catch { return {}; }
}
function confirmedDead(record) {
  if (!record || record.host !== hostname() || !Number.isSafeInteger(record.pid) || record.pid <= 0) return false;
  try { process.kill(record.pid, 0); return false; } catch (error) { return error.code === 'ESRCH'; }
}
function acquireLock(directory, record) {
  if (createLock(directory, REQUIREMENTS_LOCK_FILE, record)) return;
  if (!confirmedDead(lockRecord(directory))) fail('LOCKED', '다른 실행기 또는 확인되지 않은 실행이 작업공간을 사용 중입니다.');
  const reclaim = `${REQUIREMENTS_LOCK_FILE}.reclaim`;
  if (!createLock(directory, reclaim, record)) fail('LOCKED', '작업공간 잠금 복구가 진행 중이거나 확인이 필요합니다.');
  try {
    const current = lockRecord(directory);
    if (current && !confirmedDead(current)) fail('LOCKED', '다른 실행기가 작업공간을 사용 중입니다.');
    if (current) removeFile(directory, REQUIREMENTS_LOCK_FILE);
    if (!createLock(directory, REQUIREMENTS_LOCK_FILE, record)) fail('LOCKED', '다른 실행기가 작업공간을 사용 중입니다.');
  } finally { removeFile(directory, reclaim); }
}

export function createRequirementsStore({ workspace, initialBacklog, initialMetadata = {}, validateBacklog, validateMetadata } = {}) {
  return guarded(() => {
    const directory = assertExternalWorkspace(workspace);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    assertExternalWorkspace(directory);
    const owner = { host: hostname(), pid: process.pid, owner: randomUUID() };
    acquireLock(directory, owner);
    let closed = false;
    let blocked = false;
    let readOnly = false;
    let reason = null;
    let cached;
    let trusted;
    function storeGuard(action) {
      try { return guarded(action); }
      catch (error) {
        if (READ_ONLY_ERRORS.has(error.code)) { readOnly = true; reason ??= error.code; }
        throw error;
      }
    }
    function ensureOwned() {
      if (closed) fail('CLOSED', '작업공간이 닫혔습니다.');
      if (readOnly) fail(reason.slice('REQUIREMENTS_'.length), '이 작업공간은 읽기 전용입니다. 입력을 보존하고 파일과 잠금을 확인하세요.');
      if (lockRecord(directory)?.owner !== owner.owner) fail('LOCK_LOST', '작업공간 잠금이 변경되었습니다. 실행기를 종료하고 확인하세요.');
      if (blocked) fail('RECOVERY_REQUIRED', '이전 저장이 중단되었습니다. 실행기를 다시 열어 복구를 확인하세요.');
    }
    function unpack(bytes) {
      if (bytes.backlog === null || bytes.metadata === null) fail('MISSING_FILE', '작업공간 데이터 파일이 누락되었습니다.');
      const backlog = parseJson(bytes.backlog);
      const envelope = parseJson(bytes.metadata);
      validateJson(backlog);
      validateJson(envelope);
      if (!isObject(backlog) || !isObject(envelope) || envelope.schemaVersion !== 1 || !Number.isSafeInteger(envelope.revision) || envelope.revision < 0 || !isObject(envelope.metadata) || Object.keys(envelope).some((key) => !['schemaVersion', 'revision', 'metadata'].includes(key))) {
        fail('INVALID_JSON', '지원하지 않는 작업공간 데이터 구조입니다.');
      }
      validateWith(validateBacklog, backlog, 'BACKLOG');
      validateWith(validateMetadata, envelope.metadata, 'METADATA');
      return { backlog, metadata: envelope.metadata, sequence: envelope.revision };
    }
    function contextConflict(bytes, state) {
      const exchange = contextValue(bytes.context ?? null);
      const embedded = state.metadata.context;
      if (!embedded && !exchange) return false;
      if (!embedded || !exchange) return true;
      validateJson(embedded);
      return !isObject(embedded) || embedded.snapshotDigest !== state.backlog.contextSnapshotDigest ||
        exchange.snapshotDigest !== state.backlog.contextSnapshotDigest || canonicalJson(embedded) !== canonicalJson(exchange);
    }
    function requireContextAgreement(bytes) {
      const state = unpack(bytes);
      if (contextConflict(bytes, state)) fail('CONTEXT_CONFLICT', '백로그와 문맥 교환 파일이 다릅니다. 차이를 검토하고 문맥을 명시적으로 갱신하세요.');
    }
    function recover() {
      const journalBytes = readBytes(directory, JOURNAL, MAX_JOURNAL_BYTES);
      if (journalBytes === null) return;
      const journal = parseJson(journalBytes);
      if (!isObject(journal) || ![1, 2].includes(journal.schemaVersion) || !isObject(journal.before) || !isObject(journal.after) ||
          Object.keys(journal).some((key) => !['schemaVersion', 'before', 'after'].includes(key)) ||
          ['backlog', 'metadata'].some((key) => !(journal.before[key] === null || /^[a-f0-9]{64}$/.test(journal.before[key])) || typeof journal.after[key] !== 'string' || Buffer.byteLength(journal.after[key]) > MAX_BYTES)) {
        fail('INVALID_JOURNAL', '저장 복구 기록을 확인해야 합니다. 원본 파일을 보존하세요.');
      }
      if (journal.schemaVersion === 1) {
        // Earlier local builds journalled two files. Preserve the third file's
        // current bytes; a later explicit refresh resolves any context conflict.
        const existingContext = readBytes(directory, CONTEXT);
        journal.before.context = hash(existingContext);
        journal.after.context = existingContext;
      } else if (!(journal.before.context === null || /^[a-f0-9]{64}$/.test(journal.before.context)) ||
          !(journal.after.context === null || (typeof journal.after.context === 'string' && Buffer.byteLength(journal.after.context) <= MAX_BYTES))) {
        fail('INVALID_JOURNAL', '문맥 교환 파일의 저장 복구 기록을 확인하세요.');
      }
      unpack(journal.after);
      if (journal.schemaVersion === 2) requireContextAgreement(journal.after);
      const current = currentBytes(directory);
      for (const [key] of FILES) {
        if (![journal.before[key], hash(journal.after[key])].includes(hash(current[key]))) fail('RECOVERY_CONFLICT', '중단된 저장 이후 외부 변경이 발견되었습니다. 원본과 복구 기록을 보존하고 비교하세요.');
      }
      for (const [key, name] of FILES) {
        const actual = readBytes(directory, name);
        if (![journal.before[key], hash(journal.after[key])].includes(hash(actual))) fail('RECOVERY_CONFLICT', '복구 도중 외부 변경이 발견되었습니다. 파일을 보존하고 비교하세요.');
        if (actual !== journal.after[key]) {
          if (journal.after[key] === null) fail('INVALID_JOURNAL', '저장 복구 기록으로 파일을 삭제할 수 없습니다.');
          atomicWrite(directory, name, journal.after[key]);
        }
      }
      removeFile(directory, JOURNAL);
    }
    function commit(before, after) {
      ensureOwned();
      if (revisionOf(currentBytes(directory)) !== revisionOf(before)) fail('EXTERNAL_CHANGE', '외부에서 파일이 바뀌었습니다. 입력을 보존하고 실행기를 다시 여세요.');
      const journal = { schemaVersion: 2, before: Object.fromEntries(FILES.map(([key]) => [key, hash(before[key])])), after };
      try {
        atomicWrite(directory, JOURNAL, serialize(journal, MAX_JOURNAL_BYTES));
        if (revisionOf(currentBytes(directory)) !== revisionOf(before)) fail('EXTERNAL_CHANGE', '저장 직전에 외부 변경이 발견되었습니다. 파일을 보존하고 실행기를 다시 여세요.');
        for (const [key, name] of FILES) {
          if (readBytes(directory, name) !== before[key]) fail('EXTERNAL_CHANGE', '저장 도중 외부 변경이 발견되었습니다. 파일을 보존하고 실행기를 다시 여세요.');
          if (after[key] !== null && after[key] !== before[key]) atomicWrite(directory, name, after[key]);
        }
        removeFile(directory, JOURNAL);
      } catch (error) { blocked = true; throw error; }
    }
    function snapshot(bytes) {
      const state = unpack(bytes);
      return { revision: revisionOf(bytes), backlog: state.backlog, metadata: state.metadata,
        contextSnapshot: contextValue(bytes.context ?? null), contextConflict: contextConflict(bytes, state) };
    }
    function close() {
      if (closed) return;
      guarded(() => {
        if (lockRecord(directory)?.owner === owner.owner) removeFile(directory, REQUIREMENTS_LOCK_FILE);
        closed = true;
      });
    }
    function readArchive(reference) {
      return guarded(() => {
        if (closed) fail('CLOSED', '작업공간이 닫혔습니다.');
        const ref = archiveReference(reference);
        const records = assertExternalWorkspace(join(directory, 'records'));
        const content = readBytes(records, `${ref.id}.record`);
        if (content === null) fail('ARCHIVE_NOT_FOUND', '보관 기록 파일이 없습니다. 작업공간 백업과 원본을 확인하세요.');
        if (Buffer.byteLength(content) !== ref.bytes || hash(content) !== ref.sha256) fail('ARCHIVE_INTEGRITY', '보관 기록의 크기나 해시가 다릅니다. 원본 파일을 보존하고 확인하세요.');
        return content;
      });
    }
    try {
      recover();
      const before = currentBytes(directory);
      if (before.backlog === null || before.metadata === null) {
        if (before.backlog === null && before.metadata !== null) fail('MISSING_FILE', '백로그 파일이 누락되었습니다. 원본을 확인하세요.');
        validateJson(initialMetadata);
        const metadata = structuredClone(initialMetadata);
        const backlog = before.backlog === null ? initialBacklog : parseJson(before.backlog);
        if (before.context !== null) {
          const existing = contextValue(before.context);
          if (existing.snapshotDigest !== backlog?.contextSnapshotDigest) fail('CONTEXT_CONFLICT', '기존 문맥 교환 파일이 백로그와 다릅니다. 원본을 보존하고 확인하세요.');
          metadata.context = existing;
        }
        const after = {
          backlog: before.backlog ?? serialize(initialBacklog),
          metadata: serialize({ schemaVersion: 1, revision: 0, metadata }),
          context: before.context ?? (metadata.context ? serialize(metadata.context) : null),
        };
        requireContextAgreement(after);
        commit(before, after);
        cached = after;
      } else {
        const state = unpack(before);
        contextValue(before.context);
        if (before.context === null && state.metadata.context && state.metadata.context.snapshotDigest === state.backlog.contextSnapshotDigest) {
          const after = { ...before, context: serialize(state.metadata.context) };
          requireContextAgreement(after);
          commit(before, after);
          cached = after;
        } else cached = before;
      }
      trusted = snapshot(cached);
      return {
        get directory() { return directory; },
        writeArchive(kind, content) {
          return storeGuard(() => {
            ensureOwned();
            if (revisionOf(currentBytes(directory)) !== revisionOf(cached)) fail('EXTERNAL_CHANGE', '외부에서 파일이 바뀌었습니다. 입력을 보존하고 실행기를 다시 여세요.');
            if (!ARCHIVE_KINDS.has(kind) || typeof content !== 'string' || !content.isWellFormed()) fail('INVALID_ARCHIVE', '지원하는 보관 기록 종류와 올바른 UTF-8 본문이 필요합니다.');
            const bytes = Buffer.byteLength(content);
            if (bytes > MAX_BYTES) fail('TOO_LARGE', '보관 기록 파일의 크기 제한을 초과했습니다.');
            const records = assertExternalWorkspace(join(directory, 'records'));
            mkdirSync(records, { recursive: true, mode: 0o700 });
            assertExternalWorkspace(records);
            const reference = { id: randomUUID(), kind, sha256: hash(content), bytes };
            immutableArchive(records, `${reference.id}.record`, content);
            readArchive(reference);
            ensureOwned();
            if (revisionOf(currentBytes(directory)) !== revisionOf(cached)) fail('EXTERNAL_CHANGE', '기록 보관 중 외부 변경이 발견되었습니다. 완료된 보관 파일은 보존했습니다.');
            return reference;
          });
        },
        readArchive,
        read() {
          return storeGuard(() => {
            ensureOwned();
            const current = currentBytes(directory);
            if (revisionOf(current) !== revisionOf(cached)) fail('EXTERNAL_CHANGE', '외부에서 파일이 바뀌었습니다. 입력을 보존하고 실행기를 다시 여세요.');
            trusted = snapshot(current);
            return structuredClone(trusted);
          });
        },
        transact(expectedRevision, mutator, { refreshContext = false } = {}) {
          return storeGuard(() => {
            ensureOwned();
            const before = currentBytes(directory);
            if (revisionOf(before) !== revisionOf(cached)) fail('EXTERNAL_CHANGE', '외부에서 파일이 바뀌었습니다. 입력을 보존하고 실행기를 다시 여세요.');
            if (expectedRevision !== revisionOf(before)) fail('REVISION_CONFLICT', '다른 창에서 저장했습니다. 입력을 보존하고 최신 내용을 다시 불러오세요.');
            if (typeof mutator !== 'function') fail('INVALID_MUTATION', '저장할 변경이 필요합니다.');
            const state = unpack(before);
            if (contextConflict(before, state) && !refreshContext) fail('CONTEXT_CONFLICT', 'CLI에서 문맥이 변경되었습니다. 차이를 검토하고 문맥을 명시적으로 갱신하세요.');
            const draft = { backlog: state.backlog, metadata: state.metadata };
            const next = mutator(draft) ?? draft;
            validateJson(next);
            if (!isObject(next) || Object.keys(next).some((key) => !['backlog', 'metadata'].includes(key))) fail('INVALID_MUTATION', '지원하지 않는 저장 변경입니다.');
            const after = {
              backlog: serialize(next.backlog),
              metadata: serialize({ schemaVersion: 1, revision: state.sequence + 1, metadata: next.metadata }),
              context: next.metadata?.context ? serialize(next.metadata.context) : before.context,
            };
            requireContextAgreement(after);
            commit(before, after);
            cached = after;
            trusted = snapshot(after);
            return structuredClone(trusted);
          });
        },
        getTrustedSnapshot() { return structuredClone(trusted); },
        get readonly() { return readOnly; },
        get readOnly() { return readOnly; },
        get reason() { return reason; },
        close,
      };
    } catch (error) { close(); throw error; }
  });
}
