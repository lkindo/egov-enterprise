#!/usr/bin/env node
import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { once } from 'node:events';
import { createRequirementsStore } from './store.mjs';
import { createRequirementsEngine, initialRequirementsMetadata, validateRequirementsMetadata } from './engine.mjs';
import { createEmptyBacklogPack, loadRepositoryContextSnapshot, validateBacklogPack } from '../../scripts/export-deliverables-workspace.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const STATIC = {
  '/': ['index.html', 'text/html;charset=utf-8'], '/index.html': ['index.html', 'text/html;charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript;charset=utf-8'], '/styles.css': ['styles.css', 'text/css;charset=utf-8'],
  '/tokens.css': ['tokens.css', 'text/css;charset=utf-8'], '/fonts/PretendardVariable.woff2': ['fonts/PretendardVariable.woff2', 'font/woff2'],
};
const fail = (code, status = 400) => { throw Object.assign(new Error(code), { code, status }); };
const equal = (a, b) => typeof a === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const json = (response, status, value) => { response.writeHead(status, { 'Content-Type': 'application/json;charset=utf-8' }); response.end(JSON.stringify(value)); };
function secureHeaders(response) {
  for (const [name, value] of Object.entries({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'Cross-Origin-Resource-Policy': 'same-origin', 'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; font-src 'self'; img-src 'self' data:; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'" })) response.setHeader(name, value);
}
async function readBody(request) {
  if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers['content-type'] ?? '')) fail('CONTENT_TYPE_REQUIRED', 415);
  const maximum = 4 * 1024 ** 2;
  if (request.headers['content-encoding'] || Number(request.headers['content-length'] ?? 0) > maximum) { request.resume(); fail('BODY_TOO_LARGE', 413); }
  let bytes = 0; const chunks = [];
  for await (const chunk of request) { bytes += chunk.length; if (bytes > maximum) fail('BODY_TOO_LARGE', 413); chunks.push(chunk); }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); } catch { fail('INVALID_JSON'); }
}
const messages = {
  SESSION_REQUIRED: '연결이 만료되었습니다. 실행기 주소를 다시 열어 주세요.', LAUNCH_REQUIRED: '실행기 터미널의 전체 주소로 연결해 주세요.',
  LOCAL_ORIGIN_REQUIRED: '이 실행기의 로컬 화면에서 요청해 주세요.', WORKSPACE_REVISION_CONFLICT: '다른 창이나 도구에서 내용이 변경되었습니다. 입력을 보존하고 새로 불러와 비교해 주세요.',
  SENSITIVE_INPUT: '개인정보·인증정보·내부 호스트 주소가 감지되었습니다. 입력을 가린 뒤 다시 저장해 주세요.',
  BACKLOG_INVALID: '자료의 필수 항목과 연결 관계를 확인해 주세요.', ANALYSIS_NOT_READY: '분석 기준선을 만들기 전에 남은 보완 항목을 해결해 주세요.',
  BASELINE_REQUIRED: '현재 요구사항과 일치하는 분석 기준선이 필요합니다.', DEVELOPMENT_NOT_READY: '에픽·스토리·인수조건과 근거 연결을 보완해 주세요.',
  EVIDENCE_REQUIRED: '유효한 검증일·검토 담당 역할·빌드 식별자·근거 문서가 필요합니다.', SOURCE_CLAUSE_REQUIRED: '요구사항이 근거로 삼는 원문 조항을 선택해 주세요.',
  SOURCE_CLAUSE_INVALID: '자료와 조항 연결을 확인해 주세요.', ACCEPTANCE_READ_ONLY: '인수 판정은 근거 기록 또는 인수 CSV 가져오기로 변경해 주세요.',
  CSV_IMPORT_INVALID: '검토 CSV의 헤더·누락 행·연결 관계를 확인해 주세요. 기존 자료는 변경하지 않았습니다.',
  UAT_IMPORT_INVALID: '검수 CSV의 행·해시·검증일·근거를 확인해 주세요. 기존 판정은 변경하지 않았습니다.',
  REQUIREMENTS_EXTERNAL_CHANGE: '외부에서 파일이 변경되었습니다. 작성 중 입력을 보존하고 실행기를 종료한 뒤 원본과 변경본을 비교해 주세요.',
  REQUIREMENTS_LOCK_LOST: '작업공간 잠금이 변경되었습니다. 입력을 보존하고 다른 실행기의 사용 여부를 확인해 주세요.',
  REQUIREMENTS_RECOVERY_REQUIRED: '중단된 저장의 확인이 필요합니다. 파일과 저널을 보존하고 실행기를 재시작해 복구 결과를 확인해 주세요.',
  REQUIREMENTS_CONTEXT_CONFLICT: 'CLI와 UI의 문맥이 다릅니다. 차이를 검토한 뒤 기준 정보를 갱신해 주세요.',
};

export async function startRequirementsServer({ workspace, root = ROOT, port = 8792, host = '127.0.0.1', contextProvider = () => loadRepositoryContextSnapshot(root), staticAssets } = {}) {
  if (host !== '127.0.0.1' || !Number.isInteger(port) || port < 0 || port > 65535) fail('LOOPBACK_REQUIRED');
  const context = await contextProvider();
  const store = createRequirementsStore({ workspace, initialBacklog: createEmptyBacklogPack(context), initialMetadata: initialRequirementsMetadata(context), validateBacklog: validateBacklogPack, validateMetadata: validateRequirementsMetadata });
  const engine = createRequirementsEngine({ store, contextProvider, root });
  const token = randomBytes(32).toString('base64url'), cookieSecret = randomBytes(32).toString('base64url'), launchSecret = randomBytes(32).toString('base64url');
  // Cookie name is unique per server, so two workspaces on loopback do not displace each other's reload session.
  const cookieName = `egov_req_${randomBytes(8).toString('hex')}`;
  const assets = new Map();
  try {
    if (staticAssets) for (const [url, item] of Object.entries(staticAssets)) assets.set(url, item);
    else for (const [url, [filename, type]] of Object.entries(STATIC)) assets.set(url, { type, bytes: await readFile(new URL(`./public/${filename}`, import.meta.url)) });
  } catch (error) { store.close(); throw error; }
  let busy = false;
  const server = createServer(async (request, response) => {
    secureHeaders(response);
    try {
      const authority = `127.0.0.1:${server.address().port}`, origin = `http://${authority}`;
      const url = new URL(request.url, origin);
      const hostCount = request.rawHeaders.filter((value, index) => index % 2 === 0 && value.toLowerCase() === 'host').length;
      const navigation = request.method === 'GET' && ['/', '/index.html'].includes(url.pathname) && !url.search && request.headers['sec-fetch-mode'] === 'navigate' && request.headers['sec-fetch-dest'] === 'document';
      if (hostCount !== 1 || request.headers.host !== authority || !['127.0.0.1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress) || ['forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto'].some(header => request.headers[header] !== undefined) || (request.headers.origin && request.headers.origin !== origin) || (!navigation && request.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(request.headers['sec-fetch-site']))) fail('LOCAL_ORIGIN_REQUIRED', 403);
      if (['GET', 'HEAD'].includes(request.method) && !url.search && assets.has(url.pathname)) {
        const asset = assets.get(url.pathname); response.writeHead(200, { 'Content-Type': asset.type }); response.end(request.method === 'HEAD' ? undefined : asset.bytes); return;
      }
      if (!url.pathname.startsWith('/api/') || url.search) fail('NOT_FOUND', 404);
      if (url.pathname === '/api/session' && request.method === 'GET') {
        const cookie = (request.headers.cookie ?? '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
        if (!equal(request.headers['x-requirements-launch'], launchSecret) && !equal(cookie, cookieSecret)) fail('LAUNCH_REQUIRED', 403);
        response.setHeader('Set-Cookie', `${cookieName}=${cookieSecret}; HttpOnly; SameSite=Strict; Path=/`);
        json(response, 200, { token }); return;
      }
      if (!equal(request.headers['x-workspace-token'], token)) fail('SESSION_REQUIRED', 403);
      if (request.method === 'GET' && url.pathname === '/api/state') { json(response, 200, await engine.state()); return; }
      const artifact = url.pathname.match(/^\/api\/artifacts\/([a-zA-Z0-9-]+)$/);
      if (request.method === 'GET' && artifact) { json(response, 200, engine.artifact(artifact[1])); return; }
      if (url.pathname !== '/api/action') fail('NOT_FOUND', 404);
      if (request.method !== 'POST') fail('METHOD_NOT_ALLOWED', 405);
      if (busy) { request.resume(); fail('WORKSPACE_BUSY', 409); }
      busy = true;
      try {
        const input = await readBody(request);
        if (!input || Array.isArray(input) || Object.keys(input).some(key => !['revision', 'action', 'payload'].includes(key)) || typeof input.revision !== 'string') fail('INVALID_REQUEST');
        json(response, 200, await engine.action(input.revision, input.action, input.payload));
      } finally { busy = false; }
    } catch (error) {
      if (response.headersSent || response.destroyed) return;
      const code = /^[A-Z][A-Z0-9_]{2,80}$/.test(error.code ?? '') ? error.code : 'INTERNAL_ERROR';
      const status = error.status ?? (/CONFLICT|LOCK|BUSY|RECOVERY|EXTERNAL_CHANGE|READ_ONLY/.test(code) ? 409 : code === 'ARTIFACT_NOT_FOUND' ? 404 : code === 'INTERNAL_ERROR' ? 500 : 400);
      // Raw filesystem paths, input values and stack traces are never reflected.
      json(response, status, { code, message: messages[code] ?? `요청을 처리하지 못했습니다. 입력과 연결 상태를 확인해 주세요. (${code})`, ...(['SENSITIVE_INPUT', 'ANALYSIS_NOT_READY', 'BACKLOG_INVALID', 'DEVELOPMENT_NOT_READY', 'CSV_IMPORT_INVALID', 'UAT_IMPORT_INVALID'].includes(code) && Array.isArray(error.errors) ? { errors: error.errors } : {}) });
    }
  });
  server.requestTimeout = 30000; server.headersTimeout = 10000;
  server.listen(port, host);
  try { await once(server, 'listening'); } catch (error) { store.close(); throw error; }
  const url = `http://127.0.0.1:${server.address().port}`;
  let closed = false;
  const app = { url, server, engine, store, async close() { if (closed) return; closed = true; server.closeAllConnections(); await new Promise(resolveClose => server.close(resolveClose)); store.close(); } };
  Object.defineProperties(app, { launchSecret: { value: launchSecret }, launchUrl: { value: `${url}/#launch=${launchSecret}` } });
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), options = {};
  try {
    for (let index = 0; index < args.length; index += 2) {
      const key = args[index];
      if (!['--workspace', '--port'].includes(key) || !args[index + 1] || Object.hasOwn(options, key)) fail('INVALID_ARGUMENT');
      options[key] = args[index + 1];
    }
    if (!options['--workspace']) fail('WORKSPACE_REQUIRED');
    const app = await startRequirementsServer({ workspace: resolve(options['--workspace']), port: options['--port'] === undefined ? 8792 : Number(options['--port']) });
    console.log(`요구사항 작업공간: ${app.launchUrl}\n서버 작업자료는 지정한 외부 작업공간에 저장합니다. 다운로드 파일은 브라우저 저장 위치를 확인하세요. 종료: Ctrl+C`);
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void app.close().then(() => { process.exitCode = 0; }); });
  } catch (error) {
    console.error(`시작하지 못했습니다. 오류 코드: ${/^[A-Z][A-Z0-9_]+$/.test(error.code ?? '') ? error.code : 'START_FAILED'}\n사용법: node tools/requirements-workspace/server.mjs --workspace <Git 밖 경로> [--port 8792]`);
    process.exitCode = 1;
  }
}
