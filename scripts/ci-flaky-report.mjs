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
 *
 * [2026-10-29] 같은 이유로 가려지던 신호 셋을 더한다.
 * - Gradle·Maven 의존성 해석이 4xx·5xx(429 포함)로 멈춘 잡은 처음 멈춘 스텝 이름과 상관없이 인프라다. 그 스텝의 잡 로그 구간만 읽는다.
 * - Dependabot 이 연 실행의 실패는 따로 센다 — 의존성 갱신이 깨뜨린 실패가 flaky·인프라 빈도에 섞이지 않게 한다.
 * - 러너 대기 = 잡 시작 − max(잡 생성, needs 잡 완료). needs 는 ci.yml 에서 읽는다.
 * - 예약 워크플로(on.schedule) 표: 예약 실행의 마지막 결론·날짜·연속 비성공 수. 주간 이관 회귀가 4주 연속 붉었는데(2026-10-04~25)
 *   아무도 몰랐다 — 예약 실행은 PR·main CI 에 보이지 않는다. `--scheduled-only` 는 이 표만 낸다(주간 거버넌스 검토 요약).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { parseWorkflowJobs } from './required-checks-contract.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW_FILE = '.github/workflows/ci.yml';
const WORKFLOW_DIRECTORY = '.github/workflows';

export class UsageError extends Error {}

export function parseOptions(argv) {
  const options = { runs: 40, branch: null, event: null, maxCalls: 200, json: false, scheduledOnly: false };
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
    else if (flag === '--scheduled-only') options.scheduledOnly = true;
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
// 이름의 `${{ … }}` 는 실행 때 값(예: 매트릭스 샤드)으로 바뀌므로 비지 않은 아무 글자와 맞춘다(stepNameMatches).
// 원인 'derived' 는 다른 잡의 결과를 모으는 스텝이다 — 그 실패는 원천 잡에서 이미 세므로 다시 세지 않는다.
export const STEP_RULES = Object.freeze([
  ['Install Playwright Browsers', 'infra:playwright-install'],
  ['Install Playwright Dependencies (system deps)', 'infra:playwright-install'],
  ['Build API image', 'infra:docker-build'],
  ['Provision Gradle distribution with bounded retry', 'infra:gradle-distribution'],
  ['Install dependencies', 'infra:package-install'],
  ['Run E2E Tests (Sharded)', 'test:e2e'],
  ['Frontend unit and coverage suite', 'test:frontend'],
  ['Build and Test with Gradle', 'test:backend'],
  ['Verify repository operational contracts', 'test:operational-contracts'],
  ['Run measured migration test shard (${{ matrix.shard }})', 'test:migration'],
  // migration-scope 의 샤드 집계 스텝만 파생이다. 같은 잡의 'Verify the independent migration module'(실제 검증)은 그대로 분류된다.
  ['Require every migration test shard to succeed', 'derived'],
  ['Generate and verify reusable profile', 'test:reusable-profile'],
  ['Enforce secure coding policy', 'test:secure-coding'],
]);

/** 규칙 이름과 실행된 스텝 이름이 같은가. 규칙의 `${{ … }}` 자리는 비지 않은 아무 글자와 맞는다. */
export function stepNameMatches(rule, step) {
  const parts = rule.split(/\$\{\{[^}]*\}\}/);
  if (parts.length === 1) return rule === step;
  if (!step.startsWith(parts[0])) return false;
  let cursor = parts[0].length;
  for (let index = 1; index < parts.length; index += 1) {
    const part = parts[index];
    const at = index === parts.length - 1 ? step.length - part.length : step.indexOf(part, cursor + 1);
    if (at < cursor + 1 || step.slice(at, at + part.length) !== part) return false;
    cursor = at + part.length;
  }
  return cursor === step.length;
}

// 의존성 해석 인프라 판정을 위해 잡 로그를 읽는 원인 — Gradle 을 돌리는 스텝이거나 아직 모르는 스텝이다.
// E2E·프런트·설치 규칙처럼 Gradle·Maven 해석이 없는 원인은 로그를 읽지 않는다(호출 예산).
export const LOG_CHECKED_CAUSES = Object.freeze(['test:backend', 'test:migration', 'test:reusable-profile', 'mutation', 'unclassified']);
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
  const failed = firstStoppedStep(job);
  if (!failed) return { cause: job.conclusion === 'failure' ? 'unclassified' : 'cancelled', step: null };
  if (failed.conclusion === 'cancelled') return { cause: 'cancelled', step: failed.name };
  const rule = STEP_RULES.find(([name]) => stepNameMatches(name, failed.name));
  if (rule) return { cause: rule[1], step: failed.name };
  if (RUNNER_SETUP.test(failed.name)) return { cause: 'infra:runner-setup', step: failed.name };
  if (failed.name.startsWith('Mutation Test')) return { cause: 'mutation', step: failed.name };
  return { cause: 'unclassified', step: failed.name };
}

/** 처음 멈춘(실패·취소·시간 초과) 스텝. */
export function firstStoppedStep(job) {
  return (job.steps ?? []).find(step => ['failure', 'cancelled', 'timed_out'].includes(step.conclusion)) ?? null;
}

// 잡 로그 한 줄의 시각: `2026-10-20T00:27:40.7335469Z 본문`. 첫 줄에는 BOM 이 붙는다. 시각 없는 줄은 앞 줄의 시각을 잇는다.
const LOG_TIMESTAMP = /^﻿?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.\d+)?Z ?/;

/**
 * 잡 로그에서 한 스텝의 실행 창(앞뒤 1초 여유) 안의 줄. 스텝 시각은 초 단위라 줄 시각도 초로 자른다.
 * 스텝 시각이 없으면 전체 줄이다. 앞 스텝의 재시도 메시지가 뒤 스텝의 실패 원인으로 읽히지 않게 구간을 자른다.
 */
export function stepLogLines(log, step) {
  const start = step?.started_at ? Date.parse(step.started_at) - 1000 : -Infinity;
  const end = step?.completed_at ? Date.parse(step.completed_at) + 1000 : Infinity;
  const lines = [];
  let at = null;
  for (const raw of String(log).split(/\r?\n/)) {
    const stamp = LOG_TIMESTAMP.exec(raw);
    if (stamp) at = Date.parse(`${stamp[1]}Z`);
    if (at !== null && at >= start && at <= end) lines.push(stamp ? raw.slice(stamp[0].length) : raw);
  }
  return lines;
}

/**
 * Gradle·Maven 의존성 해석이 원격 저장소의 4xx·5xx(429 포함) 응답으로 실패했으면 그 표지(`HTTP 429 repo.maven.apache.org`), 아니면 null.
 * Gradle 은 404 를 '찾지 못함'으로 다루고 그 밖의 상태만 'Received status code' 로 알린다(2026-10-20 T2 실측:
 * `Could not GET '…pom'. Received status code 429 from server: Too Many Requests`). Maven 은 'Could not transfer … status code: 503' 이다.
 */
export function dependencyResolutionSignature(lines) {
  for (const line of lines) {
    let code = null;
    if (line.includes('Could not ') && line.includes('Received status code ')) code = /Received status code (\d{3})/.exec(line)?.[1];
    else if (line.includes('Could not transfer ')) code = /status(?: code)?: (\d{3})/.exec(line)?.[1];
    if (!code || !/^[45]/.test(code)) continue;
    const host = /'?https?:\/\/([^/'\s):]+)/.exec(line)?.[1];
    return `HTTP ${code}${host ? ` ${host}` : ''}`;
  }
  return null;
}

/** Dependabot 이 연 실행인가 — 실행 주체나 head 브랜치로 본다(사람이 다시 돌려도 주체는 Dependabot 으로 남는다). */
export function isDependabotRun(run) {
  return run.actor?.login === 'dependabot[bot]' || String(run.head_branch ?? '').startsWith('dependabot/');
}

/** ci.yml 의 잡별 needs(잡 ID 목록). 문자열·흐름 목록·블록 목록을 모두 읽는다. */
export function workflowNeeds(yaml) {
  const needs = new Map();
  for (const [id, block] of parseWorkflowJobs(yaml)) {
    const lines = block.split('\n');
    const index = lines.findIndex(line => line.startsWith('    needs:'));
    const list = [];
    if (index >= 0) {
      const inline = lines[index].slice('    needs:'.length).replace(/#.*$/, '').trim();
      if (inline.startsWith('[')) list.push(...inline.replace(/^\[/, '').replace(/\]$/, '').split(','));
      else if (inline) list.push(inline);
      else {
        for (const line of lines.slice(index + 1)) {
          const item = /^ {6}- ['"]?([A-Za-z0-9_-]+)['"]?\s*$/.exec(line);
          if (!item) break;
          list.push(item[1]);
        }
      }
    }
    needs.set(id, list.map(entry => entry.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean));
  }
  return needs;
}

/** API 잡 이름의 잡 ID — 매트릭스 잡은 `backend-scope (a, b)` 처럼 괄호가 붙는다. */
export function jobIdOf(name) {
  const cut = name.indexOf(' (');
  return cut < 0 ? name : name.slice(0, cut);
}

/**
 * 실제로 돈 잡(스텝이 있는 잡, 건너뜀 제외)의 러너 대기 초 = started_at − max(created_at, 같은 시도에서 needs 잡의 completed_at).
 * 재실행 시도는 앞 시도에서 복사된 needs 잡의 완료가 이르므로 그 시도의 잡 생성 시각이 기준이 된다.
 */
export function queueWaits(attempts, needs) {
  const jobsOf = new Map(attempts.map(({ attempt, jobs }) => [attempt, jobs]));
  const waits = [];
  for (const job of executedJobs(attempts)) {
    if (job.conclusion === 'skipped' || !(job.steps ?? []).length || !job.started_at || !job.created_at) continue;
    const required = needs.get(jobIdOf(job.name)) ?? [];
    let ready = Date.parse(job.created_at);
    for (const other of jobsOf.get(job.attempt) ?? []) {
      if (required.includes(jobIdOf(other.name)) && other.completed_at) ready = Math.max(ready, Date.parse(other.completed_at));
    }
    waits.push({ attempt: job.attempt, job: job.name, waitSeconds: Math.max(0, Math.round((Date.parse(job.started_at) - ready) / 1000)) });
  }
  return waits;
}

/** 워크플로 파일 가운데 on.schedule 을 선언한 것(이름순). 줄 단위로 읽는다. */
export function scheduledWorkflowFiles(entries) {
  const scheduled = [];
  for (const { name, content } of entries) {
    const lines = String(content).replace(/\r\n/g, '\n').split('\n');
    const start = lines.findIndex(line => /^(?:on|'on'|"on"):\s*(?:#.*)?$/.test(line));
    if (start < 0) continue;
    for (const line of lines.slice(start + 1)) {
      if (/^[^\s#]/.test(line)) break;
      if (/^ {2}schedule:\s*(?:#.*)?$/.test(line)) { scheduled.push(name); break; }
    }
  }
  return scheduled.sort();
}

// 예약 실행의 비성공 결론. 취소도 센다 — 매주 멈춰 취소되는 실행(2026-10-21 NVD 스캔)도 green 이 아니다.
const NOT_GREEN = Object.freeze(['failure', 'timed_out', 'startup_failure', 'cancelled']);

/**
 * 최근순 예약 실행 목록 → 마지막 완료 실행과 연속 비성공 수. 진행 중 실행은 건너뛰고, 성공을 만나면 멈춘다.
 * 받은 쪽에서 성공을 만나지 못했고 더 오래된 실행이 남아 있으면 수는 하한이다(lowerBound).
 */
export function scheduledStatus(runs, totalCount = runs.length) {
  const completed = runs.filter(run => run.status === 'completed');
  const last = completed[0] ?? null;
  let consecutiveFailures = 0;
  let sawSuccess = false;
  for (const run of completed) {
    if (run.conclusion === 'success') { sawSuccess = true; break; }
    if (NOT_GREEN.includes(run.conclusion)) consecutiveFailures += 1;
  }
  return {
    lastConclusion: last?.conclusion ?? null,
    lastAt: last ? (last.run_started_at ?? last.created_at) : null,
    lastUrl: last?.html_url ?? null,
    consecutiveFailures,
    lowerBound: !sawSuccess && totalCount > runs.length,
    inProgress: runs.length > 0 && runs[0].status !== 'completed',
  };
}

/** 예약 워크플로마다 예약 실행(event=schedule)만 한 번씩 묻는다. 수동 실행은 입력이 달라 같은 검사가 아닐 수 있어 섞지 않는다. */
export function collectScheduled({ gh, slug, workflows, perPage = 20 }) {
  return workflows.map((workflow) => {
    const body = gh.call(`repos/${slug}/actions/workflows/${workflow}/runs?event=schedule&per_page=${perPage}`);
    const runs = body.workflow_runs ?? [];
    return { workflow, ...scheduledStatus(runs, body.total_count ?? runs.length) };
  });
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
  // binary: 산출물 zip(Buffer), text: 잡 로그(문자열), 기본: JSON.
  const call = (endpoint, { binary = false, text = false } = {}) => {
    for (let attempt = 0; ; attempt += 1) {
      if (calls >= maxCalls) throw new BudgetError(`API 호출 상한(${maxCalls})에 닿았다`);
      calls += 1;
      try {
        const output = exec(['api', '--method', 'GET', endpoint], { encoding: binary ? 'buffer' : 'utf8', maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
        return binary || text ? output : JSON.parse(output);
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

/**
 * 실패 잡의 첫 멈춘 스텝 로그 구간에서 의존성 해석 인프라 표지를 찾는다. 로그를 읽지 못하면 판정할 수 없으므로 읽지 못한 자료로 남긴다.
 * 예산 초과만 위로 던진다.
 */
function dependencyResolutionOf({ gh, slug, run, job, gaps }) {
  try {
    const log = gh.call(`repos/${slug}/actions/jobs/${job.id}/logs`, { text: true });
    return dependencyResolutionSignature(stepLogLines(log, firstStoppedStep(job)));
  } catch (error) {
    if (error instanceof BudgetError) throw error;
    const reason = String(error.stderr || error.message).split('\n').map(line => line.trim()).find(Boolean) ?? '원인 불명';
    gaps.push(`${run.id} ${job.name} 시도 ${job.attempt}: 잡 로그를 읽지 못해 의존성 해석 인프라 실패인지 판정하지 못함(${reason})`);
    return null;
  }
}

export function collectReport({ gh, slug, options, needs = new Map(), scheduledWorkflows = [] }) {
  const query = new URLSearchParams({ per_page: String(options.runs) });
  if (options.branch) query.set('branch', options.branch);
  if (options.event) query.set('event', options.event);
  const runs = gh.call(`repos/${slug}/actions/workflows/ci.yml/runs?${query}`).workflow_runs ?? [];
  const failures = [];
  const tests = [];
  const gaps = [];
  const waits = [];
  for (const run of runs) {
    const attempts = [];
    for (let attempt = 1; attempt <= run.run_attempt; attempt += 1) {
      attempts.push({ attempt, jobs: gh.call(`repos/${slug}/actions/runs/${run.id}/attempts/${attempt}/jobs?per_page=100`).jobs ?? [] });
    }
    const executed = executedJobs(attempts);
    const dependabot = isDependabotRun(run);
    for (const wait of queueWaits(attempts, needs)) waits.push({ run: run.id, ...wait });
    let artifacts = null;
    for (const job of executed) {
      const classified = classifyJob(job);
      if (!classified || classified.cause === 'derived') continue;
      const failure = { run: run.id, attempt: job.attempt, job: job.name, ...classified, dependabot, recovered: recoveredByRerun(job, executed), at: job.started_at };
      if (job.conclusion === 'failure' && classified.step && LOG_CHECKED_CAUSES.includes(classified.cause)) {
        const signature = dependencyResolutionOf({ gh, slug, run, job, gaps });
        if (signature) Object.assign(failure, { cause: 'infra:dependency-resolution', signature });
      }
      failures.push(failure);
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
  return {
    runs: runs.length,
    dependabotRuns: runs.filter(isDependabotRun).length,
    window: runs.length ? [runs.at(-1).created_at, runs[0].created_at] : null,
    failures, tests, gaps, queueWaits: waits,
    scheduled: collectScheduled({ gh, slug, workflows: scheduledWorkflows }),
  };
}

function causeLines(failures) {
  const byCause = new Map();
  for (const failure of failures) {
    const entry = byCause.get(failure.cause) ?? { count: 0, recovered: 0, steps: new Set() };
    entry.count += 1;
    if (failure.recovered) entry.recovered += 1;
    if (failure.step) entry.steps.add(failure.signature ? `${failure.step} (${failure.signature})` : failure.step);
    byCause.set(failure.cause, entry);
  }
  return [...byCause].sort((left, right) => right[1].count - left[1].count).map(([cause, entry]) => {
    const note = cause === 'cancelled' ? ' [원인 아님: 새 push·수동 취소·잡 시간 상한]' : '';
    return `- ${cause}: ${entry.count} (회복 ${entry.recovered})${note}${entry.steps.size ? ` — ${[...entry.steps].join(', ')}` : ''}`;
  });
}

/** 잡 ID 별 러너 대기(초): 표본 수·중앙값·최댓값, 최댓값 큰 순. */
export function summarizeQueueWaits(waits) {
  const byJob = new Map();
  for (const wait of waits) {
    const id = jobIdOf(wait.job);
    byJob.set(id, [...(byJob.get(id) ?? []), wait.waitSeconds]);
  }
  return [...byJob].map(([job, seconds]) => {
    const sorted = [...seconds].sort((left, right) => left - right);
    return { job, count: sorted.length, median: sorted[Math.floor((sorted.length - 1) / 2)], max: sorted.at(-1) };
  }).sort((left, right) => right.max - left.max || left.job.localeCompare(right.job));
}

/** 예약 워크플로 표(Markdown). 연속 비성공 2회 이상은 known-gaps 행으로 추적한다(오케스트레이션 프로토콜 §6.2). */
export function renderScheduled(rows) {
  const lines = ['## 예약 워크플로(예약 실행만, 연속 비성공 = 실패·시간 초과·기동 실패·취소)', '',
    '| 워크플로 | 마지막 결론 | 시작(UTC) | 연속 비성공 | 비고 |', '|---|---|---|---|---|'];
  for (const row of rows) {
    const conclusion = row.lastConclusion ? (row.lastUrl ? `[${row.lastConclusion}](${row.lastUrl})` : row.lastConclusion) : '-';
    const streak = `${row.consecutiveFailures}${row.lowerBound ? '+' : ''}`;
    const notes = [];
    if (!row.lastConclusion) notes.push('완료된 예약 실행 없음');
    if (row.consecutiveFailures >= 2) notes.push('**2회 이상 연속 — green 까지 known-gaps 행으로 추적**');
    if (row.inProgress) notes.push('최근 실행 진행 중');
    lines.push(`| ${row.workflow} | ${conclusion} | ${row.lastAt ?? '-'} | ${streak} | ${notes.join(' · ')} |`);
  }
  return lines;
}

export function renderText(report) {
  const dependabotNote = report.dependabotRuns ? ` — Dependabot 실행 ${report.dependabotRuns}개는 아래 표에서 따로 센다` : '';
  const lines = [`실행 ${report.runs}개${report.window ? ` (${report.window[0]} ~ ${report.window[1]})` : ''}${dependabotNote}`];
  lines.push('', '## 원인별 실패 잡(재실행으로 회복한 수, Dependabot 실행 제외)', ...causeLines(report.failures.filter(failure => !failure.dependabot)));
  const dependabotFailures = report.failures.filter(failure => failure.dependabot);
  if (dependabotFailures.length) {
    lines.push('', '## Dependabot 실행의 실패 잡(의존성 갱신이 깨뜨렸을 수 있어 flaky·인프라 빈도와 따로 센다)', ...causeLines(dependabotFailures));
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
  const waits = summarizeQueueWaits(report.queueWaits ?? []);
  if (waits.length) {
    lines.push('', '## 러너 대기(초 = 잡 시작 − max(잡 생성, needs 잡 완료), 최댓값 큰 순 — 매트릭스 max-parallel 슬롯 대기도 들어간다)');
    for (const wait of waits) lines.push(`- ${wait.job}: 표본 ${wait.count} · 중앙 ${wait.median} · 최대 ${wait.max}`);
  }
  if ((report.scheduled ?? []).length) lines.push('', ...renderScheduled(report.scheduled));
  if (report.gaps.length) lines.push('', '## 읽지 못한 자료', ...report.gaps.map(gap => `- ${gap}`));
  return `${lines.join('\n')}\n`;
}

/** 저장소의 예약 워크플로 파일 이름 목록. */
export function repositoryScheduledWorkflows(root = REPO_ROOT) {
  const directory = path.join(root, WORKFLOW_DIRECTORY);
  return scheduledWorkflowFiles(readdirSync(directory).filter(name => /\.ya?ml$/.test(name))
    .map(name => ({ name, content: readFileSync(path.join(directory, name), 'utf8') })));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let options;
  try {
    options = parseOptions(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    console.error(`사용법: npm run ci:flaky-report -- [--runs 1..100] [--branch 이름] [--event push|pull_request] [--max-calls 1..1000] [--json] [--scheduled-only]\n${error.message}`);
    process.exit(2);
  }
  const ciYaml = readFileSync(path.join(REPO_ROOT, WORKFLOW_FILE), 'utf8');
  // 예약 워크플로 표만 낼 때는 ci.yml 분류 규칙을 쓰지 않는다(그 대조는 계약 시험이 맡는다).
  const violations = options.scheduledOnly ? [] : ciRuleViolations(ciYaml);
  if (violations.length) {
    console.error(`분류 규칙 스텝이 ci.yml 에 없다: ${violations.join(', ')} — STEP_RULES 를 ci.yml 과 맞추세요`);
    process.exit(1);
  }
  const gh = createGh({ maxCalls: options.maxCalls });
  const scheduledWorkflows = repositoryScheduledWorkflows();
  let report;
  let incomplete = false;
  try {
    report = options.scheduledOnly
      ? { scheduled: collectScheduled({ gh, slug: repositorySlug(), workflows: scheduledWorkflows }), gaps: [] }
      : collectReport({ gh, slug: repositorySlug(), options, needs: workflowNeeds(ciYaml), scheduledWorkflows });
  } catch (error) {
    if (!(error instanceof BudgetError)) throw error;
    console.error(`${error.message} — --runs 를 줄이거나 --max-calls 를 늘리세요(부분 결과는 내지 않는다)`);
    process.exit(1);
  }
  incomplete = report.gaps.length > 0;
  const text = options.scheduledOnly ? `${renderScheduled(report.scheduled).join('\n')}\n` : renderText(report);
  process.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : text);
  console.error(`API 호출 ${gh.calls()}회${incomplete ? ' — 읽지 못한 자료가 있어 결과가 불완전하다(종료 코드 1)' : ''}`);
  process.exit(incomplete ? 1 : 0);
}
