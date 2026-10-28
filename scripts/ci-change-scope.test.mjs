import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import test from 'node:test';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  applyPushBaseCheck, classifyChangedFiles, githubOutputs, MAIN_REUSABLE_LAYOUTS, PR_REUSABLE_LAYOUT, PROTECTED_COLUMN_CONTENT, pushBaseWasVerified,
  reusableMatrix,
} from './ci-change-scope.mjs';
import { presetIds } from './composition-profiles.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// 모든 시작 구성(presets.json 의 선언 순서). '모든 시작 구성' 기대는 이름을 열거하지 않고 이것을 쓴다(11단계 C8).
const PRESET_IDS = presetIds();

test('documentation and Atlas-only changes run governance without heavy leaves', () => {
  const result = classifyChangedFiles([
    'docs/03-guides/testing-guide.md',
    '.agent/memory/known-gaps.md',
    'frontend/public/governance_harness_atlas.html',
  ]);

  assert.equal(result.docsOnly, true);
  assert.equal(result.atlas, true);
  assert.equal(result.governance, true);
  assert.equal(result.secretScan, true);

  // 스킬 설명 한 줄을 고치면 정본과 regen 이 만든 두 안내 파일이 함께 바뀐다 — 전체 파이프라인을 돌릴 변경이 아니다.
  const skill = classifyChangedFiles([
    '.agent/skills/ci-triage/SKILL.md',
    '.agents/skills/ci-triage/SKILL.md',
    '.claude/skills/ci-triage/SKILL.md',
  ]);
  assert.equal(skill.docsOnly, true, '스킬 안내 파일이 미지 경로로 분류되면 전체 CI 가 돈다');
  assert.deepEqual(skill.unknownFiles ?? [], []);
  // 안내 경로의 다른 파일(훅·설정)은 문서가 아니다.
  assert.equal(classifyChangedFiles(['.agents/hooks.json']).docsOnly, false);
  assert.equal(result.backend, false);
  assert.equal(result.migration, false);
  assert.equal(result.frontend, false);
  assert.equal(result.schema, false);
  assert.equal(result.e2e, false);
  assert.equal(result.mutation, false);
});

// [2026-10-27 DEC-OPS-387] 에이전트 하네스만 바꾼 변경은 미분류 전수가 아니다 — 이관·PIT 는 돌지 않고, 읽는 시험의 축과 운영 계약만 돈다.
test('agent harness guard, skill adapter generator and hook adapters select only their reader axes', () => {
  const guard = classifyChangedFiles(['scripts/agent-guard.mjs', 'scripts/agent-guard.test.mjs', 'scripts/agent-skill-adapters.mjs']);
  assert.deepEqual(guard.unknownFiles, []);
  assert.equal(guard.secretScan, true);
  assert.equal(guard.backend, true);
  assert.equal(guard.migration, false);
  assert.equal(guard.mutation, false);
  assert.equal(guard.mutationMigrationTool, false);
  assert.equal(guard.frontend, false);
  const hooks = classifyChangedFiles(['.claude/settings.json', '.codex/hooks.json', '.agents/hooks.json']);
  assert.deepEqual(hooks.unknownFiles, []);
  assert.equal(hooks.backend, false);
  assert.equal(hooks.migration, false);
  assert.equal(hooks.mutation, false);
  // 훅 어댑터를 읽는 시험은 늘 도는 운영 계약뿐이다 — 루트를 가리키는 프런트 시험은 읽기로 세지 않는다(2026-10-27 독립 검토).
  assert.equal(hooks.frontend, false);
  assert.equal(hooks.e2e, false);
  assert.equal(hooks.secretScan, true);
  // 실행 기록은 verify.mjs·pre-push 가 import 하는 실행 경로라 표에 없다 — 미분류 전수로 남는다.
  assert.deepEqual(classifyChangedFiles(['scripts/verification-record.mjs']).unknownFiles, ['scripts/verification-record.mjs']);
});

test('backend production changes select backend, e2e, and mutation', () => {
  const result = classifyChangedFiles([
    'business-core/src/main/java/nuri/business/service/auth/AuthServiceImpl.java',
  ]);

  assert.equal(result.docsOnly, false);
  assert.equal(result.backend, true);
  assert.equal(result.migration, false);
  assert.equal(result.frontend, false);
  assert.equal(result.e2e, true);
  assert.equal(result.mutation, true);
});

test('Atlas source and generator inputs select Atlas contracts without weakening source scopes', () => {
  const source = classifyChangedFiles(['frontend/atlas/render.mjs']);
  assert.equal(source.atlas, true);
  assert.equal(source.docsOnly, false);
  assert.equal(source.frontend, true);
  assert.equal(source.e2e, true);
  assert.equal(source.sast, true);
  for (const file of ['scripts/build-atlas.mjs', 'scripts/atlas-catalog.mjs', 'scripts/atlas-generation.test.mjs']) {
    const result = classifyChangedFiles([file]);
    assert.equal(result.atlas, true, file);
    assert.deepEqual(result.unknownFiles, []);
    assert.equal(result.docsOnly, false, file);
    assert.equal(result.backend, true, `${file}: source-scanning harnesses must still execute`);
    assert.equal(result.sast, true, file);
    assert.equal(result.migration, false, file);
    assert.equal(result.mutation, false, file);
    assert.equal(result.mutationMigrationTool, false, file);
  }
  assert.equal(classifyChangedFiles(['docs/03-guides/testing-guide.md']).atlas, false);
  const hook = fs.readFileSync(path.join(repoRoot, '.githooks/pre-push'), 'utf8');
  assert.match(hook, /--stdin --field atlas/);
  assert.match(hook, /if \[ "\$SCOPE_ATLAS" = "true" \]; then/);
});

test('backend tests rerun mutation evidence but do not spend browser E2E time', () => {
  const result = classifyChangedFiles([
    'business-core/src/test/java/nuri/business/service/auth/AuthServiceImplTest.java',
  ]);

  assert.equal(result.backend, true);
  assert.equal(result.e2e, false);
  assert.equal(result.mutation, true);
});

test('backend test fixtures rerun mutation evidence', () => {
  for (const file of [
    'business-core/src/test/resources/application-test.yml',
    'foundation/src/testFixtures/java/nuri/foundation/fixture/TestFixtures.java',
    'foundation/src/testFixtures/resources/application-test.yml',
  ]) {
    const result = classifyChangedFiles([file]);
    assert.equal(result.mutation, true);
    assert.equal(result.e2e, false);
  }
});

test('runtime resources retain PIT evidence without selecting unrelated migration mutation', () => {
  for (const module of ['foundation', 'business-core', 'business-app', 'api-server']) {
    const file = `${module}/src/main/resources/application.yml`;
    const result = classifyChangedFiles([file]);
    assert.equal(result.mutation, true, file);
    assert.equal(result.migration, false, file);
    assert.equal(result.mutationMigrationTool, false, file);
    assert.equal(result.e2e, true, file);
  }
});

// ADR-0044 결정 5: api-server 를 변이하는 PIT 범위는 없지만 두 경로는 제품 PIT 결과에 닿는다 — foundation 범위의 시험
// (MessageBundleContractTest)이 실행 중 api-server 생산 Java 를 읽고, PIT 잡의 Gradle(--warning-mode fail)이 api-server 빌드
// 스크립트를 구성한다. 선택은 제품 PIT 묶음 하나라, api-server 만 바꾼 변경도 제품 PIT 를 고른다.
test('api-server sources read by product PIT runs keep selecting product PIT', () => {
  for (const file of [
    'api-server/src/main/java/nuri/api/controller/business/board/BoardApiController.java',
    'api-server/build.gradle',
  ]) {
    const result = classifyChangedFiles([file]);
    assert.equal(result.mutation, true, file);
    assert.equal(result.mutationMigrationTool, false, file);
  }
});

test('shared Gradle inputs retain every PIT scope', () => {
  for (const file of [
    'build.gradle',
    'settings.gradle',
    'gradle.properties',
    'gradle/libs.versions.toml',
    'gradle/wrapper/gradle-wrapper.properties',
    'gradle/wrapper/gradle-wrapper.jar',
  ]) {
    const result = classifyChangedFiles([file]);
    assert.equal(result.mutation, true, file);
    assert.equal(result.backend, true, file);
    assert.equal(result.migration, true, file);
    assert.equal(result.mutationMigrationTool, true, file);
  }
});

test('frontend source changes select frontend and e2e but not backend mutation', () => {
  const result = classifyChangedFiles([
    'frontend/src/app/admin/page.tsx',
  ]);

  assert.equal(result.backend, false);
  assert.equal(result.frontend, true);
  assert.equal(result.e2e, true);
  assert.equal(result.mutation, false);
});

test('frontend unit tests and the offline migration tool skip unrelated browser E2E', () => {
  const frontendTest = classifyChangedFiles(['frontend/src/services/foo.test.ts']);
  assert.equal(frontendTest.frontend, true);
  assert.equal(frontendTest.e2e, false);

  const migrationTool = classifyChangedFiles([
    'migration-tool/src/main/java/nuri/migration/MigrationRunner.java',
  ]);
  assert.equal(migrationTool.backend, false);
  assert.equal(migrationTool.migration, true);
  assert.equal(migrationTool.e2e, false);
  assert.equal(migrationTool.mutation, false);
  assert.equal(migrationTool.mutationMigrationTool, true);
});

test('migration-only changes select independent build and PIT scopes without online leaves', () => {
  const backendOnly = classifyChangedFiles([
    'business-core/src/main/java/nuri/business/service/auth/AuthServiceImpl.java',
  ]);
  assert.equal(backendOnly.mutation, true);
  assert.equal(backendOnly.migration, false);
  assert.equal(backendOnly.mutationMigrationTool, false);

  assert.equal(classifyChangedFiles(['build.gradle']).mutationMigrationTool, true);
  assert.equal(classifyChangedFiles(['settings.gradle']).mutationMigrationTool, true);
  assert.equal(classifyChangedFiles(['migration-tool/build.gradle']).mutationMigrationTool, true);
  assert.equal(classifyChangedFiles(['unheard-of/path.bin']).mutationMigrationTool, true);

  // Both directions matter: always-false drops migration evidence, while the
  // former subset rule unnecessarily starts the entire online pipeline.
  for (const file of [
    'migration-tool/src/main/java/nuri/migration/validate/MappingValidator.java',
    'migration-tool/src/test/java/nuri/migration/adapter/CubridSourceAdapterTest.java',
    'migration-tool/src/test/resources/discovery/fixture.json',
    'migration-tool/src/test/resources/mapping-sample.yml',
    'migration-tool/src/test/resources/mapping-invalid.yml',
    'migration-tool/src/test/resources/db-columns-fixture.json',
    'migration-tool/src/testFixtures/java/nuri/migration/fixture/MappingFixture.java',
    'migration-tool/src/testFixtures/resources/mapping-sample.yml',
    'migration-tool/src/main/resources/application.yml',
    'migration-tool/build.gradle',
  ]) {
    const result = classifyChangedFiles([file]);
    assert.deepEqual(result.unknownFiles, [], file);
    for (const field of ['migration', 'mutationMigrationTool', 'sast', 'governance', 'secretScan']) {
      assert.equal(result[field], true, `${file}: ${field}`);
    }
    for (const field of ['backend', 'frontend', 'schema', 'e2e', 'mutation', 'docsOnly']) {
      assert.equal(result[field], false, `${file}: unrelated ${field}`);
    }
  }
});

test('shared ID contract changes select both modules and both PIT scopes', () => {
  // StandardIdGenerator documents its independent mirror of IdGenerationUtil;
  // Constants owns the online prefix and length consumed by that utility.
  for (const file of [
    'foundation/src/main/java/nuri/foundation/core/util/IdGenerationUtil.java',
    'foundation/src/test/java/nuri/foundation/core/util/IdGenerationUtilTest.java',
    'foundation/src/main/java/nuri/foundation/constants/Constants.java',
    'migration-tool/src/main/java/nuri/migration/keymap/StandardIdGenerator.java',
  ]) {
    assert.ok(fs.existsSync(path.join(repoRoot, file)), `${file}: semantic input must exist`);
    const result = classifyChangedFiles([file]);
    for (const field of ['backend', 'migration', 'mutation', 'mutationMigrationTool']) {
      assert.equal(result[field], true, `${file}: shared ID contract lost ${field}`);
    }
  }
});

test('online encryption sources select the migration suite that holds their compatibility contract', () => {
  // OnlineRrnoConverterContractTest compiles the online converter, its crypto
  // and the entities that declare protected columns (DEC-OPS-308).
  for (const file of [
    'business-core/src/main/java/nuri/business/domain/common/RrnoEncryptionConverter.java',
    'foundation/src/main/java/nuri/foundation/core/util/CryptoUtil.java',
    'foundation/src/main/java/nuri/foundation/core/config/ProjectCryptoConfig.java',
    'foundation/src/main/java/nuri/foundation/security/mfa/MfaSecretCipher.java',
    'business-core/src/main/java/nuri/business/domain/user/entity/User.java',
    'business-core/src/main/java/nuri/business/domain/auth/mfa/MfaCredential.java',
  ]) {
    assert.ok(fs.existsSync(path.join(repoRoot, file)), `${file}: semantic input must exist`);
    const result = classifyChangedFiles([file]);
    for (const field of ['backend', 'migration']) {
      assert.equal(result[field], true, `${file}: protected column contract lost ${field}`);
    }
  }
  // A future converter elsewhere is still counted by the contract.
  assert.equal(classifyChangedFiles(['business-app/src/main/java/nuri/business/domain/x/NewSecretConverter.java']).migration, true);
  assert.equal(classifyChangedFiles(['api-server/src/main/java/nuri/api/x/NewSecretConverter.java']).migration, true);
  assert.equal(classifyChangedFiles(['business-app/src/main/java/nuri/business/domain/x/Plain.java']).migration, false);
});

test('an online source that newly declares a protected column selects the migration suite by its content', () => {
  // A new entity can attach the existing converter without touching any path the
  // contract names; a service can call the online ciphers directly (DEC-OPS-308).
  const entity = 'business-app/src/main/java/nuri/business/domain/x/Resident.java';
  const service = 'business-core/src/main/java/nuri/business/service/x/SecretService.java';
  const sources = {
    [entity]: '@jakarta.persistence.Convert(converter = RrnoEncryptionConverter.class)\nprivate String rrno;',
    [service]: 'import static nuri.foundation.core.util.CryptoUtil.encrypt;\nString v = CryptoUtil.encrypt(x);',
  };
  const readSource = file => sources[file] ?? null;
  for (const file of [entity, service]) {
    assert.equal(classifyChangedFiles([file], { readSource }).migration, true, `${file}: content trigger lost`);
  }
  assert.equal(classifyChangedFiles(['api-server/src/main/java/nuri/api/x/Cipher.java'],
    { readSource: () => 'private final MfaSecretCipher cipher;' }).migration, true);
  assert.equal(classifyChangedFiles([entity], { readSource: () => 'class Resident { String name; }' }).migration, false);
  assert.equal(classifyChangedFiles([entity], { readSource: () => '@Converter(autoApply = false)' }).migration, false,
    'a converter class declaration is selected by its *Converter.java path, not by content');
  assert.equal(classifyChangedFiles([entity], { readSource: () => null }).migration, false, 'deleted file');
  // The default reader looks at the working tree.
  assert.equal(classifyChangedFiles(['business-core/src/main/java/nuri/business/service/auth/mfa/MfaSettings.java']).migration,
    true);
});

test('the content trigger counts the same forms as the online encryption contract', () => {
  // OnlineRrnoConverterContractTest counts wildcard static imports of CryptoUtil and
  // autoApply converters wherever they are declared; a narrower trigger lets a PR that
  // adds one merge without running the contract.
  const service = 'business-app/src/main/java/nuri/business/service/x/SecretService.java';
  const entity = 'business-app/src/main/java/nuri/business/domain/x/Resident.java';
  assert.equal(classifyChangedFiles([service],
    { readSource: () => 'import static nuri.foundation.core.util.CryptoUtil.*;\nString v = encrypt(x);' }).migration, true,
  'wildcard static import of CryptoUtil');
  assert.equal(classifyChangedFiles([entity],
    { readSource: () => '@jakarta.persistence.Converter(autoApply = true)\nclass ResidentCodec {}' }).migration, true,
  'autoApply converter outside a *Converter.java path');
  assert.equal(classifyChangedFiles([service],
    { readSource: () => 'import static nuri.foundation.core.util.CryptoUtil.decrypt;\nString v = decrypt(x);' }).migration, false,
  'decryption alone does not change the protected columns');
});

test('every online source holding protected-column content is also pinned by path', () => {
  // Content is read after the change only. A removed call or a deleted file leaves
  // nothing to read, so the contract's sources must be selected by path as well —
  // otherwise removing one merges without running the contract that compares them.
  const roots = ['foundation', 'business-core', 'business-app', 'api-server'].map(module => `${module}/src/main/java`);
  const walk = (dir, out = []) => {
    for (const entry of fs.readdirSync(path.join(repoRoot, dir), { withFileTypes: true })) {
      const relative = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(relative, out);
      else if (entry.name.endsWith('.java')) out.push(relative);
    }
    return out;
  };
  const holders = roots.flatMap(root => walk(root))
    .filter(file => PROTECTED_COLUMN_CONTENT.test(fs.readFileSync(path.join(repoRoot, file), 'utf8')));
  assert.ok(holders.length >= 5, `protected-column census is vacuous: ${holders.join(', ')}`);
  const contentOnly = holders.filter(file => !classifyChangedFiles([file], { readSource: () => null }).migration);
  assert.deepEqual(contentOnly, [],
    'content-only protected source — pin its path in SHARED_PROTECTED_COLUMN_CONTRACT so removing it still runs the contract');
});

test('target standard catalog and unknown toolchain inputs retain full fallback', () => {
  // MappingValidator's default catalog is the tracked root db_columns.json.
  // Do not classify it as an isolated migration fixture: it represents the
  // online target schema. External mapping paths remain unknown and full too.
  for (const file of ['db_columns.json', 'gradlew', 'gradlew.bat', '.java-version', 'mapping.yml']) {
    const result = classifyChangedFiles([file]);
    assert.deepEqual(result.unknownFiles, [file]);
    for (const field of ['backend', 'migration', 'frontend', 'schema', 'e2e', 'mutation', 'mutationMigrationTool']) {
      assert.equal(result[field], true, `${file}: ${field}`);
    }
  }
});

test('mixed module changes select the union without inventing frontend or schema work', () => {
  const result = classifyChangedFiles([
    'business-core/src/test/java/nuri/business/service/auth/AuthServiceImplTest.java',
    'migration-tool/src/test/resources/mapping-sample.yml',
    'docs/README.md',
  ]);
  for (const field of ['backend', 'migration', 'mutation', 'mutationMigrationTool']) {
    assert.equal(result[field], true, field);
  }
  for (const field of ['frontend', 'schema', 'e2e', 'docsOnly']) assert.equal(result[field], false, field);
});

test('frontend runtime configuration and lockfile changes retain browser E2E evidence', () => {
  for (const file of ['frontend/pnpm-lock.yaml', 'frontend/next.config.ts']) {
    assert.equal(classifyChangedFiles([file]).e2e, true);
  }
});

// 이 두 축은 HEAD 에서 무조건 실행되던 증거였다. 조건부 실행으로 바꾼 뒤에도
// 축이 유지된다는 것을 고정한다 — allowlist 누락으로 조용히 스킵되면 red 가 된다.
test('build toolchain and version catalog changes keep browser E2E and schema evidence', () => {
  for (const file of [
    'gradle/libs.versions.toml',
    'gradle/wrapper/gradle-wrapper.properties',
    'gradle.properties',
    'build.gradle',
    'settings.gradle',
    'api-server/build.gradle',
  ]) {
    const result = classifyChangedFiles([file]);
    assert.equal(result.e2e, true, `${file} must retain browser E2E evidence`);
    assert.equal(result.backend, true, `${file} must retain backend evidence`);
  }

  assert.equal(classifyChangedFiles(['gradle/libs.versions.toml']).schema, true);
  assert.equal(classifyChangedFiles(['business-core/build.gradle']).schema, true);
});

test('frontend root configuration outside the allowlist still selects browser E2E', () => {
  for (const file of [
    'frontend/tailwind.config.ts',
    'frontend/postcss.config.mjs',
    'frontend/tsconfig.json',
    'frontend/eslint.config.mjs',
    'frontend/vitest.config.mts',
  ]) {
    assert.equal(classifyChangedFiles([file]).e2e, true, `${file} must select browser E2E`);
  }
});

// 하네스가 읽는 대상을 고치면 하네스가 돌아야 한다. 이 결속이 없으면
// '감사 대상만 고쳐서 감사자를 피하는' 경로가 열린다.
test('frontend files audited by the governance harness still select the harness scope', () => {
  for (const file of [
    'frontend/Dockerfile',
    'frontend/package.json',
    'frontend/scripts/check-bundle-budget.mjs',
    'frontend/vitest.config.mts',
  ]) {
    assert.equal(classifyChangedFiles([file]).backend, true, `${file} must select the governance harness`);
  }

  // 일반 프런트 소스는 종전대로 백엔드 게이트를 끌어오지 않는다(과대선택 방지).
  assert.equal(classifyChangedFiles(['frontend/src/app/admin/page.tsx']).backend, false);
});

test('runtime persistence configuration selects the real PostgreSQL schema gate', () => {
  for (const file of [
    'api-server/src/main/resources/application.yml',
    'api-server/src/main/resources/application-prod.yml',
  ]) {
    assert.equal(classifyChangedFiles([file]).schema, true, `${file} must select schema validation`);
  }
});

test('cross-stack schema and contract changes select all affected runtime gates', () => {
  const migration = classifyChangedFiles([
    'api-server/src/main/resources/db/migration/V2_50__example.sql',
  ]);
  const openApi = classifyChangedFiles(['api-docs.json']);

  for (const result of [migration, openApi]) {
    assert.equal(result.backend, true);
    assert.equal(result.migration, false);
    assert.equal(result.e2e, true);
  }
  assert.equal(migration.mutation, true);
  assert.equal(migration.schema, true);
  assert.equal(openApi.frontend, true);
  assert.equal(openApi.schema, false);
});

test('unknown and empty change sets fail closed to the full pipeline', () => {
  for (const files of [
    ['unexpected/new-tool.xyz'],
    ['docs/rebuild.sh'],
    ['.agent/memory/run.js'],
    ['.agent/memory/unregistered-note.md'],
    [],
  ]) {
    const result = classifyChangedFiles(files);
    assert.equal(result.docsOnly, false);
    assert.equal(result.backend, true);
    assert.equal(result.migration, true);
    assert.equal(result.frontend, true);
    assert.equal(result.schema, true);
    assert.equal(result.e2e, true);
    assert.equal(result.mutation, true);
    assert.equal(result.mutationMigrationTool, true);
    assert.equal(result.reusable, true);
    assert.deepEqual(result.reusableProfiles, PRESET_IDS);
  }
});

test('reusable-base matrix only retains presets in which a changed feature file survives', () => {
  const demoOnly = classifyChangedFiles([
    'business-app/src/main/java/nuri/business/service/memoreport/MemoReportService.java',
  ]);
  assert.deepEqual(demoOnly.reusableProfiles, ['demo']);
  assert.equal(demoOnly.reusableCustom, false);
  assert.deepEqual(demoOnly.reusableMatrix.include, [
    { profile: 'demo', layout: 'multi-module' },
    { profile: 'demo', layout: 'single-module' },
  ]);

  const collaborationAndDemo = classifyChangedFiles([
    'business-app/src/test/java/nuri/business/service/board/BoardServiceTest.java',
  ]);
  assert.deepEqual(collaborationAndDemo.reusableProfiles, ['collaboration', 'demo']);

  const frontendDemoOnly = classifyChangedFiles([
    'frontend/src/app/admin/system/hpcm/page.tsx',
  ]);
  assert.deepEqual(frontendDemoOnly.reusableProfiles, ['demo']);

  // Phase 0c: 통계 셸은 core 라 모든 프로필에 남고, 게시물 통계 화면은 게시판과 함께 collaboration 부터 남는다.
  const statsShell = classifyChangedFiles([
    'frontend/src/app/admin/stats/page.tsx',
  ]);
  assert.deepEqual(statsShell.reusableProfiles, PRESET_IDS);
  const boardStats = classifyChangedFiles([
    'frontend/src/app/admin/stats/board/page.tsx',
  ]);
  assert.deepEqual(boardStats.reusableProfiles, ['collaboration', 'demo']);

  const sharedInput = classifyChangedFiles([
    'foundation/src/main/java/nuri/foundation/core/util/IdGenerationUtil.java',
  ]);
  assert.deepEqual(sharedInput.reusableProfiles, PRESET_IDS);
  assert.equal(sharedInput.reusableCustom, true);
});

test('mixed reusable-base inputs take the conservative union and docs do not expand it', () => {
  const packAndDocs = classifyChangedFiles([
    'business-app/src/main/java/nuri/business/service/survey/SurveyService.java',
    'docs/03-guides/testing-guide.md',
  ]);
  assert.deepEqual(packAndDocs.reusableProfiles, ['demo', 'survey']);

  const packAndCommon = classifyChangedFiles([
    'business-app/src/main/java/nuri/business/service/survey/SurveyService.java',
    'api-server/src/main/java/nuri/config/AsyncConfig.java',
  ]);
  assert.deepEqual(packAndCommon.reusableProfiles, PRESET_IDS);
});

// ADR-0027: PR 은 시작 구성마다 한 레이아웃, 그 밖의 실행은 두 레이아웃이다. 사용자 구성 2잡은 ci.yml 이 두 레이아웃을 그대로 둔다.
test('pull requests verify one layout per preset while every other event keeps both layouts', () => {
  const common = ['foundation/src/main/java/nuri/foundation/core/util/IdGenerationUtil.java'];
  const pullRequest = classifyChangedFiles(common, { event: 'pull_request' });
  // 설문·결재 시작 구성(13b)은 ci.pr 이 null 이라 PR 에서 빠지고 main 에서 두 레이아웃이다(DEC-OPS-296, 아래 시험).
  assert.deepEqual(pullRequest.reusableMatrix.include, [
    { profile: 'core', layout: 'single-module' },
    { profile: 'collaboration', layout: 'multi-module' },
    { profile: 'demo', layout: 'single-module' },
  ]);
  assert.equal(pullRequest.reusableCustom, true, 'the custom composition jobs stay on pull requests');

  assert.equal(classifyChangedFiles([], { event: 'pull_request' }).reusableMatrix.include.length, 3,
    'a full pull request run still covers every preset verified on pull requests once');
  for (const event of ['push', 'workflow_dispatch', 'pull_request_target', 'PULL_REQUEST', '', undefined]) {
    assert.equal(classifyChangedFiles([], { event }).reusableMatrix.include.length, 10, `event ${String(event)} keeps both layouts`);
  }
  assert.equal(classifyChangedFiles(common).reusableMatrix.include.length, 10, 'a missing event keeps both layouts');

  const docs = classifyChangedFiles(['docs/03-guides/testing-guide.md'], { event: 'pull_request' });
  assert.equal(docs.reusable, false);
  assert.deepEqual(docs.reusableProfiles, []);
  assert.equal(docs.reusableCustom, false);

  const demoOnly = classifyChangedFiles([
    'business-app/src/main/java/nuri/business/service/memoreport/MemoReportService.java',
  ], { event: 'pull_request' });
  assert.deepEqual(demoOnly.reusableMatrix.include, [{ profile: 'demo', layout: 'single-module' }]);
});

test('a preset outside the PR layout table falls back to both layouts and the table holds no stale entry', () => {
  const { core: _core, ...withoutCore } = PR_REUSABLE_LAYOUT;
  assert.deepEqual(reusableMatrix(['core', 'collaboration'], { event: 'pull_request', prLayouts: withoutCore }).include, [
    { profile: 'core', layout: 'multi-module' },
    { profile: 'core', layout: 'single-module' },
    { profile: 'collaboration', layout: 'multi-module' },
  ]);
  assert.throws(() => reusableMatrix(['core'], { event: 'pull_request', prLayouts: { core: 'single' } }),
    /unknown PR reusable layout for core: single/);

  // 표는 presets.json 의 ci.pr 선언이다(11단계 C5). 이 파일에 따로 적은 표가 남지 않는다.
  const presets = JSON.parse(fs.readFileSync(path.join(repoRoot, 'config', 'modules', 'presets.json'), 'utf8')).presets;
  assert.deepEqual(PR_REUSABLE_LAYOUT, Object.fromEntries(presets.filter(preset => preset.ci).map(preset => [preset.id, preset.ci.pr])));
  // ADR-0027 의 PR 레이아웃: 제거가 가장 많은 core 와 Java 제거가 없는 demo 는 단일 모듈, collaboration 은 멀티 모듈이다.
  // 13b 의 인증 시작 구성은 PR 에서 뺀다(null, DEC-OPS-296).
  assert.deepEqual(PR_REUSABLE_LAYOUT, { core: 'single-module', collaboration: 'multi-module', demo: 'single-module', survey: null, approval: null });
  for (const [preset, layout] of Object.entries(PR_REUSABLE_LAYOUT)) {
    assert.ok(presets.some(entry => entry.id === preset), `PR layout table names a preset presets.json no longer has: ${preset}`);
    assert.ok(['multi-module', 'single-module', null].includes(layout), `${preset}: ${layout}`);
  }
});

/** 분류기와 config/modules 사본을 임시 저장소에 둔다. `edit(files)` 가 파일 이름 → 값을 고친다(null 이면 지운다). */
function modulesFixture(t, edit = () => {}, { expectFailure = false } = {}) {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'egov-ci-modules-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(root, 'config', 'modules'), { recursive: true });
  for (const script of ['ci-change-scope.mjs', 'composition-profiles.mjs']) {
    fs.copyFileSync(path.join(repoRoot, 'scripts', script), path.join(root, 'scripts', script));
  }
  const directory = path.join(repoRoot, 'config', 'modules');
  const files = Object.fromEntries(fs.readdirSync(directory).filter(name => name.endsWith('.json'))
    .map(name => [name, JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'))]));
  edit(files);
  for (const [name, value] of Object.entries(files)) {
    if (value !== null) fs.writeFileSync(path.join(root, 'config', 'modules', name), JSON.stringify(value));
  }
  return (...args) => {
    const result = spawnSync(process.execPath, ['scripts/ci-change-scope.mjs', ...args], { cwd: root, encoding: 'utf8' });
    if (expectFailure) return result;
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
}

test('a preset added to presets.json without a PR layout runs both layouts on pull requests', (t) => {
  const classify = modulesFixture(t, files => {
    const { ci: _ci, ...core } = files['presets.json'].presets.find(preset => preset.id === 'core');
    files['presets.json'].presets.push({ ...core, id: 'probe' });
  });
  const include = classify('--event', 'pull_request', '--file', 'foundation/src/main/java/nuri/foundation/core/util/IdGenerationUtil.java')
    .reusableMatrix.include;
  assert.deepEqual(include.filter(item => item.profile === 'probe'), [
    { profile: 'probe', layout: 'multi-module' },
    { profile: 'probe', layout: 'single-module' },
  ]);
  assert.deepEqual(include.filter(item => item.profile === 'core'), [{ profile: 'core', layout: 'single-module' }]);
});

test('a preset whose PR layout declaration is removed falls back to both layouts on pull requests', (t) => {
  const classify = modulesFixture(t, files => {
    delete files['presets.json'].presets.find(preset => preset.id === 'demo').ci;
  });
  const include = classify('--event', 'pull_request', '--file', 'foundation/src/main/java/nuri/foundation/core/util/IdGenerationUtil.java')
    .reusableMatrix.include;
  assert.deepEqual(include, [
    { profile: 'core', layout: 'single-module' },
    { profile: 'collaboration', layout: 'multi-module' },
    { profile: 'demo', layout: 'multi-module' },
    { profile: 'demo', layout: 'single-module' },
  ]);
});

// DEC-OPS-296(U15): 13b 의 인증 시작 구성은 PR 에서 빼고 main·수동 실행에서 두 레이아웃으로 돈다(T2 는 카탈로그에서 따로 고른다).
// PR 에 뜨면 PR 러너가 늘고, main 에서 빠지면 그 구성을 어떤 required 검증도 생성하지 않는다 — 둘 다 붉다.
test('presets kept out of pull requests run on main and manual runs in both layouts', () => {
  const presets = JSON.parse(fs.readFileSync(path.join(repoRoot, 'config', 'modules', 'presets.json'), 'utf8')).presets;
  const kept = presets.filter(preset => preset.ci?.pr === null).map(preset => preset.id);
  assert.deepEqual(kept, ['survey', 'approval'], 'the certified presets of 13b stay out of pull requests');
  for (const id of kept) {
    assert.deepEqual(presets.find(preset => preset.id === id).ci.main, ['multi-module', 'single-module'], `${id}: main runs both layouts`);
  }
  assert.deepEqual(Object.keys(MAIN_REUSABLE_LAYOUTS), kept);
  const layoutsOf = (include, id) => include.filter(item => item.profile === id).map(item => item.layout);
  const pullRequest = classifyChangedFiles([], { event: 'pull_request' }).reusableMatrix.include;
  for (const id of kept) assert.deepEqual(layoutsOf(pullRequest, id), [], `${id} must not be verified on a pull request`);
  for (const event of ['push', 'workflow_dispatch', '']) {
    const include = classifyChangedFiles([], { event }).reusableMatrix.include;
    for (const id of kept) {
      assert.deepEqual(layoutsOf(include, id), ['multi-module', 'single-module'], `${id} must be verified on ${event || 'an unknown event'} in both layouts`);
    }
  }
  // 설문 소스만 바꾼 PR 은 같은 코드를 담은 demo 한 레이아웃으로 재사용 검증을 고른다. main 은 설문 시작 구성까지 두 레이아웃으로 돈다.
  const surveyChange = 'business-app/src/main/java/nuri/business/service/survey/SurveyService.java';
  const surveyPullRequest = classifyChangedFiles([surveyChange], { event: 'pull_request' });
  assert.deepEqual(surveyPullRequest.reusableProfiles, ['demo', 'survey']);
  assert.equal(surveyPullRequest.reusable, true);
  assert.deepEqual(surveyPullRequest.reusableMatrix.include, [{ profile: 'demo', layout: 'single-module' }]);
  assert.deepEqual(classifyChangedFiles([surveyChange], { event: 'push' }).reusableMatrix.include, [
    { profile: 'demo', layout: 'multi-module' },
    { profile: 'demo', layout: 'single-module' },
    { profile: 'survey', layout: 'multi-module' },
    { profile: 'survey', layout: 'single-module' },
  ]);
});

test('a pull request that selects only presets kept out of pull requests selects no reusable work, and the main layouts are checked', (t) => {
  // 설문 시작 구성만 고르게 하면(다른 시작 구성을 걷은 합성 선언) PR 은 생성할 항목이 없다 — 빈 matrix 를 넘기지 않고 재사용 검증을
  // 고르지 않는다. push 는 그 구성을 두 레이아웃으로 돈다.
  const surveyChange = 'business-app/src/main/java/nuri/business/service/survey/SurveyService.java';
  const classify = modulesFixture(t, files => {
    files['presets.json'].presets = files['presets.json'].presets.filter(preset => !preset.domains.includes('survey') || preset.ci?.pr === null);
  });
  const pullRequest = classify('--event', 'pull_request', '--file', surveyChange);
  assert.deepEqual(pullRequest.reusableProfiles, ['survey']);
  assert.equal(pullRequest.reusable, false, 'an empty matrix must not be handed to the reusable job');
  assert.deepEqual(pullRequest.reusableMatrix.include, []);
  const push = classify('--event', 'push', '--file', surveyChange);
  assert.equal(push.reusable, true);
  assert.deepEqual(push.reusableMatrix.include, [
    { profile: 'survey', layout: 'multi-module' },
    { profile: 'survey', layout: 'single-module' },
  ]);
  // PR 에서 빼면서 main 레이아웃을 적지 않거나 하나로 줄이면 분류가 멈춘다 — PR 제외가 CI 제외가 되지 않는다.
  for (const [edit, expected] of [
    [preset => { preset.ci = { pr: null }; }, /main reusable layouts for survey must be every layout: null/],
    [preset => { preset.ci = { pr: null, main: ['single-module'] }; }, /main reusable layouts for survey must be every layout: \["single-module"\]/],
  ]) {
    const failed = modulesFixture(t, files => edit(files['presets.json'].presets.find(preset => preset.id === 'survey')),
      { expectFailure: true })('--event', 'pull_request', '--file', surveyChange);
    assert.notEqual(failed.status, 0, 'a preset kept out of pull requests without both main layouts must stop the classification');
    assert.match(failed.stderr, expected);
  }
  assert.throws(() => reusableMatrix(['core'], { event: 'push', mainLayouts: { core: ['multi-module', 'multi-module'] } }),
    /main reusable layouts for core must be every layout/);
});

// 11단계 C5: 파일 → 소유 기능 → 그 파일이 남는 시작 구성. 소유는 생성기 투영과 같은 규칙(기능 파일의 화면 경로·지원 파일·업무 패키지)이다.
test('a feature-owned file selects only the presets in which it survives', () => {
  const expectProfiles = (file, expected) => assert.deepEqual(classifyChangedFiles([file]).reusableProfiles, expected, `selection of ${file}`);
  // 화면 경로: 메일 기능 소유다(종전 pack 제거 경로에는 없어 core 까지 골랐다).
  expectProfiles('frontend/src/app/admin/collaboration/mail-history/MailHistoryHubClient.tsx', ['collaboration', 'demo']);
  // 기능 파일의 지원 파일: 그 기능이 있어야 남는다.
  expectProfiles('foundation/src/main/java/nuri/foundation/core/user/UserDisplayNameLookup.java', ['demo']);
  expectProfiles('api-server/src/main/java/nuri/api/integration/sms/NaverSensSmsProperties.java', ['collaboration', 'demo']);
  // 두 기능이 함께 덮는 경로는 둘 다 있어야 남는다(게시판 디렉터리 안의 커뮤니티 리다이렉트 화면).
  expectProfiles('frontend/src/app/admin/community/boards/page.tsx', ['demo']);
  // 기능이 정해지지 않는 파일은 전수다.
  expectProfiles('api-server/src/main/java/nuri/config/AsyncConfig.java', PRESET_IDS);
  expectProfiles('frontend/src/app/layout.tsx', PRESET_IDS);
});

test('feature ownership and preset membership are read from config/modules, not from a table in the classifier', (t) => {
  // 설문을 협업 시작 구성에 넣으면 설문 소스가 그 구성도 고른다. 설문 화면 경로를 걷으면 그 화면은 소유 미상이라 전수다.
  // 행사만 넣으면 행사·포상이 함께 소유한 운영 오류 화면(owns.frontendAny)도 그 구성에 남는다 — 하나라도 있으면 남는다.
  const classify = modulesFixture(t, files => {
    files['presets.json'].presets.find(preset => preset.id === 'collaboration').domains.push('survey', 'event');
    files['survey.json'].owns.frontend = files['survey.json'].owns.frontend.filter(owned => owned !== 'src/app/survey');
  });
  const expectProfiles = (file, expected) => assert.deepEqual(classify('--file', file).reusableProfiles, expected, `selection of ${file}`);
  expectProfiles('business-app/src/main/java/nuri/business/service/survey/SurveyService.java', ['collaboration', 'demo', 'survey']);
  expectProfiles('frontend/src/app/survey/page.tsx', PRESET_IDS);
  expectProfiles('frontend/src/app/admin/operation/error.tsx', ['collaboration', 'demo']);
  expectProfiles('frontend/src/app/admin/operation/rewards/page.tsx', ['demo']);
});

test('malformed feature declarations fail closed to every declared preset and an unreadable preset declaration stops the classification', (t) => {
  // 기능 파일의 모양이 다르면 소유를 읽지 못해도 시작 구성 id 는 presets.json 에서 읽어 모두 고른다(11단계 C8 — 종전에는 이 파일에
  // 열거한 이름으로 닫았다).
  for (const edit of [
    files => { files['board.json'].id = 'boards'; },
    files => { files['board.json'].owns.frontend = 'src/app/admin/community/boards'; },
    files => { files['presets.json'].presets[0].domains.push('unknownfeature'); },
  ]) {
    const report = modulesFixture(t, edit)('--event', 'pull_request',
      '--file', 'business-app/src/main/java/nuri/business/service/survey/SurveyService.java');
    assert.deepEqual(report.reusableProfiles, PRESET_IDS);
    assert.equal(report.reusableMatrix.include.length, PRESET_IDS.length * 2);
  }
  // 시작 구성 선언 자체를 읽지 못하면 검증할 구성을 모르므로 분류를 멈춘다 — 재사용 검증을 건너뛰지 않는다.
  for (const edit of [files => { files['presets.json'] = null; }, files => { files['presets.json'] = { schemaVersion: 2, presets: [] }; }]) {
    const result = modulesFixture(t, edit, { expectFailure: true })('--file', 'business-app/src/main/java/nuri/business/service/survey/SurveyService.java');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /시작 구성 선언을 읽지 못했다|시작 구성 id 가 비었거나/);
  }
});

test('explicit full regression includes every heavy gate even for documentation-only inputs', () => {
  const files = ['README.md'];
  assert.equal(classifyChangedFiles(files).docsOnly, true, 'PR classification remains selective');
  const result = classifyChangedFiles(files, { forceFull: true });
  assert.equal(result.docsOnly, false);
  assert.deepEqual(result.files, files);
  assert.deepEqual(result.unknownFiles, [], 'full regression does not invent unknown paths');
  for (const field of ['backend', 'migration', 'frontend', 'schema', 'e2e', 'mutation', 'mutationMigrationTool', 'sast']) {
    assert.equal(result[field], true, field);
  }
  const cli = spawnSync(process.execPath,
    ['scripts/ci-change-scope.mjs', '--file', 'README.md', '--full'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
  assert.equal(cli.status, 0, cli.stderr);
  assert.deepEqual(JSON.parse(cli.stdout).outputs, githubOutputs(result));
});

test('workflow and gate implementation changes cannot use the docs fast path', () => {
  const result = classifyChangedFiles([
    '.github/workflows/ci.yml',
    'scripts/ci-change-scope.mjs',
  ]);

  assert.deepEqual(result.unknownFiles, [
    '.github/workflows/ci.yml',
    'scripts/ci-change-scope.mjs',
  ]);
  assert.equal(result.backend, true);
  assert.equal(result.frontend, true);
  assert.equal(result.e2e, true);
  assert.equal(result.mutation, true);
});

test('project rules and constitutions are policy code and fail closed to the full pipeline', () => {
  for (const file of [
    'AGENTS.md',
    'docs/03-guides/orchestration-protocol.md',
    '.agent/knowledge/backend-api-constitution/artifacts/constitution.md',
  ]) {
    const result = classifyChangedFiles([file]);
    assert.equal(result.docsOnly, false, file);
    assert.deepEqual(result.unknownFiles, [file]);
    assert.equal(result.backend, true);
    assert.equal(result.frontend, true);
    assert.equal(result.e2e, true);
    assert.equal(result.mutation, true);
  }
});

test('the API image recipe reruns the browser path that consumes it', () => {
  const result = classifyChangedFiles(['api-server/Dockerfile']);
  assert.equal(result.backend, true);
  assert.equal(result.e2e, true);
});

test('GitHub outputs are explicit strings for job conditions', () => {
  const outputs = githubOutputs(classifyChangedFiles(['README.md']));
  assert.deepEqual(outputs, {
    docs_only: 'true',
    atlas: 'false',
    governance: 'true',
    secret_scan: 'true',
    sast: 'false',
    backend: 'false',
    migration: 'false',
    frontend: 'false',
    schema: 'false',
    e2e: 'false',
    mutation: 'false',
    mutation_migration_tool: 'false',
    reusable: 'false',
    reusable_custom: 'false',
    reusable_matrix: JSON.stringify({
      include: [
        { profile: 'core', layout: 'multi-module' },
        { profile: 'core', layout: 'single-module' },
        { profile: 'collaboration', layout: 'multi-module' },
        { profile: 'collaboration', layout: 'single-module' },
        { profile: 'demo', layout: 'multi-module' },
        { profile: 'demo', layout: 'single-module' },
        { profile: 'survey', layout: 'multi-module' },
        { profile: 'survey', layout: 'single-module' },
        { profile: 'approval', layout: 'multi-module' },
        { profile: 'approval', layout: 'single-module' },
      ],
    }),
    unknown_count: '0',
  });
});

test('a standalone export without the reusable generator has no presets, while a generator tree without preset declarations stops', (t) => {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'egov-ci-scope-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  for (const script of ['ci-change-scope.mjs', 'composition-profiles.mjs']) {
    fs.copyFileSync(path.join(repoRoot, 'scripts', script), path.join(root, 'scripts', script));
  }
  const classify = () => spawnSync(process.execPath, [
    'scripts/ci-change-scope.mjs',
    '--file',
    'business-app/src/main/java/nuri/business/domain/demo/Sample.java',
  ], { cwd: root, encoding: 'utf8' });

  // 독립 이관 제품처럼 재사용 생성기도 시작 구성 선언도 없으면 재사용 생성 대상이 없다(11단계 C8 — 종전에는 이 파일에 열거한
  // 이름으로 닫았지만, 그 산출물은 그 구성을 만들 수 없다). 다른 검증은 종전대로 전수다.
  const standalone = classify();
  assert.equal(standalone.status, 0, standalone.stderr);
  const report = JSON.parse(standalone.stdout);
  assert.deepEqual(report.reusableProfiles, []);
  assert.equal(report.reusable, false);
  assert.equal(report.backend, true);
  // 재사용 생성기가 있는 트리(원본 저장소)에서 시작 구성 선언이 사라지면 빈 목록으로 두지 않고 분류를 멈춘다.
  fs.writeFileSync(path.join(root, 'scripts', 'generate-reusable-base-source.mjs'), '// 생성기 자리\n');
  const withGenerator = classify();
  assert.notEqual(withGenerator.status, 0);
  assert.match(withGenerator.stderr, /시작 구성 선언을 읽지 못했다: config\/modules\/presets\.json/);
});

test('git discovery includes deletions so mixed doc and source changes cannot fast-pass', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'scripts', 'ci-change-scope.mjs'), 'utf8');
  assert.match(source, /--diff-filter=ACMRD/);
  assert.match(source, /--no-renames/);

  const crossScopeRename = classifyChangedFiles([
    'api-server/src/main/java/nuri/api/Ghost.java',
    'docs/Ghost.md',
  ]);
  assert.equal(crossScopeRename.docsOnly, false);
  assert.equal(crossScopeRename.backend, true);
});

test('stdin boolean field mode is safe for local hook scope selection', () => {
  const frontend = spawnSync(process.execPath,
    ['scripts/ci-change-scope.mjs', '--stdin', '--field', 'frontend'], {
      cwd: repoRoot,
      input: 'frontend/src/app/page.tsx\n',
      encoding: 'utf8',
    });
  assert.equal(frontend.status, 0, frontend.stderr);
  assert.equal(frontend.stdout, 'true\n');

  const backend = spawnSync(process.execPath,
    ['scripts/ci-change-scope.mjs', '--stdin', '--field', 'backend'], {
      cwd: repoRoot,
      input: 'frontend/src/app/page.tsx\n',
      encoding: 'utf8',
    });
  assert.equal(backend.status, 0, backend.stderr);
  assert.equal(backend.stdout, 'false\n');

  const migration = spawnSync(process.execPath,
    ['scripts/ci-change-scope.mjs', '--stdin', '--field', 'migration'], {
      cwd: repoRoot,
      input: 'migration-tool/src/test/resources/mapping-sample.yml\n',
      encoding: 'utf8',
    });
  assert.equal(migration.status, 0, migration.stderr);
  assert.equal(migration.stdout, 'true\n');
});

test('pre-push consumes the shared fail-closed classifier before its documentation fast path', () => {
  const hook = fs.readFileSync(path.join(repoRoot, '.githooks', 'pre-push'), 'utf8');
  assert.match(hook, /--no-renames --name-only --diff-filter=ACMRD/);
  assert.match(hook, /--stdin --field docsOnly/);
  assert.match(hook, /--stdin --field backend/);
  assert.match(hook, /--stdin --field frontend/);
  assert.ok(
    hook.indexOf('--stdin --field docsOnly') < hook.indexOf('if [ "$SCOPE_DOCS_ONLY" = "true" ]'),
    'docsOnly must be classified before the fast-pass exit',
  );
  assert.doesNotMatch(hook, /CODE_CHANGES=/);
  assert.match(hook, /if \[ "\$SCOPE_BACKEND" = "true" \]; then/);
  assert.match(hook, /if \[ "\$SCOPE_FRONTEND" = "true" \] && \[ -f frontend\/package\.json \]; then/);
});

test('pre-push clears Git hook-local repository state before nested repository checks', () => {
  const hook = fs.readFileSync(path.join(repoRoot, '.githooks', 'pre-push'), 'utf8');
  const localEnvDiscovery = hook.indexOf('git rev-parse --local-env-vars');
  const localEnvClear = hook.indexOf('unset "$GIT_LOCAL_ENV_VAR"');
  const operationalGate = hook.indexOf('npm run test:operational-contracts');

  assert.ok(localEnvDiscovery >= 0, 'pre-push must enumerate Git hook-local environment variables');
  assert.ok(localEnvClear > localEnvDiscovery, 'pre-push must clear each Git hook-local variable');
  assert.ok(
    localEnvClear < operationalGate,
    'Git hook-local state must be cleared before nested npm/pnpm/git repository checks',
  );
});

// [2026-09-30] main push 의 base 가 자기 main CI 실행을 갖지 못하면 diff 범위를 믿지 않는다(#795 ac2508c96 push 이벤트 누락).
const SHA = 'a'.repeat(40);
const jsonResponse = (body, ok = true) => async () => ({ ok, json: async () => body });
const run = overrides => ({ head_sha: SHA, event: 'push', head_branch: 'main', conclusion: 'success', ...overrides });
const verify = fetchImpl => pushBaseWasVerified({ sha: SHA, repository: 'lkindo/egov-enterprise', token: 't', fetchImpl });

test('push base with its own main CI run keeps the diff scope', async () => {
  assert.equal(await verify(jsonResponse({ workflow_runs: [run({})] })), true);
  assert.equal(await verify(jsonResponse({ workflow_runs: [run({ conclusion: null })] })), true, 'an in-progress run still verifies its commit');
  assert.equal(await verify(jsonResponse({ workflow_runs: [run({ conclusion: 'failure' })] })), true, 'a red run is a visible verification');
  assert.equal(await verify(jsonResponse({ workflow_runs: [run({ conclusion: 'timed_out' })] })), true, 'a timed-out run is red too');
  assert.equal(await verify(jsonResponse({ workflow_runs: [run({ conclusion: null, status: 'in_progress' })] })), true);
});

test('a base run that judged no axis does not verify its commit', async () => {
  // Only cancellation used to be excluded, so runs that never ran a job counted as verification.
  for (const conclusion of ['startup_failure', 'action_required', 'stale', 'skipped', 'neutral']) {
    assert.equal(await verify(jsonResponse({ workflow_runs: [run({ conclusion })] })), false, `${conclusion} judged no axis`);
  }
  assert.equal(await verify(jsonResponse({ workflow_runs: [run({ conclusion: null, status: 'completed' })] })), false,
    'a completed run without a conclusion judged nothing');
  assert.equal(await verify(jsonResponse({ workflow_runs: [run({ conclusion: 'skipped' }), run({ conclusion: 'success' })] })), true,
    'any judging run of the commit is enough');
});

test('missing, cancelled, foreign or unreadable base runs fail closed', async () => {
  assert.equal(await verify(jsonResponse({ workflow_runs: [] })), false, 'no run at all (dropped push event)');
  assert.equal(await verify(jsonResponse({ workflow_runs: [run({ conclusion: 'cancelled' })] })), false);
  assert.equal(await verify(jsonResponse({ workflow_runs: [run({ head_sha: 'b'.repeat(40) })] })), false);
  assert.equal(await verify(jsonResponse({ workflow_runs: [run({ event: 'pull_request' })] })), false);
  assert.equal(await verify(jsonResponse({ workflow_runs: [run({ head_branch: 'feature' })] })), false);
  assert.equal(await verify(jsonResponse({ message: 'rate limited' }, false)), false);
  assert.equal(await verify(async () => { throw new Error('network'); }), false);
  assert.equal(await verify(jsonResponse({ unexpected: true })), false);
  assert.equal(await pushBaseWasVerified({ sha: 'not-a-sha', repository: 'o/r', token: 't', fetchImpl: jsonResponse({ workflow_runs: [run({})] }) }), false);
  assert.equal(await pushBaseWasVerified({ sha: SHA, repository: 'o/r', token: '', fetchImpl: jsonResponse({ workflow_runs: [run({})] }) }), false, 'no token cannot confirm');
});

test('an unverified push base forces the full pipeline while a verified one keeps the diff', async () => {
  const base = { base: SHA, head: 'HEAD', forceFull: false, verifyPushBaseRun: true };
  const missing = await applyPushBaseCheck(base, { verify: async () => false, env: {} });
  assert.equal(missing.forceFull, true);
  assert.equal(classifyChangedFiles(['docs/README.md'], { forceFull: missing.forceFull }).backend, true);
  const present = await applyPushBaseCheck(base, { verify: async () => true, env: {} });
  assert.equal(present.forceFull, false);
  const off = await applyPushBaseCheck({ ...base, verifyPushBaseRun: false }, { verify: async () => { throw new Error('must not be called'); } });
  assert.equal(off.forceFull, false);
});
