/**
 * 생성 작업의 스테이징 → 프로젝트 폴더 이동(scripts/project-composer-generate.mjs 의 renameWithRetry) 계약.
 *
 * Windows 에서는 방금 쓴 폴더를 백신·색인기가 잠깐 쥐어 rename 이 EPERM·EACCES·EBUSY 로 실패할 수 있다. 그 일시 잠금만 짧게 다시 시도하고
 * (최대 10회, 대기 합 5초 이하), 다른 오류·다른 플랫폼은 바로 실패하며, 끝내 실패하면 원래 오류를 그대로 돌려준다. rename 은 주입해 실제 파일을
 * 건드리지 않는다.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { RENAME_RETRY_DELAYS_MS, renameWithRetry } from './project-composer-generate.mjs';

const failure = (code, attempt) => Object.assign(new Error(`${code} on attempt ${attempt}`), { code });

/** 앞의 `codes` 만큼 그 코드로 실패한 뒤 성공하는 rename. 부른 인자와 기다린 시간을 기록한다. */
function scriptedRename(codes) {
  const calls = [];
  const waits = [];
  const errors = [];
  const rename = (from, to) => {
    calls.push([from, to]);
    const code = codes[calls.length - 1];
    if (code === undefined) return undefined;
    const error = failure(code, calls.length);
    errors.push(error);
    throw error;
  };
  return { calls, waits, errors, rename, wait: async ms => { waits.push(ms); } };
}

test('Windows 의 일시 잠금(EPERM·EACCES·EBUSY)은 다시 시도해 이동을 끝낸다', async () => {
  for (const codes of [['EPERM', 'EPERM', 'EPERM'], ['EACCES'], ['EBUSY', 'EPERM']]) {
    const scripted = scriptedRename(codes);
    await assert.doesNotReject(renameWithRetry('staging', 'project', { rename: scripted.rename, wait: scripted.wait, platform: 'win32' }),
      `${codes.join(',')}: Windows 의 일시 잠금은 다시 시도해 이동을 끝내야 한다`);
    assert.equal(scripted.calls.length, codes.length + 1, `${codes.join(',')}: 실패한 횟수만큼 다시 시도한 뒤 성공해야 한다`);
    assert.ok(scripted.calls.every(([from, to]) => from === 'staging' && to === 'project'), '같은 두 경로로만 다시 시도한다');
    assert.deepEqual(scripted.waits, RENAME_RETRY_DELAYS_MS.slice(0, codes.length));
  }
});

test('잠금이 풀리지 않으면 최대 10회·대기 합 5초 안에서 멈추고 마지막 원래 오류를 그대로 던진다', async () => {
  const scripted = scriptedRename(Array.from({ length: 20 }, () => 'EPERM'));
  await assert.rejects(renameWithRetry('staging', 'project', { rename: scripted.rename, wait: scripted.wait, platform: 'win32' }),
    error => error === scripted.errors.at(-1) && error.code === 'EPERM');
  assert.equal(scripted.calls.length, 10);
  assert.ok(scripted.waits.reduce((sum, ms) => sum + ms, 0) <= 5_000, `대기 합 ${scripted.waits.reduce((sum, ms) => sum + ms, 0)}ms`);
  assert.equal(scripted.waits[0], 50);
  assert.equal(Math.max(...scripted.waits), 800);
  assert.deepEqual(scripted.waits, [...scripted.waits].sort((left, right) => left - right), '대기는 줄지 않는다');
});

test('일시 잠금이 아닌 오류와 Windows 밖의 플랫폼은 다시 시도하지 않는다', async () => {
  for (const [code, platform] of [['ENOENT', 'win32'], ['EXDEV', 'win32'], ['ENOTEMPTY', 'win32'], ['EPERM', 'linux'], ['EBUSY', 'darwin']]) {
    const scripted = scriptedRename([code]);
    await assert.rejects(renameWithRetry('staging', 'project', { rename: scripted.rename, wait: scripted.wait, platform }),
      error => error === scripted.errors[0], `${code}/${platform}`);
    assert.deepEqual([scripted.calls.length, scripted.waits], [1, []], `${code}/${platform}: 한 번만 시도한다`);
  }
});

// 생성 작업 전체(Docker·검증기)는 무거운 시험이라, 이 이동이 재시도 경로를 거친다는 결속만 원문으로 본다.
test('생성 작업은 스테이징 → 프로젝트 폴더 이동에 재시도 경로를 쓴다', () => {
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'project-composer-generate.mjs'), 'utf8');
  assert.match(source, /await renameWithRetry\(paths\.stagingDirectory, paths\.projectDirectory\);/);
  assert.doesNotMatch(source, /renameSync\(paths\.stagingDirectory/);
});
