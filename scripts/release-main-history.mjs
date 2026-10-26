#!/usr/bin/env node
/**
 * [2026-10-26 DEC-OPS-384] 릴리스 이력 검증 — 태그 대상 커밋까지 main 의 커밋마다 빨간 채 남은 main CI 실행이 없어야 릴리스한다.
 *
 * main push 의 검증 범위는 직전 main SHA 와의 차이다(DEC-OPS-183). 앞 커밋의 실행이 실패해도 그 실패는 그 커밋에만 남고, 다음 커밋은
 * 차이만 검증하므로 main 최신 커밋의 초록이 앞 커밋까지 덮지 않는다. 그래서 릴리스 때 한 번, 직전 릴리스(또는 이 규칙이 들어온 커밋)
 * 이후의 main first-parent 커밋을 모두 본다. 커밋마다:
 *   · 성공한 실행이 하나라도 있으면 검증됐다(실패 잡을 다시 돌려 초록이 된 실행 포함).
 *   · 아직 도는 실행이 있으면 기다려야 한다.
 *   · 실패·시간 초과로 끝난 실행만 있으면 빨간 채 남았다 — 다시 돌리거나 고쳐서 초록을 만든 뒤 태그한다.
 *   · 실행이 없거나 판정 없이 끝났으면(push 이벤트 누락·취소·시작 실패) 다음 push 가 이 커밋을 검증되지 않은 기준으로 보고 전수를
 *     돌렸다(DEC-OPS-183) — 다음 커밋이 그 몫을 진다. 태그 대상 커밋은 다음이 없으므로 이 경우도 막는다.
 * 조회에 실패하면 확인하지 못한 것으로 보고 막는다(fail-closed).
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { listMainPushRuns } from './ci-change-scope.mjs';

/** 이 규칙의 원본. 규칙이 들어오기 전의 이력은 검사하지 않는다 — 그때의 빨간 실행은 이 규칙 없이 남은 것이다. */
export const RULE_SOURCE = 'scripts/release-main-history.mjs';

/** 커밋 하나의 main 실행 목록으로 본 판정: verified | running | red | uncovered(실행 없음·판정 없음). */
export function commitRunVerdict(runs) {
  if (runs.some(run => run?.conclusion === 'success')) return 'verified';
  if (runs.some(run => run?.conclusion == null && run?.status !== 'completed')) return 'running';
  if (runs.some(run => run?.conclusion === 'failure' || run?.conclusion === 'timed_out')) return 'red';
  return 'uncovered';
}

/**
 * 릴리스를 막는 커밋. commits 는 오래된 것부터, 마지막이 태그 대상이다. verdicts 는 sha → 판정이며 null 은 조회 실패다.
 */
export function blockingCommits(commits, verdicts) {
  const blocking = [];
  commits.forEach((sha, index) => {
    const verdict = verdicts.get(sha);
    const isTag = index === commits.length - 1;
    if (verdict === null || verdict === undefined) blocking.push({ sha, reason: 'main 실행을 조회하지 못했다' });
    else if (verdict === 'running') blocking.push({ sha, reason: 'main 실행이 아직 끝나지 않았다' });
    else if (verdict === 'red') blocking.push({ sha, reason: 'main 실행이 실패한 채 남아 있다 — 다시 돌려 초록을 만들거나 고친 뒤 태그한다' });
    else if (verdict === 'uncovered' && isTag) blocking.push({ sha, reason: '태그 대상 커밋에 판정한 main 실행이 없다' });
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

/**
 * 검사할 main first-parent 커밋(오래된 것부터, 태그 대상 포함). 시작점은 직전 릴리스 태그와 이 규칙이 들어온 커밋 가운데 더 최근 것이다.
 * 직전 태그가 규칙보다 뒤면 그 태그는 이미 이 검사를 지난 릴리스이므로 그 뒤만 본다.
 */
export function releaseCommits(tagSha, git = runGit) {
  const introduced = tryGit(git, ['log', '--first-parent', '--diff-filter=A', '--format=%H', tagSha, '--', RULE_SOURCE])
    .split('\n').filter(Boolean).at(-1);
  if (!introduced) throw new Error(`${RULE_SOURCE} 를 들인 커밋을 ${tagSha} 의 main 이력에서 찾지 못했다`);
  const previous = tryGit(git, ['describe', '--tags', '--abbrev=0', '--match', 'v*', `${tagSha}^`]);
  let range;
  if (previous !== '' && isAncestor(git, introduced, previous)) range = `${previous}..${tagSha}`;
  // 규칙이 첫 커밋에 들어왔으면(새 저장소) 부모가 없다 — 태그까지의 first-parent 전부가 규칙 이후다.
  else range = tryGit(git, ['rev-parse', '--verify', '--quiet', `${introduced}^`]) === '' ? tagSha : `${introduced}^..${tagSha}`;
  return git(['rev-list', '--first-parent', '--reverse', range]).split('\n').filter(Boolean);
}

function isAncestor(git, ancestor, descendant) {
  try {
    git(['merge-base', '--is-ancestor', ancestor, descendant]);
    return true;
  } catch {
    return false;
  }
}

export async function verifyReleaseHistory({ tagSha, repository, token, fetchImpl = globalThis.fetch, git = runGit }) {
  const commits = releaseCommits(tagSha, git);
  const verdicts = new Map();
  for (const sha of commits) {
    const runs = await listMainPushRuns({ sha, repository, token, fetchImpl });
    verdicts.set(sha, runs === null ? null : commitRunVerdict(runs));
  }
  return { commits, blocking: blockingCommits(commits, verdicts) };
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
