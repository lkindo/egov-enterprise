import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CUSTOM_COMPOSITION, PRESET_DECLARATIONS, compositionProfiles, presetIds } from './composition-profiles.mjs';
import { MODULES_DIRECTORY, loadComposerModules } from './composer-modules.mjs';
import { validateComposerModuleSchema } from './composer-modules-schema.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/*
 * 직접 선택 구성의 이름(custom)은 원본 선언의 시작 구성 id 가 될 수 없다(트랙 C 검토). 생성기(composerProfile·Java 연쇄 대조)와 정밀
 * 점검은 profile 이 custom 이면 직접 선택으로 보아 시작 구성 기대치(게이트·Java 연쇄 exact 목록) 대조를 건너뛴다 — 시작 구성을 custom
 * 으로 부르면 그 대조가 조용히 빠지고, compositionProfiles() 의 합집합이 두 이름을 하나로 숨긴다. 스키마·로더·이름 판정이 모두 거부한다.
 * 생성물(presets.json 의 active 표지)은 직접 선택 구성 하나를 그 이름으로 두므로 받아들인다.
 */
test('the direct-selection name is reserved in source preset declarations but stays the generated custom product marker', (t) => {
  const root = mkdtempSync(join(resolve(tmpdir()), 'egov-composition-profiles-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(ROOT, MODULES_DIRECTORY), join(root, MODULES_DIRECTORY), { recursive: true });
  const presetsFile = join(root, PRESET_DECLARATIONS);
  const source = JSON.parse(readFileSync(presetsFile, 'utf8'));
  // 대조군: 원본 선언 그대로면 세 판정이 모두 통과한다.
  assert.deepEqual(presetIds(root), source.presets.map(preset => preset.id));
  assert.ok(validateComposerModuleSchema(root) > 0);
  assert.doesNotThrow(() => loadComposerModules(root));

  // 시작 구성 하나를 custom 으로 부르면 거부한다.
  const renamed = structuredClone(source);
  renamed.presets[0].id = CUSTOM_COMPOSITION;
  writeFileSync(presetsFile, JSON.stringify(renamed));
  assert.throws(() => presetIds(root), /config\/modules\/presets\.json 의 시작 구성 id 로 직접 선택 구성 이름\(custom\)을 쓸 수 없다/);
  assert.throws(() => compositionProfiles(root), /직접 선택 구성 이름\(custom\)을 쓸 수 없다/);
  assert.throws(() => loadComposerModules(root), /reserved preset id: custom \(the direct-selection composition\)/);
  assert.throws(() => validateComposerModuleSchema(root), /presets\.json does not match _schema\.json: \/presets\/0\/id must NOT be valid/);

  // 생성물 표지(active)가 있는 직접 선택 생성물은 그 하나를 custom 으로 둔다(projectComposerModuleFiles 가 쓰는 모양).
  const generated = { ...structuredClone(source), active: CUSTOM_COMPOSITION,
    presets: [{ ...structuredClone(source.presets[0]), id: CUSTOM_COMPOSITION, label: '직접 선택' }] };
  writeFileSync(presetsFile, JSON.stringify(generated));
  assert.deepEqual(presetIds(root), [CUSTOM_COMPOSITION]);
  assert.deepEqual(compositionProfiles(root), [CUSTOM_COMPOSITION]);
  assert.doesNotThrow(() => validateComposerModuleSchema(root));
});
