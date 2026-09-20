#!/usr/bin/env node
/** Institution entry point. --execute is explicit; source CI never invokes deployment or load. */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adoptionScope, containedFile, sha256, validateAdoptionReview } from './adoption-review.mjs';
import { runCommand } from './verify-reusable-artifact.mjs';

const read = (root, file) => JSON.parse(readFileSync(containedFile(root, file), 'utf8'));
const exactKeys = (value, keys) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some(key => !keys.includes(key))) throw new Error('unknown execution fields');
};
const image = value => typeof value === 'string' && /^[a-z0-9][a-z0-9._:/-]*@sha256:[a-f0-9]{64}$/.test(value);

export function executionPlan(root, path, environmentId) {
  const value = read(root, path);
  exactKeys(value, ['schemaVersion', 'product', 'profile', 'environmentId', 'images', 'migration']);
  if (value.schemaVersion !== 1 || typeof environmentId !== 'string' || !environmentId.trim()
    || value.environmentId !== environmentId) throw new Error('execution environment must match explicitly');
  const { product, profile } = value;
  if (product === 'online') {
    const lockPath = resolve(root, 'reusable-base-lock.json');
    if (!existsSync(lockPath) || JSON.parse(readFileSync(lockPath, 'utf8')).profile !== profile) {
      throw new Error('online execution requires the matching generated product profile');
    }
  }
  const approvalPath = product === 'online' ? 'config/governance/adoption-review.json' : 'config/governance/migration-adoption-review.json';
  const approval = read(root, approvalPath);
  const scope = adoptionScope(root, { product, profile });
  const errors = validateAdoptionReview(approval, { repoRoot: root, product, profile, environmentId, scopeDigest: scope.digest });
  const binding = approval.evidence?.find(entry => entry.control === 'execution-artifacts');
  if (binding?.path !== path || binding?.sha256 !== sha256(readFileSync(containedFile(root, path)))) errors.push('execution artifacts must be explicitly reviewed and hash-bound');
  if (errors.length) throw new Error(errors.join('\n'));
  if (product === 'online') {
    exactKeys(value.images, ['api', 'frontend']);
    if (value.migration !== undefined || !image(value.images.api) || !image(value.images.frontend)) throw new Error('exact registry image digests are required');
    return { product, profile, environmentId, images: value.images,
      command: 'bash', args: ['scripts/deploy.sh'],
      env: { API_IMAGE_REF: value.images.api, FRONTEND_IMAGE_REF: value.images.frontend } };
  }
  exactKeys(value.migration, ['jar', 'mapping', 'inventory', 'plan', 'mode', 'sourceAdapter', 'schemas', 'ackSourceFreeze']);
  const migration = value.migration;
  if (value.images !== undefined || !['dry-run', 'commit'].includes(migration.mode)
    || migration.sourceAdapter !== 'postgresql-pg-catalog' || migration.ackSourceFreeze !== true
    || !Array.isArray(migration.schemas) || migration.schemas.length === 0
    || migration.schemas.some(schema => typeof schema !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema))) {
    throw new Error('execution wrapper currently requires the reviewed PostgreSQL adapter, schemas, mode and freeze acknowledgement');
  }
  const files = {};
  for (const role of ['jar', 'mapping', 'inventory', 'plan']) {
    const entry = migration[role];
    exactKeys(entry, ['path', 'sha256']);
    const file = containedFile(root, entry.path);
    if (sha256(readFileSync(file)) !== entry.sha256) throw new Error(`execution ${role} hash mismatch`);
    if (role === 'jar' && !file.endsWith('.jar')) throw new Error('migration artifact must be a JAR');
    files[role] = file;
  }
  // The existing ADR-0008 load surface still validates plan approval, inventory,
  // endpoint/driver/target fingerprints and live source scope. This wrapper cannot bypass it.
  return { product, profile, environmentId, command: 'java', args: ['-jar', files.jar,
    '--command=load', `--mapping=${files.mapping}`, `--inventory=${files.inventory}`, `--plan=${files.plan}`,
    `--mode=${migration.mode}`, `--source-adapter=${migration.sourceAdapter}`, `--schemas=${migration.schemas.join(',')}`,
    `--ack-adapter=${migration.sourceAdapter}`, '--ack-source-freeze'], env: {} };
}

export function executeAdoption({ root, path, environmentId, execute = false, run = runCommand } = {}) {
  root = resolve(root);
  const before = executionPlan(root, path, environmentId);
  const technical = before.product === 'migration-tool'
    ? migrationVerification(root) : ['scripts/verify-reusable-artifact.mjs'];
  run('node', technical, { root });
  // Compilation, tests or time passage cannot leave an earlier approval silently valid.
  const after = executionPlan(root, path, environmentId);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('execution scope changed during verification');
  if (execute) run(after.command, after.args, { root, env: { ...process.env, ...after.env } });
  return { product: after.product, profile: after.profile, environmentId,
    technicalValidation: 'passed', executionEnvelopeValid: true, executed: execute,
    liveEnvironmentCertified: false };
}

function migrationVerification(root) {
  if (!existsSync(resolve(root, 'reusable-base-lock.json'))) return ['scripts/verify.mjs', 'migration'];
  const lock = read(root, 'reusable-base-lock.json');
  const layout = lock.layout ?? 'multi-module';
  if (!['core', 'collaboration', 'demo'].includes(lock.profile)
      || !['multi-module', 'single-module'].includes(layout)) throw new Error('invalid generated migration verification layout');
  containedFile(root, 'scripts/reusable-layout-runtime.mjs');
  return ['scripts/reusable-layout-runtime.mjs', '--verify-migration'];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = { root: resolve(dirname(fileURLToPath(import.meta.url)), '..') };
    const names = { '--root': 'root', '--execution': 'path', '--environment': 'environmentId' };
    const seen = new Set();
    for (let index = 2; index < process.argv.length; index += 1) {
      const key = process.argv[index];
      if (seen.has(key)) throw new Error('duplicate argument');
      seen.add(key);
      if (key === '--execute') options.execute = true;
      else if (names[key] && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) options[names[key]] = process.argv[++index];
      else throw new Error('usage: --execution PATH --environment ID [--execute]');
    }
    process.stdout.write(`${JSON.stringify(executeAdoption(options), null, 2)}\n`);
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
