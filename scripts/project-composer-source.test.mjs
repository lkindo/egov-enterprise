import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { compositionDigest, loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';
import { composerProfile, projectComposerFrontend, projectComposerJava, assertComposerSourceSurvives, verifyCompositionDatabaseFiles } from './project-composer-source.mjs';
import { frontendImportSpecifiers, planJavaRemoval, resolveFrontendImport, trackedAndUntrackedFiles, projectFrontendPackMarkers } from './generate-reusable-base-source.mjs';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'config/reusable-base-profiles.json'), 'utf8'));
const catalog = loadProjectComposerCatalog(root);
const recipe = domains => ({ schemaVersion: 1, project: { name: 'composition-test' }, sourceRef: 'main',
  selection: { domains }, database: { vendor: 'postgresql' }, backendLayout: 'multi-module' });
// Match copySourceTree: tracked deletions are absent from the current source projection.
const files = trackedAndUntrackedFiles().filter(file => existsSync(join(root, file)));
const java = files.filter(file => file.endsWith('.java')).map(file => join(root, file));
const frontendFiles = files.filter(file => file.startsWith('frontend/'));
const frontendSources = new Map(frontendFiles.filter(file => ['.ts', '.tsx', '.js', '.jsx'].includes(extname(file)))
  .map(file => [file, readFileSync(join(root, file), 'utf8')]));
const frontendKnownFiles = new Set([...frontendSources.keys()].map(file => join(root, file)));
const covers = (prefix, path) => path === prefix || path.startsWith(`${prefix}/`);

/** The real generator's pure marker/import functions run against the current source inventory. */
function inspectFrontendSurvival(domains, currentCatalog = catalog) {
  const composition = resolveProjectRecipe(recipe(domains), currentCatalog);
  const profile = composerProfile(manifest, composition);
  const excludedPacks = new Set(Object.keys(manifest.packs).filter(pack => !profile.packs.includes(pack)));
  const directlyRemoved = new Set(frontendFiles.filter(file => profile.frontendRemovePaths.some(prefix => covers(`frontend/${prefix}`, file))));
  const removed = new Set(directlyRemoved);
  const edges = new Map();
  for (const [file, source] of frontendSources) {
    const projected = projectFrontendPackMarkers(projectComposerFrontend(file, source, composition), {
      knownPacks: new Set(Object.keys(manifest.packs)), excludedPacks, label: file,
    }).source;
    edges.set(file, frontendImportSpecifiers(projected)
      .map(specifier => resolveFrontendImport(join(root, 'frontend'), join(root, file), specifier, frontendKnownFiles))
      .filter(Boolean).map(path => relative(root, path).split(sep).join('/')));
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const [file, dependencies] of edges) {
      if (!removed.has(file) && dependencies.some(dependency => removed.has(dependency))) {
        removed.add(file); changed = true;
      }
    }
  }
  const selected = frontendFiles.filter(file => !directlyRemoved.has(file)
    && composition.frontend.includedPaths.some(prefix => covers(`frontend/${prefix}`, file)));
  const expected = [...selected, 'frontend/src/app/layout.tsx', 'frontend/src/app/page.tsx', 'frontend/src/app/login/page.tsx'];
  return { expectedCount: expected.length, missing: expected.filter(file => removed.has(file)) };
}

test('every selectable capability preserves its declared frontend and mandatory entrypoints through actual import projection', () => {
  assert.equal(catalog.capabilities.length, 20, 'review the capability population when its declaration changes');
  for (const feature of catalog.capabilities) {
    const result = inspectFrontendSurvival([feature.id]);
    assert.ok(result.expectedCount > 3, `${feature.id} has no declared frontend population`);
    assert.deepEqual(result.missing, [], `${feature.id}: selected sources must not disappear through a shared import`);
  }
});

test('removing a shared UI dependency exposes the selected page loss instead of silently passing', () => {
  for (const [from, dependency] of [['system', 'template'], ['survey', 'stats'], ['stats', 'survey']]) {
    const changed = structuredClone(catalog);
    const feature = changed.capabilities.find(row => row.id === from);
    assert.ok(feature.requires.some(edge => edge.domain === dependency), `${from} -> ${dependency} must exist`);
    feature.requires = feature.requires.filter(edge => edge.domain !== dependency);
    const { catalogHash: ignored, ...body } = changed;
    changed.catalogHash = compositionDigest(body);
    assert.ok(inspectFrontendSurvival([from], changed).missing.length > 0, `${from} -> ${dependency}: broken dependency must be red`);
  }
});

test('each selectable domain retains its Java production sources after actual dependency pruning', () => {
  for (const domain of catalog.capabilities.map(row => row.id)) {
    const composition = resolveProjectRecipe(recipe([domain]), catalog);
    const plan = planJavaRemoval(root, manifest, composerProfile(manifest, composition), java);
    for (const selected of composition.resolvedDomains) for (const file of plan.removed) {
      const path = file.replaceAll('\\', '/');
      assert.ok(!['domain', 'service'].some(layer => path.includes(`/business-app/src/main/java/nuri/business/${layer}/${selected}/`)), `${domain}: unexpectedly removed ${file}`);
    }
  }
});

test('all shared frontend marker blocks have explicit capability owners; unknown additions are red', () => {
  const composition = resolveProjectRecipe(recipe([]), catalog);
  let blocks = 0;
  for (const file of files.filter(file => file.startsWith('frontend/') && /\.[jt]sx?$/.test(file))) {
    const source = readFileSync(join(root, file), 'utf8');
    if (!/reusable-base:[a-z]+:start/.test(source)) continue;
    blocks++;
    const projected = projectComposerFrontend(file, source, composition);
    assert.doesNotThrow(() => projectFrontendPackMarkers(projected, { knownPacks: new Set(Object.keys(manifest.packs)), excludedPacks: new Set(), label: file }));
  }
  assert.ok(blocks >= 10);
  assert.throws(() => projectComposerFrontend('frontend/src/app/new.tsx', '/* reusable-base:demo:start */\nhello\n/* reusable-base:demo:end */\n', composition), /Unclassified/);
});

test('dashboard, notifications and optional address book blocks follow their domains rather than coarse packs', () => {
  const composition = resolveProjectRecipe(recipe(['mail']), catalog);
  const project = path => projectComposerFrontend(path, readFileSync(join(root, path), 'utf8'), composition);
  assert.doesNotMatch(project('frontend/src/app/page.tsx'), /dataPromise: getDashboardData\(\)/);
  assert.doesNotMatch(project('frontend/src/app/components/layout/header.tsx'), /import \{ HeaderNotifications \}/);
  assert.doesNotMatch(project('frontend/src/app/admin/collaboration/mail-send/MailSendHubClient.tsx'), /import .*recipientAddressBookSource/);
});

test('custom RBAC projection preserves selected assertions and removes only absent surfaces', () => {
  const file = 'api-server/src/test/java/nuri/security/RbacDemoSurfaceAuthorizationMatrixTest.java';
  const source = readFileSync(join(root, file), 'utf8');
  const survey = projectComposerJava(file, source, { resolvedDomains: ['survey'] });
  assert.match(survey, /explicitSurveyReadGrantWorksWithoutAnAdministrativeGroup/);
  assert.match(survey, /ordinaryPollParticipantCannotCreateUpdateOrDeletePolls/);
  assert.doesNotMatch(survey, /@MockitoBean private nuri\.business\.service\.stats/);
  assert.doesNotMatch(survey, /@Test void ordinaryStatisticsReader/);
  const stats = projectComposerJava(file, source, { resolvedDomains: ['stats'] });
  assert.match(stats, /delegatedStatisticsPermissionAllowsAdministrativeReadsWithoutAnAdminGroup/);
  assert.doesNotMatch(stats, /get\("\/api\/v1\/admin\/system\/banners"/);
  assert.doesNotMatch(stats, /@Test void explicitSurvey/);
  assert.throws(() => projectComposerJava(file, source.replace('explicitSurveyReadGrantWorksWithoutAnAdministrativeGroup', 'renamed'), { resolvedDomains: ['stats'] }), /contract drifted/);
});

test('selected-source survival rejects collateral deletion and allows explicitly excluded child features', t => {
  const base = realpathSync(tmpdir());
  const fixture = mkdtempSync(join(base, 'composer-source-'));
  t.after(() => {
    const child = relative(base, realpathSync(fixture));
    assert.ok(child.startsWith('composer-source-') && !child.includes(sep));
    rmSync(fixture, { recursive: true, force: true });
  });
  const upstream = join(fixture, 'upstream');
  const output = join(fixture, 'output');
  for (const base of [upstream, output]) {
    mkdirSync(join(base, 'frontend/src/board/template'), { recursive: true });
    writeFileSync(join(base, 'frontend/src/board/page.tsx'), 'board');
  }
  writeFileSync(join(upstream, 'frontend/src/board/template/page.tsx'), 'template');
  const composition = { profile: 'custom', resolvedDomains: [], frontend: { includedPaths: ['src/board'], removePaths: ['src/board/template'] } };
  assert.doesNotThrow(() => assertComposerSourceSurvives(upstream, output, composition));
  writeFileSync(join(upstream, 'frontend/src/board/required.tsx'), 'required');
  assert.throws(() => assertComposerSourceSurvives(upstream, output, composition), /Selected capability source/);
});

test('validated DB bundle requires the exact locked SQL population and unchanged raw file bytes', t => {
  const base = realpathSync(tmpdir());
  const fixture = mkdtempSync(join(base, 'composer-db-files-'));
  t.after(() => {
    const child = relative(base, realpathSync(fixture));
    assert.ok(child.startsWith('composer-db-files-') && !child.includes(sep));
    rmSync(fixture, { recursive: true, force: true });
  });
  const sqlNames = ['V1_0__baseline.sql', 'V1_1__seed_meta_standard.sql', 'R__seed_framework.sql', 'R__zz_seed_base_admin.sql'];
  const migrationFiles = {};
  for (const [index, name] of sqlNames.entries()) {
    const bytes = Buffer.from(`-- isolated synthetic bundle ${index}\r\nSELECT ${index};\r\n`);
    writeFileSync(join(fixture, name), bytes);
    migrationFiles[`db/migration/${name}`] = createHash('sha256').update(bytes).digest('hex');
  }
  const lock = { validated: true, migrationFiles };
  assert.doesNotThrow(() => verifyCompositionDatabaseFiles(fixture, lock));
  assert.throws(() => verifyCompositionDatabaseFiles(fixture, { ...lock, validated: false }), /validated/);
  assert.throws(() => verifyCompositionDatabaseFiles(fixture, { migrationFiles }), /validated/);
  const original = readFileSync(join(fixture, sqlNames[0]));
  writeFileSync(join(fixture, sqlNames[0]), original.toString('utf8').replaceAll('\r\n', '\n'));
  assert.throws(() => verifyCompositionDatabaseFiles(fixture, lock), /checksum/);
  writeFileSync(join(fixture, sqlNames[0]), original);
  const escaped = structuredClone(lock);
  escaped.migrationFiles['db/migration/../../outside.sql'] = escaped.migrationFiles[`db/migration/${sqlNames[0]}`];
  delete escaped.migrationFiles[`db/migration/${sqlNames[0]}`];
  assert.throws(() => verifyCompositionDatabaseFiles(fixture, escaped), /identity/);
  writeFileSync(join(fixture, 'V9__unexpected.sql'), '-- an unvalidated extra migration');
  assert.throws(() => verifyCompositionDatabaseFiles(fixture, lock), /population/);
  rmSync(join(fixture, 'V9__unexpected.sql'));
  assert.doesNotThrow(() => verifyCompositionDatabaseFiles(fixture, lock));
});
