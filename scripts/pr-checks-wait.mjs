#!/usr/bin/env node
/**
 * PR 의 required CI 가 정착할 때까지 기다렸다가 종료 코드로 판정한다 — 에이전트가 세션마다 폴링 루프를 새로 짜지 않게
 * "정착"의 정의를 실행 가능한 코드 한 곳에 둔다.
 *
 * 정착: 고정한 head SHA 에서 원장(.github/required-checks.json)의 workflow 실행이 모두 끝났고, 원장의 required context 가 모두
 * 그 실행의 check suite 에(integrationId 가 정수면 그 앱으로) 등록된 상태다. success 만 통과다 — skipped·neutral·cancelled·
 * timed_out 도 실패로 본다. required 집계 체크는 소스 잡이 끝난 뒤에야 등록되므로 "등록된 체크에 pending 이 없다"는 정착이 아니다
 * (2026-09-24 PR #735). 판정할 수 없는 출력은 기다림으로 바꾸지 않고 곧바로 오류로 끝낸다 — jq 가 없어 빈 출력을 "아직 대기"로
 * 읽던 감시가 시간 초과까지 돌고 종료 코드를 삼켰다(2026-09-04, 2026-10-29).
 *
 * 실행 결속: 원장 workflow·고정 SHA 만으로는 이 PR 의 실행이 아니다 — 같은 커밋을 가리키는 다른 PR(같은 커밋의 다른 브랜치, 같은
 * 브랜치의 다른 base)의 실행이 더 큰 체크 id 로 이 PR 의 실패를 덮는다(2026-10-29 독립 검토). 그래서 실행 행의 head_branch 가 PR 의
 * headRefName 과, head_repository 소유자가 PR 의 headRepositoryOwner 와 같아야 하고, 행이 PR 번호를 싣고 있으면 그 안에 이 PR 이
 * 있어야 한다. PR 번호만으로 결속하지 않는다 — GitHub 은 병합·닫힘 뒤 pull_requests 를 비우고 fork PR 의 실행은 처음부터 비어 있다.
 * head 저장소가 지워진 실행(head_repository null)은 결속할 수 없어 세지 않는다. 남은 한계: 같은 저장소의 같은 브랜치에서 base 만
 * 다른 두 PR 이 함께 열려 있으면 GitHub 이 두 실행 모두에 두 PR 을 실을 수 있어 실행 행만으로는 구분하지 못한다.
 * 결과(통과·실패)는 내기 직전에 PR 을 다시 읽어 head 가 그대로이고 닫히지 않았을 때만 낸다 — 조회하는 사이의 push 는 옛 head 의
 * 결과를 새 head 의 판정처럼 보이게 한다.
 *
 * 병합 권위는 required CI 이고 이 도구는 그 결과를 읽기만 한다(게이트가 아니다). required 목록·workflow·앱은 원장에서 읽고
 * 여기에 다시 적지 않는다. gh 는 셸 없이 검증한 인자로만 부르고, 저장소는 gh api 의 `{owner}/{repo}` 자리표시자로 이 checkout 에서 푼다.
 *
 * 사용: node scripts/pr-checks-wait.mjs --pr <번호> [--sha <40자리 커밋>] [--interval-seconds 30] [--timeout-minutes 90]
 *       [--start-timeout-minutes 15]
 * 종료 코드: 0 통과 · 1 required 실패·누락 · 2 사용법·조회 오류(통과 아님) · 3 head 불일치·이동·PR 닫힘 · 4 시간 초과.
 * 0 을 내는 경로는 통과 하나뿐이다. 마지막 줄은 `RESULT=<pass|fail|error|head-moved|timeout> pr=<n> sha=<sha> required=<k>/<n>` 이다.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const MANIFEST_PATH = '.github/required-checks.json';

/** 결과 이름과 종료 코드. 0 은 pass 하나뿐이다. */
export const EXIT = Object.freeze({ pass: 0, fail: 1, error: 2, 'head-moved': 3, timeout: 4 });

const PR_PATTERN = /^[1-9]\d{0,9}$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const COUNT_PATTERN = /^\d{1,6}$/;
/** gh 에 넘기는 인자의 허용 문자. 인자는 검증한 값으로만 만들지만 공백·셸 메타 문자가 섞이면 실행하지 않는다. */
const SAFE_ARG = /^[A-Za-z0-9_.,:/?=&{}-]+$/;
/** gh 비0 종료를 일시 오류로 보는 연속 횟수 상한. */
const TRANSIENT_LIMIT = 3;
const PAGE_SIZE = 100;
const MAX_PAGES = 30;
const PROGRESS_EVERY_MS = 10 * 60 * 1000;

const USAGE = '사용법: node scripts/pr-checks-wait.mjs --pr <번호> [--sha <40자리 커밋>] [--interval-seconds 30] '
  + '[--timeout-minutes 90] [--start-timeout-minutes 15]';

/** 판정할 수 없는 상태. code 는 종료 코드다(기본 2). */
export class ToolError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
  }
}

/** gh 가 비0 으로 끝난 조회 — 연속 TRANSIENT_LIMIT 회까지만 다시 시도한다. */
class TransientGhError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TransientGhError';
  }
}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isId = (value) => Number.isSafeInteger(value) && value > 0;
const firstLine = (text) => String(text ?? '').trim().split(/\r?\n/)[0].slice(0, 200);

/** 원장의 required context 를 원장 순서로 돌려준다. 비었거나 문자열이 아니거나 겹치면 판정할 수 없다. */
export function requiredContexts(manifest) {
  const checks = manifest?.requiredChecks;
  if (!Array.isArray(checks) || checks.length === 0) throw new ToolError(2, `${MANIFEST_PATH}: requiredChecks 가 비어 있다`);
  const contexts = checks.map((check) => check?.context);
  if (contexts.some((context) => typeof context !== 'string' || !context.trim())) {
    throw new ToolError(2, `${MANIFEST_PATH}: 문자열이 아닌 context 가 있다`);
  }
  const duplicate = contexts.find((context, index) => contexts.indexOf(context) !== index);
  if (duplicate !== undefined) throw new ToolError(2, `${MANIFEST_PATH}: context 가 겹친다: ${duplicate}`);
  return contexts;
}

/** required check 를 낼 workflow 와 앱. integrationId 는 양의 정수이거나 null(생성물 원장 — suite 결속만 본다)이다. */
export function manifestBinding(manifest) {
  const workflow = manifest?.workflow;
  const integrationId = manifest?.integrationId;
  if (typeof workflow !== 'string' || !workflow.startsWith('.github/workflows/')) {
    throw new ToolError(2, `${MANIFEST_PATH}: workflow 가 .github/workflows/ 아래 경로가 아니다`);
  }
  if (integrationId !== null && !isId(integrationId)) throw new ToolError(2, `${MANIFEST_PATH}: integrationId 는 양의 정수이거나 null 이다`);
  return { workflow, integrationId };
}

/** gh 출력을 JSON 객체로 읽는다. JSON 이 아니거나 객체가 아니면 기다리지 않고 판정 불가(2)다. */
export function parseGhJson(stdout, label) {
  let value;
  try {
    value = JSON.parse(stdout);
  } catch {
    throw new ToolError(2, `${label}: gh 출력이 JSON 이 아니다(첫 줄: ${firstLine(stdout) || '빈 출력'})`);
  }
  if (!isObject(value)) throw new ToolError(2, `${label}: gh 출력이 JSON 객체가 아니다`);
  return value;
}

const isName = (value) => typeof value === 'string' && value.trim() !== '';

/** gh pr view 의 JSON 필드. 실행을 이 PR 에 결속할 head 브랜치·head 저장소 소유자도 함께 읽는다. */
const PR_VIEW_FIELDS = 'headRefOid,state,mergeStateStatus,headRefName,headRepositoryOwner';

function pullRequestOf(value) {
  if (typeof value.headRefOid !== 'string' || !SHA_PATTERN.test(value.headRefOid) || typeof value.state !== 'string'
    || typeof value.mergeStateStatus !== 'string') {
    throw new ToolError(2, 'gh pr view: headRefOid·state·mergeStateStatus 의 모양이 다르다');
  }
  // head 저장소가 지워진 PR 처럼 소유자를 모르면 실행을 결속할 수 없다 — 기다리지 않고 판정 불가다.
  if (!isName(value.headRefName) || !isObject(value.headRepositoryOwner) || !isName(value.headRepositoryOwner.login)) {
    throw new ToolError(2, 'gh pr view: headRefName·headRepositoryOwner.login 의 모양이 다르다');
  }
  return { head: value.headRefOid.toLowerCase(), state: value.state, mergeState: value.mergeStateStatus,
    headRef: value.headRefName, headOwner: value.headRepositoryOwner.login };
}

function readPullRequest(gh, pr) {
  return pullRequestOf(ghJson(gh, ['pr', 'view', String(pr), '--json', PR_VIEW_FIELDS], 'gh pr view'));
}

/** head_repository 는 null(지워진 fork)이거나 owner.login 을 가진 객체다. */
const headRepositoryShaped = (repo) => repo === null || (isObject(repo) && isObject(repo.owner) && isName(repo.owner.login));
/** pull_requests 는 null 이거나 PR 번호를 가진 객체의 배열이다. */
const pullRequestsShaped = (list) => list === null || (Array.isArray(list) && list.every((entry) => isObject(entry) && isId(entry.number)));

function workflowRunsOf(value) {
  const rows = value.workflow_runs;
  if (!Number.isSafeInteger(value.total_count) || value.total_count < 0 || !Array.isArray(rows)) {
    throw new ToolError(2, 'actions/runs: total_count·workflow_runs 의 모양이 다르다');
  }
  if (value.total_count > rows.length) {
    throw new ToolError(2, `actions/runs: total_count ${value.total_count} 가 받은 ${rows.length} 행보다 크다 — 일부만 받았다`);
  }
  for (const run of rows) {
    if (!isObject(run) || !isId(run.id) || typeof run.path !== 'string' || typeof run.head_sha !== 'string'
      || typeof run.status !== 'string' || !isId(run.check_suite_id)) {
      throw new ToolError(2, 'actions/runs: 실행 행의 id·path·head_sha·status·check_suite_id 모양이 다르다');
    }
    if (!(run.head_branch === null || typeof run.head_branch === 'string') || !headRepositoryShaped(run.head_repository)
      || !pullRequestsShaped(run.pull_requests)) {
      throw new ToolError(2, 'actions/runs: 실행 행의 head_branch·head_repository·pull_requests 모양이 다르다');
    }
  }
  return rows;
}

/** 실행을 결속할 PR. evaluateSnapshot 은 이것 없이 판정하지 않는다(같은 SHA 의 다른 PR 실행을 섞지 않게). */
function bindingOf(pullRequest) {
  if (!isObject(pullRequest) || !isId(pullRequest.number) || !isName(pullRequest.headRef) || !isName(pullRequest.headOwner)) {
    throw new ToolError(2, 'PR 결속(number·headRef·headOwner) 없이 실행을 판정하지 않는다');
  }
  return pullRequest;
}

/**
 * 이 PR 의 원장 workflow 실행만 고른다 — workflow 경로·고정 SHA·head 브랜치·head 저장소 소유자가 모두 같고, 실행 행이 PR 번호를
 * 싣고 있으면 그 안에 이 PR 이 있어야 한다. 비어 있으면(병합·닫힘 뒤, fork) 브랜치·소유자 결속만으로 센다. 소유자 login 은 GitHub 이
 * 대소문자를 가리지 않으므로 소문자로 비교하고, 브랜치 이름은 그대로 비교한다.
 */
export function pullRequestRuns(runs, { workflow, sha, pullRequest }) {
  const { number, headRef, headOwner } = bindingOf(pullRequest);
  const pinned = sha.toLowerCase();
  const owner = headOwner.toLowerCase();
  const eligible = runs.filter((run) => run.path === workflow && run.head_sha.toLowerCase() === pinned
    && run.head_branch === headRef
    && run.head_repository !== null && run.head_repository.owner.login.toLowerCase() === owner
    && (!run.pull_requests?.length || run.pull_requests.some((entry) => entry.number === number)));
  // 같은 브랜치에서 base 만 다른 PR 이 함께 열려 있으면 GitHub 은 실행마다 두 번호를 싣는다 — 실행 행에는 그 실행의 base 가 없어
  // 어느 PR 의 실행인지 가를 수 없다(이 PR 의 실행이 아직 없을 때 다른 PR 의 실행 하나를 이 PR 의 것으로 셀 수도 있다). 판정하지 않는다.
  const shared = eligible.find((run) => run.pull_requests?.some((entry) => entry.number !== number));
  if (shared) {
    throw new ToolError(2, `실행 ${shared.id} 가 PR #${number} 과 다른 PR(${shared.pull_requests.map((entry) => `#${entry.number}`).join(', ')})을 함께 싣는다 — `
      + '같은 브랜치에서 열린 다른 PR 의 실행과 가를 수 없어 판정하지 않는다. 한 브랜치에는 PR 하나만 연다.');
  }
  return eligible;
}

function checkRunPageOf(value) {
  const rows = value.check_runs;
  if (!Number.isSafeInteger(value.total_count) || value.total_count < 0 || !Array.isArray(rows)) {
    throw new ToolError(2, 'check-runs: total_count·check_runs 의 모양이 다르다');
  }
  for (const run of rows) {
    if (!isObject(run) || !isId(run.id) || typeof run.name !== 'string' || typeof run.status !== 'string'
      || !(run.conclusion === null || typeof run.conclusion === 'string') || typeof run.head_sha !== 'string'
      || !isObject(run.check_suite) || !isId(run.check_suite.id) || !(run.app === null || (isObject(run.app) && isId(run.app.id)))) {
      throw new ToolError(2, 'check-runs: 체크 행의 id·name·status·conclusion·head_sha·check_suite·app 모양이 다르다');
    }
  }
  return { total: value.total_count, rows };
}

/**
 * 한 시점의 조회 결과를 판정한다.
 * - 이 PR 의 실행: pullRequestRuns 가 고른 것 — 원장 workflow·고정 SHA·PR 의 head 브랜치·head 저장소 소유자(·실린 PR 번호)에 결속한다.
 * - 후보 체크: 그 실행이 가진 check suite 에 속하고 head_sha 가 같으며, integrationId 가 정수면 그 앱이 낸 것.
 *   다른 suite·다른 앱의 같은 이름은 세지 않는다(사칭 차단·같은 SHA 의 다른 PR 실행 차단). 이름마다 id 가 가장 큰 것을 쓴다(재실행).
 * - waiting: 그 workflow 실행이 없거나(미시작) 하나라도 끝나지 않았다(재실행 queued 포함).
 * - 실행이 모두 끝났으면 required 가 전부 등록돼 success 일 때만 pass, 아니면 fail 이다.
 */
export function evaluateSnapshot({ manifest, sha, pullRequest, runs, checkRuns }) {
  const contexts = requiredContexts(manifest);
  const { workflow, integrationId } = manifestBinding(manifest);
  const pinned = sha.toLowerCase();
  const ciRuns = pullRequestRuns(runs, { workflow, sha: pinned, pullRequest });
  const suites = new Set(ciRuns.map((run) => run.check_suite_id));
  const latest = new Map();
  for (const run of checkRuns) {
    if (!suites.has(run.check_suite?.id) || run.head_sha.toLowerCase() !== pinned) continue;
    if (integrationId !== null && run.app?.id !== integrationId) continue;
    const seen = latest.get(run.name);
    if (!seen || run.id > seen.id) latest.set(run.name, run);
  }
  const required = contexts.map((context) => {
    const run = latest.get(context);
    const outcome = !run ? 'missing' : run.status === 'completed' ? (run.conclusion ?? 'none') : run.status;
    return { context, outcome, completed: run?.status === 'completed', success: run?.status === 'completed' && run.conclusion === 'success',
      url: run?.html_url ?? run?.details_url ?? '' };
  });
  let state;
  let reason = null;
  if (!ciRuns.length) {
    state = 'waiting';
    reason = 'not-started';
  } else if (ciRuns.some((run) => run.status !== 'completed')) {
    state = 'waiting';
    reason = 'running';
  } else {
    state = required.every((entry) => entry.success) ? 'pass' : 'fail';
  }
  return {
    state, reason, workflow, ciRuns, required, jobs: [...latest.values()],
    registered: required.filter((entry) => entry.outcome !== 'missing').length,
    completed: required.filter((entry) => entry.completed).length,
    passed: required.filter((entry) => entry.success).length,
  };
}

/** 실제 gh 실행기. 셸 없이 검증한 인자로만 부른다. 실행 자체가 실패하면 error 를 돌려준다(ENOENT 등). */
export function runGh(args) {
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string' || !SAFE_ARG.test(arg))) {
    throw new ToolError(2, 'gh 인자에 허용하지 않는 문자가 있다');
  }
  const result = spawnSync('gh', args, { cwd: REPO_ROOT, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error ?? null };
}

function ghJson(gh, args, label) {
  const result = gh(args);
  if (result?.error) throw new ToolError(2, `${label}: gh 를 실행하지 못했다(${result.error.code ?? result.error.name ?? 'spawn'})`);
  if (result?.status !== 0) {
    throw new TransientGhError(`${label}: gh 종료 코드 ${result?.status ?? 'null'} — ${firstLine(result?.stderr) || 'stderr 없음'}`);
  }
  return parseGhJson(result.stdout, label);
}

function fetchCheckRuns(gh, sha) {
  const rows = new Map();
  let total = null;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const value = checkRunPageOf(ghJson(gh,
      ['api', `repos/{owner}/{repo}/commits/${sha}/check-runs?filter=latest&per_page=${PAGE_SIZE}&page=${page}`], 'check-runs'));
    total = value.total;
    for (const row of value.rows) rows.set(row.id, row);
    if (rows.size >= total) return [...rows.values()];
    if (!value.rows.length) throw new ToolError(2, `check-runs: total_count ${total} 에 닿기 전에 빈 페이지가 왔다(받은 ${rows.size})`);
  }
  throw new ToolError(2, `check-runs: ${MAX_PAGES} 페이지를 넘겨도 total_count ${total} 에 닿지 않았다`);
}

const clock = (ms) => {
  const date = new Date(ms);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

function progressLine(snapshot, at) {
  const name = basename(snapshot.workflow);
  const runs = snapshot.ciRuns.length ? `${name} ${snapshot.ciRuns.map((run) => run.status).join(',')}` : `${name} 실행 없음(미시작)`;
  return `[${clock(at)}] 대기 — ${runs}, required 등록 ${snapshot.registered}/${snapshot.required.length}·완료 ${snapshot.completed}`;
}

/** CI 잡 집계 한 줄 — 범위 잡이 의도대로 돌았는지 보는 정보이며 판정에 쓰지 않는다. */
function jobsLine(snapshot) {
  const done = snapshot.jobs.filter((job) => job.status === 'completed');
  const names = (jobs) => (jobs.length ? `(${jobs.map((job) => job.name).sort().join(', ')})` : '');
  const skipped = done.filter((job) => job.conclusion === 'skipped');
  const failed = done.filter((job) => !['success', 'skipped'].includes(job.conclusion));
  const running = snapshot.jobs.length - done.length;
  return `CI 잡 ${snapshot.jobs.length}개 — success ${done.length - skipped.length - failed.length} · skipped ${skipped.length}${names(skipped)}`
    + ` · 실패 ${failed.length}${names(failed)}${running ? ` · 진행 ${running}` : ''}`;
}

/**
 * PR 의 required CI 가 정착할 때까지 기다린다. gh·sleep·now·log 는 주입한다(시험은 가짜를 넣는다).
 * 돌려주는 값: { result, code, sha, passed, total }. 예외를 던지지 않는다 — 예상 밖 오류도 error(2)다.
 */
export async function waitForRequiredChecks({ pr, sha = null, manifest, gh, sleep, now, log,
  intervalMs = 30_000, timeoutMs = 90 * 60_000, startTimeoutMs = 15 * 60_000 }) {
  let pinned = sha ? sha.toLowerCase() : null;
  let snapshot = null;
  let mergeState = 'UNKNOWN';
  let total = 0;
  const finish = (result, lines = []) => {
    for (const line of lines) log(line);
    // head 이동·오류 뒤의 지난 조회는 고정 SHA 의 최종 상태가 아니라 싣지 않는다.
    if (snapshot && ['pass', 'fail', 'timeout'].includes(result)) {
      for (const entry of snapshot.required) log(`${entry.context}\t${entry.outcome}\t${entry.url}`);
      log(jobsLine(snapshot));
    }
    if (result === 'pass' && mergeState === 'BEHIND') {
      log('경고: PR 이 main 보다 뒤에 있다(BEHIND) — main 이 strict up-to-date 를 요구하면 main 을 합친 새 커밋으로 다시 기다린다.');
    }
    log(`RESULT=${result} pr=${pr} sha=${pinned ?? '-'} required=${snapshot?.passed ?? 0}/${total}`);
    return { result, code: EXIT[result], sha: pinned, passed: snapshot?.passed ?? 0, total };
  };
  try {
    total = requiredContexts(manifest).length;
    const { workflow } = manifestBinding(manifest);
    if (!isId(pr)) throw new ToolError(2, 'pr 는 양의 정수다');
    const started = now();
    let pinChecked = false;
    let failures = 0;
    let lastSignature = null;
    let lastLogAt = -Infinity;
    log(`PR #${pr} 의 required ${total}개(${MANIFEST_PATH})를 ${workflow} 실행에서 기다린다.`);
    for (;;) {
      let polled = false;
      try {
        const view = readPullRequest(gh, pr);
        mergeState = view.mergeState;
        if (!pinned) {
          pinned = view.head;
          log(`고정 SHA ${pinned} (PR head)`);
        } else if (!pinChecked) {
          // --sha 는 검증한 커밋이다 — PR head 가 아니면 다른 커밋의 CI 를 기다리게 되므로 첫 조회에서 끝낸다.
          if (view.head !== pinned) {
            return finish('head-moved', [`--sha ${pinned} 가 PR head ${view.head} 와 다르다 — 검증한 커밋이 PR head 인지 확인한다.`]);
          }
          log(`고정 SHA ${pinned} (--sha, PR head 와 같다)`);
        }
        pinChecked = true;
        if (view.head !== pinned) {
          return finish('head-moved', [`PR head 가 ${pinned} 에서 ${view.head} 로 바뀌었다 — 새 head 로 다시 기다린다.`]);
        }
        if (view.state === 'CLOSED') return finish('head-moved', [`PR #${pr} 이 병합되지 않고 닫혔다.`]);
        const runs = workflowRunsOf(ghJson(gh,
          ['api', `repos/{owner}/{repo}/actions/runs?head_sha=${pinned}&event=pull_request&per_page=${PAGE_SIZE}`], 'actions/runs'));
        const pullRequest = { number: pr, headRef: view.headRef, headOwner: view.headOwner };
        // 이 PR 의 원장 workflow 실행이 아직 없으면 체크를 조회하지 않는다 — 후보가 될 suite 가 없다.
        const ciStarted = pullRequestRuns(runs, { workflow, sha: pinned, pullRequest }).length > 0;
        const checkRuns = ciStarted ? fetchCheckRuns(gh, pinned) : [];
        const current = evaluateSnapshot({ manifest, sha: pinned, pullRequest, runs, checkRuns });
        if (current.state !== 'waiting') {
          // 결과를 내기 직전에 PR 을 다시 읽는다 — 실행·체크를 조회하는 사이에 push 되거나 닫혔으면 옛 head 의 결과다.
          const after = readPullRequest(gh, pr);
          mergeState = after.mergeState;
          if (after.head !== pinned) {
            return finish('head-moved', [`판정 직전 PR head 가 ${pinned} 에서 ${after.head} 로 바뀌었다 — 새 head 로 다시 기다린다.`]);
          }
          if (after.state === 'CLOSED') return finish('head-moved', [`PR #${pr} 이 판정 직전에 병합되지 않고 닫혔다.`]);
        }
        snapshot = current;
        polled = true;
        failures = 0;
      } catch (error) {
        if (!(error instanceof TransientGhError)) throw error;
        failures += 1;
        log(`gh 조회 실패 ${failures}/${TRANSIENT_LIMIT}: ${error.message}`);
        if (failures >= TRANSIENT_LIMIT) throw new ToolError(2, `gh 조회가 연속 ${TRANSIENT_LIMIT}회 실패했다 — 판정하지 않고 끝낸다.`);
      }
      if (polled && snapshot.state !== 'waiting') return finish(snapshot.state);
      const elapsed = now() - started;
      if (polled && snapshot.reason === 'not-started' && elapsed >= startTimeoutMs) {
        const hint = mergeState === 'DIRTY' ? ' PR 이 main 과 충돌(DIRTY)해 CI 가 돌지 않는다 — 충돌을 풀고 다시 올린다.' : '';
        return finish('timeout', [`${Math.round(startTimeoutMs / 60_000)}분 안에 ${workflow} 실행이 시작되지 않았다.${hint}`]);
      }
      if (elapsed >= timeoutMs) return finish('timeout', [`${Math.round(timeoutMs / 60_000)}분 안에 정착하지 않았다.`]);
      if (polled) {
        const at = now();
        const signature = `${snapshot.reason}|${snapshot.ciRuns.map((run) => `${run.id}:${run.status}`).join(',')}|${snapshot.registered}|${snapshot.completed}`;
        if (signature !== lastSignature || at - lastLogAt >= PROGRESS_EVERY_MS) {
          log(progressLine(snapshot, at));
          lastSignature = signature;
          lastLogAt = at;
        }
      }
      await sleep(intervalMs);
    }
  } catch (error) {
    const message = error instanceof ToolError ? error.message : `예상 밖 오류(${error?.name ?? typeof error}): ${firstLine(error?.message)}`;
    return finish('error', [message]);
  }
}

const FLAGS = Object.freeze({
  '--pr': 'pr', '--sha': 'sha', '--interval-seconds': 'interval', '--timeout-minutes': 'timeout', '--start-timeout-minutes': 'startTimeout',
});

function boundedCount(value, flag, min, max, fallback) {
  if (value === undefined) return fallback;
  const number = COUNT_PATTERN.test(value) ? Number(value) : NaN;
  if (!(number >= min && number <= max)) throw new ToolError(2, `${flag} 는 ${min}~${max} 사이의 정수다`);
  return number;
}

/** 명령줄 인자를 검증한다. 검증한 값만 gh 인자가 된다. */
export function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = FLAGS[argv[index]];
    if (!key) throw new ToolError(2, `알 수 없는 인자: ${firstLine(argv[index])}`);
    if (Object.hasOwn(values, key)) throw new ToolError(2, `${argv[index]} 를 두 번 줬다`);
    if (index + 1 >= argv.length) throw new ToolError(2, `${argv[index]} 의 값이 없다`);
    values[key] = argv[index + 1];
  }
  if (!PR_PATTERN.test(values.pr ?? '')) throw new ToolError(2, '--pr 는 양의 정수다');
  if (values.sha !== undefined && !SHA_PATTERN.test(values.sha)) throw new ToolError(2, '--sha 는 40자리 16진 커밋이다');
  return {
    pr: Number(values.pr),
    sha: values.sha === undefined ? null : values.sha.toLowerCase(),
    intervalMs: boundedCount(values.interval, '--interval-seconds', 5, 3600, 30) * 1000,
    timeoutMs: boundedCount(values.timeout, '--timeout-minutes', 1, 1440, 90) * 60_000,
    startTimeoutMs: boundedCount(values.startTimeout, '--start-timeout-minutes', 1, 1440, 15) * 60_000,
  };
}

const delay = (ms) => new Promise((done) => { setTimeout(done, ms); });

/** 종료 코드를 돌려준다. deps 는 시험이 gh·sleep·now·log·manifest 를 끼워 넣을 때만 준다. */
export async function main(argv = process.argv.slice(2), deps = {}) {
  const log = deps.log ?? ((line) => process.stdout.write(`${line}\n`));
  try {
    let options;
    try {
      options = parseArgs(argv);
    } catch (error) {
      log(USAGE);
      throw error;
    }
    const manifest = deps.manifest ?? JSON.parse(readFileSync(join(REPO_ROOT, MANIFEST_PATH), 'utf8'));
    const outcome = await waitForRequiredChecks({
      ...options, manifest, gh: deps.gh ?? runGh, sleep: deps.sleep ?? delay, now: deps.now ?? Date.now, log,
    });
    return outcome.code === 0 && outcome.result === 'pass' ? 0 : (outcome.code || EXIT.error);
  } catch (error) {
    log(error instanceof ToolError ? error.message : `예상 밖 오류(${error?.name ?? typeof error}): ${firstLine(error?.message)}`);
    log('RESULT=error pr=- sha=- required=0/0');
    return EXIT.error;
  }
}

if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  process.exitCode = await main();
}
