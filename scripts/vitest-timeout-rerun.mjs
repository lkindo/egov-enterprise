#!/usr/bin/env node
// [2026-10-29 DEC-OPS-390] pre-push 의 Vitest 단계(불변식·원문 계약·cross-stack)를 감싼다. 실패가 모두 Vitest 자신의 시간 초과
//   (시험·훅)일 때만 그 파일을 단독으로 한 번 다시 돈다. 동기 시험의 시간 초과는 본문의 단언이 모두 통과한 뒤 늦었다는 뜻이고
//   비동기 시험의 시간 초과는 결과 미정이라, 어느 쪽도 정합성 판정 정보가 없다 — 같은 기계의 다른 실행(다른 오퍼레이터의 Gradle·
//   node --test·IDE)이 만든 부하로 나던 거짓 red 다(2026-10-28 eslint-mutation-render-state 17.5초·단독 3초, 10-29 cross-stack
//   3파일·단독 8.2초). 단언·모듈·처리되지 않은 오류, 중단, 결과를 읽지 못한 실행과 재실행의 어떤 실패도 그대로 막는다.
//   CI 에서는 다시 돌지 않는다(권위 게이트는 무재시도 — ci.yml 은 이 래퍼를 부르지 않는다). 15초 예산도 그대로다.
//   이 파일은 그 판정에 쓰는 Vitest reporter(default export)이기도 하다.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { noteTimeoutRerun } from './verification-record.mjs';

const SCRIPT = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SCRIPT), '..');
const FRONTEND = path.join(REPO_ROOT, 'frontend');
const OUTCOME_ENV = 'EGOV_VITEST_OUTCOME';
const PREFIX = '[vitest-timeout-rerun]';
// @vitest/runner makeTimeoutError 의 문구 전체다(시험·훅). 시작과 끝을 고정해 단언 메시지 속 같은 문장은 시간 초과로 보지 않는다.
const TIMEOUT = /^(Test|Hook) timed out in \d+ms\.\nIf this is a long-running (test|hook), pass a timeout value as the last argument or configure it globally with "(testTimeout|hookTimeout)"\.$/;
const TEST_FILE = /^src\/[^\s]+\.test\.tsx?$/;

const messages = errors => [...(errors ?? [])].map(error => String(error?.message ?? error));

/** onTestRunEnd 의 인자에서 판정에 필요한 것만 뽑는다(파일, 모듈·스위트 오류, 실패한 시험의 오류). */
export function collectOutcome(testModules, unhandledErrors, reason) {
  return {
    reason,
    unhandledErrorCount: unhandledErrors?.length ?? 0,
    modules: [...testModules].map(module => ({
      file: module.relativeModuleId,
      errors: [...messages(module.errors()), ...[...module.children.allSuites()].flatMap(suite => messages(suite.errors()))],
      failed: [...module.children.allTests('failed')].map(test => ({ name: test.fullName, errors: messages(test.result().errors) })),
    })),
  };
}

/** Vitest reporter: 실행이 끝나면 판정 재료를 EGOV_VITEST_OUTCOME 파일에 쓴다. 그 변수가 없으면 아무것도 하지 않는다. */
export default class OutcomeReporter {
  onTestRunEnd(testModules, unhandledErrors, reason) {
    const target = process.env[OUTCOME_ENV];
    if (target) writeFileSync(target, JSON.stringify(collectOutcome(testModules, unhandledErrors, reason)), 'utf8');
  }
}

/**
 * 다시 돌 파일(frontend 기준 상대 경로). 실패가 하나라도 시간 초과가 아니거나, 처리되지 않은 오류·중단·결과 부재·CI 면 빈 목록이다
 * — 빈 목록은 첫 실행의 종료 코드 그대로 막는다는 뜻이다.
 */
export function rerunPlan(outcome, { ci = false } = {}) {
  if (ci || !outcome || outcome.reason !== 'failed' || outcome.unhandledErrorCount !== 0 || !Array.isArray(outcome.modules)) return [];
  const failing = outcome.modules.filter(module => module.errors.length > 0 || module.failed.length > 0);
  if (failing.length === 0) return [];
  // 오류 없이 실패한 시험은 원인을 모른다 — 시간 초과로 볼 근거가 없다.
  if (failing.some(module => module.failed.some(test => test.errors.length === 0))) return [];
  const failures = failing.flatMap(module => [...module.errors, ...module.failed.flatMap(test => test.errors)]);
  if (!failures.every(message => TIMEOUT.test(message))) return [];
  const files = failing.map(module => module.file);
  return files.every(file => typeof file === 'string' && TEST_FILE.test(file) && !file.split('/').includes('..')) ? files : [];
}

function defaultRunVitest(args) {
  const frontendRequire = createRequire(path.join(FRONTEND, 'package.json'));
  const manifest = frontendRequire.resolve('vitest/package.json');
  const bin = path.join(path.dirname(manifest), JSON.parse(readFileSync(manifest, 'utf8')).bin.vitest);
  const reporter = path.relative(FRONTEND, SCRIPT).replaceAll('\\', '/');
  const directory = mkdtempSync(path.join(tmpdir(), 'vitest-outcome-'));
  const target = path.join(directory, 'outcome.json');
  try {
    const result = spawnSync(process.execPath, [bin, 'run', ...args, '--reporter=default', `--reporter=${reporter}`],
      { cwd: FRONTEND, stdio: 'inherit', env: { ...process.env, [OUTCOME_ENV]: target } });
    let outcome = null;
    try { outcome = JSON.parse(readFileSync(target, 'utf8')); } catch { outcome = null; }
    return { status: result.error ? null : result.status, outcome };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function defaultNote(note) {
  const runId = process.env.EGOV_VERIFICATION_RUN_ID;
  if (runId) noteTimeoutRerun(REPO_ROOT, runId, note);
}

export function main(args, { runVitest = defaultRunVitest, ci = Boolean(process.env.CI), log = message => console.error(message),
  note = defaultNote } = {}) {
  // 경로 필터만 받는다 — 옵션은 값이 따로 오는지(`--testTimeout 20000`) 알 수 없어 재실행 인자로 옮길 수 없다. 받으면 돌리지 않고 막는다.
  if (args.length === 0 || args.some(arg => typeof arg !== 'string' || arg === '' || arg.startsWith('-'))) {
    log(`${PREFIX} 사용법: node scripts/vitest-timeout-rerun.mjs <vitest 경로 필터…> — 옵션은 받지 않는다(재실행에 그대로 옮길 수 없다).`);
    return 2;
  }
  const first = runVitest(args);
  if (first.status === 0) return 0;
  const files = first.status === 1 ? rerunPlan(first.outcome, { ci }) : [];
  if (files.length === 0) {
    const timedOut = (first.outcome?.modules ?? []).some(module =>
      [...module.errors, ...module.failed.flatMap(test => test.errors)].some(message => TIMEOUT.test(message)));
    if (timedOut) log(`${PREFIX} 시간 초과와 다른 실패(단언·모듈·처리되지 않은 오류)가 섞였거나 CI 라 다시 돌지 않는다 — 그대로 막는다.`);
    return first.status || 1;
  }
  log(`${PREFIX} 실패가 모두 Vitest 시간 초과다(단언 실패 아님) — 이 파일만 단독으로 한 번 다시 돈다(SOP §6.3):\n  ${files.join('\n  ')}`);
  const second = runVitest([...files, '--no-file-parallelism', '--bail=1']);
  const passed = second.status === 0;
  note({ files, rerunResult: passed ? 'passed' : 'failed' });
  log(passed
    ? `${PREFIX} 단독 재실행 통과 — 부하에 따른 시간 초과로 본다. 이름을 보고에 남기고, 단독·CI 에서 다시 흔들리면 그 시험을 고친다.`
    : `${PREFIX} 단독에서도 실패한다 — 부하가 아니라 실제 실패·느려짐이다.`);
  return passed ? 0 : second.status || 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT) process.exit(main(process.argv.slice(2)));
