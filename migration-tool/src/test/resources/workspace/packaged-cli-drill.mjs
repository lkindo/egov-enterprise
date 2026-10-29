// Actual engine/store and default child_process.spawn; Java owns the private database and child lifetime.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = process.env.D03_PRODUCT_ROOT;
const directory = process.env.D03_DIRECTORY;
const { createEngine } = await import(pathToFileURL(join(root, 'tools/migration-workspace/engine.mjs')));
const { openWorkspace } = await import(pathToFileURL(join(root, 'tools/migration-workspace/store.mjs')));
// engine imports the real inputs.mjs; there is no mock or alternate import tree.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const workspace = join(directory, 'workspace');
const options = { ackAdapter: 'postgresql-pg-catalog', ackFreeze: true };
const profile = schema => ({ vendor: 'postgresql', host: process.env.D03_HOST,
  port: Number(process.env.D03_PORT), database: process.env.D03_DATABASE, schema,
  username: process.env.D03_USER, tlsMode: 'disable' });
let engine;
let phase = 'initialization';
const terminal = new Set(['succeeded', 'failed', 'interrupted', 'unknown']);
const phaseSignal = name => { phase = name; process.stdout.write(`D03_PHASE=${name}\n`); };

async function connect(jarPath) {
  const store = await openWorkspace({ directory: workspace });
  assert.equal(store.readOnly, false);
  engine = createEngine({ store, jarPath, javaPath: process.env.D03_JAVA });
  for (const [role, schema] of [['source', 'd03_source'], ['target', 'd03_target']]) {
    await engine.configureProfile(role, profile(schema), process.env.D03_PASSWORD,
      (await engine.state()).revision, 'replace');
  }
}

async function settled(id, timeout = 180_000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const state = await engine.state();
    const job = state.jobs.find(candidate => candidate.id === id);
    assert.ok(job);
    if (terminal.has(job.status) && state.activeJobId === null) return job;
    if (Date.now() >= deadline) throw Object.assign(new Error(), { code: 'D03_JOB_TIMEOUT' });
    await delay(50);
  }
}

async function run(name, operation, expected = 'succeeded', jobOptions = {}) {
  phaseSignal(name);
  const job = await engine.startJob({ operation, requestId: `d03-${randomUUID()}`,
    revision: (await engine.state()).revision, options: jobOptions });
  const running = (await engine.state()).jobs.find(candidate => candidate.id === job.id);
  // Public state records the PID from the actual default spawn. The Java parent verifies ownership.
  assert.ok(Number.isSafeInteger(running.pid));
  process.stdout.write(`D03_CHILD_PID=${running.pid}\n`);
  const completed = await settled(job.id);
  phaseSignal(`${name}-completed`);
  if (completed.status !== expected) {
    const code = /^[A-Z][A-Z0-9_]{0,63}$/.test(completed.errorCode ?? '')
      ? completed.errorCode : 'D03_JOB_STATUS';
    throw Object.assign(new Error(), { code });
  }
  assert.equal(completed.status, expected);
  assert.equal((await engine.state()).activeJobId, null);
  return completed;
}

async function imported(kind, filename) {
  await engine.importArtifact(kind, join(directory, filename), (await engine.state()).revision);
}

async function artifact(kind) {
  const value = await engine.getArtifact(kind);
  assert.match(value.sha256, /^[0-9a-f]{64}$/);
  const bytes = await readFile(join(workspace, 'artifacts', value.file));
  assert.equal(hash(bytes), value.sha256);
  assert.equal(bytes.length, value.bytes);
  return value;
}

async function executionFiles(planFile) {
  return (await readdir(join(workspace, 'artifacts')))
    .filter(name => name.startsWith(`${planFile}.load-`) && name.endsWith('.json')).sort();
}

try {
  await connect(process.env.D03_JAR);
  await imported('skeleton', 'skeleton.json');
  await imported('confirmed-ledger', 'reviewed/ledger.json');
  await imported('standard-columns', 'columns.json');
  const ledger = (await engine.state()).ledger;
  assert.equal(ledger.reviewSource, 'institution-git-import');
  assert.match(ledger.gitCommit, /^[0-9a-f]{40,64}$/);
  assert.match(ledger.gitBlob, /^[0-9a-f]{40,64}$/);

  await run('discover', 'discover');
  phaseSignal('discover-artifact');
  const inventory = JSON.parse((await artifact('inventory')).content);
  assert.equal(inventory.schemaVersion, 4);
  assert.equal(inventory.artifactType, 'catalog-inventory');
  assert.ok(inventory.payload.objects.some(object => object.kind === 'TABLE' && object.name === 'tb_workspace'));
  await run('mapping-generate', 'mapping-generate');
  const mapping = await artifact('mapping');
  assert.equal(mapping.format, 'yaml');
  assert.match(mapping.content, /^ledger:/m);
  await run('draft-plan', 'plan');
  const draft = JSON.parse((await artifact('plan')).content).payload;
  assert.equal(draft.schemaVersion, 3);
  assert.equal(draft.readiness.commitReady, false);
  const invalid = await run('unreviewed-validate', 'validate', 'failed');
  assert.equal(invalid.errorCode, 'CLI_FAILED');
  assert.equal((await engine.state()).readiness.validated, undefined);

  // SafeCatalogObject has no serialized stableId. Reuse the actual draft's sourceObjectId; do not duplicate Java hashing.
  const decisions = {};
  for (const object of draft.objects) {
    assert.match(object.sourceObjectId, /^urn:migration-object:sha256:[0-9a-f]{64}$/);
    const mapped = object.objectKind === 'TABLE' && object.dataMappingPresent;
    decisions[object.sourceObjectId] = { disposition: mapped ? 'AUTO_DATA_LOAD' : 'EXPORT_ONLY',
      targetObject: mapped ? 'd03_target.tb_workspace' : null, reviewed: true,
      rationale: 'Disposable workspace integration fixture only' };
  }
  assert.equal(draft.objects.filter(object => object.objectKind === 'TABLE' && object.dataMappingPresent).length, 1);
  const review = { schemaVersion: 2, decisions };
  for (const key of ['sourceInventoryDigest', 'targetSchemaDigest', 'mappingDigest', 'executionContractDigest']) {
    assert.match(draft[key], /^[0-9a-f]{64}$/);
    review[key] = draft[key];
  }
  await writeFile(join(directory, 'review.json'), JSON.stringify(review), { flag: 'wx' });
  await imported('review', 'review.json');
  await run('reviewed-plan', 'plan');
  const reviewedArtifact = await artifact('plan');
  const reviewedEnvelope = JSON.parse(reviewedArtifact.content);
  assert.equal(reviewedEnvelope.payload.readiness.commitReady, true);
  assert.deepEqual(reviewedEnvelope.payload.readiness.blockers, []);
  await run('reviewed-validate', 'validate');

  phaseSignal('stored-artifact-change');
  const originalInventory = await artifact('inventory');
  const beforeTamper = await engine.state();
  const inventoryPath = join(workspace, 'artifacts', originalInventory.file);
  // Change only this fixture's artifact bytes. Never update workspace.json or its metadata to hide the change.
  try {
    await writeFile(inventoryPath, originalInventory.content + '\n');
    await assert.rejects(engine.startJob({ operation: 'dry-run', requestId: `d03-${randomUUID()}`,
      revision: beforeTamper.revision, options }), { code: 'ARTIFACT_CHANGED' });
    const afterTamper = await engine.state();
    assert.equal(afterTamper.jobs.length, beforeTamper.jobs.length);
    assert.equal(afterTamper.activeJobId, null);
    assert.equal(afterTamper.readiness.dryRun, undefined);
    assert.equal(afterTamper.artifacts.execution, undefined);
    assert.deepEqual(await executionFiles(reviewedArtifact.file), []);
  } finally {
    // Restore the exact original fixture bytes for the separate JAR mismatch case, without editing metadata/state.
    await writeFile(inventoryPath, originalInventory.content);
  }

  const beforeReopen = await engine.state();
  await engine.close();
  engine = null;
  await connect(process.env.D03_TAMPERED_JAR);
  assert.equal((await engine.state()).inputRevision, beforeReopen.inputRevision);
  assert.equal((await engine.state()).revision, beforeReopen.revision);
  // The changed archive is still executable and can validate this reviewed plan.
  // Its load must fail because the executable contract changed, not because the JAR is corrupt.
  await run('changed-jar-validate', 'validate');
  const changed = await run('changed-jar-dry-run', 'dry-run', 'failed', options);
  assert.equal(changed.errorCode, 'CLI_FAILED');
  assert.equal((await engine.state()).readiness.dryRun, undefined);
  assert.equal((await engine.state()).artifacts.execution, undefined);
  assert.deepEqual(await executionFiles(reviewedArtifact.file), []);

  await engine.close();
  engine = null;
  await connect(process.env.D03_JAR);
  await run('dry-run', 'dry-run', 'succeeded', options);
  const executionArtifact = await artifact('execution');
  const execution = JSON.parse(executionArtifact.content);
  assert.equal(execution.schemaVersion, 5);
  assert.equal(execution.mode, 'DRY_RUN');
  assert.equal(execution.status, 'PASS');
  assert.equal(execution.planDigest, reviewedEnvelope.payloadDigest);
  assert.equal(execution.mappingDigest, reviewedEnvelope.payload.mappingDigest);
  assert.equal(execution.targetDigest, reviewedEnvelope.payload.targetSchemaDigest);
  assert.equal(execution.tables.length, 1);
  assert.equal(execution.tables[0].read, 4);
  assert.equal(execution.tables[0].written, 0);
  assert.equal(execution.tables[0].errors, 0);
  assert.equal(execution.tables[0].status, 'PASS');
  assert.deepEqual(await executionFiles(reviewedArtifact.file), [executionArtifact.file]);
  assert.ok((await engine.state()).readiness.dryRun);

  process.stdout.write('D03_PASS\n');
} catch (error) {
  // Deliberately exclude error.message/stack/actual values, JDBC details, artifact content and raw child output.
  const code = typeof error?.code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(error.code) ? error.code : 'D03_ASSERTION';
  process.stdout.write(`D03_FAILURE=${phase}:${code}\n`);
  process.exitCode = 1;
} finally {
  if (engine) {
    try {
      const state = await engine.state();
      if (state.activeJobId) {
        const active = state.jobs.find(job => job.id === state.activeJobId);
        if (active && !['dry-run', 'commit'].includes(active.operation)) {
          await engine.cancelJob(active.id);
          await settled(active.id, 5_000);
        }
      }
      // close rejects active loads; it is not a cancellation primitive.
      await engine.close();
    } catch {
      process.stdout.write('D03_CLEANUP_REQUIRED\n');
      process.exitCode = 1; // Java supervisor terminates only its still-owned descendant processes.
    }
  }
}
