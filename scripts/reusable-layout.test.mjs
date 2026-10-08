import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { BACKEND_LAYOUTS, normalizeBackendLayout } from './reusable-layout.mjs';
import { parseSourceArgs } from './generate-reusable-base-source.mjs';
import { initializeGeneratedRepository } from './reusable-source-tree.mjs';

test('backend layout defaults preserve existing generation and are independent of profile', () => {
  assert.equal(normalizeBackendLayout(), 'multi-module');
  for (const profile of ['core', 'collaboration', 'demo']) {
    const base = ['--profile', profile, '--db-bundle', 'build/bundle'];
    assert.equal(parseSourceArgs(base).layout, 'multi-module');
    for (const layout of BACKEND_LAYOUTS) {
      const options = parseSourceArgs([...base, '--layout', layout]);
      assert.equal(options.profile, profile);
      assert.equal(options.dbBundle, 'build/bundle');
      assert.equal(options.layout, layout);
    }
  }
});

test('unsupported, missing and ambiguous layout inputs fail before any generation', () => {
  for (const value of [null, '', 'single', '../single-module', 'single-module --allow-dirty', {}]) {
    assert.throws(() => normalizeBackendLayout(value), /Unsupported backend layout/);
  }
  const base = ['--profile', 'core', '--db-bundle', 'build/bundle'];
  for (const args of [
    [...base, '--layout'], [...base, '--layout', '--allow-dirty'],
    [...base, '--layout', 'single'], [...base, '--layout', 'single-module', '--layout', 'multi-module'],
    [...base, '--output'], ['--profile', '--db-bundle', 'build/bundle'],
    [...base, '--database', 'oracle'],
  ]) assert.throws(() => parseSourceArgs(args));
});

test('generated Git boundary stops parent build ignores without staging, committing or changing the producer', t => {
  const base = realpathSync(tmpdir());
  const parent = mkdtempSync(join(base, 'egov-layout-git-'));
  t.after(() => {
    const back = relative(base, realpathSync(parent));
    assert.ok(back.startsWith('egov-layout-git-') && !back.includes(sep));
    rmSync(parent, { recursive: true, force: true });
  });
  const git = (cwd, args) => spawnSync('git', args, { cwd, windowsHide: true, encoding: 'utf8' });
  assert.equal(git(parent, ['init', '--quiet']).status, 0);
  writeFileSync(join(parent, '.gitignore'), 'build/\n');
  const producerConfig = readFileSync(join(parent, '.git/config'), 'utf8');
  const output = join(parent, 'build/project');
  mkdirSync(join(output, 'frontend/src'), { recursive: true });
  mkdirSync(join(output, 'frontend/node_modules'), { recursive: true });
  writeFileSync(join(output, 'frontend/.gitignore'), '/node_modules\n/.next/\n');
  writeFileSync(join(output, 'frontend/src/page.tsx'), 'export default function Page() { return null; }\n');
  writeFileSync(join(output, 'frontend/node_modules/ignored.js'), 'ignored\n');
  assert.equal(git(output, ['check-ignore', '--quiet', 'frontend/src/page.tsx']).status, 0,
    'negative control: the producer initially hides generated source');
  initializeGeneratedRepository(output);
  assert.equal(realpathSync(git(output, ['rev-parse', '--show-toplevel']).stdout.trim()), realpathSync(output));
  assert.equal(git(output, ['check-ignore', '--quiet', 'frontend/src/page.tsx']).status, 1);
  assert.equal(git(output, ['check-ignore', '--quiet', 'frontend/node_modules/ignored.js']).status, 0);
  assert.equal(git(output, ['ls-files']).stdout, '', 'initialization must not stage source');
  assert.notEqual(git(output, ['rev-parse', '--verify', 'HEAD']).status, 0, 'initialization must not commit');
  assert.equal(git(output, ['remote']).stdout, '', 'initialization must not add a remote');
  assert.equal(readFileSync(join(parent, '.git/config'), 'utf8'), producerConfig);
  const outputConfig = readFileSync(join(output, '.git/config'), 'utf8');
  assert.throws(() => initializeGeneratedRepository(output), /새 산출물/);
  assert.equal(readFileSync(join(output, '.git/config'), 'utf8'), outputConfig);
  const producer = resolve('.');
  assert.ok(existsSync(join(producer, '.git')));
  assert.throws(() => initializeGeneratedRepository(producer), /새 산출물/);
});

test('generated Git boundary accepts an output path whose Windows drive letter case differs from Git', t => {
  // Git 은 실제 표기(D:\…)로 최상위를 돌려준다. 터미널 작업 디렉터리가 d:\… 이면 생성 마지막 단계가 경계 불일치로 실패했다.
  //   Linux 에는 드라이브 문자가 없어 같은 경로로 돌고, Windows 에서는 대소문자를 뒤집은 경로로 그 결함을 재현한다.
  const base = realpathSync(tmpdir());
  const parent = mkdtempSync(join(base, 'egov-layout-drive-'));
  t.after(() => {
    const back = relative(base, realpathSync(parent));
    assert.ok(back.startsWith('egov-layout-drive-') && !back.includes(sep));
    rmSync(parent, { recursive: true, force: true });
  });
  const output = join(parent, 'project');
  mkdirSync(output, { recursive: true });
  const flipped = output.replace(/^[A-Za-z](?=:)/, letter => (letter === letter.toUpperCase() ? letter.toLowerCase() : letter.toUpperCase()));
  if (process.platform === 'win32') assert.notEqual(flipped, output, 'negative control: the drive letter case is flipped');
  initializeGeneratedRepository(flipped);
  assert.ok(existsSync(join(output, '.git')));
});
