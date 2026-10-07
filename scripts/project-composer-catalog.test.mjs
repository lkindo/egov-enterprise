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
  for (const path of ['config/reusable-base-profiles.json', 'config/governance/permission-catalog.json', 'config/project-composer-menus.json']) {
    mkdirSync(dirname(join(root, path)), { recursive: true }); copyFileSync(join(ROOT, path), join(root, path));
  }
  cpSync(join(ROOT, 'business-app/src/main/java'), join(root, 'business-app/src/main/java'), { recursive: true });
  for (const file of Object.values(manifest.packs).flatMap(pack => Object.values(pack.backend?.domainSupportFiles ?? {}).flat())) {
    mkdirSync(dirname(join(root, file)), { recursive: true }); copyFileSync(join(ROOT, file), join(root, file));
  }
  // Copy only catalog-owned frontend files; producer build/node_modules are irrelevant.
  for (const path of catalog.frontendRules.map(rule => rule.path)) {
    mkdirSync(dirname(join(root, 'frontend', path)), { recursive: true });
    cpSync(join(ROOT, 'frontend', path), join(root, 'frontend', path), { recursive: true });
  }
  for (const file of new Set([...catalog.capabilities.flatMap(capability => capability.requires.filter(edge => edge.kind === 'ui-import').map(edge => edge.evidence)),
    ...[...catalog.requiredForeignKeys, ...catalog.optionalForeignKeys].map(contract => contract.evidence)])) {
    mkdirSync(dirname(join(root, file)), { recursive: true }); copyFileSync(join(ROOT, file), join(root, file));
  }
  t.after(() => {
    const child = relative(base, root);
    assert.ok(child.startsWith('egov-composer-catalog-') && !child.includes(sep));
    rmSync(root, { recursive: true, force: true });
  });
  return root;
}

test('declared cross-domain foreign keys are bound to their migration evidence and owning domains', t => {
  assert.equal(catalog.requiredForeignKeys.length, 5);
  for (const contract of catalog.requiredForeignKeys) {
    const child = catalog.capabilities.find(capability => capability.id === contract.sourceDomain);
    const parent = catalog.capabilities.find(capability => capability.id === contract.targetDomain);
    assert.ok(child.database.tables.includes(contract.childTable) && parent.database.tables.includes(contract.parentTable), contract.name);
  }
  const root = fixture(t);
  const evidence = catalog.requiredForeignKeys.find(contract => contract.name === 'fk_tb_dta_use_stats_tb_bbs_item').evidence;
  writeFileSync(join(root, evidence), readFileSync(join(root, evidence), 'utf8').replaceAll('ADD CONSTRAINT fk_tb_dta_use_stats_tb_bbs_item', 'ADD CONSTRAINT fk_renamed'));
  assert.throws(() => loadProjectComposerCatalog(root), /declared foreign key drifted: fk_tb_dta_use_stats_tb_bbs_item/);
});

test('a declared tab menu must match an active menu row of an existing screen', t => {
  assert.deepEqual(catalog.capabilities.filter(capability => capability.menuTabs.length).map(capability => [capability.id, capability.menuTabs]), [
    ['board', ['/admin/help/faq?tab=FAQ', '/admin/help/faq?tab=QNA', '/admin/help/faq?tab=WIKI']],
    ['system', ['/admin/help?tab=COMMUNITY']],
  ]);
  for (const capability of catalog.capabilities) assert.ok(!capability.menuRoutes.some(route => route.includes('?')), capability.id);
  const root = fixture(t);
  const path = join(root, 'config/project-composer-menus.json');
  const snapshot = JSON.parse(readFileSync(path, 'utf8'));
  snapshot.menus.find(row => row.modern_route === '/admin/help?tab=COMMUNITY').modern_route = '/admin/help?tab=COMMUNITIES';
  writeFileSync(path, JSON.stringify(snapshot));
  assert.throws(() => loadProjectComposerCatalog(root), /menu tab has no active menu row: \/admin\/help\?tab=COMMUNITY/);
});

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

test('configured notice and FAQ permissions belong to the optional board capability', t => {
  const board = catalog.capabilities.find(capability => capability.id === 'board');
  for (const code of ['NOTICE_EDIT', 'FAQ_EDIT']) {
    assert.ok(board.permissionCodes.includes(code));
    assert.ok(!catalog.core.permissionCodes.includes(code));
  }
  const root = fixture(t);
  const path = join(root, 'config/governance/permission-catalog.json');
  const permissions = JSON.parse(readFileSync(path, 'utf8'));
  permissions.permissions = permissions.permissions.filter(row => row.code !== 'FAQ_EDIT');
  writeFileSync(path, JSON.stringify(permissions));
  assert.throws(() => loadProjectComposerCatalog(root), /unknown permission domain: FAQ/);
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

test('domain support is owned and fingerprinted with its consumer', t => {
  const root = fixture(t);
  const support = manifest.packs.demo.backend.domainSupportFiles.memoreport;
  assert.equal(support.length, 3);
  const capability = catalog.capabilities.find(row => row.id === 'memoreport');
  for (const file of support) assert.ok(capability.backend.sourceFiles.includes(file), file);
  const file = support.find(path => path.endsWith('/UserDisplayNameLookupService.java'));
  const source = readFileSync(join(root, file), 'utf8');
  writeFileSync(join(root, file), `${source}\n// changed support source fixture\n`);
  const changed = loadProjectComposerCatalog(root);
  assert.notEqual(changed.provenance.sourceInventoryHash, catalog.provenance.sourceInventoryHash);
  assert.notEqual(changed.catalogHash, catalog.catalogHash);
  rmSync(join(root, file));
  assert.throws(() => loadProjectComposerCatalog(root), /Missing domain support file/);
});
