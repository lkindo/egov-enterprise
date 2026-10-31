import { createServer } from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, unlink, access } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { homedir } from 'node:os';
import { once } from 'node:events';
import { openWorkspace, WorkspaceError } from './store.mjs';
import { createEngine } from './engine.mjs';
import { createAi } from './ai.mjs';
import { checkedPath, readBoundedFile, inspectFolder, inspectZip, extractZip, parseDdl, INPUT_LIMITS } from './inputs.mjs';

const STATIC = { '/': ['index.html', 'text/html; charset=utf-8'], '/index.html': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/api.js': ['api.js', 'text/javascript; charset=utf-8'], '/dom.js': ['dom.js', 'text/javascript; charset=utf-8'], '/profiles.js': ['profiles.js', 'text/javascript; charset=utf-8'], '/styles.css': ['styles.css', 'text/css; charset=utf-8'], '/fonts/PretendardVariable.woff2': ['fonts/PretendardVariable.woff2', 'font/woff2'] };
const IMPORT_KINDS = ['ledger', 'confirmed-ledger', 'skeleton', 'review', 'standard-columns'];
// 실행 비밀(launch secret)을 싣는 전용 헤더. 비밀은 터미널 주소의 조각(#launch=)으로만 화면에 전달된다.
const LAUNCH_HEADER = 'x-migration-workspace-launch';
const fail = (code, status = 400) => { throw Object.assign(new Error(code), { code, status }); };
const exact = (value, keys) => { if (!value || Array.isArray(value) || typeof value !== 'object' || Object.keys(value).some(k => !keys.includes(k))) fail('INVALID_REQUEST'); };
const headers = response => {
  response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('Referrer-Policy', 'no-referrer'); response.setHeader('X-Frame-Options', 'DENY'); response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; font-src 'self'; img-src 'self' data:; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'");
};
const respond = (response, status, data) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify({ status, data })); };
async function body(request, maximum, raw = false) {
  if (!(raw ? /^application\/octet-stream$/i : /^application\/json(?:;\s*charset=utf-8)?$/i).test(request.headers['content-type'] ?? '')) fail('CONTENT_TYPE_REQUIRED', 415);
  const declared = request.headers['content-length'];
  if (request.headers['content-encoding'] || Number(declared ?? 0) > maximum) fail('BODY_TOO_LARGE', 413);
  let bytes;
  if (typeof declared === 'string' && /^\d+$/.test(declared)) {
    // 선언한 크기의 버퍼 하나에 바로 채운다. 조각 배열과 Buffer.concat 의 이중 복사로 순간 메모리가 배가 되지 않는다.
    const length = Number(declared); let offset = 0;
    bytes = Buffer.alloc(length);
    for await (const chunk of request) { if (offset + chunk.length > length) fail('BODY_TOO_LARGE', 413); chunk.copy(bytes, offset); offset += chunk.length; }
    if (offset !== length) fail('INVALID_REQUEST');
  } else {
    let size = 0; const chunks = [];
    for await (const chunk of request) { size += chunk.length; if (size > maximum) fail('BODY_TOO_LARGE', 413); chunks.push(chunk); }
    bytes = Buffer.concat(chunks);
  }
  if (raw) return bytes;
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { fail('INVALID_JSON'); }
}
function constantEqual(a, b) { return typeof a === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b)); }

export async function startWorkspaceServer({ directory, jarPath, javaPath, gitPath, codexPath, approvalPath, port = 8770, host = '127.0.0.1', engineFactory = createEngine, aiFactory = createAi }) {
  if (host !== '127.0.0.1' || !Number.isInteger(port) || port < 0 || port > 65535) fail('LOOPBACK_REQUIRED');
  const store = await openWorkspace({ directory });
  const engine = engineFactory({ store, jarPath, javaPath, gitPath });
  const secrets = new Map();
  const ai = await aiFactory({ store, engine, approvalPath, codexPath, forbiddenValues: () => [...secrets.values()] });
  const token = randomBytes(32).toString('base64url'), previews = new Map();
  // 실행 비밀은 터미널에 출력하는 주소의 조각(#launch=)에만 싣고 파일·작업 색인·로그에는 쓰지 않는다.
  // 같은 PC의 다른 OS 계정이나 브라우저 밖 클라이언트는 이 비밀 없이 요청 토큰을 받을 수 없다.
  const launchSecret = randomBytes(32).toString('base64url');
  let preparing = false;
  const assets = new Map();
  for (const [url, [file, type]] of Object.entries(STATIC)) assets.set(url, { type, bytes: await readFile(new URL(`./public/${file}`, import.meta.url)) });
  assets.set('/chat-ui.js', { type: 'text/javascript; charset=utf-8', bytes: await readFile(new URL('./public/chat-ui.js', import.meta.url)) });
  assets.set('/chat-contract.mjs', { type: 'text/javascript; charset=utf-8', bytes: await readFile(new URL('./chat-contract.mjs', import.meta.url)) });
  const checkRevision = async revision => {
    const state = await engine.state();
    if (!Number.isSafeInteger(revision) || revision !== state.revision) fail('WORKSPACE_REVISION_CONFLICT', 409);
    if (state.readOnly || store.readOnly) fail('WORKSPACE_READ_ONLY', 409);
    // 결과 불명(unknown) 작업은 새 적재만 막는다(ADR-0041 결정 10). 입력 저장은 실행 중인 작업만 막는다.
    if (state.activeJobId || state.jobs.some(job => ['starting', 'running', 'cancelling'].includes(job.status))) fail('WORKSPACE_BUSY', 409);
  };
  // 입력 준비는 한 번에 하나다. 바쁘면 onBusy(남은 본문 흘려 버리기 등)만 부르고 바로 거절한다.
  async function prepare(run, onBusy) { if (preparing) { onBusy?.(); fail('INPUT_BUSY', 409); } preparing = true; try { return await run(); } finally { preparing = false; } }
  async function saveDdl(bytes, revision) {
    await checkRevision(revision);
    const draft = parseDdl(bytes), filename = `ddl-${randomUUID()}.json`;
    const destination = path.join(store.directory, 'input-drafts'); await mkdir(destination, { recursive: true }); await checkedPath(destination, 'directory');
    await writeFile(path.join(destination, filename), JSON.stringify(draft, null, 2), { flag: 'wx', mode: 0o600 });
    const content = JSON.stringify(draft, null, 2), sha256 = createHash('sha256').update(content).digest('hex');
    await store.update(revision, state => { state.artifacts.ddl = { path: `input-drafts/${filename}`, sha256, bytes: Buffer.byteLength(content), kind: 'ddl', liveInventory: false, unsupportedCount: draft.unsupported.length }; });
    return { kind: 'ddl', tables: draft.tables.length, unsupported: draft.unsupported, partial: draft.partial, liveInventory: false };
  }
  async function artifact(kind) {
    if (kind !== 'ddl') return engine.getArtifact(kind);
    const state = await store.read(), item = state.artifacts.ddl;
    if (!item) fail('ARTIFACT_NOT_FOUND', 404);
    const file = await checkedPath(path.join(store.directory, item.path)), bytes = await readFile(file);
    if (createHash('sha256').update(bytes).digest('hex') !== item.sha256) fail('ARTIFACT_CHANGED', 409);
    return { kind, ...item, content: bytes.toString('utf8') };
  }
  const server = createServer(async (request, response) => {
    headers(response);
    try {
      const authority = `127.0.0.1:${server.address().port}`, origin = `http://${authority}`;
      const url = new URL(request.url, origin);
      const documentNavigation = request.method === 'GET' && !url.search && ['/', '/index.html'].includes(url.pathname) && request.headers['sec-fetch-mode'] === 'navigate' && request.headers['sec-fetch-dest'] === 'document';
      const hostCount = request.rawHeaders.filter((value, index) => index % 2 === 0 && value.toLowerCase() === 'host').length;
      if (hostCount !== 1 || request.headers.host !== authority || !['127.0.0.1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress)
        || ['forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto'].some(name => request.headers[name] !== undefined)
        || (request.headers.origin && request.headers.origin !== origin) || (!documentNavigation && request.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(request.headers['sec-fetch-site']))) fail('LOCAL_ORIGIN_REQUIRED', 403);
      if (request.method === 'GET' && !url.search && assets.has(url.pathname)) { const asset = assets.get(url.pathname); response.writeHead(200, { 'Content-Type': asset.type }); response.end(asset.bytes); return; }
      if (url.pathname === '/api/session' && request.method === 'GET' && !url.search) {
        // 터미널 주소의 실행 비밀을 상수 시간으로 대조한 화면에만 요청 토큰을 준다.
        if (!constantEqual(request.headers[LAUNCH_HEADER], launchSecret)) throw Object.assign(new WorkspaceError('LAUNCH_REQUIRED', '실행기 터미널에 표시된 주소로 다시 여세요. 주소 끝의 #launch= 부분까지 그대로 열어야 연결됩니다.'), { status: 403 });
        respond(response, 200, { csrfToken: token }); return;
      }
      if (!url.pathname.startsWith('/api/') || !constantEqual(request.headers['x-workspace-token'], token)) fail('SESSION_REQUIRED', 403);
      if (url.search && url.pathname !== '/api/uploads') fail('INVALID_REQUEST');
      if (request.method === 'GET') {
        if (url.pathname === '/api/state') { respond(response, 200, { ...await engine.state(), ai: await ai.status() }); return; }
        if (url.pathname === '/api/ai/status') { respond(response, 200, await ai.status()); return; }
        const match = url.pathname.match(/^\/api\/artifacts\/([a-zA-Z-]+)$/);
        if (match) { respond(response, 200, await artifact(match[1])); return; }
        const evidence = url.pathname.match(/^\/api\/jobs\/([a-f0-9-]+)\/evidence$/);
        if (evidence) { respond(response, 200, await engine.jobEvidence(evidence[1])); return; }
      }
      if (request.method === 'POST' && url.pathname === '/api/uploads') {
        if ([...url.searchParams.keys()].some(key => key !== 'kind') || url.searchParams.getAll('kind').length !== 1) fail('INVALID_REQUEST');
        const kind = url.searchParams.get('kind'), revision = Number(request.headers['x-workspace-revision']);
        if (!['zip', 'ddl', 'ledger', 'skeleton', 'review', 'standard-columns'].includes(kind)) fail('IMPORT_KIND_UNSUPPORTED');
        // 본문을 읽기 전에 준비 잠금을 잡는다. 바쁘면 본문을 메모리에 모으지 않고 흘려 버린 뒤 바로 거절한다.
        const result = await prepare(async () => {
          await checkRevision(revision);
          const data = await body(request, kind === 'zip' ? INPUT_LIMITS.compressed : INPUT_LIMITS.ddl, true);
          await checkRevision(revision);
          if (kind === 'zip') {
            const info = inspectZip(data), previewId = randomUUID();
            // Keep at most one bounded pending archive in memory, never put source bytes in state/logs.
            previews.clear(); previews.set(previewId, { data, revision, expires: Date.now() + 600000 });
            return { previewId, kind: 'zip-preview', entries: info.entries.length, bytes: info.expanded, skipped: info.excluded, files: info.entries.slice(0, 200).map(entry => ({ name: entry.name, size: entry.unpacked, excluded: entry.excluded })), truncated: info.entries.length > 200 };
          }
          if (kind === 'ddl') return saveDdl(data, revision);
          const folder = path.join(store.directory, 'incoming'); await mkdir(folder, { recursive: true }); await checkedPath(folder, 'directory');
          const file = path.join(folder, `${randomUUID()}.json`);
          try { await writeFile(file, data, { flag: 'wx', mode: 0o600 }); return await engine.importArtifact(kind, file, revision); } finally { await unlink(file).catch(() => {}); }
        }, () => request.resume());
        respond(response, 200, result); return;
      }
      if (!['POST', 'PUT'].includes(request.method)) fail('METHOD_NOT_ALLOWED', 405);
      const input = await body(request, 4 * 1024 ** 2);
      if (url.pathname === '/api/profiles' && request.method === 'POST') {
        exact(input, ['revision', 'role', 'profile', 'password', 'credentialAction']);
        const result = await engine.configureProfile(input.role, input.profile, input.password, input.revision, input.credentialAction);
        // Keep the AI exclusion set aligned with the engine's explicit credential action.
        if (input.credentialAction !== 'keep') {
          if (input.password) secrets.set(input.role, input.password); else secrets.delete(input.role);
        }
        respond(response, 200, result); return;
      }
      if (url.pathname === '/api/inputs' && request.method === 'POST') {
        exact(input, ['revision', 'kind', 'path', 'previewId']);
        const result = await prepare(async () => {
          await checkRevision(input.revision);
          if (input.kind === 'zip') {
            const preview = previews.get(input.previewId);
            if (!preview || preview.revision !== input.revision || preview.expires < Date.now()) fail('ZIP_PREVIEW_EXPIRED', 409);
            const result = await extractZip(preview.data, store.directory); previews.delete(input.previewId);
            await engine.configureInputs({ sourceRoot: result.sourceRoot, sourceFingerprint: result.sourceFingerprint }, input.revision); return result.summary;
          }
          if (input.kind === 'folder') {
            const result = await inspectFolder(input.path); await engine.configureInputs({ sourceRoot: result.sourceRoot, sourceFingerprint: result.sourceFingerprint }, input.revision); return result.summary;
          }
          if (input.kind === 'ddl') return saveDdl(await readBoundedFile(input.path, INPUT_LIMITS.ddl), input.revision);
          if (IMPORT_KINDS.includes(input.kind)) return engine.importArtifact(input.kind, input.path, input.revision);
          fail('IMPORT_KIND_UNSUPPORTED');
        }); respond(response, 200, result); return;
      }
      if (url.pathname === '/api/jobs' && request.method === 'POST') { exact(input, ['revision', 'requestId', 'operation', 'options']); if (preparing) fail('INPUT_BUSY', 409); respond(response, 202, await engine.startJob(input)); return; }
      const cancel = url.pathname.match(/^\/api\/jobs\/([a-f0-9-]+)\/cancel$/);
      if (cancel && request.method === 'POST') { exact(input, []); respond(response, 200, await engine.cancelJob(cancel[1])); return; }
      const acknowledge = url.pathname.match(/^\/api\/jobs\/([a-f0-9-]+)\/acknowledge$/);
      if (acknowledge && request.method === 'POST') { exact(input, ['revision', 'note']); respond(response, 200, await engine.acknowledgeJob(acknowledge[1], input)); return; }
      if (url.pathname === '/api/ledger' && request.method === 'PUT') { exact(input, ['revision', 'ledger']); respond(response, 200, await engine.saveLedger(input.ledger, input.revision)); return; }
      if (url.pathname === '/api/ai/login') { exact(input, []); respond(response, 200, await ai.login()); return; }
      if (url.pathname === '/api/ai/login-cancel') { exact(input, []); respond(response, 200, await ai.cancelLogin()); return; }
      if (url.pathname === '/api/ai/logout') { exact(input, []); respond(response, 200, await ai.logout()); return; }
      if (url.pathname === '/api/ai/test') { exact(input, []); respond(response, 200, await ai.testConnection()); return; }
      if (url.pathname === '/api/ai/chat' && request.method === 'POST') { exact(input, ['revision', 'conversationId', 'message', 'screen', 'filledFields']); respond(response, 200, await ai.chat(input)); return; }
      if (url.pathname === '/api/ai/chat-reset' && request.method === 'POST') { exact(input, []); respond(response, 200, await ai.resetChat()); return; }
      if (url.pathname === '/api/ai/config') { exact(input, ['provider', 'apiKey', 'model']); respond(response, 200, await ai.configure(input)); return; }
      if (url.pathname === '/api/ai/preview') { exact(input, ['mode', 'artifactIds', 'excerpts']); respond(response, 200, await ai.preview(input)); return; }
      // 품질 분석(profile)을 허용하는 계획은 표당 행 한도를 함께 받는다. 값의 범위·필수 여부는 ai.approveReadPlan 이 판정한다.
      if (url.pathname === '/api/ai/read-plan') { exact(input, ['revision', 'operations', 'profileRowLimit']); respond(response, 200, await ai.approveReadPlan(input)); return; }
      if (url.pathname === '/api/ai/ask') { exact(input, ['previewId', 'question']); respond(response, 200, await ai.ask(input)); return; }
      if (url.pathname === '/api/ai/apply') { exact(input, ['proposalId', 'revision', 'changes']); respond(response, 200, await ai.apply(input)); return; }
      fail('NOT_FOUND', 404);
    } catch (error) {
      if (response.headersSent || response.destroyed) return;
      const code = /^[A-Z][A-Z0-9_]{2,80}$/.test(error.code ?? '') ? error.code : 'INTERNAL_ERROR';
      const status = error.status ?? (/CONFLICT|STALE|BUSY|READ_ONLY/.test(code) ? 409 : code === 'INTERNAL_ERROR' ? 500 : 400);
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ status, code, message: error.name === 'WorkspaceError' ? error.message : `요청을 처리하지 못했습니다. 오류 코드: ${code}` }));
    }
  });
  server.requestTimeout = 300000; server.headersTimeout = 15000;
  server.listen(port, host);
  try { await once(server, 'listening'); } catch (error) { await ai.close(); await store.close(); throw error; }
  const url = `http://127.0.0.1:${server.address().port}`;
  const app = { server, engine, store, url, async close() { await engine.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); previews.clear(); secrets.clear(); await ai.close(); } };
  // 실행 비밀은 열거되지 않는 속성으로만 돌려준다. 객체를 실수로 출력·직렬화해도 드러나지 않는다.
  Object.defineProperties(app, { launchSecret: { value: launchSecret }, launchUrl: { value: `${url}/#launch=${launchSecret}` } });
  return app;
}

async function resolveExecutable(name, environment = process.env.PATH ?? '') {
  for (const folder of environment.split(path.delimiter)) { const file = path.join(folder, name); try { await access(file); return file; } catch {} }
}
async function main() {
  const args = process.argv.slice(2), options = {};
  const names = new Map([['--workspace', 'directory'], ['--jar', 'jarPath'], ['--java', 'javaPath'], ['--git', 'gitPath'], ['--codex', 'codexPath'], ['--ai-approval', 'approvalPath'], ['--port', 'port']]);
  if (args.includes('--help')) { process.stdout.write('node tools/migration-workspace/server.mjs --workspace <Git 밖 로컬 폴더> --jar <migration-tool.jar> [--java <java.exe>] [--codex <codex.exe>] [--ai-approval <기관 승인.json>] [--port 8770]\n'); return; }
  for (let i = 0; i < args.length; i += 2) { const key = names.get(args[i]); if (!key || !args[i + 1] || options[key] !== undefined) fail('INVALID_ARGUMENT'); options[key] = key === 'port' ? Number(args[i + 1]) : path.resolve(args[i + 1]); }
  options.directory ??= path.join(process.env.LOCALAPPDATA ?? path.join(homedir(), '.local', 'share'), 'egov-migration', 'workspace');
  options.javaPath ??= await resolveExecutable(process.platform === 'win32' ? 'java.exe' : 'java');
  options.gitPath ??= await resolveExecutable(process.platform === 'win32' ? 'git.exe' : 'git');
  options.jarPath ??= fileURLToPath(new URL('../../migration-tool/build/libs/migration-tool-0.0.1-SNAPSHOT.jar', import.meta.url));
  const app = await startWorkspaceServer(options);
  // 주소의 조각(#launch=)은 브라우저가 서버로 보내지 않아 요청 기록·Referer 에 남지 않는다.
  process.stdout.write(`이관 작업공간: ${app.launchUrl}\n이 주소에는 이번 실행의 접속 열쇠가 들어 있습니다. 다른 사람과 공유하거나 문서·채팅에 붙이지 마세요.\n비밀번호는 실행기 종료 시 사라집니다. 기관 DB·소스는 연결 양식에서 선택하세요.\n`);
  let closing = false;
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { if (closing) return; closing = true; try { await app.close(); process.exit(0); } catch { closing = false; process.stderr.write('실행 중인 작업을 먼저 확인하세요. 적재가 끝나기 전에는 실행기를 종료하지 않습니다.\n'); } });
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { process.stderr.write(`실행 실패: ${/^[A-Z_]+$/.test(error.code ?? '') ? error.code : 'STARTUP_FAILED'}\n`); process.exitCode = 1; });
