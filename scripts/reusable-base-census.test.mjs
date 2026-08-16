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

test('rejects a lower profile depending on a higher profile domain', () => {
  const manifest = structuredClone(baseline.manifest);
  const highestRank = Math.max(...Object.values(manifest.packs).map((pack) => pack.rank));
  manifest.packs.collaboration.backend.appDomains =
    manifest.packs.collaboration.backend.appDomains.filter((domain) => domain !== 'comment');
  manifest.packs.synthetic_higher = {
    rank: highestRank + 1,
    backend: { appDomains: ['comment'] },
    database: { tables: [], sequences: [] },
  };

  const result = validateReusableBase(manifest, baseline.repository);

  assert.ok(result.errors.some((error) => error.includes('상위 pack 역참조 board->comment')));
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
