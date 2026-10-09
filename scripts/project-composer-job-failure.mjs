/*
 * 생성 작업 실패를 처음 생긴 지점에서 코드로 나눈다(설계서 14.2, E4b). 엔진은 판정 지점(Docker 컨테이너 만들기·준비 대기·
 * 자식 생성기·검증)에서 이 모듈을 부르고, 실패 모양(stage·code·causeCode·명령 식별자·저장소 기준 로그 위치)도 여기서 만든다.
 * 코드를 다는 조건은 좁다. 판정할 수 없으면 원래 오류를 그대로 두고, 서버는 그것을 일반 실패(GENERATION_FAILED)로 말한다.
 *   - 원본이 바뀌었으면(SOURCE_CHANGED) 자식 보고·Docker 탐침보다 먼저 말한다. 새 원본으로 다시 불러오면 함께 풀린다.
 *   - 자식 보고는 그 단계에 허용된 코드만 받는다(project-composer-child-failure.mjs).
 *   - Docker 는 종료 코드가 아니라 탐침(엔진 응답·컨테이너 실행 여부)으로 판정한다.
 *   - 검증 실패(VERIFY_FAILED)는 같은 작업이 남긴 검증 보고서의 신원과 단계·명령이 모두 맞을 때만이다.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, relative, sep } from 'node:path';
import { ComposerError, JOB_ERROR_CODES, withoutRoot } from './project-composer-errors.mjs';
import { createLogMasker, environmentSecrets } from './project-composer-command.mjs';
import { readChildFailure } from './project-composer-child-failure.mjs';
import { dockerAnswers, ownedPostgresRunning } from './project-composer-postgres.mjs';
import { verificationSteps } from './verify-reusable-artifact.mjs';

/** 검증을 실행하는 명령 식별자. 서버는 VERIFY_FAILED 가 이 명령의 실패일 때만 받는다. */
export const VERIFY_COMMAND_ID = 'scripts/verify-reusable-artifact.mjs';
export const LOG_TAIL_LINES = 40;
export const LOG_TAIL_WIDTH = 300;

/** base 안의 경로를 저장소 기준 '/' 경로로 바꾼다. 밖이면 undefined 다(절대 경로를 화면·보고서로 보내지 않는다). */
export function toRepositoryPath(base, path) {
  if (typeof path !== 'string' || !path) return undefined;
  const rel = relative(base, path);
  return rel && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel) ? rel.split(sep).join('/') : undefined;
}

/** 판정한 코드를 단 오류. 원래 오류는 cause 로 남겨 명령 식별자·종료 코드·로그 위치를 잃지 않는다. */
export const classified = (code, details, cause) => Object.assign(new ComposerError(code, details, String(cause?.message ?? code)), { cause });

/**
 * Docker 컨테이너를 만들다 실패했다. docker 실행 파일이 없거나(ENOENT) 엔진이 Linux 로 응답하지 않으면 TOOL_UNAVAILABLE 이다.
 * 엔진이 응답하는데 실패했으면(이미지 내려받기 실패·이름 충돌 등) 분류하지 않는다.
 */
export async function classifyDockerStart(error, docker, probeOptions = {}) {
  if (error?.code === 'TOOL_UNAVAILABLE' && error.errno === 'ENOENT') return classified('TOOL_UNAVAILABLE', { tool: 'docker' }, error);
  if (error?.code !== 'COMMAND_FAILED') return error;
  return await dockerAnswers(docker, probeOptions) ? error : classified('TOOL_UNAVAILABLE', { tool: 'docker' }, error);
}

/** 준비 대기를 다 썼다. 엔진이 응답하면 DB 가 준비되지 않은 것이고, 응답하지 않으면 Docker 를 쓸 수 없는 것이다. */
export async function classifyDatabaseNotReady(docker, probeOptions = {}) {
  const cause = new Error('Owned PostgreSQL did not become ready');
  return await dockerAnswers(docker, probeOptions) ? classified('DB_NOT_READY', {}, cause) : classified('TOOL_UNAVAILABLE', { tool: 'docker' }, cause);
}

/**
 * 자식 생성기(DB 번들·소스)가 실패했다. 순서: 원본 변경 → 자식이 보고한 코드 → (DB 단계만) Docker 엔진·컨테이너 상태.
 * sourceMoved 가 판정하지 못하면(git 실패 등) 원본 변경이라고 말하지 않는다 — 원래 오류를 대체하지 않는다.
 */
export async function classifyChildFailure(error, { stage, reportPath, root, sourceMoved, docker, container, probeOptions = {} }) {
  let moved = false;
  try { moved = await sourceMoved(); } catch { moved = false; }
  if (moved) return classified('SOURCE_CHANGED', {}, error);
  if (error?.code === 'COMMAND_FAILED') {
    const reported = readChildFailure(reportPath, stage, root);
    if (reported) return classified(reported.code, reported.details, error);
  }
  if (stage !== 'database' || !docker || error?.code !== 'COMMAND_FAILED') return error;
  if (!await dockerAnswers(docker, probeOptions)) return classified('TOOL_UNAVAILABLE', { tool: 'docker' }, error);
  if (!await ownedPostgresRunning(docker, container, probeOptions)) return classified('DB_NOT_READY', {}, error);
  return error;
}

/**
 * 검증 명령이 실패했을 때, 같은 작업이 남긴 검증 보고서(full.json)에서 실패한 단계를 찾는다. 다음이 모두 맞을 때만이다.
 * 결과 failed·범위 full, 원본 커밋·배치·프로필이 구성과 같음, 이 작업이 시작된 뒤에 확인함, 종료 코드가 정수(신호·실행 실패 제외),
 * 실패 단계가 단계 표에 있고 마지막 단계 기록과 같음, 실패 명령이 그 단계의 명령과 정확히 같음.
 */
export function failedVerificationStep(projectDirectory, composition, startedAt) {
  let report;
  try { report = JSON.parse(readFileSync(join(projectDirectory, 'build/reports/reusable-base/full.json'), 'utf8')); } catch { return undefined; }
  const failure = report?.failure;
  const last = Array.isArray(report?.steps) ? report.steps.at(-1) : undefined;
  if (report?.result !== 'failed' || report.scope !== 'full' || report.sourceCommit !== composition.sourceCommit
    || report.layout !== composition.backendLayout || report.profile !== composition.profile
    || !(Date.parse(report.checkedAt) >= Date.parse(startedAt))) return undefined;
  // 실패 단계가 단계 표에 없으면 아래에서 같은 id 의 명령을 찾지 못해 판정하지 않는다.
  if (!failure || !Number.isSafeInteger(failure.exitCode)) return undefined;
  if (last?.result !== 'failed' || last.step !== failure.step || last.command !== failure.command) return undefined;
  const expected = verificationSteps('full', composition.backendLayout).find(step => step.id === failure.step);
  if (!expected || [expected.command, ...expected.args].join(' ') !== failure.command) return undefined;
  return { step: failure.step, command: failure.command };
}

const EXIT_LINE = /^\[종료 코드 .+ · 가림 \d+건\]$/;
const ANSI = /\u001b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\-_])/g;
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;

/**
 * 검증 단계 로그의 끝부분(화면의 접힌 '로그 끝부분'). 실패한 단계의 머리줄부터 자르고 종료 코드 줄·빈 줄을 뺀다.
 * 줄마다 터미널 제어 문자를 먼저 지우고(색 코드가 비밀 이름을 가르지 못하게) 같은 비밀 규칙으로 다시 가린 뒤, 생성 프로젝트·
 * 원본 저장소 경로를 저장소 기준으로, 사용자 폴더를 '~' 로 바꾼다. 경로를 가린 뒤에 줄을 잘라 루트 조각이 남지 않게 한다.
 * 마지막 40줄, 줄마다 300자다.
 */
export function verificationLogTail(logPath, header, { roots = [], home = homedir(), env = process.env } = {}) {
  let text;
  try { text = readFileSync(logPath, 'utf8'); } catch { return undefined; }
  const lines = text.split(/\r?\n/);
  const marker = `[reusable-verify] ${header.profile}/${header.layout}: ${header.command}`;
  const start = lines.findLastIndex(line => line === marker);
  const masker = createLogMasker(environmentSecrets(env));
  const tail = (start >= 0 ? lines.slice(start) : lines).filter(line => !EXIT_LINE.test(line)).map(raw => {
    let line = masker.line(raw.replace(ANSI, '').replace(/\t/g, ' ').replace(CONTROL, ' '));
    for (const base of roots) if (base) line = withoutRoot(base, line);
    if (home) line = withoutRoot(home, line, '~');
    return line.trimEnd();
  }).filter(Boolean).slice(-LOG_TAIL_LINES).map(line => line.slice(0, LOG_TAIL_WIDTH));
  return tail.length ? tail : undefined;
}

/** 검증 명령의 실패를 VERIFY_FAILED 로 바꾼다. 판정할 수 없으면 원래 오류 그대로다. */
export function classifyVerificationFailure(error, { projectDirectory, composition, startedAt, roots }) {
  if (error?.code !== 'COMMAND_FAILED' || error.commandId !== VERIFY_COMMAND_ID) return error;
  const found = failedVerificationStep(projectDirectory, composition, startedAt);
  if (!found) return error;
  const logTail = error.log ? verificationLogTail(error.log,
    { profile: composition.profile, layout: composition.backendLayout, command: found.command }, { roots }) : undefined;
  return Object.assign(classified('VERIFY_FAILED', { step: found.step }, error), logTail ? { logTail } : {});
}

/**
 * 작업 실패의 모양. code 는 작업 코드 목록 안의 ComposerError 일 때만 싣고, 원래 코드(명령 실패·errno·FK_CLOSURE 등)는
 * causeCode 로 보고서에만 남긴다. 로그 위치는 원본 저장소 기준이다. 로그 끝부분은 던지는 실패에만 붙인다(보고서에는 없다).
 */
export function jobFailure(error, { stage, outputRoot, sourceCommit }) {
  const coded = error instanceof ComposerError && JOB_ERROR_CODES.includes(error.code);
  const command = error?.cause?.commandId ? error.cause : error;
  const causeCode = error instanceof ComposerError ? (error.cause?.code ?? error.code) : error?.code;
  const log = toRepositoryPath(outputRoot, command?.log);
  return { stage,
    ...(coded ? { code: error.code } : {}),
    causeCode: typeof causeCode === 'string' ? causeCode : 'COMPOSITION_FAILED',
    ...(command?.commandId ? { commandId: command.commandId, exitCode: command.exitCode ?? null, durationMs: command.durationMs } : {}),
    ...(log ? { log } : {}),
    ...(sourceCommit ? { sourceCommit } : {}),
    ...(coded && error.code === 'VERIFY_FAILED' ? { step: error.details.step, ...(error.logTail ? { logTail: error.logTail } : {}) } : {}) };
}
