import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { EventEmitter, once } from 'node:events';
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { PassThrough } from 'node:stream';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { buildJdbcProfile, createEngine } from './engine.mjs';
import { openWorkspace } from './store.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
// configure() 의 기본 세션 비밀번호와 같은 값이다. 산출물에 섞이면 엔진이 SENSITIVE_CONTENT 로 거부해야 한다.
const LEAK_MARKER = 'local-fixture-password';
const source = { vendor: 'postgresql', host: '127.0.0.1', port: 5432, database: 'legacy', schema: 'public', username: 'reader', tlsMode: 'disable' };
const target = { ...source, database: 'standard', username: 'writer' };
const standardColumns = [{ table_name: 'public.tb_synthetic', column_name: 'synthetic_id' }];
const evidence = (artifactType, payload, versionKey = 'envelopeVersion', version = 1) => JSON.stringify({ [versionKey]: version, artifactType, digestAlgorithm: 'SHA-256', payloadDigest: hash(JSON.stringify(payload)), payload });
function fakeCli({ hold = false, noArtifact = false, badDigest = false, failure = false, leaking = false, diagnosticChunks = [], diagnosticStream = 'stderr', uniqueLoadEvidence = false, failedLoadEvidence = false, gitBlobMismatch = false, gitIndexMismatch = false, draftStatus = 'PROPOSED', draftHistory = [] } = {}) {
  const calls = [], children = [], loadEvidencePaths = [];
  const failingOperations = new Set();
  let loadSequence = 0;
  const spawnImpl = (command, args, options) => {
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    child.kill = () => { setImmediate(() => child.emit('close', null, 'SIGTERM')); return true; };
    children.push(child); calls.push({ command, args, options });
    setImmediate(async () => {
      if (args[0] === '-version') { child.stderr.write('openjdk version "21.0.8"'); child.emit('close', 0, null); return; }
      if (args.includes('-C')) {
        const cwd = args[args.indexOf('-C') + 1];
        if (args.includes('--show-toplevel')) child.stdout.write(cwd + '\n');
        else if (args.includes('ls-files')) child.stdout.write(`100644 ${(gitIndexMismatch ? 'e' : 'd').repeat(40)} 0\t${args.at(-1)}\0`);
        else if (args.includes('cat-file')) {
          child.stdout.write(await readFile(join(cwd, 'ledger.json')));
          if (gitBlobMismatch) child.stdout.write('\n');
        }
        else child.stdout.write((args.at(-1) === 'HEAD^{commit}' ? 'c' : 'd').repeat(40) + '\n');
        child.emit('close', 0, null); return;
      }
      if (hold) return;
      try {
        const parsed = Object.fromEntries(args.filter(arg => arg.startsWith('--')).map(arg => { const at = arg.indexOf('='); return at < 0 ? [arg.slice(2), true] : [arg.slice(2, at), arg.slice(at + 1)]; }));
        const failed = failure || failingOperations.has(parsed.command);
        child.stdout.write('SUCCESS raw-password driver secret should never be returned'); child.stderr.write('jdbc raw diagnostics');
        for (const chunk of diagnosticChunks) child[diagnosticStream].write(chunk);
        if (!noArtifact && !failed) {
          if (parsed.command === 'discover') {
            let content = evidence('catalog-inventory', { objects: [], marker: leaking ? LEAK_MARKER : 'safe' }, 'schemaVersion', 4);
            if (badDigest) content = content.replace(/"payloadDigest":"[a-f0-9]+"/, '"payloadDigest":"' + '0'.repeat(64) + '"');
            await writeFile(parsed.inventory, content);
          }
          if (parsed.command === 'profile') await writeFile(parsed.profile, evidence('source-profile', { profileVersion: 2, tables: [] }));
          if (parsed.command === 'app-scan') await writeFile(parsed['app-usage'], evidence('app-usage', { status: 'COMPLETE', usages: [] }));
          if (parsed.command === 'term-suggest') {
            await writeFile(parsed.suggestions, evidence('term-suggestions', { suggestions: [] }));
            await writeFile(parsed['ledger-draft'], JSON.stringify({ schemaVersion: 2, entries: [{ id: 'synthetic-column', source: { table: 'tb_synthetic', column: 'synthetic_id' }, grade: 'INFERRED', status: draftStatus, history: draftHistory }] }));
          }
          if (parsed.command === 'mapping-generate') await writeFile(parsed.mapping, `source:\n  password: \${MW_SOURCE_PASSWORD}\ntarget:\n  password: \${MW_TARGET_PASSWORD}\ntables: []\nledger:\n  path: ${basename(parsed.ledger)}\n  sha256: ${hash(await readFile(parsed.ledger))}\n`);
          if (parsed.command === 'plan') await writeFile(parsed.plan, evidence('migration-plan', { schemaVersion: 3, mappingDigest: 'a'.repeat(64), targetSchemaDigest: 'b'.repeat(64), readiness: { commitReady: true } }, 'schemaVersion', 2));
          if (parsed.command === 'load') {
            const plan = JSON.parse(await readFile(parsed.plan, 'utf8'));
            const path = parsed.plan + (uniqueLoadEvidence ? `.load-test-${++loadSequence}.json` : '.load-test.json');
            await writeFile(path, JSON.stringify({ schemaVersion: 5, planDigest: plan.payloadDigest, mappingDigest: plan.payload.mappingDigest, targetDigest: plan.payload.targetSchemaDigest, mode: parsed.mode === 'commit' ? 'COMMIT' : 'DRY_RUN', status: 'PASS', tables: [] }));
            loadEvidencePaths.push(path);
          }
        }
        if (failed && failedLoadEvidence && parsed.command === 'load') {
          // A real load writes STARTED evidence before any target write; a crash leaves it as the last record.
          const plan = JSON.parse(await readFile(parsed.plan, 'utf8'));
          const path = `${parsed.plan}.load-failed-${++loadSequence}.json`;
          await writeFile(path, JSON.stringify({ schemaVersion: 5, planDigest: plan.payloadDigest, mappingDigest: plan.payload.mappingDigest, targetDigest: plan.payload.targetSchemaDigest, mode: parsed.mode === 'commit' ? 'COMMIT' : 'DRY_RUN', status: 'STARTED', startedAt: '2026-10-25T01:02:03Z', updatedAt: '2026-10-25T01:02:04Z', tables: [{ source: 'legacy.person', target: 'tb_synthetic', read: 5, written: 3, errors: 0, targetRows: 3, status: 'RUNNING', isolated: 0 }] }));
          loadEvidencePaths.push(path);
        }
        child.emit('close', failed ? 1 : 0, null);
      } catch { child.emit('close', 1, null); }
    });
    return child;
  };
  return { spawnImpl, calls, children, loadEvidencePaths, failingOperations };
}
async function fixture(t, fakeOptions) {
  const root = await mkdtemp(join(tmpdir(), 'migration-engine-'));
  const directory = join(root, 'workspace');
  const jarPath = join(root, 'migration.jar'), javaPath = join(root, 'java.exe'), gitPath = join(root, 'git.exe');
  await writeFile(jarPath, 'PK synthetic test jar'); await writeFile(javaPath, 'synthetic executable'); await writeFile(gitPath, 'synthetic executable');
  const store = await openWorkspace({ directory });
  t.after(() => store.close());
  const fake = fakeCli(fakeOptions);
  return { root, store, fake, engine: createEngine({ store, jarPath, javaPath, gitPath, spawnImpl: fake.spawnImpl }), jarPath, javaPath };
}
async function configure(engine, role, profile, password = 'local-fixture-password') {
  return engine.configureProfile(role, profile, password, (await engine.state()).revision);
}
async function settle(engine, id) {
  for (let attempts = 0; attempts < 150; attempts++) { const state = await engine.state(); const job = state.jobs.find(item => item.id === id); if (!['starting', 'running', 'cancelling'].includes(job.status)) return job; await delay(10); }
  throw new Error('Job did not settle');
}
let requestCounter = 0;
async function run(engine, operation, options = {}) {
  const job = await engine.startJob({ operation, requestId: `request-${++requestCounter}`, revision: (await engine.state()).revision, options });
  return settle(engine, job.id);
}
async function importColumns(engine, root, columns = standardColumns) {
  const path = join(root, 'standard-columns.json');
  await writeFile(path, JSON.stringify(columns));
  return engine.importArtifact('standard-columns', path, (await engine.state()).revision);
}

test('vendor URL templates reject option injection and unsupported target/TLS/Oracle modes', () => {
  assert.equal(buildJdbcProfile('source', source).url, 'jdbc:postgresql://127.0.0.1:5432/legacy?sslmode=disable');
  assert.match(buildJdbcProfile('source', { ...source, vendor: 'mysql', tlsMode: 'verify-full' }).url, /sslMode=VERIFY_IDENTITY/);
  assert.match(buildJdbcProfile('source', { ...source, vendor: 'mariadb', tlsMode: 'require' }).url, /allowLocalInfile=false/);
  assert.match(buildJdbcProfile('source', { ...source, vendor: 'oracle', oracleMode: 'service', tlsMode: 'verify-full' }).url, /@tcps:\/\/127/);
  assert.match(buildJdbcProfile('source', { ...source, vendor: 'sqlserver', instance: 'DEMO' }).url, /instanceName=DEMO/);
  assert.equal(buildJdbcProfile('source', { ...source, vendor: 'sqlserver', port: 1433, instance: 'DEMO' }).url, 'jdbc:sqlserver://127.0.0.1;databaseName=legacy;encrypt=false;trustServerCertificate=true;instanceName=DEMO');
  for (const profile of [{ ...source, host: 'localhost;password=leak' }, { ...source, database: 'db?socketFactory=evil' }, { ...source, tlsMode: 'trust-all' }, { ...source, driverClass: 'evil.Driver' }, { ...source, custom: true }, { ...source, port: 0 }, { ...source, vendor: 'oracle', oracleMode: 'tns' }]) assert.throws(() => buildJdbcProfile('source', profile));
  assert.throws(() => buildJdbcProfile('target', { ...source, vendor: 'oracle' }));
  assert.throws(() => buildJdbcProfile('source', { ...source, schema: null }));
  assert.throws(() => buildJdbcProfile('source', { ...source, vendor: ['postgresql'] }));
});

test('profiles persist no passwords; child environment is minimal and source-only mapping resolves only source', async t => {
  const { engine, store, fake } = await fixture(t);
  await configure(engine, 'source', source, 'unique-fixture-secret');
  assert.equal((await engine.state()).profiles.source.credentialReady, true);
  assert.doesNotMatch(await readFile(join(store.directory, 'workspace.json'), 'utf8'), /unique-fixture-secret|credentialReady/);
  const job = await run(engine, 'discover'); assert.equal(job.status, 'succeeded');
  const invocation = fake.calls.find(call => call.args.includes('--command=discover'));
  assert.equal(invocation.options.shell, false); assert.equal(invocation.options.windowsHide, true);
  assert.equal(invocation.options.env.MW_SOURCE_PASSWORD, 'unique-fixture-secret');
  assert.equal(invocation.options.env.MW_TARGET_PASSWORD, undefined);
  assert.equal(invocation.options.env.JAVA_TOOL_OPTIONS, undefined);
  assert.equal(invocation.options.env.APPDATA, process.env.APPDATA);
  assert.doesNotMatch(JSON.stringify(invocation.args), /unique-fixture-secret/);
  const mappingPath = invocation.args.find(arg => arg.startsWith('--mapping=')).slice('--mapping='.length);
  const mapping = JSON.parse(await readFile(mappingPath, 'utf8'));
  assert.deepEqual(Object.keys(mapping.target), ['endpointId']);
  assert.match(mapping.target.endpointId, /^target-[a-f0-9]{32}$/);
  assert.equal(mapping.source.password, '${MW_SOURCE_PASSWORD}');
  assert.doesNotMatch(JSON.stringify(await engine.state()), /raw-password|jdbc raw/);
  await assert.rejects(engine.getArtifact('../.env'), { code: 'INVALID_ARTIFACT_KIND' });
  const inventory = await engine.getArtifact('inventory'); assert.equal(inventory.format, 'json');
  await writeFile(await store.resolveArtifact(inventory.file), '{}');
  await assert.rejects(engine.getArtifact('inventory'), { code: 'ARTIFACT_CHANGED' });
});

test('success requires exit zero plus a valid fresh artifact, never success text', async t => {
  for (const [option, expected] of [[{ noArtifact: true }, 'PATH_UNAVAILABLE'], [{ badDigest: true }, 'ARTIFACT_CONTRACT'], [{ failure: true }, 'CLI_FAILED'], [{ leaking: true }, 'SENSITIVE_CONTENT']]) {
    const { engine } = await fixture(t, option); await configure(engine, 'source', source);
    const job = await run(engine, 'discover'); assert.equal(job.status, 'failed'); assert.equal(job.errorCode, expected);
    assert.equal((await engine.state()).artifacts.inventory, undefined);
  }
});

test('failed CLI exposes only fixed diagnostic codes across chunk boundaries, never raw output', async t => {
  for (const diagnosticStream of ['stdout', 'stderr']) {
    const { engine, store } = await fixture(t, { failure: true, diagnosticStream, diagnosticChunks: [
      ' host=private-fixture user=private-user password=private-secret\nMW_DIAG', 'NOSTIC=DB_TLS_UNSUPPORTED\n',
    ] });
    await configure(engine, 'source', source);
    const job = await run(engine, 'discover');
    assert.equal(job.status, 'failed');
    assert.equal(job.errorCode, 'DB_TLS_UNSUPPORTED');
    assert.equal((await engine.state()).artifacts.inventory, undefined);
    assert.doesNotMatch(JSON.stringify(await engine.state()), /private-fixture|private-user|private-secret|raw-password|jdbc raw/);
    assert.doesNotMatch(await readFile(join(store.directory, 'workspace.json'), 'utf8'), /private-fixture|private-user|private-secret|raw-password|jdbc raw/);
  }
});

test('unknown diagnostic text stays generic and diagnostic markers cannot turn failure into success', async t => {
  for (const diagnostic of ['MW_DIAGNOSTIC=DB_TLS_UNSUPPORTED_EVIL', 'MW_DIAGNOSTIC=synthetic-unknown', 'MW_DIAGNOSTIC=SUCCESS']) {
    const { engine } = await fixture(t, { failure: true, diagnosticChunks: [diagnostic] });
    await configure(engine, 'source', source);
    const job = await run(engine, 'discover');
    assert.equal(job.status, 'failed'); assert.equal(job.errorCode, 'CLI_FAILED');
  }
  const { engine } = await fixture(t, { diagnosticChunks: ['\nMW_DIAGNOSTIC=DB_AUTH_FAILED\n'] });
  await configure(engine, 'source', source);
  const job = await run(engine, 'discover');
  assert.equal(job.status, 'succeeded'); assert.equal(job.errorCode, null);
});

test('idempotent requests do not spawn twice, mutation while running fails and cancel waits for close', async t => {
  const { engine, fake } = await fixture(t, { hold: true }); await configure(engine, 'source', source);
  const request = { operation: 'discover', requestId: 'idempotent-request', revision: (await engine.state()).revision, options: {} };
  const first = await engine.startJob(request); const second = await engine.startJob(request);
  assert.equal(first.id, second.id); assert.equal(fake.calls.filter(call => call.args.includes('--command=discover')).length, 1);
  await assert.rejects(engine.startJob({ ...request, operation: 'profile' }), { code: 'REQUEST_ID_REUSED' });
  await assert.rejects(configure(engine, 'source', source), { code: 'JOB_ACTIVE' });
  assert.equal((await engine.cancelJob(first.id)).status, 'cancelling');
  assert.equal((await settle(engine, first.id)).status, 'interrupted');
});

test('child error does not release the active job before process close is confirmed', async t => {
  const { engine, fake } = await fixture(t, { hold: true });
  await configure(engine, 'source', source);
  const job = await engine.startJob({ operation: 'discover', requestId: 'error-before-close', revision: (await engine.state()).revision });
  const child = fake.children.at(-1);
  child.emit('error', new Error('synthetic child failure'));
  try {
    await delay(30);
    const pending = await engine.state();
    assert.equal(pending.activeJobId, job.id);
    assert.equal(pending.jobs.at(-1).status, 'running');
    assert.ok(pending.operationReadiness.discover.blockers.includes('JOB_ACTIVE'));
  } finally { child.emit('close', -1, null); }
  const completed = await settle(engine, job.id);
  assert.equal(completed.status, 'failed');
  assert.equal(completed.errorCode, 'CLI_START_FAILED');
});

test('failed cancellation persistence cannot mark an uncancelled successful child interrupted', async t => {
  const { engine, store, fake } = await fixture(t, { hold: true });
  await configure(engine, 'source', source);
  const job = await engine.startJob({ operation: 'discover', requestId: 'cancel-save-failure', revision: (await engine.state()).revision });
  const child = fake.children.at(-1);
  const invocation = fake.calls.find(call => call.args.includes('--command=discover'));
  const output = invocation.args.find(arg => arg.startsWith('--inventory=')).slice('--inventory='.length);
  await writeFile(output, evidence('catalog-inventory', { objects: [] }, 'schemaVersion', 4));
  let killed = false;
  child.kill = () => { killed = true; return true; };
  const originalUpdate = store.update;
  store.update = async () => { throw Object.assign(new Error('synthetic save failure'), { code: 'WORKSPACE_SNAPSHOT_BUSY' }); };
  try { await assert.rejects(engine.cancelJob(job.id), { code: 'WORKSPACE_SNAPSHOT_BUSY' }); }
  finally { store.update = originalUpdate; }
  assert.equal(killed, false);
  assert.equal((await engine.state()).jobs.at(-1).status, 'running');
  child.emit('close', 0, null);
  assert.equal((await settle(engine, job.id)).status, 'succeeded');
});

test('missing JAR and an unresolved unknown load fail before any new load process; reads continue', async t => {
  const { store, javaPath, fake, engine } = await fixture(t);
  await configure(engine, 'source', source);
  const missing = createEngine({ store, jarPath: join(store.directory, 'missing.jar'), javaPath, spawnImpl: fake.spawnImpl });
  await assert.rejects(missing.startJob({ operation: 'discover', requestId: 'missing-jar', revision: (await store.read()).revision }), { code: 'CLI_JAR_UNAVAILABLE' });
  const state = await store.read();
  await store.update(state.revision, draft => { draft.jobs.push({ id: 'unknown-load', operation: 'commit', status: 'unknown' }); });
  for (const operation of ['dry-run', 'commit']) {
    await assert.rejects(engine.startJob({ operation, requestId: `after-crash-${operation}`, revision: (await store.read()).revision }), { code: 'JOB_RESULT_UNKNOWN' });
  }
  assert.equal(fake.calls.length, 0);
  // ADR-0041 decision 10: an unknown result blocks new loads only. A read stage never writes the target.
  assert.equal((await run(engine, 'discover')).status, 'succeeded');
  assert.equal(fake.calls.filter(call => call.args.includes('--command=load')).length, 0);
});

test('ledger import preserves institution Git distinction; drafts cannot create human confirmation', async t => {
  const { root, engine } = await fixture(t);
  const ledger = { schemaVersion: 2, entries: [{ id: 'one', source: { table: 'a', column: 'id' }, grade: 'INFERRED', status: 'CONFIRMED', history: [{ to: 'CONFIRMED', by: 'Reviewer', at: '2026-10-24' }] }] };
  await assert.rejects(engine.saveLedger(ledger, (await engine.state()).revision), { code: 'GIT_REVIEW_REQUIRED' });
  const path = join(root, 'ledger.json'); await writeFile(path, JSON.stringify(ledger));
  await assert.rejects(engine.importArtifact('confirmed-ledger', path, (await engine.state()).revision), { code: 'GIT_REVIEW_REQUIRED' });
  const git = join(root, 'institution'); await mkdir(join(git, '.git'), { recursive: true });
  const confirmed = join(git, 'ledger.json'); await writeFile(confirmed, JSON.stringify(ledger));
  await engine.importArtifact('confirmed-ledger', confirmed, (await engine.state()).revision);
  assert.equal((await engine.state()).ledger.confirmedDigest, hash(await readFile(confirmed)));
  assert.equal((await engine.state()).ledger.gitCommit, 'c'.repeat(40));
  assert.equal((await engine.state()).ledger.gitBlob, 'd'.repeat(40));
  await writeFile(path, '{"schemaVersion":2,"schemaVersion":2,"entries":[]}');
  await assert.rejects(engine.importArtifact('ledger', path, (await engine.state()).revision), { code: 'INVALID_ARTIFACT' });
  await assert.rejects(engine.saveLedger({ schemaVersion: 2, entries: [], password: 'secret' }, (await engine.state()).revision));
});

test('confirmed Git ledger rejects changed committed bytes or staged index without saving', async t => {
  for (const option of [{ gitBlobMismatch: true }, { gitIndexMismatch: true }]) {
    const { root, engine, store, fake } = await fixture(t, option);
    const repository = join(root, 'institution'); await mkdir(join(repository, '.git'), { recursive: true });
    const path = join(repository, 'ledger.json'); await writeFile(path, '{"schemaVersion":2,"entries":[]}');
    const before = await store.read();
    const indexBefore = await readFile(join(store.directory, 'workspace.json'), 'utf8');
    const filesBefore = await readdir(join(store.directory, 'artifacts'));
    await assert.rejects(engine.importArtifact('confirmed-ledger', path, before.revision), { code: 'GIT_REVIEW_REQUIRED' });
    assert.deepEqual(await store.read(), before);
    assert.equal(await readFile(join(store.directory, 'workspace.json'), 'utf8'), indexBefore);
    assert.deepEqual(await readdir(join(store.directory, 'artifacts')), filesBefore);
    const gitCalls = fake.calls.filter(call => call.args.includes('-C'));
    assert.ok(gitCalls.some(call => call.args.includes('ls-files')));
    assert.equal(gitCalls.some(call => call.args.includes('cat-file')), Boolean(option.gitBlobMismatch));
    for (const call of gitCalls) {
      assert.equal(call.options.shell, false);
      assert.equal(call.options.env.GIT_OPTIONAL_LOCKS, '0');
      assert.equal(call.options.env.MW_SOURCE_PASSWORD, undefined);
    }
  }
});

test('first term suggestion exposes a JSON draft as the editable local ledger', async t => {
  const { engine, store } = await fixture(t);
  await configure(engine, 'source', source); await configure(engine, 'target', target);
  for (const operation of ['discover', 'profile', 'term-suggest']) {
    const result = await run(engine, operation); assert.equal(result.status, 'succeeded', `${operation}: ${result.errorCode}`);
  }
  const draft = await engine.getArtifact('ledgerDraft');
  assert.equal(draft.format, 'json');
  assert.match(draft.file, /\.json$/);
  assert.deepEqual(JSON.parse(draft.content), { schemaVersion: 2, entries: [{ id: 'synthetic-column', source: { table: 'tb_synthetic', column: 'synthetic_id' }, grade: 'INFERRED', status: 'PROPOSED', history: [] }] });
  const state = await store.read();
  assert.deepEqual(state.artifacts.ledger, state.artifacts.ledgerDraft);
  assert.deepEqual(state.ledger, { reviewSource: 'local-draft' });
  assert.equal((await engine.getArtifact('ledger')).content, draft.content);
  assert.equal(state.artifacts.confirmedLedger, undefined);
});

test('new tool suggestions preserve an existing human-edited local ledger', async t => {
  const { engine, store } = await fixture(t);
  await configure(engine, 'source', source); await configure(engine, 'target', target);
  for (const operation of ['discover', 'profile', 'term-suggest']) assert.equal((await run(engine, operation)).status, 'succeeded');
  const originalDraft = await engine.getArtifact('ledgerDraft');
  const edited = JSON.parse(originalDraft.content);
  edited.entries[0].note = '검토자가 작성한 용어 선택 근거';
  await engine.saveLedger(edited, (await engine.state()).revision);
  const before = await store.read();
  const humanLedger = await engine.getArtifact('ledger');
  assert.equal((await run(engine, 'term-suggest')).status, 'succeeded');
  const after = await store.read();
  assert.notEqual(after.artifacts.ledgerDraft.file, originalDraft.file);
  assert.deepEqual(after.artifacts.ledger, before.artifacts.ledger);
  assert.deepEqual(after.ledger, before.ledger);
  assert.deepEqual(await engine.getArtifact('ledger'), humanLedger);
  assert.equal(JSON.parse((await engine.getArtifact('ledgerDraft')).content).entries[0].note, undefined);
});

test('a confirmed Git ledger prevents a tool draft from becoming the editable ledger', async t => {
  const { root, engine, store } = await fixture(t);
  await configure(engine, 'source', source); await configure(engine, 'target', target);
  for (const operation of ['discover', 'profile']) assert.equal((await run(engine, operation)).status, 'succeeded');
  const repository = join(root, 'reviewed'); await mkdir(join(repository, '.git'), { recursive: true });
  const ledgerPath = join(repository, 'ledger.json');
  await writeFile(ledgerPath, JSON.stringify({ schemaVersion: 2, entries: [{ id: 'reviewed-column', source: { table: 'tb_synthetic', column: 'synthetic_id' }, grade: 'INFERRED', status: 'CONFIRMED', history: [{ to: 'CONFIRMED', by: 'Reviewer', at: '2026-10-24' }] }] }));
  await engine.importArtifact('confirmed-ledger', ledgerPath, (await engine.state()).revision);
  const before = await store.read();
  const confirmed = await engine.getArtifact('confirmedLedger');
  assert.equal(before.artifacts.ledger, undefined);
  assert.equal((await run(engine, 'term-suggest')).status, 'succeeded');
  const after = await store.read();
  assert.ok(after.artifacts.ledgerDraft);
  assert.equal(after.artifacts.ledger, undefined);
  assert.deepEqual(after.artifacts.confirmedLedger, before.artifacts.confirmedLedger);
  assert.deepEqual(after.ledger, before.ledger);
  assert.deepEqual(await engine.getArtifact('confirmedLedger'), confirmed);
});

test('tool drafts cannot manufacture confirmed decisions or review history', async t => {
  for (const option of [{ draftStatus: 'CONFIRMED' }, { draftHistory: [{ to: 'PROPOSED', by: 'Tool', at: '2026-10-24' }] }, { draftHistory: {} }]) {
    const { engine, store } = await fixture(t, option);
    await configure(engine, 'source', source); await configure(engine, 'target', target);
    for (const operation of ['discover', 'profile']) assert.equal((await run(engine, operation)).status, 'succeeded');
    const before = await store.read();
    const result = await run(engine, 'term-suggest');
    assert.equal(result.status, 'failed');
    assert.equal(result.errorCode, 'ARTIFACT_CONTRACT');
    const after = await store.read();
    assert.deepEqual(after.artifacts, before.artifacts);
    assert.deepEqual(after.ledger, before.ledger);
    assert.equal(after.activeJobId, null);
  }
});

test('re-entering credentials for the same profile preserves input revision and prepared artifacts', async t => {
  const { engine, store } = await fixture(t);
  await configure(engine, 'source', source, 'first-fixture-password');
  assert.equal((await run(engine, 'discover')).status, 'succeeded');
  const current = await store.read();
  await store.update(current.revision, draft => {
    draft.readiness = { validated: { inputDigest: 'a'.repeat(64), jobId: 'validated-fixture' }, dryRun: { inputDigest: 'a'.repeat(64), jobId: 'dry-run-fixture' } };
  });
  const before = await store.read();
  const indexBefore = await readFile(join(store.directory, 'workspace.json'), 'utf8');
  const inventoryBefore = await engine.getArtifact('inventory');
  for (const password of ['first-fixture-password', 'rotated-fixture-password', undefined, 'restored-fixture-password']) {
    const result = await engine.configureProfile('source', source, password, before.revision);
    assert.equal(result.profiles.source.credentialReady, password !== undefined);
    assert.equal(result.inputRevision, before.inputRevision);
    assert.deepEqual(result.artifacts, before.artifacts);
    assert.deepEqual(result.readiness, before.readiness);
    assert.deepEqual(await store.read(), before);
    assert.deepEqual(await engine.getArtifact('inventory'), inventoryBefore);
    assert.equal(await readFile(join(store.directory, 'workspace.json'), 'utf8'), indexBefore);
  }
  await configure(engine, 'source', { ...source, database: 'different-source' });
  const changed = await store.read();
  assert.equal(changed.inputRevision, before.inputRevision + 1);
  assert.deepEqual(changed.readiness, {});
  assert.equal(changed.artifacts.inventory, undefined);
  assert.doesNotMatch(await readFile(join(store.directory, 'workspace.json'), 'utf8'), /first-fixture-password|rotated-fixture-password|restored-fixture-password/);
});

test('connection and source changes invalidate only dependent artifacts and preserve human ledgers', async t => {
  const { engine, store, root } = await fixture(t);
  await configure(engine, 'source', source);
  await engine.configureInputs({ sourceRoot: root, sourceFingerprint: 'a'.repeat(64) }, (await engine.state()).revision);
  for (const operation of ['app-scan', 'discover', 'profile']) assert.equal((await run(engine, operation)).status, 'succeeded');
  const before = await store.read();
  await store.update(before.revision, draft => {
    for (const kind of ['ledger', 'confirmedLedger', 'standardColumns', 'suggestions', 'mapping', 'plan', 'review', 'execution']) draft.artifacts[kind] = { ...before.artifacts.inventory };
    draft.readiness = { validated: { inputDigest: 'a'.repeat(64) } };
  });
  const prepared = await store.read();
  await configure(engine, 'target', target);
  const targetChanged = await store.read();
  for (const kind of ['inventory', 'profile', 'appUsage', 'ledger', 'confirmedLedger']) assert.deepEqual(targetChanged.artifacts[kind], prepared.artifacts[kind], kind);
  for (const kind of ['suggestions', 'mapping', 'plan', 'review', 'execution', 'standardColumns']) assert.equal(targetChanged.artifacts[kind], undefined, kind);
  assert.deepEqual(targetChanged.readiness, {});
  await engine.configureInputs({ sourceRoot: root, sourceFingerprint: 'b'.repeat(64) }, targetChanged.revision);
  const inputsChanged = await store.read();
  for (const kind of ['inventory', 'profile', 'ledger', 'confirmedLedger']) assert.deepEqual(inputsChanged.artifacts[kind], prepared.artifacts[kind], kind);
  assert.equal(inputsChanged.artifacts.appUsage, undefined);
  assert.equal((await run(engine, 'app-scan')).status, 'succeeded');
  const scanned = await store.read();
  await configure(engine, 'source', { ...source, schema: 'changed_schema' });
  const sourceChanged = await store.read();
  assert.deepEqual(sourceChanged.artifacts.appUsage, scanned.artifacts.appUsage);
  for (const kind of ['inventory', 'profile']) assert.equal(sourceChanged.artifacts[kind], undefined);
  for (const kind of ['ledger', 'confirmedLedger']) assert.deepEqual(sourceChanged.artifacts[kind], prepared.artifacts[kind]);
  assert.ok(await readFile(await store.resolveArtifact(prepared.artifacts.inventory.file)));
});

test('failed re-analysis retires old output and downstream aliases before another job can consume them', async t => {
  const { engine, store, fake } = await fixture(t);
  await configure(engine, 'source', source);
  for (const operation of ['discover', 'profile']) assert.equal((await run(engine, operation)).status, 'succeeded');
  const before = await store.read();
  fake.failingOperations.add('discover');
  assert.equal((await run(engine, 'discover')).status, 'failed');
  const failed = await store.read();
  assert.equal(failed.artifacts.inventory, undefined);
  assert.equal(failed.artifacts.profile, undefined);
  await assert.rejects(engine.getArtifact('inventory'), { code: 'ARTIFACT_REQUIRED' });
  await assert.rejects(engine.startJob({ operation: 'profile', requestId: 'after-failed-discover', revision: failed.revision }), { code: 'ARTIFACT_REQUIRED' });
  assert.ok(await readFile(await store.resolveArtifact(before.artifacts.inventory.file)));
});

test('credential reuse is explicit and bound to the same endpoint identity', async t => {
  const { engine, store, fake } = await fixture(t);
  await configure(engine, 'source', source, 'keep-fixture-value');
  const before = await store.read();
  for (const [profile, password, action, code] of [
    [{ ...source, database: 'different' }, undefined, 'keep', 'CREDENTIAL_REENTRY_REQUIRED'],
    [source, 'conflicting-value', 'keep', 'INVALID_CREDENTIAL_ACTION'],
    [source, undefined, 'replace', 'INVALID_CREDENTIAL'],
    [source, 'conflicting-value', 'clear', 'INVALID_CREDENTIAL_ACTION'],
    [source, undefined, 'unexpected', 'INVALID_CREDENTIAL_ACTION'],
    [source, undefined, null, 'INVALID_CREDENTIAL_ACTION'],
  ]) {
    await assert.rejects(engine.configureProfile('source', profile, password, before.revision, action), { code });
    assert.deepEqual(await store.read(), before);
    assert.equal((await engine.state()).profiles.source.credentialReady, true);
  }
  await engine.configureProfile('source', { ...source, schema: 'alternate', tlsMode: 'require' }, undefined, before.revision, 'keep');
  assert.equal((await run(engine, 'discover')).status, 'succeeded');
  const invocation = fake.calls.find(call => call.args.includes('--command=discover'));
  assert.equal(invocation.options.env.MW_SOURCE_PASSWORD, 'keep-fixture-value');
  const changed = await store.read();
  await engine.configureProfile('source', changed.profiles.source, undefined, changed.revision, 'clear');
  assert.equal((await engine.state()).profiles.source.credentialReady, false);
  await assert.rejects(engine.configureProfile('source', changed.profiles.source, undefined, changed.revision, 'keep'), { code: 'CREDENTIAL_REENTRY_REQUIRED' });
  assert.doesNotMatch(await readFile(join(store.directory, 'workspace.json'), 'utf8'), /keep-fixture-value|conflicting-value/);
});

test('operation readiness describes current role, artifact and process blockers without exposing secrets', async t => {
  const { engine, store, root } = await fixture(t);
  const empty = await engine.state();
  assert.deepEqual(empty.operationReadiness.discover, { ready: false, blockers: ['SOURCE_PROFILE_REQUIRED'] });
  assert.deepEqual(empty.operationReadiness['app-scan'], { ready: false, blockers: ['SOURCE_REQUIRED'] });
  await engine.configureInputs({ sourceRoot: root, sourceFingerprint: 'a'.repeat(64) }, empty.revision);
  assert.equal((await engine.state()).operationReadiness['app-scan'].ready, true);
  await engine.configureProfile('source', source, undefined, (await engine.state()).revision);
  assert.deepEqual((await engine.state()).operationReadiness.discover.blockers, ['SOURCE_CREDENTIALS_REQUIRED']);
  await configure(engine, 'source', source);
  assert.equal((await engine.state()).operationReadiness.discover.ready, true);
  assert.deepEqual((await engine.state()).operationReadiness.profile.blockers, ['INVENTORY_REQUIRED']);
  assert.equal((await run(engine, 'discover')).status, 'succeeded');
  assert.equal((await engine.state()).operationReadiness.profile.ready, true);
  await store.update((await store.read()).revision, draft => { draft.jobs.push({ id: 'unknown-load', operation: 'commit', status: 'unknown' }); });
  const uncertain = await engine.state();
  for (const operation of uncertain.capabilities.operations) {
    assert.equal(uncertain.operationReadiness[operation].blockers.includes('JOB_RESULT_UNKNOWN'), ['dry-run', 'commit'].includes(operation), operation);
    if (['dry-run', 'commit'].includes(operation)) assert.equal(uncertain.operationReadiness[operation].ready, false);
  }
  assert.equal(uncertain.operationReadiness.discover.ready, true);
  assert.equal(uncertain.operationReadiness.profile.ready, true);
  assert.doesNotMatch(JSON.stringify(uncertain.operationReadiness), /local-fixture-password/);
});

test('mapping, plan and load refuse a missing standard-columns snapshot before starting the CLI', async t => {
  const { engine, store, fake } = await fixture(t);
  await configure(engine, 'source', source); await configure(engine, 'target', target);
  const prepared = {};
  for (const [kind, content, format] of [
    ['skeleton', JSON.stringify({ tables: [], run: { runId: 'missing-columns', sourceNamespace: 'synthetic' } }), 'json'],
    ['confirmedLedger', '{"schemaVersion":2,"entries":[]}', 'json'],
    ['inventory', evidence('catalog-inventory', { objects: [] }, 'schemaVersion', 4), 'json'],
    ['mapping', 'tables: []\nledger:\n  path: missing-columns-confirmedLedger.json\n', 'yaml'],
    ['plan', evidence('migration-plan', { schemaVersion: 3, mappingDigest: 'a'.repeat(64), targetSchemaDigest: 'b'.repeat(64) }, 'schemaVersion', 2), 'json'],
  ]) {
    const file = `missing-columns-${kind}.${format === 'yaml' ? 'yml' : 'json'}`;
    await writeFile(await store.resolveArtifact(file), content);
    prepared[kind] = { file, sha256: hash(content), format, bytes: Buffer.byteLength(content) };
  }
  await store.update((await store.read()).revision, draft => { Object.assign(draft.artifacts, prepared); });
  const before = await store.read();
  for (const operation of ['mapping-generate', 'plan', 'dry-run', 'commit']) {
    await assert.rejects(engine.startJob({ operation, requestId: `missing-columns-${operation}`, revision: before.revision }), { code: 'ARTIFACT_REQUIRED' });
    assert.deepEqual(await store.read(), before);
  }
  assert.equal(fake.calls.filter(call => call.args.some(arg => arg.startsWith('--command='))).length, 0);
});

test('standard-columns import rejects malformed identifiers and unknown fields without saving', async t => {
  const { engine, store, root, fake } = await fixture(t);
  const before = await store.read();
  const filesBefore = await readdir(join(store.directory, 'artifacts'));
  for (const [columns, code] of [
    [{ table_name: 'tb_synthetic', column_name: 'synthetic_id' }, 'COLUMNS_FORMAT'],
    [[], 'COLUMNS_FORMAT'],
    [[{ table_name: 'public.tb-synthetic', column_name: 'id' }], 'COLUMNS_FORMAT'],
    [[{ table_name: 'catalog.public.tb_synthetic', column_name: 'id' }], 'COLUMNS_FORMAT'],
    [[{ table_name: 'tb_synthetic', column_name: 'id;DROP' }], 'COLUMNS_FORMAT'],
    [[{ table_name: null, column_name: 'id' }], 'COLUMNS_FORMAT'],
    [[{ table_name: 'tb_synthetic', column_name: ['id'] }], 'COLUMNS_FORMAT'],
    [[{ table_name: 'tb_synthetic', column_name: 'id', type: 'text' }], 'INVALID_INPUT'],
    [[{ table_name: 'tb_synthetic' }], 'INVALID_INPUT'],
  ]) {
    await assert.rejects(importColumns(engine, root, columns), { code });
    assert.deepEqual(await store.read(), before);
    assert.deepEqual(await readdir(join(store.directory, 'artifacts')), filesBefore);
  }
  assert.equal(fake.calls.length, 0);
  await importColumns(engine, root, [...standardColumns, { table_name: 'tb_second', column_name: 'second_id' }]);
  const saved = await engine.getArtifact('standardColumns');
  assert.equal(saved.format, 'json');
  assert.equal(saved.sha256, hash(saved.content));
  assert.equal(JSON.parse(saved.content).length, 2);
});

test('changing standard-columns invalidates plans and readiness while preserving source inventory', async t => {
  const { engine, store, root } = await fixture(t);
  await configure(engine, 'source', source);
  assert.equal((await run(engine, 'discover')).status, 'succeeded');
  await importColumns(engine, root);
  const columnsBefore = await engine.getArtifact('standardColumns');
  const inventoryBefore = await engine.getArtifact('inventory');
  const preparedFile = 'prepared-state.json';
  const preparedContent = '{}';
  await writeFile(await store.resolveArtifact(preparedFile), preparedContent);
  const preparedMetadata = { file: preparedFile, sha256: hash(preparedContent), format: 'json', bytes: preparedContent.length };
  const current = await store.read();
  await store.update(current.revision, draft => {
    for (const kind of ['mapping', 'plan', 'review', 'execution']) draft.artifacts[kind] = { ...preparedMetadata };
    draft.readiness = { validated: { inputDigest: 'a'.repeat(64) }, dryRun: { inputDigest: 'a'.repeat(64) }, committed: { inputDigest: 'a'.repeat(64) } };
  });
  const before = await store.read();
  await importColumns(engine, root, [...standardColumns, { table_name: 'public.tb_synthetic', column_name: 'synthetic_name' }]);
  const after = await store.read();
  assert.equal(after.inputRevision, before.inputRevision + 1);
  assert.deepEqual(after.readiness, {});
  for (const kind of ['mapping', 'plan', 'review', 'execution']) assert.equal(after.artifacts[kind], undefined);
  assert.notEqual(after.artifacts.standardColumns.sha256, before.artifacts.standardColumns.sha256);
  assert.deepEqual(after.artifacts.inventory, before.artifacts.inventory);
  assert.deepEqual(await engine.getArtifact('inventory'), inventoryBefore);
  assert.equal(await readFile(await store.resolveArtifact(columnsBefore.file), 'utf8'), columnsBefore.content);
});

test('mapping/plan/validate/DRY_RUN/COMMIT bind to current inputs and explicit target confirmation', async t => {
  const { root, engine, store, fake } = await fixture(t);
  await configure(engine, 'source', source); await configure(engine, 'target', target);
  const git = join(root, 'reviewed'); await mkdir(join(git, '.git'), { recursive: true });
  const ledgerPath = join(git, 'ledger.json'); await writeFile(ledgerPath, '{"schemaVersion":2,"entries":[]}');
  const skeletonPath = join(root, 'skeleton.json'); await writeFile(skeletonPath, JSON.stringify({ tables: [], run: { runId: 'synthetic-run', sourceNamespace: 'synthetic' } }));
  await engine.importArtifact('skeleton', skeletonPath, (await engine.state()).revision);
  await engine.importArtifact('confirmed-ledger', ledgerPath, (await engine.state()).revision);
  await importColumns(engine, root);
  for (const operation of ['discover', 'profile', 'term-suggest', 'mapping-generate', 'plan', 'validate']) {
    const result = await run(engine, operation); assert.equal(result.status, 'succeeded', `${operation}: ${result.errorCode}`);
  }
  const options = { ackAdapter: 'postgresql-pg-catalog', ackFreeze: true };
  await assert.rejects(engine.startJob({ operation: 'commit', requestId: 'without-rehearsal', revision: (await engine.state()).revision, options: { ...options, confirm: true, targetPhrase: 'COMMIT standard' } }), { code: 'REHEARSAL_REQUIRED' });
  assert.equal((await run(engine, 'dry-run', options)).status, 'succeeded');
  await assert.rejects(engine.startJob({ operation: 'commit', requestId: 'wrong-target', revision: (await engine.state()).revision, options: { ...options, confirm: true, targetPhrase: 'COMMIT other' } }), { code: 'COMMIT_CONFIRMATION_REQUIRED' });
  const archiveDirectory = join(root, 'external-archive'); await mkdir(archiveDirectory);
  // Each real load creates a unique evidence UUID. The fake replaces its fixed name between test loads.
  const plan = await engine.getArtifact('plan');
  await writeFile(await store.resolveArtifact(plan.file + '.load-test.json'), 'previous load evidence');
  const originalSpawn = fake.spawnImpl;
  // New fake evidence filename is required; a reused file cannot certify another execution.
  const commitJob = await run(engine, 'commit', { ...options, confirm: true, targetPhrase: 'COMMIT standard', archiveDirectory });
  assert.equal(commitJob.status, 'unknown'); assert.equal(commitJob.errorCode, 'EXECUTION_EVIDENCE_REQUIRED');
  assert.ok(originalSpawn);
  await configure(engine, 'target', { ...target, database: 'changed' });
  assert.deepEqual((await engine.state()).readiness, {});
  assert.equal((await engine.state()).artifacts.plan, undefined);
  assert.doesNotMatch(await readFile(join(store.directory, 'workspace.json'), 'utf8'), /local-fixture-password/);
});

test('DRY_RUN then COMMIT succeed only with distinct fresh evidence bound to the current plan', async t => {
  const { root, engine, store, fake } = await fixture(t, { uniqueLoadEvidence: true });
  await configure(engine, 'source', source); await configure(engine, 'target', target);
  const repository = join(root, 'reviewed'); await mkdir(join(repository, '.git'), { recursive: true });
  const ledgerPath = join(repository, 'ledger.json'); await writeFile(ledgerPath, '{"schemaVersion":2,"entries":[]}');
  const skeletonPath = join(root, 'skeleton.json'); await writeFile(skeletonPath, JSON.stringify({ tables: [], run: { runId: 'synthetic-success', sourceNamespace: 'synthetic' } }));
  await engine.importArtifact('skeleton', skeletonPath, (await engine.state()).revision);
  await engine.importArtifact('confirmed-ledger', ledgerPath, (await engine.state()).revision);
  await importColumns(engine, root);
  for (const operation of ['discover', 'profile', 'term-suggest', 'mapping-generate', 'plan', 'validate']) {
    const result = await run(engine, operation); assert.equal(result.status, 'succeeded', `${operation}: ${result.errorCode}`);
  }
  const plan = await engine.getArtifact('plan');
  const expected = JSON.parse(plan.content);
  const options = { ackAdapter: 'postgresql-pg-catalog', ackFreeze: true };
  const dryRun = await run(engine, 'dry-run', options);
  assert.equal(dryRun.status, 'succeeded');
  const rehearsal = await engine.getArtifact('execution');
  const prepared = await store.read();
  const archiveDirectory = join(root, 'external-archive'); await mkdir(archiveDirectory);
  await assert.rejects(engine.startJob({ operation: 'commit', requestId: 'workspace-as-archive', revision: (await engine.state()).revision, options: { ...options, confirm: true, targetPhrase: 'COMMIT standard', archiveDirectory: store.directory } }), { code: 'UNSAFE_ARCHIVE' });
  const alternateColumns = JSON.stringify([...standardColumns, { table_name: 'tb_second', column_name: 'second_id' }]);
  const alternateFile = 'alternate-standard-columns.json';
  await writeFile(await store.resolveArtifact(alternateFile), alternateColumns);
  // Keep all other inputs and rehearsal markers fixed to prove that the snapshot
  // digest itself participates in the binding, independently of inputRevision.
  await store.update(prepared.revision, draft => {
    draft.artifacts.standardColumns = { file: alternateFile, sha256: hash(alternateColumns), format: 'json', bytes: Buffer.byteLength(alternateColumns) };
  });
  await assert.rejects(engine.startJob({ operation: 'commit', requestId: 'changed-columns-binding', revision: (await engine.state()).revision, options: { ...options, confirm: true, targetPhrase: 'COMMIT standard', archiveDirectory } }), { code: 'REHEARSAL_REQUIRED' });
  await store.update((await store.read()).revision, draft => { draft.artifacts.standardColumns = prepared.artifacts.standardColumns; });
  const commit = await run(engine, 'commit', { ...options, confirm: true, targetPhrase: 'COMMIT standard', archiveDirectory });
  assert.equal(commit.status, 'succeeded', commit.errorCode);
  const executed = await engine.getArtifact('execution');
  assert.notEqual(executed.file, rehearsal.file);
  assert.equal(fake.loadEvidencePaths.length, 2);
  assert.equal(new Set(fake.loadEvidencePaths).size, 2);
  assert.deepEqual(fake.loadEvidencePaths.map(path => basename(path)), [rehearsal.file, executed.file]);
  assert.equal(await readFile(await store.resolveArtifact(rehearsal.file), 'utf8'), rehearsal.content);
  for (const [artifact, mode] of [[rehearsal, 'DRY_RUN'], [executed, 'COMMIT']]) {
    const record = JSON.parse(artifact.content);
    assert.equal(record.schemaVersion, 5);
    assert.equal(record.status, 'PASS');
    assert.equal(record.mode, mode);
    assert.equal(record.planDigest, expected.payloadDigest);
    assert.equal(record.mappingDigest, expected.payload.mappingDigest);
    assert.equal(record.targetDigest, expected.payload.targetSchemaDigest);
    assert.equal(artifact.sha256, hash(artifact.content));
  }
  const state = await store.read();
  assert.equal(state.activeJobId, null);
  assert.deepEqual(state.artifacts.plan, prepared.artifacts.plan);
  assert.equal(state.readiness.committed.jobId, commit.id);
  assert.equal(state.readiness.committed.inputDigest, state.readiness.dryRun.inputDigest);
  assert.equal(state.readiness.committed.inputDigest, state.readiness.validated.inputDigest);
  assert.equal(fake.calls.filter(call => call.args.includes('--command=load')).length, 2);
  const property = `-Dmigration.db-columns-path=${await store.resolveArtifact(prepared.artifacts.standardColumns.file)}`;
  const boundCalls = fake.calls.filter(call => ['--command=mapping-generate', '--command=plan', '--command=load'].some(command => call.args.includes(command)));
  assert.equal(boundCalls.length, 4);
  for (const call of boundCalls) {
    assert.deepEqual(call.args.filter(arg => arg.startsWith('-Dmigration.db-columns-path=')), [property]);
    assert.ok(call.args.indexOf(property) < call.args.indexOf('-jar'));
  }
});

const loadOptions = { ackAdapter: 'postgresql-pg-catalog', ackFreeze: true };
async function preparedPipeline(t, fakeOptions) {
  const prepared = await fixture(t, fakeOptions);
  const { root, engine } = prepared;
  await configure(engine, 'source', source); await configure(engine, 'target', target);
  const repository = join(root, 'reviewed'); await mkdir(join(repository, '.git'), { recursive: true });
  const ledgerPath = join(repository, 'ledger.json'); await writeFile(ledgerPath, '{"schemaVersion":2,"entries":[]}');
  const skeletonPath = join(root, 'skeleton.json'); await writeFile(skeletonPath, JSON.stringify({ tables: [], run: { runId: 'synthetic-unknown', sourceNamespace: 'synthetic' } }));
  await engine.importArtifact('skeleton', skeletonPath, (await engine.state()).revision);
  await engine.importArtifact('confirmed-ledger', ledgerPath, (await engine.state()).revision);
  await importColumns(engine, root);
  for (const operation of ['discover', 'profile', 'term-suggest', 'mapping-generate', 'plan', 'validate']) {
    const result = await run(engine, operation); assert.equal(result.status, 'succeeded', `${operation}: ${result.errorCode}`);
  }
  const archiveDirectory = join(root, 'external-archive'); await mkdir(archiveDirectory);
  return { ...prepared, commitOptions: { ...loadOptions, confirm: true, targetPhrase: 'COMMIT standard', archiveDirectory } };
}
const loadCalls = fake => fake.calls.filter(call => call.args.includes('--command=load')).length;

test('a failed DRY_RUN stays failed because the CLI dry-run never writes the target or control schema', async t => {
  const { engine, fake } = await preparedPipeline(t, { diagnosticChunks: ['\nMW_DIAGNOSTIC=DB_AUTH_FAILED\n'] });
  fake.failingOperations.add('load');
  const failed = await run(engine, 'dry-run', loadOptions);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.errorCode, 'DB_AUTH_FAILED');
  const state = await engine.state();
  for (const operation of state.capabilities.operations) assert.equal(state.operationReadiness[operation].blockers.includes('JOB_RESULT_UNKNOWN'), false, operation);
  assert.ok(state.operationReadiness.commit.blockers.includes('DRY_RUN_REQUIRED'));
  await assert.rejects(engine.jobEvidence(failed.id), { code: 'JOB_NOT_UNKNOWN' });
  fake.failingOperations.delete('load');
  assert.equal((await run(engine, 'dry-run', loadOptions)).status, 'succeeded');
});

test('an unknown COMMIT blocks only new loads until a person records the checked evidence, then a fresh rehearsal is required', async t => {
  const { engine, store, fake, commitOptions } = await preparedPipeline(t, { uniqueLoadEvidence: true, failedLoadEvidence: true });
  const rehearsal = await run(engine, 'dry-run', loadOptions);
  assert.equal(rehearsal.status, 'succeeded');
  const rehearsalEvidence = await engine.getArtifact('execution');
  fake.failingOperations.add('load');
  const commit = await run(engine, 'commit', commitOptions);
  assert.equal(commit.status, 'unknown');
  assert.equal(commit.errorCode, 'CLI_FAILED');
  const uncertain = await engine.state();
  for (const operation of uncertain.capabilities.operations) assert.equal(uncertain.operationReadiness[operation].blockers.includes('JOB_RESULT_UNKNOWN'), ['dry-run', 'commit'].includes(operation), operation);
  const loadsBefore = loadCalls(fake);
  for (const operation of ['dry-run', 'commit']) {
    await assert.rejects(engine.startJob({ operation, requestId: `blocked-${operation}`, revision: uncertain.revision, options: operation === 'commit' ? commitOptions : loadOptions }), { code: 'JOB_RESULT_UNKNOWN' });
  }
  assert.equal(loadCalls(fake), loadsBefore);
  assert.equal((await run(engine, 'validate')).status, 'succeeded');

  // Only the evidence this job created is offered; the earlier rehearsal record is excluded.
  const evidence = await engine.jobEvidence(commit.id);
  assert.equal(evidence.evidenceLocated, true);
  assert.equal(evidence.evidence.length, 1);
  const [record] = evidence.evidence;
  assert.equal(record.file, basename(fake.loadEvidencePaths.at(-1)));
  assert.notEqual(record.file, rehearsalEvidence.file);
  assert.equal(record.sha256, hash(await readFile(fake.loadEvidencePaths.at(-1))));
  assert.deepEqual({ status: record.status, mode: record.mode, written: record.written, tables: record.tables, startedAt: record.startedAt }, { status: 'STARTED', mode: 'COMMIT', written: 3, tables: 1, startedAt: '2026-10-25T01:02:03Z' });

  const before = await store.read();
  for (const [id, input, code] of [
    [commit.id, { revision: before.revision - 1, note: '대상 제어 기록 확인' }, 'REVISION_CONFLICT'],
    [commit.id, { revision: 'latest', note: '대상 제어 기록 확인' }, 'REVISION_CONFLICT'],
    [commit.id, { revision: before.revision, note: '   ' }, 'INVALID_INPUT'],
    [commit.id, { revision: before.revision }, 'INVALID_INPUT'],
    [commit.id, { revision: before.revision, note: '확인', resume: true }, 'INVALID_INPUT'],
    [commit.id, { revision: before.revision, note: '비밀번호 local-fixture-password 로 확인' }, 'SENSITIVE_CONTENT'],
    [rehearsal.id, { revision: before.revision, note: '대상 제어 기록 확인' }, 'JOB_NOT_UNKNOWN'],
    ['00000000-0000-0000-0000-000000000000', { revision: before.revision, note: '대상 제어 기록 확인' }, 'JOB_NOT_FOUND'],
  ]) {
    await assert.rejects(engine.acknowledgeJob(id, input), { code }, code);
    assert.deepEqual(await store.read(), before);
  }

  const acknowledged = await engine.acknowledgeJob(commit.id, { revision: before.revision, note: '  증거는 STARTED 에서 멈춤. 대상 checkpoint 와 행 수를 기관 절차로 확인함.  ' });
  const saved = acknowledged.jobs.find(job => job.id === commit.id);
  assert.equal(saved.status, 'unknown');
  assert.equal(saved.acknowledgement.note, '증거는 STARTED 에서 멈춤. 대상 checkpoint 와 행 수를 기관 절차로 확인함.');
  assert.match(saved.acknowledgement.at, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(saved.acknowledgement.evidence.map(item => item.sha256), [record.sha256]);
  assert.equal(acknowledged.readiness.dryRun, undefined);
  assert.equal(acknowledged.operationReadiness['dry-run'].ready, true);
  assert.ok(!acknowledged.operationReadiness.commit.blockers.includes('JOB_RESULT_UNKNOWN'));
  assert.ok(acknowledged.operationReadiness.commit.blockers.includes('DRY_RUN_REQUIRED'));
  await assert.rejects(engine.acknowledgeJob(commit.id, { revision: acknowledged.revision, note: '다시 확인' }), { code: 'JOB_ALREADY_ACKNOWLEDGED' });
  // The acknowledgement is not an automatic resume: COMMIT still needs a fresh rehearsal.
  await assert.rejects(engine.startJob({ operation: 'commit', requestId: 'commit-without-new-rehearsal', revision: acknowledged.revision, options: commitOptions }), { code: 'REHEARSAL_REQUIRED' });
  assert.equal(loadCalls(fake), loadsBefore);

  fake.failingOperations.delete('load');
  assert.equal((await run(engine, 'dry-run', loadOptions)).status, 'succeeded');
  assert.equal((await run(engine, 'commit', commitOptions)).status, 'succeeded');
  const index = await readFile(join(store.directory, 'workspace.json'), 'utf8');
  assert.equal(JSON.parse(index).jobs.find(job => job.id === commit.id).acknowledgement.evidence[0].sha256, record.sha256);
  assert.doesNotMatch(index, /local-fixture-password/);
});

test('a launcher-restart unknown COMMIT whose process still runs blocks every job and its acknowledgement until the process exits', async t => {
  const { store, fake, jarPath, javaPath } = await fixture(t);
  // 실행기가 죽어도 Linux·macOS 의 Java 자식은 계속 쓸 수 있다. 살아 있는 실제 프로세스를 그 고아 COMMIT 으로 쓴다.
  const orphan = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', windowsHide: true });
  const exited = once(orphan, 'exit');
  t.after(async () => { if (orphan.exitCode === null && orphan.signalCode === null) { orphan.kill(); await exited; } });
  await once(orphan, 'spawn');
  const id = randomUUID();
  await store.update((await store.read()).revision, draft => {
    draft.jobs.push({ id, requestId: 'orphan-commit', operation: 'commit', status: 'running', pid: orphan.pid, startedAt: '2026-10-25T01:02:03.000Z', capability: 'no-safe-pause' });
    draft.activeJobId = id;
  });
  await store.close();
  const restarted = await openWorkspace({ directory: store.directory });
  t.after(() => restarted.close());
  const recovered = (await restarted.read()).jobs.find(job => job.id === id);
  assert.deepEqual({ status: recovered.status, recoveryReason: recovered.recoveryReason, pid: recovered.pid }, { status: 'unknown', recoveryReason: 'launcher-restarted', pid: orphan.pid });
  const engine = createEngine({ store: restarted, jarPath, javaPath, spawnImpl: fake.spawnImpl });
  await configure(engine, 'source', source);

  const alive = await engine.state();
  for (const operation of alive.capabilities.operations) assert.ok(alive.operationReadiness[operation].blockers.includes('PREVIOUS_PROCESS_ALIVE'), `${operation}: 살아 있는 고아 적재는 모든 단계를 막는다`);
  // 결과 불명이 막지 않는 읽기 단계까지 막는다. 적재도 결과 불명보다 이전 프로세스 생존을 먼저 알린다.
  for (const operation of ['discover', 'dry-run', 'commit']) {
    await assert.rejects(engine.startJob({ operation, requestId: `while-orphan-${operation}`, revision: alive.revision }), { code: 'PREVIOUS_PROCESS_ALIVE' }, `${operation}: 고아 적재가 도는 동안 새 작업 거부`);
  }
  const before = await restarted.read();
  await assert.rejects(engine.acknowledgeJob(id, { revision: before.revision, note: '증거는 STARTED 에서 멈춤. 대상 상태를 확인함.' }), { code: 'PREVIOUS_PROCESS_ALIVE' }, '고아 적재가 도는 동안 확인 기록 거부');
  assert.deepEqual(await restarted.read(), before);
  assert.equal(fake.calls.length, 0);

  orphan.kill(); await exited;
  assert.throws(() => process.kill(orphan.pid, 0), error => error.code === 'ESRCH');
  const ended = await engine.state();
  for (const operation of ended.capabilities.operations) assert.equal(ended.operationReadiness[operation].blockers.includes('PREVIOUS_PROCESS_ALIVE'), false, operation);
  // 프로세스가 끝나도 결과는 여전히 불명이다. 확인 기록 전에는 새 적재만 막는다.
  assert.ok(ended.operationReadiness['dry-run'].blockers.includes('JOB_RESULT_UNKNOWN'));
  await assert.rejects(engine.startJob({ operation: 'dry-run', requestId: 'after-orphan-dry-run', revision: ended.revision, options: loadOptions }), { code: 'JOB_RESULT_UNKNOWN' });
  assert.equal((await run(engine, 'discover')).status, 'succeeded');
  const acknowledged = await engine.acknowledgeJob(id, { revision: (await engine.state()).revision, note: '이전 프로세스 종료를 확인하고 대상 checkpoint 와 행 수를 기관 절차로 확인함.' });
  assert.equal(acknowledged.jobs.find(job => job.id === id).status, 'unknown');
  assert.ok(acknowledged.jobs.find(job => job.id === id).acknowledgement);
  assert.ok(!acknowledged.operationReadiness['dry-run'].blockers.includes('JOB_RESULT_UNKNOWN'));
  // 확인 기록은 그 pid 의 종료를 확인한 뒤에만 남는다. 뒤에 같은 pid 를 받은 다른 프로세스를 이전 작업으로 오인하지 않는다.
  await restarted.update(acknowledged.revision, draft => { draft.jobs.find(job => job.id === id).pid = process.pid; });
  assert.equal((await engine.state()).operationReadiness.discover.blockers.includes('PREVIOUS_PROCESS_ALIVE'), false, '확인 기록 뒤 재사용된 pid');
});

test('API envelopes reject unknown fields and unsafe file paths', async t => {
  const { engine, root } = await fixture(t);
  await assert.rejects(engine.startJob({ operation: 'discover', requestId: 'bad-fields', revision: 0, shell: 'anything' }), { code: 'INVALID_INPUT' });
  await assert.rejects(engine.configureInputs({ sourceRoot: root, sourceFingerprint: 'a'.repeat(64), command: 'anything' }, 0), { code: 'INVALID_INPUT' });
  await assert.rejects(engine.importArtifact('skeleton', '../outside', 0), { code: 'INVALID_PATH' });
  await assert.rejects(engine.cancelJob('no-such-job'), { code: 'JOB_NOT_FOUND' });
});
