#!/usr/bin/env node
// Explicit local integration entrypoint: node frontend/scripts/auth-alias-http.mjs
// Runs current Next routes/proxy/rewrites against a synthetic loopback backend. No DB or real credentials.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, symlink } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arguments_ = process.argv.slice(2);
if (arguments_.some(argument => argument !== '--without-aliases')) throw new Error('Unsupported auth HTTP fixture argument');
const withoutAliases = arguments_.includes('--without-aliases');
const aliasFiles = new Set(['login', 'reissue'].map(name => join(frontend, `src/app/api/v1/auth/${name}/route.ts`)));
const failures = [];
let checks = 0;
function check(condition, label) {
  checks += 1;
  if (!condition) failures.push(label);
}
function listen(server) {
  return new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolveListen(server.address().port));
  });
}
function close(server) {
  server.closeAllConnections();
  return new Promise(resolveClose => server.close(resolveClose));
}
async function unusedPort() {
  const reservation = createServer();
  const port = await listen(reservation);
  await close(reservation);
  return port;
}
async function stopOwnedChild(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    await new Promise(resolveStop => {
      const stop = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore', windowsHide: true,
      });
      stop.once('error', resolveStop);
      stop.once('exit', resolveStop);
    });
  } else {
    process.kill(-child.pid, 'SIGTERM');
  }
}

const grants = { groups: ['USER'], permissions: ['BOARD_READ'], authorizationVersion: 'fixture-v1' };
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const syntheticToken = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'fixture', exp: Math.floor(Date.now() / 1000) + 3600 })}.${randomBytes(16).toString('base64url')}`;
const syntheticRefresh = randomBytes(24).toString('hex');
const privateFailure = 'synthetic-upstream-detail-must-remain-private';
let authRequests = 0;
const backendPaths = [];
const backend = createServer(async (request, response) => {
  response.setHeader('content-type', 'application/json');
  const rawPath = new URL(request.url, 'http://127.0.0.1').pathname;
  let pathname;
  try { pathname = decodeURIComponent(rawPath); } catch {
    backendPaths.push({ rawPath, malformed: true });
    response.writeHead(400).end('{}');
    return;
  }
  backendPaths.push({ rawPath, decodedPath: pathname });
  if (pathname === '/api/v1/probe') {
    response.end(JSON.stringify({ probe: true, forwarded: request.headers.authorization === `Bearer ${syntheticToken}` }));
    return;
  }
  if (!['/api/v1/auth/login', '/api/v1/auth/reissue'].includes(pathname) || request.method !== 'POST') {
    response.writeHead(404).end('{}');
    return;
  }
  authRequests += 1;
  let raw = '';
  for await (const part of request) raw += part;
  const body = raw ? JSON.parse(raw) : {};
  const failureSelector = body.password || request.headers.cookie || '';
  const failureStatus = /fixture-(401|429|503)/.exec(failureSelector)?.[1];
  if (failureStatus) {
    response.writeHead(Number(failureStatus)).end(JSON.stringify({ success: false, message: privateFailure }));
    return;
  }
  response.setHeader('set-cookie', `refreshToken=${syntheticRefresh}; Path=/; HttpOnly; Secure; SameSite=Strict`);
  response.end(JSON.stringify({
    success: true, status: 200, code: 'SUCCESS', message: 'fixture', timestamp: '2026-09-27T00:00:00',
    data: { accessToken: syntheticToken, role: 'ROLE_USER', ...grants },
  }));
});

let child;
let fixtureRoot;
let startupLog = '';
const originalNextEnv = await readFile(join(frontend, 'next-env.d.ts'), 'utf8');
try {
  const backendPort = await listen(backend);
  const webPort = await unusedPort();
  // Next webpack derives relative entrypoints: Windows fixtures must share the dependency drive.
  const scratch = parse(tmpdir()).root.toLowerCase() === parse(frontend).root.toLowerCase()
    ? tmpdir() : resolve(frontend, '../.agent/temp');
  await mkdir(scratch, { recursive: true });
  fixtureRoot = await mkdtemp(join(scratch, 'egov-auth-alias-http-'));
  const fixtureFrontend = join(fixtureRoot, 'frontend');
  await mkdir(fixtureFrontend);
  // Copy current disk source, excluding environment files and generated build/cache artifacts.
  for (const name of ['src', 'scripts', 'next.config.ts', 'tsconfig.json', 'next-env.d.ts', 'package.json']) {
    await cp(join(frontend, name), join(fixtureFrontend, name), {
      recursive: true, filter: source => !withoutAliases || !aliasFiles.has(source),
    });
  }
  await symlink(join(frontend, 'node_modules'), join(fixtureFrontend, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const childEnv = Object.fromEntries(['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'HOME'].flatMap(key =>
    process.env[key] === undefined ? [] : [[key, process.env[key]]]));
  Object.assign(childEnv, {
    NODE_ENV: 'development', NODE_OPTIONS: '--max-old-space-size=4096', NEXT_TELEMETRY_DISABLED: '1',
    BACKEND_API_URL: `http://127.0.0.1:${backendPort}/api/v1`,
    NEXT_PUBLIC_API_URL: `http://127.0.0.1:${backendPort}/api/v1`,
  });
  child = spawn(process.execPath, [join(frontend, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(webPort)], {
    cwd: fixtureFrontend, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    detached: process.platform !== 'win32',
  });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { startupLog = (startupLog + chunk).slice(-12000); });
  const web = `http://127.0.0.1:${webPort}`;
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null) throw new Error('owned Next process exited before readiness');
    try {
      const response = await fetch(`${web}/api/v1/probe`, { signal: AbortSignal.timeout(1500) });
      if (response.ok && (await response.json()).probe === true) { ready = true; break; }
    } catch { /* compile/startup may still be in progress */ }
    await delay(500);
  }
  if (!ready) {
    // This process has only synthetic inputs and a sanitized environment. Do not print response bodies/cookies.
    console.error(startupLog.replaceAll(syntheticToken, '[redacted]').replaceAll(syntheticRefresh, '[redacted]'));
    throw new Error('owned Next HTTP readiness timed out');
  }
  const post = (base, name, status = 200, origin = web) => fetch(`${base}/${name}`, {
    method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(60000),
    headers: { 'content-type': 'application/json', origin, cookie: `refreshToken=fixture-${status}` },
    ...(decodeURIComponent(name) === 'login' ? { body: JSON.stringify({ userId: 'fixture', password: `fixture-${status}` }) } : {}),
  });
  for (const prefix of ['/api/auth', '/api/v1/auth']) {
    for (const name of ['login', 'reissue']) {
      const label = `${prefix}/${name}`;
      const response = await post(`${web}${prefix}`, name);
      const body = await response.text();
      const parsed = JSON.parse(body);
      check(response.status === 200, `${label}: success status`);
      check(parsed.success === true && parsed.data.authorizationVersion === grants.authorizationVersion, `${label}: display grants preserved`);
      check(!body.includes(syntheticToken) && !body.includes('accessToken') && !body.includes('refreshToken'), `${label}: no token in JavaScript response`);
      const cookies = response.headers.getSetCookie();
      const access = cookies.find(cookie => cookie.startsWith('accessToken=')) || '';
      check(access.startsWith(`accessToken=${syntheticToken};`) && /;\s*HttpOnly/i.test(access) && /;\s*Secure/i.test(access) && /;\s*SameSite=Strict/i.test(access), `${label}: protected access cookie`);
      check(cookies.some(cookie => cookie.startsWith(`refreshToken=${syntheticRefresh};`) && /;\s*HttpOnly/i.test(cookie)), `${label}: refresh cookie forwarded`);
      for (const status of [401, 429, 503]) {
        const failed = await post(`${web}${prefix}`, name, status);
        const failedBody = await failed.text();
        check(failed.status === (status === 503 ? 502 : status), `${label}: safe status for upstream ${status}`);
        check(!failedBody.includes(privateFailure), `${label}: private upstream ${status} detail hidden`);
        check(!failed.headers.getSetCookie().some(cookie => cookie.startsWith('accessToken=')), `${label}: no access cookie on ${status}`);
      }
      const beforeOrigin = authRequests;
      const forbidden = await post(`${web}${prefix}`, name, 200, 'https://untrusted.invalid');
      check(forbidden.status === 403 && authRequests === beforeOrigin, `${label}: origin rejected before upstream`);
      console.log(JSON.stringify({ route: label, checked: true }));
    }
  }
  const probe = await fetch(`${web}/api/v1/probe`, { headers: { cookie: `accessToken=${syntheticToken}` } });
  check((await probe.json()).forwarded === true, 'ordinary API rewrite and cookie authorization injection preserved');
  for (const name of ['login', 'reissue']) {
    const direct = await post(`http://127.0.0.1:${backendPort}/api/v1/auth`, name);
    check((await direct.json()).data.accessToken === syntheticToken, `direct backend ${name} token contract retained`);
  }
  // Next routing is real; this upstream decodes exactly once. Real Spring/firewall behavior is a separate check.
  const encodedAliasProbe = [];
  for (const path of [
    '/api/v1/auth/%6cogin', '/api/v1/auth/%72eissue', '/api/v1/%61uth/login',
    '/api/%76%31/auth/reissue', '/a%70i/v1/auth/login', '/api/v1/%61uth/%6Cogin',
    '/api/v1/auth/reissue%2f',
  ]) {
    const before = backendPaths.length;
    const encoded = await fetch(`${web}${path}`, { method: 'POST', signal: AbortSignal.timeout(60000) });
    const encodedBody = await encoded.text();
    const tokenExposed = encodedBody.includes(syntheticToken);
    encodedAliasProbe.push({ route: path, status: encoded.status, tokenExposed, upstream: backendPaths.slice(before) });
    check(encoded.status === 400 && !tokenExposed && backendPaths.length === before, `${path}: encoded token endpoint blocked before rewrite`);
  }
  const decodeDiagnostics = [];
  for (const path of ['/api/v1/auth/%2572eissue', '/api/v1/%2561uth/login', '/api/v1/auth/%ZZreissue']) {
    const before = backendPaths.length;
    const response = await fetch(`${web}${path}`, { method: 'POST', signal: AbortSignal.timeout(60000) });
    const body = await response.text();
    decodeDiagnostics.push({ route: path, status: response.status, tokenExposed: body.includes(syntheticToken), upstream: backendPaths.slice(before) });
    check(!body.includes(syntheticToken), `${path}: one-decode fixture does not expose a token`);
  }
  check(await readFile(join(frontend, 'next-env.d.ts'), 'utf8') === originalNextEnv, 'original next-env WIP preserved');
  console.log(JSON.stringify({ checks, failures, fixtureRoot, withoutAliases, encodedAliasProbe, decodeDiagnostics }));
  if (failures.length) process.exitCode = 1;
} catch (error) {
  console.error(startupLog.replaceAll(syntheticToken, '[redacted]').replaceAll(syntheticRefresh, '[redacted]'));
  console.error(JSON.stringify({ error: error.message, fixtureRoot }));
  process.exitCode = 1;
} finally {
  await stopOwnedChild(child);
  await close(backend);
}
