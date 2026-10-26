import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  blockingCommits, commitRunVerdict, releaseCommits, RULE_SOURCE, verifyReleaseHistory,
} from './release-main-history.mjs';

// [2026-10-26 DEC-OPS-384] 릴리스는 직전 릴리스(또는 이 규칙이 들어온 커밋) 이후 main 커밋마다 빨간 채 남은 실행이 없어야 한다.

const run = overrides => ({ head_sha: 'x', event: 'push', head_branch: 'main', status: 'completed', conclusion: 'success', ...overrides });

test('a commit is verified by any successful main run and blocked while red or running', () => {
  assert.equal(commitRunVerdict([run({})]), 'verified');
  assert.equal(commitRunVerdict([run({ conclusion: 'failure' }), run({})]), 'verified', 'a later green run resolves the red one');
  assert.equal(commitRunVerdict([run({ conclusion: 'failure' })]), 'red');
  assert.equal(commitRunVerdict([run({ conclusion: 'timed_out' })]), 'red');
  assert.equal(commitRunVerdict([run({ conclusion: null, status: 'in_progress' })]), 'running');
  assert.equal(commitRunVerdict([]), 'uncovered', 'no run (dropped push event)');
  assert.equal(commitRunVerdict([run({ conclusion: 'cancelled' })]), 'uncovered');
  assert.equal(commitRunVerdict([run({ conclusion: 'startup_failure' })]), 'uncovered');
});

test('red, running and unreadable commits block the release; an uncovered middle commit is covered by the next full run', () => {
  const verdicts = new Map([['a', 'verified'], ['b', 'uncovered'], ['c', 'red'], ['d', 'running'], ['e', null], ['f', 'verified']]);
  assert.deepEqual(blockingCommits(['a', 'b', 'c', 'd', 'e', 'f'], verdicts).map(item => item.sha), ['c', 'd', 'e']);
  assert.deepEqual(blockingCommits(['a', 'b'], new Map([['a', 'verified'], ['b', 'uncovered']])).map(item => item.sha), ['b'],
    'the tagged commit has no next run to cover it');
  assert.deepEqual(blockingCommits(['a', 'f'], verdicts), []);
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

test('the range starts at the rule when the previous release predates it', (t) => {
  const { git, commit } = repository(t);
  commit('one');
  git(['tag', 'v1.0.0']);
  commit('two');
  const rule = commit('rule', RULE_SOURCE);
  const four = commit('four');
  assert.deepEqual(releaseCommits(four, git), [rule, four], 'history before the rule is not judged under it');
});

test('the range starts after the previous release once the rule predates it', (t) => {
  const { git, commit } = repository(t);
  commit('one');
  commit('rule', RULE_SOURCE);
  commit('three');
  git(['tag', 'v1.0.0']);
  const five = commit('five');
  const six = commit('six');
  assert.deepEqual(releaseCommits(six, git), [five, six]);
});

test('a missing rule source is an error, not an empty range', (t) => {
  const { commit, git } = repository(t);
  const head = commit('one');
  assert.throws(() => releaseCommits(head, git), /release-main-history\.mjs/);
});

test('the release check reads each main commit and fails closed on lookup errors', async (t) => {
  const { git, commit } = repository(t);
  const rule = commit('rule', RULE_SOURCE);
  const red = commit('red');
  const tag = commit('tag');
  const runs = { [rule]: [run({ head_sha: rule })], [red]: [run({ head_sha: red, conclusion: 'failure' })], [tag]: [run({ head_sha: tag })] };
  const fetchImpl = async (url) => {
    const sha = new URL(url).searchParams.get('head_sha');
    return { ok: true, json: async () => ({ workflow_runs: runs[sha] ?? [] }) };
  };
  const result = await verifyReleaseHistory({ tagSha: tag, repository: 'o/r', token: 't', fetchImpl, git });
  assert.deepEqual(result.commits, [rule, red, tag]);
  assert.deepEqual(result.blocking.map(item => item.sha), [red]);

  runs[red] = [run({ head_sha: red, conclusion: 'failure' }), run({ head_sha: red })];
  assert.deepEqual((await verifyReleaseHistory({ tagSha: tag, repository: 'o/r', token: 't', fetchImpl, git })).blocking, []);

  const unreadable = await verifyReleaseHistory({ tagSha: tag, repository: 'o/r', token: '', fetchImpl, git });
  assert.equal(unreadable.blocking.length, 3, 'without a token nothing can be confirmed');
});
