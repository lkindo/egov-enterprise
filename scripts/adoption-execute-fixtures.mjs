import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { ADOPTION_CONTROLS, adoptionScope, createPendingAdoptionReview, sha256 } from './adoption-review.mjs';

// Shared synthetic execution inputs; no commands or online preset declarations are installed.
export function adoptionExecutionFixture(t, layout) {
  const base = resolve(tmpdir());
  const root = mkdtempSync(join(base, 'egov-execution-contract-'));
  t.after(() => {
    assert.ok(relative(base, root).startsWith('egov-execution-contract-') && !relative(base, root).includes(sep));
    rmSync(root, { recursive: true, force: true });
  });
  const write = (path, bytes) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), bytes); };
  write('migration-tool/build.gradle', 'dependencies {}');
  for (const file of ['engine.mjs', 'store.mjs', 'inputs.mjs']) {
    write(`tools/migration-workspace/${file}`, 'export const fixture = true;\n');
  }
  write('migration-tool/src/main/java/Tool.java', 'class Tool {}');
  // 승인 실행 사슬이 import 하는 구성 이름 판정(11단계 C8)은 이관 제품에도 복사된다.
  write('scripts/composition-profiles.mjs', '// Synthetic composition profile input; the real module is imported from this repository.\n');
  if (layout !== undefined) {
    write('reusable-base-lock.json', JSON.stringify({ profile: 'core', layout }));
    write('package.json', JSON.stringify({ scripts: { 'verify:migration': 'node scripts/reusable-layout-runtime.mjs --verify-migration' } }));
    for (const file of ['scripts/reusable-layout.mjs', 'scripts/reusable-layout-runtime.mjs', 'scripts/reusable-single-module.mjs']) {
      write(file, '// Synthetic verification input; command execution is intercepted by this test.\n');
    }
  }
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

