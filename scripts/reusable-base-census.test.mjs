import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeRepository, validateReusableBase } from './reusable-base-census.mjs';
import { buildIsolatedContractSql } from './generate-reusable-base-db.mjs';
import { readFileSync } from 'node:fs';

const baseline = analyzeRepository();

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
