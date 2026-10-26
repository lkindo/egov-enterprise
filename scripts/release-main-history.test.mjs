import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  blockingCommits, commitRunVerdict, ruleChain, RULE_SOURCE, verifyReleaseHistory,
} from './release-main-history.mjs';

// [2026-10-26 DEC-OPS-384] 릴리스는 직전 발행 릴리스(또는 이 규칙이 들어온 커밋) 이후 main 커밋마다 빨간 채 남은 실행이 없어야 한다.

const run = overrides => ({ head_sha: 'x', event: 'push', head_branch: 'main', status: 'completed', conclusion: 'success', ...overrides });

test('a commit is verified by a successful main run; red, running and unjudged runs are told apart from a missing one', () => {
  assert.equal(commitRunVerdict([run({})]), 'verified');
  assert.equal(commitRunVerdict([run({ conclusion: 'failure' }), run({})]), 'verified', 'a later green run resolves the red one');
  assert.equal(commitRunVerdict([run({ conclusion: 'failure' })]), 'red');
  assert.equal(commitRunVerdict([run({ conclusion: 'timed_out' })]), 'red');
  assert.equal(commitRunVerdict([run({ conclusion: null, status: 'in_progress' })]), 'running');
  assert.equal(commitRunVerdict([run({ conclusion: 'cancelled' })]), 'unjudged');
  assert.equal(commitRunVerdict([run({ conclusion: 'startup_failure' })]), 'unjudged');
  assert.equal(commitRunVerdict([]), 'missing', 'no run (dropped push event)');
});

test('only a missing middle run is covered by the next full push; red, unjudged, running and unreadable commits block', () => {
  const verdicts = new Map([['a', 'verified'], ['b', 'missing'], ['c', 'red'], ['d', 'running'], ['e', null], ['f', 'unjudged'], ['g', 'verified']]);
  assert.deepEqual(blockingCommits(['a', 'b', 'c', 'd', 'e', 'f', 'g'], verdicts).map(item => item.sha), ['c', 'd', 'e', 'f']);
  assert.deepEqual(blockingCommits(['a', 'b'], new Map([['a', 'verified'], ['b', 'missing']])).map(item => item.sha), ['b'],
    'the tagged commit has no next push to cover it');
});

test('a successful manual full run covers every commit up to it — the way out of a red that a rerun cannot fix', () => {
  const verdicts = new Map([['red', 'red'], ['fix', 'verified'], ['later', 'unjudged'], ['tag', 'verified']]);
  const commits = ['red', 'fix', 'later', 'tag'];
  assert.deepEqual(blockingCommits(commits, verdicts).map(item => item.sha), ['red', 'later']);
  assert.deepEqual(blockingCommits(commits, verdicts, new Set(['fix'])).map(item => item.sha), ['later'],
    'a full run covers commits up to it, not after it');
  assert.deepEqual(blockingCommits(commits, verdicts, new Set(['later'])), []);
  assert.match(blockingCommits(['red', 'tag'], verdicts)[0].reason, /수동 실행\(전수\)/);
});

function repository(t) {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'release-history-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(['init', '-q', '-b', 'main']);
  git(['config', 'user.email', 'release@example.test']);
  git(['config', 'user.name', 'release']);
  git(['config', 'commit.gpgsign', 'false']);
  const commit = (name, file = `${name}.txt`) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), name);
    git(['add', '--', file]);
    git(['commit', '-q', '-m', name]);
    return git(['rev-parse', 'HEAD']);
  };
  return { git, commit };
}

test('the chain starts at the commit that introduced the rule', (t) => {
  const { git, commit } = repository(t);
  commit('one');
  git(['tag', 'v1.0.0']);
  const rule = commit('rule', RULE_SOURCE);
  const tag = commit('tag');
  assert.deepEqual(ruleChain(tag, git), [rule, tag], 'history before the rule is not judged under it');
  assert.throws(() => ruleChain(git(['rev-parse', 'HEAD~2']), git), /release-main-history\.mjs/, 'a missing rule is an error');
});

/** Actions·Releases API 대역 — 호출을 센다. */
function api({ pushRuns = [], manualRuns = [], published = [] }) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const parsed = new URL(url);
    if (parsed.pathname.includes('/releases/tags/')) {
      const tag = decodeURIComponent(parsed.pathname.split('/').at(-1));
      return published.includes(tag)
        ? { ok: true, json: async () => ({ tag_name: tag, draft: false }) }
        : { ok: false, status: 404, json: async () => ({}) };
    }
    const event = parsed.searchParams.get('event');
    const head = parsed.searchParams.get('head_sha');
    let runs = event === 'workflow_dispatch' ? manualRuns : pushRuns;
    if (head) runs = runs.filter(item => item.head_sha === head);
    return { ok: true, json: async () => ({ total_count: runs.length, workflow_runs: runs }) };
  };
  return { fetchImpl, calls };
}

const check = (git, tagSha, fetchImpl) => verifyReleaseHistory({ tagSha, repository: 'o/r', token: 't', fetchImpl, git });

test('only a published release on the first-parent chain shortens the range', async (t) => {
  const { git, commit } = repository(t);
  const rule = commit('rule', RULE_SOURCE);
  const red = commit('red');
  const failedTag = commit('failed-tag');
  git(['tag', 'v0.2.0']);
  const fix = commit('fix');
  const runs = [rule, failedTag, fix].map(sha => run({ head_sha: sha })).concat(run({ head_sha: red, conclusion: 'failure' }));

  // v0.2.0 의 verify 가 막혀 발행되지 않았다 — 그 뒤의 태그도 빨간 커밋을 넘겨서는 안 된다.
  let result = await check(git, fix, api({ pushRuns: runs }).fetchImpl);
  assert.deepEqual(result.commits, [rule, red, failedTag, fix]);
  assert.deepEqual(result.blocking.map(item => item.sha), [red]);

  // 발행된 릴리스라면 그 릴리스가 이미 앞을 검증했다.
  result = await check(git, fix, api({ pushRuns: runs, published: ['v0.2.0'] }).fetchImpl);
  assert.deepEqual(result.commits, [fix]);
  assert.deepEqual(result.blocking, []);
});

test('a tag outside the first-parent chain is not a previous release', async (t) => {
  const { git, commit } = repository(t);
  const rule = commit('rule', RULE_SOURCE);
  const red = commit('red');
  git(['switch', '-q', '-c', 'feature']);
  commit('feature-work');
  git(['tag', 'v0.3.0-rc1']);
  git(['switch', '-q', 'main']);
  git(['merge', '-q', '--no-ff', '-m', 'merge feature', 'feature']);
  const merged = git(['rev-parse', 'HEAD']);
  const tag = commit('tag');
  const runs = [rule, merged, tag].map(sha => run({ head_sha: sha })).concat(run({ head_sha: red, conclusion: 'failure' }));
  const result = await check(git, tag, api({ pushRuns: runs, published: ['v0.3.0-rc1'] }).fetchImpl);
  assert.deepEqual(result.commits, [rule, red, merged, tag]);
  assert.deepEqual(result.blocking.map(item => item.sha), [red]);
});

test('the check fixes a real defect with a later manual full run and reads runs in bulk', async (t) => {
  const { git, commit } = repository(t);
  const rule = commit('rule', RULE_SOURCE);
  const red = commit('red');
  const cancelled = commit('cancelled');
  const fix = commit('fix');
  const tag = commit('tag');
  const pushRuns = [
    run({ head_sha: rule }), run({ head_sha: red, conclusion: 'failure' }), run({ head_sha: cancelled, conclusion: 'cancelled' }),
    run({ head_sha: fix }), run({ head_sha: tag }),
  ];
  let traffic = api({ pushRuns });
  let result = await check(git, tag, traffic.fetchImpl);
  assert.deepEqual(result.blocking.map(item => item.sha), [red, cancelled]);
  assert.equal(traffic.calls.filter(url => url.includes('/actions/')).length, 2, 'one bulk read per event, not one per commit');

  traffic = api({ pushRuns, manualRuns: [run({ head_sha: fix, event: 'workflow_dispatch' })] });
  result = await check(git, tag, traffic.fetchImpl);
  assert.deepEqual(result.blocking, [], 'the manual full run at the fix covers the red and cancelled commits');
});

test('missing runs are asked one by one only when the bulk list is incomplete, and unreadable lookups block', async (t) => {
  const { git, commit } = repository(t);
  const rule = commit('rule', RULE_SOURCE);
  const middle = commit('middle');
  const tag = commit('tag');
  const all = [run({ head_sha: rule }), run({ head_sha: middle }), run({ head_sha: tag })];
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const parsed = new URL(url);
    if (parsed.pathname.includes('/releases/')) return { ok: false, status: 404, json: async () => ({}) };
    const head = parsed.searchParams.get('head_sha');
    if (head) return { ok: true, json: async () => ({ total_count: 1, workflow_runs: all.filter(item => item.head_sha === head) }) };
    // 목록이 1,001건이라고 말하며 일부만 준다.
    const page = parsed.searchParams.get('event') === 'push' ? [all[0], all[2]] : [];
    return { ok: true, json: async () => ({ total_count: parsed.searchParams.get('event') === 'push' ? 1001 : 0, workflow_runs: page }) };
  };
  const result = await check(git, tag, fetchImpl);
  assert.deepEqual(result.blocking, []);
  assert.deepEqual(calls.filter(url => url.includes('head_sha=')).map(url => new URL(url).searchParams.get('head_sha')), [middle]);

  const unreadable = await verifyReleaseHistory({ tagSha: tag, repository: 'o/r', token: '', fetchImpl, git });
  assert.equal(unreadable.blocking.length, 3, 'without a token nothing can be confirmed');
});
