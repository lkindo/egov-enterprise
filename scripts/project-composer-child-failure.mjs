/*
 * 생성 단계 자식(DB 번들·소스 생성기)이 엔진에 실패 원인을 코드로 알리는 보고 파일(설계서 14.2, E4b).
 * 엔진이 `--failure-report <작업 폴더>/failures/<단계>.json` 을 넘기고, 자식은 그 단계에 허용된 코드가 붙은 실패만 쓴다.
 * 자식 출력 원문은 여전히 가린 로그에만 남는다. 보고 파일에는 코드와 코드별로 정한 세부 정보만 담긴다.
 * 경로는 원본 저장소의 build 아래 아직 없는 .json 으로 가두고, 한 번만 쓴다(wx) — 자식이 임의 파일을 덮어쓰지 않는다.
 */
import { closeSync, existsSync, mkdirSync, openSync, readSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { ComposerError, withoutRoot } from './project-composer-errors.mjs';

/** 단계마다 자식이 보고할 수 있는 코드. 원본 변경(SOURCE_CHANGED)은 엔진이 직접 판정하므로 자식은 보고하지 않는다. */
export const CHILD_FAILURE_CODES = Object.freeze({
  database: Object.freeze(['MENU_SNAPSHOT_STALE', 'CATALOG_DRIFT']),
  source: Object.freeze(['SOURCE_SURVIVAL']),
});
const MAX_REPORT_BYTES = 64 * 1024;
const outside = rel => rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
const repositoryFile = value => typeof value === 'string' && value.length > 0 && value.length <= 500 && !isAbsolute(value)
  && !/^[A-Za-z]:/.test(value) && !value.includes('\\') && !value.split('/').some(part => part === '..' || part === '');

/** 자식이 받은 보고 경로를 검증한다. 원본 build 아래, .json, 아직 없는 파일, 실제 경로의 조상이 원본 안이어야 한다. */
export function childFailureReportPath(value, root) {
  if (typeof value !== 'string' || !value || value.startsWith('--')) throw new Error('--failure-report requires a path.');
  const path = resolve(root, value);
  const rel = relative(resolve(root, 'build'), path);
  if (!rel || outside(rel) || extname(path) !== '.json') throw new Error('--failure-report must be a new .json file under build.');
  if (existsSync(path)) throw new Error('--failure-report must not exist yet.');
  let ancestor = dirname(path);
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const realRel = relative(realpathSync(root), realpathSync(ancestor));
  if (realRel && outside(realRel)) throw new Error('--failure-report must stay inside the source checkout.');
  return path;
}

/** 명령 인자에서 보고 경로를 찾아 검증한다. 없으면 undefined, 두 번이거나 잘못됐으면 던진다. */
export function failureReportFromArgv(argv, root) {
  const at = argv.flatMap((arg, index) => (arg === '--failure-report' ? [index] : []));
  if (!at.length) return undefined;
  if (at.length > 1) throw new Error('--failure-report may only be supplied once.');
  return childFailureReportPath(argv[at[0] + 1], root);
}

/** 그 단계에 허용된 코드가 붙은 실패만 쓴다. 쓰지 못해도(디스크·이미 있음) 자식의 실패 종료는 그대로다. */
export function writeChildFailure(path, stage, error) {
  if (!path || !(error instanceof ComposerError) || !CHILD_FAILURE_CODES[stage]?.includes(error.code)) return false;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify({ schemaVersion: 1, stage, code: error.code, details: error.details ?? {} })}\n`, { flag: 'wx' });
    return true;
  } catch { return false; }
}

/**
 * 자식 생성기의 최상위 실행. 보고 경로를 먼저 검증하고(잘못되면 main 을 부르지 않는다), main 이 던지거나 거부하면
 * 그 단계에 허용된 코드만 보고 파일에 쓴 뒤 `[label] FAIL` 한 줄과 종료 코드 1 로 끝낸다. main 은 동기·비동기 모두 받는다.
 */
export function runReportingChild({ argv, root, stage, label, main, exit = code => { process.exitCode = code; },
  log = message => console.error(message) }) {
  let report;
  const failed = error => { writeChildFailure(report, stage, error); log(`[${label}] FAIL: ${error?.message ?? error}`); exit(1); };
  try { report = failureReportFromArgv(argv, root); }
  catch (error) { log(`[${label}] FAIL: ${error.message}`); exit(1); return Promise.resolve(); }
  try { return Promise.resolve(main()).catch(failed); }
  catch (error) { failed(error); return Promise.resolve(); }
}

/**
 * 파일을 한 번 열어 상한보다 한 바이트 더까지만 읽는다. 크기를 먼저 묻고 다시 열면 그 사이에 파일이 바뀔 수 있다(확인과 사용의 경쟁).
 * 상한을 넘으면 null 이다.
 */
function readBounded(path, limit) {
  const descriptor = openSync(path, 'r');
  try {
    const buffer = Buffer.alloc(limit + 1);
    let size = 0;
    for (let read = 1; read > 0 && size < buffer.length;) {
      read = readSync(descriptor, buffer, size, buffer.length - size, null);
      size += read;
    }
    return size > limit ? null : buffer.subarray(0, size).toString('utf8');
  } finally { closeSync(descriptor); }
}

/**
 * 엔진이 보고를 읽는다. 크기·형식·단계·코드가 맞지 않으면 없는 것으로 본다(분류하지 않는다).
 * 세부 정보는 코드마다 다시 거른다: 소스 소실은 저장소 기준 파일 1~200개, 선언 불일치는 첫 위반 한 줄(경로 가림).
 */
export function readChildFailure(path, stage, root) {
  let report;
  try {
    const text = readBounded(path, MAX_REPORT_BYTES);
    if (text === null) return null;
    report = JSON.parse(text);
  } catch { return null; }
  if (report?.schemaVersion !== 1 || report.stage !== stage || !CHILD_FAILURE_CODES[stage]?.includes(report.code)) return null;
  const details = report.details && typeof report.details === 'object' && !Array.isArray(report.details) ? report.details : {};
  if (report.code === 'SOURCE_SURVIVAL') {
    const files = Array.isArray(details.files) && details.files.length >= 1 && details.files.length <= 200
      && details.files.every(repositoryFile) ? details.files : undefined;
    return new ComposerError('SOURCE_SURVIVAL', files ? { files } : {}, `The ${stage} step reported SOURCE_SURVIVAL`);
  }
  if (report.code === 'CATALOG_DRIFT') {
    const violation = Array.isArray(details.violations) && typeof details.violations[0] === 'string'
      ? withoutRoot(root, details.violations[0]).replace(/[\r\n\0]+/g, ' ').trim().slice(0, 300) : '';
    return new ComposerError('CATALOG_DRIFT', violation ? { violations: [violation] } : {}, `The ${stage} step reported CATALOG_DRIFT`);
  }
  return new ComposerError(report.code, {}, `The ${stage} step reported ${report.code}`);
}
