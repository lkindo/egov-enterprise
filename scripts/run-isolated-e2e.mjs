#!/usr/bin/env node
import { spawn, execFileSync } from 'node:child_process';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync, openSync, closeSync, readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync } from 'node:fs';
import { createServer } from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { assertOwnedDatabase, assertOwnedComposeRuntime } from './e2e-isolation.mjs';
import { validatePlaywrightResult } from './playwright-result-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontend = path.join(root, 'frontend');
const require = createRequire(path.join(frontend, 'package.json'));
const fail = message => new Error(`Isolated E2E: ${message}`);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export function closedEnvironment(source = process.env) {
  return Object.fromEntries(Object.entries(source).filter(([key]) =>
    /^(PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|HOME|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMDATA|JAVA_HOME|GRADLE_USER_HOME|CI|GITHUB_ACTIONS|GITHUB_RUN_ID|GITHUB_RUN_ATTEMPT|PLAYWRIGHT_BROWSERS_PATH|PLAYWRIGHT_JSON_OUTPUT_FILE|PLAYWRIGHT_HTML_OUTPUT_DIR|DOCKER_CONFIG|DOCKER_CONTEXT)$/i.test(key)));
}

export function assertNoDotEnv(directory) {
  // Check names only. Never parse or temporarily rename another user's environment files.
  if (readdirSync(directory).some(name => /^\.env(?:$|\.(?!example$|sample$|template$))/.test(name))) {
    throw fail('environment files are present; use a clean isolated worktree.');
  }
}

export function assertBuildTarget(routes, apiUrl) {
  const rewrites = Array.isArray(routes.rewrites) ? routes.rewrites : Object.values(routes.rewrites ?? {}).flat();
  const expected = new Map([
    ['/api/v1/:path*', `${apiUrl}/:path*`],
    ['/actuator/:path*', `${apiUrl.replace(/api\/v1$/, '')}actuator/:path*`],
    ['/ws/:path*', `${apiUrl.replace(/api\/v1$/, '')}ws/:path*`],
  ]);
  if (rewrites.length !== expected.size || new Set(rewrites.map(rule => rule.source)).size !== expected.size) {
    throw fail('production rewrites contain an unexpected or duplicate target.');
  }
  for (const [source, destination] of expected) {
    if (!rewrites.some(rule => rule.source === source && rule.destination === destination)) throw fail('production rewrites do not match the owned API.');
  }
}

async function freePort(preferred = 0) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(fail('requested port is already in use; no existing process was stopped.')));
    server.listen(preferred, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
  });
}

export async function main(arguments_ = process.argv.slice(2)) {
  const ciCompose = arguments_[0] === '--ci-compose';
  const coverage = arguments_[0] === '--coverage';
  const options = ciCompose || coverage ? arguments_.slice(1) : arguments_;
  if (options.length && options[0] !== '--') throw fail('use [--ci-compose | --coverage] -- <Playwright test arguments>.');
  const testArguments = options.slice(1);
  assertNoDotEnv(root); assertNoDotEnv(frontend);
  const clean = closedEnvironment();
  const docker = args => execFileSync('docker', args, { env: clean, encoding: 'utf8', windowsHide: true,
    timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });
  const context = JSON.parse(docker(['context', 'inspect']))[0];
  if (!/^(npipe:\/\/|unix:\/\/)/.test(context?.Endpoints?.docker?.Host ?? '')) throw fail('a local Docker daemon is required.');
  const runId = randomBytes(12).toString('hex');
  const output = path.join(root, 'build', 'isolated-e2e', runId);
  mkdirSync(output, { recursive: true, mode: 0o700 });
  const manifestFile = path.join(output, 'runtime.json');
  const manifest = { version: 1, runId, token: randomBytes(32).toString('hex'), createdAt: Date.now(), databaseId: '' };
  const databaseName = `egov-e2e-${runId}`;
  let ownedDatabase = false;
  let api;
  let web;
  let control;
  let ready = false;
  let aborted = false;
  let verifyRuntime;
  const children = new Set();
  const assertActive = () => { if (aborted) throw fail('run was cancelled.'); };
  const launch = (name, command, args, cwd, environment, outputFile) => {
    assertActive();
    const log = openSync(outputFile ?? path.join(output, `${name}.log`), 'w', 0o600);
    const child = spawn(command, args, { cwd, env: environment, windowsHide: true,
      detached: process.platform !== 'win32', stdio: ['ignore', log, log] });
    closeSync(log);
    children.add(child);
    child.on('error', () => { /* run/waitReady reports a bounded failure without raw environment */ });
    return child;
  };
  const run = async (name, command, args, cwd, environment, outputFile) => {
    const child = launch(name, command, args, cwd, environment, outputFile);
    await new Promise((resolve, reject) => {
      child.once('error', () => reject(fail(`${name} could not start.`)));
      child.once('exit', code => code === 0 ? resolve() : reject(fail(`${name} failed; inspect its private run log.`)));
    });
  };
  const inspect = id => JSON.parse(docker(['inspect', id]))[0];
  const isAlive = child => child?.pid && child.exitCode === null && child.signalCode === null;
  const waitReady = async (url, child, timeout = 180000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      assertActive();
      if (child && !isAlive(child)) throw fail('owned application process exited during startup.');
      try { if ((await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(2000) })).ok) return; } catch { /* bounded readiness retry */ }
      await pause(500);
    }
    throw fail('owned application readiness deadline exceeded.');
  };
  const stopChild = async child => {
    if (!isAlive(child)) return;
    const ended = new Promise(resolve => child.once('exit', resolve));
    // Target only a child created by this run, including its browser/build workers.
    if (process.platform === 'win32') {
      try { execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', timeout: 15000 }); }
      catch { if (isAlive(child)) child.kill(); }
    } else {
      try { process.kill(-child.pid, 'SIGTERM'); } catch { if (isAlive(child)) child.kill(); }
    }
    await Promise.race([ended, pause(10000)]);
    if (isAlive(child)) {
      try { process.kill(process.platform === 'win32' ? child.pid : -child.pid, 'SIGKILL'); } catch { /* already exited */ }
      await Promise.race([ended, pause(5000)]);
    }
  };
  let abortCleanup;
  const abort = () => { aborted = true; ready = false; abortCleanup = Promise.all([...children].map(stopChild)); };
  process.once('SIGINT', abort); process.once('SIGTERM', abort);
  try {
    let jwtSecret;
    let apiPort;
    const webPort = await freePort(ciCompose ? 3001 : 0);
    const webUrl = `http://127.0.0.1:${webPort}`;
    if (ciCompose) {
      const environment = { ...clean, COMPOSE_PROJECT_NAME: process.env.COMPOSE_PROJECT_NAME };
      const ids = service => docker(['ps', '-q', '--filter', `label=com.docker.compose.project=${environment.COMPOSE_PROJECT_NAME}`,
        '--filter', `label=com.docker.compose.service=${service}`]).trim().split(/\s+/).filter(Boolean);
      const databaseIds = ids('db'); const apiIds = ids('api');
      if (databaseIds.length !== 1 || apiIds.length !== 1) throw fail('CI must own exactly one database and API container.');
      verifyRuntime = () => {
        const database = inspect(databaseIds[0]); const apiContainer = inspect(apiIds[0]);
        const networkName = Object.keys(database.NetworkSettings.Networks ?? {})[0];
        const volume = JSON.parse(docker(['volume', 'inspect', `${environment.COMPOSE_PROJECT_NAME}-database`]))[0];
        const network = JSON.parse(docker(['network', 'inspect', networkName]))[0];
        return assertOwnedComposeRuntime(database, apiContainer, volume, network, environment);
      };
      const runtime = verifyRuntime();
      manifest.databaseId = runtime.databaseId;
      jwtSecret = runtime.jwtSecret;
      apiPort = 8080;
    } else {
      const java = clean.JAVA_HOME ? path.join(clean.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
      console.log('Building the backend for a fresh isolated E2E runtime.');
      await run('backend-build', java, ['-classpath', path.join(root, 'gradle/wrapper/gradle-wrapper.jar'),
        'org.gradle.wrapper.GradleWrapperMain', ':api-server:bootJar', '--no-daemon'], root, clean);
      const jars = readdirSync(path.join(root, 'api-server/build/libs')).filter(name => name.endsWith('.jar') && !name.endsWith('-plain.jar'));
      if (jars.length !== 1) throw fail('exactly one bootJar is required.');
      const password = randomBytes(24).toString('hex');
      assertActive();
      // Only a brand-new container with tmpfs storage; no existing name/volume is reused.
      manifest.databaseId = execFileSync('docker', ['run', '-d', '--rm', '--name', databaseName,
        '--label', 'egov.task=isolated-e2e', '--label', `egov.e2e.run=${runId}`,
        '--tmpfs', '/var/lib/postgresql/data:rw', '-p', '127.0.0.1::5432',
        '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_DB=authz_e2e', '-e', 'POSTGRES_USER=egov', 'postgres:17-alpine'],
      { env: { ...clean, POSTGRES_PASSWORD: password }, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
      ownedDatabase = true;
      verifyRuntime = () => assertOwnedDatabase(inspect(manifest.databaseId), manifest);
      const databasePort = verifyRuntime();
      const deadline = Date.now() + 60000;
      while (true) {
        assertActive();
        try { docker(['exec', manifest.databaseId, 'pg_isready', '-U', 'egov', '-d', 'authz_e2e']); break; }
        catch { if (Date.now() > deadline) throw fail('database readiness deadline exceeded.'); await pause(500); }
      }
      apiPort = await freePort();
      jwtSecret = randomBytes(48).toString('hex');
      const apiEnvironment = { ...clean, SPRING_PROFILES_ACTIVE: 'e2e',
        DB_URL: `jdbc:postgresql://127.0.0.1:${databasePort}/authz_e2e`, DB_USERNAME: 'egov', DB_PASSWORD: password,
        SERVER_ADDRESS: '127.0.0.1', SERVER_PORT: String(apiPort), JWT_SECRET: jwtSecret,
        CORS_ALLOWED_ORIGINS: webUrl,
        JWT_ACCESS_TOKEN_VALIDITY_MS: '21600000', ALGORITHM_KEY: randomBytes(24).toString('hex'),
        NURI_AUTHORIZATION_ISOLATED_CUTOVER: 'true', NURI_AUTHORIZATION_DISPOSABLE_DATABASE_ACK: 'CONFIRMED_DISPOSABLE_AUTHZ_DATABASE',
        GLOBALS_FILE_STOREPATH: path.join(output, 'uploads'), NURI_LOG_RETENTION_ENABLED: 'false', NURI_ATTACHMENT_INTEGRITY_ENABLED: 'false' };
      api = launch('backend', java, ['-jar', path.join(root, 'api-server/build/libs', jars[0]),
        '--spring.config.location=classpath:/'], output, apiEnvironment);
    }
    const apiUrl = `http://127.0.0.1:${apiPort}/api/v1`;
    await waitReady(`http://127.0.0.1:${apiPort}/actuator/health`, api);
    const environment = { ...clean, NODE_ENV: 'production', NODE_OPTIONS: '--max-old-space-size=8192',
      NEXT_PUBLIC_API_URL: apiUrl, BACKEND_API_URL: `${apiUrl}/`, BACKEND_ACTUATOR_URL: `http://127.0.0.1:${apiPort}/actuator`,
      NEXT_PUBLIC_WEB_URL: webUrl, JWT_SECRET: jwtSecret, NEXT_PUBLIC_APP_ENV: 'test', TRUSTED_EDGE_PROXY: '',
      ALLOW_INSECURE_LOOPBACK_AUTH_COOKIE: 'true',
      E2E_ISOLATION_MANIFEST: manifestFile, NO_PROXY: '127.0.0.1,localhost' };
    const next = require.resolve('next/dist/bin/next');
    if (!ciCompose) {
      console.log('Building the frontend against the owned API.');
      await run('frontend-build', process.execPath, coverage ? [path.join(frontend, 'scripts/build-instrumented.js')] : [next, 'build'], frontend, environment);
    }
    assertBuildTarget(JSON.parse(readFileSync(path.join(frontend, '.next/routes-manifest.json'), 'utf8')), apiUrl);
    web = launch('frontend', process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', String(webPort)], frontend, environment);
    await waitReady(`${webUrl}/login`, web);
    control = createServer((request, response) => {
      const actualToken = Buffer.from(request.headers.authorization ?? '');
      const expectedToken = Buffer.from(`Bearer ${manifest.token}`);
      try {
        if (request.method !== 'POST' || request.url !== '/verify' || !ready || !isAlive(web) || (!ciCompose && !isAlive(api))
            || actualToken.length !== expectedToken.length || !timingSafeEqual(actualToken, expectedToken)) throw fail('owner is unavailable.');
        verifyRuntime();
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ready: true, runId, databaseId: manifest.databaseId }));
      } catch { response.writeHead(403); response.end('{"ready":false}'); }
    });
    await new Promise(resolve => control.listen(0, '127.0.0.1', resolve));
    Object.assign(manifest, { apiUrl, webUrl, controlUrl: `http://127.0.0.1:${control.address().port}/verify` });
    writeFileSync(manifestFile, JSON.stringify(manifest), { flag: 'wx', mode: 0o600 });
    ready = true;
    console.log(`Running Playwright on the owned disposable runtime (${runId}).`);
    const inventoryPath = ciCompose ? '/tmp/e2e-inventory.json' : path.join(output, 'inventory.json');
    const reportPath = ciCompose ? '/tmp/e2e-results.json' : path.join(output, 'results.json');
    const selection = testArguments.filter((arg, index, args) => !arg.startsWith('--reporter=') && arg !== '--reporter' && args[index - 1] !== '--reporter');
    await run('discovery', process.execPath, [require.resolve('@playwright/test/cli'), 'test', ...selection, '--list', '--reporter=json'], frontend,
      { ...environment, PLAYWRIGHT_JSON_OUTPUT_FILE: inventoryPath });
    let executionFailure;
    try {
      await run('playwright', process.execPath, [require.resolve('@playwright/test/cli'), 'test', ...selection,
        `--reporter=${ciCompose ? 'blob,line,json' : 'line,json'}`], frontend,
      { ...environment, PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath });
    } catch (error) { executionFailure = error; }
    // CI invokes the same result contract explicitly in its required step.
    if (!ciCompose) {
      const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
      const report = JSON.parse(readFileSync(reportPath, 'utf8'));
      const planned = new Set();
      const visit = suites => { for (const suite of suites) {
        for (const spec of suite.specs ?? []) if (spec.file.endsWith('.spec.ts')) planned.add(`e2e/${spec.file.replaceAll('\\', '/')}`);
        if (suite.suites) visit(suite.suites);
      } };
      visit(inventory.suites);
      const result = validatePlaywrightResult(report, [...planned], { cwd: frontend, inventory, platform: process.platform });
      console.log(`E2E result: ${result.summary?.expected ?? 0} expected, ${result.summary?.skipped ?? 0} platform skips, ${result.summary?.flaky ?? 0} flaky.`);
      if (result.errors.length) throw fail(`result contract failed: ${result.errors.join('; ')}`);
    }
    if (executionFailure) throw executionFailure;
  } finally {
    console.log(`E2E evidence: ${path.relative(root, output).replaceAll('\\', '/')}`);
    ready = false;
    if (existsSync(manifestFile)) unlinkSync(manifestFile);
    if (control) await new Promise(resolve => control.close(resolve));
    await Promise.all([...children].map(stopChild));
    if (abortCleanup) await abortCleanup;
    if (ownedDatabase) { assertOwnedDatabase(inspect(manifest.databaseId), manifest); docker(['stop', manifest.databaseId]); }
    process.removeListener('SIGINT', abort); process.removeListener('SIGTERM', abort);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message?.startsWith('Isolated E2E:') ? error.message : 'Isolated E2E failed; inspect private run evidence.'); process.exitCode = 1; });
}
