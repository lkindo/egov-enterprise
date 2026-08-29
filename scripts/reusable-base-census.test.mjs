import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeRepository, validateReusableBase } from './reusable-base-census.mjs';

const baseline = analyzeRepository();

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
