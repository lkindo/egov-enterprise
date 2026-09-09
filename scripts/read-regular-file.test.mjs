import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readRegularFile } from './read-regular-file.mjs';
import { spawnSync } from 'node:child_process';

test('descriptor reads enforce regular-file type, byte bound and UTF-8 content', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'egov-regular-file-'));
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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'egov-special-file-'));
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
