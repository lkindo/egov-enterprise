import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, linkSync, symlinkSync, unlinkSync, statSync, readdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const api = await import('./store.mjs').catch((error) => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});
function fixture(t, options = {}) {
  assert.equal(typeof api.createRequirementsStore, 'function');
  const directory = mkdtempSync(join(tmpdir(), 'egov-requirements-store-'));
  const workspace = join(directory, 'workspace');
  const store = api.createRequirementsStore({ workspace, initialBacklog: { project: { code: 'SYNTHETIC' }, requirements: [] }, ...options });
  t.after(() => store.close());
  return { directory, workspace, store };
}

test('requirements workspace exposes a durable store instead of browser-only state', async () => {
  const store = await import('./store.mjs').catch((error) => {
    if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
    throw error;
  });
  assert.equal(typeof store.createRequirementsStore, 'function');
});

test('persists edits across restart and rejects stale browser revisions', (t) => {
  const { workspace, store } = fixture(t);
  const before = store.read();
  const after = store.transact(before.revision, (draft) => {
    draft.backlog.requirements.push({ id: 'REQ-001', title: '합성 요구사항' });
    draft.metadata.note = '검토 중';
  });
  assert.notEqual(after.revision, before.revision);
  assert.throws(() => store.transact(before.revision, () => {}), { code: 'REQUIREMENTS_REVISION_CONFLICT' });
  assert.deepEqual(store.read(), after);
  store.close();
  const reopened = api.createRequirementsStore({ workspace });
  t.after(() => reopened.close());
  assert.deepEqual(reopened.read(), after);
});

test('one process owns writes and never steals a live or unknown lock', (t) => {
  const { workspace, store } = fixture(t);
  assert.throws(() => api.createRequirementsStore({ workspace }), { code: 'REQUIREMENTS_LOCKED' });
  store.close();
  writeFileSync(join(workspace, '.requirements-ui.lock'), '{}');
  assert.throws(() => api.createRequirementsStore({ workspace }), { code: 'REQUIREMENTS_LOCKED' });
});

test('validation failure leaves both files and the revision unchanged', (t) => {
  const { workspace, store } = fixture(t, {
    validateBacklog: (backlog) => ({ valid: backlog.project.code !== 'BLOCKED' }),
    validateMetadata: (metadata) => ({ valid: !metadata.forbidden }),
  });
  const before = store.read();
  const bytes = readFileSync(join(workspace, 'backlog.json'), 'utf8');
  assert.throws(() => store.transact(before.revision, (draft) => { draft.backlog.project.code = 'BLOCKED'; }), { code: 'REQUIREMENTS_INVALID_BACKLOG' });
  assert.throws(() => store.transact(before.revision, (draft) => { draft.metadata.forbidden = true; }), { code: 'REQUIREMENTS_INVALID_METADATA' });
  assert.equal(readFileSync(join(workspace, 'backlog.json'), 'utf8'), bytes);
  assert.deepEqual(store.read(), before);
});

test('foreign file changes cannot be overwritten even with the last known revision', (t) => {
  const { workspace, store } = fixture(t);
  const before = store.read();
  const foreign = '{"project":{"code":"FOREIGN"},"requirements":[]}\n';
  writeFileSync(join(workspace, 'backlog.json'), foreign);
  assert.throws(() => store.transact(before.revision, () => {}), { code: 'REQUIREMENTS_EXTERNAL_CHANGE' });
  assert.equal(readFileSync(join(workspace, 'backlog.json'), 'utf8'), foreign);
});

test('Git checkout and linked-worktree paths are rejected before creating directories', () => {
  assert.equal(typeof api.createRequirementsStore, 'function');
  const directory = mkdtempSync(join(tmpdir(), 'egov-requirements-git-'));
  writeFileSync(join(directory, '.git'), 'gitdir: missing-linked-worktree');
  const workspace = join(directory, 'must-not-exist', 'workspace');
  assert.throws(() => api.createRequirementsStore({ workspace, initialBacklog: {} }), { code: 'REQUIREMENTS_GIT_WORKSPACE' });
  assert.equal(existsSync(join(directory, 'must-not-exist')), false);
  assert.throws(() => api.createRequirementsStore({ workspace: resolve('tools/requirements-workspace/never-create'), initialBacklog: {} }), { code: 'REQUIREMENTS_GIT_WORKSPACE' });
});

test('hardlinks are rejected without modifying the other link', (t) => {
  const { workspace, directory, store } = fixture(t);
  store.close();
  const other = join(directory, 'other.json');
  linkSync(join(workspace, 'backlog.json'), other);
  const before = readFileSync(other, 'utf8');
  assert.throws(() => api.createRequirementsStore({ workspace }), { code: 'REQUIREMENTS_UNSAFE_PATH' });
  assert.equal(readFileSync(other, 'utf8'), before);
});

test('directory links are rejected before persisting customer content', () => {
  assert.equal(typeof api.createRequirementsStore, 'function');
  const directory = mkdtempSync(join(tmpdir(), 'egov-requirements-link-'));
  const target = join(directory, 'target');
  mkdirSync(target);
  const linked = join(directory, 'linked');
  symlinkSync(target, linked, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => api.createRequirementsStore({ workspace: join(linked, 'child'), initialBacklog: {} }), { code: 'REQUIREMENTS_UNSAFE_PATH' });
  assert.equal(existsSync(join(target, 'child')), false);
});

test('non-JSON and oversized snapshots are rejected before persistence', (t) => {
  const { store } = fixture(t);
  const before = store.read();
  assert.throws(() => store.transact(before.revision, (draft) => { draft.metadata.value = NaN; }), { code: 'REQUIREMENTS_INVALID_JSON' });
  assert.throws(() => store.transact(before.revision, (draft) => { draft.metadata.large = 'x'.repeat(8 * 1024 * 1024); }), { code: 'REQUIREMENTS_TOO_LARGE' });
  assert.deepEqual(store.read(), before);
});

test('a process interruption between file replacements recovers the complete transaction', (t) => {
  const { workspace, store } = fixture(t);
  store.close();
  const script = `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    const rename = fs.renameSync;
    fs.renameSync = (from,to) => {
      const result = rename(from,to);
      if (to.endsWith('backlog.json')) process.exit(37);
      return result;
    };
    syncBuiltinESMExports();
    const { createRequirementsStore } = await import(${JSON.stringify(pathToFileURL(resolve('tools/requirements-workspace/store.mjs')).href)});
    const store = createRequirementsStore({workspace: ${JSON.stringify(workspace)}});
    store.transact(store.read().revision, (draft) => { draft.backlog.project.code='RECOVERED'; draft.metadata.saved=true; });
  `;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(child.status, 37, child.stderr);
  assert.equal(existsSync(join(workspace, '.requirements-ui.transaction.json')), true);
  const recovered = api.createRequirementsStore({ workspace });
  t.after(() => recovered.close());
  assert.equal(recovered.read().backlog.project.code, 'RECOVERED');
  assert.equal(recovered.read().metadata.saved, true);
  assert.equal(existsSync(join(workspace, '.requirements-ui.transaction.json')), false);
});

test('recovery refuses unrelated edits instead of erasing them', (t) => {
  const { workspace, store } = fixture(t);
  store.close();
  const backlog = readFileSync(join(workspace, 'backlog.json'), 'utf8');
  const metadata = readFileSync(join(workspace, 'requirements-ui.json'), 'utf8');
  const hash = (value) => createHash('sha256').update(value).digest('hex');
  writeFileSync(join(workspace, '.requirements-ui.transaction.json'), JSON.stringify({
    schemaVersion: 1,
    before: { backlog: hash(backlog), metadata: hash(metadata) },
    after: { backlog, metadata },
  }));
  const foreign = '{"foreign":true}\n';
  writeFileSync(join(workspace, 'backlog.json'), foreign);
  assert.throws(() => api.createRequirementsStore({ workspace }), { code: 'REQUIREMENTS_RECOVERY_CONFLICT' });
  assert.equal(readFileSync(join(workspace, 'backlog.json'), 'utf8'), foreign);
});

test('malformed UTF-8 is rejected rather than silently replacing customer text', (t) => {
  const { workspace, store } = fixture(t);
  store.close();
  const bytes = Buffer.concat([Buffer.from('{"project":{"code":"'), Buffer.from([0xff]), Buffer.from('"},"requirements":[]}')]);
  writeFileSync(join(workspace, 'backlog.json'), bytes);
  assert.throws(() => api.createRequirementsStore({ workspace }), { code: 'REQUIREMENTS_CORRUPT_JSON' });
  assert.deepEqual(readFileSync(join(workspace, 'backlog.json')), bytes);
});

test('opening an existing CLI backlog preserves its bytes and supplies only the UI sidecar', (t) => {
  assert.equal(typeof api.createRequirementsStore, 'function');
  const workspace = mkdtempSync(join(tmpdir(), 'egov-requirements-import-'));
  const original = '{ "project": {"code":"CLI"}, "requirements": [] }\n';
  writeFileSync(join(workspace, 'backlog.json'), original);
  const store = api.createRequirementsStore({ workspace, initialMetadata: { imported: true } });
  t.after(() => store.close());
  assert.equal(readFileSync(join(workspace, 'backlog.json'), 'utf8'), original);
  assert.equal(store.read().metadata.imported, true);
});

test('validator exceptions and unsafe JSON properties never escape in error messages', (t) => {
  const { store } = fixture(t, { validateBacklog: (value) => { if (value.project.code === 'REJECT') throw new Error('sensitive raw contents'); } });
  const before = store.read();
  assert.throws(() => store.transact(before.revision, (draft) => { draft.backlog.project.code = 'REJECT'; }), (error) => error.code === 'REQUIREMENTS_INVALID_BACKLOG' && !error.message.includes('sensitive raw contents'));
  assert.throws(() => store.transact(before.revision, (draft) => { Object.defineProperty(draft.metadata, 'field', { enumerable: true, get() { throw new Error('must not invoke'); } }); }), { code: 'REQUIREMENTS_INVALID_JSON' });
  assert.deepEqual(store.read(), before);
});

test('removed or replaced ownership does not allow a writer to continue', (t) => {
  const { workspace, store } = fixture(t);
  const before = store.read();
  writeFileSync(join(workspace, '.requirements-ui.lock'), JSON.stringify({ host: 'foreign', pid: 1, owner: 'other' }));
  assert.throws(() => store.transact(before.revision, () => {}), { code: 'REQUIREMENTS_LOCK_LOST' });
  store.close();
  assert.equal(JSON.parse(readFileSync(join(workspace, '.requirements-ui.lock'), 'utf8')).owner, 'other');
});

test('UI creation and context refresh atomically maintain the CLI context exchange file', (t) => {
  const context = { snapshotDigest: 'context-one', modules: [], screens: [] };
  const { workspace, store } = fixture(t, {
    initialBacklog: { project: { code: 'SYNTHETIC' }, contextSnapshotDigest: context.snapshotDigest },
    initialMetadata: { context },
  });
  assert.equal(existsSync(join(workspace, 'context.snapshot.json')), true);
  assert.deepEqual(JSON.parse(readFileSync(join(workspace, 'context.snapshot.json'), 'utf8')), context);
  const before = store.read();
  assert.deepEqual(before.contextSnapshot, context);
  assert.equal(before.contextConflict, false);
  const next = { ...context, snapshotDigest: 'context-two', screens: [{ route: '/new-screen' }] };
  const after = store.transact(before.revision, (draft) => {
    draft.backlog.contextSnapshotDigest = next.snapshotDigest;
    draft.metadata.context = next;
  }, { refreshContext: true });
  assert.deepEqual(JSON.parse(readFileSync(join(workspace, 'context.snapshot.json'), 'utf8')), next);
  assert.deepEqual(after.contextSnapshot, next);
  assert.equal(after.contextConflict, false);
  assert.throws(() => store.transact(after.revision, (draft) => { draft.backlog.contextSnapshotDigest = 'wrong'; }), { code: 'REQUIREMENTS_CONTEXT_CONFLICT' });
  assert.deepEqual(store.read(), after);
});

test('first UI open adopts matching CLI context bytes instead of overwriting them with the latest repository', (t) => {
  const workspace = mkdtempSync(join(tmpdir(), 'egov-requirements-cli-context-'));
  const context = { snapshotDigest: 'cli-context', modules: [], screens: [] };
  const bytes = `{ "snapshotDigest": "cli-context", "modules": [], "screens": [] }\n`;
  writeFileSync(join(workspace, 'backlog.json'), JSON.stringify({ project: { code: 'CLI' }, contextSnapshotDigest: 'cli-context' }));
  writeFileSync(join(workspace, 'context.snapshot.json'), bytes);
  const store = api.createRequirementsStore({ workspace, initialMetadata: { context: { snapshotDigest: 'latest-repository-context' } } });
  t.after(() => store.close());
  assert.deepEqual(store.read().metadata.context, context);
  assert.equal(store.read().contextConflict, false);
  assert.equal(readFileSync(join(workspace, 'context.snapshot.json'), 'utf8'), bytes);
});

test('CLI changes after UI shutdown remain visible as a context conflict until an explicit refresh', (t) => {
  const context = { snapshotDigest: 'context-one', modules: [], screens: [] };
  const { workspace, store } = fixture(t, {
    initialBacklog: { project: { code: 'SYNTHETIC' }, contextSnapshotDigest: context.snapshotDigest }, initialMetadata: { context },
  });
  store.close();
  const next = { ...context, snapshotDigest: 'context-two' };
  writeFileSync(join(workspace, 'context.snapshot.json'), JSON.stringify(next));
  writeFileSync(join(workspace, 'backlog.json'), JSON.stringify({ project: { code: 'SYNTHETIC' }, contextSnapshotDigest: next.snapshotDigest }));
  const reopened = api.createRequirementsStore({ workspace });
  t.after(() => reopened.close());
  const state = reopened.read();
  assert.equal(state.contextConflict, true);
  assert.deepEqual(state.contextSnapshot, next);
  assert.deepEqual(state.metadata.context, context);
  assert.throws(() => reopened.transact(state.revision, draft => { draft.metadata.note = 'ordinary edit'; }), { code: 'REQUIREMENTS_CONTEXT_CONFLICT' });
  const after = reopened.transact(state.revision, draft => { draft.metadata.context = next; }, { refreshContext: true });
  assert.equal(after.contextConflict, false);
});

test('a changed context exchange file participates in CAS and keeps a read-only trusted copy', (t) => {
  const context = { snapshotDigest: 'context-one', modules: [], screens: [] };
  const { workspace, store } = fixture(t, {
    initialBacklog: { project: { code: 'SYNTHETIC' }, contextSnapshotDigest: context.snapshotDigest }, initialMetadata: { context },
  });
  const before = store.read();
  writeFileSync(join(workspace, 'context.snapshot.json'), '{"foreign":true}\n');
  assert.throws(() => store.read(), { code: 'REQUIREMENTS_EXTERNAL_CHANGE' });
  assert.equal(store.readOnly, true);
  assert.equal(store.readonly, true);
  assert.equal(store.reason, 'REQUIREMENTS_EXTERNAL_CHANGE');
  assert.deepEqual(store.getTrustedSnapshot(), before);
  const copy = store.getTrustedSnapshot();
  copy.backlog.project.code = 'MUTATED_COPY';
  assert.deepEqual(store.getTrustedSnapshot(), before);
  assert.throws(() => store.transact(before.revision, () => {}), { code: 'REQUIREMENTS_EXTERNAL_CHANGE' });
  assert.equal(readFileSync(join(workspace, 'context.snapshot.json'), 'utf8'), '{"foreign":true}\n');
});

test('an unmatched first-open CLI context is rejected without creating a UI sidecar', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'egov-requirements-context-mismatch-'));
  const bytes = '{"snapshotDigest":"foreign-context"}\n';
  writeFileSync(join(workspace, 'backlog.json'), '{"contextSnapshotDigest":"expected-context"}\n');
  writeFileSync(join(workspace, 'context.snapshot.json'), bytes);
  assert.throws(() => api.createRequirementsStore({ workspace, initialMetadata: { context: { snapshotDigest: 'expected-context' } } }), { code: 'REQUIREMENTS_CONTEXT_CONFLICT' });
  assert.equal(existsSync(join(workspace, 'requirements-ui.json')), false);
  assert.equal(readFileSync(join(workspace, 'context.snapshot.json'), 'utf8'), bytes);
});

test('interruption after sidecar replacement rolls all three exchange files forward consistently', (t) => {
  const context = { snapshotDigest: 'context-one', modules: [], screens: [] };
  const { workspace, store } = fixture(t, {
    initialBacklog: { project: { code: 'SYNTHETIC' }, contextSnapshotDigest: context.snapshotDigest }, initialMetadata: { context },
  });
  store.close();
  const script = `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    const rename = fs.renameSync;
    fs.renameSync = (from,to) => {
      const result = rename(from,to);
      if (to.endsWith('requirements-ui.json')) process.exit(38);
      return result;
    };
    syncBuiltinESMExports();
    const { createRequirementsStore } = await import(${JSON.stringify(pathToFileURL(resolve('tools/requirements-workspace/store.mjs')).href)});
    const store = createRequirementsStore({workspace: ${JSON.stringify(workspace)}});
    store.transact(store.read().revision, (draft) => {
      draft.backlog.contextSnapshotDigest = 'context-two';
      draft.metadata.context.snapshotDigest = 'context-two';
    }, {refreshContext:true});
  `;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(child.status, 38, child.stderr);
  const recovered = api.createRequirementsStore({ workspace });
  t.after(() => recovered.close());
  const state = recovered.read();
  assert.equal(state.backlog.contextSnapshotDigest, 'context-two');
  assert.equal(state.metadata.context.snapshotDigest, 'context-two');
  assert.equal(state.contextSnapshot.snapshotDigest, 'context-two');
  assert.equal(state.contextConflict, false);
});

test('immutable archives persist outside the sidecar and remain verifiable after restart', (t) => {
  const { workspace, store } = fixture(t);
  assert.equal(typeof store.writeArchive, 'function');
  assert.equal(typeof store.readArchive, 'function');
  assert.equal(store.directory, workspace);
  const before = store.read();
  const content = '합성 요구사항 산출물\n검토 근거를 보존합니다.';
  const reference = store.writeArchive('export', content);
  assert.deepEqual(Object.keys(reference).sort(), ['bytes', 'id', 'kind', 'sha256']);
  assert.equal(reference.kind, 'export');
  assert.match(reference.id, /^[a-f0-9-]{36}$/);
  assert.equal(reference.sha256, createHash('sha256').update(content).digest('hex'));
  assert.equal(reference.bytes, Buffer.byteLength(content));
  assert.equal(store.readArchive(reference), content);
  assert.deepEqual(store.read(), before, 'archive publication does not mutate the canonical metadata');
  store.transact(before.revision, draft => { draft.metadata.exports = [reference]; });
  store.close();
  const reopened = api.createRequirementsStore({ workspace });
  t.after(() => reopened.close());
  assert.equal(reopened.readArchive(reopened.read().metadata.exports[0]), content);
});

test('CSV archives preserve the leading UTF-8 BOM and exact line-ending bytes', (t) => {
  const { workspace, store } = fixture(t);
  const content = '\uFEFFcol1,col2\r\n값,검증\r\n';
  const reference = store.writeArchive('export', content);
  assert.equal(store.readArchive(reference), content);
  assert.equal(reference.bytes, Buffer.byteLength(content));
  assert.equal(reference.sha256, createHash('sha256').update(content).digest('hex'));
  assert.deepEqual(readFileSync(join(workspace, 'records', `${reference.id}.record`)), Buffer.from(content));
});

test('archive references reject traversal, unknown kinds and oversize content before writes', (t) => {
  const { workspace, store } = fixture(t);
  assert.equal(typeof store.writeArchive, 'function');
  assert.throws(() => store.writeArchive('../export', 'text'), { code: 'REQUIREMENTS_INVALID_ARCHIVE' });
  assert.throws(() => store.writeArchive('export', 'x'.repeat(8 * 1024 * 1024 + 1)), { code: 'REQUIREMENTS_TOO_LARGE' });
  assert.throws(() => store.writeArchive('export', '\ud800'), { code: 'REQUIREMENTS_INVALID_ARCHIVE' });
  assert.equal(existsSync(join(workspace, 'records')), false);
  const reference = store.writeArchive('baseline', '{}');
  assert.throws(() => store.readArchive({ ...reference, id: '../backlog.json' }), { code: 'REQUIREMENTS_INVALID_ARCHIVE' });
  assert.throws(() => store.readArchive({ ...reference, sha256: 'invalid' }), { code: 'REQUIREMENTS_INVALID_ARCHIVE' });
  assert.throws(() => store.readArchive({ ...reference, path: '../backlog.json' }), { code: 'REQUIREMENTS_INVALID_ARCHIVE' });
  assert.equal(store.readArchive(reference), '{}');
});

test('missing and tampered archives fail without changing other records or workspace state', (t) => {
  const { workspace, store } = fixture(t);
  assert.equal(typeof store.writeArchive, 'function');
  const first = store.writeArchive('export', 'first immutable record');
  const second = store.writeArchive('history', 'second immutable record');
  const before = store.read();
  const firstPath = join(workspace, 'records', `${first.id}.record`);
  assert.equal(dirname(firstPath), join(workspace, 'records'));
  writeFileSync(firstPath, 'externally modified');
  assert.throws(() => store.readArchive(first), { code: 'REQUIREMENTS_ARCHIVE_INTEGRITY' });
  assert.equal(store.readArchive(second), 'second immutable record');
  unlinkSync(firstPath);
  assert.throws(() => store.readArchive(first), { code: 'REQUIREMENTS_ARCHIVE_NOT_FOUND' });
  assert.equal(store.readArchive(second), 'second immutable record');
  assert.deepEqual(store.read(), before);
});

test('trusted archive reads remain available when canonical state becomes read-only', (t) => {
  const { workspace, store } = fixture(t);
  assert.equal(typeof store.writeArchive, 'function');
  const reference = store.writeArchive('history', 'verified history page');
  const before = store.transact(store.read().revision, draft => { draft.metadata.history = [reference]; });
  writeFileSync(join(workspace, 'backlog.json'), '{"foreign":true}\n');
  assert.throws(() => store.read(), { code: 'REQUIREMENTS_EXTERNAL_CHANGE' });
  assert.equal(store.readArchive(store.getTrustedSnapshot().metadata.history[0]), 'verified history page');
  assert.throws(() => store.writeArchive('export', 'must not persist'), { code: 'REQUIREMENTS_EXTERNAL_CHANGE' });
  assert.deepEqual(store.getTrustedSnapshot(), before);
  assert.equal(readdirSync(join(workspace, 'records')).filter(name => name.endsWith('.record')).length, 1);
});

test('archive paths reject directory links and hard-linked record files', (t) => {
  const first = fixture(t);
  assert.equal(typeof first.store.writeArchive, 'function');
  const target = join(first.directory, 'foreign-records');
  mkdirSync(target);
  symlinkSync(target, join(first.workspace, 'records'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => first.store.writeArchive('export', 'must not escape'), { code: 'REQUIREMENTS_UNSAFE_PATH' });
  assert.deepEqual(readdirSync(target), []);

  const second = fixture(t);
  const reference = second.store.writeArchive('baseline', '{}');
  linkSync(join(second.workspace, 'records', `${reference.id}.record`), join(second.directory, 'foreign-link'));
  assert.throws(() => second.store.readArchive(reference), { code: 'REQUIREMENTS_UNSAFE_PATH' });
});

test('150 requirements and 600 ACs retain 12 baselines and 20 exports with small sidecar references', (t) => {
  const backlog = {
    project: { code: 'SYNTHETIC-LARGE' },
    requirements: Array.from({ length: 150 }, (_, index) => ({ id: `REQ-${index}`, description: '분석 근거 '.repeat(40) })),
    acceptanceCriteria: Array.from({ length: 600 }, (_, index) => ({ id: `AC-${index}`, then: '합성 인수조건 '.repeat(100) })),
  };
  const { workspace, directory, store } = fixture(t, { initialBacklog: backlog });
  assert.equal(typeof store.writeArchive, 'function');
  t.after(() => {
    store.close();
    assert.equal(dirname(directory), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('egov-requirements-store-'));
    rmSync(directory, { recursive: true, force: true });
  });
  const baselineBody = JSON.stringify(backlog);
  const exports = [], baselines = [];
  for (let index = 0; index < 12; index++) baselines.push({ id: `BL-${index}`, backlogRef: store.writeArchive('baseline', baselineBody) });
  for (let index = 0; index < 20; index++) exports.push({ id: `EX-${index}`, contentRef: store.writeArchive('export', `# 합성 산출물 ${index}\n${baselineBody}`) });
  const saved = store.transact(store.read().revision, draft => { draft.metadata.baselines = baselines; draft.metadata.exports = exports; });
  assert.ok(statSync(join(workspace, 'requirements-ui.json')).size < 32 * 1024, 'sidecar stores references instead of repeated customer bodies');
  assert.ok(Buffer.byteLength(baselineBody) * 32 > 8 * 1024 * 1024, 'embedded history would exceed the unchanged 8 MiB sidecar limit');
  store.close();
  const reopened = api.createRequirementsStore({ workspace });
  t.after(() => reopened.close());
  assert.equal(reopened.read().metadata.baselines.length, 12);
  assert.equal(reopened.read().metadata.exports.length, 20);
  assert.deepEqual(JSON.parse(reopened.readArchive(saved.metadata.baselines[0].backlogRef)), backlog);
  assert.match(reopened.readArchive(saved.metadata.exports[19].contentRef), /^# 합성 산출물 19\n/);
  reopened.close();
});

test('an archive identifier collision never replaces an earlier immutable record', (t) => {
  const { workspace, store } = fixture(t);
  store.close();
  const script = `
    import crypto from 'node:crypto';
    import { syncBuiltinESMExports } from 'node:module';
    crypto.randomUUID = () => '11111111-1111-4111-8111-111111111111';
    syncBuiltinESMExports();
    const { createRequirementsStore } = await import(${JSON.stringify(pathToFileURL(resolve('tools/requirements-workspace/store.mjs')).href)});
    const store = createRequirementsStore({workspace: ${JSON.stringify(workspace)}});
    const ref = store.writeArchive('export', 'first immutable bytes');
    let errorCode;
    try { store.writeArchive('export', 'second bytes must not replace'); } catch(error) { errorCode = error.code; }
    process.stdout.write(JSON.stringify({errorCode, preserved: store.readArchive(ref) === 'first immutable bytes'}));
    store.close();
  `;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), { errorCode: 'REQUIREMENTS_ARCHIVE_EXISTS', preserved: true });
});

test('an archive completed before a failed metadata commit remains an unreferenced recoverable record', (t) => {
  const { workspace, store } = fixture(t, { validateMetadata: metadata => !metadata.reject });
  const before = store.read();
  const reference = store.writeArchive('baseline', '{"synthetic":"completed before commit"}');
  assert.throws(() => store.transact(before.revision, draft => { draft.metadata.reject = true; draft.metadata.baseline = reference; }), { code: 'REQUIREMENTS_INVALID_METADATA' });
  assert.deepEqual(store.read(), before);
  assert.equal(store.readArchive(reference), '{"synthetic":"completed before commit"}');
  store.close();
  const reopened = api.createRequirementsStore({ workspace });
  t.after(() => reopened.close());
  assert.equal(reopened.read().metadata.baseline, undefined);
  assert.equal(reopened.readArchive(reference), '{"synthetic":"completed before commit"}');
});
