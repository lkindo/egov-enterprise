#!/usr/bin/env node
/** A local-only transport over the same composition engine used by the CLI. */
import { createServer } from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ComposerError, JOB_ERROR_CODES, MENUS_REFRESH_COMMAND } from './project-composer-errors.mjs';
import { createLogMasker } from './project-composer-command.mjs';
import { VERIFICATION_STEP_IDS } from './verify-reusable-artifact.mjs';
import { NAME_RULE_MESSAGE, projectNameIsValid } from './project-composer-name.mjs';
import { classifyRecipeFailure } from './project-composer-recipe.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = resolve(ROOT, 'tools/project-composer/public');
const LIMIT = 32 * 1024;
const STAGES = Object.freeze({
  resolve: '선택한 구성 확인 중', database: 'PostgreSQL 스키마와 초기 데이터 생성 중',
  source: '선택한 기능의 소스 구성 중', install: '프로젝트 의존성 준비 중',
  verify: '생성 프로젝트 검증 중', complete: '생성과 검증 완료',
});
const FAILED_STAGES = Object.freeze({
  resolve: '구성 확인', database: 'PostgreSQL 스키마와 초기 데이터 생성', source: '소스 구성',
  install: '의존성 준비', verify: '생성 프로젝트 검증',
});
const MESSAGES = Object.freeze({
  BAD_REQUEST: '요청 형식을 확인해 주세요.', FORBIDDEN: '이 생성기 화면에서 다시 시도해 주세요.',
  NOT_FOUND: '요청한 항목을 찾을 수 없습니다.', METHOD_NOT_ALLOWED: '지원하지 않는 요청 방식입니다.',
  BODY_TOO_LARGE: '선택 정보가 너무 큽니다. 기능 선택을 다시 확인해 주세요.',
  INVALID_NAME: NAME_RULE_MESSAGE,
  INVALID_RECIPE: '선택한 구성을 지금 원본에서 만들 수 없습니다. 원본이 바뀌었을 수 있으니 기능 목록을 다시 불러온 뒤 확인해 주세요.',
  SOURCE_CHANGED: '화면을 연 뒤 원본 저장소가 바뀌었습니다. 기능 목록을 새 원본으로 다시 불러온 뒤 확인해 주세요.',
  MENU_SNAPSHOT_STALE: '메뉴 미리보기 자료가 원본 DB 변경을 따라가지 못했습니다. 아래 명령으로 메뉴 자료를 갱신한 뒤 다시 확인해 주세요.',
  CATALOG_DRIFT: '기능 선언이 원본 코드와 맞지 않아 구성을 계산할 수 없습니다. 개발자 정보의 위반을 고친 뒤 다시 확인해 주세요.',
  TOOL_UNAVAILABLE: '생성에 필요한 도구를 실행하지 못했습니다. 설치와 PATH 를 확인한 뒤 생성기를 다시 시작해 주세요.',
  BUSY: '다른 프로젝트를 생성하고 있습니다. 완료 후 다시 시도해 주세요.',
  REQUEST_CONFLICT: '이미 사용한 요청입니다. 구성을 확인한 뒤 다시 시도해 주세요.',
  // 원인을 나누지 못한 생성 실패. Docker 를 단정하지 않는다(린트·소스 구성 같은 다른 단계 실패에도 이 문장이 나간다).
  GENERATION_FAILED: '프로젝트 생성을 마치지 못했습니다. 입력은 유지됩니다. 실패 단계와 작업 보고서·실행 로그를 확인한 뒤 다시 시도해 주세요.',
  PREFLIGHT_FAILED: '생성 환경을 점검하지 못했습니다. 잠시 후 다시 점검해 주세요.',
  DEEP_FAILED: '소스 정밀 점검 결과를 확인하지 못했습니다. 다시 점검해 주세요.',
  INTERNAL_ERROR: '요청을 처리하지 못했습니다. 입력은 유지됩니다. 잠시 후 다시 시도해 주세요.',
});

// 도구별 문장. 생성기는 시작할 때의 PATH 를 쓰므로 설치 뒤에는 생성기를 다시 시작해야 한다.
const TOOL_MESSAGES = Object.freeze({
  git: 'Git 을 실행하지 못했습니다. Git 을 설치하거나 PATH 를 확인한 뒤 생성기를 다시 시작해 주세요.',
  docker: 'Docker 를 실행하지 못했습니다. Docker 엔진을 시작하거나 설치하고, Linux 컨테이너 모드인지 확인한 뒤 다시 점검해 주세요.',
});
/*
 * 요청 오류 허용 목록(설계서 14.2, E4). 코드마다 HTTP 상태와 화면 행동, 화면이 표시할 입력 칸을 정한다. 문장은 MESSAGES 다.
 * 엔진 오류는 이 목록의 코드가 붙은 ComposerError 일 때만 그 코드로 답하고, 그 밖의 오류는 일반 문장으로 답한다.
 */
const REQUEST_ERRORS = Object.freeze({
  INVALID_NAME: { status: 400, action: 'focus-name', field: 'project.name' },
  INVALID_RECIPE: { status: 400, action: 'reload-source' },
  SOURCE_CHANGED: { status: 409, action: 'reload-source' },
  MENU_SNAPSHOT_STALE: { status: 409, action: 'copy-command' },
  CATALOG_DRIFT: { status: 500, action: 'show-violations' },
  TOOL_UNAVAILABLE: { status: 503 },
});

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

class HttpError extends Error {
  constructor(status, code, details = {}) { super(code); this.status = status; this.code = code; this.details = details; }
}
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const keys = (value, allowed) => plain(value) && Object.keys(value).every(key => allowed.includes(key));
const identifier = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);

/** Reject extra input channels before invoking an engine or creating any output. */
export function validateComposerRequestRecipe(recipe) {
  if (!keys(recipe, ['schemaVersion', 'project', 'sourceRef', 'selection', 'database', 'backendLayout'])
    || recipe.schemaVersion !== 1 || !keys(recipe.project, ['name']) || typeof recipe.project.name !== 'string'
    || typeof recipe.sourceRef !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$/.test(recipe.sourceRef)
    || recipe.sourceRef.includes('..') || !keys(recipe.database, ['vendor']) || recipe.database.vendor !== 'postgresql'
    || !['multi-module', 'single-module'].includes(recipe.backendLayout)
    || !keys(recipe.selection, ['preset', 'domains'])) throw new HttpError(400, 'INVALID_RECIPE');
  // 이름은 화면이 칸을 짚어 알려 줄 수 있는 입력이다. 형식 오류와 구분한다(해석기·화면과 같은 규칙).
  if (!projectNameIsValid(recipe.project.name)) throw new HttpError(400, 'INVALID_NAME');
  const selection = recipe.selection;
  const preset = Object.hasOwn(selection, 'preset');
  const capabilities = Object.hasOwn(selection, 'domains');
  if (preset === capabilities || (preset && !identifier(selection.preset))
    || (capabilities && (!Array.isArray(selection.domains) || selection.domains.length > 100
      || !selection.domains.every(identifier) || new Set(selection.domains).size !== selection.domains.length))) {
    throw new HttpError(400, 'INVALID_RECIPE');
  }
  return recipe;
}

function secureHeaders(response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'");
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
}
function json(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}
async function body(request) {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type'] ?? '')) throw new HttpError(400, 'BAD_REQUEST');
  if (Number(request.headers['content-length'] ?? 0) > LIMIT) throw new HttpError(413, 'BODY_TOO_LARGE');
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > LIMIT) throw new HttpError(413, 'BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'BAD_REQUEST'); }
}
function safeResult(value, recipe) {
  // Raw child-process output and arbitrary error fields are never sent to a browser.
  const result = { recipe, verified: value?.verified === true };
  for (const key of ['projectDirectory', 'databaseDirectory', 'reportPath']) {
    if (typeof value?.[key] === 'string' && value[key].length <= 2048 && !/[\r\n\0]/.test(value[key])) result[key] = value[key];
  }
  return result;
}

const PREFLIGHT_STATUSES = Object.freeze(['pass', 'warn', 'block']);
const line = (value, limit) => typeof value === 'string' && value.length > 0 && value.length <= limit && !/[\r\n\0]/.test(value);
/**
 * 생성 전 점검 항목은 정해진 모양만 넘긴다. 모양이 어긋난 항목이 하나라도 있으면 결과 전체를 버린다
 * (차단 항목 하나를 빠뜨린 결과는 생성할 수 있다고 말하게 된다). 차단 여부는 서버가 항목에서 다시 센다.
 */
function safePreflight(value) {
  const checks = Array.isArray(value?.checks) ? value.checks : [];
  const valid = check => plain(check) && identifier(check.id) && PREFLIGHT_STATUSES.includes(check.status) && line(check.label, 200)
    && (check.detail === undefined || line(check.detail, 40)) && (check.code === undefined || /^[A-Z][A-Z_]{2,39}$/.test(check.code));
  if (!checks.length || checks.length > 20 || !checks.every(valid)) throw new HttpError(500, 'PREFLIGHT_FAILED');
  const safe = checks.map(({ id, status, label, detail, code }) => ({ id, status, label, ...(detail ? { detail } : {}), ...(code ? { code } : {}) }));
  return { checks: safe, blocked: safe.some(check => check.status === 'block') };
}

/**
 * 소스 정밀 점검 결과도 정해진 모양만 넘긴다. 차단 사유 하나라도 모양이 어긋나면 결과 전체를 버린다
 * (빠진 차단 사유는 생성할 수 있다고 말하게 된다). 파일 목록은 저장소 기준 경로이고 차단 사유마다 앞 200개만 보낸다.
 */
const count = value => Number.isSafeInteger(value) && value >= 0;
const removal = value => value === null || (plain(value) && count(value.removedFiles) && count(value.cascadeFiles) && value.cascadeFiles <= value.removedFiles);
// 빈 칸 없는 배열만 받는다(every 는 빈 칸을 건너뛰고, 빈 칸은 JSON 에서 null 이 된다).
const dense = value => Array.isArray(value) && Object.keys(value).length === value.length;
// 저장소 기준 경로만 받는다. 절대 경로·상위 폴더·역슬래시 경로는 이 컴퓨터의 폴더 이름을 흘릴 수 있다.
const repositoryPath = value => line(value, 500) && !/^(?:[A-Za-z]:|[\\/])/.test(value) && !value.includes('\\') && !value.split('/').includes('..');
const files = value => dense(value) && value.every(repositoryPath);
// 투영 오류 문장의 안전망: 엔진이 저장소 기준으로 바꾸지 못한 절대 경로를 가린다.
const ABSOLUTE_PATH = /(?:[A-Za-z]:[\\/]|\\\\|\/(?:Users|home|root|tmp|var|private|mnt|opt|srv|Volumes)\/)[^\s'"`]*/g;
function safeDeep(value) {
  const blockers = dense(value?.blockers) ? value.blockers : null;
  const validBlocker = blocker => plain(blocker) && /^[A-Z][A-Z_]{2,39}$/.test(blocker.code) && line(blocker.label, 200)
    && (blocker.files === undefined || (files(blocker.files) && blocker.files.length > 0))
    && (blocker.message === undefined || typeof blocker.message === 'string');
  // 투영 결과가 비었으면 그 투영의 차단 사유가 함께 있어야 한다. 없으면 계산하지 않은 결과를 통과로 말하게 된다.
  const explained = (projection, code) => projection !== null || blockers.some(blocker => blocker.code === code);
  if (!plain(value) || !blockers || blockers.length > 20 || !blockers.every(validBlocker) || !removal(value.java) || !removal(value.frontend)
    || !explained(value.java, 'JAVA_PROJECTION') || !explained(value.frontend, 'FRONTEND_PROJECTION')
    || !files(value.removedGates) || !line(value.summary, 200) || !count(value.durationMs)) throw new HttpError(500, 'DEEP_FAILED');
  return {
    java: value.java && { removedFiles: value.java.removedFiles, cascadeFiles: value.java.cascadeFiles },
    frontend: value.frontend && { removedFiles: value.frontend.removedFiles, cascadeFiles: value.frontend.cascadeFiles },
    removedGates: value.removedGates,
    blockers: blockers.map(({ code, label, files: list, message }) => ({ code, label,
      ...(list ? { files: list.slice(0, 200), fileCount: list.length } : {}),
      ...(message ? { message: message.replace(/[\r\n\0]+/g, ' ').replace(ABSOLUTE_PATH, '<로컬 경로>').slice(0, 500) } : {}) })),
    blocked: blockers.length > 0,
    summary: value.summary,
    durationMs: value.durationMs,
  };
}

// 도구 이름은 문자열이고 알려진 것이어야 한다(문자열로 바뀌는 객체·배열이 그대로 실려 나가지 않게).
const knownTool = tool => typeof tool === 'string' && Object.hasOwn(TOOL_MESSAGES, tool);
/** 엔진 오류의 세부 정보는 코드마다 정해진 것만 다시 걸러 넘긴다. 엔진의 오류 문장은 보내지 않는다. */
function safeDetails(error) {
  const details = plain(error.details) ? error.details : {};
  if (error.code === 'CATALOG_DRIFT') {
    // 로더가 첫 위반에서 멈추므로 위반은 한 건이다. 한 줄·300자로 줄이고 이 컴퓨터의 절대 경로를 가린다.
    const violation = Array.isArray(details.violations) ? details.violations[0] : undefined;
    const shown = typeof violation === 'string' ? violation.replace(/[\r\n\0]+/g, ' ').replace(ABSOLUTE_PATH, '<로컬 경로>').trim().slice(0, 300) : '';
    return shown ? { violations: [shown] } : {};
  }
  // 명령은 엔진 값이 아니라 서버 상수다. 생성기 서버는 이 명령을 실행하지 않는다.
  if (error.code === 'MENU_SNAPSHOT_STALE') return { command: MENUS_REFRESH_COMMAND };
  if (error.code === 'TOOL_UNAVAILABLE') return knownTool(details.tool) ? { tool: details.tool } : {};
  return {};
}
/** 엔진 오류를 요청 응답으로 바꾼다. 허용 목록 코드가 붙은 ComposerError(해석기 오류는 분류해서)만 그 코드로, 나머지는 fallback 이다. */
function requestFailure(error, fallback) {
  if (error instanceof HttpError) return error;
  const classified = classifyRecipeFailure(error);
  if (!(classified instanceof ComposerError) || !Object.hasOwn(REQUEST_ERRORS, classified.code)) return fallback;
  return new HttpError(REQUEST_ERRORS[classified.code].status, classified.code, safeDetails(classified));
}
function errorBody({ code, details = {} }) {
  const rule = Object.hasOwn(REQUEST_ERRORS, code) ? REQUEST_ERRORS[code] : undefined;
  const message = code === 'TOOL_UNAVAILABLE' && knownTool(details.tool) ? TOOL_MESSAGES[details.tool] : MESSAGES[code];
  return { code, message, ...(rule?.action ? { action: rule.action } : {}), ...(rule?.field ? { field: rule.field } : {}),
    ...(Object.keys(details).length ? { details } : {}) };
}

/**
 * 실패한 단계·명령 식별자·종료 코드와 원본 저장소 기준 로그·작업 보고서 위치, 원본 커밋만 넘긴다. 오류 메시지와 자식 출력은
 * 보내지 않는다. 절대 경로·상위 폴더·역슬래시 경로는 이 컴퓨터의 폴더 이름을 흘릴 수 있어 버린다.
 */
function safeFailure(failure) {
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
function jobError(error, failure) {
  const fallback = { code: 'GENERATION_FAILED', message: MESSAGES.GENERATION_FAILED };
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

export function createComposerServer({ engine, publicDirectory = PUBLIC } = {}) {
  if (!engine || ['catalog', 'plan', 'generate'].some(method => typeof engine[method] !== 'function')) throw new TypeError('catalog, plan and generate engine methods are required');
  const csrfToken = randomBytes(32).toString('hex');
  const jobs = new Map();
  const requests = new Map();
  let active;
  let latest;
  // 점검은 명령 여러 개를 띄운다. 같은 원본 커밋을 묻는 겹친 요청은 진행 중인 점검 하나를 함께 기다린다.
  const preflightRuns = new Map();
  const server = createServer(async (request, response) => {
    secureHeaders(response);
    try {
      const authority = `127.0.0.1:${server.address().port}`;
      const origin = `http://${authority}`;
      // Opening the published local link is safe; cross-site API/subresource reads remain blocked.
      const initialNavigation = request.method === 'GET' && request.url === '/'
        && request.headers['sec-fetch-mode'] === 'navigate' && request.headers['sec-fetch-dest'] === 'document';
      const hostCount = request.rawHeaders.filter((_, index) => index % 2 === 0 && request.rawHeaders[index].toLowerCase() === 'host').length;
      if (hostCount !== 1 || request.headers.host !== authority
        || !['127.0.0.1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress)
        || ['forwarded', 'x-forwarded-host', 'x-forwarded-proto'].some(key => request.headers[key] !== undefined)
        || (request.headers.origin !== undefined && request.headers.origin !== origin)
        || (request.headers['sec-fetch-site'] === 'cross-site' && !initialNavigation)) throw new HttpError(403, 'FORBIDDEN');
      if (!request.url?.startsWith('/') || request.url.startsWith('//')) throw new HttpError(400, 'BAD_REQUEST');
      const url = new URL(request.url, origin);
      if (url.search || url.hash) throw new HttpError(400, 'BAD_REQUEST');
      const path = url.pathname;
      // 생성 전 점검도 이 컴퓨터에서 명령을 띄우므로 계획·생성과 같은 출처·CSRF 경계를 지난다.
      const mutation = ['/api/plan', '/api/plan/diff', '/api/plan/deep', '/api/preflight', '/api/jobs'].includes(path);
      if (request.method !== (mutation ? 'POST' : 'GET')) throw new HttpError(405, 'METHOD_NOT_ALLOWED');
      if (mutation) {
        const supplied = request.headers['x-composer-csrf'];
        if (request.headers.origin !== origin || typeof supplied !== 'string' || !/^[a-f0-9]{64}$/.test(supplied)
          || !timingSafeEqual(Buffer.from(supplied), Buffer.from(csrfToken))) throw new HttpError(403, 'FORBIDDEN');
      }
      if (path === '/api/session') {
        let catalog;
        try { catalog = await engine.catalog(); } catch (error) { throw requestFailure(error, new HttpError(500, 'INTERNAL_ERROR')); }
        json(response, 200, { csrfToken, catalog, job: latest ? jobs.get(latest) : null });
      } else if (mutation) {
        // 계획 차이는 선택 기능이다. 엔진이 제공하지 않으면 없는 경로로 답한다.
        if (path === '/api/plan/diff' && typeof engine.diff !== 'function') throw new HttpError(404, 'NOT_FOUND');
        if (path === '/api/preflight' && typeof engine.preflight !== 'function') throw new HttpError(404, 'NOT_FOUND');
        if (path === '/api/plan/deep' && typeof engine.deep !== 'function') throw new HttpError(404, 'NOT_FOUND');
        const input = await body(request);
        if (path === '/api/preflight') {
          // 원본 비교는 점검을 요청한 화면이 카탈로그를 받은 때의 커밋과 한다(탭마다 다를 수 있다).
          if (!keys(input, ['sourceCommit']) || typeof input.sourceCommit !== 'string' || !/^[a-f0-9]{40}$/.test(input.sourceCommit)) {
            throw new HttpError(400, 'BAD_REQUEST');
          }
          const { sourceCommit } = input;
          if (!preflightRuns.has(sourceCommit)) {
            preflightRuns.set(sourceCommit, Promise.resolve().then(() => engine.preflight({ sourceCommit }))
              .finally(() => preflightRuns.delete(sourceCommit)));
          }
          let result;
          try { result = await preflightRuns.get(sourceCommit); } catch { throw new HttpError(500, 'PREFLIGHT_FAILED'); }
          json(response, 200, { preflight: safePreflight(result) });
          return;
        }
        const allowed = { '/api/jobs': ['recipe', 'requestId'], '/api/plan/diff': ['recipe', 'domain'] }[path] ?? ['recipe'];
        if (!keys(input, allowed)) throw new HttpError(400, 'BAD_REQUEST');
        const recipe = validateComposerRequestRecipe(input.recipe);
        if (path === '/api/plan/deep') {
          let deep;
          // 코드가 붙은 오류(입력·원본 변경·선언 불일치 등)는 그 코드로, 그 밖의 엔진 오류는 점검 실패로 답한다(내용은 숨긴다).
          try { deep = await engine.deep(recipe); } catch (error) { throw requestFailure(error, new HttpError(500, 'DEEP_FAILED')); }
          json(response, 200, { deep: safeDeep(deep) });
        } else if (path === '/api/plan/diff') {
          if (!identifier(input.domain)) throw new HttpError(400, 'BAD_REQUEST');
          let diff;
          try { diff = await engine.diff(recipe, input.domain); } catch (error) { throw requestFailure(error, new HttpError(500, 'INTERNAL_ERROR')); }
          json(response, 200, { diff });
        } else if (path === '/api/plan') {
          let plan;
          try { plan = await engine.plan(recipe); } catch (error) { throw requestFailure(error, new HttpError(500, 'INTERNAL_ERROR')); }
          json(response, 200, { plan });
        } else {
          if (typeof input.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) throw new HttpError(400, 'BAD_REQUEST');
          const previous = requests.get(input.requestId);
          if (previous) {
            if (previous.recipe !== JSON.stringify(recipe)) throw new HttpError(409, 'REQUEST_CONFLICT');
            json(response, 200, { job: jobs.get(previous.id) });
            return;
          }
          if (active) throw new HttpError(409, 'BUSY');
          // Reserve before async planning, so simultaneous requests cannot both start.
          const id = randomUUID();
          active = id;
          try { await engine.plan(recipe); } catch (error) { active = undefined; throw requestFailure(error, new HttpError(500, 'INTERNAL_ERROR')); }
          const job = { id, requestId: input.requestId, status: 'running', recipe, stage: 'resolve', message: STAGES.resolve, progress: 0 };
          latest = id;
          jobs.set(id, job);
          requests.set(input.requestId, { id, recipe: JSON.stringify(recipe) });
          // A short in-memory history supports retries without creating a persistent job service.
          while (jobs.size > 20) {
            const oldest = jobs.keys().next().value;
            jobs.delete(oldest);
            for (const [key, record] of requests) if (record.id === oldest) requests.delete(key);
          }
          json(response, 202, { job });
          Promise.resolve().then(() => engine.generate(recipe, { onProgress: event => {
            if (job.status !== 'running' || !event || !Object.hasOwn(STAGES, event.stage)) return;
            job.stage = event.stage;
            job.message = STAGES[event.stage];
            if (Number.isFinite(event.progress)) job.progress = Math.max(job.progress, Math.min(99, Math.max(0, event.progress)));
          } })).then(result => {
            job.status = 'succeeded'; job.stage = 'complete'; job.message = STAGES.complete; job.progress = 100;
            job.result = safeResult(result, recipe);
          }, error => {
            const failure = safeFailure(error?.failure);
            job.status = 'failed'; job.error = jobError(error, failure);
            job.message = job.error.message;
            // 검증 실패만 실패한 단계와 가린 로그 끝부분을 함께 보인다(DEC-OPS-249).
            if (failure && job.error.code === 'VERIFY_FAILED') {
              failure.step = error.details.step; failure.stepLabel = VERIFY_STEP_LABELS[failure.step];
              const tail = safeLogTail(error.failure.logTail);
              if (tail) failure.logTail = tail;
            }
            if (failure) job.failure = failure;
          }).finally(() => { if (active === id) active = undefined; });
        }
      } else if (/^\/api\/jobs\/[0-9a-f-]{36}$/.test(path)) {
        const job = jobs.get(path.slice('/api/jobs/'.length));
        if (!job) throw new HttpError(404, 'NOT_FOUND');
        json(response, 200, { job });
      } else {
        const assets = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/confirm.js': ['confirm.js', 'text/javascript'],
          '/job.js': ['job.js', 'text/javascript'], '/name-rule.js': ['name-rule.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'] };
        if (!Object.hasOwn(assets, path)) throw new HttpError(404, 'NOT_FOUND');
        const [file, type] = assets[path];
        const content = await readFile(resolve(publicDirectory, file));
        response.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
        response.end(content);
      }
    } catch (error) {
      if (response.headersSent) { response.end(); return; }
      const failure = error instanceof HttpError ? error : new HttpError(500, 'INTERNAL_ERROR');
      json(response, failure.status, { error: errorBody(failure) });
    }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  // Never expose a caller-controlled host option: this tool can only bind IPv4 loopback.
  return {
    server,
    async listen(port = 3100) {
      if (!Number.isInteger(port) || port < 0 || port > 65535) throw new TypeError('invalid local port');
      await new Promise((accept, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', () => { server.off('error', reject); accept(); });
      });
      return `http://127.0.0.1:${server.address().port}`;
    },
    async close() { server.closeAllConnections(); await new Promise((accept, reject) => server.close(error => error ? reject(error) : accept())); },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 2 || args[0] !== '--port' || !/^\d+$/.test(args[1]))) throw new Error('usage');
    const { createComposerEngine } = await import('./project-composer.mjs');
    const application = createComposerServer({ engine: await createComposerEngine() });
    const origin = await application.listen(args.length ? Number(args[1]) : 3100);
    process.stdout.write(`[project-composer] ${origin}\n`);
  } catch {
    process.stderr.write('[project-composer] 로컬 생성기를 시작하지 못했습니다. 포트 사용 여부와 --port 값을 확인해 주세요.\n');
    process.exitCode = 1;
  }
}
