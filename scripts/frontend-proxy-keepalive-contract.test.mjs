// GAP-FE-002 / DEC-OPS-333 — 유휴 연결은 서버보다 클라이언트가 먼저 닫아야 한다.
//
// (A) Next 16 rewrite 프록시(httpxy)는 timeout 없는 keep-alive Agent 를 쓰고 주입할 수 없다. Node 22 Agent 는 자기 timeout 이
//     0 이면 서버의 `Keep-Alive: timeout=20` 힌트를 무시하므로 유휴 소켓이 Tomcat(20초)보다 오래 풀에 남는다 — 클라이언트 유휴 수명이
//     서버보다 길다. 그래서 유휴 재사용 자체를 없앤다: 미들웨어(frontend/src/proxy.ts)가 `Connection: close` 를 싣는다.
// (B) Playwright 요청 컨텍스트도 timeout 없는 keep-alive Agent 를 컨텍스트 수명 동안 쓰고, Next 서버의 기본 유휴 수명은 5초(+1초 버퍼)다.
//     격리 E2E 러너가 `next start --keepAliveTimeout` 으로 서버 유휴 수명을 클라이언트가 유휴일 수 있는 최대 시간보다 길게 둔다.
//
// 이 계약은 두 불변식을 고정한다. 값을 바꾸거나 배선을 끊으면 red 다(아래 변이 시험).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { createRequire } from 'node:module';
import { E2E_WEB_KEEP_ALIVE_TIMEOUT_MS, frontendStartArguments } from './run-isolated-e2e.mjs';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const sources = () => ({
  proxy: read('frontend/src/proxy.ts'),
  runner: read('scripts/run-isolated-e2e.mjs'),
  ci: read('.github/workflows/ci.yml'),
});

function e2eJobTimeoutMs(ci) {
  const job = ci.match(/^  e2e-tests:\n([\s\S]*?)(?=^  [a-zA-Z0-9_-]+:)/mu)?.[1];
  assert.ok(job, 'ci.yml must define the e2e-tests job');
  const minutes = job.match(/^    timeout-minutes: (\d+)$/mu)?.[1];
  assert.ok(minutes, 'the e2e-tests job must declare timeout-minutes');
  return Number(minutes) * 60_000;
}

function assertWiring({ proxy, runner, ci }) {
  // (A) 프록시 대상 경로 분기가 업그레이드가 아닌 요청에 Connection: close 를 싣고, 그 헤더를 요청 덮어쓰기로 넘긴다.
  const branch = proxy.match(/if \(pathname\.startsWith\('\/api\/v1'\)[^\n]*\) \{\n([\s\S]*?)\n  \}\n/u)?.[1];
  assert.ok(branch, 'proxy.ts must keep the /api/v1·/actuator·/ws header-injection branch');
  assert.match(branch, /if \(!isUpgradeRequest\(requestHeaders\)\) requestHeaders\.set\('Connection', 'close'\);/u);
  assert.match(branch, /return NextResponse\.next\(\{ request: \{ headers: requestHeaders \} \}\);/u);
  assert.ok(branch.indexOf("set('Connection', 'close')") < branch.indexOf('return NextResponse.next'));
  assert.match(proxy, /function isUpgradeRequest\(headers: Headers\): boolean \{\n  return headers\.has\('upgrade'\) \|\| \/\(\?:\^\|,\)\\s\*upgrade\\s\*\(\?:\$\|,\)\/i\.test\(headers\.get\('connection'\) \?\? ''\);\n\}/u);
  // (B) 러너는 항상 서버 유휴 수명을 인자로 넘기고, 그 값이 e2e 잡이 살아 있을 수 있는 최대 시간보다 길다.
  assert.match(runner, /web = launch\('frontend', process\.execPath, frontendStartArguments\(next, webPort\), frontend, environment\);/u);
  assert.ok(E2E_WEB_KEEP_ALIVE_TIMEOUT_MS > e2eJobTimeoutMs(ci),
    `server keep-alive ${E2E_WEB_KEEP_ALIVE_TIMEOUT_MS}ms must exceed the e2e job limit ${e2eJobTimeoutMs(ci)}ms (client idle < server idle)`);
  const args = frontendStartArguments('next', 3001);
  assert.equal(args[args.indexOf('--keepAliveTimeout') + 1], String(E2E_WEB_KEEP_ALIVE_TIMEOUT_MS));
}

test('rewrite 프록시 요청은 Connection: close 를 싣고 격리 E2E 의 Next 서버는 클라이언트보다 오래 유휴를 유지한다', () => {
  assertWiring(sources());
});

test('배선을 끊거나 값을 줄이면 red 다', () => {
  const base = sources();
  const ciMinutes = e2eJobTimeoutMs(base.ci) / 60_000;
  for (const [name, mutate] of [
    ['close 헤더 제거', s => ({ ...s, proxy: s.proxy.replace("if (!isUpgradeRequest(requestHeaders)) requestHeaders.set('Connection', 'close');", '') })],
    ['업그레이드 예외 제거', s => ({ ...s, proxy: s.proxy.replace("if (!isUpgradeRequest(requestHeaders)) requestHeaders.set", "requestHeaders.set") })],
    ['덮어쓰기 전달 제거', s => ({ ...s, proxy: s.proxy.replace("return NextResponse.next({ request: { headers: requestHeaders } });\n  }\n\n  // 2-a.", "return NextResponse.next();\n  }\n\n  // 2-a.") })],
    ['러너 인자 배선 제거', s => ({ ...s, runner: s.runner.replace('process.execPath, frontendStartArguments(next, webPort), frontend', "process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', String(webPort)], frontend") })],
    ['e2e 잡 한도가 서버 유휴 수명을 넘김', s => ({ ...s, ci: s.ci.replace(new RegExp(`(  e2e-tests:\\n[\\s\\S]*?    timeout-minutes: )${ciMinutes}\\n`, 'u'), '$1600\n') })],
  ]) {
    assert.throws(() => assertWiring(mutate(base)), undefined, name);
  }
});

// 설치된 Next 의 실제 rewrite 함수(proxyRequest)로 백엔드 연결 재사용을 잰다 — 헤더 한 줄이 소켓 재사용을 없앤다는 것의 직접 증거다.
const { proxyRequest } = createRequire(new URL('../frontend/package.json', import.meta.url))('next/dist/server/lib/router-utils/proxy-request.js');
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = server => new Promise(resolve => { server.closeAllConnections(); server.close(() => resolve()); });

async function upstreamConnections(connection) {
  const seen = [];
  const backend = createServer((req, res) => { seen.push({ port: req.socket.remotePort, connection: req.headers.connection }); res.end('{}'); });
  backend.keepAliveTimeout = 20_000; // Tomcat 기본 유휴 수명
  const backendPort = await listen(backend);
  const front = createServer((req, res) => {
    req.headers.connection = connection; // Next 가 미들웨어의 덮어쓰기를 적용한 뒤의 요청 헤더
    proxyRequest(req, res, { protocol: 'http:', hostname: '127.0.0.1', port: String(backendPort), pathname: '/api/v1/probe', query: {} },
      undefined, undefined, 30_000).catch(() => undefined);
  });
  const frontPort = await listen(front);
  const call = () => new Promise((resolve, reject) => {
    httpRequest({ host: '127.0.0.1', port: frontPort, path: '/api/v1/probe' }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); })
      .on('error', reject).end();
  });
  try {
    assert.equal(await call(), 200);
    assert.equal(await call(), 200);
    return seen;
  } finally {
    await close(front);
    await close(backend);
  }
}

test('대조: keep-alive 요청이면 설치된 rewrite 프록시가 백엔드 연결을 다시 쓴다 — 유휴 경합의 전제', async () => {
  const seen = await upstreamConnections('keep-alive');
  assert.equal(seen.length, 2);
  assert.equal(new Set(seen.map(entry => entry.port)).size, 1);
});

test('Connection: close 요청이면 요청마다 새 연결을 맺어 다시 쓸 유휴 소켓이 없다', async () => {
  const seen = await upstreamConnections('close');
  assert.equal(seen.length, 2);
  assert.equal(new Set(seen.map(entry => entry.port)).size, 2);
  assert.ok(seen.every(entry => entry.connection === 'close'));
});

test('설치된 next start 는 --keepAliveTimeout 을 서버 keepAliveTimeout 으로 적용한다', () => {
  const next = createRequire(new URL('../frontend/package.json', import.meta.url));
  const cli = readFileSync(next.resolve('next/dist/bin/next'), 'utf8');
  const server = readFileSync(next.resolve('next/dist/server/lib/start-server.js'), 'utf8');
  assert.match(cli, /--keepAliveTimeout <keepAliveTimeout>/u);
  assert.match(server, /if \(keepAliveTimeout\) \{\s*server\.keepAliveTimeout = keepAliveTimeout;/u);
});
