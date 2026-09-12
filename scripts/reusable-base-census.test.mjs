import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeRepository, validateReusableBase } from './reusable-base-census.mjs';
import { buildIsolatedContractSql, planAuthorizationMigrationStages, runAuthorizationMigrationStages } from './generate-reusable-base-db.mjs';
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
  const manifest = structuredClone(baseline.manifest);
  manifest.packs.core.database.tables = manifest.packs.core.database.tables.filter(table => table !== 'tb_authrt_chg_hstry');
  manifest.packs.core.database.tables.push('tb_role_info');
  const errors = validateReusableBase(manifest, baseline.repository).errors;
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

test('current reusable-base profile contract matches the repository', () => {
  assert.deepEqual(baseline.result.errors, []);
  assert.equal(
    baseline.result.summary.manifestTableCount,
    baseline.manifest.databaseSnapshot.physicalTableCountExcludingFlyway,
  );
  assert.equal(
    baseline.result.summary.manifestSequenceCount,
    baseline.manifest.databaseSnapshot.physicalStandaloneSequenceCount,
  );
});

/**
 * [2026-08-29] 픽스처를 comment→board 로 뒤집었다.
 *
 * <p>종전에는 comment 를 상위 pack 으로 올려 `board->comment` 역참조를 기대했다. 그런데
 * 그 간선의 유일한 출처였던 `BoardEventListener` 의 `CommentRepository` 주입이 제거되면서
 * (댓글 수 동기화를 foundation 이벤트로 역전) **저장소에 board->comment 간선이 0건이 됐다**.
 * 실재하지 않는 간선을 기대하는 부정 테스트는 red 를 증명하지 못한다.
 *
 * <p>지금 실재하는 방향은 comment->board 다 — `Comment` 엔티티의 게시글 연관과
 * `CommentService` 의 `BoardErrorCode` 참조 2건.
 */
test('rejects a lower profile depending on a higher profile domain', () => {
  const manifest = structuredClone(baseline.manifest);
  const highestRank = Math.max(...Object.values(manifest.packs).map((pack) => pack.rank));
  manifest.packs.collaboration.backend.appDomains =
    manifest.packs.collaboration.backend.appDomains.filter((domain) => domain !== 'board');
  manifest.packs.synthetic_higher = {
    rank: highestRank + 1,
    backend: { appDomains: ['board'] },
    database: { tables: [], sequences: [] },
  };

  const result = validateReusableBase(manifest, baseline.repository);

  assert.ok(result.errors.some((error) => error.includes('상위 pack 역참조 comment->board')));
  assert.ok(result.errors.some((error) => error.includes("cluster 'board'")));
});

test('rejects duplicate physical table ownership', () => {
  const manifest = structuredClone(baseline.manifest);
  const packNames = Object.keys(manifest.packs);
  const owner = packNames.find((pack) => manifest.packs[pack].database.tables.length > 0);
  const duplicateTarget = packNames.find((pack) => pack !== owner) ?? 'synthetic_duplicate';
  if (!manifest.packs[duplicateTarget]) {
    manifest.packs[duplicateTarget] = { rank: 99, backend: { appDomains: [] }, database: { tables: [], sequences: [] } };
  }
  const duplicate = manifest.packs[owner].database.tables[0];
  manifest.packs[duplicateTarget].database.tables.push(duplicate);

  const result = validateReusableBase(manifest, baseline.repository);

  assert.ok(result.errors.some((error) => error.includes(`DB table '${duplicate}'`)));
});

test('rejects an unowned business-app domain', () => {
  const manifest = structuredClone(baseline.manifest);
  const owner = Object.keys(manifest.packs).find((pack) => manifest.packs[pack].backend.appDomains.length > 0);
  const domain = manifest.packs[owner].backend.appDomains[0];
  manifest.packs[owner].backend.appDomains =
    manifest.packs[owner].backend.appDomains.filter((candidate) => candidate !== domain);

  const result = validateReusableBase(manifest, baseline.repository);

  assert.ok(result.errors.some((error) => error.includes(`domain '${domain}'의 pack 소유자가 없다`)));
});

test('rejects duplicate physical sequence ownership', () => {
  const manifest = structuredClone(baseline.manifest);
  const packNames = Object.keys(manifest.packs);
  const owner = packNames.find((pack) => manifest.packs[pack].database.sequences.length > 0);
  const duplicateTarget = packNames.find((pack) => pack !== owner) ?? 'synthetic_duplicate';
  if (!manifest.packs[duplicateTarget]) {
    manifest.packs[duplicateTarget] = { rank: 99, backend: { appDomains: [] }, database: { tables: [], sequences: [] } };
  }
  const duplicate = manifest.packs[owner].database.sequences[0];
  manifest.packs[duplicateTarget].database.sequences.push(duplicate);

  const result = validateReusableBase(manifest, baseline.repository);

  assert.ok(result.errors.some((error) => error.includes(`DB sequence '${duplicate}'`)));
});

test('rejects a source root outside domain/service ownership', () => {
  const repository = structuredClone(baseline.repository);
  repository.unexpectedAppSourceRoots.push('repository');

  const result = validateReusableBase(baseline.manifest, repository);

  assert.ok(result.errors.some((error) => error.includes("source root 'repository'")));
});

/**
 * [2026-09-12 신설] 재사용 base 투영은 제외 domain 을 지우면서 그 domain 을 참조하는 **거버넌스
 * 게이트까지 연쇄로** 지운다. 그 뒤 생성기가 살아남은 것만으로 harness baseline 을 다시 써서,
 * 파생 제품의 메타 게이트는 사라진 게이트를 처음부터 없었던 것으로 본다 — 조용한 손실이다.
 *
 * <p>생성기는 그 제거를 manifest 의 {@code acknowledgedRemovedGates} 와 exact 대조하지만,
 * 생성기 자체는 DB bundle·docker 가 필요해 CI 에서 돌지 않는다. 그래서 여기서는 **승인 목록의
 * 건전성**(형식·중복·대상 실재)만 지킨다 — 죽은 승인은 다음 제거를 조용히 통과시키기 때문이다.
 */
test('acknowledged gate removals name a real gate source and a reason', () => {
  const entries = Object.entries(baseline.manifest.profiles ?? {})
    .flatMap(([profileName, profile]) =>
      (profile.acknowledgedRemovedGates ?? []).map((entry) => ({ profileName, ...entry })));

  assert.ok(entries.length > 0, '승인 목록이 비면 이 계약은 아무것도 지키지 않는다 — 실제 제거가 0건이 되면 이 단언부터 지울 것');
  for (const entry of entries) {
    assert.ok(baseline.repository.testSources.includes(entry.file),
      `${entry.profileName} 의 승인 대상이 실재하지 않는다: ${entry.file}`);
    assert.ok(typeof entry.reason === 'string' && entry.reason.trim().length > 0,
      `${entry.profileName} 의 승인 항목에 사유가 없다: ${entry.file}`);
  }
  assert.deepEqual(baseline.result.errors, []);
});

test('rejects an acknowledged gate that no longer exists, has no reason, or is listed twice', () => {
  const profileName = Object.keys(baseline.manifest.profiles).find(
    (name) => (baseline.manifest.profiles[name].acknowledgedRemovedGates ?? []).length > 0);
  assert.ok(profileName, '승인 목록을 가진 profile 이 하나는 있어야 부정 테스트가 성립한다');
  const original = baseline.manifest.profiles[profileName].acknowledgedRemovedGates[0];

  const renamed = structuredClone(baseline.manifest);
  renamed.profiles[profileName].acknowledgedRemovedGates[0].file =
    original.file.replace(/\.java$/, 'Renamed.java');
  assert.ok(validateReusableBase(renamed, baseline.repository).errors
    .some((error) => error.includes('실재하지 않는 게이트')));

  const reasonless = structuredClone(baseline.manifest);
  reasonless.profiles[profileName].acknowledgedRemovedGates[0].reason = '   ';
  assert.ok(validateReusableBase(reasonless, baseline.repository).errors
    .some((error) => error.includes('{ file, reason }')));

  const duplicated = structuredClone(baseline.manifest);
  duplicated.profiles[profileName].acknowledgedRemovedGates.push(structuredClone(original));
  assert.ok(validateReusableBase(duplicated, baseline.repository).errors
    .some((error) => error.includes('중복 등재')));
});
