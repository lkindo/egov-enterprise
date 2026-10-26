#!/usr/bin/env node
/**
 * [2026-10-26 DEC-OPS-384] 릴리스 이력 검증 — 태그 대상 커밋까지 main 의 커밋마다 빨간 채 남은 main CI 실행이 없어야 릴리스한다.
 *
 * main push 의 검증 범위는 직전 main SHA 와의 차이다(DEC-OPS-183). 앞 커밋의 실행이 실패해도 그 실패는 그 커밋에만 남고, 다음 커밋은
 * 차이만 검증하므로 main 최신 커밋의 초록이 앞 커밋까지 덮지 않는다. 그래서 릴리스 때 한 번, 직전 릴리스(main first-parent 이력 위에서
 * 실제로 발행된 태그) 또는 이 규칙이 들어온 커밋 가운데 더 최근 것 이후의 main first-parent 커밋을 모두 본다. 커밋마다:
 *   · 성공한 main push 실행이 있으면 검증됐다(실패 잡을 다시 돌려 초록이 된 실행 포함).
 *   · 그 커밋부터 태그 사이에 성공한 수동 실행(workflow_dispatch — 비교 기준이 없어 전수다)이 있으면 그 전수가 덮는다. 같은 코드로는
 *     다시 돌려도 실패하는 실제 결함은 고친 뒤 main 에서 CI 를 수동 실행해 초록을 만든 다음 태그한다.
 *   · 그 밖에 실패·시간 초과·취소·판정 없음으로 끝났거나 아직 도는 실행이 있으면 막는다.
 *   · main push 실행이 아예 없으면(push 이벤트 누락) 다음 push 가 이 커밋을 검증되지 않은 기준으로 보고 전수를 돌렸다(DEC-OPS-183) —
 *     중간 커밋은 막지 않고, 다음이 없는 태그 대상 커밋은 막는다.
 * 조회에 실패하면 확인하지 못한 것으로 보고 막는다(fail-closed). 실행 목록은 페이지로 한 번에 받아 커밋 수만큼 부르지 않는다.
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { listMainPushRuns } from './ci-change-scope.mjs';

/** 이 규칙의 원본. 규칙이 들어오기 전의 이력은 검사하지 않는다 — 그때의 빨간 실행은 이 규칙 없이 남은 것이다. */
export const RULE_SOURCE = 'scripts/release-main-history.mjs';

const REPOSITORY = /^[\w.-]+\/[\w.-]+$/u;
const PAGE_SIZE = 100;
// 목록 API 는 필터를 건 조회에서 1,000건까지만 준다 — 넘으면 빠진 커밋만 하나씩 다시 묻는다.
const MAX_PAGES = 10;

/** 커밋 하나의 main push 실행 목록으로 본 판정: verified | running | red | unjudged(취소·판정 없음) | missing(실행 없음). */
export function commitRunVerdict(runs) {
  if (runs.length === 0) return 'missing';
  if (runs.some(run => run?.conclusion === 'success')) return 'verified';
  if (runs.some(run => run?.conclusion == null && run?.status !== 'completed')) return 'running';
  if (runs.some(run => run?.conclusion === 'failure' || run?.conclusion === 'timed_out')) return 'red';
  return 'unjudged';
}

const REASONS = {
  null: 'main 실행을 조회하지 못했다',
  running: 'main 실행이 아직 끝나지 않았다',
  red: 'main 실행이 실패한 채 남아 있다 — 실패 잡을 다시 돌려 초록을 만들거나, 고친 뒤 main 에서 CI 를 수동 실행(전수)해 초록을 만든 다음 태그한다',
  unjudged: 'main 실행이 취소되거나 판정 없이 끝났다 — main 에서 CI 를 수동 실행(전수)해 초록을 만든 다음 태그한다',
  missing: '태그 대상 커밋에 main 실행이 없다',
};

/**
 * 릴리스를 막는 커밋. commits 는 오래된 것부터, 마지막이 태그 대상이다. verdicts 는 sha → 판정이며 null 은 조회 실패다.
 * fullRunShas 는 성공한 수동(전수) 실행이 있는 커밋이다 — 그 커밋과 그 앞의 커밋을 모두 덮는다.
 */
export function blockingCommits(commits, verdicts, fullRunShas = new Set()) {
  const lastFull = commits.findLastIndex(sha => fullRunShas.has(sha));
  const blocking = [];
  commits.forEach((sha, index) => {
    if (index <= lastFull) return;
    const verdict = verdicts.has(sha) ? verdicts.get(sha) : null;
    if (verdict === 'verified') return;
    if (verdict === 'missing' && index < commits.length - 1) return;
    blocking.push({ sha, reason: REASONS[String(verdict)] ?? REASONS.null });
  });
  return blocking;
}

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function tryGit(git, args) {
  try {
    return git(args);
  } catch {
    return '';
  }
}

/** 규칙이 들어온 커밋부터 태그 대상까지의 main first-parent 커밋(오래된 것부터). */
export function ruleChain(tagSha, git = runGit) {
  const introduced = tryGit(git, ['log', '--first-parent', '--diff-filter=A', '--format=%H', tagSha, '--', RULE_SOURCE])
    .split('\n').filter(Boolean).at(-1);
  if (!introduced) throw new Error(`${RULE_SOURCE} 를 들인 커밋을 ${tagSha} 의 main 이력에서 찾지 못했다`);
  // 규칙이 첫 커밋에 들어왔으면(새 저장소) 부모가 없다 — 태그까지의 first-parent 전부가 규칙 이후다.
  const range = tryGit(git, ['rev-parse', '--verify', '--quiet', `${introduced}^`]) === '' ? tagSha : `${introduced}^..${tagSha}`;
  return git(['rev-list', '--first-parent', '--reverse', range]).split('\n').filter(Boolean);
}

/** 커밋 → 그 커밋을 가리키는 v* 태그 이름들. 주석 태그는 대상 커밋으로 푼다. */
export function versionTagsByCommit(git = runGit) {
  const map = new Map();
  for (const line of tryGit(git, ['for-each-ref', '--format=%(refname:short)%09%(objectname)%09%(*objectname)', 'refs/tags/v*']).split('\n')) {
    const [name, object, peeled] = line.split('\t');
    if (!name) continue;
    const commit = peeled || object;
    map.set(commit, [...(map.get(commit) ?? []), name]);
  }
  return map;
}

function headers(token) {
  return { accept: 'application/vnd.github+json', authorization: `Bearer ${token}`, 'x-github-api-version': '2022-11-28' };
}

/** 태그가 발행된 릴리스인지(GitHub Release, 초안 아님). 확인하지 못하면 발행되지 않은 것으로 본다 — 검사 범위가 넓어지는 쪽이다. */
export async function isPublishedRelease({ tag, repository, token, fetchImpl = globalThis.fetch }) {
  if (!REPOSITORY.test(repository ?? '') || !token || typeof fetchImpl !== 'function') return false;
  try {
    const response = await fetchImpl(`https://api.github.com/repos/${repository}/releases/tags/${encodeURIComponent(tag)}`,
      { headers: headers(token) });
    if (!response?.ok) return false;
    const body = await response.json();
    return body?.draft === false && body?.tag_name === tag;
  } catch {
    return false;
  }
}

/** main ci.yml 실행을 한 번에 받는다(since 이후, event 별). 조회에 실패하면 null, 1,000건 한도를 넘으면 complete=false. */
export async function listWorkflowRuns({ repository, token, event, since, fetchImpl = globalThis.fetch, branch = 'main', workflow = 'ci.yml' }) {
  if (!REPOSITORY.test(repository ?? '') || !token || typeof fetchImpl !== 'function') return null;
  const runs = [];
  let fetched = 0;
  let total = 0;
  try {
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const query = `branch=${branch}&event=${event}&created=${encodeURIComponent(`>=${since}`)}&per_page=${PAGE_SIZE}&page=${page}`;
      const response = await fetchImpl(`https://api.github.com/repos/${repository}/actions/workflows/${workflow}/runs?${query}`,
        { headers: headers(token) });
      if (!response?.ok) return null;
      const body = await response.json();
      if (!Array.isArray(body?.workflow_runs) || !Number.isInteger(body?.total_count)) return null;
      total = body.total_count;
      fetched += body.workflow_runs.length;
      runs.push(...body.workflow_runs.filter(run => run?.event === event && run?.head_branch === branch));
      if (body.workflow_runs.length < PAGE_SIZE || fetched >= total) break;
    }
  } catch {
    return null;
  }
  return { runs, complete: fetched >= total };
}

function dayBefore(git, sha) {
  const date = new Date(git(['show', '-s', '--format=%cI', sha]));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export async function verifyReleaseHistory({ tagSha, repository, token, fetchImpl = globalThis.fetch, git = runGit }) {
  const chain = ruleChain(tagSha, git);
  const tags = versionTagsByCommit(git);
  // 직전 릴리스: 태그 대상 앞의 first-parent 커밋 가운데 발행된 v* 태그가 있는 가장 최근 커밋. 발행에 실패한 태그와 main 밖의 태그는 아니다.
  let start = 0;
  search: for (let index = chain.length - 2; index >= 0; index -= 1) {
    for (const tag of tags.get(chain[index]) ?? []) {
      if (await isPublishedRelease({ tag, repository, token, fetchImpl })) {
        start = index + 1;
        break search;
      }
    }
  }
  const commits = chain.slice(start);
  const since = dayBefore(git, commits[0]);
  const pushRuns = await listWorkflowRuns({ repository, token, event: 'push', since, fetchImpl });
  const manualRuns = await listWorkflowRuns({ repository, token, event: 'workflow_dispatch', since, fetchImpl });

  const verdicts = new Map();
  for (const sha of commits) {
    let runs = pushRuns?.runs.filter(run => run?.head_sha === sha) ?? [];
    // 목록이 다 오지 않았거나 받지 못했으면 '없음'으로 단정하지 않고 그 커밋만 다시 묻는다.
    if (runs.length === 0 && pushRuns?.complete !== true) {
      runs = await listMainPushRuns({ sha, repository, token, fetchImpl });
      if (runs === null) {
        verdicts.set(sha, null);
        continue;
      }
    }
    verdicts.set(sha, commitRunVerdict(runs));
  }
  const fullRunShas = new Set((manualRuns?.runs ?? []).filter(run => run?.conclusion === 'success').map(run => run.head_sha));
  return { commits, blocking: blockingCommits(commits, verdicts, fullRunShas) };
}

async function main(argv, env = process.env) {
  const index = argv.indexOf('--tag-sha');
  const tagSha = index >= 0 ? argv[index + 1] : '';
  if (!/^[0-9a-f]{40}$/u.test(tagSha ?? '')) throw new Error('usage: release-main-history.mjs --tag-sha <40-hex sha>');
  const { commits, blocking } = await verifyReleaseHistory({ tagSha, repository: env.GITHUB_REPOSITORY, token: env.GH_TOKEN });
  if (blocking.length > 0) {
    for (const item of blocking) console.log(`::error::${item.sha.slice(0, 12)} — ${item.reason}`);
    console.error(`릴리스 이력 검증 실패: main 커밋 ${commits.length}개 중 ${blocking.length}개가 검증되지 않았다(DEC-OPS-384).`);
    process.exitCode = 1;
    return;
  }
  console.log(`릴리스 이력 검증: main 커밋 ${commits.length}개에 빨간 채 남거나 아직 도는 main 실행이 없다(DEC-OPS-384).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
