import { api, openSession } from './api.js';
import { $, element, displayJson, feedback, notify } from './dom.js';
import { createProfiles, syncProfiles, profileSaved, hasDirtyProfiles, focusProfileField } from './profiles.js';
import { createChatUi } from './chat-ui.js';

const operations = [
  ['discover', '1', '구조 조사', '원천에 연결해 객체·컬럼·권한 가시성을 조사합니다.'],
  ['profile', '2', '데이터 품질 분석', '선택 범위의 결측·길이·코드와 날짜 형태를 집계합니다.'],
  ['app-scan', '3', '소스 근거 분석', '등록한 소스에서 SQL·화면·업무 의미의 근거를 찾습니다.'],
  ['term-suggest', '4', '표준 용어 후보', '현재 표준 자료와 분석 결과로 규칙 기반 후보를 만듭니다.'],
  ['mapping-generate', '5', '검토 원장 → 매핑', '확정 원장과 표준 구조를 검증해 매핑을 생성합니다.'],
  ['plan', '6', '실행 계획 작성', '원천·매핑·대상 계약을 실행 계획에 결속합니다.'],
  ['validate', '7', '계획 검증', '계획과 입력·승인·대상 계약의 일치를 확인합니다.'],
  ['dry-run', '8', '리허설', '기존 CLI의 dry-run 계약에 따라 적재 준비 상태를 확인합니다.'],
];
const operationNames = Object.fromEntries(operations.map(([id, , title]) => [id, title]));
operationNames.commit = '실제 적재';
const labels = { starting: '시작 중', running: '실행 중', cancelling: '중단 요청 중', succeeded: '완료', failed: '실패', interrupted: '중단됨', unknown: '결과 확인 필요', queued: '대기' };
const activeStatuses = new Set(['starting', 'running', 'cancelling', 'queued']);
const routeNames = new Set(['start', 'connect', 'source', 'review', 'pipeline', 'results', 'ai']);
const jobErrors = {
  CLI_START_FAILED: ['이관 CLI를 시작하지 못했습니다.', '실행기 PC의 Java와 CLI 파일 준비 상태를 확인한 뒤 다시 실행하세요.'],
  DB_TLS_UNSUPPORTED: ['DB 서버 또는 현재 연결 구성이 요청한 TLS를 지원하지 않습니다.', 'DB 관리자에게 TLS 지원과 허용 정책을 확인한 뒤 TLS 요구 수준을 직접 선택하고 저장하세요. TLS는 자동으로 해제하지 않습니다.', 'tlsMode'],
  DB_TLS_CERTIFICATE: ['TLS 인증서 또는 서버 이름 검증을 통과하지 못했습니다.', '인증서 신뢰 설정·유효기간과 접속 호스트 이름을 확인하세요. 검증 수준은 자동으로 낮추지 않습니다.', 'tlsMode'],
  DB_AUTH_FAILED: ['DB 계정 인증에 실패했습니다.', '접속 계정과 세션 비밀번호를 확인하고 연결 설정을 다시 저장하세요.', 'password'],
  DB_DATABASE_NOT_FOUND: ['지정한 데이터베이스를 찾지 못했습니다.', '데이터베이스 이름을 확인하세요. Oracle은 선택한 접속 방식에 맞는 서비스 이름 또는 SID를 확인하세요.', 'database'],
  DB_ACCESS_DENIED: ['DB 접근 또는 필요한 자료 조회 권한이 부족합니다.', '선택한 스키마와 계정의 해당 작업 권한을 DB 관리자에게 확인하세요. 원천은 필요한 읽기 권한만 부여받으세요.', 'schema'],
  DB_CONNECTION_REFUSED: ['DB 서버가 연결을 받지 않았습니다.', '호스트·포트와 DB 서비스 실행 상태, 방화벽·VPN·터널 준비 상태를 확인하세요.', 'host'],
  DB_CONNECTION_TIMEOUT: ['DB 연결 대기 시간이 초과되었습니다.', '호스트·포트와 네트워크·VPN·방화벽 상태를 확인한 뒤 다시 시도하세요.', 'host'],
  DB_HOST_NOT_FOUND: ['DB 호스트 이름을 확인하지 못했습니다.', '호스트 입력과 실행기 PC의 이름 해석·VPN 연결 상태를 확인하세요.', 'host'],
  DB_DRIVER_UNAVAILABLE: ['필요한 JDBC 드라이버를 사용할 수 없습니다.', '선택한 DBMS에 맞는 드라이버와 외부 JDBC JAR 경로를 확인하세요.', 'driverJar'],
  CLI_FAILED: ['이관 CLI가 작업을 완료하지 못했습니다.', '앞 단계 결과와 입력·승인 조건, 정형 진행 기록을 확인하세요. 실패 원인이 해결된 뒤 다시 실행하세요.'],
};
const readinessReasons = {
  WORKSPACE_READ_ONLY: '읽기 전용 작업공간입니다.', JOB_ACTIVE: '현재 작업이 끝난 뒤 진행하세요.', JOB_RESULT_UNKNOWN: '결과 불명 적재가 있습니다. 작업 기록에서 실행 증거를 확인하고 확인 기록을 남겨야 새 리허설·적재를 시작할 수 있습니다.',
  PREVIOUS_PROCESS_ALIVE: '이전 실행기의 CLI 프로세스가 아직 남아 있거나 종료 여부를 확인하지 못했습니다. 그 프로세스가 끝날 때까지 모든 단계와 결과 불명 작업의 확인 기록을 막습니다. 종료와 산출물을 먼저 확인하세요.',
  SOURCE_PROFILE_REQUIRED: '원천 DB 설정을 저장하세요.', SOURCE_CREDENTIALS_REQUIRED: '원천 DB 세션 비밀번호를 입력하고 저장하세요.',
  TARGET_PROFILE_REQUIRED: '대상 DB 설정을 저장하세요.', TARGET_CREDENTIALS_REQUIRED: '대상 DB 세션 비밀번호를 입력하고 저장하세요.',
  SOURCE_DRIVER_REQUIRED: '원천 DB에 맞는 외부 JDBC JAR를 준비하세요.', SOURCE_REQUIRED: '소스 폴더 또는 검사한 ZIP을 등록하세요.',
  INVENTORY_REQUIRED: '현재 입력으로 구조 조사를 완료하세요.', PROFILE_ARTIFACT_REQUIRED: '현재 원천의 데이터 품질 분석을 완료하세요.',
  SKELETON_REQUIRED: '대상 구조와 적재 범위(skeleton)를 가져오세요.', CONFIRMED_LEDGER_REQUIRED: '기관 Git 검토 확정 원장을 선택하세요.',
  STANDARD_COLUMNS_REQUIRED: '대상 컬럼 스냅샷(db_columns.json)을 가져오세요.', MAPPING_REQUIRED: '현재 확정 원장으로 매핑을 생성하세요.', PLAN_REQUIRED: '현재 입력으로 실행 계획을 작성하세요.',
  VALIDATION_REQUIRED: '현재 입력의 계획 검증을 통과해야 합니다.', DRY_RUN_REQUIRED: '현재 입력의 리허설을 통과해야 합니다.', COMMIT_UNVERIFIED: '현재 원천 DBMS는 공개 실제 적재 자격이 없습니다.',
};
// 서버가 고정 코드만 돌려주는 요청 오류(AI 연결·전송 등)의 안내. 코드는 괄호로 함께 보인다. 판정은 서버가 한다.
const requestErrors = {
  AI_TRANSMISSION_RECORD_FAILED: '작업공간에 AI 전송 기록을 남기지 못해 자료를 보내지 않았습니다. 작업공간 상태와 읽기 전용 여부를 확인한 뒤 다시 시도하세요.',
  AI_TRANSMISSION_LOG_FULL: '이 작업공간의 AI 전송 기록이 가득 차 더는 보내지 않습니다. 기록은 지우지 않으므로 새 작업공간에서 이어가세요.',
  AI_PROFILE_ROW_LIMIT_REQUIRED: '데이터 품질 집계를 허용하려면 표당 행 한도를 1~100000 정수로 입력하세요.',
  AI_READ_PLAN_INVALID: '읽기 계획의 형식이 맞지 않습니다. 표당 행 한도는 데이터 품질 집계를 허용할 때만 함께 보냅니다. 선택을 다시 확인하세요.',
  CODEX_HOME_CONFIG_PRESENT: '작업공간의 official-codex-client 폴더에 Codex 설정·지시 파일이 있어 공식 Codex를 열지 않았습니다. 실행기가 만들지 않은 설정·지시 파일을 치운 뒤 다시 시도하세요.',
};
function codeGuidance(code) { return typeof code === 'string' && Object.hasOwn(requestErrors, code) ? `${requestErrors[code]} (${code})` : code; }
let state;
let ready = false;
let busy = false;
let polling = false;
let mode = 'direct';
let ledgerDirty = false;
let ledgerLoaded = false;
let reviewLedger;
let reviewLoadedKind;
let reviewColumns = [];
let reviewSignature = '';
let ledgerLoadPending = false;
let ledgerFailedSignature = '';
let ledgerEditGeneration = 0;
let ledgerJsonPending = false;
let reviewPage = 0;
let aiPreview;
let aiProposal;
let aiStatus;
let aiConnectionTesting = false;
let lastAiAuthentication;
let previewGeneration = 0;
let excerptEvidence = [];
let selectedExcerpts = [];
let excerptDigest;
let excerptLoading = false;
let commitRevision;
let loadOperation = 'commit';
let zipPreview;
let readPlanDirty = false;
let providerDirty = false;
let requestKeys = new Map();
let previousJobView = '';
let previousArtifactView = '';
let chatUi;
let connectionFocus;
let sourcePathDirty = false;
let sourcePathGeneration = 0;
let stateRequestGeneration = 0;

function artifacts() {
  if (Array.isArray(state?.artifacts)) return state.artifacts.map(item => typeof item === 'string' ? { id: item, kind: item } : item);
  return Object.entries(state?.artifacts ?? {}).map(([kind, value]) => typeof value === 'string' ? { id: kind, kind, path: value } : { id: kind, kind, ...value });
}
function jobs() { return Array.isArray(state?.jobs) ? state.jobs : []; }
function activeJob() { return jobs().find(job => activeStatuses.has(job.status)); }
// 사람 확인 기록이 없는 결과 불명 작업. 새 적재만 막고 읽기 단계는 막지 않는다(서버 단계별 준비 조건이 최종 판정).
function unacknowledgedUnknown() { return jobs().find(job => job.status === 'unknown' && !job.acknowledgement); }
function artifactId(item) { return String(item.id ?? item.kind); }
function artifactLabel(item) {
  const names = { inventory: '원천 DB 구조', profile: '데이터 품질 분석', appUsage: '소스 사용 근거', suggestions: '표준 용어 후보', ledgerDraft: '분석에서 생성한 원장 초안', ledger: '편집 중인 용어 원장', confirmedLedger: '기관 검토 확정 원장', mapping: '변환 매핑', skeleton: '대상 구조와 적재 범위', standardColumns: '표준 컬럼 스냅샷', plan: '실행 계획', review: '실행 검토 기록', execution: '실행·대사 결과', ddl: '가져온 스키마 초안' };
  return String(item.label ?? names[item.kind] ?? item.name ?? item.kind ?? item.id ?? '산출물');
}
function ledgerArtifact() { return artifacts().find(item => item.kind === 'ledger') ?? artifacts().find(item => ['ledgerDraft', 'confirmedLedger'].includes(item.kind) && item.format === 'json'); }
function currentReviewSignature() { return JSON.stringify([ledgerArtifact()?.sha256 ?? null, state?.artifacts?.suggestions?.sha256 ?? null]); }
function reviewStale() { return ledgerLoaded && reviewSignature !== currentReviewSignature(); }
function supports(operation) {
  if (!ready) return false;
  const configured = state?.capabilities?.operations;
  if (Array.isArray(configured)) return configured.includes(operation);
  if (configured && Object.hasOwn(configured, operation)) {
    const item = configured[operation];
    return item === true || item?.available === true || item?.enabled === true;
  }
  return state?.capabilities?.cliAvailable !== false;
}
function operationStatus(operation) {
  if (!ready) return { ready: false, message: '실행기 상태를 먼저 확인하세요.' };
  if (!supports(operation)) return { ready: false, message: '현재 실행기에서 이 단계를 지원하지 않습니다.' };
  if (busy) return { ready: false, message: '현재 요청을 처리 중입니다.' };
  if (activeJob()) return { ready: false, message: readinessReasons.JOB_ACTIVE };
  const roles = ['discover', 'profile'].includes(operation) ? ['source'] : operation === 'term-suggest' ? ['target'] : ['mapping-generate', 'plan', 'dry-run', 'commit'].includes(operation) ? ['source', 'target'] : [];
  const dirty = roles.filter(role => hasDirtyProfiles(role));
  if (dirty.length) return { ready: false, message: `${dirty.map(role => role === 'source' ? '원천' : '대상').join('·')} 연결에 미저장 입력이 있습니다. 먼저 저장하세요.` };
  if (operation === 'app-scan' && sourcePathDirty) return { ready: false, message: '소스 경로의 미등록 입력을 먼저 등록하세요.' };
  if (ledgerDirty && ['mapping-generate', 'plan', 'dry-run', 'commit'].includes(operation)) return { ready: false, message: '원장의 미저장 초안을 먼저 정리하세요. 저장 후 기관 확정본과 후속 계획을 다시 검토해야 합니다.' };
  const preparation = state.operationReadiness?.[operation];
  if (!preparation || typeof preparation.ready !== 'boolean') return { ready: false, message: '실행기에서 단계별 준비 조건을 확인하지 못했습니다. 상태를 새로고침하세요.' };
  if (!preparation.ready) return { ready: false, message: Array.isArray(preparation.blockers) && preparation.blockers.length ? preparation.blockers.map(code => readinessReasons[code] ?? '실행기의 추가 준비 조건을 확인하세요.').join(' ') : '실행기의 준비 조건을 확인하세요.' };
  return { ready: true, message: '요청 가능 · 실제 연결과 파일·승인 계약은 실행기가 최종 확인합니다.' };
}
function workspaceReadOnly() { return Object.values(state?.operationReadiness ?? {}).some(item => item.blockers?.includes('WORKSPACE_READ_ONLY')); }
function aiAvailable() {
  return ready && state?.capabilities?.ai !== false && state?.capabilities?.ai?.available !== false && aiStatus?.available !== false;
}
function inferenceAvailable() { return ready && aiStatus?.inferenceAvailable === true; }
function validExcerpts() { return selectedExcerpts.length <= 5 && selectedExcerpts.every(item => Number.isSafeInteger(item.lineCount) && item.lineCount >= 1 && item.lineCount <= 40) && (!selectedExcerpts.length || excerptDigest === state?.artifacts?.appUsage?.sha256); }
function selectedChanges() {
  return [...document.querySelectorAll('[name="ai-change"]:checked')].map(input => aiProposal.changes[Number(input.value)]);
}
function updateButtons() {
  document.querySelectorAll('[data-operation]').forEach(button => {
    button.disabled = !operationStatus(button.dataset.operation).ready;
  });
  document.querySelectorAll('[data-operation-reason]').forEach(node => { node.textContent = `${operationNames[node.dataset.operationReason]}: ${operationStatus(node.dataset.operationReason).message}`; });
  document.querySelectorAll('form button[type="submit"], [data-profile-save]').forEach(button => { button.disabled = busy || !ready; });
  const inputMutationBlocked = busy || !ready || !!state?.activeJobId || workspaceReadOnly();
  for (const id of ['source-profile-form', 'target-profile-form', 'source-folder-form', 'source-upload-form', 'artifact-upload-form', 'confirmed-ledger-form', 'ledger-form']) {
    $(id)?.querySelectorAll('button[type="submit"]').forEach(button => { button.disabled = inputMutationBlocked; });
  }
  $('load-ledger').disabled = busy || !ready || ledgerLoadPending;
  $('parse-ledger').disabled = busy || !ready;
  document.querySelectorAll('[data-review-edit]').forEach(input => { input.disabled = busy || ledgerJsonPending || reviewStale() || input.dataset.locked === 'true'; });
  $('open-commit').disabled = !operationStatus('commit').ready;
  document.querySelectorAll('[data-cancel-job]').forEach(button => { button.disabled = busy || button.dataset.status === 'cancelling'; });
  $('ai-login').disabled = busy || !aiAvailable() || providerDirty || aiStatus?.provider === 'openai-api' || aiStatus?.login?.state === 'pending';
  $('ai-refresh').disabled = busy || !ready;
  $('ai-login-cancel').disabled = busy || aiStatus?.login?.state !== 'pending';
  $('ai-login-cancel').hidden = aiStatus?.login?.state !== 'pending';
  $('ai-logout').disabled = busy || !ready;
  $('ai-test').disabled = busy || !ready || providerDirty || aiConnectionTesting || aiStatus?.connectionTest?.status === 'running' || aiStatus?.testAvailable !== true;
  $('ai-preview').disabled = busy || !ready || providerDirty || ($('ai-mode').value === 'expanded' && (excerptLoading || !validExcerpts()));
  $('ai-excerpt-load').disabled = busy || !ready || excerptLoading;
  $('ai-excerpt-add').disabled = busy || excerptLoading || !$('ai-excerpt-choice').value || selectedExcerpts.length >= 5;
  $('ai-ask').disabled = busy || !aiPreview || !$('ai-consent').checked || !inferenceAvailable() || aiPreview.approval?.valid === false || readPlanDirty || providerDirty;
  $('ai-apply').disabled = busy || !aiProposal || !$('ai-apply-consent').checked || !selectedChanges().length || aiProposal.workspaceRevision !== state?.revision;
  if (aiProposal && aiProposal.workspaceRevision !== state?.revision && $('ai-apply-feedback').textContent !== '작업 판이 바뀌어 이 제안을 반영할 수 없습니다. 현재 자료로 다시 요청하세요.') feedback('ai-apply-feedback', '작업 판이 바뀌어 이 제안을 반영할 수 없습니다. 현재 자료로 다시 요청하세요.', true);
  $('zip-extract').disabled = inputMutationBlocked || !zipPreview;
  $('ai-revoke-plan').disabled = busy || !ready;
  $('commit-availability').textContent = operationStatus('commit').message;
  updateGuidance();
  chatUi?.sync();
}
function setBusy(value) { busy = value; $('main').setAttribute('aria-busy', String(value)); updateButtons(); }
function clearError() { $('global-error').hidden = true; $('global-error').textContent = ''; }
function showError(error, target) {
  const guidance = typeof error.code === 'string' && Object.hasOwn(requestErrors, error.code) ? requestErrors[error.code] : undefined;
  const message = `${guidance ?? (error.message || '요청을 처리하지 못했습니다.')}${error.code ? ` (${error.code})` : ''}`;
  if (target) feedback(target, message, true);
  else { $('global-error').hidden = false; $('global-error').textContent = message; }
  if (['CONNECTION_LOST', 'SESSION_UNAVAILABLE', 'RESPONSE_TIMEOUT', 'LAUNCH_REQUIRED'].includes(error.code)) {
    $('connection-state').textContent = '연결 확인 필요';
    $('connection-state').className = 'pill warning';
  }
}
async function mutation(action, { target, success, after } = {}) {
  if (busy || !ready) return;
  clearError();
  if (target) feedback(target, '처리 중입니다.');
  setBusy(true);
  stateRequestGeneration += 1;
  try {
    const result = await action();
    stateRequestGeneration += 1;
    if (after) await after(result);
    if (target && success) feedback(target, success);
    if (success) notify(success);
    await refreshState(false);
    return result;
  } catch (error) { showError(error, target); }
  finally { setBusy(false); }
}
function setMode(next) {
  mode = next;
  $('mode-direct').setAttribute('aria-pressed', String(next === 'direct'));
  $('mode-guided').setAttribute('aria-pressed', String(next === 'guided'));
  $('guided-help').hidden = next !== 'guided';
  updateGuidance();
  if (next === 'guided') chatUi?.open();
  notify(next === 'guided' ? '입력을 유지하고 AI 안내를 켰습니다. 실행 중인 CLI 작업은 작업 기록에서 관리합니다.' : '입력을 유지하고 직접 설정으로 전환했습니다.');
}
function route(focus = false) {
  const hash = location.hash.slice(1);
  const selected = routeNames.has(hash) ? hash : 'start';
  document.querySelectorAll('.page').forEach(page => { page.hidden = page.id !== `page-${selected}`; });
  document.querySelectorAll('[data-route]').forEach(link => {
    if (link.dataset.route === selected) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  $('sidebar').classList.remove('is-open');
  $('nav-toggle').setAttribute('aria-expanded', 'false');
  if (focus) $('main').focus({ preventScroll: true });
  if (selected === 'connect' && connectionFocus) {
    focusProfileField(connectionFocus.role, connectionFocus.field);
    connectionFocus = undefined;
  }
}
function updateGuidance() {
  const has = kind => artifacts().some(item => item.kind === kind);
  const latestJob = jobs().at(-1);
  let next;
  if (!ready) next = ['start', '실행기 상태 확인', '실행기에 연결한 뒤 현재 입력과 단계별 준비 조건을 확인합니다.'];
  else if (workspaceReadOnly()) next = ['results', '읽기 전용 결과 확인', '이 작업공간에서는 저장·실행할 수 없습니다. 기존 작업 기록과 산출물을 확인하세요.'];
  else if (activeJob()) next = ['pipeline', '진행 기록 확인', '현재 작업이 실행 중입니다. 완료 결과를 확인한 뒤 다음 단계를 결정하세요.'];
  else if (unacknowledgedUnknown()) next = ['pipeline', '결과 불명 적재 확인', '이전 적재의 결과가 불명확합니다. 작업 기록에서 실행 증거와 대상 상태를 확인하고 확인 기록을 남기기 전에는 새 리허설·적재를 시작할 수 없습니다. 읽기 단계는 계속 진행할 수 있습니다.'];
  else if (hasDirtyProfiles()) next = ['connect', '미저장 연결 확인', '화면의 연결 변경을 먼저 저장하세요. 기존에 저장된 값으로 실행하지 않도록 해당 단계를 보류했습니다.'];
  else if (latestJob?.status === 'failed' && latestJob.inputRevision === state.inputRevision) next = ['pipeline', '실패 원인 확인', '최근 작업이 실패했습니다. 작업 기록의 원인·조치를 확인한 뒤 해당 단계를 다시 실행하세요.'];
  else if (!state.profiles?.source || !state.profiles.source.credentialReady) next = ['connect', '원천 DB 연결 준비', '원천 설정과 세션 비밀번호를 저장하세요. 구조 조사에는 대상 DB나 소스 폴더가 필요하지 않습니다.'];
  else if (!has('inventory')) next = ['pipeline', '구조 조사 실행', operationStatus('discover').message];
  else if (!has('profile')) next = ['pipeline', '데이터 품질 분석', operationStatus('profile').message];
  else if (state.inputs?.sourceRoot && !has('appUsage')) next = ['source', '등록 소스 근거 분석', operationStatus('app-scan').message];
  else if (!state.profiles?.target || !state.profiles.target.credentialReady) next = ['connect', '대상 표준 DB 준비', '표준 용어 후보는 대상 DB의 표준 자료를 사용합니다. 대상 설정과 세션 비밀번호를 저장하세요. 소스 근거 분석은 선택 입력입니다.'];
  else if (!has('suggestions') || !ledgerArtifact()) next = ['review', '표준 용어 후보 생성', operationStatus('term-suggest').message];
  else if (ledgerDirty || !has('confirmedLedger')) next = ['review', '용어 검토·기관 확정본 선택', '후보와 소스 근거를 검토하세요. 화면 초안 저장은 기관 확정이 아니며, 매핑에는 기관 Git의 검토 확정본이 필요합니다.'];
  else if (!has('skeleton') || !has('standardColumns')) next = ['review', '매핑 필수 자료 준비', '대상 구조·적재 범위(skeleton)와 대상 컬럼 스냅샷(db_columns.json)을 가져오세요.'];
  else if (!has('mapping')) next = ['pipeline', '확정 원장에서 매핑 생성', operationStatus('mapping-generate').message];
  else if (!has('plan')) next = ['pipeline', '실행 계획 작성', operationStatus('plan').message];
  else if (!state.readiness?.validated || state.operationReadiness?.commit?.blockers?.includes('VALIDATION_REQUIRED')) next = ['pipeline', '현재 계획 검증', operationStatus('validate').message];
  else if (!state.readiness?.dryRun || state.operationReadiness?.commit?.blockers?.includes('DRY_RUN_REQUIRED')) next = ['pipeline', '리허설 준비·실행', operationStatus('dry-run').message];
  else if (state.readiness?.committed) next = ['results', '실행·대사 결과 확인', '실제 적재 결과와 대사·보관 산출물을 확인하세요.'];
  else next = ['pipeline', '최종 적재 조건 확인', operationStatus('commit').message];
  $('guided-message').textContent = next[2];
  $('guided-next').textContent = next[1];
  $('guided-next').href = `#${next[0]}`;
}
function renderCapabilities() {
  const cap = state?.capabilities;
  const container = $('capabilities');
  container.replaceChildren();
  if (!cap) { container.append(element('p', { text: '세부 실행 환경 정보가 없습니다. 작업 실행 전 서버가 도구·입력·권한을 확인합니다.' })); return; }
  for (const [key, label] of [['java', 'Java'], ['cli', '이관 CLI'], ['codex', 'Codex'], ['ai', 'AI 연결']]) {
    if (cap[key] === undefined) continue;
    const value = cap[key];
    const available = value === true || value?.available === true;
    container.append(element('div', { className: 'summary-row' }, element('strong', { text: label }), element('span', { text: available ? '사용 가능' : typeof value === 'string' ? value : value?.message ?? value?.reason ?? '준비·확인 필요', className: available ? 'text-success' : 'text-muted' })));
  }
  if (!container.childElementCount) {
    container.append(element('p', { text: '기존 이관 CLI에 연결된 실행 단계입니다. 실제 시작 시 도구·입력·권한을 확인합니다.' }));
    const list = element('ul');
    for (const operation of cap.operations ?? []) list.append(element('li', { text: operationNames[operation] ?? operation }));
    container.append(list);
  }
}
function evidenceLine(item) {
  const status = { STARTED: '시작만 기록(중단 가능성)', PASS: '통과 기록', FAILED: '실패 기록', UNREADABLE: '읽을 수 없는 증거' }[item.status] ?? '상태 확인 필요';
  return [item.mode ?? '모드 미상', status, item.updatedAt ?? item.startedAt, Number.isSafeInteger(item.written) ? `기록된 적재 ${item.written.toLocaleString()}행` : null, typeof item.sha256 === 'string' ? `SHA-256 ${item.sha256.slice(0, 16)}…` : null].filter(Boolean).join(' · ');
}
// 결과 불명 적재의 사람 확인. 확인 기록은 결과를 성공으로 바꾸거나 적재를 이어 가지 않는다.
function unknownJobPanel(job) {
  const ack = job.acknowledgement;
  const panel = element('div', { className: ack ? 'callout form-stack' : 'callout warning form-stack' });
  if (ack) {
    panel.append(element('strong', { text: '사람 확인 기록됨' }),
      element('p', { className: 'subtext', text: `${typeof ack.at === 'string' ? ack.at : '시각 미상'} · 대조한 실행 증거 ${Array.isArray(ack.evidence) ? ack.evidence.length : 0}개${ack.evidenceLocated === false ? ' · 이 작업의 증거 위치를 알 수 없었습니다' : ''}` }),
      element('p', { text: typeof ack.note === 'string' ? ack.note : '' }),
      element('p', { className: 'subtext', text: '이 기록은 적재 결과를 성공으로 바꾸지 않습니다. 다음 실제 적재 전에는 리허설을 다시 통과해야 합니다.' }));
    return panel;
  }
  panel.append(element('strong', { text: '결과 불명 적재 · 사람 확인 필요' }),
    element('p', { text: '앞서 커밋된 chunk 는 되돌아가지 않으며 전체 복구는 기관 백업·복구 계획을 따릅니다. 실행기는 적재를 자동으로 재개하지 않습니다.' }),
    element('p', { className: 'subtext', text: '실행 증거(.load-*.json)의 STARTED·최종 상태와 대상 DB의 이관 제어 기록(checkpoint)을 확인한 뒤 확인 내용을 기록하세요. 기록하기 전에는 새 리허설·적재를 시작할 수 없고, 읽기 단계는 계속 진행할 수 있습니다.' }));
  const evidenceList = element('ul', { 'aria-label': '이 작업의 실행 증거' });
  const status = element('p', { className: 'subtext', role: 'status' });
  const load = element('button', { type: 'button', className: 'button', text: '실행 증거 불러오기' });
  const noteId = `ack-note-${job.id}`, consentId = `ack-consent-${job.id}`;
  const note = element('textarea', { id: noteId, className: 'input', rows: '3', maxlength: '1000', required: true, placeholder: '예: 증거는 STARTED 에서 멈춤. 대상 제어 기록의 checkpoint 와 행 수를 기관 절차로 확인함.' });
  const consent = element('input', { id: consentId, type: 'checkbox' });
  const submit = element('button', { type: 'button', className: 'button primary', text: '확인 기록 남기기' });
  let evidenceLoaded = false;
  const sync = () => { submit.disabled = busy || !ready || !evidenceLoaded || !consent.checked || !note.value.trim(); };
  load.addEventListener('click', async () => {
    load.disabled = true; status.textContent = '실행 증거를 확인하는 중입니다.';
    try {
      const result = await api.jobEvidence(job.id);
      evidenceList.replaceChildren();
      for (const item of Array.isArray(result.evidence) ? result.evidence : []) evidenceList.append(element('li', { text: evidenceLine(item) }));
      status.textContent = result.evidenceLocated === false ? '이 작업의 증거 위치를 알 수 없습니다. 작업공간의 증거 파일과 대상 DB를 직접 확인하세요.'
        : Array.isArray(result.evidence) && result.evidence.length ? `이 작업이 남긴 실행 증거 ${result.evidence.length}개입니다. 확인 기록에는 각 파일의 SHA-256 이 함께 남습니다.`
          : '이 작업이 남긴 실행 증거가 없습니다. CLI 는 증거를 쓰지 못하면 적재를 시작하지 않지만, 대상 DB 상태를 직접 확인하세요.';
      evidenceLoaded = true;
    } catch (error) { status.textContent = `${error.message}${error.code ? ` (${error.code})` : ''}`; }
    finally { load.disabled = false; sync(); }
  });
  note.addEventListener('input', sync);
  consent.addEventListener('change', sync);
  submit.addEventListener('click', () => mutation(() => api.acknowledge(job.id, { revision: state.revision, note: note.value.trim() }), { success: '확인 기록을 남겼습니다. 실제 적재 전에 리허설을 다시 실행하세요.' }));
  sync();
  panel.append(element('div', { className: 'actions' }, load), status, evidenceList,
    element('label', { className: 'field', for: noteId }, element('span', { text: '확인 내용' }), note),
    element('label', { className: 'check', for: consentId }, consent, element('span', { text: '실행 증거와 대상 DB의 이관 제어 기록을 기관 절차로 확인했습니다. 이 확인은 적재 성공이나 복구 승인이 아닙니다.' })),
    element('div', { className: 'actions' }, submit));
  return panel;
}
function renderJobs() {
  const signature = JSON.stringify(jobs());
  if (signature === previousJobView) return;
  previousJobView = signature;
  const list = $('jobs-list');
  list.replaceChildren();
  if (!jobs().length) { list.append(element('p', { className: 'empty', text: '아직 작업 기록이 없습니다. 위에서 필요한 단계를 실행하세요.' })); return; }
  for (const job of [...jobs()].reverse()) {
    const status = labels[job.status] ?? '상태 확인 필요';
    const tone = job.status === 'succeeded' ? 'good' : ['failed', 'unknown'].includes(job.status) ? 'warning' : 'neutral';
    const heading = element('div', { className: 'job-heading' }, element('strong', { text: operationNames[job.operation] ?? job.operation ?? '작업' }), element('span', { className: `pill ${tone}`, text: status }));
    const item = element('article', { className: 'job-item' }, heading, element('p', { className: 'subtext', text: `작업 ID ${job.id ?? '—'}${job.startedAt ? ` · ${job.startedAt}` : ''}` }));
    const rawCode = job.errorCode ?? job.code;
    const code = typeof rawCode === 'string' && /^[A-Z][A-Z0-9_]{1,79}$/.test(rawCode) ? rawCode : undefined;
    if (code) item.append(element('p', { className: 'status-code', text: code }));
    const failure = Object.hasOwn(jobErrors, code) ? jobErrors[code] : undefined;
    if (failure) {
      item.append(element('p', { text: failure[0] }), element('p', { className: 'subtext', text: failure[1] }));
      if (failure[2]) {
        const roles = ['discover', 'profile'].includes(job.operation) ? ['source'] : job.operation === 'term-suggest' ? ['target'] : ['source', 'target'];
        if (roles.length === 2) item.append(element('p', { className: 'subtext', text: '이 단계에서는 실패한 연결을 단정할 수 없습니다. 원천과 대상 설정을 각각 확인하세요.' }));
        const actions = element('div', { className: 'actions' });
        for (const role of roles) {
          const button = element('button', { type: 'button', className: 'button', text: `${role === 'source' ? '원천' : '대상'} 연결 설정 확인` });
          button.addEventListener('click', () => {
            connectionFocus = { role, field: failure[2] };
            if (location.hash === '#connect') route(true); else location.hash = 'connect';
          });
          actions.append(button);
        }
        item.append(actions);
      }
    } else if (job.status === 'failed') item.append(element('p', { className: 'subtext', text: '실패 원인을 분류하지 못했습니다. 정형 진행 기록과 실행기 준비 상태를 확인하세요.' }));
    const log = Array.isArray(job.events) ? job.events : Array.isArray(job.logs) ? job.logs : [];
    if (log.length) {
      const details = element('details', { className: 'job-events' }, element('summary', { text: `정형 진행 기록 ${log.length}개` }));
      const lines = element('ul', { tabindex: '0', 'aria-label': '정형 진행 기록' });
      for (const entry of log.slice(-100)) {
        if (typeof entry === 'object' && entry !== null) lines.append(element('li', { text: [entry.timestamp ?? entry.at, entry.stage, entry.code, entry.status].filter(value => ['string', 'number'].includes(typeof value)).join(' · ') || '상태 갱신' }));
      }
      details.append(lines); item.append(details);
    }
    if (job.status === 'unknown') item.append(unknownJobPanel(job));
    if (activeStatuses.has(job.status)) {
      const isLoad = ['commit', 'dry-run', 'load'].includes(job.operation);
      const cancel = element('button', { type: 'button', className: 'button', text: isLoad ? '적재 중단은 CLI 복구 절차 확인' : '중단 요청', ...(isLoad ? {} : { 'data-cancel-job': job.id, 'data-status': job.status }) });
      cancel.disabled = busy || isLoad || job.status === 'cancelling';
      if (!isLoad) cancel.addEventListener('click', () => mutation(() => api.cancel(job.id), { success: '중단을 요청했습니다. 실제 중단 상태를 작업 기록에서 확인하세요.' }));
      item.append(cancel);
    }
    list.append(item);
  }
}
function renderArtifacts() {
  const signature = JSON.stringify(artifacts());
  if (signature === previousArtifactView) return;
  previousArtifactView = signature;
  const selected = new Set([...document.querySelectorAll('[name="ai-artifact"]:checked')].map(input => input.value));
  $('artifacts-list').replaceChildren();
  $('ai-artifact-options').replaceChildren();
  if (!artifacts().length) {
    $('artifacts-list').append(element('p', { className: 'empty', text: '아직 산출물이 없습니다. 분석을 실행하거나 검토 파일을 가져오세요.' }));
    $('ai-artifact-options').append(element('p', { className: 'subtext', text: '분석 산출물 준비 후 전송 가능한 문맥을 확인할 수 있습니다.' }));
  }
  for (const item of artifacts()) {
    const id = artifactId(item);
    const view = element('button', { className: 'button', type: 'button', text: '내용 보기' });
    const download = element('button', { className: 'button quiet', type: 'button', text: '다운로드' });
    view.addEventListener('click', () => viewArtifact(item));
    download.addEventListener('click', () => viewArtifact(item, true));
    $('artifacts-list').append(element('article', { className: 'artifact-row' }, element('div', {}, element('strong', { text: artifactLabel(item) }), element('small', { className: 'subtext', text: [item.status, item.sha256 ? `SHA-256 ${item.sha256.slice(0, 16)}…` : null, item.createdAt].filter(Boolean).join(' · ') || '서버에 등록된 산출물' })), element('div', { className: 'actions' }, view, download)));
    if (!['suggestions', 'ledger'].includes(item.kind)) continue;
    const input = element('input', { type: 'checkbox', name: 'ai-artifact', value: id });
    input.checked = selected.has(id);
    input.addEventListener('change', invalidatePreview);
    $('ai-artifact-options').append(element('label', { className: 'check' }, input, element('span', { text: artifactLabel(item) })));
  }
  if (!$('ai-artifact-options').children.length) $('ai-artifact-options').append(element('p', { className: 'subtext', text: '용어 후보나 편집 원장을 준비하면 이름과 후보를 문맥으로 선택할 수 있습니다. 소스 근거는 확장 모드에서 별도로 선택하세요.' }));
  invalidatePreview();
}
function renderState() {
  $('workspace-name').textContent = state.name ?? '레거시 데이터 이관';
  $('workspace-revision').textContent = `저장된 판 ${state.revision} · 로컬 실행기`;
  $('summary-source').textContent = state.profiles?.source?.vendor ?? '설정 필요';
  $('summary-target').textContent = state.profiles?.target?.database ?? '설정 필요';
  $('summary-jobs').textContent = String(jobs().length);
  $('summary-running').textContent = activeJob() ? '실행 중인 작업이 있습니다.' : unacknowledgedUnknown() ? '결과 불명 적재 확인 필요 · 새 리허설·적재 차단' : '실행 중인 작업 없음';
  $('summary-artifacts').textContent = String(artifacts().length);
  $('pipeline-revision').textContent = String(state.revision);
  $('input-summary').textContent = Object.keys(state.inputs ?? {}).length ? displayJson(state.inputs) : '아직 등록된 자료가 없습니다.';
  syncProfiles(state.profiles);
  if (!sourcePathDirty) $('source-path').value = state.inputs?.sourceRoot ?? '';
  if (!ledgerDirty && !ledgerLoadPending && ledgerArtifact() && currentReviewSignature() !== reviewSignature && currentReviewSignature() !== ledgerFailedSignature) void loadLedger(false);
  if (ledgerDirty && reviewStale()) feedback('ledger-feedback', '서버 원장 또는 후보가 바뀌었습니다. 미저장 입력은 보존했습니다. 필요한 내용을 복사한 뒤 서버 원장·후보를 다시 불러오세요.', true);
  if (state.ai) { aiStatus = state.ai; renderAiStatus(); }
  renderCapabilities(); renderJobs(); renderArtifacts(); updateGuidance(); updateButtons();
  if ($('ai-mode').value === 'expanded' && excerptDigest !== state.artifacts?.appUsage?.sha256 && !excerptLoading) void loadExcerptEvidence();
}
async function refreshState(reportError = true) {
  if (polling) return;
  polling = true;
  const generation = stateRequestGeneration;
  try {
    const next = await api.state();
    if (generation !== stateRequestGeneration) return;
    if (!Number.isSafeInteger(next.revision) || next.schemaVersion !== 1) throw new Error('지원하지 않는 작업공간 형식입니다. 실행기 버전을 확인하세요.');
    if (state && state.revision !== next.revision) invalidatePreview();
    state = next; ready = true;
    $('connection-state').textContent = '로컬 실행기 연결됨';
    $('connection-state').className = 'pill good';
    renderState();
  } catch (error) { if (generation !== stateRequestGeneration) return; ready = false; updateButtons(); if (reportError) showError(error); }
  finally { polling = false; }
}
async function runOperation(operation, options = {}, target) {
  const availability = operationStatus(operation);
  if (!availability.ready) { showError(new Error(availability.message), target); return; }
  const revision = state?.revision;
  const key = `${operation}:${revision}:${JSON.stringify(options)}`;
  if (!requestKeys.has(key)) requestKeys.set(key, crypto.randomUUID());
  return mutation(() => api.job({ revision, requestId: requestKeys.get(key), operation, options }), {
    target, success: `${operationNames[operation] ?? operation} 작업을 요청했습니다. 완료 상태는 작업 기록에서 확인하세요.`,
    after: () => { location.hash = 'pipeline'; },
  });
}
function parseLedger(text) {
  const value = JSON.parse(text);
  if (value?.schemaVersion !== 2 || !Array.isArray(value.entries) || value.entries.some(entry => !entry || typeof entry !== 'object')) throw new Error('schemaVersion: 2와 entries 배열을 가진 원장이 필요합니다.');
  return value;
}
function termLabel(term) { return term ? [term.name ?? term.termName, term.engAbbr, term.domain].filter(Boolean).join(' · ') : '선택한 용어 없음'; }
function sameTerm(term, candidate) { return term && term.name === candidate.termName && term.engAbbr === candidate.engAbbr && term.domain === candidate.domain; }
function markReviewChanged() {
  $('ledger-editor').value = JSON.stringify(reviewLedger, null, 2);
  ledgerDirty = true; ledgerEditGeneration += 1;
  feedback('ledger-feedback', '아직 저장하지 않은 원장 초안입니다. 용어 선택은 확정이나 승인으로 처리되지 않습니다.');
}
function renderTermReview() {
  const container = $('term-review-table');
  container.replaceChildren();
  const entries = reviewLedger?.entries ?? [];
  $('term-pagination').hidden = entries.length <= 25;
  if (!reviewLedger) { $('term-review-summary').textContent = '용어 후보 생성 후 서버 원장과 근거를 불러오세요.'; return; }
  reviewPage = Math.min(reviewPage, Math.max(0, Math.ceil(entries.length / 25) - 1));
  const start = reviewPage * 25;
  const viewLabel = reviewLoadedKind === 'confirmedLedger' ? '기관 확정본 보기' : '편집용 초안 보기';
  $('term-review-summary').textContent = `${viewLabel} · 전체 ${entries.length}개 · 선택 가능한 PROPOSED ${entries.filter(entry => entry.status === 'PROPOSED').length}개 · ${reviewColumns.length ? '실제 후보 보고서 연결됨' : '후보 보고서 없음 · 원장 현재값만 표시'}${state?.artifacts?.confirmedLedger && reviewLoadedKind !== 'confirmedLedger' ? ' · 기관 확정본은 별도 보존되며 매핑 생성에 사용됩니다.' : ''}`;
  $('term-page-label').textContent = `${entries.length ? start + 1 : 0}–${Math.min(entries.length, start + 25)} / ${entries.length}`;
  $('term-page-previous').disabled = reviewPage === 0;
  $('term-page-next').disabled = start + 25 >= entries.length;
  if (!entries.length) { container.append(element('p', { className: 'empty', text: '원장에 컬럼 항목이 없습니다.' })); return; }
  const table = element('table', { className: 'term-table' }, element('caption', { className: 'visually-hidden', text: '원천 컬럼별 표준 후보와 근거 검토' }));
  table.append(element('thead', {}, element('tr', {}, ...['원천·상태', '표준 용어 후보', '선택 근거', '검토 메모'].map(text => element('th', { scope: 'col', text })))));
  const body = element('tbody');
  entries.slice(start, start + 25).forEach((entry, offset) => {
    const index = start + offset;
    const name = [entry.source?.table, entry.source?.column].filter(Boolean).join('.') || entry.id || `원장 항목 ${index + 1}`;
    const report = reviewColumns.find(column => column.table === entry.source?.table && column.column === entry.source?.column);
    const candidates = (report?.candidates ?? []).filter(candidate => candidate && typeof candidate.termName === 'string' && typeof candidate.engAbbr === 'string' && typeof candidate.domain === 'string');
    const editable = entry.status === 'PROPOSED';
    const selector = element('select', { id: `term-candidate-${index}`, className: 'input', 'data-review-edit': true, 'data-locked': String(!editable) });
    selector.append(element('option', { value: 'current', text: `원장 현재값: ${termLabel(entry.term)}` }), element('option', { value: 'pending', text: '선택 보류 · 용어 비움 (초안 유지)' }));
    candidates.forEach((candidate, i) => selector.append(element('option', { value: String(i), text: termLabel(candidate) })));
    selector.append(element('option', { disabled: true, text: '이관 제외·보관은 별도 기관 검토 필요' }));
    const selected = candidates.findIndex(candidate => sameTerm(entry.term, candidate));
    selector.value = selected >= 0 ? String(selected) : 'current';
    const evidence = element('div', { className: 'term-evidence', id: `term-evidence-${index}` });
    const evidenceLabels = { NAME_ENG_ABBR: '영문 약어 일치', COMMENT_TERM_NAME: 'DB 설명의 표준 용어', COMMENT_SYNONYM: 'DB 설명의 동의어', COMMENT_WORDS: 'DB 설명의 단어', USAGE_TERM_NAME: '소스 사용처의 표준 용어', USAGE_SYNONYM: '소스 사용처의 동의어', USAGE_WORDS: '소스 사용처의 단어' };
    const showEvidence = candidate => {
      evidence.replaceChildren(element('p', { text: candidate ? `후보 등급 ${candidate.grade ?? '미분류'}` : '현재 선택과 일치하는 후보 근거가 없습니다.' }));
      if (candidate?.evidence?.length) evidence.append(element('ul', {}, ...candidate.evidence.map(code => element('li', { text: evidenceLabels[code] ?? code }))));
      if (candidate?.conformance?.rate != null) evidence.append(element('p', { text: `분석 당시 도메인 적합률 ${candidate.conformance.rate}% · 재검증 필요` }));
      if (report?.conflicts?.length) evidence.append(element('p', { className: 'text-danger', text: `충돌: ${report.conflicts.join(' · ')}` }));
    };
    showEvidence(candidates[selected]);
    const originalTerm = structuredClone(entry.term ?? null);
    selector.addEventListener('change', () => {
      if (!editable || ledgerJsonPending || reviewStale()) return;
      const candidate = candidates[Number(selector.value)];
      if (selector.value === 'current') entry.term = structuredClone(originalTerm);
      else if (selector.value === 'pending') entry.term = null;
      else if (candidate) entry.term = { ...(entry.term ?? {}), name: candidate.termName, engAbbr: candidate.engAbbr, domain: candidate.domain };
      showEvidence(selector.value === 'current' ? candidates.find(item => sameTerm(originalTerm, item)) : candidate);
      markReviewChanged();
    });
    const note = element('textarea', { id: `term-note-${index}`, className: 'input', rows: '3', 'data-review-edit': true, 'data-locked': String(!editable) });
    note.value = entry.note ?? '';
    note.addEventListener('input', () => { if (!editable || ledgerJsonPending || reviewStale()) return; entry.note = note.value; markReviewChanged(); });
    const sourceCell = element('th', { scope: 'row', 'data-label': '원천·상태' }, element('strong', { text: name }), element('small', { className: 'subtext', text: entry.status ?? '상태 없음' }), !editable ? element('small', { className: 'subtext', text: '기관 검토 상태 보존 · 표에서 편집 불가' }) : null);
    body.append(element('tr', {}, sourceCell,
      element('td', { 'data-label': '표준 용어 후보' }, element('label', { for: selector.id, className: 'visually-hidden', text: `${name} 표준 용어 후보` }), selector, element('small', { className: 'subtext', text: candidates.length ? `같은 원천 컬럼의 후보 ${candidates.length}개` : '일치하는 후보 없음 · 표준 등록·제외는 별도 검토' })),
      element('td', { 'data-label': '선택 근거' }, evidence),
      element('td', { 'data-label': '검토 메모' }, element('label', { for: note.id, className: 'visually-hidden', text: `${name} 검토 메모` }), note)));
  });
  table.append(body); container.append(table); updateButtons();
}
async function loadLedger(manual = true) {
  if (ledgerLoadPending || (!manual && ledgerDirty)) return;
  if (ledgerDirty && !window.confirm('현재 편집 중인 원장 초안을 서버 파일로 바꿀까요? 저장하지 않은 편집은 사라집니다.')) return;
  const item = ledgerArtifact();
  if (!item) { if (manual) feedback('ledger-feedback', '저장된 JSON 원장 파일이 없습니다. 용어 후보를 생성하거나 형식 2 JSON 파일을 가져오세요.', true); return; }
  const generation = ledgerEditGeneration, signature = currentReviewSignature();
  ledgerLoadPending = true; updateButtons();
  try {
    const suggestions = artifacts().find(value => value.kind === 'suggestions');
    const [ledgerResult, suggestionResult] = await Promise.allSettled([api.artifact(artifactId(item)), suggestions ? api.artifact(artifactId(suggestions)) : Promise.resolve(null)]);
    if (ledgerResult.status !== 'fulfilled') throw ledgerResult.reason;
    const nextLedger = parseLedger(ledgerResult.value.content);
    let nextColumns = [];
    if (suggestionResult.status === 'fulfilled' && suggestionResult.value) {
      const report = JSON.parse(suggestionResult.value.content);
      nextColumns = report.payload?.columns ?? report.columns ?? [];
      if (!Array.isArray(nextColumns)) throw new Error('후보 보고서의 컬럼 목록 형식을 확인하세요.');
    }
    if (generation !== ledgerEditGeneration || signature !== currentReviewSignature()) {
      if (manual) feedback('ledger-feedback', '불러오는 동안 입력 또는 서버 자료가 바뀌어 기존 편집을 보존했습니다. 다시 불러오세요.', true);
      return;
    }
    reviewLedger = nextLedger; reviewLoadedKind = item.kind; reviewColumns = nextColumns; reviewSignature = signature;
    $('ledger-editor').value = JSON.stringify(nextLedger, null, 2);
    ledgerDirty = false; ledgerLoaded = true; ledgerJsonPending = false; reviewPage = 0;
    renderTermReview();
    feedback('ledger-feedback', suggestionResult.status === 'rejected' ? '원장을 불러왔지만 후보 보고서를 읽지 못했습니다. 후보 없이 현재값을 표시합니다.' : '실제 서버 원장과 후보를 불러왔습니다. 변경은 초안으로 저장하세요.', suggestionResult.status === 'rejected');
  } catch (error) { ledgerFailedSignature = signature; showError(error, 'ledger-feedback'); }
  finally { ledgerLoadPending = false; updateButtons(); }
}
async function viewArtifact(item, download = false) {
  try {
    const result = await api.artifact(artifactId(item));
    const content = result.content ?? result.text ?? result;
    const text = typeof content === 'string' ? content : displayJson(content);
    if (download) {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const extension = result.format === 'json' ? 'json' : result.format === 'yaml' ? 'yml' : 'txt';
      const link = element('a', { href: url, download: `${artifactId(item).replace(/[^a-zA-Z0-9._-]/g, '_')}.${extension}` });
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      $('artifact-viewer-title').textContent = artifactLabel(item);
      $('artifact-viewer').textContent = text;
      $('artifact-viewer-panel').hidden = false;
      $('artifact-viewer').focus();
    }
  } catch (error) { showError(error); }
}
function invalidatePreview() {
  previewGeneration += 1;
  aiPreview = undefined;
  $('ai-consent').checked = false;
  $('ai-preview-panel').hidden = true;
  updateButtons();
}
function renderExcerptChoices() {
  const query = $('ai-excerpt-filter').value.trim().toLocaleLowerCase();
  const chosen = new Set(selectedExcerpts.map(item => item.key));
  const matching = excerptEvidence.filter(item => !chosen.has(item.key) && `${item.path} ${item.column} ${item.kind}`.toLocaleLowerCase().includes(query));
  $('ai-excerpt-choice').replaceChildren(element('option', { value: '', text: '분석된 소스 위치를 선택하세요' }));
  for (const item of matching.slice(0, 100)) $('ai-excerpt-choice').append(element('option', { value: item.key, text: `${item.path}:${item.line} · ${item.column} · ${item.kind}` }));
  $('ai-excerpt-choice-hint').textContent = `추가 가능한 근거 ${matching.length}개 중 ${Math.min(matching.length, 100)}개 표시 · 현재 선택 ${selectedExcerpts.length}/5개${matching.length > 100 ? ' · 경로·컬럼 검색으로 범위를 좁히세요.' : ''}`;
  updateButtons();
}
function renderSelectedExcerpts() {
  $('ai-excerpt-selected').replaceChildren();
  for (const [index, item] of selectedExcerpts.entries()) {
    const count = element('input', { id: `ai-excerpt-count-${index}`, className: 'input', type: 'number', min: '1', max: '40', step: '1', required: true, 'aria-describedby': 'ai-excerpt-hint' });
    count.value = item.lineCount;
    count.addEventListener('input', () => {
      item.lineCount = count.value === '' ? null : Number(count.value);
      count.setAttribute('aria-invalid', String(!Number.isSafeInteger(item.lineCount) || item.lineCount < 1 || item.lineCount > 40));
      invalidatePreview();
      feedback('ai-excerpt-feedback', validExcerpts() ? '발췌 범위가 바뀌었습니다. 전송 내용을 다시 확인하세요.' : '각 근거의 행 수는 1–40의 정수여야 합니다.', !validExcerpts());
    });
    const remove = element('button', { type: 'button', className: 'button quiet', text: '선택 해제', 'aria-label': `${item.path}:${item.line} 발췌 선택 해제` });
    remove.addEventListener('click', () => { selectedExcerpts = selectedExcerpts.filter(selected => selected.key !== item.key); renderSelectedExcerpts(); renderExcerptChoices(); invalidatePreview(); $('ai-excerpt-choice').focus(); });
    $('ai-excerpt-selected').append(element('div', { className: 'excerpt-row' }, element('div', {}, element('strong', { text: item.path }), element('small', { className: 'subtext', text: `분석 근거 ${item.line}행부터 · ${item.column} · ${item.kind}` })), element('label', { for: count.id, className: 'field' }, element('span', { text: '발췌할 행 수' }), count), remove));
  }
}
async function loadExcerptEvidence(force = false) {
  if (excerptLoading || (!force && excerptDigest === state?.artifacts?.appUsage?.sha256)) return;
  const digest = state?.artifacts?.appUsage?.sha256;
  if (excerptDigest !== digest) {
    excerptEvidence = []; selectedExcerpts = []; excerptDigest = digest;
    renderSelectedExcerpts(); renderExcerptChoices(); invalidatePreview();
  }
  if (!digest) { feedback('ai-excerpt-feedback', '등록 소스 분석(app-scan) 결과가 필요합니다. 소스·스키마 자료에서 먼저 분석하세요.'); return; }
  excerptLoading = true; updateButtons();
  try {
    const result = await api.artifact('appUsage');
    const report = JSON.parse(result.content);
    const unique = new Map();
    for (const column of report.payload?.columns ?? []) for (const usage of column.usages ?? []) {
      if (typeof usage.path !== 'string' || !Number.isSafeInteger(usage.line) || usage.line < 1) continue;
      const key = JSON.stringify([usage.path, usage.line]);
      if (!unique.has(key)) unique.set(key, { key, path: usage.path, line: usage.line, kind: String(usage.kind ?? '근거'), column: String(column.column ?? '') });
    }
    if (digest !== state?.artifacts?.appUsage?.sha256) return;
    excerptEvidence = [...unique.values()]; excerptDigest = digest;
    renderExcerptChoices();
    feedback('ai-excerpt-feedback', excerptEvidence.length ? '실제 소스 분석 위치를 불러왔습니다. 선택만으로 원문을 읽거나 외부 AI에 보내지 않습니다.' : '소스 분석 결과에 선택 가능한 컬럼 사용처가 없습니다. 분석 범위와 부분 분석 보고서를 확인하세요.');
  } catch (error) { showError(error, 'ai-excerpt-feedback'); }
  finally { excerptLoading = false; updateButtons(); }
}
function renderPreviewExclusions(result) {
  const names = { LITERAL_OR_SENSITIVE_EXCERPT_WITHHELD: '리터럴 또는 민감정보 가능성이 있어 소스 발췌를 보류했습니다.', SENSITIVE_NAME_WITHHELD: '민감정보 가능성이 있는 이름을 제외했습니다.', ARTIFACT_NOT_IN_CONTEXT_ALLOWLIST: '외부 문맥 허용 목록에 없는 산출물을 제외했습니다.', JSON_CONTEXT_REQUIRED: 'JSON 문맥으로 읽을 수 없는 산출물을 제외했습니다.', USE_RULE_CANDIDATES_FOR_APPROVED_NAMES: '전체 구조 대신 승인된 규칙 후보의 이름만 사용합니다.' };
  const exclusions = Array.isArray(result.excluded) ? result.excluded : [];
  const list = element('ul');
  for (const item of exclusions) list.append(element('li', { text: names[item.reason] ?? item.reason ?? '서버 사전 검사에서 제외했습니다.' }));
  $('ai-exclusion-summary').replaceChildren(element('p', { text: `미리보기에 포함된 소스 발췌 ${result.context?.excerpts?.length ?? 0}개 · 사전 검사 제외 ${exclusions.length}건` }), list);
}
function renderAiStatus() {
  if (!aiStatus) return;
  const authentication = JSON.stringify([aiStatus.provider, aiStatus.authenticated, aiStatus.login?.state]);
  if (lastAiAuthentication !== undefined && lastAiAuthentication !== authentication) { invalidatePreview(); aiProposal = undefined; $('ai-proposal-panel').hidden = true; }
  lastAiAuthentication = authentication;
  const apiMode = aiStatus.provider === 'openai-api';
  const loginState = aiStatus.login?.state ?? 'idle';
  const authStates = { pending: '공식 로그인 대기 중', failed: '로그인 실패', cancelled: '로그인 취소됨' };
  $('ai-status').textContent = aiStatus.authenticated === true ? (apiMode ? 'API 인증 확인됨' : '계정 인증됨') : !apiMode && authStates[loginState] ? authStates[loginState] : aiStatus.available === false ? '실행 환경 준비 필요' : apiMode ? 'API 인증 확인 전' : '인증 필요';
  $('ai-status').className = `pill ${aiStatus.authenticated === true ? 'good' : 'neutral'}`;
  $('ai-auth-description').textContent = loginState === 'pending' ? '공식 로그인 페이지에서 인증을 완료하세요. 실행기가 완료 여부를 자동 확인합니다.' : aiStatus.authenticated ? '실행기가 현재 인증 상태를 확인했습니다. 기관 자료 전송 승인은 아래에서 별도로 확인합니다.' : apiMode ? 'API 키 저장만으로 인증 성공을 표시하지 않습니다. 아래 합성 문구 연결 검사로 실제 인증과 응답을 확인하세요.' : '공식 로그인 또는 현재 계정 연결 확인으로 인증 상태를 확인하세요. 계정 인증에는 기관 자료를 보내지 않습니다.';
  $('ai-logout').textContent = apiMode ? '현재 세션 API 키 해제' : '로그아웃';
  renderLoginLink(loginState === 'pending' ? aiStatus.login?.loginUrl : undefined);
  const test = aiStatus.connectionTest ?? { status: 'idle' };
  const testState = aiConnectionTesting ? 'running' : test.status;
  const testLabels = { idle: '아직 검사하지 않음', running: '실제 모델 응답 확인 중', passed: '연결 검사 통과', failed: '연결 검사 실패' };
  $('ai-test-status').textContent = testLabels[testState] ?? '검사 상태 확인 필요';
  $('ai-test-status').className = `pill ${testState === 'passed' ? 'good' : testState === 'failed' ? 'warning' : 'neutral'}`;
  $('ai-test-status').setAttribute('aria-busy', String(testState === 'running'));
  $('ai-test-provider').textContent = `${apiMode ? 'OpenAI API' : '공식 Codex'}${aiStatus.model ? ` · ${aiStatus.model}` : ''}`;
  $('ai-test-prompt').textContent = aiStatus.testPrompt ?? '실행기가 검사 문구를 제공하지 않았습니다.';
  $('ai-test-details').textContent = [test.checkedAt ? `확인 시각 ${test.checkedAt}` : null, codeGuidance(test.code), test.message, aiStatus.testAvailable !== true ? `검사 준비 필요: ${codeGuidance(aiStatus.testBlockedReason) ?? '실행기 상태 확인 필요'}` : null].filter(Boolean).join(' · ');
  $('ai-approval-status').textContent = aiStatus.approval?.valid ? '기관 전송 승인 확인됨' : '기관 전송 승인 필요';
  $('ai-approval-status').className = `pill ${aiStatus.approval?.valid ? 'good' : 'warning'}`;
  $('ai-workspace-id').textContent = aiStatus.workspaceId ?? '실행기 확인 필요';
  $('ai-policy-version').textContent = aiStatus.policy ?? '실행기 확인 필요';
  $('ai-inference-status').replaceChildren(element('strong', { text: aiStatus.inferenceAvailable === true ? '기관 자료로 제안 요청 가능' : '기관 자료로 제안 요청 차단·준비 필요' }), element('p', { text: [codeGuidance(aiStatus.blockedReason), aiStatus.approval?.valid ? '기관 승인 확인됨' : `기관 승인 확인 필요: ${aiStatus.approval?.reason ?? '승인 상태 미확인'}`, aiStatus.message].filter(Boolean).join(' · ') }));
  if (!providerDirty) {
    $('ai-provider').value = aiStatus.provider ?? 'codex';
    const apiMode = aiStatus.provider === 'openai-api';
    $('api-provider-fields').hidden = !apiMode;
    $('ai-api-key').required = apiMode;
    $('ai-model').required = apiMode;
    if (apiMode && aiStatus.model) $('ai-model').value = aiStatus.model;
  }
  if (!readPlanDirty) {
    const plan = aiStatus.readPlan;
    document.querySelectorAll('[name="read-operation"]').forEach(input => { input.checked = !!plan?.operations?.includes(input.value); });
    $('ai-profile-row-limit').value = Number.isSafeInteger(plan?.profileRowLimit) ? String(plan.profileRowLimit) : '';
    syncProfileRowLimit();
    $('ai-read-plan-result').hidden = !plan;
    if (plan) $('ai-read-plan-result').textContent = displayJson(readPlanView(plan));
  }
}
function readPlanView(plan) {
  return { operations: plan.operations, profileRowLimit: plan.profileRowLimit, inputRevision: plan.inputRevision, provider: plan.provider, expires: plan.expires };
}
// 데이터 품질 집계(profile)를 고르면 표당 행 한도가 필수가 된다. 고르지 않으면 숨기고 보내지 않는다(서버는 profile 없는 한도를 거부한다).
function syncProfileRowLimit() {
  const required = !!document.querySelector('[name="read-operation"][value="profile"]')?.checked;
  $('ai-profile-row-limit-field').hidden = !required;
  $('ai-profile-row-limit').required = required;
  $('ai-profile-row-limit').disabled = !required;
}
function profileRowLimitValue() {
  const input = $('ai-profile-row-limit'), text = input.value.trim(), value = Number(text);
  return /^[1-9][0-9]*$/.test(text) && Number.isSafeInteger(value) && value >= Number(input.min) && value <= Number(input.max) ? value : undefined;
}
function renderLoginLink(value) {
  const link = $('ai-login-link');
  link.hidden = true; link.removeAttribute('href');
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && ['auth.openai.com', 'chatgpt.com'].includes(url.hostname) && !url.username && !url.password && !url.port) { link.href = url.href; link.hidden = false; }
  } catch { /* Authentication URLs stay ephemeral and only exact official hosts are offered. */ }
}
function resetAiAuthorizationUi() {
  invalidatePreview(); aiProposal = undefined; $('ai-proposal-panel').hidden = true;
  $('ai-apply-consent').checked = false; readPlanDirty = false;
  $('ai-api-key').value = '';
}
async function refreshAi() {
  try { aiStatus = await api.aiStatus(); renderAiStatus(); updateButtons(); }
  catch (error) { showError(error, 'ai-login-result'); }
}
function commitIdentifier() { return `COMMIT ${state?.profiles?.target?.database ?? ''}`; }
function openLoad(operation = 'commit') {
  const availability = operationStatus(operation);
  if (!availability.ready) { showError(new Error(availability.message)); return; }
  const target = state?.profiles?.target;
  if (!target) { showError(new Error('먼저 대상 DB 설정을 저장하세요.')); return; }
  loadOperation = operation;
  const commit = operation === 'commit';
  commitRevision = state.revision;
  $('commit-form').reset();
  $('commit-only').hidden = !commit;
  for (const id of ['commit-target-check', 'commit-backup-check', 'commit-archive', 'commit-confirm-name']) $(id).required = commit;
  $('load-eyebrow').textContent = commit ? 'TARGET WRITE' : 'DRY RUN';
  $('commit-title').textContent = commit ? '이 대상에 실제 적재를 요청할까요?' : '현재 계획으로 리허설을 요청할까요?';
  $('commit-description').textContent = commit ? '대상 DB의 업무 데이터와 이관 제어 기록이 변경될 수 있습니다. 아래 정보와 승인 조건을 확인하세요.' : '기존 CLI의 dry-run 계약으로 실행합니다. 원천 읽기와 대상 연결이 필요하며, adapter와 원천 freeze 조건을 확인해야 합니다.';
  $('load-submit').textContent = commit ? '실제 적재 요청' : '리허설 요청';
  $('load-adapter').value = { postgresql: 'postgresql-pg-catalog', oracle: 'oracle-catalog', mysql: 'mysql-catalog', mariadb: 'mariadb-catalog', sqlserver: 'sqlserver-catalog' }[state.profiles?.source?.vendor] ?? '';
  $('load-driver-hash').required = state.profiles?.source?.vendor !== 'postgresql';
  feedback('commit-feedback', '');
  const plan = artifacts().find(item => item.kind === 'plan');
  $('commit-summary').textContent = displayJson({ target: { vendor: target.vendor, host: target.host, port: target.port, database: target.database, schema: target.schema, endpointId: target.endpointId }, workspaceRevision: commitRevision, plan: plan ? { id: artifactId(plan), sha256: plan.sha256 ?? '서버 확인 필요' } : '실행 계획 없음 · 서버 검증 필요', ...(commit ? { confirmationIdentifier: commitIdentifier() } : {}), effect: commit ? '계획 범위의 대상 데이터와 이관 제어 기록 쓰기' : 'DRY_RUN 계약에 따른 계획·적재 준비 확인' });
  $('commit-dialog').showModal();
}

createProfiles((role, profile, password, submittedGeneration, credentialAction) => mutation(() => api.profile({ revision: state.revision, role, profile, credentialAction, ...(password ? { password } : {}) }), { target: `${role}-profile-feedback`, success: '제출한 연결 설정을 저장했습니다. 저장 중 추가한 입력은 유지되며 별도 저장이 필요합니다.', after: () => profileSaved(role, submittedGeneration) }));
chatUi = createChatUi({
  getContext: () => ({ revision: state?.revision, state, aiStatus, busy, ready }),
  sendChat: payload => api.aiChat(payload),
  resetChat: () => api.aiChatReset(),
  navigate: selected => { if (routeNames.has(selected)) location.hash = selected; },
});
for (const [operation, step, title, description] of operations) {
  $('operations').append(element('article', { className: 'operation-card' }, element('span', { className: 'step-number', text: step }), element('h2', { text: title }), element('p', { text: description }), element('button', { type: 'button', className: 'button', 'data-operation': operation, text: `${title} 실행` })));
}
document.querySelectorAll('[data-operation]').forEach((button, index) => {
  const reason = element('p', { id: `operation-reason-${index}`, className: 'subtext', 'data-operation-reason': button.dataset.operation });
  button.setAttribute('aria-describedby', reason.id);
  (button.closest('.actions') ?? button).after(reason);
  button.addEventListener('click', () => button.dataset.operation === 'dry-run' ? openLoad('dry-run') : runOperation(button.dataset.operation));
});
$('mode-direct').addEventListener('click', () => setMode('direct'));
$('mode-guided').addEventListener('click', () => setMode('guided'));
$('start-direct').addEventListener('click', () => { setMode('direct'); location.hash = 'connect'; });
$('start-guided').addEventListener('click', () => { setMode('guided'); location.hash = 'connect'; });
$('nav-toggle').addEventListener('click', () => { const open = $('sidebar').classList.toggle('is-open'); $('nav-toggle').setAttribute('aria-expanded', String(open)); });
window.addEventListener('hashchange', () => route(true));
$('refresh-state').addEventListener('click', async () => {
  try { await openSession(); await refreshState(); await refreshAi(); } catch (error) { showError(error); }
});
$('source-folder-form').addEventListener('submit', event => {
  event.preventDefault();
  const path = $('source-path').value.trim();
  const generation = sourcePathGeneration;
  mutation(() => api.input({ revision: state.revision, kind: 'folder', path }), { target: 'source-folder-feedback', success: '제출한 소스 폴더를 등록했습니다. 소스 분석은 별도로 실행하세요.', after: () => { if (sourcePathGeneration === generation) sourcePathDirty = false; } });
});
$('source-path').addEventListener('input', () => { sourcePathDirty = true; sourcePathGeneration += 1; updateButtons(); });
$('profile-forms').addEventListener('input', updateButtons);
$('confirmed-ledger-form').addEventListener('submit', event => {
  event.preventDefault();
  mutation(() => api.input({ revision: state.revision, kind: 'confirmed-ledger', path: $('confirmed-ledger-path').value.trim() }), { target: 'confirmed-ledger-feedback', success: '확정 원장 경로를 등록했습니다. 기존 CLI의 확인 절차가 이어집니다.' });
});
function handleUpload(event, kindId, fileId, feedbackId) {
  event.preventDefault();
  const file = $(fileId).files[0];
  if (!file) { feedback(feedbackId, '가져올 파일을 먼저 선택하세요.', true); return; }
  const kind = $(kindId).value;
  mutation(() => api.upload(kind, file, state.revision), { target: feedbackId, after: result => {
    if ($(fileId).files[0] !== file || $(kindId).value !== kind) {
      feedback(feedbackId, '이전 요청 자료를 처리했습니다. 기다리는 동안 바꾼 파일 선택은 유지했습니다. 현재 선택은 별도로 가져오세요.');
      return;
    }
    $(fileId).value = '';
    if (kind === 'zip') {
      zipPreview = result;
      $('zip-preview-summary').textContent = `항목 ${result.entries ?? result.files?.length ?? '—'}개 · 해제 예상 ${Number(result.bytes ?? 0).toLocaleString()} bytes · 제외 ${Array.isArray(result.skipped) ? result.skipped.length : result.skipped ?? 0}개${result.truncated ? ' · 목록은 처음 200개만 표시합니다.' : ''}`;
      $('zip-preview-files').replaceChildren();
      for (const item of result.files ?? []) $('zip-preview-files').append(element('div', { className: 'summary-row' }, element('span', { text: item.name }), element('span', { className: 'subtext', text: `${item.size ?? 0} bytes${item.excluded ? ' · 제외' : ' · 포함'}` })));
      $('zip-preview-panel').hidden = false;
      feedback(feedbackId, 'ZIP 목록을 검사했습니다. 아래 범위를 확인한 뒤 명시적으로 압축 해제를 요청하세요.');
    } else feedback(feedbackId, kind === 'ddl' ? `DDL 초안 자료를 가져왔습니다. 실DB inventory가 아니며 미지원 항목 ${result.unsupportedCount ?? result.unsupported?.length ?? '서버 결과 참조'}개를 확인하세요.` : '파일을 가져왔습니다. 등록 결과와 후속 검토 사항을 확인하세요.');
  } });
}
$('source-upload-form').addEventListener('submit', event => handleUpload(event, 'source-upload-kind', 'source-upload-file', 'source-upload-feedback'));
$('artifact-upload-form').addEventListener('submit', event => handleUpload(event, 'artifact-kind', 'artifact-file', 'artifact-upload-feedback'));
$('zip-extract').addEventListener('click', () => {
  if (!zipPreview) return;
  mutation(() => api.input({ revision: state.revision, kind: 'zip', previewId: zipPreview.previewId }), { target: 'zip-preview-feedback', success: '확인한 ZIP을 로컬 작업 영역에 준비했습니다. 소스 분석은 별도로 실행하세요.', after: () => { zipPreview = undefined; $('zip-preview-panel').hidden = true; } });
});
$('source-upload-file').addEventListener('change', () => { zipPreview = undefined; $('zip-preview-panel').hidden = true; updateButtons(); });
$('source-upload-kind').addEventListener('change', () => { zipPreview = undefined; $('zip-preview-panel').hidden = true; updateButtons(); });
$('load-ledger').addEventListener('click', () => loadLedger());
$('ledger-editor').addEventListener('input', () => {
  if (!ledgerLoaded && !ledgerDirty) reviewSignature = currentReviewSignature();
  ledgerDirty = true; ledgerJsonPending = true; ledgerEditGeneration += 1;
  feedback('ledger-feedback', 'JSON 편집 중입니다. 표 편집을 이어가려면 편집한 JSON을 표에 반영하세요.'); updateButtons();
});
$('parse-ledger').addEventListener('click', () => {
  try { reviewLedger = parseLedger($('ledger-editor').value); ledgerJsonPending = false; renderTermReview(); feedback('ledger-feedback', '편집한 JSON을 표에 반영했습니다. 아직 저장하지 않은 초안입니다.'); }
  catch (error) { showError(error, 'ledger-feedback'); }
});
$('term-page-previous').addEventListener('click', () => { reviewPage -= 1; renderTermReview(); $('term-review-summary').scrollIntoView({ block: 'nearest' }); });
$('term-page-next').addEventListener('click', () => { reviewPage += 1; renderTermReview(); $('term-review-summary').scrollIntoView({ block: 'nearest' }); });
$('ledger-form').addEventListener('submit', event => {
  event.preventDefault();
  if (reviewStale()) { feedback('ledger-feedback', '서버 자료가 바뀌어 덮어쓰기를 막았습니다. 미저장 편집을 보존한 뒤 서버 원장·후보를 다시 불러오세요.', true); return; }
  const submittedText = $('ledger-editor').value;
  let ledger;
  try { ledger = parseLedger(submittedText); } catch (error) { feedback('ledger-feedback', `JSON 형식을 확인해 주세요. ${error.message} 편집 내용은 유지됩니다.`, true); $('ledger-advanced').open = true; $('ledger-editor').focus(); return; }
  mutation(() => api.ledger({ revision: state.revision, ledger }), { target: 'ledger-feedback', success: '제출한 초안을 저장했습니다. 이후 편집 내용은 별도 저장이 필요하며 검증·확정은 별도입니다.', after: result => {
    reviewSignature = JSON.stringify([result.artifacts?.ledger?.sha256 ?? null, result.artifacts?.suggestions?.sha256 ?? null]);
    if ($('ledger-editor').value === submittedText) { ledgerDirty = false; ledgerJsonPending = false; reviewLedger = ledger; reviewLoadedKind = 'ledger'; ledgerLoaded = true; renderTermReview(); }
  } });
});
$('close-artifact').addEventListener('click', () => { $('artifact-viewer-panel').hidden = true; $('main').focus(); });
$('ai-refresh').addEventListener('click', refreshAi);
$('ai-login').addEventListener('click', () => mutation(() => api.aiLogin(), { target: 'ai-login-result', after: result => {
  if (result.status && typeof result.status === 'object') { aiStatus = result.status; renderAiStatus(); }
  feedback('ai-login-result', result.message ?? '공식 로그인 절차를 요청했습니다. 아래 공식 페이지에서 인증을 완료하세요.');
  if (result.loginUrl) renderLoginLink(result.loginUrl);
} }));
$('ai-login-cancel').addEventListener('click', () => mutation(() => api.aiLoginCancel(), { target: 'ai-login-result', success: '진행 중인 공식 로그인을 취소했습니다.', after: result => { aiStatus = result; renderAiStatus(); } }));
$('ai-logout').addEventListener('click', () => mutation(() => api.aiLogout(), { target: 'ai-login-result', success: '선택한 AI 연결의 인증을 해제했습니다.', after: result => { resetAiAuthorizationUi(); aiStatus = result; renderAiStatus(); } }));
$('ai-test').addEventListener('click', async () => {
  if (busy || providerDirty || aiStatus?.testAvailable !== true) return;
  aiConnectionTesting = true; renderAiStatus(); updateButtons();
  try {
    await mutation(() => api.aiTest(), { target: 'ai-test-feedback', after: result => {
      aiStatus = result; renderAiStatus();
      feedback('ai-test-feedback', result.connectionTest?.status === 'passed' ? '실제 모델의 고정 문구 응답을 확인했습니다. 기관 자료 전송 승인은 별도입니다.' : result.connectionTest?.message ?? '연결 검사 결과를 확인하세요.', result.connectionTest?.status === 'failed');
    } });
  } finally { aiConnectionTesting = false; await refreshAi(); }
});
$('ai-provider').addEventListener('change', () => {
  const apiMode = $('ai-provider').value === 'openai-api';
  $('api-provider-fields').hidden = !apiMode;
  $('ai-api-key').required = apiMode;
  $('ai-model').required = apiMode;
  providerDirty = true;
  invalidatePreview(); aiProposal = undefined; $('ai-proposal-panel').hidden = true;
  feedback('ai-config-feedback', '연결 방식이 아직 저장되지 않았습니다. 저장 후 전송 문맥을 다시 확인하세요.');
});
for (const id of ['ai-api-key', 'ai-model']) $(id).addEventListener('input', () => { providerDirty = true; invalidatePreview(); });
$('ai-config-form').addEventListener('submit', event => {
  event.preventDefault();
  const provider = $('ai-provider').value;
  const config = provider === 'openai-api' ? { provider, apiKey: $('ai-api-key').value, model: $('ai-model').value.trim() } : { provider };
  mutation(() => api.aiConfig(config), { target: 'ai-config-feedback', success: '명시적으로 선택한 AI 연결 방식을 저장했습니다.', after: async () => {
    $('ai-api-key').value = ''; providerDirty = false; readPlanDirty = false; invalidatePreview(); aiProposal = undefined; $('ai-proposal-panel').hidden = true; $('ai-read-plan-result').hidden = true; await refreshAi();
  } });
});
$('ai-read-plan-form').addEventListener('submit', event => {
  event.preventDefault();
  const selected = [...document.querySelectorAll('[name="read-operation"]:checked')].map(input => input.value);
  if (!selected.length) { feedback('ai-read-plan-feedback', '허용할 읽기 단계를 하나 이상 선택하세요.', true); return; }
  const profileRowLimit = selected.includes('profile') ? profileRowLimitValue() : undefined;
  if (selected.includes('profile') && profileRowLimit === undefined) { feedback('ai-read-plan-feedback', requestErrors.AI_PROFILE_ROW_LIMIT_REQUIRED, true); $('ai-profile-row-limit').focus(); return; }
  mutation(() => api.aiReadPlan({ revision: state.revision, operations: selected, profileRowLimit }), { target: 'ai-read-plan-feedback', success: '선택한 읽기 범위를 실행기에 등록했습니다. 이후 AI 추천의 실제 실행 여부는 서버가 판정합니다.', after: result => { readPlanDirty = false; $('ai-read-plan-result').textContent = displayJson(readPlanView(result)); $('ai-read-plan-result').hidden = false; } });
});
const readPlanChanged = () => { readPlanDirty = true; invalidatePreview(); feedback('ai-read-plan-feedback', '허용 범위를 다시 확인하거나 실행 허용을 해제한 뒤 AI 요청을 이어가세요.'); };
document.querySelectorAll('[name="read-operation"]').forEach(input => input.addEventListener('change', () => { syncProfileRowLimit(); readPlanChanged(); }));
$('ai-profile-row-limit').addEventListener('input', readPlanChanged);
$('ai-revoke-plan').addEventListener('click', () => mutation(() => api.aiReadPlan({ revision: state.revision, operations: [] }), { target: 'ai-read-plan-feedback', success: 'AI가 읽기 단계를 실행하도록 허용한 범위를 해제했습니다.', after: () => {
  readPlanDirty = false; document.querySelectorAll('[name="read-operation"]').forEach(input => { input.checked = false; }); $('ai-profile-row-limit').value = ''; syncProfileRowLimit(); $('ai-read-plan-result').hidden = true; invalidatePreview();
} }));
$('ai-mode').addEventListener('change', () => {
  const expanded = $('ai-mode').value === 'expanded';
  $('ai-excerpt-panel').hidden = !expanded;
  $('ai-excerpt-panel').disabled = !expanded;
  invalidatePreview();
  if (expanded) void loadExcerptEvidence(true);
});
$('ai-excerpt-load').addEventListener('click', () => loadExcerptEvidence(true));
$('ai-excerpt-filter').addEventListener('input', renderExcerptChoices);
$('ai-excerpt-choice').addEventListener('change', updateButtons);
$('ai-excerpt-add').addEventListener('click', () => {
  const item = excerptEvidence.find(evidence => evidence.key === $('ai-excerpt-choice').value);
  if (!item || selectedExcerpts.length >= 5 || selectedExcerpts.some(selected => selected.key === item.key)) return;
  selectedExcerpts.push({ ...item, lineCount: 10 });
  renderSelectedExcerpts(); renderExcerptChoices(); invalidatePreview();
  feedback('ai-excerpt-feedback', '발췌 위치를 선택했습니다. 실제 소스 내용과 제외 사유는 전송 미리보기에서 확인하세요.');
});
$('ai-question').addEventListener('input', invalidatePreview);
$('ai-consent').addEventListener('change', updateButtons);
$('ai-apply-consent').addEventListener('change', updateButtons);
$('ai-preview').addEventListener('click', () => {
  const ids = [...document.querySelectorAll('[name="ai-artifact"]:checked')].map(input => input.value);
  const expanded = $('ai-mode').value === 'expanded';
  if (expanded && !validExcerpts()) { feedback('ai-excerpt-feedback', '현재 분석 근거와 각 발췌의 1–40행 범위를 확인하세요.', true); return; }
  const excerpts = expanded ? selectedExcerpts.map(item => ({ path: item.path, startLine: item.line, lineCount: item.lineCount })) : [];
  const generation = previewGeneration, question = $('ai-question').value.trim(), requestedMode = $('ai-mode').value;
  mutation(() => api.aiPreview({ mode: requestedMode, artifactIds: ids, excerpts }), { target: 'ai-request-feedback', after: result => {
    if (generation !== previewGeneration) { feedback('ai-request-feedback', '미리보기를 준비하는 동안 질문·문맥이 바뀌었습니다. 현재 입력으로 다시 확인하세요.', true); return; }
    aiPreview = { ...result, workspaceRevision: result.revision ?? state.revision, question };
    $('ai-preview-content').textContent = displayJson({ provider: result.provider, context: result.context, question: aiPreview.question, excluded: result.excluded, approval: result.approval });
    renderPreviewExclusions(result);
    $('ai-preview-panel').hidden = false;
    $('ai-consent').checked = false;
    feedback('ai-request-feedback', '전송 문맥과 질문을 확인하세요. 아직 모델에 요청하지 않았습니다.');
  } });
});
$('ai-request-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!aiPreview || !$('ai-consent').checked || aiPreview.workspaceRevision !== state.revision || aiPreview.question !== $('ai-question').value.trim()) {
    feedback('ai-request-feedback', '입력이 바뀌었습니다. 전송 내용을 다시 확인하세요.', true); return;
  }
  mutation(() => api.aiAsk({ previewId: aiPreview.previewId ?? aiPreview.id, question: $('ai-question').value.trim() }), { target: 'ai-request-feedback', after: result => {
    aiProposal = { ...result, changes: Array.isArray(result.changes) ? result.changes : [], workspaceRevision: result.revision ?? state.revision };
    $('ai-proposal-content').textContent = displayJson({ message: result.message, question: result.question, nextOperation: result.nextOperation, job: result.job ? { id: result.job.id, operation: result.job.operation, status: result.job.status } : undefined });
    $('ai-change-options').replaceChildren();
    aiProposal.changes.forEach((change, index) => {
      const input = element('input', { type: 'checkbox', name: 'ai-change', value: index });
      input.addEventListener('change', updateButtons);
      $('ai-change-options').append(element('label', { className: 'check' }, input, element('pre', { className: 'code-block', text: displayJson(change) })));
    });
    if (!aiProposal.changes.length) $('ai-change-options').append(element('p', { className: 'subtext', text: '이번 답변에는 원장 변경 제안이 없습니다. 안내 또는 추가 질문을 확인하세요.' }));
    $('ai-proposal-panel').hidden = false;
    $('ai-apply-consent').checked = false;
    feedback('ai-request-feedback', '제안을 받았습니다. 변경과 근거를 검토한 뒤 초안 반영을 선택하세요.');
    invalidatePreview();
  } });
});
$('ai-apply').addEventListener('click', () => {
  if (!aiProposal || aiProposal.workspaceRevision !== state.revision || !$('ai-apply-consent').checked) return;
  mutation(() => api.aiApply({ proposalId: aiProposal.proposalId ?? aiProposal.id, revision: state.revision, changes: selectedChanges() }), { target: 'ai-apply-feedback', success: 'AI 제안을 초안에 반영했습니다. 원장에서 업무 의미를 확인하세요.', after: () => { aiProposal = undefined; $('ai-apply-consent').checked = false; } });
});
$('open-commit').addEventListener('click', () => openLoad('commit'));
$('close-commit').addEventListener('click', () => $('commit-dialog').close());
$('commit-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (commitRevision !== state.revision) { feedback('commit-feedback', '작업 판이 바뀌었습니다. 창을 닫고 대상·계획을 다시 확인하세요.', true); return; }
  const options = { ackAdapter: $('load-adapter').value, ackFreeze: $('load-freeze').checked };
  if ($('load-driver-hash').value.trim()) options.ackDriverHash = $('load-driver-hash').value.trim();
  if (loadOperation === 'commit') {
    if ($('commit-confirm-name').value.trim() !== commitIdentifier()) { feedback('commit-feedback', '표시된 COMMIT 확인 문구를 정확히 입력하세요.', true); $('commit-confirm-name').focus(); return; }
    Object.assign(options, { confirm: true, targetPhrase: $('commit-confirm-name').value.trim(), archiveDirectory: $('commit-archive').value.trim() });
    if ($('commit-upgrade').checked) options.ackControlSchemaUpgrade = true;
  }
  const result = await runOperation(loadOperation, options, 'commit-feedback');
  if (result) $('commit-dialog').close();
});
window.addEventListener('beforeunload', event => {
  if (!ledgerDirty && !hasDirtyProfiles() && !sourcePathDirty) return;
  event.preventDefault(); event.returnValue = '';
});
document.querySelectorAll('pre.code-block').forEach(node => { node.tabIndex = 0; });
$('zip-preview-files').tabIndex = 0;
$('zip-preview-files').setAttribute('aria-label', '압축 해제 범위의 파일 목록');
route(); updateButtons();
try { await openSession(); await refreshState(); await refreshAi(); } catch (error) { showError(error); }
setInterval(() => { if (!busy && ready) refreshState(true); }, 4000);
