import assert from 'node:assert/strict';
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { compositionDigest, loadProjectComposerCatalog } from './project-composer-catalog.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'config/reusable-base-profiles.json'), 'utf8'));
const catalog = loadProjectComposerCatalog(ROOT);

function fixture(t) {
  const base = resolve(tmpdir());
  const root = mkdtempSync(join(base, 'egov-composer-catalog-'));
  for (const path of ['config/reusable-base-profiles.json', 'config/governance/permission-catalog.json']) {
    mkdirSync(dirname(join(root, path)), { recursive: true }); copyFileSync(join(ROOT, path), join(root, path));
  }
  cpSync(join(ROOT, 'business-app/src/main/java'), join(root, 'business-app/src/main/java'), { recursive: true });
  // Copy only catalog-owned frontend files; producer build/node_modules are irrelevant.
  for (const path of catalog.frontendRules.map(rule => rule.path)) {
    mkdirSync(dirname(join(root, 'frontend', path)), { recursive: true });
    cpSync(join(ROOT, 'frontend', path), join(root, 'frontend', path), { recursive: true });
  }
  for (const file of new Set(catalog.capabilities.flatMap(capability => capability.requires.filter(edge => edge.kind === 'ui-import').map(edge => edge.evidence)))) {
    mkdirSync(dirname(join(root, file)), { recursive: true }); copyFileSync(join(ROOT, file), join(root, file));
  }
  t.after(() => {
    const child = relative(base, root);
    assert.ok(child.startsWith('egov-composer-catalog-') && !child.includes(sep));
    rmSync(root, { recursive: true, force: true });
  });
  return root;
}

test('all producer domains and tables have one verified ownership or an explicit shared contract', () => {
  const expectedDomains = Object.values(manifest.packs).flatMap(pack => pack.backend?.appDomains ?? []).sort();
  assert.deepEqual(catalog.capabilities.map(capability => capability.id), expectedDomains);
  assert.equal(catalog.capabilities.length, 20);
  assert.deepEqual(catalog.mandatory, ['foundation', 'core']);
  const tables = [...new Set([...catalog.core.tables, ...catalog.capabilities.flatMap(capability => capability.database.tables)])].sort();
  assert.deepEqual(tables, Object.values(manifest.packs).flatMap(pack => pack.database.tables).sort());
  const sequences = [...new Set([...catalog.core.explicitSequences, ...catalog.capabilities.flatMap(capability => capability.database.explicitSequences)])].sort();
  assert.deepEqual(sequences, Object.values(manifest.packs).flatMap(pack => pack.database.sequences).sort());
  for (const id of ['board', 'template']) assert.ok(catalog.capabilities.find(capability => capability.id === id).database.tables.includes('tb_tmplt_info'));
  for (const [id, target] of [['comment', 'board'], ['operation', 'informalsanction']]) {
    assert.ok(catalog.capabilities.find(capability => capability.id === id).requires.some(edge => edge.domain === target && edge.kind === 'java'));
  }
  const { catalogHash, ...body } = catalog;
  assert.equal(catalogHash, compositionDigest(body));
  assert.deepEqual(loadProjectComposerCatalog(ROOT), catalog);
});

test('new undeclared domain, table and UI ownership become visible failures', t => {
  const root = fixture(t);
  assert.deepEqual(loadProjectComposerCatalog(root), catalog);
  const addedDomain = join(root, 'business-app/src/main/java/nuri/business/domain/unowned/Example.java');
  mkdirSync(dirname(addedDomain), { recursive: true });
  writeFileSync(addedDomain, 'package nuri.business.domain.unowned; class Example {}');
  assert.throws(() => loadProjectComposerCatalog(root), /unowned application source/);
  rmSync(addedDomain);
  const board = join(root, 'business-app/src/main/java/nuri/business/domain/board/Board.java');
  const original = readFileSync(board, 'utf8');
  writeFileSync(board, original.replace('tb_bbs_item', 'tb_unknown_composer_table'));
  assert.throws(() => loadProjectComposerCatalog(root), /entity table absent from manifest/);
  writeFileSync(board, original);
  const unowned = join(root, 'frontend/src/app/admin/operation/UnknownFeature.tsx');
  writeFileSync(unowned, 'export default function Feature() { return null; }');
  assert.throws(() => loadProjectComposerCatalog(root), /no capability refinement/);
});

test('stale manifest source references and a removed shared table contract fail closed', t => {
  const root = fixture(t);
  const file = join(root, 'config/reusable-base-profiles.json');
  const changed = structuredClone(manifest);
  changed.sharedTableContracts = [];
  writeFileSync(file, JSON.stringify(changed));
  assert.throws(() => loadProjectComposerCatalog(root), /cross-pack table lacks shared contract/);
  writeFileSync(file, JSON.stringify(manifest));
  rmSync(join(root, 'frontend/src/services/business/mail/MailService.ts'));
  assert.throws(() => loadProjectComposerCatalog(root), /frontend ownership path missing/);
});
