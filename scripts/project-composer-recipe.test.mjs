import assert from 'node:assert/strict';
import test from 'node:test';
import { compositionDigest, loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { ProjectRecipeError, resolveProjectRecipe, verifyProjectComposition } from './project-composer-recipe.mjs';

const catalog = loadProjectComposerCatalog();
const recipe = selection => ({ schemaVersion: 1, project: { name: 'agency-project' }, sourceRef: 'v1.0.0', selection,
  database: { vendor: 'postgresql' }, backendLayout: 'multi-module' });

test('core plus board and survey includes required UI/domain closure without mail or unrelated packs', () => {
  const plan = resolveProjectRecipe(recipe({ domains: ['board', 'survey'] }), catalog);
  assert.equal(plan.profile, 'custom');
  assert.deepEqual(plan.selectedDomains, ['board', 'survey']);
  assert.deepEqual(plan.resolvedDomains, ['board', 'comment', 'help', 'note', 'scrap', 'stats', 'survey', 'system', 'template']);
  for (const absent of ['mail', 'sms', 'schedule', 'report']) assert.ok(!plan.resolvedDomains.includes(absent));
  assert.ok(!plan.tables.includes('tb_email_dsptch_manage'));
  assert.ok(plan.tables.includes('tb_srvy_info') && plan.tables.includes('tb_tmplt_info'));
  assert.ok(plan.permissionCodes.includes('BOARD_READ') && !plan.permissionCodes.includes('MAIL_SEND'));
  assert.ok(plan.menuRoutes.includes('/admin/help?tab=COMMUNITY'));
  assert.ok(plan.menuRoutes.includes('/admin/collaboration?tab=SCRAPS'));
  assert.ok(plan.frontend.removePaths.includes('src/services/business/mail/MailService.ts'));
  assert.ok(plan.autoIncluded.every(item => item.reason.length > 10));
  assert.deepEqual(plan, resolveProjectRecipe(recipe({ domains: ['survey', 'board'] }), catalog));
});

test('empty/core selection, each independent capability, shared resources and preset semantics remain explicit', () => {
  const core = resolveProjectRecipe(recipe({ domains: [] }), catalog);
  assert.deepEqual(core.resolvedDomains, []);
  assert.deepEqual(core.tables, catalog.core.tables);
  for (const capability of catalog.capabilities) {
    const plan = resolveProjectRecipe(recipe({ domains: [capability.id] }), catalog);
    assert.ok(plan.resolvedDomains.includes(capability.id));
    for (const dependency of capability.requires) assert.ok(plan.resolvedDomains.includes(dependency.domain));
    assert.deepEqual(verifyProjectComposition(JSON.parse(JSON.stringify(plan)), catalog), plan);
  }
  const template = resolveProjectRecipe(recipe({ domains: ['template'] }), catalog);
  assert.deepEqual(template.resolvedDomains, ['template']);
  assert.ok(template.tables.includes('tb_tmplt_info'));
  assert.ok(!template.frontend.removePaths.includes('src/app/admin/sanctn/WorkflowHubClient.tsx'));
  for (const preset of catalog.presets) {
    const plan = resolveProjectRecipe(recipe({ preset: preset.id }), catalog);
    assert.equal(plan.profile, preset.id);
    assert.deepEqual(plan.resolvedDomains, preset.domains);
    assert.deepEqual(plan.packs, preset.packs);
    assert.deepEqual(plan.frontend.removePaths, preset.frontendRemovePaths);
  }
  const collaboration = resolveProjectRecipe(recipe({ preset: 'collaboration' }), catalog);
  assert.ok(!collaboration.resolvedDomains.includes('help'));
  assert.ok(!collaboration.resolvedDomains.includes('system'));
  assert.equal(collaboration.optionalForeignKeys[0].name, 'fk_tb_bbs_master_tb_cmnty_info');
});

test('unsupported or unsafe recipes fail before any generation can start', () => {
  const invalid = [
    { ...recipe({ domains: [] }), schemaVersion: 2 },
    { ...recipe({ domains: [] }), secrets: 'must-not-be-accepted' },
    { ...recipe({ domains: [] }), project: { name: '../escape' } },
    { ...recipe({ domains: [] }), project: { name: 'con' } },
    { ...recipe({ domains: [] }), project: { name: 'valid', password: 'must-not-be-accepted' } },
    { ...recipe({ domains: [] }), sourceRef: '--upload-pack=command' },
    { ...recipe({ domains: [] }), sourceRef: 'main;whoami' },
    { ...recipe({ domains: [] }), sourceRef: 'refs/../head' },
    recipe({ domains: ['unknown'] }), recipe({ domains: ['survey', 'survey'] }),
    recipe({ domains: ['foundation'] }), recipe({ domains: 'survey' }), recipe({}),
    recipe({ domains: [], preset: 'core' }), recipe({ preset: 'missing' }), recipe({ domains: [], extra: true }),
    { ...recipe({ domains: [] }), database: { vendor: 'oracle' } },
    { ...recipe({ domains: [] }), database: { vendor: 'postgresql', password: 'must-not-be-accepted' } },
    { ...recipe({ domains: [] }), backendLayout: 'single' },
  ];
  for (const candidate of invalid) assert.throws(() => resolveProjectRecipe(candidate, catalog), error => error instanceof ProjectRecipeError && error.field.length > 0);
});

test('canonical plans reject caller-injected tables, permission changes and stale catalog hashes', () => {
  const plan = resolveProjectRecipe(recipe({ domains: ['survey'] }), catalog);
  for (const tamper of [
    value => value.tables.push('tb_email_dsptch_manage'),
    value => value.permissionCodes.push('MAIL_SEND'),
    value => { value.resolvedDomains = []; },
    value => { value.compositionHash = '0'.repeat(64); },
    value => { value.unrecognized = true; },
  ]) {
    const changed = structuredClone(plan); tamper(changed);
    assert.throws(() => verifyProjectComposition(changed, catalog), /does not match/);
  }
  assert.deepEqual(verifyProjectComposition({ ...plan, sourceCommit: 'a'.repeat(40) }, catalog), plan);
  const changedCatalog = structuredClone(catalog);
  changedCatalog.capabilities[0].available = false;
  assert.throws(() => resolveProjectRecipe(recipe({ domains: [] }), changedCatalog), /hash mismatch/);
  const { catalogHash, ...body } = changedCatalog;
  changedCatalog.catalogHash = compositionDigest(body);
  assert.throws(() => resolveProjectRecipe(recipe({ domains: [changedCatalog.capabilities[0].id] }), changedCatalog), /not available/);
});

test('layout remains independent of domain and DB semantics', () => {
  const multi = resolveProjectRecipe(recipe({ domains: ['survey'] }), catalog);
  const single = resolveProjectRecipe({ ...recipe({ domains: ['survey'] }), backendLayout: 'single-module' }, catalog);
  for (const key of ['tables', 'explicitSequences', 'permissionCodes', 'resolvedDomains', 'menuRoutes', 'frontend']) assert.deepEqual(single[key], multi[key]);
  assert.notEqual(single.recipeHash, multi.recipeHash);
  assert.notEqual(single.compositionHash, multi.compositionHash);
});
