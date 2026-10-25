import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import filesystem from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { openWorkspace, WorkspaceError } from './store.mjs';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'migration-store-test-'));
  const stores = [];
  t.after(async () => {
    await Promise.all(stores.map((store) => store.close()));
    assert.ok(directory.startsWith(join(tmpdir(), 'migration-store-test-')));
    await rm(directory, { recursive: true, force: true });
  });
  return {
    directory,
    async open(path = directory, options = {}) {
      const store = await openWorkspace({ directory: path, ...options });
      stores.push(store);
      return store;
    },
  };
}

const code = (expected) => (error) => error instanceof WorkspaceError && error.code === `WORKSPACE_${expected}`;

test('creates versioned metadata and returns independent snapshots', async (t) => {
  const f = await fixture(t);
  const store = await f.open();
  assert.equal(store.directory, resolve(f.directory));
  assert.equal(store.readOnly, false);
  const initial = await store.read();
  assert.deepEqual(initial, { schemaVersion: 1, revision: 0, inputRevision: 0, name: '이관 작업공간', ai: {}, profiles: {}, inputs: {}, artifacts: {}, ledger: {}, jobs: [], activeJobId: null, readiness: {} });
  initial.inputs.changedOutside = true;
  assert.deepEqual((await store.read()).inputs, {});
  const saved = await store.update(0, (state) => {
    state.name = '기관 초기 이관';
    state.inputRevision = 1;
    state.ai = { provider: 'codex', status: 'disconnected' };
    state.profiles.source = { host: 'legacy.internal', username: 'reader', port: 5432 };
    state.inputs.source = { path: 'D:/legacy-source', digest: 'abc123' };
    state.artifacts.inventory = { file: 'run-1/inventory.json', sha256: 'def456', format: 'json', bytes: 123 };
  });
  assert.equal(saved.revision, 1);
  assert.equal(saved.inputRevision, 1);
  assert.equal(saved.name, '기관 초기 이관');
  assert.deepEqual(saved.ai, { provider: 'codex', status: 'disconnected' });
  saved.profiles.source.username = 'changed outside';
  assert.equal((await store.read()).profiles.source.username, 'reader');
  assert.deepEqual(JSON.parse(await readFile(join(f.directory, 'workspace.json'), 'utf8')), await store.read());
  assert.equal((await readdir(f.directory)).filter((name) => name.endsWith('.tmp')).length, 0);
  await Promise.all([store.close(), store.close()]);
  await assert.rejects(store.read(), code('CLOSED'));
  await assert.rejects(store.update(1, () => {}), code('CLOSED'));
  await assert.rejects(store.resolveArtifact('inventory.json'), code('CLOSED'));
});

test('only one writer can save and concurrent stale revisions conflict', async (t) => {
  const f = await fixture(t);
  const writer = await f.open();
  const reader = await f.open();
  assert.equal(reader.readOnly, true);
  await assert.rejects(reader.update(0, () => {}), code('READ_ONLY'));
  const attempts = await Promise.allSettled([
    writer.update(0, (state) => { state.readiness.source = true; }),
    writer.update(0, (state) => { state.readiness.target = true; }),
  ]);
  assert.equal(attempts[0].status, 'fulfilled');
  assert.equal(attempts[1].status, 'rejected');
  assert.equal(attempts[1].reason.code, 'WORKSPACE_REVISION_CONFLICT');
  assert.deepEqual((await reader.read()).readiness, { source: true });
  await reader.close();
  assert.equal((await f.open()).readOnly, true);
  await writer.close();
  const newWriter = await f.open();
  assert.equal(newWriter.readOnly, false);
  assert.equal((await newWriter.update(1, (state) => state)).revision, 2);
});

test('reads queued after updates observe the complete committed snapshot', async (t) => {
  const f = await fixture(t);
  const store = await f.open();
  const operations = [];
  for (let revision = 0; revision < 20; revision++) {
    operations.push(store.update(revision, (state) => {
      state.readiness = { sequence: revision + 1, label: `snapshot-${revision + 1}` };
    }));
    operations.push(store.read().then((state) => {
      assert.equal(state.revision, revision + 1);
      assert.deepEqual(state.readiness, { sequence: revision + 1, label: `snapshot-${revision + 1}` });
    }));
  }
  const results = await Promise.allSettled(operations);
  for (const result of results) if (result.status === 'rejected') throw result.reason;
  assert.equal((await store.read()).revision, 20);
});

test('independent read-only pollers see complete snapshots during atomic replacement', async (t) => {
  const f = await fixture(t);
  const writer = await f.open();
  const readers = await Promise.all([f.open(), f.open(), f.open()]);
  assert.ok(readers.every((store) => store.readOnly));
  let finished = false;
  const polling = readers.map(async (reader) => {
    let previousRevision = 0;
    do {
      const state = await reader.read();
      assert.ok(state.revision >= previousRevision);
      if (state.revision) assert.deepEqual(state.readiness, { sequence: state.revision, label: `snapshot-${state.revision}` });
      previousRevision = state.revision;
    } while (!finished);
  });
  const writing = (async () => {
    try {
      for (let revision = 0; revision < 30; revision++) {
        await writer.update(revision, (state) => { state.readiness = { sequence: revision + 1, label: `snapshot-${revision + 1}` }; });
      }
    } finally { finished = true; }
  })();
  const results = await Promise.allSettled([writing, ...polling]);
  for (const result of results) if (result.status === 'rejected') throw result.reason;
  assert.equal((await writer.read()).revision, 30);
  assert.equal((await readdir(f.directory)).filter((name) => name.endsWith('.tmp')).length, 0);
});

// Windows 교체 경합 분기는 플랫폼을 주입해 모든 OS 에서 실행한다 — 필수 CI(Linux)에서 건너뛰지 않는다.
test('Windows snapshot replacement tolerates bounded contention without deleting the committed index', async (t) => {
  const f = await fixture(t);
  const store = await f.open(f.directory, { platform: 'win32' });
  const index = join(f.directory, 'workspace.json');
  const committed = await readFile(index, 'utf8');
  const originalRename = filesystem.rename;
  let attempts = 0;
  const mocked = t.mock.method(filesystem, 'rename', async (source, destination) => {
    if (destination === index && attempts++ < 7) {
      assert.equal(await readFile(index, 'utf8'), committed);
      throw Object.assign(new Error('synthetic contention'), { code: attempts % 2 ? 'EPERM' : 'EBUSY' });
    }
    return originalRename(source, destination);
  });
  syncBuiltinESMExports();
  try {
    const saved = await store.update(0, state => { state.name = 'after contention'; });
    assert.equal(saved.revision, 1);
    assert.equal((await store.read()).name, 'after contention');
    assert.ok(attempts > 7);
    assert.equal((await readdir(f.directory)).some(name => name.endsWith('.tmp')), false);
  } finally { mocked.mock.restore(); syncBuiltinESMExports(); }
});

test('Windows persistent contention fails boundedly and keeps the old revision available for retry', async (t) => {
  const f = await fixture(t);
  const store = await f.open(f.directory, { platform: 'win32' });
  const index = join(f.directory, 'workspace.json');
  const committed = await readFile(index, 'utf8');
  const originalRename = filesystem.rename;
  let attempts = 0;
  const mocked = t.mock.method(filesystem, 'rename', async (source, destination) => {
    if (destination === index) { attempts++; throw Object.assign(new Error('synthetic contention'), { code: 'EBUSY' }); }
    return originalRename(source, destination);
  });
  syncBuiltinESMExports();
  try {
    await assert.rejects(store.update(0, state => { state.name = 'never committed'; }), code('SNAPSHOT_BUSY'));
    assert.ok(attempts > 1 && attempts <= 20);
    assert.equal(await readFile(index, 'utf8'), committed);
    assert.equal((await store.read()).revision, 0);
    assert.equal((await readdir(f.directory)).some(name => name.endsWith('.tmp')), false);
  } finally { mocked.mock.restore(); syncBuiltinESMExports(); }
  assert.equal((await store.update(0, state => { state.name = 'retry succeeded'; })).revision, 1);
});

// Linux 의 동시 교체에서 lstat 가 끊긴 이전 inode(nlink 0)를 돌려주는 경합을 결정적으로 재현한다. 교체 중은 다시 읽고(유한),
// 하드 링크(nlink 2)는 그대로 거부한다. 두 판정을 합치면 폴러 시험이 Linux 에서 가끔 UNSAFE_PATH 로 붉어진다.
test('a reader retries an index replaced during lookup but still rejects hard links', async (t) => {
  const f = await fixture(t);
  const writer = await f.open();
  await writer.update(0, (state) => { state.readiness.sequence = 1; });
  const reader = await f.open();
  const index = join(f.directory, 'workspace.json');
  const originalLstat = filesystem.lstat;
  let nlink = 0;
  let remaining = 1;
  const mocked = t.mock.method(filesystem, 'lstat', async (path, ...rest) => {
    const stat = await originalLstat(path, ...rest);
    if (path !== index || remaining === 0) return stat;
    remaining -= 1;
    return Object.assign(Object.create(Object.getPrototypeOf(stat)), stat, { nlink });
  });
  syncBuiltinESMExports();
  try {
    assert.deepEqual((await reader.read()).readiness, { sequence: 1 });
    assert.equal(remaining, 0);
    remaining = Infinity;
    await assert.rejects(reader.read(), code('SNAPSHOT_BUSY'));
    nlink = 2;
    remaining = 1;
    await assert.rejects(reader.read(), code('UNSAFE_PATH'));
  } finally { mocked.mock.restore(); syncBuiltinESMExports(); }
  assert.equal((await reader.read()).revision, 1);
});

// 부정 사례: 재시도는 Windows 에만 있다. 다른 플랫폼의 같은 오류는 한 번에 원래 오류로 실패하고 이전 판을 남긴다.
// 주입이 무시되거나 재시도가 모든 OS 로 넓어지면 이 시험이 붉어진다.
test('non-Windows rename errors are not retried and keep the committed index', async (t) => {
  const f = await fixture(t);
  const store = await f.open(f.directory, { platform: 'linux' });
  const index = join(f.directory, 'workspace.json');
  const committed = await readFile(index, 'utf8');
  const originalRename = filesystem.rename;
  let attempts = 0;
  const mocked = t.mock.method(filesystem, 'rename', async (source, destination) => {
    if (destination === index) { attempts++; throw Object.assign(new Error('synthetic contention'), { code: 'EBUSY' }); }
    return originalRename(source, destination);
  });
  syncBuiltinESMExports();
  try {
    await assert.rejects(store.update(0, state => { state.name = 'never committed'; }), (error) => error.code === 'EBUSY' && !(error instanceof WorkspaceError));
    assert.equal(attempts, 1);
    assert.equal(await readFile(index, 'utf8'), committed);
    assert.equal((await readdir(f.directory)).some(name => name.endsWith('.tmp')), false);
  } finally { mocked.mock.restore(); syncBuiltinESMExports(); }
  await assert.rejects(openWorkspace({ directory: join(f.directory, 'other'), platform: '' }), code('INVALID_PLATFORM'));
});

test('reclaims a confirmed dead process once and preserves unknown or guarded locks', async (t) => {
  const f = await fixture(t);
  const dead = spawnSync(process.execPath, ['-e', ''], { windowsHide: true });
  assert.equal(dead.status, 0);
  assert.throws(() => process.kill(dead.pid, 0), (error) => error.code === 'ESRCH');
  const lock = join(f.directory, 'workspace.lock');
  await writeFile(lock, JSON.stringify({ pid: dead.pid, owner: 'old-owner' }));
  const candidates = await Promise.all([f.open(), f.open(), f.open()]);
  assert.equal(candidates.filter((store) => !store.readOnly).length, 1);
  assert.equal(JSON.parse(await readFile(lock, 'utf8')).pid, process.pid);
  for (const store of candidates) await store.close();
  await writeFile(lock, '{incomplete lock');
  const unknown = await f.open();
  assert.equal(unknown.readOnly, true);
  await unknown.close();
  assert.equal(await readFile(lock, 'utf8'), '{incomplete lock');
  await writeFile(lock, JSON.stringify({ pid: dead.pid, owner: 'old-owner' }));
  await writeFile(join(f.directory, 'workspace.lock.reclaim'), '{}');
  assert.equal((await f.open()).readOnly, true);
  assert.equal(JSON.parse(await readFile(lock, 'utf8')).owner, 'old-owner');
});

test('restart marks unfinished reads interrupted and uncertain writes unknown', async (t) => {
  const f = await fixture(t);
  const writer = await f.open();
  await writer.update(0, (state) => {
    state.jobs = [
      { id: 'read', command: 'discover', status: 'starting' },
      { id: 'load', operation: 'load', status: 'running' },
      { id: 'dry', command: 'load', mode: 'DRY_RUN', status: 'cancelling' },
      { id: 'commit', command: 'validate', mode: 'COMMIT', status: 'running' },
      { id: 'future', kind: 'future-operation', status: 'running' },
      { id: 'done', command: 'profile', status: 'succeeded' },
      { id: 'mapping', operation: 'mapping-generate', status: 'running' },
    ];
    state.activeJobId = 'load';
  });
  const observer = await f.open();
  assert.equal((await observer.read()).jobs[0].status, 'starting');
  await writer.close();
  const recovered = await f.open();
  const state = await recovered.read();
  assert.equal(state.revision, 2);
  assert.equal(state.activeJobId, null);
  assert.deepEqual(state.jobs.map((job) => job.status), ['interrupted', 'unknown', 'unknown', 'unknown', 'unknown', 'succeeded', 'interrupted']);
  assert.equal(state.jobs[1].recoveryReason, 'launcher-restarted');
  assert.equal(state.jobs[5].recoveryReason, undefined);
  await recovered.close();
  assert.equal((await (await f.open()).read()).revision, 2);
});

test('incomplete snapshots never replace committed state and corrupt indexes fail closed', async (t) => {
  const f = await fixture(t);
  const first = await f.open();
  await first.update(0, (state) => { state.readiness.ready = true; });
  await first.close();
  const orphan = join(f.directory, '.workspace-crashed.tmp');
  await writeFile(orphan, '{"schemaVersion":1,"revision":999');
  const reopened = await f.open();
  assert.equal((await reopened.read()).revision, 1);
  assert.deepEqual((await reopened.read()).readiness, { ready: true });
  assert.equal(await readFile(orphan, 'utf8'), '{"schemaVersion":1,"revision":999');
  await reopened.close();
  await writeFile(join(f.directory, 'workspace.json'), '{invalid');
  await assert.rejects(f.open(), code('CORRUPT_INDEX'));
  assert.equal(await readFile(join(f.directory, 'workspace.json'), 'utf8'), '{invalid');
  await assert.rejects(readFile(join(f.directory, 'workspace.lock')), (error) => error.code === 'ENOENT');
});

test('rejects secrets, raw output, non-JSON values and artifact paths without modifying disk', async (t) => {
  const f = await fixture(t);
  const store = await f.open();
  const before = await readFile(join(f.directory, 'workspace.json'), 'utf8');
  for (const key of ['password', 'access_token', 'privateKey', 'apiKey', 'secret', 'raw', 'stdout', 'stderr', 'sourceCode', 'content']) {
    await assert.rejects(store.update(0, (state) => { state.inputs[key] = 'fixture-only-value'; }), code('SENSITIVE_DATA'));
  }
  for (const value of ['password=fixture-only', 'Bearer fixture-only', 'postgresql://user:fixture-only@host/db', '-----BEGIN PRIVATE KEY-----']) {
    await assert.rejects(store.update(0, (state) => { state.inputs.label = value; }), code('SENSITIVE_DATA'));
  }
  for (const value of [undefined, NaN, Infinity, 3n, new Date(), () => {}, new Map(), Symbol('fixture')]) {
    await assert.rejects(store.update(0, (state) => { state.inputs.value = value; }), code('INVALID_INDEX'));
  }
  await assert.rejects(store.update(0, (state) => { state.inputs.self = state; }), code('INVALID_INDEX'));
  await assert.rejects(store.update(0, (state) => { state.inputs.list = []; state.inputs.list.extra = true; }), code('INVALID_INDEX'));
  await assert.rejects(store.update(0, (state) => { state.schemaVersion = 2; }), code('INVALID_UPDATE'));
  await assert.rejects(store.update(0, async () => ({})), code('INVALID_UPDATE'));
  await assert.rejects(store.update(0, (state) => { state.artifacts.inventory = { path: '../outside.json' }; }), code('UNSAFE_ARTIFACT'));
  await assert.rejects(store.update(0, (state) => { state.artifacts.inventory = { file: 'C:/outside.json' }; }), code('UNSAFE_ARTIFACT'));
  for (const value of [-1, 0.5, '1']) await assert.rejects(store.update(0, (state) => { state.inputRevision = value; }), code('INVALID_INDEX'));
  await assert.rejects(store.update(0, (state) => { state.name = ''; }), code('INVALID_INDEX'));
  await assert.rejects(store.update(0, (state) => { state.ai = []; }), code('INVALID_INDEX'));
  await assert.rejects(store.update(0, (state) => { state.ai.accessToken = 'fixture-only'; }), code('SENSITIVE_DATA'));
  assert.equal(await readFile(join(f.directory, 'workspace.json'), 'utf8'), before);
  assert.equal((await store.read()).revision, 0);
  assert.equal((await store.update(0, (state) => { state.readiness.valid = true; })).revision, 1);
});

test('reads the initial schema-1 index with additive metadata defaults', async (t) => {
  const f = await fixture(t);
  await writeFile(join(f.directory, 'workspace.json'), JSON.stringify({ schemaVersion: 1, revision: 4, profiles: {}, inputs: {}, artifacts: {}, ledger: {}, jobs: [], activeJobId: null, readiness: {} }));
  const store = await f.open();
  const state = await store.read();
  assert.equal(state.revision, 4);
  assert.equal(state.inputRevision, 0);
  assert.equal(state.name, '이관 작업공간');
  assert.deepEqual(state.ai, {});
  await store.update(4, (draft) => { draft.name = '이어하기'; });
  assert.equal(JSON.parse(await readFile(join(f.directory, 'workspace.json'), 'utf8')).inputRevision, 0);
});

test('rejects traversal, Git directories, worktree markers, and symlink ancestors or artifacts', async (t) => {
  const f = await fixture(t);
  await assert.rejects(openWorkspace({ directory: 'relative/workspace' }), code('DIRECTORY_REQUIRED'));
  for (const gitKind of ['directory', 'file']) {
    const repo = join(f.directory, `repository-${gitKind}`);
    await mkdir(repo);
    if (gitKind === 'directory') await mkdir(join(repo, '.git'));
    else await writeFile(join(repo, '.git'), 'gitdir: fixture');
    await assert.rejects(f.open(join(repo, 'work')), code('GIT_DIRECTORY'));
  }
  const store = await f.open(join(f.directory, 'safe'));
  for (const name of ['../x', 'a/../x', '/outside', 'C:/outside', 'a\\x', 'a//x', '.', '.hidden', 'a/%2e%2e/x', 'nul.json', 'a/CON', 'a./x', 'x:stream']) {
    await assert.rejects(store.resolveArtifact(name), code('UNSAFE_ARTIFACT'));
  }
  assert.equal(await store.resolveArtifact('run-1/inventory.json'), join(store.directory, 'artifacts', 'run-1', 'inventory.json'));
  const outside = join(f.directory, 'external');
  await mkdir(outside);
  const linked = join(f.directory, 'linked');
  await symlink(outside, linked, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(f.open(join(linked, 'workspace')), code('UNSAFE_PATH'));
  await symlink(outside, join(store.directory, 'artifacts', 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(store.resolveArtifact('escape/inventory.json'), code('UNSAFE_PATH'));
  await symlink(outside, join(store.directory, 'workspace.json.link'), process.platform === 'win32' ? 'junction' : 'dir');
  await store.close();
  const unsafe = join(f.directory, 'unsafe-index');
  await mkdir(unsafe);
  await symlink(outside, join(unsafe, 'workspace.json'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(f.open(unsafe), code('UNSAFE_PATH'));
});
