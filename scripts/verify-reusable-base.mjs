#!/usr/bin/env node
/** Generates and validates a new profile in an owned disposable PostgreSQL container. */
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommand, verifyReusableArtifact } from './verify-reusable-artifact.mjs';

export async function verifyReusableBase({ root, profile, run = runCommand, verify = verifyReusableArtifact } = {}) {
  if (!['core', 'collaboration', 'demo'].includes(profile)) throw new Error('profile must be core, collaboration or demo');
  root = resolve(root);
  const token = randomBytes(8).toString('hex');
  const name = `egov-profile-verify-${token}`;
  const label = 'egov.reusable-verification';
  const output = resolve(root, `build/reusable-base/source/verified-${profile}-${token}`);
  const database = resolve(root, `build/reusable-base/verified-${profile}-${token}-db`);
  const docker = (args, options = {}) => run('docker', args, { root, capture: true, ...options });
  let container;
  try {
    // No ports and no persistent/shared volumes. Password goes through the child environment only.
    container = docker(['run', '--detach', '--name', name, '--label', `${label}=${token}`,
      '--env', 'POSTGRES_USER=verify', '--env', 'POSTGRES_DB=verify', '--env', 'POSTGRES_PASSWORD', 'postgres:17-alpine'],
    { env: { ...process.env, POSTGRES_PASSWORD: randomBytes(32).toString('hex') } }).trim();
    if (!/^[a-f0-9]{64}$/.test(container)) throw new Error('Docker did not return a container identity');
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try { docker(['exec', container, 'pg_isready', '-U', 'verify', '-d', 'verify']); ready = true; break; }
      catch { await new Promise(resolve => setTimeout(resolve, 500)); }
    }
    if (!ready) throw new Error('isolated PostgreSQL readiness failed');
    const generate = (script, args) => run('node', [`scripts/${script}`, '--profile', profile, ...args,
      '--allow-dirty', '--allow-non-release-ref'], { root });
    generate('generate-reusable-base-db.mjs', ['--container', name, '--output', database]);
    generate('generate-reusable-base-source.mjs', ['--db-bundle', database, '--output', output]);
    const lock = JSON.parse(readFileSync(resolve(output, 'reusable-base-lock.json'), 'utf8'));
    if (lock.profile !== profile) throw new Error('producer returned a different profile');
    if (process.platform !== 'win32') chmodSync(resolve(output, 'gradlew'), 0o755);
    run('npm', ['ci', '--ignore-scripts'], { root: output });
    run('pnpm', ['-C', 'frontend', 'install', '--frozen-lockfile'], { root: output });
    const report = verify({ root: output });
    const reports = resolve(root, 'build/reports/reusable-base');
    mkdirSync(reports, { recursive: true });
    writeFileSync(resolve(reports, `${profile}.json`), `${JSON.stringify({ ...report, artifact: output }, null, 2)}\n`);
    return report;
  } finally {
    if (container && /^[a-f0-9]{64}$/.test(container)) {
      const owned = docker(['inspect', '--format', `{{ index .Config.Labels "${label}" }}`, container]).trim();
      if (owned !== token) throw new Error('container ownership changed; refusing cleanup');
      docker(['rm', '--force', container]);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 4 || process.argv[2] !== '--profile') throw new Error('usage: --profile core|collaboration|demo');
    await verifyReusableBase({ root: resolve(dirname(fileURLToPath(import.meta.url)), '..'), profile: process.argv[3] });
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
