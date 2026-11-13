#!/usr/bin/env node
import { validatePrivateBacklog } from './private-validation.mjs';
import { createServer } from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { once } from 'node:events';
import { createRequirementsStore } from './store.mjs';
import { createRequirementsEngine, initialRequirementsMetadata, validateRequirementsMetadata } from './engine.mjs';
import { createEmptyBacklogPack, loadRepositoryContextSnapshot } from '../../scripts/export-deliverables-workspace.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const STATIC = {
  '/': ['index.html', 'text/html;charset=utf-8'], '/index.html': ['index.html', 'text/html;charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript;charset=utf-8'], '/styles.css': ['styles.css', 'text/css;charset=utf-8'],
  '/tokens.css': ['tokens.css', 'text/css;charset=utf-8'], '/fonts/PretendardVariable.woff2': ['fonts/PretendardVariable.woff2', 'font/woff2'],
  '/studio.html': ['studio.html', 'text/html;charset=utf-8'], '/studio.js': ['studio.js', 'text/javascript;charset=utf-8'],
};
const fail = (code, status = 400) => { throw Object.assign(new Error(code), { code, status }); };
const equal = (a, b) => typeof a === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const json = (response, status, value) => { response.writeHead(status, { 'Content-Type': 'application/json;charset=utf-8' }); response.end(JSON.stringify(value)); };
function secureHeaders(response) {
  for (const [name, value] of Object.entries({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'Cross-Origin-Resource-Policy': 'same-origin', 'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; font-src 'self'; img-src 'self' data:; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'" })) response.setHeader(name, value);
}
async function readBody(request, maximum = 4 * 1024 ** 2) {
  if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers['content-type'] ?? '')) fail('CONTENT_TYPE_REQUIRED', 415);
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
  AI_CONSENT_REQUIRED: '전송 대상 자료와 CLI 모델 서비스를 확인하고 실행에 동의해 주세요.',
  AI_STALE_INPUT: '등록 자료가 바뀌었습니다. 최신 자료를 확인하고 AI 분석을 다시 시작하세요.',
  AI_STALE_RESULT: '생성 중 입력이 바뀐 결과입니다. 현재 자료로 AI를 다시 실행하세요.',
  AI_BUSY: 'AI 작업을 실행 중입니다. 완료를 기다리거나 현재 작업을 취소하세요.',
  AI_CLI_UNAVAILABLE: 'Claude CLI 실행 파일을 찾지 못했습니다. 이 PC에 CLI를 설치하고 로그인 상태를 확인하세요.',
  AI_CLI_FAILED: 'CLI 실행이 완료되지 않았습니다. 터미널에서 Claude 로그인·사용 한도를 확인한 후 다시 시도하세요.',
  AI_MODEL_MISMATCH: '선택한 모델과 실제 실행 모델이 달라 결과를 적용하지 않았습니다.',
  AI_OUTPUT_INVALID: 'AI 결과의 형식·원문 근거·연결 관계를 검증하지 못했습니다. 원본은 유지했으며 다시 실행할 수 있습니다.',
  AI_DOCUMENT_INPUT_INVALID: '문서 통합에 필요한 입력을 검증하지 못했습니다. 등록 자료와 판독 기록을 확인해 주세요. 원본은 보존했습니다.',
  AI_ATTACHMENT_INVALID: '시각 자료를 준비하지 못했습니다. 이미지 크기·페이지 수·원본 무결성과 합계 20MiB/100개 한도를 확인하거나 추출 본문만 선택하세요.',
  AI_RECORD_UNAVAILABLE: '보관한 AI 결과의 무결성을 확인하지 못했습니다. 작업공간 원본을 보존하고 다시 분석하세요.',
  AI_INPUT_TOO_LARGE: '누적 요구사항·결정 요약이 한 번에 처리할 수 있는 크기를 넘었습니다. 업무 범위를 나누어 별도 작업공간에서 분석해 주세요.',
  AI_DECOMPOSITION_INPUT_TOO_LARGE: '에픽·스토리 생성에 필요한 확정 요구사항·기존 계획·근거가 한 요청의 한도를 넘었습니다. 확정 기준선은 유지되며, 업무 범위를 나누어 다시 실행해 주세요.',
  AI_ANALYSIS_CAPACITY: '원문 조항·분석 묶음 수·누적 요구사항·쟁점·인용 또는 제안 크기가 단일 작업공간의 한도를 넘었습니다. 업무 범위를 나누어 별도 작업공간에서 분석해 주세요.',
  AI_EXISTING_REQUIREMENT_REVIEW_REQUIRED: '기존 요구사항의 유형·해결 방향·사유와 근거 조항 연결을 검토한 뒤 다시 실행해 주세요.',
  AI_REQUIREMENT_CAPACITY: '누적 요구사항이 150개를 넘었습니다. 업무 범위를 나누어 별도 작업공간에서 분석해 주세요.',
  AI_ISSUE_CAPACITY: '누적 쟁점이 100개를 넘었습니다. 업무 범위를 나누어 별도 작업공간에서 분석해 주세요.',
  AI_PROPOSAL_CAPACITY: '누적 분석 제안이 1MiB를 넘었습니다. 업무 범위를 나누어 별도 작업공간에서 분석해 주세요.',
  AI_AUDIT_CAPACITY: '분석 변경 이력의 보관 한도를 넘었습니다. 업무 범위를 나누어 별도 작업공간에서 분석해 주세요.',
  AI_SOURCE_CLAUSE_TOO_LARGE: '원문 조항 한 개가 분석 묶음의 크기를 넘었습니다. 해당 조항을 문단 단위로 나누어 등록해 주세요.',
  AI_TIMEOUT: 'AI 실행 시간이 초과되었습니다. 기존 자료를 유지했으며 다시 실행할 수 있습니다.',
  AI_DECISIONS_REQUIRED: '중요한 미결정 사항에 답변하고 AI 재분석을 완료한 뒤 확정하세요.',
  AI_CHANGE_REVIEW_REQUIRED: '기존 업무 범위 변경과 작업·인수조건·추적 제외를 항목별로 확인해 주세요. 기존 내용은 유지했습니다.',
  AI_ANSWERS_REQUIRED: 'AI가 확인을 요청한 중요한 질문에 답변해 주세요.',
  AI_SOURCES_REQUIRED: '프로젝트 정보와 분석할 자료를 먼저 등록해 주세요.',
  AI_SOURCE_METADATA_REQUIRED: '자료 분류·자료 위치·원문 조항과 위치를 먼저 보완해 주세요. AI로 전송하지 않았습니다.',
  AI_DOCUMENTS_PROCESSING: '산출물을 읽고 있습니다. 파일 처리가 끝난 뒤 AI 분석을 시작하세요.',
  FILE_AI_CONSENT_REQUIRED: '원본 판독용 본문·페이지 이미지의 모델 서비스 전송 범위를 확인하고 동의해 주세요.',
  FILE_DOCUMENT_CAPACITY: '문서의 페이지·이미지·판독 본문 처리 한도를 넘었습니다. 원본을 보존하고 페이지 구간을 나눠 등록해 주세요.',
  FILE_SOURCE_CHANGED: '등록한 원본의 해시와 현재 자료가 다릅니다. 올바른 원본을 다시 등록해 주세요.',
  AI_DOCUMENT_OUTPUT_INVALID: 'AI 판독의 내용·위치·원문 근거를 검증하지 못했습니다. 원본을 확인하고 다시 판독해 주세요.',
  AI_DOCUMENT_SENSITIVE_OUTPUT: '이전 버전에서 민감정보 감지로 중단된 기록입니다. 새 실행기에서 다시 판독하면 분석을 진행하고 별도 안내합니다.',
  AI_DOCUMENT_UNREADABLE: '원본에서 판독 가능한 본문을 확보하지 못했습니다. 더 선명한 사본이나 변환한 PDF를 등록해 주세요.',
  AI_DOCUMENT_READING_REQUIRED: '기존 원본을 새 AI 판독 단계로 처리해야 합니다. AI 전체 분석에서 원본 판독을 진행해 주세요.',
  AI_CHECKPOINT_INVALID: '이전 완료 단계의 입력·지시문 결속을 확인하지 못했습니다. 재사용을 해제하고 다시 시작해 주세요.',
  AI_CALL_CAPACITY: '이번 분석의 호출 상한에 도달했습니다. 완료된 단계 재사용을 선택해 다시 시작할 수 있습니다.',
  AI_BUSINESS_MODEL_CAPACITY: '누적 업무 모델이 처리 한도를 넘었습니다. 업무 영역을 나누어 분석해 주세요.',
  AI_NO_EXECUTABLE_REQUIREMENTS: '개발 범위에 포함된 요구사항이 없습니다. 사업 범위와 원본 자료를 검토해 주세요.',
  FILE_REDACTION_REQUIRED: '민감정보가 포함될 수 있는 원문을 비공개 작업공간에서 분석·보관하고 별도 안내하는 방식임을 확인해 주세요.',
  FILE_SENSITIVE_INPUT: '이전 버전의 민감정보 차단 기록입니다. 새 실행기에서 다시 등록하면 분석을 진행하고 별도 안내합니다.',
  FILE_REQUEST_CONFLICT: '같은 등록 요청의 자료가 달라졌습니다. 최신 상태를 확인하고 새 요청으로 등록하세요.',
  FILE_TOO_LARGE: '파일 한 개는 20MiB까지 등록할 수 있습니다. 원문을 나누어 주세요.',
  FILE_ENCODING_INVALID: '파일 인코딩을 읽지 못했습니다. 텍스트는 UTF-8 또는 BOM이 있는 UTF-16으로 저장해 주세요.',
  FILE_TYPE_UNSUPPORTED: '지원하지 않는 형식입니다. Word는 DOCX를 사용하고 이미지·문서 지원 형식을 확인하세요.',
  FILE_NO_TEXT: '읽을 수 있는 본문이 없습니다. 스캔·이미지의 판독 결과와 문서 내용을 확인해 주세요.',
  FILE_EXTRACTION_FAILED: '문서 판독을 완료하지 못했습니다. 파일 손상·지원 형식과 로컬 OCR 준비 상태를 확인하세요.',
  FILE_TEXT_TOO_LARGE: '추출 본문이 처리 한도를 넘었습니다. 파일을 나누어 등록해 주세요.',
  FILE_ENCRYPTED: '암호화되었거나 보호된 문서입니다. 비식별된 보호 해제 사본을 등록해 주세요.',
  FILE_TIMEOUT: '문서 판독 시간이 초과되었습니다. 파일을 나누거나 OCR 모델 준비 상태를 확인하세요.',
  FILE_BUSY: '다른 파일을 처리 중입니다. 완료 후 다음 파일을 등록하세요.',
  REQUIREMENTS_EXTERNAL_CHANGE: '외부에서 파일이 변경되었습니다. 작성 중 입력을 보존하고 실행기를 종료한 뒤 원본과 변경본을 비교해 주세요.',
  REQUIREMENTS_LOCK_LOST: '작업공간 잠금이 변경되었습니다. 입력을 보존하고 다른 실행기의 사용 여부를 확인해 주세요.',
  REQUIREMENTS_RECOVERY_REQUIRED: '중단된 저장의 확인이 필요합니다. 파일과 저널을 보존하고 실행기를 재시작해 복구 결과를 확인해 주세요.',
  REQUIREMENTS_CONTEXT_CONFLICT: 'CLI와 UI의 문맥이 다릅니다. 차이를 검토한 뒤 기준 정보를 갱신해 주세요.',
  AI_NOT_RUNNING: '실행 중인 AI 작업이 없습니다. 화면을 새로 고쳐 상태를 확인해 주세요.',
  STUDIO_NOTHING_TO_DO: '새로 분석할 내용이 없습니다. 문서를 추가하거나 산출물을 켠 뒤 다시 실행해 주세요.',
  STUDIO_NOT_READY: '필수 칸과 출처를 채우고 열려 있는 쟁점·질문을 정리한 뒤 확정해 주세요.',
  STUDIO_ITEM_CONFLICT: '이 항목이 그 사이에 바뀌었습니다. 최신 내용을 확인한 뒤 다시 저장해 주세요. 입력한 내용은 화면에 남아 있습니다.',
  STUDIO_ITEM_CONFIRMED: '확정된 항목은 AI가 보강하지 않습니다. 확정을 취소하거나 직접 수정해 주세요.',
  STUDIO_ITEM_NOT_FOUND: '항목을 찾지 못했습니다. 화면을 새로 고쳐 주세요.',
  STUDIO_CATEGORY_LOCKED: '고유번호를 받은 요구사항은 분류를 바꿀 수 없습니다. 제외한 뒤 새 요구사항으로 작성해 주세요.',
  STUDIO_NAME_REQUIRED: '이름을 입력해 주세요.',
  STUDIO_ANSWER_REQUIRED: '질문에 대한 답을 입력해 주세요.',
  STUDIO_BASELINE_EMPTY: '확정된 요구사항이 있어야 기준선을 만들 수 있습니다.',
  STUDIO_CAPACITY: '작업공간 하나에 담을 수 있는 항목 수를 넘었습니다. 업무 범위를 나누어 별도 작업공간에서 진행해 주세요.',
  STUDIO_DOCUMENT_NOT_FOUND: '지금은 만들 수 없는 문서입니다. 해당 산출물을 켰는지 확인해 주세요.',
  STUDIO_STATE_INVALID: '저장된 요구사항·산출물 자료의 형식을 확인하지 못했습니다. 작업공간 파일을 보존하고 백업과 비교해 주세요.',
};

export async function startRequirementsServer({ workspace, root = ROOT, port = 8792, host = '127.0.0.1', contextProvider = () => loadRepositoryContextSnapshot(root), staticAssets, aiRunner } = {}) {
  if (host !== '127.0.0.1' || !Number.isInteger(port) || port < 0 || port > 65535) fail('LOOPBACK_REQUIRED');
  const context = await contextProvider();
  const store = createRequirementsStore({ workspace, initialBacklog: createEmptyBacklogPack(context), initialMetadata: initialRequirementsMetadata(context), validateBacklog: validatePrivateBacklog, validateMetadata: validateRequirementsMetadata });
  const engine = createRequirementsEngine({ store, contextProvider, root, aiRunner });
  const token = randomBytes(32).toString('base64url'), launchSecret = randomBytes(32).toString('base64url');
  const workspacePath = await realpath(workspace);
  const workspaceId = createHash('sha256').update(process.platform === 'win32' ? workspacePath.toLowerCase() : workspacePath).digest('hex');
  // The browser stores only an opaque lookup handle. Credentials stay in the
  // process; the index holds a hash so it cannot itself be replayed as a cookie.
  const resumeSessions = new Map();
  const handleHash = value => createHash('sha256').update(value).digest('hex');
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
        const resumedToken = typeof cookie === 'string' && /^[A-Za-z0-9_-]{43}$/.test(cookie) ? resumeSessions.get(handleHash(cookie)) : undefined;
        if (!equal(request.headers['x-requirements-launch'], launchSecret) && !equal(resumedToken, token)) fail('LAUNCH_REQUIRED', 403);
        if (!resumedToken) {
          const handle = randomBytes(32).toString('base64url');
          resumeSessions.set(handleHash(handle), token);
          response.setHeader('Set-Cookie', `${cookieName}=${handle}; Secure; HttpOnly; SameSite=Strict; Path=/`);
        }
        json(response, 200, { token, workspaceId }); return;
      }
      if (!equal(request.headers['x-workspace-token'], token)) fail('SESSION_REQUIRED', 403);
      if (request.method === 'GET' && url.pathname === '/api/state') { json(response, 200, await engine.state()); return; }
      if (request.method === 'GET' && url.pathname === '/api/studio') { json(response, 200, engine.studio.view()); return; }
      const studioDocument = url.pathname.match(/^\/api\/studio\/documents\/([A-Za-z0-9-]{1,80})$/);
      if (request.method === 'GET' && studioDocument) { json(response, 200, engine.studio.document(studioDocument[1])); return; }
      const artifact = url.pathname.match(/^\/api\/artifacts\/([a-zA-Z0-9-]+)$/);
      if (request.method === 'GET' && artifact) { json(response, 200, engine.artifact(artifact[1])); return; }
      if (!['/api/action', '/api/ingest'].includes(url.pathname)) fail('NOT_FOUND', 404);
      if (request.method !== 'POST') fail('METHOD_NOT_ALLOWED', 405);
      if (busy) { request.resume(); fail('WORKSPACE_BUSY', 409); }
      busy = true;
      try {
        const input = await readBody(request, url.pathname === '/api/ingest' ? 29 * 1024 ** 2 : undefined);
        if (!input || Array.isArray(input) || Object.keys(input).some(key => !['revision', 'action', 'payload'].includes(key)) || typeof input.revision !== 'string') fail('INVALID_REQUEST');
        if ((url.pathname === '/api/ingest') !== (input.action === 'source.ingest')) fail('INVALID_REQUEST');
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
  const app = { url, server, engine, store, async close() { if (closed) return; closed = true; server.closeAllConnections(); await new Promise(resolveClose => server.close(resolveClose)); await engine.close(); resumeSessions.clear(); store.close(); } };
  Object.defineProperties(app, { launchSecret: { value: launchSecret }, launchUrl: { value: `${url}/#launch=${launchSecret}` }, studioUrl: { value: `${url}/studio.html#launch=${launchSecret}` } });
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
    console.log(`요구사항 스튜디오(문서 → 요구사항 → 산출물 → 스토리): ${app.studioUrl}\n이전 화면(검수·감리 포함): ${app.launchUrl}\n서버 작업자료는 지정한 외부 작업공간에 저장합니다. 다운로드 파일은 브라우저 저장 위치를 확인하세요. 종료: Ctrl+C`);
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void app.close().then(() => { process.exitCode = 0; }); });
  } catch (error) {
    console.error(`시작하지 못했습니다. 오류 코드: ${/^[A-Z][A-Z0-9_]+$/.test(error.code ?? '') ? error.code : 'START_FAILED'}\n사용법: node tools/requirements-workspace/server.mjs --workspace <Git 밖 경로> [--port 8792]`);
    process.exitCode = 1;
  }
}
