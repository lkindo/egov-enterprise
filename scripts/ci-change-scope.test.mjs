import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifyChangedFiles, githubOutputs } from './ci-change-scope.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
  assert.equal(result.backend, false);
  assert.equal(result.frontend, false);
  assert.equal(result.schema, false);
  assert.equal(result.e2e, false);
  assert.equal(result.mutation, false);
});

test('backend production changes select backend, e2e, and mutation', () => {
  const result = classifyChangedFiles([
    'business-core/src/main/java/nuri/business/service/auth/AuthServiceImpl.java',
  ]);

  assert.equal(result.docsOnly, false);
  assert.equal(result.backend, true);
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
    assert.deepEqual(result.unknownFiles, [file]);
    for (const field of ['backend', 'frontend', 'schema', 'e2e', 'mutation', 'sast']) {
      assert.equal(result[field], true, `${file}: ${field} must remain fail closed`);
    }
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
    'migration-tool/src/test/resources/mapping-sample.yml',
    'migration-tool/src/testFixtures/resources/mapping-sample.yml',
  ]) {
    const result = classifyChangedFiles([file]);
    assert.equal(result.mutation, true);
    assert.equal(result.e2e, false);
  }
});

test('runtime resources retain PIT evidence without selecting unrelated migration mutation', () => {
  for (const module of ['foundation', 'business-core', 'business-app', 'api-server', 'migration-tool']) {
    const file = `${module}/src/main/resources/application.yml`;
    const result = classifyChangedFiles([file]);
    assert.equal(result.mutation, true, file);
    assert.equal(result.mutationMigrationTool, module === 'migration-tool', file);
    assert.equal(result.e2e, module !== 'migration-tool', file);
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
  assert.equal(migrationTool.backend, true);
  assert.equal(migrationTool.e2e, false);
  assert.equal(migrationTool.mutation, true);
  assert.equal(migrationTool.mutationMigrationTool, true);
});

test('migration-tool mutation is a narrowing of the mutation scope, never an extension', () => {
  // 이 모듈의 뮤테이션 두 스코프가 CI 임계 경로를 지배했다(DEC-OPS-104). 온라인 런타임과 분리된
  // 독립 CLI 라 다른 모듈의 뮤턴트에 영향을 주지 않으므로, 변경 범위 밖이면 실행하지 않는다.
  const backendOnly = classifyChangedFiles([
    'business-core/src/main/java/nuri/business/service/auth/AuthServiceImpl.java',
  ]);
  assert.equal(backendOnly.mutation, true);
  assert.equal(backendOnly.mutationMigrationTool, false);

  assert.equal(classifyChangedFiles(['build.gradle']).mutationMigrationTool, true);
  assert.equal(classifyChangedFiles(['settings.gradle']).mutationMigrationTool, true);
  assert.equal(classifyChangedFiles(['migration-tool/build.gradle']).mutationMigrationTool, true);
  assert.equal(classifyChangedFiles(['unheard-of/path.bin']).mutationMigrationTool, true);

  // 하한 — 이 경로들이 빠지면 이관 뮤테이션이 필요한 변경에서 잡이 돌지 않는다.
  //   상한(⊆ mutation)만 검사하면 "항상 false" 인 구현도 통과하므로 양쪽을 함께 고정한다.
  for (const file of [
    'migration-tool/src/main/java/nuri/migration/validate/MappingValidator.java',
    'migration-tool/src/test/java/nuri/migration/adapter/CubridSourceAdapterTest.java',
    'migration-tool/src/test/resources/discovery/fixture.json',
    'migration-tool/src/testFixtures/java/nuri/migration/fixture/MappingFixture.java',
    'migration-tool/src/main/resources/application.yml',
  ]) {
    assert.equal(classifyChangedFiles([file]).mutationMigrationTool, true,
      `${file}: 이관 뮤테이션 범위에서 빠졌다`);
  }

  // 부분집합 불변식 — 잡 자체가 mutation 으로 열리므로, 이 플래그가 더 넓으면 "범위 안" 이라고
  //   말해 놓고 아무것도 실행되지 않는 상태가 된다.
  for (const file of [
    'gradle/libs.versions.toml',
    'migration-tool/src/main/resources/application.yml',
    'migration-tool/src/test/java/nuri/migration/adapter/CubridSourceAdapterTest.java',
    'docs/README.md',
    'frontend/src/app/page.tsx',
    'build.gradle',
  ]) {
    const result = classifyChangedFiles([file]);
    if (result.mutationMigrationTool) {
      assert.equal(result.mutation, true,
        `${file}: mutationMigrationTool 이 mutation 보다 넓어 잡이 열리지 않는 범위를 범위 안이라고 말한다`);
    }
  }
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
    assert.equal(result.frontend, true);
    assert.equal(result.schema, true);
    assert.equal(result.e2e, true);
    assert.equal(result.mutation, true);
  }
});

test('explicit full regression includes every heavy gate even for documentation-only inputs', () => {
  const files = ['README.md'];
  assert.equal(classifyChangedFiles(files).docsOnly, true, 'PR classification remains selective');
  const result = classifyChangedFiles(files, { forceFull: true });
  assert.equal(result.docsOnly, false);
  assert.deepEqual(result.files, files);
  assert.deepEqual(result.unknownFiles, [], 'full regression does not invent unknown paths');
  for (const field of ['backend', 'frontend', 'schema', 'e2e', 'mutation', 'mutationMigrationTool', 'sast']) {
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
    frontend: 'false',
    schema: 'false',
    e2e: 'false',
    mutation: 'false',
    mutation_migration_tool: 'false',
    unknown_count: '0',
  });
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
