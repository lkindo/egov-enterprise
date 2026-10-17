import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectGeneratedComposition } from './composer-modules.mjs';
import {
  HISTORICAL_SCHEMA_TEST_DIR, adaptGeneratedHarness, isHistoricalAuthorizationRehearsal, pruneHistoricalMigrationTests,
} from './reusable-source-gates.mjs';
import { projectedMigrationTestCount, projectedWriteHandlerCounts } from './reusable-source-harness.mjs';
import { stripJavaComments } from './reusable-source-java.mjs';

const REPOSITORY = fileURLToPath(new URL('..', import.meta.url));
const HARNESS_DIRECTORY = 'api-server/src/test/java/nuri/api/harness';
const MIGRATION_HARNESS = 'SharedPostgresMigrationHarnessContractTest.java';

function ownedTemporaryDirectory(t, prefix) {
  const output = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => {
    const owned = resolve(output);
    assert.equal(dirname(owned), resolve(tmpdir()));
    assert.ok(basename(owned).startsWith(prefix));
    rmSync(owned, { recursive: true, force: true });
  });
  return output;
}

test('the shared migration census is read from the projected harness profile with the harness population rule', () => {
  // 생성물 표지(config/modules/presets.json 의 active, 11단계 C5). 원본이면 projection 이 없다.
  const generated = detectGeneratedComposition(REPOSITORY).projection;
  const code = stripJavaComments(readFileSync(join(REPOSITORY, HARNESS_DIRECTORY, MIGRATION_HARNESS), 'utf8'));
  const frozen = Number(code.match(/private static final int EXPECTED_MIGRATION_TEST_COUNT = (\d+);/)?.[1]);
  assert.ok(Number.isInteger(frozen) && frozen > 0, 'the source keeps an exact frozen count');
  assert.match(code, /ReusableHarnessProfile\.current\(\)\.count\("migrationTests", EXPECTED_MIGRATION_TEST_COUNT\)/,
    'the harness reads the projected census and falls back to the frozen count only in the source repository');
  assert.doesNotMatch(code, /@DisplayName\("\d+개 migration/, 'the display name does not repeat a count the projection changes');
  // 생성기 census 는 하네스와 같은 루트·술어로 센다. 둘 중 하나만 바뀌면 투영본의 census 가 다른 모집단을 센다.
  assert.match(code, /resolve\("api-server\/src\/test\/java\/nuri\/api\/schema"\)/);
  assert.equal(HISTORICAL_SCHEMA_TEST_DIR, 'api-server/src/test/java/nuri/api/schema');
  assert.match(code, /name\.endsWith\("MigrationIntegrationTest\.java"\)/);

  const counted = projectedMigrationTestCount(REPOSITORY);
  if (generated) {
    const { census } = JSON.parse(readFileSync(join(REPOSITORY, 'config/governance/reusable-harness-profile.json'), 'utf8'));
    assert.equal(census.migrationTests, counted, 'the recorded census is the population left in this artifact');
    assert.equal(counted, 0, 'historical migration checks are projected out');
  } else {
    assert.equal(counted, frozen, 'the generator census counts the same population the harness freezes');
  }
});

test('the generator census follows the historical migration pruning, and adaptation no longer rewrites the migration harness', (t) => {
  const output = ownedTemporaryDirectory(t, 'reusable-harness-census-');
  const schema = join(output, ...HISTORICAL_SCHEMA_TEST_DIR.split('/'));
  for (const file of ['AlphaMigrationIntegrationTest.java', 'nested/BetaMigrationIntegrationTest.java',
    'SharedPostgresMigrationTestSupport.java', 'SchemaValidationIntegrationTest.java']) {
    mkdirSync(dirname(join(schema, file)), { recursive: true });
    writeFileSync(join(schema, file), 'class Fixture {}\n');
  }
  assert.equal(projectedMigrationTestCount(output), 2, 'nested directories and only the migration suffix are counted');
  pruneHistoricalMigrationTests(output);
  assert.equal(projectedMigrationTestCount(output), 0);
  writeFileSync(join(schema, 'AdopterMigrationIntegrationTest.java'), 'class Fixture {}\n');
  assert.equal(projectedMigrationTestCount(output), 1, 'an adopter-added migration check is counted, so the projected census turns red');

  if (detectGeneratedComposition(REPOSITORY).projection) return; // 생성물의 하네스는 이미 조정돼 다시 조정할 수 없다.
  const files = ['EntitySchemaConformanceLinterTest.java', 'SeedLocationLinterTest.java', MIGRATION_HARNESS,
    'ZeroDowntimeMigrationLinterTest.java'];
  const fixture = () => {
    const root = ownedTemporaryDirectory(t, 'reusable-harness-adaptation-');
    mkdirSync(join(root, HARNESS_DIRECTORY), { recursive: true });
    for (const file of files) copyFileSync(join(REPOSITORY, HARNESS_DIRECTORY, file), join(root, HARNESS_DIRECTORY, file));
    return root;
  };
  const adapted = fixture();
  adaptGeneratedHarness(adapted);
  assert.equal(readFileSync(join(adapted, HARNESS_DIRECTORY, MIGRATION_HARNESS), 'utf8'),
    readFileSync(join(REPOSITORY, HARNESS_DIRECTORY, MIGRATION_HARNESS), 'utf8'), 'the migration harness is not rewritten');
  assert.match(readFileSync(join(adapted, HARNESS_DIRECTORY, 'SeedLocationLinterTest.java'), 'utf8'),
    /private static final int MIGRATION_SQL_FLOOR = 3;/);

  // 남은 조정 지점이 원본에서 사라지면 투영이 조용히 원본 하한으로 나가지 않고 실패한다.
  const drifted = fixture();
  const path = join(drifted, HARNESS_DIRECTORY, 'SeedLocationLinterTest.java');
  const source = readFileSync(path, 'utf8');
  const changed = source.replace('MIGRATION_SQL_FLOOR = 25;', 'MIGRATION_SQL_FLOOR = 26;');
  assert.notEqual(changed, source);
  writeFileSync(path, changed, 'utf8');
  assert.throws(() => adaptGeneratedHarness(drifted), /generated harness 조정 지점을 찾지 못했다/);
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
