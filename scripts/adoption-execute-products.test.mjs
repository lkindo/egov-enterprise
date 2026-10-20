import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { ADOPTION_CONTROLS, adoptionScope, createPendingAdoptionReview, sha256 } from './adoption-review.mjs';
import { executeAdoption } from './adoption-execute.mjs';
import { adoptionExecutionFixture as fixture } from './adoption-execute-fixtures.mjs';

// Producer-only contracts need the producer's real preset declarations; the standalone CLI has none.

test('single-module adoption verifies the active isolated migration runner before optional execution', t => {
  for (const execute of [false, true]) {
    const { root, path } = fixture(t, 'single-module');
    const calls = [];
    const result = executeAdoption({ root, path, environmentId: 'fixture-env', execute,
      run: (command, args) => calls.push([command, args]) });
    assert.deepEqual(calls[0], ['node', ['scripts/reusable-layout-runtime.mjs', '--verify-migration']]);
    assert.equal(calls.length, execute ? 2 : 1);
    assert.equal(result.executed, execute);
    if (execute) {
      assert.equal(calls[1][0], 'java');
      assert.ok(calls[1][1].includes('--command=load'));
      assert.ok(calls[1][1].includes('--ack-source-freeze'));
    }
  }
});

test('explicit and legacy generated multi-module locks use the product migration verifier', t => {
  for (const legacy of [false, true]) {
    const { root, path, write, approve } = fixture(t, 'multi-module');
    if (legacy) { write('reusable-base-lock.json', JSON.stringify({ profile: 'core' })); approve(); }
    const calls = [];
    executeAdoption({ root, path, environmentId: 'fixture-env', run: (command, args) => calls.push([command, args]) });
    assert.deepEqual(calls, [['node', ['scripts/reusable-layout-runtime.mjs', '--verify-migration']]]);
  }
});

test('domain-selected (custom) generated locks use the same layout migration verifier as presets', t => {
  for (const layout of ['multi-module', 'single-module']) {
    const { root, path, write, approve } = fixture(t, layout);
    write('reusable-base-lock.json', JSON.stringify({ profile: 'custom', layout }));
    approve();
    const calls = [];
    executeAdoption({ root, path, environmentId: 'fixture-env', run: (command, args) => calls.push([command, args]) });
    assert.deepEqual(calls[0], ['node', ['scripts/reusable-layout-runtime.mjs', '--verify-migration']]);
  }
});

test('unknown generated layout or profile cannot fall back to a different verifier', t => {
  for (const lock of [{ profile: 'core', layout: 'unknown' }, { profile: 'unknown', layout: 'multi-module' }]) {
    const { root, path, write, approve } = fixture(t, 'multi-module');
    write('reusable-base-lock.json', JSON.stringify(lock));
    approve();
    assert.throws(() => executeAdoption({ root, path, environmentId: 'fixture-env', execute: true,
      run: () => assert.fail('invalid layout may not run verification or load') }), /invalid generated migration verification layout/);
  }
});

test('both generated layouts bind verification sources, layout selection and aliases to approval', t => {
  for (const layout of ['single-module', 'multi-module']) for (const file of ['scripts/reusable-layout.mjs', 'scripts/reusable-layout-runtime.mjs',
    'scripts/reusable-single-module.mjs', 'scripts/composition-profiles.mjs', 'package.json', 'reusable-base-lock.json']) {
    const { root, path, write } = fixture(t, layout);
    const changed = file === 'reusable-base-lock.json'
      ? JSON.stringify({ profile: 'core', layout: layout === 'single-module' ? 'multi-module' : 'single-module' })
      : readFileSync(join(root, file), 'utf8') + '\nchanged';
    write(file, changed);
    assert.throws(() => executeAdoption({ root, path, environmentId: 'fixture-env', execute: true,
      run: () => assert.fail('unreviewed verifier may not run') }), /scope digest mismatch/, file);
  }
  for (const file of ['scripts/reusable-layout-runtime.mjs', 'scripts/composition-profiles.mjs']) {
    const { root, path } = fixture(t, 'single-module');
    rmSync(join(root, file));
    assert.throws(() => executeAdoption({ root, path, environmentId: 'fixture-env', execute: true,
      run: () => assert.fail('missing verifier may not run') }), new RegExp(`missing product scope input: ${file}`), file);
  }

});

test('verifier or layout mutation during single-module verification prevents the final load', t => {
  for (const file of ['scripts/reusable-layout-runtime.mjs', 'reusable-base-lock.json']) {
    const { root, path, write } = fixture(t, 'single-module');
    const calls = [];
    assert.throws(() => executeAdoption({ root, path, environmentId: 'fixture-env', execute: true,
      run: (command, args) => {
        calls.push([command, args]);
        write(file, file.endsWith('.json') ? JSON.stringify({ profile: 'core', layout: 'multi-module' }) : '// changed verifier');
      } }), /scope digest mismatch/);
    assert.deepEqual(calls, [['node', ['scripts/reusable-layout-runtime.mjs', '--verify-migration']]]);
  }
});

function onlineFixture(t) {
  const value = fixture(t, 'multi-module');
  const { root, path, write } = value;
  write('frontend/package.json', '{"private":true}');
  write('config/ui-url-state-census.json', '{}');
  write('config/modules/presets.json', '{}');
  const manifest = { schemaVersion: 1, revision: 'a'.repeat(40),
    apiImage: `registry.example.org/institution/api@sha256:${'1'.repeat(64)}`,
    frontendImage: `registry.example.org/institution/frontend@sha256:${'2'.repeat(64)}` };
  const manifestPath = 'execution/release-manifest.json';
  write(manifestPath, JSON.stringify(manifest));
  const plan = { schemaVersion: 1, product: 'online', profile: 'core', environmentId: 'fixture-env',
    images: { api: manifest.apiImage, frontend: manifest.frontendImage },
    releaseManifest: { path: manifestPath, sha256: sha256(readFileSync(join(root, manifestPath))) } };
  const approve = (next = plan) => {
    write(path, JSON.stringify(next));
    const now = Date.now();
    write('config/governance/adoption-review.json', JSON.stringify({
      ...createPendingAdoptionReview({ product: 'online', profile: 'core' }),
      status: 'approved', environmentId: 'fixture-env', owner: 'test fixture reviewer',
      reviewedAt: new Date(now - 60_000).toISOString(), validUntil: new Date(now + 60_000).toISOString(),
      scopeDigest: adoptionScope(root, { product: 'online', profile: 'core' }).digest,
      evidence: ADOPTION_CONTROLS.online.map(control => {
        const evidencePath = control === 'execution-artifacts' ? path : 'docs/review.md';
        return { control, path: evidencePath, sha256: sha256(readFileSync(join(root, evidencePath))) };
      }),
    }));
  };
  approve();
  return { ...value, manifest, manifestPath, plan, approve };
}

test('online execution passes the reviewed complete manifest and both matching image references to deploy', (t) => {
  const { root, path, manifestPath, plan } = onlineFixture(t);
  const calls = [];
  const result = executeAdoption({ root, path, environmentId: 'fixture-env', execute: true,
    run: (command, args, options) => calls.push({ command, args, options }) });
  assert.equal(result.executed, true);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].args, ['scripts/deploy.sh', join(root, manifestPath)]);
  assert.equal(calls[1].options.env.API_IMAGE_REF, plan.images.api);
  assert.equal(calls[1].options.env.FRONTEND_IMAGE_REF, plan.images.frontend);
});

test('online manifest omission, tampering and image-pair mismatch fail before verification or deploy', (t) => {
  for (const failure of ['missing', 'tampered', 'pair', 'partial']) {
    const { root, path, write, manifest, manifestPath, plan, approve } = onlineFixture(t);
    if (failure === 'missing') { const { releaseManifest, ...legacy } = plan; approve(legacy); }
    if (failure === 'tampered') write(manifestPath, JSON.stringify({ ...manifest, revision: 'b'.repeat(40) }));
    if (failure === 'pair') approve({ ...plan, images: { ...plan.images, api: `registry.example.org/other/api@sha256:${'3'.repeat(64)}` } });
    if (failure === 'partial') {
      write(manifestPath, JSON.stringify({ ...manifest, frontendImage: null }));
      approve({ ...plan, releaseManifest: { path: manifestPath, sha256: sha256(readFileSync(join(root, manifestPath))) } });
    }
    assert.throws(() => executeAdoption({ root, path, environmentId: 'fixture-env', execute: true,
      run: () => assert.fail('invalid manifest may not reach a command') }), /fields|manifest/u);
  }
});

test('online manifest changes during technical verification block final deploy', (t) => {
  const { root, path, write, manifest, manifestPath } = onlineFixture(t);
  let commands = 0;
  assert.throws(() => executeAdoption({ root, path, environmentId: 'fixture-env', execute: true,
    run: () => {
      commands += 1;
      write(manifestPath, JSON.stringify({ ...manifest, revision: 'b'.repeat(40) }));
    } }), /manifest hash mismatch/u);
  assert.equal(commands, 1);
});

