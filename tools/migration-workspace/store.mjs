import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const INDEX = 'workspace.json';
const LOCK = 'workspace.lock';
const MAX_BYTES = 4 * 1024 * 1024;
const ACTIVE = new Set(['starting', 'running', 'cancelling']);
const READ_OPERATIONS = new Set(['discover', 'profile', 'app-scan', 'term-suggest', 'mapping-generate', 'conformance', 'plan', 'validate']);
const FORBIDDEN_KEYS = /password|passwd|passphrase|token|secret|privatekey|apikey|credential|stdout|stderr|raw|sourcecode|sourcetext|^content$|^contents$|^body$|^sql$/i;
const ROOT_KEYS = ['schemaVersion', 'revision', 'inputRevision', 'name', 'ai', 'profiles', 'inputs', 'artifacts', 'ledger', 'jobs', 'activeJobId', 'readiness'];

export class WorkspaceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WorkspaceError';
    this.code = code;
  }
}

function fail(code, message) { throw new WorkspaceError(`WORKSPACE_${code}`, message); }
function defaultState() {
  return { schemaVersion: 1, revision: 0, inputRevision: 0, name: '이관 작업공간', ai: {}, profiles: {}, inputs: {}, artifacts: {}, ledger: {}, jobs: [], activeJobId: null, readiness: {} };
}
function plainObject(value) { return value !== null && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value)); }
async function statOrNull(path) {
  try { return await lstat(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

// Check every existing ancestor, including Windows junctions and linked worktrees.
async function checkDirectory(directory, create = false) {
  const root = parse(directory).root;
  let current = root;
  for (const part of ['', ...relative(root, directory).split(sep).filter(Boolean)]) {
    if (part) current = join(current, part);
    let stat = await statOrNull(current);
    if (!stat && create) {
      try { await mkdir(current, { mode: 0o700 }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
      stat = await statOrNull(current);
    }
    if (!stat) return;
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail('UNSAFE_PATH', 'Workspace paths must be real directories.');
    if (await statOrNull(join(current, '.git')) || part.toLowerCase() === '.git') fail('GIT_DIRECTORY', 'The workspace must be outside Git repositories.');
    if (await statOrNull(join(current, 'HEAD')) && await statOrNull(join(current, 'objects')) && await statOrNull(join(current, 'refs'))) {
      fail('GIT_DIRECTORY', 'The workspace must be outside Git repositories.');
    }
  }
}

async function checkedFile(path, { missing = false } = {}) {
  const stat = await statOrNull(path);
  if (!stat && missing) return null;
  if (!stat || stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1) fail('UNSAFE_PATH', 'Workspace files must be regular, unlinked files.');
  return stat;
}

function artifactName(name) {
  if (typeof name !== 'string' || name.length > 240 || !name || name.includes('\\') || isAbsolute(name)) fail('UNSAFE_ARTIFACT', 'Artifact names must be safe relative paths.');
  for (const part of name.split('/')) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(part) || part.endsWith('.') || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)) {
      fail('UNSAFE_ARTIFACT', 'Artifact names must be safe relative paths.');
    }
  }
  return name;
}

function validateJson(value, trail = [], seen = new Set()) {
  if (trail.length > 64) fail('INVALID_INDEX', 'The workspace index is too deeply nested.');
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('INVALID_INDEX', 'The workspace index must contain only JSON values.');
    return;
  }
  if (typeof value === 'string') {
    if (value.length > 4096 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail('INVALID_INDEX', 'Index strings must be short metadata values.');
    if (/-----BEGIN [A-Z ]*PRIVATE KEY-----|\bBearer\s+\S+|\b(?:password|passwd|api[_-]?key|access[_-]?token|secret)\s*[=:]\s*\S+|\w+:\/\/[^\s/]*:[^\s/]*@/i.test(value)) {
      fail('SENSITIVE_DATA', 'Credentials and raw output must not be stored in the workspace index.');
    }
    if (trail[0] === 'artifacts' && /(?:path|file|filename)$/i.test(trail.at(-1) ?? '')) artifactName(value);
    return;
  }
  if (typeof value !== 'object' || (!Array.isArray(value) && !plainObject(value)) || seen.has(value)) fail('INVALID_INDEX', 'The workspace index must contain only JSON values.');
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === 'length') continue;
    if (typeof key !== 'string') fail('INVALID_INDEX', 'The workspace index must contain only JSON values.');
    if (Array.isArray(value) && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length)) fail('INVALID_INDEX', 'Arrays must contain only indexed JSON values.');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor.enumerable || !('value' in descriptor) || ['__proto__', 'prototype', 'constructor'].includes(key)) fail('INVALID_INDEX', 'The workspace index must contain only plain JSON fields.');
    if (FORBIDDEN_KEYS.test(key.replace(/[_-]/g, ''))) fail('SENSITIVE_DATA', 'Credentials and raw output must not be stored in the workspace index.');
    validateJson(descriptor.value, [...trail, key], seen);
  }
  if (Array.isArray(value) && Object.keys(value).length !== value.length) fail('INVALID_INDEX', 'Sparse arrays are not supported.');
  seen.delete(value);
}

function validateState(state) {
  validateJson(state);
  if (!plainObject(state) || state.schemaVersion !== 1) fail('SCHEMA_VERSION', 'Unsupported workspace schema version.');
  if (ROOT_KEYS.some((key) => !Object.hasOwn(state, key)) || Object.keys(state).some((key) => !ROOT_KEYS.includes(key))) fail('INVALID_INDEX', 'Unexpected workspace index fields.');
  if (!Number.isSafeInteger(state.revision) || state.revision < 0 || !Array.isArray(state.jobs) || !(state.activeJobId === null || typeof state.activeJobId === 'string')) fail('INVALID_INDEX', 'Invalid workspace revision or jobs.');
  if (!Number.isSafeInteger(state.inputRevision) || state.inputRevision < 0 || typeof state.name !== 'string' || !state.name.trim()) fail('INVALID_INDEX', 'Invalid workspace name or input revision.');
  for (const key of ['ai', 'profiles', 'inputs', 'artifacts', 'ledger', 'readiness']) if (!plainObject(state[key])) fail('INVALID_INDEX', 'Invalid workspace metadata section.');
  if (state.jobs.some((job) => !plainObject(job))) fail('INVALID_INDEX', 'Jobs must be metadata objects.');
  if (Buffer.byteLength(`${JSON.stringify(state, null, 2)}\n`) > MAX_BYTES) fail('INDEX_TOO_LARGE', 'The workspace index exceeds its size limit.');
  return state;
}

async function readSnapshot(directory) {
  const path = join(directory, INDEX);
  for (let attempt = 0; attempt < 3; attempt++) {
    await checkDirectory(directory);
    const stat = await checkedFile(path, { missing: true });
    if (!stat) return defaultState();
    if (stat.size > MAX_BYTES) fail('INDEX_TOO_LARGE', 'The workspace index exceeds its size limit.');
    const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    let opened;
    let content;
    try {
      opened = await handle.stat();
      if (!opened.isFile() || opened.nlink > 1) fail('UNSAFE_PATH', 'The workspace index must be a regular, unlinked file.');
      if (opened.size > MAX_BYTES) fail('INDEX_TOO_LARGE', 'The workspace index exceeds its size limit.');
      if (opened.ino === stat.ino && opened.dev === stat.dev && opened.nlink === 1) {
        content = await handle.readFile('utf8');
      }
    } finally { await handle.close(); }
    // Windows readers can block rename. Close immediately after reading bytes;
    // filesystem rechecks and CPU-only JSON validation must not hold the handle.
    await checkDirectory(directory);
    await checkedFile(path);
    if (content === undefined) continue;
    // A normal replacement after our read does not invalidate the complete old
    // snapshot. Only an identity change between the initial check and open retries.
    if (Buffer.byteLength(content) > MAX_BYTES) fail('INDEX_TOO_LARGE', 'The workspace index exceeds its size limit.');
    let state;
    try { state = JSON.parse(content); } catch { fail('CORRUPT_INDEX', 'The workspace index is not valid JSON; incomplete snapshots are not promoted.'); }
    // The initial, unreleased schema-1 index predates these additive metadata fields.
    if (plainObject(state) && state.schemaVersion === 1) {
      for (const key of ['inputRevision', 'name', 'ai']) if (!Object.hasOwn(state, key)) state[key] = defaultState()[key];
    }
    return validateState(state);
  }
  fail('SNAPSHOT_BUSY', 'The workspace snapshot changed repeatedly; retry the read.');
}

async function atomicSnapshot(directory, state) {
  validateState(state);
  await checkDirectory(directory);
  await checkedFile(join(directory, INDEX), { missing: true });
  const temporary = join(directory, `.workspace-${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, 'wx', 0o600);
    await handle.writeFile(`${JSON.stringify(state, null, 2)}\n`, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;
    for (let attempt = 0; ; attempt++) {
      await checkDirectory(directory);
      await checkedFile(join(directory, INDEX), { missing: true });
      try { await rename(temporary, join(directory, INDEX)); break; }
      catch (error) {
        if (process.platform !== 'win32' || !['EPERM', 'EBUSY'].includes(error.code)) throw error;
        if (attempt >= 11) fail('SNAPSHOT_BUSY', 'The workspace snapshot is in use; retry the save.');
        // Windows readers can briefly prevent replacement. Keep the previous index
        // intact and retry the same atomic rename, never delete it to make space.
        // Bounded to 12 attempts and 1,565 ms of backoff. The former 155 ms
        // budget could expire while independent Windows readers were polling.
        await delay(Math.min(5 * (2 ** attempt), 250));
      }
    }
    // Directory fsync is not available on Windows. File contents are synced before rename.
    if (process.platform !== 'win32') {
      const directoryHandle = await open(directory, 'r');
      try { await directoryHandle.sync(); } finally { await directoryHandle.close(); }
    }
  } finally {
    if (handle) await handle.close();
    try { await unlink(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

async function lockRecord(path) {
  const stat = await checkedFile(path, { missing: true });
  if (!stat) return null;
  if (stat.size > 4096) return {};
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return {}; }
}
function confirmedDead(record) {
  if (!record || !Number.isSafeInteger(record.pid) || record.pid <= 0) return false;
  try { process.kill(record.pid, 0); return false; } catch (error) { return error.code === 'ESRCH'; }
}
async function createLock(path, record) {
  let handle;
  try { handle = await open(path, 'wx', 0o600); } catch (error) { if (error.code === 'EEXIST') return false; throw error; }
  try { await handle.writeFile(JSON.stringify(record)); await handle.sync(); } finally { await handle.close(); }
  return true;
}

async function acquireLock(directory, record) {
  const path = join(directory, LOCK);
  if (await createLock(path, record)) return true;
  if (!confirmedDead(await lockRecord(path))) return false;
  // Serialize stale-lock removal. An abandoned reclaim guard is deliberately read-only:
  // recursively stealing a recovery guard cannot provide a safe compare-and-delete.
  const guard = join(directory, `${LOCK}.reclaim`);
  if (!(await createLock(guard, record))) { await checkedFile(guard); return false; }
  try {
    const current = await lockRecord(path);
    if (current && !confirmedDead(current)) return false;
    if (current) await unlink(path);
    return await createLock(path, record);
  } finally { await unlink(guard); }
}

function recoverJobs(state) {
  let changed = false;
  for (const job of state.jobs) {
    if (!ACTIVE.has(String(job.status).toLowerCase())) continue;
    const operation = String(job.operation ?? job.command ?? job.kind ?? job.type ?? '').toLowerCase();
    const mode = String(job.mode ?? '').toLowerCase().replaceAll('_', '-');
    job.status = READ_OPERATIONS.has(operation) && !['commit', 'dry-run'].includes(mode) ? 'interrupted' : 'unknown';
    job.recoveryReason = 'launcher-restarted';
    changed = true;
  }
  if (state.activeJobId !== null) { state.activeJobId = null; changed = true; }
  if (changed) state.revision += 1;
  return changed;
}

export async function openWorkspace({ directory } = {}) {
  if (typeof directory !== 'string' || !isAbsolute(directory) || directory.includes('\0') || /^[/\\]{2}/.test(directory)) fail('DIRECTORY_REQUIRED', 'Choose an absolute local directory outside Git.');
  directory = resolve(directory);
  await checkDirectory(directory, true);
  await checkDirectory(join(directory, 'artifacts'), true);
  const record = { pid: process.pid, owner: randomUUID() };
  const writable = await acquireLock(directory, record);
  let closed = false;
  let closing = false;
  let closePromise;
  let queue = Promise.resolve();
  const lockPath = join(directory, LOCK);
  async function release() {
    if (writable && (await lockRecord(lockPath))?.owner === record.owner) await unlink(lockPath);
  }
  function ensureOpen() { if (closed) fail('CLOSED', 'The workspace is closed.'); }
  try {
    const state = await readSnapshot(directory);
    if (writable && (recoverJobs(state) || !(await statOrNull(join(directory, INDEX))))) await atomicSnapshot(directory, state);
  } catch (error) { await release(); throw error; }
  return {
    directory,
    readOnly: !writable,
    read() {
      if (closing || closed) return Promise.reject(new WorkspaceError('WORKSPACE_CLOSED', 'The workspace is closed.'));
      const result = queue.then(async () => { ensureOpen(); return structuredClone(await readSnapshot(directory)); });
      queue = result.catch(() => {});
      return result;
    },
    update(revision, updater) {
      if (closing || closed) return Promise.reject(new WorkspaceError('WORKSPACE_CLOSED', 'The workspace is closed.'));
      const result = queue.then(async () => {
        ensureOpen();
        if (!writable) fail('READ_ONLY', 'Another writer owns this workspace.');
        if ((await lockRecord(lockPath))?.owner !== record.owner) fail('LOCK_LOST', 'The workspace writer lock was lost.');
        const current = await readSnapshot(directory);
        if (!Number.isSafeInteger(revision) || current.revision !== revision) fail('REVISION_CONFLICT', 'The workspace changed; reload before saving.');
        if (typeof updater !== 'function') fail('INVALID_UPDATE', 'An internal synchronous updater is required.');
        const draft = structuredClone(current);
        const returned = updater(draft);
        const next = returned === undefined ? draft : returned;
        if (!plainObject(next) || typeof next?.then === 'function') fail('INVALID_UPDATE', 'An internal synchronous updater is required.');
        if (next.revision !== current.revision || next.schemaVersion !== 1) fail('INVALID_UPDATE', 'Revision and schema version are managed by the workspace.');
        next.revision += 1;
        await atomicSnapshot(directory, next);
        return structuredClone(next);
      });
      queue = result.catch(() => {});
      return result;
    },
    async resolveArtifact(name) {
      ensureOpen();
      artifactName(name);
      const root = join(directory, 'artifacts');
      const path = join(root, ...name.split('/'));
      await checkDirectory(dirname(path));
      await checkedFile(path, { missing: true });
      return path;
    },
    close() {
      if (closePromise) return closePromise;
      closing = true;
      closePromise = queue.then(async () => {
        await release();
        closed = true;
      });
      return closePromise;
    },
  };
}
