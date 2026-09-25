import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { adaptGeneratedHarness, isHistoricalAuthorizationRehearsal, projectedWriteHandlerCounts } from './generate-reusable-base-source.mjs';

test('generated harness adaptation matches current source selectors and rejects census or display-name drift', (t) => {
  const generatedProfile = JSON.parse(readFileSync(new URL('../config/reusable-base-profiles.json', import.meta.url), 'utf8'))
    .sourcePolicy.generatedProfile;
  const harnessDirectory = 'api-server/src/test/java/nuri/api/harness';
  const migrationHarness = 'SharedPostgresMigrationHarnessContractTest.java';
  const files = ['EntitySchemaConformanceLinterTest.java', 'SeedLocationLinterTest.java',
    migrationHarness, 'ZeroDowntimeMigrationLinterTest.java'];
  const projectedFixture = () => {
    const output = mkdtempSync(join(tmpdir(), 'reusable-harness-adaptation-'));
    t.after(() => {
      const owned = resolve(output);
      assert.equal(dirname(owned), resolve(tmpdir()));
      assert.ok(basename(owned).startsWith('reusable-harness-adaptation-'));
      rmSync(owned, { recursive: true, force: true });
    });
    mkdirSync(join(output, harnessDirectory), { recursive: true });
    for (const file of files) {
      copyFileSync(new URL(`../${harnessDirectory}/${file}`, import.meta.url), join(output, harnessDirectory, file));
    }
    return output;
  };

  const assertProjected = (output) => {
    const projected = readFileSync(join(output, harnessDirectory, migrationHarness), 'utf8');
    assert.match(projected, /private static final int EXPECTED_MIGRATION_TEST_COUNT = 0;/, 'projected migration census drift');
    assert.match(projected, /@DisplayName\("migration 검증은 개별 container lifecycle 없이 공용 PostgreSQL support를 사용한다"\)/,
      'projected migration display name drift');
  };
  // Generated artifacts already contain the adapted census; validate that result instead of adapting it twice.
  const verifyFixture = generatedProfile ? assertProjected : adaptGeneratedHarness;
  const output = projectedFixture();
  verifyFixture(output);
  assertProjected(output);

  for (const [from, to] of [
    [`EXPECTED_MIGRATION_TEST_COUNT = ${generatedProfile ? 0 : 45};`, 'EXPECTED_MIGRATION_TEST_COUNT = 46;'],
    [`@DisplayName("${generatedProfile ? '' : '45개 '}migration 검증은`, '@DisplayName("46개 migration 검증은'],
  ]) {
    const drifted = projectedFixture();
    const path = join(drifted, harnessDirectory, migrationHarness);
    const source = readFileSync(path, 'utf8');
    const changed = source.replace(from, to);
    assert.notEqual(changed, source);
    writeFileSync(path, changed, 'utf8');
    assert.throws(() => verifyFixture(drifted), generatedProfile
      ? /projected migration (?:census|display name) drift/
      : /generated harness 조정 지점을 찾지 못했다/);
  }
});

test('projected handler census counts actual success bodies, private delegates and explicit non-success separately', () => {
  const source = `class Controller {
    @PostMapping("/one") public Object one() { return ApiResponse.success("}"); }
    @PutMapping("/two") public Object two() { return delegated(); }
    private Object delegated() { return ResponseEntity.ok("("); }
    @DeleteMapping("/three") public Object three() { return ResponseEntity.noContent().build(); }
  }`;
  assert.deepEqual(projectedWriteHandlerCounts(source), { handlers: 3, successful: 2 });
  assert.deepEqual(projectedWriteHandlerCounts(source.replace('ResponseEntity.ok', 'ResponseEntity.noContent')), { handlers: 3, successful: 1 });
  assert.throws(() => projectedWriteHandlerCounts('@PostMapping("/broken") public Object broken() {'), /Unclosed/);
});

test('only the three historical authorization transitions are projected out, and source drift is red', () => {
  const fixtures = [
    ['AuthorityReferenceFkIntegrationTest.java', '"2.99"'],
    ['AuthorizationContractIntegrationTest.java', '"2.99"'],
    ['AuthorizationGrantExpansionIntegrationTest.java', '"2.97"'],
  ];
  for (const [name, version] of fixtures) {
    const source = readFileSync(new URL(`../api-server/src/test/java/nuri/api/schema/${name}`, import.meta.url), 'utf8');
    assert.equal(isHistoricalAuthorizationRehearsal(name, source), true);
    assert.throws(() => isHistoricalAuthorizationRehearsal(name, source.replaceAll(version, '"1.0"')), /changed scope/);
    assert.throws(() => isHistoricalAuthorizationRehearsal(name, `/* ${source.replaceAll('*/', '')} */ class CurrentSchema {}`), /changed scope/);
  }
  const current = readFileSync(new URL('../api-server/src/test/java/nuri/api/schema/SchemaValidationIntegrationTest.java', import.meta.url), 'utf8');
  assert.equal(isHistoricalAuthorizationRehearsal('SchemaValidationIntegrationTest.java', current), false);
  assert.equal(isHistoricalAuthorizationRehearsal('NewAuthorizationContractIntegrationTest.java', 'fromVersion("2.99")'), false);
});
