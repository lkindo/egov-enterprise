// 커밋된 작업공간 CSS(public/styles.css)가 지금의 premium.css 토큰과 styles.input.css 로 만든 결과와 같은지 본다.
// premium.css 가 바뀌면 이 시험이 붉어지고 `node tools/migration-workspace/build-styles.mjs` 로 다시 만든다.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { renderStyles, stylesAreCurrent } from './build-styles.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const premium = fileURLToPath(new URL('../../frontend/src/styles/themes/premium.css', import.meta.url));

test('the committed workspace stylesheet matches the current premium tokens and workspace styles', async () => {
  assert.equal(await stylesAreCurrent(), true, 'stale stylesheet — run node tools/migration-workspace/build-styles.mjs');
  const rendered = await renderStyles();
  assert.ok(!rendered.includes('\r'), 'the generator writes LF regardless of checkout line endings');
  assert.ok(rendered.includes((await readFile(premium, 'utf8')).replace(/\r\n/g, '\n').split('\n').find(line => line.includes('--'))));
});

// 부정 사례: 같은 배치의 사본에서 토큰을 바꾸면 --check 가 쓰지 않고 1 로 끝나고, 알 수 없는 인자는 쓰지 않고 2 로 끝난다.
test('--check reports a stale copy without writing, and unknown arguments never rewrite the stylesheet', async t => {
  const root = await mkdtemp(join(tmpdir(), 'migration-styles-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const tool = join(root, 'tools', 'migration-workspace');
  await mkdir(join(tool, 'public'), { recursive: true });
  await mkdir(join(root, 'frontend', 'src', 'styles', 'themes'), { recursive: true });
  for (const file of ['build-styles.mjs', 'styles.input.css', join('public', 'styles.css')]) await copyFile(join(here, file), join(tool, file));
  await copyFile(premium, join(root, 'frontend', 'src', 'styles', 'themes', 'premium.css'));
  const run = (...args) => spawnSync(process.execPath, [join(tool, 'build-styles.mjs'), ...args], { encoding: 'utf8', windowsHide: true });
  assert.equal(run('--check').status, 0);
  const committed = await readFile(join(tool, 'public', 'styles.css'), 'utf8');
  await writeFile(join(root, 'frontend', 'src', 'styles', 'themes', 'premium.css'), ':root { --synthetic-token: 1px; }\n');
  const stale = run('--check');
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /stale; rebuild with node tools\/migration-workspace\/build-styles\.mjs/);
  assert.equal(run('--chek').status, 2);
  assert.equal(await readFile(join(tool, 'public', 'styles.css'), 'utf8'), committed);
  assert.equal(run().status, 0);
  assert.equal(run('--check').status, 0);
});
