import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { request } from 'node:http';
import { win32 } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { browserCommand, parseArguments, startSimulationServer } from './serve.mjs';

const script = fileURLToPath(new URL('./serve.mjs', import.meta.url));
const close = server => new Promise((resolveClose, reject) => {
  server.close(error => error ? reject(error) : resolveClose());
  server.closeAllConnections();
});
function get(port, path = '/', method = 'GET', headers = {}) {
  return new Promise((resolveResponse, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method, headers, agent: false }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolveResponse({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}
function childResult(args) {
  return new Promise((resolveChild, reject) => {
    const child = spawn(process.execPath, args, { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Child process did not exit.')); }, 5_000);
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); resolveChild({ code, stdout, stderr }); });
  });
}

test('only fixed simulator assets are served on loopback with restrictive headers', async t => {
  const server = await startSimulationServer({ port: 0 });
  t.after(() => close(server));
  const { port, address } = server.address();
  assert.equal(address, '127.0.0.1');
  for (const [path, name, type] of [
    ['/', 'index.html', 'text/html'], ['/index.html', 'index.html', 'text/html'],
    ['/app.js', 'app.js', 'text/javascript'], ['/styles.css', 'styles.css', 'text/css'],
    ['/fonts/PretendardVariable.woff2', 'fonts/PretendardVariable.woff2', 'font/woff2'],
  ]) {
    const response = await get(port, path);
    assert.equal(response.status, 200, path);
    assert.deepEqual(response.body, await readFile(new URL(name, import.meta.url)));
    assert.ok(response.headers['content-type'].startsWith(type));
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['x-frame-options'], 'DENY');
    assert.match(response.headers['content-security-policy'], /connect-src 'none'/);
    assert.match(response.headers['content-security-policy'], /font-src 'self'/);
    assert.match(response.headers['content-security-policy'], /frame-ancestors 'none'/);
    assert.doesNotMatch(response.headers['content-security-policy'], /unsafe-inline|unsafe-eval/);
    assert.equal(response.headers['access-control-allow-origin'], undefined);
    const head = await get(port, path, 'HEAD');
    assert.equal(head.status, 200);
    assert.equal(head.headers['content-type'], response.headers['content-type']);
    assert.equal(head.body.length, 0);
    assert.equal(Number(head.headers['content-length']), response.body.length);
  }
});

test('files, traversal, query-based paths, API routes and mutation methods are denied', async t => {
  const server = await startSimulationServer({ port: 0 });
  t.after(() => close(server));
  const { port } = server.address();
  for (const path of ['/serve.mjs', '/serve.test.mjs', '/styles.input.css', '/.env', '/AGENTS.md', '/api/load',
    '/../index.html', '/%2e%2e/index.html', '/%69ndex.html', '//index.html', '/index.html?file=.env', '/C:/Windows/win.ini',
    '/fonts/', '/fonts/Other.woff2', '/fonts/LICENSE', '/fonts/pretendardvariable.woff2',
    '/fonts/PretendardVariable.woff2?file=.env', '/fonts/../index.html', '/fonts/%2e%2e/index.html',
    '/fonts/%50retendardVariable.woff2', '/fonts%2fPretendardVariable.woff2', '//fonts/PretendardVariable.woff2']) {
    const response = await get(port, path);
    assert.equal(response.status, 404, path);
    assert.equal(response.headers['cache-control'], 'no-store');
  }
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']) {
    const response = await get(port, '/', method);
    assert.equal(response.status, 405, method);
    assert.equal(response.headers.allow, 'GET, HEAD');
  }
});

test('foreign, ambiguous and null origins or hosts cannot access the simulator', async t => {
  const server = await startSimulationServer({ port: 0 });
  t.after(() => close(server));
  const { port } = server.address();
  const localHost = `127.0.0.1:${port}`;
  for (const headers of [
    { Host: 'evil.example' }, { Host: `localhost:${port}` }, { Host: `127.0.0.1:${port + 1}` },
    { Origin: 'https://evil.example' }, { Origin: 'null' }, { Origin: `http://127.0.0.1:${port + 1}` },
    { 'Sec-Fetch-Site': 'cross-site' },
    ['Host', localHost, 'Host', localHost],
    ['Host', localHost, 'Origin', `http://${localHost}`, 'Origin', `http://${localHost}`],
  ]) assert.equal((await get(port, '/', 'GET', headers)).status, 403, JSON.stringify(headers));
  assert.equal((await get(port, '/', 'GET', { Origin: `http://${localHost}` })).status, 200);

  // A user's document/chat link may be cross-site, but it is not an embedded or scripted request.
  const navigation = { 'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document', 'Sec-Fetch-User': '?1' };
  for (const path of ['/', '/index.html']) {
    const response = await get(port, path, 'GET', navigation);
    assert.equal(response.status, 200, path);
    assert.match(response.headers['content-security-policy'], /frame-ancestors 'none'/);
  }
  for (const [path, method, headers] of [
    ['/', 'GET', { ...navigation, 'Sec-Fetch-Mode': 'cors' }],
    ['/', 'GET', { ...navigation, 'Sec-Fetch-Dest': 'iframe' }],
    ['/', 'GET', { ...navigation, 'Sec-Fetch-User': '?0' }],
    ['/', 'GET', { ...navigation, 'Sec-Fetch-User': '' }],
    ['/', 'GET', { ...navigation, Origin: `http://${localHost}` }],
    ['/', 'GET', { ...navigation, Origin: 'https://evil.example' }],
    ['/', 'GET', { ...navigation, Host: 'evil.example' }],
    ['/app.js', 'GET', navigation], ['/styles.css', 'GET', navigation],
    ['/fonts/PretendardVariable.woff2', 'GET', navigation],
    ['/api/load', 'GET', navigation], ['/index.html?file=.env', 'GET', navigation],
    ['/', 'HEAD', navigation], ['/', 'POST', navigation],
  ]) assert.equal((await get(port, path, method, headers)).status, 403, `${method} ${path} ${JSON.stringify(headers)}`);
});

test('CLI arguments stay bounded and do not echo unexpected values', () => {
  assert.deepEqual(parseArguments([]), { port: 8769, open: true });
  assert.deepEqual(parseArguments(['--port', '8791', '--no-open']), { port: 8791, open: false });
  for (const args of [['--port'], ['--port', '0'], ['--port', '65536'], ['--port', '1.5'],
    ['--port', '8700', '--port', '8701'], ['--root', 'sensitive-placeholder']]) {
    assert.throws(() => parseArguments(args), error => !error.message.includes('sensitive-placeholder'));
  }
});

test('Windows browser launch uses the absolute System32 rundll32, never a bare name searched from the current folder', () => {
  const url = 'http://127.0.0.1:8769/index.html#start';
  assert.deepEqual(browserCommand(url, { platform: 'win32', env: { SystemRoot: 'D:\\Win' } }), ['D:\\Win\\System32\\rundll32.exe', ['url.dll,FileProtocolHandler', url]]);
  for (const env of [{}, { SystemRoot: 'Windows' }, { SystemRoot: 'C:' }, { SystemRoot: '\\\\server\\share' }, { SystemRoot: 7 }]) {
    assert.deepEqual(browserCommand(url, { platform: 'win32', env }), ['C:\\Windows\\System32\\rundll32.exe', ['url.dll,FileProtocolHandler', url]], JSON.stringify(env));
  }
  const [command] = browserCommand(url, { platform: 'win32', env: process.env });
  assert.ok(win32.isAbsolute(command), command);
  assert.match(command, /\\System32\\rundll32\.exe$/i);
  assert.deepEqual(browserCommand(url, { platform: 'linux', env: {} }), ['xdg-open', [url]]);
});

test('import has no startup side effect; port conflicts fail clearly; close releases the port', async () => {
  const imported = await childResult(['--input-type=module', '-e', `await import(${JSON.stringify(new URL('./serve.mjs', import.meta.url).href)});`]);
  assert.equal(imported.code, 0);
  assert.equal(imported.stdout, '');
  const server = await startSimulationServer({ port: 0 });
  const { port } = server.address();
  try {
    const conflict = await childResult([script, '--port', String(port), '--no-open']);
    assert.equal(conflict.code, 1);
    assert.match(conflict.stderr, /포트를 이미 사용 중/);
    assert.equal(conflict.stdout, '');
    assert.equal((await get(port)).status, 200);
  } finally {
    await close(server);
  }
  const restarted = await startSimulationServer({ port });
  await close(restarted);
  await assert.rejects(get(port), { code: 'ECONNREFUSED' });
});

test('launcher --no-open starts a static-only server and terminates', async t => {
  const reservation = await startSimulationServer({ port: 0 });
  const { port } = reservation.address();
  await close(reservation);
  const child = spawn(process.execPath, [script, '--port', String(port), '--no-open'], { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill(); });
  const exited = once(child, 'exit');
  let stdout = '';
  await new Promise((ready, reject) => {
    const timer = setTimeout(() => reject(new Error('Launcher did not become ready.')), 5_000);
    child.stdout.on('data', data => {
      stdout += data;
      if (stdout.includes('종료: Ctrl+C')) { clearTimeout(timer); ready(); }
    });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', () => { clearTimeout(timer); reject(new Error('Launcher exited before readiness.')); });
  });
  assert.match(stdout, /정적 시뮬레이션 전용/);
  assert.ok(stdout.includes(`/index.html#start`));
  assert.equal((await get(port)).status, 200);
  child.kill('SIGTERM');
  await exited;
  await assert.rejects(get(port), { code: 'ECONNREFUSED' });
});
