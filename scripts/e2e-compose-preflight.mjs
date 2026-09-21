import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertCiProject, validateComposePlan } from './e2e-isolation.mjs';

const failure = () => new Error('E2E Compose preflight rejected an unverified target.');

try {
  if (process.argv.length !== 2) throw failure();
  assertCiProject(process.env);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const expectedFiles = ['docker-compose.yml', 'docker-compose.authz-e2e.yml'].join(path.delimiter);
  if (process.env.COMPOSE_FILE !== expectedFiles || process.env.COMPOSE_ENV_FILES || process.env.DOCKER_HOST
      || process.env.COMPOSE_PATH_SEPARATOR || process.env.COMPOSE_PROFILES) throw failure();
  for (const directory of [root, path.join(root, 'frontend')]) {
    if (readdirSync(directory).some(name => /^\.env(?:$|\.(?!example$|sample$|template$))/.test(name))) throw failure();
  }
  const environment = { ...process.env, COMPOSE_DISABLE_ENV_FILE: 'true' };
  const options = { cwd: root, env: environment, encoding: 'utf8', windowsHide: true,
    timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] };
  const context = JSON.parse(execFileSync('docker', ['context', 'inspect'], options))[0];
  if (!/^(npipe:\/\/|unix:\/\/)/.test(context?.Endpoints?.docker?.Host ?? '')) throw failure();
  // --no-env-resolution prevents reading service env_file contents; the plan rejects env_file itself.
  const plan = JSON.parse(execFileSync('docker', ['compose', 'config', '--no-env-resolution', '--format', 'json', 'db', 'api'], options));
  const images = JSON.parse(execFileSync('docker', ['image', 'inspect', '--', plan.services.api.image], options));
  if (!Array.isArray(images) || images.length !== 1) throw failure();
  const [apiImage] = images;
  validateComposePlan(plan, environment, apiImage);
  console.log('E2E Compose preflight passed; disposable datasource and resources verified before startup.');
} catch {
  // Rendered configuration and Docker errors may contain credentials. Never print either.
  console.error('E2E Compose preflight failed; no application startup was authorized.');
  process.exitCode = 1;
}
