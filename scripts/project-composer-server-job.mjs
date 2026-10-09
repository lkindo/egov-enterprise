/*
 * 생성 작업의 상태와 화면에 보낼 모양(설계서 14.2·14.3·20장, E4b·E6a). 서버는 작업을 만들고 엔진 알림·결과를 여기로 넘긴다.
 * 엔진 값은 정해진 모양만 받고(어긋나면 버린다), 경과·남은 시간은 응답 시각에 서버 시계로 센다(엔진과 같은 프로세스다).
 */
import { ComposerError, JOB_ERROR_CODES } from './project-composer-errors.mjs';
import { createLogMasker } from './project-composer-command.mjs';
import { VERIFICATION_STEP_IDS } from './verify-reusable-artifact.mjs';
import { HISTORY_LIMIT, HISTORY_MIN_RUNS, JOB_STAGES, TIMELINE_STATUSES } from './project-composer-timeline.mjs';
import { TOOL_MESSAGES, count, dense, files, knownTool, plain, repositoryPath, safeDetails } from './project-composer-server-shape.mjs';

export const STAGES = Object.freeze({
  resolve: '선택한 구성 확인 중', database: 'PostgreSQL 스키마와 초기 데이터 생성 중',
  source: '선택한 기능의 소스 구성 중', install: '프로젝트 의존성 준비 중',
  verify: '생성 프로젝트 검증 중', complete: '생성과 검증 완료',
});
export const FAILED_STAGES = Object.freeze({
  resolve: '구성 확인', database: 'PostgreSQL 스키마와 초기 데이터 생성', source: '소스 구성',
  install: '의존성 준비', verify: '생성 프로젝트 검증',
});
// 원인을 나누지 못한 생성 실패. Docker 를 단정하지 않는다(린트·소스 구성 같은 다른 단계 실패에도 이 문장이 나간다).
export const GENERATION_FAILED_MESSAGE = '프로젝트 생성을 마치지 못했습니다. 입력은 유지됩니다. 실패 단계와 작업 보고서·실행 로그를 확인한 뒤 다시 시도해 주세요.';
/*
 * 생성 작업 오류 허용 목록(E4b). 코드마다 나올 수 있는 단계와 화면 행동을 정한다. 엔진이 잘못 코드를 달아도 화면이 엉뚱한
 * 단계를 탓하지 않도록 단계가 맞지 않으면 일반 실패로 말한다. 검증 실패는 검증 명령의 실패이고 단계 id 가 단계 표에 있어야 한다.
 */
const JOB_MESSAGES = Object.freeze({
  SOURCE_CHANGED: '생성하는 동안 원본 저장소가 바뀌어 생성을 멈췄습니다. 기능 목록을 새 원본으로 다시 불러온 뒤 다시 생성해 주세요.',
  DB_NOT_READY: '임시 PostgreSQL 이 준비되지 않았거나 도중에 멈췄습니다. Docker 상태를 확인한 뒤 다시 생성해 주세요.',
  OUTPUT_CONFLICT: '출력 폴더가 이미 있어 생성을 멈췄습니다. 다시 생성하면 새 폴더에 만듭니다.',
  SOURCE_SURVIVAL: '선택한 기능의 소스가 생성 중에 지워졌습니다. 생성기 결함이므로 진단 정보를 복사해 보고해 주세요.',
  MENU_SNAPSHOT_STALE: '메뉴 미리보기 자료가 원본 DB 변경을 따라가지 못해 생성을 멈췄습니다. 아래 명령으로 메뉴 자료를 갱신한 뒤 다시 생성해 주세요.',
  CATALOG_DRIFT: '기능 선언이 원본 코드와 맞지 않아 생성을 멈췄습니다. 개발자 정보의 위반을 고친 뒤 다시 생성해 주세요.',
});
const JOB_ERRORS = Object.freeze({
  SOURCE_CHANGED: { stages: ['resolve', 'database', 'source'], action: 'reload-source' },
  TOOL_UNAVAILABLE: { stages: ['resolve', 'database'] },
  DB_NOT_READY: { stages: ['database'], action: 'regenerate' },
  OUTPUT_CONFLICT: { stages: ['resolve', 'source'], action: 'regenerate' },
  SOURCE_SURVIVAL: { stages: ['source'], action: 'copy-diagnostics' },
  VERIFY_FAILED: { stages: ['verify'], command: 'scripts/verify-reusable-artifact.mjs' },
  MENU_SNAPSHOT_STALE: { stages: ['resolve', 'database'], action: 'copy-command' },
  CATALOG_DRIFT: { stages: ['resolve', 'database'], action: 'show-violations' },
});
// 검증 단계 이름. 키는 검증기의 단계 id 와 같다(시험이 대조한다).
export const VERIFY_STEP_LABELS = Object.freeze({ governance: '거버넌스 검증', 'ui-governance': '화면 거버넌스 계약', entrypoints: '진입점 계약',
  backend: '백엔드 컴파일·테스트', typecheck: '타입 검사', lint: '린트', build: '프런트 빌드' });
// 같은 원본·구성이면 대개 결과가 같은 단계는 다시 생성을 권하지 않는다. 백엔드·빌드는 메모리·네트워크 같은 환경 영향이 있다.
const RETRYABLE_STEPS = Object.freeze(['backend', 'build']);
/**
 * 실패한 단계·명령 식별자·종료 코드와 원본 저장소 기준 로그·작업 보고서 위치, 원본 커밋만 넘긴다. 오류 메시지와 자식 출력은
 * 보내지 않는다. 절대 경로·상위 폴더·역슬래시 경로는 이 컴퓨터의 폴더 이름을 흘릴 수 있어 버린다.
 */
export function safeFailure(failure) {
  if (!plain(failure)) return undefined;
  const result = {};
  if (Object.hasOwn(FAILED_STAGES, failure.stage)) { result.stage = failure.stage; result.stageLabel = FAILED_STAGES[failure.stage]; }
  if (typeof failure.commandId === 'string' && /^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/.test(failure.commandId)) {
    result.commandId = failure.commandId;
    result.exitCode = Number.isSafeInteger(failure.exitCode) ? failure.exitCode : null;
    // 종료 코드가 없을 때 실행조차 못 했는지(도구 없음) 말해 준다. 그 밖(신호·시간 초과)은 화면이 '종료 코드 없이 끝남' 으로 말한다.
    if (result.exitCode === null && failure.causeCode === 'TOOL_UNAVAILABLE') result.notStarted = true;
  }
  if (repositoryPath(failure.log)) result.log = failure.log;
  if (repositoryPath(failure.report) && /^build\/project-composer\/jobs\/[a-z0-9-]+\/report\.json$/.test(failure.report)) result.report = failure.report;
  if (typeof failure.sourceCommit === 'string' && /^[a-f0-9]{40}$/.test(failure.sourceCommit)) result.sourceCommit = failure.sourceCommit;
  return Object.keys(result).length ? result : undefined;
}
const TAIL_ANSI = /\u001b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\-_])/g;
// 로그 끝부분의 경로 가림. 드라이브 글자 앞에 영숫자가 있으면 경로가 아니다(https:// · file:/// 의 's:'·'e:' 를 지우지 않는다).
const TAIL_PATH = /(?:(?<![A-Za-z0-9])[A-Za-z]:[\\/]|\\\\|(?<![A-Za-z0-9._~-])\/(?:Users|home|root|tmp|var|private|mnt|opt|srv|Volumes)\/)[^\s'"`]*/g;
/**
 * 검증 실패의 로그 끝부분(엔진이 이미 가린 40줄)을 한 번 더 거른다. 모양이 어긋나면 꼬리 전체를 버린다. 줄은 거부하지 않고 정리한다:
 * 터미널 제어 문자 제거 → 같은 비밀 규칙으로 다시 가림 → 남은 절대 경로 가림 → 300자.
 */
function safeLogTail(value) {
  if (!dense(value) || !value.length || value.length > 40 || !value.every(item => typeof item === 'string')) return undefined;
  const masker = createLogMasker();
  return value.map(item => masker.line(item.replace(TAIL_ANSI, '').replace(/\t/g, ' ').replace(/[\u0000-\u001f\u007f-\u009f]/g, ''))
    .replace(TAIL_PATH, '<로컬 경로>').slice(0, 300));
}
/**
 * 생성 작업 오류. 작업 허용 목록의 코드가 붙은 ComposerError 이고 그 코드가 나올 수 있는 단계에서 생겼을 때만 그 코드로 말한다.
 * 그 밖(코드 없는 오류·요청 코드·단계 불일치)은 일반 실패다. 세부 정보는 코드마다 정해진 것만 다시 거른다.
 */
export function jobError(error, failure) {
  const fallback = { code: 'GENERATION_FAILED', message: GENERATION_FAILED_MESSAGE };
  if (!(error instanceof ComposerError) || !JOB_ERROR_CODES.includes(error.code) || !Object.hasOwn(JOB_ERRORS, error.code)) return fallback;
  const rule = JOB_ERRORS[error.code];
  if (!rule.stages.includes(failure?.stage)) return fallback;
  const details = plain(error.details) ? error.details : {};
  const code = error.code;
  if (code === 'VERIFY_FAILED') {
    const step = typeof details.step === 'string' && Object.hasOwn(VERIFY_STEP_LABELS, details.step) ? details.step : undefined;
    if (!step || failure.commandId !== rule.command) return fallback;
    const retry = RETRYABLE_STEPS.includes(step);
    const label = VERIFY_STEP_LABELS[step];
    return { code, message: retry
      ? `생성한 프로젝트 검증의 「${label}」 단계에서 실패했습니다. 아래 로그 끝부분을 확인하고, 메모리·네트워크 같은 환경 문제였다면 다시 생성해 주세요.`
      : `생성한 프로젝트 검증의 「${label}」 단계에서 실패했습니다. 같은 구성으로 다시 생성해도 대개 결과가 같습니다. 아래 로그 끝부분을 확인하고 진단 정보를 복사해 보고해 주세요.`,
    action: retry ? 'regenerate' : 'copy-diagnostics' };
  }
  if (code === 'TOOL_UNAVAILABLE') {
    // Docker 는 DB 단계, git 은 구성 확인 단계에서만 쓴다. Docker 만 '다시 점검' 을 준다(git 은 생성기를 다시 시작해야 한다).
    if (!knownTool(details.tool) || (details.tool === 'docker') !== (failure.stage === 'database')) return fallback;
    return { code, message: TOOL_MESSAGES[details.tool], ...(details.tool === 'docker' ? { action: 'recheck' } : {}), details: { tool: details.tool } };
  }
  const shown = code === 'SOURCE_SURVIVAL'
    ? (files(details.files) && details.files.length ? { files: details.files.slice(0, 20), fileCount: details.files.length } : {})
    : safeDetails(error);
  return { code, message: JOB_MESSAGES[code], ...(rule.action ? { action: rule.action } : {}), ...(Object.keys(shown).length ? { details: shown } : {}) };
}

const DEFAULT_STAGE_MESSAGE = STAGES.resolve;
/** 새 작업. 시작 시각은 서버 시계다(경과 시간을 센다). */
export function startJob({ id, requestId, recipe, now = Date.now() }) {
  return { id, requestId, status: 'running', recipe, stage: 'resolve', message: DEFAULT_STAGE_MESSAGE, progress: 0, startedAtMs: now };
}

const TIMELINE_IDS = Object.freeze({ stages: JOB_STAGES, steps: VERIFICATION_STEP_IDS });
/**
 * 엔진 타임라인은 단계 순서·상태·시각의 모양이 정확히 맞을 때만 받는다. 진행 중인 항목만 시작 시각을 갖고,
 * 소요 시간은 끝난 항목에만 있다. 하나라도 어긋나면 타임라인 전체를 버린다(일부만 보이면 단계를 건너뛴 것처럼 보인다).
 */
function safeTimeline(value) {
  if (!plain(value)) return undefined;
  const valid = (list, ids) => dense(list) && list.length === ids.length && list.every((item, index) => plain(item) && item.id === ids[index]
    && TIMELINE_STATUSES.includes(item.status) && (item.status === 'running' ? count(item.startedAt) : item.startedAt === undefined)
    && (item.durationMs === undefined || (count(item.durationMs) && ['passed', 'failed'].includes(item.status))));
  if (!Object.entries(TIMELINE_IDS).every(([key, ids]) => valid(value[key], ids))) return undefined;
  const copy = list => list.map(({ id, status, startedAt, durationMs }) => ({ id, status,
    ...(startedAt !== undefined ? { startedAt } : {}), ...(durationMs !== undefined ? { durationMs } : {}) }));
  return { stages: copy(value.stages), steps: copy(value.steps) };
}
const ESTIMATE_ITEMS = Object.freeze([...JOB_STAGES.filter(id => id !== 'verify'), ...VERIFICATION_STEP_IDS]);
/**
 * 남은 시간 추정. 기록 수와, 추정하지 않으면 remainingMs: null, 추정하면 대기 중인 단계의 합(pendingMs)과 진행 중인 단계의
 * 보통 시간(running)만 받는다. 응답할 때 진행 중인 단계에서만 지난 시간을 빼고 0 아래로 내리지 않는다.
 */
function safeEstimate(value, now) {
  if (!plain(value) || !Number.isSafeInteger(value.runs) || value.runs < 0 || value.runs > HISTORY_LIMIT) return undefined;
  if (value.remainingMs === null) return { runs: value.runs, remainingMs: null };
  const running = value.running === null ? null
    : (plain(value.running) && ESTIMATE_ITEMS.includes(value.running.id) && count(value.running.typicalMs) ? { id: value.running.id, typicalMs: value.running.typicalMs } : undefined);
  return running !== undefined && count(value.pendingMs) ? { runs: value.runs, pendingMs: value.pendingMs, running, at: now } : undefined;
}
const openItem = item => item.status === 'pending' || item.status === 'running';
/** 진행 문장. 검증 중이면 검증 단계 이름과 몇 번째인지 붙인다(단계가 바뀔 때만 달라져 화면 낭독기가 한 번만 읽는다). */
function stageMessage(job) {
  const steps = job.timeline?.steps ?? [];
  const index = steps.findIndex(item => item.status === 'running');
  if (job.stage !== 'verify' || index < 0) return STAGES[job.stage];
  return `${STAGES.verify} · ${VERIFY_STEP_LABELS[steps[index].id]} (${index + 1}/${steps.length})`;
}
/** 엔진 알림을 진행 중인 작업에 반영한다. 진행률은 줄지 않고, 끝나기 전에는 99를 넘지 않는다. */
export function applyJobProgress(job, event, now = Date.now()) {
  if (job.status !== 'running' || !plain(event) || !Object.hasOwn(STAGES, event.stage)) return;
  job.stage = event.stage;
  const timeline = safeTimeline(event.timeline);
  if (timeline) job.timeline = timeline;
  // 남은 단계가 없는 타임라인(실패를 알리는 마지막 알림)은 추정을 버리고 진행 문장을 일반 문구로 되돌리지 않는다.
  // 작업은 정리를 마친 뒤 실패로 끝나며, 그때 실패 문장이 나온다.
  const open = !job.timeline || [...job.timeline.stages, ...job.timeline.steps].some(openItem);
  const estimate = open ? safeEstimate(event.estimate, now) : undefined;
  if (estimate) job.estimate = estimate; else delete job.estimate;
  if (open || event.stage === 'complete') job.message = stageMessage(job);
  if (Number.isFinite(event.progress)) job.progress = Math.max(job.progress, Math.min(99, Math.max(0, Math.round(event.progress))));
}
export function succeedJob(job, result, now = Date.now()) {
  Object.assign(job, { status: 'succeeded', stage: 'complete', message: STAGES.complete, progress: 100, result, finishedAtMs: now });
  delete job.estimate;
}
/** 작업 실패. 검증 실패만 실패한 단계와 가린 로그 끝부분을 함께 보인다(DEC-OPS-249). */
export function failJob(job, error, now = Date.now()) {
  const failure = safeFailure(error?.failure);
  job.status = 'failed'; job.error = jobError(error, failure); job.message = job.error.message; job.finishedAtMs = now;
  if (failure && job.error.code === 'VERIFY_FAILED') {
    failure.step = error.details.step; failure.stepLabel = VERIFY_STEP_LABELS[failure.step];
    const tail = safeLogTail(error.failure.logTail);
    if (tail) failure.logTail = tail;
  }
  if (failure) job.failure = failure;
  delete job.estimate;
}
/**
 * 응답으로 보낼 작업. 서버 시계로 센 경과 시간을 싣고 엔진의 절대 시각은 보내지 않는다. 진행 중인 항목은 지금까지 걸린 시간을,
 * 남은 시간은 받은 뒤 지난 만큼 줄여 싣는다. 끝난 작업에 진행 중으로 남은 항목은 작업이 끝난 시각까지만 센다.
 */
export function jobView(job, now = Date.now()) {
  const { startedAtMs, finishedAtMs, timeline, estimate, ...rest } = job;
  const end = job.status === 'running' ? now : (finishedAtMs ?? now);
  const view = { ...rest, elapsedMs: Math.max(0, end - startedAtMs) };
  if (timeline) {
    // 단계 이름은 서버 문장(실패 단계·검증 단계 이름)과 같은 것을 싣는다. 화면은 순서·상태·시간만 그린다.
    const item = ({ startedAt, ...value }) => ({ ...value, label: FAILED_STAGES[value.id] ?? VERIFY_STEP_LABELS[value.id],
      ...(startedAt === undefined ? {} : { elapsedMs: Math.max(0, Math.min(end - startedAt, end - startedAtMs)) }) });
    view.timeline = { stages: timeline.stages.map(item), steps: timeline.steps.map(item) };
  }
  if (estimate && job.status === 'running') {
    let remainingMs = null;
    if (Object.hasOwn(estimate, 'pendingMs')) {
      // 진행 중인 단계는 타임라인의 시작 시각부터, 찾지 못하면 추정을 받은 때부터 센다.
      const item = estimate.running && [...(timeline?.stages ?? []), ...(timeline?.steps ?? [])]
        .find(entry => entry.id === estimate.running.id && entry.status === 'running');
      const elapsed = item ? Math.max(0, Math.min(end - item.startedAt, end - startedAtMs)) : Math.max(0, now - estimate.at);
      remainingMs = estimate.pendingMs + (estimate.running ? Math.max(0, estimate.running.typicalMs - elapsed) : 0);
    }
    view.estimate = { runs: estimate.runs, minRuns: HISTORY_MIN_RUNS, remainingMs };
  }
  return view;
}
