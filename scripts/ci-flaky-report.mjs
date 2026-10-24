#!/usr/bin/env node
/**
 * CI flaky·인프라 실패 이력 보고(읽기 전용, 게이트 아님) — `npm run ci:flaky-report`.
 *
 * 재실행과 새 push 가 flaky 를 가렸다: React #418 은 #960 이후 E2E 실행의 약 25% 에서 났는데 재실행으로 넘어가 이틀간 아무도
 * 몰랐다(2026-10-23, 손으로 CI 이력 40개 실행을 긁어서야 찾았다). 이 도구는 'Java CI with Gradle' 최근 실행의 모든 시도에서
 * 실패한 잡을 첫 실패 스텝으로 분류하고(인프라·시험·미분류), 실패한 E2E 샤드의 진단 산출물(e2e-results.json)에서 flaky·실패
 * 시험을 모아 원인별·시험별 빈도를 출력한다.
 *
 * - gh 로 GET 만 하고 GitHub·디스크에 쓰지 않는다(산출물 zip 은 메모리에서 읽는다). 호출 수에 상한이 있다(--max-calls).
 * - 분류 규칙의 스텝 이름은 ci.yml 에 실제로 있어야 한다 — 이름이 바뀌면 조용히 미분류가 되지 않고 실패한다.
 * - 시험 단위 자료는 진단 산출물 보존 기한(ci.yml 의 retention-days) 안의 실행만 있다. 결과가 불완전하면 종료 코드 1 이다.
 * - 병합 증거가 아니다. 재실행 판단(오케스트레이션 프로토콜 §6.2)의 근거 자료다.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW_FILE = '.github/workflows/ci.yml';

export class UsageError extends Error {}

export function parseOptions(argv) {
  const options = { runs: 40, branch: null, event: null, maxCalls: 200, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = () => {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith('--')) throw new UsageError(`${flag} 에 값이 없다`);
      index += 1;
      return next;
    };
    // GitHub 의 실행 목록은 한 번에 100개까지다(per_page 상한) — 그보다 크게 받으면 조용히 100개만 본다.
    if (flag === '--runs') options.runs = boundedInteger(value(), 1, 100, flag);
    else if (flag === '--max-calls') options.maxCalls = boundedInteger(value(), 1, 1000, flag);
    else if (flag === '--branch') {
      options.branch = value();
      if (!/^[A-Za-z0-9._/-]+$/.test(options.branch)) throw new UsageError(`--branch 값이 허용 문자가 아니다: ${options.branch}`);
    } else if (flag === '--event') {
      options.event = value();
      if (!['push', 'pull_request'].includes(options.event)) throw new UsageError('--event 는 push 또는 pull_request 다');
    } else if (flag === '--json') options.json = true;
    else throw new UsageError(`모르는 인자: ${flag}`);
  }
  return options;
}

function boundedInteger(text, min, max, flag) {
  if (!/^\d+$/.test(text)) throw new UsageError(`${flag} 는 정수다: ${text}`);
  const number = Number(text);
  if (number < min || number > max) throw new UsageError(`${flag} 는 ${min}~${max} 다: ${text}`);
  return number;
}

// 첫 실패 스텝 이름 → 원인. 스텝 이름은 ci.yml 에 있어야 한다(ciRuleViolations). GitHub 이 만드는 준비 스텝은 이름 앞부분으로 본다.
export const STEP_RULES = Object.freeze([
  ['Install Playwright Browsers', 'infra:playwright-install'],
  ['Install Playwright Dependencies (system deps)', 'infra:playwright-install'],
  ['Build API image', 'infra:docker-build'],
  ['Provision Gradle distribution with bounded retry', 'infra:gradle-distribution'],
  ['Install dependencies', 'infra:package-install'],
  ['Run E2E Tests (Sharded)', 'test:e2e'],
  ['Frontend unit and coverage suite', 'test:frontend'],
  ['Build and Test with Gradle', 'test:backend'],
]);
const RUNNER_SETUP = /^(?:Set up job|Set up |Setup |Run actions\/|Complete job)/;
// required check 집계 잡은 다른 잡의 결과를 모을 뿐이라 원인 집계에서 뺀다(.github/required-checks.json 의 aggregate).
export const AGGREGATE_JOBS = Object.freeze(['backend-build', 'frontend-build', 'e2e-test', 'mutation-test', 'secure-coding']);

/** 규칙 스텝 이름이 ci.yml 에 없으면 그 이름 목록. 비어 있어야 한다. */
export function ciRuleViolations(ciYaml) {
  const normalized = ciYaml.replace(/\r\n/g, '\n');
  return STEP_RULES.map(([name]) => name).filter(name => !normalized.includes(`- name: ${name}\n`));
}

/** filter=all 이 이전 시도의 잡을 복사해 돌려준 항목을 뺀다 — 이름과 시작·종료 시각이 같은 앞 시도 잡이 있으면 복사본이다. */
export function executedJobs(attempts) {
  const seen = new Set();
  const executed = [];
  for (const { attempt, jobs } of [...attempts].sort((left, right) => left.attempt - right.attempt)) {
    for (const job of jobs) {
      const identity = `${job.name}|${job.started_at}|${job.completed_at}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      executed.push({ ...job, attempt });
    }
  }
  return executed;
}

/**
 * 실패·취소된 잡의 원인. 성공·건너뜀이면 null.
 * 처음 멈춘 스텝이 취소(cancelled)면 원인이 아니라 'cancelled' 다 — 새 push 의 동시성 취소·수동 취소·잡 시간 상한이며, 스텝
 * 시간 초과는 failure 로 남는다(run 39963674681 첫 시도). 취소를 인프라·시험 실패로 세면 대체된 실행 하나가 수십 건으로 부푼다.
 */
export function classifyJob(job) {
  if (!['failure', 'cancelled', 'timed_out'].includes(job.conclusion)) return null;
  if (AGGREGATE_JOBS.includes(job.name)) return { cause: 'derived', step: null };
  const failed = (job.steps ?? []).find(step => ['failure', 'cancelled', 'timed_out'].includes(step.conclusion));
  if (!failed) return { cause: job.conclusion === 'failure' ? 'unclassified' : 'cancelled', step: null };
  if (failed.conclusion === 'cancelled') return { cause: 'cancelled', step: failed.name };
  const rule = STEP_RULES.find(([name]) => name === failed.name);
  if (rule) return { cause: rule[1], step: failed.name };
  if (RUNNER_SETUP.test(failed.name)) return { cause: 'infra:runner-setup', step: failed.name };
  if (failed.name.startsWith('Mutation Test')) return { cause: 'mutation', step: failed.name };
  return { cause: 'unclassified', step: failed.name };
}

/** 같은 잡 이름이 뒤 시도에서 성공했으면 재실행으로 회복한 실패다. */
export function recoveredByRerun(job, executed) {
  return executed.some(other => other.name === job.name && other.attempt > job.attempt && other.conclusion === 'success');
}

/** 'e2e-tests (k/n)' 샤드의 진단 산출물: 이름이 맞고 생성 시각이 그 잡의 실행 창 안인 것. */
export function matchDiagnosticsArtifact(artifacts, job) {
  const shard = job.name.match(/^e2e-tests \((\d+)\/\d+\)$/);
  if (!shard) return null;
  const name = `e2e-diagnostics-shard-${Number(shard[1]) - 1}`;
  const start = Date.parse(job.started_at);
  const end = Date.parse(job.completed_at) + 5000;
  return artifacts.find(artifact => artifact.name === name && !artifact.expired
    && Date.parse(artifact.created_at) >= start && Date.parse(artifact.created_at) <= end) ?? null;
}

/** 메모리의 zip 에서 basename 이 정확히 하나인 항목을 읽는다(방법 0·8 만). 디스크에 풀지 않는다. */
export function readZipEntry(buffer, basename, { maxBytes = 64 * 1024 * 1024 } = {}) {
  let eocd = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65557); offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) throw new Error('zip 끝 레코드가 없다');
  const entries = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);
  const matches = [];
  const pattern = new RegExp(`(^|/)${basename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
  for (let index = 0; index < entries; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error('zip 중앙 디렉터리가 깨졌다');
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const compressed = buffer.readUInt32LE(cursor + 20);
    const size = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const local = buffer.readUInt32LE(cursor + 42);
    const name = buffer.toString('utf8', cursor + 46, cursor + 46 + nameLength);
    if (pattern.test(name)) matches.push({ name, flags, method, compressed, size, local });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (matches.length !== 1) throw new Error(`zip 에 ${basename} 가 ${matches.length}개다`);
  const [entry] = matches;
  if (entry.flags & 0x1) throw new Error('암호화된 zip 항목은 읽지 않는다');
  if (entry.size > maxBytes || entry.compressed === 0xffffffff) throw new Error(`zip 항목이 상한을 넘는다: ${entry.name}`);
  if (buffer.readUInt32LE(entry.local) !== 0x04034b50) throw new Error('zip 지역 헤더가 깨졌다');
  const dataStart = entry.local + 30 + buffer.readUInt16LE(entry.local + 26) + buffer.readUInt16LE(entry.local + 28);
  const data = buffer.subarray(dataStart, dataStart + entry.compressed);
  let content;
  if (entry.method === 0) content = data;
  else if (entry.method === 8) content = inflateRawSync(data, { maxOutputLength: maxBytes });
  else throw new Error(`지원하지 않는 zip 압축 방법: ${entry.method}`);
  if (content.length !== entry.size) throw new Error(`zip 항목 크기가 선언과 다르다: ${entry.name}`);
  return content;
}

/** Playwright JSON 결과에서 기대와 다른 시험(flaky·unexpected)과 시험 밖 전역 오류(globalSetup·워커 충돌 등). */
export function testOutcomes(results) {
  if (!results || !Array.isArray(results.suites)) throw new Error('Playwright JSON 결과 형식이 아니다');
  const outcomes = [];
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        if (test.status === 'expected' || test.status === 'skipped') continue;
        // 감싸는 오류(AggregateError) 아래에 실제 원인이 있을 수 있어, 처음 실패한 시도의 오류 메시지를 모두 본다.
        const failedAttempt = test.results?.find(result => (result.errors ?? []).length > 0);
        const messages = (failedAttempt?.errors ?? []).map(error => error.message ?? '').join('\n');
        outcomes.push({ status: test.status, test: `${spec.file}:${spec.line} ${spec.title}`, signature: errorSignature(messages) });
      }
    }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of results.suites) walk(suite);
  // 전역 오류만으로 샤드가 붉을 수 있다(playwright-result-contract 의 'global execution errors') — 시험이 없어도 원인을 남긴다.
  for (const error of results.errors ?? []) {
    outcomes.push({ status: 'global-error', test: '(전역 오류 — globalSetup·globalTeardown·워커)', signature: errorSignature(error.message ?? error.value ?? '') });
  }
  return outcomes;
}

/** 오류 메시지의 대표 표지 — React 운영 오류 번호를 먼저, 아니면 ANSI 를 뺀 첫 줄. */
export function errorSignature(message) {
  const plain = String(message).replace(/\u001b\[[0-9;]*m/g, '');
  const react = plain.match(/Minified React error #(\d+)/);
  if (react) return `React #${react[1]}`;
  return plain.split('\n').map(line => line.trim()).find(Boolean)?.slice(0, 160) ?? '(메시지 없음)';
}

/** gh GET 실행기 — 5xx 는 두 번까지 다시 묻고, 예산을 넘기면 BudgetError 다. */
export class BudgetError extends Error {}
export function createGh({ maxCalls, exec = (args, options) => execFileSync('gh', args, options) }) {
  let calls = 0;
  const call = (endpoint, { binary = false } = {}) => {
    for (let attempt = 0; ; attempt += 1) {
      if (calls >= maxCalls) throw new BudgetError(`API 호출 상한(${maxCalls})에 닿았다`);
      calls += 1;
      try {
        const output = exec(['api', '--method', 'GET', endpoint], { encoding: binary ? 'buffer' : 'utf8', maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
        return binary ? output : JSON.parse(output);
      } catch (error) {
        const stderr = String(error.stderr ?? '');
        if (attempt < 2 && /HTTP 5\d\d/.test(stderr)) continue;
        throw error;
      }
    }
  };
  return { call, calls: () => calls };
}

function repositorySlug() {
  const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  const match = remote.match(/github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?$/);
  if (!match) throw new UsageError(`origin 이 GitHub 저장소가 아니다: ${remote}`);
  return match[1];
}

export function collectReport({ gh, slug, options }) {
  const query = new URLSearchParams({ per_page: String(options.runs) });
  if (options.branch) query.set('branch', options.branch);
  if (options.event) query.set('event', options.event);
  const runs = gh.call(`repos/${slug}/actions/workflows/ci.yml/runs?${query}`).workflow_runs ?? [];
  const failures = [];
  const tests = [];
  const gaps = [];
  for (const run of runs) {
    const attempts = [];
    for (let attempt = 1; attempt <= run.run_attempt; attempt += 1) {
      attempts.push({ attempt, jobs: gh.call(`repos/${slug}/actions/runs/${run.id}/attempts/${attempt}/jobs?per_page=100`).jobs ?? [] });
    }
    const executed = executedJobs(attempts);
    let artifacts = null;
    for (const job of executed) {
      const classified = classifyJob(job);
      if (!classified || classified.cause === 'derived') continue;
      failures.push({ run: run.id, attempt: job.attempt, job: job.name, ...classified, recovered: recoveredByRerun(job, executed), at: job.started_at });
      if (classified.cause !== 'test:e2e') continue;
      artifacts ??= gh.call(`repos/${slug}/actions/runs/${run.id}/artifacts?per_page=100`).artifacts ?? [];
      const artifact = matchDiagnosticsArtifact(artifacts, job);
      if (!artifact) { gaps.push(`${run.id} ${job.name} 시도 ${job.attempt}: 진단 산출물 없음(보존 기한 7일 경과 또는 업로드 실패)`); continue; }
      // 한 산출물이 깨져도(결과 파일 없음·깨진 JSON — Playwright 가 쓰기 전에 멈춘 샤드) 나머지 보고는 낸다. 예산 초과만 전체를 멈춘다.
      let outcomes;
      try {
        const results = JSON.parse(readZipEntry(gh.call(`repos/${slug}/actions/artifacts/${artifact.id}/zip`, { binary: true }), 'e2e-results.json').toString('utf8'));
        outcomes = testOutcomes(results);
      } catch (error) {
        if (error instanceof BudgetError) throw error;
        gaps.push(`${run.id} ${job.name} 시도 ${job.attempt}: 진단 산출물을 읽지 못함(${error.message})`);
        continue;
      }
      if (outcomes.length === 0) gaps.push(`${run.id} ${job.name} 시도 ${job.attempt}: 실패 원인이 시험·전역 오류 결과에 없다(결과 계약 위반만으로 실패했을 수 있다)`);
      for (const outcome of outcomes) tests.push({ run: run.id, attempt: job.attempt, ...outcome });
    }
  }
  return { runs: runs.length, window: runs.length ? [runs.at(-1).created_at, runs[0].created_at] : null, failures, tests, gaps };
}

export function renderText(report) {
  const lines = [`실행 ${report.runs}개${report.window ? ` (${report.window[0]} ~ ${report.window[1]})` : ''}`];
  const byCause = new Map();
  for (const failure of report.failures) {
    const entry = byCause.get(failure.cause) ?? { count: 0, recovered: 0, steps: new Set() };
    entry.count += 1;
    if (failure.recovered) entry.recovered += 1;
    if (failure.step) entry.steps.add(failure.step);
    byCause.set(failure.cause, entry);
  }
  lines.push('', '## 원인별 실패 잡(재실행으로 회복한 수)');
  for (const [cause, entry] of [...byCause].sort((left, right) => right[1].count - left[1].count)) {
    const note = cause === 'cancelled' ? ' [원인 아님: 새 push·수동 취소·잡 시간 상한]' : '';
    lines.push(`- ${cause}: ${entry.count} (회복 ${entry.recovered})${note}${entry.steps.size ? ` — ${[...entry.steps].join(', ')}` : ''}`);
  }
  const byTest = new Map();
  for (const outcome of report.tests) {
    const key = `${outcome.test} | ${outcome.signature}`;
    const entry = byTest.get(key) ?? { flaky: 0, unexpected: 0, runs: new Set() };
    entry[outcome.status === 'flaky' ? 'flaky' : 'unexpected'] += 1;
    entry.runs.add(outcome.run);
    byTest.set(key, entry);
  }
  lines.push('', '## E2E 시험별(flaky·실패, 진단 산출물이 남은 실행만)');
  for (const [key, entry] of [...byTest].sort((left, right) => (right[1].flaky + right[1].unexpected) - (left[1].flaky + left[1].unexpected))) {
    lines.push(`- flaky ${entry.flaky} · 실패 ${entry.unexpected}: ${key} — run ${[...entry.runs].join(', ')}`);
  }
  if (report.gaps.length) lines.push('', '## 읽지 못한 자료', ...report.gaps.map(gap => `- ${gap}`));
  return `${lines.join('\n')}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let options;
  try {
    options = parseOptions(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    console.error(`사용법: npm run ci:flaky-report -- [--runs 1..100] [--branch 이름] [--event push|pull_request] [--max-calls 1..1000] [--json]\n${error.message}`);
    process.exit(2);
  }
  const violations = ciRuleViolations(readFileSync(path.join(REPO_ROOT, WORKFLOW_FILE), 'utf8'));
  if (violations.length) {
    console.error(`분류 규칙 스텝이 ci.yml 에 없다: ${violations.join(', ')} — STEP_RULES 를 ci.yml 과 맞추세요`);
    process.exit(1);
  }
  const gh = createGh({ maxCalls: options.maxCalls });
  let report;
  let incomplete = false;
  try {
    report = collectReport({ gh, slug: repositorySlug(), options });
  } catch (error) {
    if (!(error instanceof BudgetError)) throw error;
    console.error(`${error.message} — --runs 를 줄이거나 --max-calls 를 늘리세요(부분 결과는 내지 않는다)`);
    process.exit(1);
  }
  incomplete = report.gaps.length > 0;
  process.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : renderText(report));
  console.error(`API 호출 ${gh.calls()}회${incomplete ? ' — 읽지 못한 자료가 있어 결과가 불완전하다(종료 코드 1)' : ''}`);
  process.exit(incomplete ? 1 : 0);
}
