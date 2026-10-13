import test from 'node:test';
import assert from 'node:assert/strict';

import { fileURLToPath } from 'node:url';
import { analyzeRepository, validateReusableBase } from './reusable-base-census.mjs';
import { buildProjectComposerCatalog } from './project-composer-catalog.mjs';
import { loadComposerModules } from './composer-modules.mjs';
import { buildIsolatedContractSql, planAuthorizationMigrationStages, readReviewedAuthorizationCatalogVersion, runAuthorizationMigrationStages } from './reusable-db-migrations.mjs';
import { readFileSync, readdirSync } from 'node:fs';

const baseline = analyzeRepository();

test('base migration stages preserve exact expansion proof before any post-Contract migration', () => {
  const names = readdirSync(new URL('../api-server/src/main/resources/db/migration/', import.meta.url))
    .filter(name => /^V[0-9_]+__.*\.sql$/.test(name))
    .sort((left, right) => {
      const a = left.match(/^V([0-9_]+)__/)[1].split('_').map(Number);
      const b = right.match(/^V([0-9_]+)__/)[1].split('_').map(Number);
      for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
        if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0);
      }
      return 0;
    });
  const future = 'V3_0__future_contract_consumer.sql';
  const migrations = [...names, future].map(name => ({ name, sql: Buffer.from(name) }));
  const { beforeContract, afterContract } = planAuthorizationMigrationStages(migrations);
  assert.equal(beforeContract.at(-1).name, 'V2_99__seed_explicit_operation_grants.sql');
  assert.equal(afterContract.at(-1).name, future);
  assert.deepEqual([...beforeContract, ...afterContract], migrations, 'no migration or SQL content may disappear');
  assert.ok(afterContract.every(migration => !beforeContract.includes(migration)));
  for (const bad of [
    migrations.filter(migration => !migration.name.startsWith('V2_98__')),
    migrations.filter(migration => !migration.name.startsWith('V2_99__')),
    [...migrations].reverse(),
    [...migrations, migrations.at(-1)],
    [{ name: 'unknown.sql', sql: Buffer.alloc(0) }, ...migrations],
  ]) assert.throws(() => planAuthorizationMigrationStages(bad), /requires the exact|strictly increasing|Duplicate|Unknown/);
});

test('base execution completes real Contract before later migrations and stops on failed evidence', () => {
  const migrations = ['V2_98__expand_authorization_grants_and_history.sql',
    'V2_99__seed_explicit_operation_grants.sql', 'V2_100__reorganize_menu_information_architecture.sql']
    .map(name => ({ name, sql: Buffer.from(name) }));
  const trace = [];
  runAuthorizationMigrationStages(migrations, {
    migrate: migration => trace.push(migration.name),
    repeatables: () => trace.push('repeatables'),
    contract: () => trace.push('actual Contract'),
  });
  assert.deepEqual(trace, [migrations[0].name, migrations[1].name, 'repeatables',
    'actual Contract', migrations[2].name, 'repeatables']);
  for (const failureStep of [migrations[0].name, 'repeatables', 'actual Contract']) {
    const executed = [];
    const execute = name => {
      executed.push(name);
      if (name === failureStep) throw new Error('evidence failure');
    };
    assert.throws(() => runAuthorizationMigrationStages(migrations, {
      migrate: migration => execute(migration.name), repeatables: () => execute('repeatables'),
      contract: () => execute('actual Contract'),
    }), /evidence failure/);
    assert.ok(!executed.includes(migrations[2].name), 'post-Contract migration must never run on failure');
    assert.equal(executed.at(-1), failureStep);
  }
  const generator = readFileSync(new URL('./generate-reusable-base-db.mjs', import.meta.url), 'utf8');
  assert.match(generator, /runAuthorizationMigrationStages\(migrations, \{/);
  assert.match(generator, /contract: \(\) => restore\(args.container, user, workingDb, buildIsolatedContractSql\(workingDb, catalogVersion, contractSql\)\)/);
});

test('base core preserves the four authorization tables and rejects legacy table resurrection', () => {
  const modules = structuredClone(baseline.modules);
  modules['core.json'].owns.tables = modules['core.json'].owns.tables.filter(table => table !== 'tb_authrt_chg_hstry');
  modules['core.json'].owns.tables.push('tb_role_info');
  const errors = validateReusableBase(modules, baseline.repository).errors;
  assert.ok(errors.some(error => error.includes("authorization core table 'tb_authrt_chg_hstry'")));
  assert.ok(errors.some(error => error.includes("retired authorization table 'tb_role_info'")));
});

test('base generation uses actual Contract only for its disposable database and removes its rehearsal ledger', () => {
  const contract = readFileSync(new URL('../api-server/src/main/resources/db/cutover/authorization-contract.sql', import.meta.url), 'utf8');
  const sql = buildIsolatedContractSql('test_reusable_base_core_fixture', 'a'.repeat(64), contract);
  assert.ok(sql.includes(contract));
  assert.match(sql, /^BEGIN;/);
  assert.match(sql, /current_database\(\) <> 'test_reusable_base_core_fixture'/);
  assert.match(sql, /DROP TABLE flyway_schema_history;\s*COMMIT;$/);
  assert.throws(() => buildIsolatedContractSql('egov', 'a'.repeat(64), contract), /disposable/);
  assert.throws(() => buildIsolatedContractSql('test_reusable_base_x;DROP TABLE x', 'a'.repeat(64), contract), /disposable/);
  assert.throws(() => buildIsolatedContractSql('test_reusable_base_fixture', 'unknown', contract), /catalog digest/);
  assert.throws(() => buildIsolatedContractSql('test_reusable_base_fixture', 'a'.repeat(64), '-- Contract skipped'), /actual authorization Contract/);
});

test('historical base Contract uses the reviewed V2_99 catalog when runtime operation bindings change', () => {
  const reviewedSeed = readFileSync(new URL('../api-server/src/main/resources/db/migration/V2_99__seed_explicit_operation_grants.sql', import.meta.url), 'utf8');
  const reviewed = readReviewedAuthorizationCatalogVersion(reviewedSeed);
  assert.equal(reviewed, '7905bb657127d40bea2df619093b24316651b1957ac9e26a902c7bd171473276');
  assert.equal(readReviewedAuthorizationCatalogVersion(reviewedSeed.replace(/\r?\n/g, '\r\n')), reviewed);
  const runtimeSource = readFileSync(new URL('../business-core/src/main/java/nuri/business/security/authorization/PermissionCodes.java', import.meta.url), 'utf8');
  const runtime = runtimeSource.match(/CATALOG_VERSION\s*=\s*"([a-f0-9]{64})"/)[1];
  assert.notEqual(runtime, reviewed, 'new endpoint bindings change the runtime digest without rewriting historical evidence');
  const contract = readFileSync(new URL('../api-server/src/main/resources/db/cutover/authorization-contract.sql', import.meta.url), 'utf8');
  const sql = buildIsolatedContractSql('test_reusable_base_reviewed_fixture', reviewed, contract);
  assert.ok(sql.includes(`set_config('app.authorization_catalog_version','${reviewed}',true)`));
  assert.ok(!sql.includes(runtime), 'the actual historical Contract must not receive the current runtime catalog');
  const generator = readFileSync(new URL('./generate-reusable-base-db.mjs', import.meta.url), 'utf8');
  assert.match(generator, /const reviewedSeed = migrations\.find\(migration => migration\.name === 'V2_99__seed_explicit_operation_grants\.sql'\);/);
  assert.match(generator, /const catalogVersion = readReviewedAuthorizationCatalogVersion\(reviewedSeed\?\.sql\.toString\('utf8'\) \?\? ''\);/);
  assert.doesNotMatch(generator, /PermissionCodes\.java|CATALOG_VERSION/);
});

test('reviewed V2_99 catalog parser rejects missing, mixed, malformed and comment-only audit evidence', () => {
  const source = readFileSync(new URL('../api-server/src/main/resources/db/migration/V2_99__seed_explicit_operation_grants.sql', import.meta.url), 'utf8');
  const reviewed = readReviewedAuthorizationCatalogVersion(source);
  const prefix = `SELECT 'migration:2.99','${reviewed}',`;
  const cases = [
    '',
    source.replace(prefix, `SELECT 'migration:2.99','${'a'.repeat(64)}',`),
    source.replace(prefix, `SELECT 'migration:2.99','${'a'.repeat(63)}',`),
    source.replace(prefix, `SELECT 'migration:2.99','${'A'.repeat(64)}',`),
    source.replace("'legacy_policy:tb_role_info'", "'legacy_policy:tb_authrt_role_map'"),
    source.replace("'legacy_policy:tb_role_info'", "'legacy_policy:unreviewed_table'"),
    source.replace("'initial_operation_grant'", "'initial_operation_missing'"),
    source.replace("'GROUP_GRANT','MIGRATE'", "'GROUP','MIGRATE'"),
    source.replace(/^INSERT INTO tb_authrt_chg_hstry\b[\s\S]*?;/m, ''),
    source.replaceAll(prefix, `-- ${prefix}`),
    `/*\n${source}\n*/`,
    source.split(/\r?\n/).map(line => `-- ${line}`).join('\n'),
    source + `\nSELECT 'migration:2.99','${'a'.repeat(64)}','GROUP','MIGRATE';\n`,
    `/*\n${source}`,
    `${source}\n/* unterminated review comment`,
    `${source}\n/* outer /* inner */ still unclosed`,
    `${source}\nSELECT 'unterminated SQL literal`,
  ];
  for (const [index, sql] of cases.entries()) {
    assert.throws(() => readReviewedAuthorizationCatalogVersion(sql), /Reviewed V2_99/, `corrupt review fixture ${index}`);
  }
  assert.equal(readReviewedAuthorizationCatalogVersion(`-- SELECT 'migration:2.99','${'a'.repeat(64)}', fake\n${source}\n/* another fake review */`), reviewed);
  assert.equal(readReviewedAuthorizationCatalogVersion(`/* outer /* nested fake SELECT 'migration:2.99','${'a'.repeat(64)}', */ still outer */\n${source}\nSELECT '/**', 'escaped''quote -- /* literal';`), reviewed);
});

test('current reusable-base feature ownership matches the repository', () => {
  assert.deepEqual(baseline.result.errors, []);
  const snapshot = baseline.modules['core.json'].databaseSnapshot;
  assert.equal(baseline.result.summary.declaredTableCount, snapshot.physicalTableCountExcludingFlyway);
  assert.equal(baseline.result.summary.declaredSequenceCount, snapshot.physicalStandaloneSequenceCount);
  assert.deepEqual(baseline.result.summary.features, Object.keys(baseline.modules)
    .filter(name => !['core.json', 'presets.json'].includes(name)).map(name => name.replace(/\.json$/, '')).sort());
});

/**
 * [11단계 C5] 의존 방향은 pack 순위가 아니라 카탈로그의 시작 구성 닫힘 검사다(실재하는 방향 — `Comment` 엔티티의 게시글 연관과
 * `CommentService` 의 `BoardErrorCode` 참조). 같은 위반은 '댓글을 담고 게시판을 빼는 시작 구성' 이고, 카탈로그 적재가 그것을
 * 거부한다. [C7] census 에는 순위도 묶음도 없다 — 묶음 간선의 대상은 로더가, 기능 소유와 소스의 대조는 카탈로그가 본다.
 */
test('the dependency direction is the catalog preset closure, not a census rank or bundle check', () => {
  assert.ok(!baseline.result.errors.some((error) => error.includes('역참조') || error.includes('rank') || error.includes('cluster')));
  const root = fileURLToPath(new URL('..', import.meta.url));
  const { declarations } = loadComposerModules(root);
  const broken = { ...declarations, presets: [...declarations.presets, { id: 'broken', domains: ['comment'] }] };
  assert.throws(() => buildProjectComposerCatalog(root, broken), /preset is not closed under requires: broken \(comment -> board\)/);
});

test('rejects duplicate physical table ownership', () => {
  const modules = structuredClone(baseline.modules);
  const duplicate = modules['core.json'].owns.tables[0];
  modules['board.json'].owns.tables.push(duplicate);
  const result = validateReusableBase(modules, baseline.repository);
  assert.ok(result.errors.some((error) => error.includes(`DB table '${duplicate}'이 core와 board에 중복 배정됐다`)));
});

test('rejects an unowned business-app domain', () => {
  const modules = structuredClone(baseline.modules);
  delete modules['board.json'];
  const result = validateReusableBase(modules, baseline.repository);
  assert.ok(result.errors.some((error) => error.includes("domain 'board'의 기능 파일(config/modules/board.json)이 없다")));
  assert.ok(result.errors.some((error) => error.includes("service root 'board'의 기능 파일이 없다")));
});

test('rejects duplicate physical sequence ownership', () => {
  const modules = structuredClone(baseline.modules);
  const duplicate = modules['core.json'].owns.sequences[0];
  modules['survey.json'].owns.sequences.push(duplicate);
  const result = validateReusableBase(modules, baseline.repository);
  assert.ok(result.errors.some((error) => error.includes(`DB sequence '${duplicate}'이 core와 survey에 중복 배정됐다`)));
});

test('a feature with backend source must declare its screens', () => {
  const modules = structuredClone(baseline.modules);
  modules['board.json'].owns.frontend = [];
  assert.ok(validateReusableBase(modules, baseline.repository).errors
    .some((error) => error.includes("기능 'board'이 백엔드를 가지면서 화면 소유(owns.frontend)를 선언하지 않았다")));
});

test('declared table and sequence counts follow the measured source schema snapshot', () => {
  const modules = structuredClone(baseline.modules);
  modules['core.json'].databaseSnapshot.physicalTableCountExcludingFlyway += 1;
  modules['core.json'].databaseSnapshot.physicalStandaloneSequenceCount += 1;
  const errors = validateReusableBase(modules, baseline.repository).errors;
  assert.ok(errors.some((error) => /^기능 파일 table 수 \d+가 실측 snapshot \d+와 다르다\.$/.test(error)), errors.join('\n'));
  assert.ok(errors.some((error) => /^기능 파일 standalone sequence 수 \d+가 실측 snapshot \d+와 다르다\.$/.test(error)), errors.join('\n'));
  delete modules['core.json'].databaseSnapshot;
  assert.ok(validateReusableBase(modules, baseline.repository).errors
    .some((error) => error.includes('core.json 에 원본 스키마 실측(databaseSnapshot)이 없다')));
});

/*
 * 프런트 전용 기능(DEC-OPS-273): 시연 화면은 business-app 소스 없이 기능 파일의 backend.frontendOnly 로 둔다. 표지가 서랍이 되지
 * 않도록 표지를 걷거나, 표지가 있는 기능에 main·test 소스가 생기면 붉다.
 */
test('frontend-only features are accepted without source and refused in every other direction', () => {
  assert.deepEqual(validateReusableBase(baseline.modules, baseline.repository).errors, []);
  assert.deepEqual(Object.values(baseline.modules).filter((value) => value.backend?.frontendOnly).map((value) => value.id), ['showcase']);

  const undeclared = structuredClone(baseline.modules);
  undeclared['showcase.json'].backend.frontendOnly = false;
  assert.ok(validateReusableBase(undeclared, baseline.repository).errors
    .some((error) => error.includes("기능 'showcase'에 대응하는 business-app domain 소스가 없다")));

  const sourced = structuredClone(baseline.repository);
  sourced.appDomains = [...sourced.appDomains, 'showcase'].sort();
  assert.ok(validateReusableBase(baseline.modules, sourced).errors
    .some((error) => error.includes("프런트 전용 기능 'showcase'에 business-app 소스가 있다")));

  const tested = structuredClone(baseline.repository);
  tested.testSources = [...tested.testSources, 'business-app/src/test/java/nuri/business/service/showcase/ProbeTest.java'];
  assert.ok(validateReusableBase(baseline.modules, tested).errors
    .some((error) => error.includes("프런트 전용 기능 'showcase'에 business-app 소스가 있다")));

  const sourcedFeature = structuredClone(baseline.modules);
  sourcedFeature['promotion.json'].backend.frontendOnly = true;
  assert.ok(validateReusableBase(sourcedFeature, baseline.repository).errors
    .some((error) => error.includes("프런트 전용 기능 'promotion'에 business-app 소스가 있다")));
});

test('rejects a source root outside domain/service ownership', () => {
  const repository = structuredClone(baseline.repository);
  repository.unexpectedAppSourceRoots.push('repository');

  const result = validateReusableBase(baseline.modules, repository);

  assert.ok(result.errors.some((error) => error.includes("source root 'repository'")));
});

/**
 * [2026-09-12 신설] 재사용 base 투영은 제외 기능을 지우면서 그 기능을 참조하는 **거버넌스 게이트까지 연쇄로** 지운다. 그 뒤
 * 생성기가 살아남은 것만으로 harness baseline 을 다시 써서, 파생 제품의 메타 게이트는 사라진 게이트를 처음부터 없었던 것으로
 * 본다 — 조용한 손실이다.
 *
 * <p>생성기는 그 제거를 시작 구성의 {@code expected.gates}(presets.json)와 exact 대조하지만, 생성기 자체는 DB bundle·docker 가
 * 필요해 PR 마다 모든 구성을 돌지 않는다. 그래서 여기서는 **승인 목록의 건전성**(형식·중복·대상 실재)만 지킨다 — 죽은 승인은
 * 다음 제거를 조용히 통과시키기 때문이다.
 */
test('acknowledged gate removals name a real gate source and a reason', () => {
  const entries = baseline.modules['presets.json'].presets
    .flatMap((preset) => preset.expected.gates.map((entry) => ({ preset: preset.id, ...entry })));

  assert.ok(entries.length > 0, '승인 목록이 비면 이 계약은 아무것도 지키지 않는다 — 실제 제거가 0건이 되면 이 단언부터 지울 것');
  for (const entry of entries) {
    assert.ok(baseline.repository.testSources.includes(entry.file),
      `${entry.preset} 의 승인 대상이 실재하지 않는다: ${entry.file}`);
    assert.ok(typeof entry.reason === 'string' && entry.reason.trim().length > 0,
      `${entry.preset} 의 승인 항목에 사유가 없다: ${entry.file}`);
  }
  assert.deepEqual(baseline.result.errors, []);
});

test('rejects an acknowledged gate that no longer exists, has no reason, or is listed twice', () => {
  const index = baseline.modules['presets.json'].presets.findIndex((preset) => preset.expected.gates.length > 0);
  assert.ok(index >= 0, '승인 목록을 가진 시작 구성이 하나는 있어야 부정 테스트가 성립한다');
  const presetId = baseline.modules['presets.json'].presets[index].id;
  const original = baseline.modules['presets.json'].presets[index].expected.gates[0];

  const renamed = structuredClone(baseline.modules);
  renamed['presets.json'].presets[index].expected.gates[0].file = original.file.replace(/\.java$/, 'Renamed.java');
  assert.ok(validateReusableBase(renamed, baseline.repository).errors
    .some((error) => error.includes(`시작 구성 '${presetId}'이 실재하지 않는 게이트`)));

  const reasonless = structuredClone(baseline.modules);
  reasonless['presets.json'].presets[index].expected.gates[0].reason = '   ';
  assert.ok(validateReusableBase(reasonless, baseline.repository).errors
    .some((error) => error.includes('expected.gates 항목은 { file, reason }')));

  const duplicated = structuredClone(baseline.modules);
  duplicated['presets.json'].presets[index].expected.gates.push(structuredClone(original));
  assert.ok(validateReusableBase(duplicated, baseline.repository).errors
    .some((error) => error.includes('중복 등재')));
});
