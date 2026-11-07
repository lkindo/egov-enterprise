import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';
import { readRegularFile } from './read-regular-file.mjs';
import { spawnSync } from 'node:child_process';

// [2026-11-07] 이 파일이 만든 임시 폴더는 모든 시험이 끝난 뒤 지운다 — 지우지 않아 %TEMP% 에 수만 개가 쌓였다(pre-push 지연 실측). 저장소를 닫는 시험별 정리(t.after)가 먼저 끝난 뒤라 Windows 에서도 지울 수 있다. 다른 프로세스가 아직 쥐고 있어 지우지 못하면 시험을 실패시키지 않고 남긴다(정리는 최선 노력이다).
const temporaryRoots = [];
function temporaryDirectory(prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}
after(() => {
  for (const root of temporaryRoots.splice(0)) {
    try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 3 }); } catch { /* 최선 노력 */ }
  }
});

test('descriptor reads enforce regular-file type, byte bound and UTF-8 content', () => {
  const root = temporaryDirectory('egov-regular-file-');
  const file = path.join(root, 'data.txt');
  fs.writeFileSync(file, '검증');
  assert.equal(readRegularFile(file, { maximumBytes: 6, encoding: 'utf8' }), '검증');
  assert.throws(() => readRegularFile(file, { maximumBytes: 5 }), /bounded/);
  assert.throws(() => readRegularFile(root));
  assert.throws(() => readRegularFile(path.join(root, 'missing')));
  const empty = path.join(root, 'empty'); fs.writeFileSync(empty, '');
  assert.equal(readRegularFile(empty).length, 0);
});

test('links and POSIX special files cannot redirect or stall the descriptor read', () => {
  const root = temporaryDirectory('egov-special-file-');
  const regular = path.join(root, 'regular');
  const link = path.join(root, 'link');
  const fifo = path.join(root, 'pipe');
  fs.writeFileSync(regular, 'content');
  if (process.platform === 'win32') {
    // Junctions can be created without the file-symlink privilege on Windows.
    fs.symlinkSync(root, link, 'junction');
    assert.throws(() => readRegularFile(link));
    return;
  }
  fs.symlinkSync(regular, link);
  assert.throws(() => readRegularFile(link));
  assert.equal(spawnSync('mkfifo', [fifo]).status, 0);
  const module = new URL('./read-regular-file.mjs', import.meta.url).href;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e',
    `import { readRegularFile } from ${JSON.stringify(module)}; readRegularFile(process.argv[1]);`, fifo],
  { timeout: 3000 });
  assert.equal(child.error, undefined, 'special file read must reject without timing out');
  assert.equal(child.status, 1);
});
