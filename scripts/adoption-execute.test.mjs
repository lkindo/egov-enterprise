import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { ADOPTION_CONTROLS, adoptionScope, createPendingAdoptionReview, sha256 } from './adoption-review.mjs';
import { executeAdoption, executionPlan } from './adoption-execute.mjs';

function fixture(t) {
  const base = resolve(tmpdir());
  const root = mkdtempSync(join(base, 'egov-execution-contract-'));
  t.after(() => {
    assert.ok(relative(base, root).startsWith('egov-execution-contract-') && !relative(base, root).includes(sep));
    rmSync(root, { recursive: true, force: true });
  });
  const write = (path, bytes) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), bytes); };
  write('migration-tool/build.gradle', 'dependencies {}');
  write('migration-tool/src/main/java/Tool.java', 'class Tool {}');
  write('docs/review.md', 'Synthetic evidence used only to test the execution boundary.');
  const migration = { mode: 'dry-run', sourceAdapter: 'postgresql-pg-catalog', schemas: ['legacy'], ackSourceFreeze: true };
  for (const role of ['jar', 'mapping', 'inventory', 'plan']) {
    const path = `execution/${role}.${role === 'jar' ? 'jar' : 'json'}`;
    write(path, `fixture-${role}`);
    migration[role] = { path, sha256: sha256(readFileSync(join(root, path))) };
  }
  const path = 'config/governance/execution.json';
  const plan = { schemaVersion: 1, product: 'migration-tool', profile: null, environmentId: 'fixture-env', migration };
  const approvalPath = 'config/governance/migration-adoption-review.json';
  const approve = (value = plan) => {
    write(path, JSON.stringify(value));
    const now = Date.now();
    const review = { ...createPendingAdoptionReview({ product: 'migration-tool', profile: null }),
      status: 'approved', environmentId: 'fixture-env', owner: 'test fixture reviewer',
      reviewedAt: new Date(now - 60_000).toISOString(), validUntil: new Date(now + 60_000).toISOString(),
      scopeDigest: adoptionScope(root, { product: 'migration-tool', profile: null }).digest,
      evidence: ADOPTION_CONTROLS['migration-tool'].map(control => {
        const evidencePath = control === 'execution-artifacts' ? path : 'docs/review.md';
        return { control, path: evidencePath, sha256: sha256(readFileSync(join(root, evidencePath))) };
      }) };
    write(approvalPath, JSON.stringify(review));
  };
  approve();
  return { root, path, write, plan, approve, approvalPath };
}

test('default check verifies the technical scope and never launches the migration process', (t) => {
  const { root, path } = fixture(t);
  const calls = [];
  const result = executeAdoption({ root, path, environmentId: 'fixture-env', run: (cmd, args) => calls.push([cmd, args]) });
  assert.deepEqual(calls, [['node', ['scripts/verify.mjs', 'migration']]]);
  assert.equal(result.executed, false);
  assert.equal(result.liveEnvironmentCertified, false);
  const execution = executionPlan(root, path, 'fixture-env');
  assert.equal(execution.command, 'java');
  assert.ok(execution.args.includes('--command=load'));
  assert.ok(execution.args.includes('--mode=dry-run'));
  assert.ok(execution.args.includes('--ack-source-freeze'));
});

test('only explicit execution after technical verification reaches the existing load entry point', (t) => {
  const { root, path } = fixture(t);
  const calls = [];
  const result = executeAdoption({ root, path, environmentId: 'fixture-env', execute: true,
    run: (cmd, args) => calls.push([cmd, args]) });
  assert.equal(result.executed, true);
  assert.deepEqual(calls.map(([cmd]) => cmd), ['node', 'java']);
  assert.equal(calls[1][1][2], '--command=load');
});

test('wrong environment, altered execution plan and altered JAR/mapping/inventory/plan never reach verification or load', (t) => {
  const value = fixture(t);
  const { root, path, write, plan, approve } = value;
  const noRun = () => assert.fail('invalid approval may not execute a command');
  assert.throws(() => executeAdoption({ root, path, environmentId: 'another', execute: true, run: noRun }), /environment/);
  write(path, JSON.stringify({ ...plan, extra: true }));
  assert.throws(() => executeAdoption({ root, path, environmentId: 'fixture-env', execute: true, run: noRun }), /fields/);
  approve();
  for (const role of ['jar', 'mapping', 'inventory', 'plan']) {
    write(plan.migration[role].path, 'tampered');
    assert.throws(() => executeAdoption({ root, path, environmentId: 'fixture-env', execute: true, run: noRun }), /hash mismatch/);
    write(plan.migration[role].path, `fixture-${role}`);
  }
  approve({ ...plan, migration: { ...plan.migration, mode: 'bypass' } });
  assert.throws(() => executionPlan(root, path, 'fixture-env'), /mode/);
});

test('technical failure or source/evidence change during verification blocks the final operation', (t) => {
  for (const mutation of ['failure', 'source', 'approval', 'expiry']) {
    const { root, path, write, approvalPath } = fixture(t);
    let commands = 0;
    assert.throws(() => executeAdoption({ root, path, environmentId: 'fixture-env', execute: true,
      run: () => {
        assert.equal(++commands, 1);
        if (mutation === 'failure') throw new Error('technical failure');
        if (mutation === 'source') write('migration-tool/src/main/java/Tool.java', 'class Changed {}');
        if (mutation === 'approval') write('docs/review.md', 'changed evidence');
        if (mutation === 'expiry') {
          const approval = JSON.parse(readFileSync(join(root, approvalPath), 'utf8'));
          approval.validUntil = new Date(Date.now() - 1000).toISOString();
          write(approvalPath, JSON.stringify(approval));
        }
      } }), /failure|scope|hash mismatch|expired/);
    assert.equal(commands, 1);
  }
});
