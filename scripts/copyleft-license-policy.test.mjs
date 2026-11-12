import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluatePackages, isBlockedLicense, packagesFromGradle, packagesFromPnpm } from './copyleft-license-policy.mjs';

const SCRIPT = fileURLToPath(new URL('./copyleft-license-policy.mjs', import.meta.url));

test('카피레프트 판정: 강한 카피레프트는 막고 허용·약한 카피레프트·링크 예외·허용 쪽 이중 라이선스는 통과한다', () => {
  for (const blocked of ['GPL-3.0', 'GPL-3.0-only', 'GPL-2.0-or-later', 'AGPL-3.0-only', 'SSPL-1.0',
    'GNU General Public License v3.0', 'MIT AND GPL-3.0', '(MIT AND AGPL-3.0)', 'EUPL-1.2']) {
    assert.equal(isBlockedLicense(blocked), true, blocked);
  }
  for (const allowed of ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC', 'LGPL-2.1', 'LGPL-3.0-or-later',
    'Apache-2.0 AND LGPL-3.0-or-later', 'EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0', 'GPL-2.0 WITH Classpath-exception-2.0',
    '(MIT OR GPL-3.0)', 'MPL-2.0', 'EPL-1.0', 'GNU Lesser General Public License', '']) {
    assert.equal(isBlockedLicense(allowed), false, allowed);
  }
});

test('🚨 의도적 GPL-3.0 fixture 는 pnpm·Gradle 두 모집단 모두에서 차단으로 붉어진다(H5)', () => {
  const pnpm = packagesFromPnpm({
    MIT: [{ name: 'react', versions: ['19.3.1'], license: 'MIT' }],
    'GPL-3.0': [{ name: 'evil-gpl-fixture', versions: ['1.0.0'], license: 'GPL-3.0' }],
  });
  const frontend = evaluatePackages(pnpm);
  assert.deepEqual(frontend.blocking.map((pkg) => pkg.name), ['evil-gpl-fixture']);

  const gradle = packagesFromGradle({ authority: 'runtime-licenses', components: [
    { module: 'org.springframework:spring-core', version: '7.0.10', licenses: ['Apache License, Version 2.0'] },
    { module: 'org.example:gpl-fixture', version: '1.0', licenses: ['GPL-3.0'] },
    { module: 'jakarta.annotation:jakarta.annotation-api', version: '3.0', licenses: ['EPL-2.0', 'GPL-2.0 with Classpath exception'] },
    { module: 'org.example:no-license-declared', version: '1.0', licenses: [] },
  ] });
  const backend = evaluatePackages(gradle);
  assert.deepEqual(backend.blocking.map((pkg) => pkg.name), ['org.example:gpl-fixture']);
  assert.deepEqual(backend.unknown.map((pkg) => pkg.name), ['org.example:no-license-declared'], '알 수 없음은 경고다');
});

test('CLI: GPL-3.0 fixture 는 종료 1, 허용만 있으면 0, 형식이 틀리면 2(fail-closed)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'copyleft-'));
  const red = join(dir, 'red.json');
  const green = join(dir, 'green.json');
  const malformed = join(dir, 'malformed.json');
  const emptyGradle = join(dir, 'empty-gradle.json');
  writeFileSync(red, JSON.stringify({ 'GPL-3.0': [{ name: 'evil-gpl-fixture', versions: ['1.0.0'], license: 'GPL-3.0' }] }));
  writeFileSync(green, JSON.stringify({ MIT: [{ name: 'react', versions: ['19.3.1'], license: 'MIT' }] }));
  writeFileSync(malformed, JSON.stringify([{ name: 'x' }]));
  writeFileSync(emptyGradle, JSON.stringify({ authority: 'runtime-licenses', components: [] }));
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

  const blocked = run('--pnpm-json', red);
  assert.equal(blocked.status, 1, blocked.stderr);
  assert.match(blocked.stderr, /evil-gpl-fixture@1\.0\.0 \(GPL-3\.0\)/);
  assert.equal(run('--pnpm-json', green).status, 0);
  assert.equal(run('--pnpm-json', malformed).status, 2);
  assert.equal(run('--gradle', emptyGradle).status, 2, '빈 모집단은 통과가 아니다');
  assert.equal(run().status, 2);
});
