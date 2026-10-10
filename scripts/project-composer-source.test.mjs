import test from 'node:test';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { compositionDigest, loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';
import { assertCompositionDatabaseLock, composerProfile, domainSupportFiles, projectComposerFrontend, projectComposerJava, assertComposerSourceSurvives, verifyCompositionDatabaseFiles } from './project-composer-source.mjs';
import { writeProjectedManifest } from './generate-reusable-base-source.mjs';
import { frontendImportSpecifiers, projectFrontendPackMarkers, resolveFrontendImport } from './reusable-source-frontend.mjs';
import { planJavaRemoval } from './reusable-source-java.mjs';
import { deriveEventSources, requiresClosure, sourceOwner } from './project-composer-integrations.mjs';
import { copySourceTree, trackedAndUntrackedFiles } from './reusable-source-tree.mjs';

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
const integrityGates = [
  ['api-server/src/test/java/nuri/api/schema/AssignmentRecipientIntegrityIntegrationTest.java', ['note', 'notification']],
  ['api-server/src/test/java/nuri/api/schema/MemoReportRecipientIntegrityIntegrationTest.java', 'memoreport'],
  ['api-server/src/test/java/nuri/api/schema/CommunityDecisionConcurrencyIntegrationTest.java', 'system'],
  ['api-server/src/test/java/nuri/api/schema/CommunityTemplateIntegrityIntegrationTest.java', ['system', 'template']],
  ['api-server/src/test/java/nuri/api/schema/EventApprovalIntegrityIntegrationTest.java', 'operation'],
  ['api-server/src/test/java/nuri/api/schema/NotificationDurabilityIntegrationTest.java', 'notification'],
  ['api-server/src/test/java/nuri/api/schema/TemplateCreationIntegrityIntegrationTest.java', 'template'],
  ['api-server/src/test/java/nuri/api/schema/AddressBookSnapshotConcurrencyIntegrationTest.java', 'addressbook'],
  ['api-server/src/test/java/nuri/api/schema/SmsDeliveryStateIntegrationTest.java', 'sms'],
  ['api-server/src/test/java/nuri/api/schema/ApprovalWorkflowIntegrationTest.java', ['informalsanction', 'notification']],
  ['api-server/src/test/java/nuri/api/schema/ReferenceIntegrityCommunityFkIntegrationTest.java', ['board', 'system']],
  ['api-server/src/test/java/nuri/api/schema/SurveySubmissionConcurrencyIntegrationTest.java', 'survey'],
];
const gateDomains = owner => Array.isArray(owner) ? owner : [owner];
const gateSelected = (selected, owner) => gateDomains(owner).every(domain => selected.includes(domain));

const displayNameSupport = [
  'foundation/src/main/java/nuri/foundation/core/user/UserDisplayNameLookup.java',
  'business-core/src/main/java/nuri/business/service/user/UserDisplayNameLookupService.java',
  'business-core/src/test/java/nuri/business/service/user/UserDisplayNameLookupServiceTest.java',
];
const smsApiSources = [
  'api-server/src/main/java/nuri/api/integration/sms/NaverSensSmsConfiguration.java',
  'api-server/src/main/java/nuri/api/integration/sms/NaverSensSmsProperties.java',
  'api-server/src/main/java/nuri/api/integration/sms/NaverSensSmsSender.java',
  'api-server/src/test/java/nuri/api/integration/sms/NaverSensSmsSenderTest.java',
];

test('SMS API support follows the optional domain in the real generator removal plan', () => {
  assert.deepEqual(manifest.packs.collaboration.backend.domainSupportFiles?.sms, [smsApiSources[1]]);
  for (const selected of [[], ['sms']]) {
    const composition = resolveProjectRecipe(recipe(selected), catalog);
    const profile = composerProfile(manifest, composition);
    const plan = planJavaRemoval(root, manifest, profile, java);
    for (const file of smsApiSources) assert.equal(plan.removed.has(join(root, file)), !selected.includes('sms'), `${file}: exact SMS owner`);
  }
  for (const [name, profile] of Object.entries(manifest.profiles)) {
    const plan = planJavaRemoval(root, manifest, profile, java);
    for (const file of smsApiSources) assert.equal(plan.removed.has(join(root, file)), name === 'core', `${name}: ${file}`);
  }
  const unowned = structuredClone(manifest);
  delete unowned.packs.collaboration.backend.domainSupportFiles.sms;
  const excluded = composerProfile(unowned, resolveProjectRecipe(recipe([]), catalog));
  assert.equal(planJavaRemoval(root, unowned, excluded, java).removed.has(join(root, smsApiSources[1])), false,
    'removing the exact support declaration reproduces the isolated Properties survivor');
});

const templatePolicySupport = [
  'foundation/src/main/java/nuri/foundation/core/template/TemplateAssignmentPolicy.java',
  'business-app/src/main/java/nuri/business/service/template/TemplateAssignmentPolicyService.java',
  'business-app/src/test/java/nuri/business/service/template/TemplateAssignmentPolicyServiceTest.java',
];

test('template assignment policy follows its only consumer, community, in the real generator removal plan', () => {
  assert.deepEqual(manifest.packs.demo.backend.domainSupportFiles?.system, templatePolicySupport);
  for (const [selected, kept] of [[['template'], false], [['system'], true], [[], false]]) {
    const composition = resolveProjectRecipe(recipe(selected), catalog);
    const plan = planJavaRemoval(root, manifest, composerProfile(manifest, composition), java);
    for (const file of templatePolicySupport) assert.equal(plan.removed.has(join(root, file)), !kept, `${selected}: ${file}`);
  }
  for (const [name, profile] of Object.entries(manifest.profiles)) {
    const plan = planJavaRemoval(root, manifest, profile, java);
    for (const file of templatePolicySupport) assert.equal(plan.removed.has(join(root, file)), name !== 'demo', `${name}: ${file}`);
  }
  // 커뮤니티가 구현을 요구한다는 사실을 카탈로그가 기록해야, 커뮤니티 선택이 템플릿 없이 해석되지 않는다.
  assert.ok(catalog.capabilities.find(row => row.id === 'system').requires
    .some(row => row.domain === 'template' && row.kind === 'java' && row.evidence === templatePolicySupport[1]), 'system requires the template implementation');
  // 선언이 없으면 템플릿 단독 생성물에 소비자 없는 @Service 가 남는다 — 생성물 검증의 도달 불가 서비스 게이트가 실패한 경로다.
  const unowned = structuredClone(manifest);
  delete unowned.packs.demo.backend.domainSupportFiles.system;
  const templateOnly = composerProfile(unowned, resolveProjectRecipe(recipe(['template']), catalog));
  assert.equal(planJavaRemoval(root, unowned, templateOnly, java).removed.has(join(root, templatePolicySupport[1])), false,
    'removing the support declaration reproduces the unreachable template-only provider');
});

test('new management HTTP matrices project every selected surface and reject an unowned addition', () => {
  const file = 'api-server/src/test/java/nuri/security/RbacDemoSurfaceAuthorizationMatrixTest.java';
  const source = readFileSync(join(root, file), 'utf8');
  const owners = new Map([
    ['/api/v1/admin/operation/events', 'operation'],
    ['/api/v1/admin/operation/rewards', 'operation'],
    ['/api/v1/help/hpcm', 'help'],
    ['/api/v1/help/manuals', 'help'],
    ['/api/v1/admin/system/banners', 'system'],
    ['/api/v1/admin/system/popups', 'system'],
    ['/api/v1/admin/system/templates', 'template'],
  ]);
  const paths = value => [...value.matchAll(/new ManagedSurface\("([^"]+)"/g)].map(match => match[1]);
  const sharedMethod = (value, name) => value.match(new RegExp(`^(?:    @[^\\r\\n]*\\r?\\n)*    (?:void|static Stream<Arguments>|private void) ${name}\\([\\s\\S]*?^    \\}`, 'm'))?.[0];
  assert.deepEqual(paths(source), [...owners.keys()], 'the management surface inventory is exact');
  for (const selected of [['operation'], ['help'], ['system'], ['template'], ['survey'], ['informalsanction'], ['operation', 'help', 'system', 'template']]) {
    const projected = projectComposerJava(file, source, { resolvedDomains: selected });
    assert.deepEqual(paths(projected), [...owners].filter(([, owner]) => selected.includes(owner)).map(([path]) => path), `${selected}: absent management APIs must not execute`);
    if (selected.some(domain => [...owners.values()].includes(domain))) {
      for (const method of ['managementWriteRequiresItsExactHttpPermission', 'managementWritesWithoutExactPermission', 'exactManagementGrantsIndependentlyAllowRealHttpCrud', 'assertStoredName']) {
        assert.ok(sharedMethod(source, method), `${method}: shared contract exists`);
        assert.equal(sharedMethod(projected, method), sharedMethod(source, method), `${selected}: preserve every allowed and denied/readback assertion byte-for-byte`);
      }
      assert.match(projected, /Stream\.of\(HttpMethod\.POST, HttpMethod\.PUT, HttpMethod\.DELETE\)/);
      assert.match(projected, /Stream\.of\(RbacAuthorizationMatrixTest\.MissingGrant\.values\(\)\)/);
    } else {
      assert.doesNotMatch(projected, /void managementWriteRequiresItsExactHttpPermission\(/);
      assert.doesNotMatch(projected, /void exactManagementGrantsIndependentlyAllowRealHttpCrud\(/);
    }
    const profile = composerProfile(manifest, { profile: 'custom', packs: ['core', 'demo'], resolvedDomains: selected, frontend: { removePaths: [] } });
    assert.ok(!profile.acknowledgedRemovedGates.some(row => row.file === file), `${selected}: the selected RBAC surface must retain its gate`);
    assert.equal(planJavaRemoval(root, manifest, profile, java).removed.has(join(root, file)), false, `${selected}: actual dependency projection must preserve the selected RBAC gate`);
  }
  assert.throws(() => projectComposerJava(file, source.replace('/api/v1/help/manuals', '/api/v1/help/new-api'), { resolvedDomains: ['help'] }), /RBAC.*(inventory|owner|contract).*drifted/i);
});

function supportFixture(t) {
  const base = realpathSync(tmpdir());
  const directory = mkdtempSync(join(base, 'composer-support-'));
  t.after(() => {
    const child = relative(base, realpathSync(directory));
    assert.ok(child.startsWith('composer-support-') && !child.includes(sep));
    rmSync(directory, { recursive: true, force: true });
  });
  const sources = new Map([
    [displayNameSupport[0], 'package nuri.foundation.core.user; public interface UserDisplayNameLookup {}'],
    [displayNameSupport[1], 'package nuri.business.service.user; import nuri.foundation.core.user.UserDisplayNameLookup; class UserDisplayNameLookupService implements UserDisplayNameLookup {}'],
    [displayNameSupport[2], 'package nuri.business.service.user; class UserDisplayNameLookupServiceTest { UserDisplayNameLookupService service; }'],
    ['business-app/src/main/java/nuri/business/service/memoreport/MemoReportService.java', 'package nuri.business.service.memoreport; import nuri.foundation.core.user.UserDisplayNameLookup; class MemoReportService { UserDisplayNameLookup lookup; }'],
  ]);
  for (const [file, source] of sources) {
    mkdirSync(dirname(join(directory, file)), { recursive: true });
    writeFileSync(join(directory, file), source);
  }
  const manifest = { packs: { core: { backend: { appDomains: [] } }, demo: { backend: {
    appDomains: ['memoreport'], domainSupportFiles: { memoreport: [...displayNameSupport] },
  } } } };
  return { directory, manifest, java: [...sources.keys()].map(file => join(directory, file)) };
}

test('domain support follows its selected consumer without weakening mandatory dependency guards', t => {
  const { directory, manifest, java } = supportFixture(t);
  for (const profile of [
    { packs: ['core'] },
    { packs: ['core', 'demo'], resolvedDomains: [] },
  ]) {
    const plan = planJavaRemoval(directory, manifest, profile, java);
    for (const file of displayNameSupport) assert.ok(plan.removed.has(join(directory, file)), `${file}: excluded consumer must remove its support`);
  }
  for (const profile of [
    { packs: ['core', 'demo'] },
    { packs: ['core', 'demo'], resolvedDomains: ['memoreport'] },
  ]) {
    assert.equal(planJavaRemoval(directory, manifest, profile, java).removed.size, 0);
  }
  const required = join(directory, 'business-core/src/main/java/nuri/business/service/user/RequiredService.java');
  writeFileSync(required, 'package nuri.business.service.user; import nuri.foundation.core.user.UserDisplayNameLookup; class RequiredService { UserDisplayNameLookup lookup; }');
  assert.throws(() => planJavaRemoval(directory, manifest, { packs: ['core'] }, [...java, required]), /필수 모듈이 제외 domain을 참조한다/);
});

test('domain support rejects unsafe, missing, duplicate and unowned declarations', t => {
  const { directory, manifest, java } = supportFixture(t);
  for (const files of [
    ['../outside.java'],
    ['foundation/src/main/java/../../outside.java'],
    ['foundation/src/main/java/nuri/Missing.java'],
    ['api-server/src/main/java/nuri/api/integration/sms/../../Outside.java'],
    ['api-server/src/main/java/nuri/api/integration/sms/Missing.java'],
    [displayNameSupport[0], displayNameSupport[0]],
  ]) {
    const changed = structuredClone(manifest);
    changed.packs.demo.backend.domainSupportFiles.memoreport = files;
    assert.throws(() => planJavaRemoval(directory, changed, { packs: ['core'] }, java), /support/i);
  }
  const changed = structuredClone(manifest);
  changed.packs.demo.backend.domainSupportFiles.unknown = [displayNameSupport[0]];
  assert.throws(() => planJavaRemoval(directory, changed, { packs: ['core'] }, java), /support/i);
  changed.packs.demo.backend.appDomains.push('unknown');
  assert.throws(() => planJavaRemoval(directory, changed, { packs: ['core'] }, java), /duplicate domain support/i);
  // 업무 앱 파일은 다른 선택 도메인의 디렉터리에 있을 때만 지원 파일이다. 자기 디렉터리는 이미 자기 소유이고,
  // 어느 pack 에도 없는 도메인 디렉터리는 선택으로 되살릴 수 없다. 파일이 실제로 있어도 형식에서 거부한다.
  const own = 'business-app/src/main/java/nuri/business/service/memoreport/MemoReportService.java';
  const foreign = 'business-app/src/main/java/nuri/business/service/orphan/OrphanPolicy.java';
  mkdirSync(dirname(join(directory, foreign)), { recursive: true });
  writeFileSync(join(directory, foreign), 'package nuri.business.service.orphan; class OrphanPolicy {}');
  for (const file of [own, foreign]) {
    const rejected = structuredClone(manifest);
    rejected.packs.demo.backend.domainSupportFiles.memoreport = [file];
    assert.throws(() => planJavaRemoval(directory, rejected, { packs: ['core'] }, java), /Invalid or duplicate domain support file/, file);
  }
  const accepted = structuredClone(manifest);
  accepted.packs.core.backend.appDomains = ['orphan'];
  accepted.packs.demo.backend.domainSupportFiles.memoreport = [foreign];
  assert.ok(planJavaRemoval(directory, accepted, { packs: ['core'] }, [...java, join(directory, foreign)]).removed.has(join(directory, foreign)),
    'a selected domain directory file owned by an excluded consumer is removed');
});

test('API support is removed or survives with its exact consumer and cannot silently disappear', t => {
  const { directory, manifest, java } = supportFixture(t);
  const file = 'api-server/src/main/java/nuri/api/integration/memoreport/LocalProperties.java';
  mkdirSync(dirname(join(directory, file)), { recursive: true });
  writeFileSync(join(directory, file), 'package nuri.api.integration.memoreport; class LocalProperties {}');
  manifest.packs.demo.backend.domainSupportFiles.memoreport.push(file);
  const allJava = [...java, join(directory, file)];
  assert.ok(planJavaRemoval(directory, manifest, { packs: ['core'] }, allJava).removed.has(join(directory, file)));
  assert.equal(planJavaRemoval(directory, manifest, { packs: ['core', 'demo'], resolvedDomains: ['memoreport'] }, allJava).removed.size, 0);
  const output = join(directory, 'output');
  for (const source of allJava) {
    const path = relative(directory, source);
    mkdirSync(dirname(join(output, path)), { recursive: true });
    writeFileSync(join(output, path), readFileSync(source));
  }
  const composition = { profile: 'custom', resolvedDomains: ['memoreport'], frontend: { includedPaths: [], removePaths: [] } };
  assert.doesNotThrow(() => assertComposerSourceSurvives(directory, output, composition, manifest));
  rmSync(join(output, file));
  assert.throws(() => assertComposerSourceSurvives(directory, output, composition, manifest), /Selected capability source was removed: api-server/);
  // 생성 단계는 이 실패를 코드로 엔진에 알린다. 세부 정보는 저장소 기준 '/' 경로다.
  assert.throws(() => assertComposerSourceSurvives(directory, output, composition, manifest),
    error => error.code === 'SOURCE_SURVIVAL' && JSON.stringify(error.details) === JSON.stringify({ files: [file.split(sep).join('/')] }));
});

test('a selected domain directory may lose only the support owned by an excluded consumer', t => {
  const { directory, manifest } = supportFixture(t);
  const foreign = 'business-app/src/main/java/nuri/business/service/orphan/OrphanPolicy.java';
  const sibling = 'business-app/src/main/java/nuri/business/service/orphan/OrphanService.java';
  for (const [file, source] of [[foreign, 'package nuri.business.service.orphan; class OrphanPolicy {}'], [sibling, 'package nuri.business.service.orphan; class OrphanService {}']]) {
    mkdirSync(dirname(join(directory, file)), { recursive: true });
    writeFileSync(join(directory, file), source);
  }
  manifest.packs.core.backend.appDomains = ['orphan'];
  manifest.packs.demo.backend.domainSupportFiles.memoreport = [foreign];
  const output = join(directory, 'output');
  mkdirSync(dirname(join(output, sibling)), { recursive: true });
  writeFileSync(join(output, sibling), readFileSync(join(directory, sibling)));
  const composition = selected => ({ profile: 'custom', resolvedDomains: selected, frontend: { includedPaths: [], removePaths: [] } });
  // 생성기가 템플릿 단독에서 커뮤니티 전용 구현을 지운 뒤 "선택된 소스가 지워졌다" 로 실패하던 경로다.
  assert.doesNotThrow(() => assertComposerSourceSurvives(directory, output, composition(['orphan']), manifest));
  assert.throws(() => assertComposerSourceSurvives(directory, output, composition(['orphan', 'memoreport']), manifest),
    /Selected capability source was removed: business-app[\\/]src[\\/]main[\\/]java[\\/]nuri[\\/]business[\\/]service[\\/]orphan[\\/]OrphanPolicy\.java/);
  rmSync(join(output, sibling));
  assert.throws(() => assertComposerSourceSurvives(directory, output, composition(['orphan']), manifest), /OrphanService\.java/);
});

test('selected domain support cannot disappear from a custom artifact', t => {
  const { directory, manifest } = supportFixture(t);
  const output = join(directory, 'output');
  mkdirSync(output);
  const composition = { profile: 'custom', resolvedDomains: ['memoreport'], frontend: { includedPaths: [], removePaths: [] } };
  const consumer = 'business-app/src/main/java/nuri/business/service/memoreport/MemoReportService.java';
  for (const file of [consumer, ...displayNameSupport]) {
    mkdirSync(dirname(join(output, file)), { recursive: true });
    writeFileSync(join(output, file), readFileSync(join(directory, file)));
  }
  assert.doesNotThrow(() => assertComposerSourceSurvives(directory, output, composition, manifest));
  rmSync(join(output, displayNameSupport[1]));
  assert.throws(() => assertComposerSourceSurvives(directory, output, composition, manifest), /Selected capability source/);
});

test('custom manifest domain support follows exact selected domains', t => {
  const { directory, manifest } = supportFixture(t);
  mkdirSync(join(directory, 'config'));
  for (const pack of Object.values(manifest.packs)) pack.database = { tables: [], sequences: [] };
  const lock = { generatedAt: '2026-09-27T00:00:00Z', tables: [], sequences: [] };
  const profile = { packs: ['core', 'demo'] };
  for (const resolvedDomains of [[], ['memoreport']]) {
    writeProjectedManifest(directory, manifest, 'custom', profile, lock, {
      profile: 'custom', resolvedDomains, tables: [], explicitSequences: [],
    });
    const projected = JSON.parse(readFileSync(join(directory, 'config/reusable-base-profiles.json'), 'utf8'));
    assert.deepEqual(projected.packs.demo.backend.domainSupportFiles, resolvedDomains.length ? { memoreport: displayNameSupport } : {});
  }
});

test('custom projection keeps every selected table owned, including a shared table whose owner pack is not selected', t => {
  // 템플릿만 고르면 tb_tmplt_info 의 소유 pack(collaboration)이 구성에 없다. 종전에는 투영 매니페스트의 어느 pack 도
  //   그 테이블을 갖지 않아, 생성 마지막의 거버넌스 무결성 검사(테이블 목록 불일치)가 실패했다.
  const base = realpathSync(tmpdir());
  const directory = mkdtempSync(join(base, 'composer-shared-table-'));
  t.after(() => {
    const child = relative(base, realpathSync(directory));
    assert.ok(child.startsWith('composer-shared-table-') && !child.includes(sep));
    rmSync(directory, { recursive: true, force: true });
  });
  mkdirSync(join(directory, 'config'));
  for (const [domains, owner] of [[['template'], 'demo'], [['board', 'template'], 'collaboration']]) {
    const composition = resolveProjectRecipe(recipe(domains), catalog);
    const profile = composerProfile(manifest, composition);
    writeProjectedManifest(directory, structuredClone(manifest), 'custom', profile,
      { generatedAt: '2026-10-08T00:00:00Z', tables: composition.tables, sequences: [] }, composition);
    const projected = JSON.parse(readFileSync(join(directory, 'config/reusable-base-profiles.json'), 'utf8'));
    const owned = Object.values(projected.packs).flatMap(pack => pack.database.tables);
    assert.deepEqual([...owned].sort(), [...composition.tables].sort(), `${domains}: each selected table has exactly one pack owner`);
    const contract = projected.sharedTableContracts.find(row => row.table === 'tb_tmplt_info');
    assert.equal(contract?.ownerPack, owner, `${domains}: the shared table owner follows the selected packs`);
    for (const row of projected.sharedTableContracts) {
      assert.ok(projected.packs[row.ownerPack]?.database.tables.includes(row.table), `${domains}: ${row.table} owner pack holds the table`);
    }
  }
});

test('source copying excludes restricted skill trees while preserving ordinary source and the producer', t => {
  const base = realpathSync(tmpdir());
  const fixture = mkdtempSync(join(base, 'composer-copy-'));
  t.after(() => {
    const child = relative(base, realpathSync(fixture));
    assert.ok(child.startsWith('composer-copy-') && !child.includes(sep));
    rmSync(fixture, { recursive: true, force: true });
  });
  const sourceRoot = join(fixture, 'source');
  const output = join(fixture, 'output');
  const excluded = ['docx', 'pdf', 'pptx', 'xlsx'].flatMap(skill => [
    `.agent/skills/${skill}/SKILL.md`,
    `.agent/skills/${skill}/scripts/nested/tool.js`,
    `.agent/skills/${skill}/LICENSE.txt`,
  ]);
  const retained = [
    'frontend/src/new-local-file.ts',
    '.agent/skills/db-governance/SKILL.md',
    '.agent/skills/pdf-extra/SKILL.md',
    '.agent/skills/docx-helper/SKILL.md',
    'docs/pdf/guide.md',
    'gradlew',
  ];
  const files = [...excluded, ...retained];
  const content = file => `synthetic source fixture: ${file}\n`;
  for (const file of files) {
    mkdirSync(dirname(join(sourceRoot, file)), { recursive: true });
    writeFileSync(join(sourceRoot, file), content(file));
  }
  copySourceTree(output, { sourceRoot, files });
  for (const file of excluded) {
    assert.equal(existsSync(join(output, file)), false, `${file} must not be redistributed`);
  }
  for (const file of retained) assert.equal(readFileSync(join(output, file), 'utf8'), content(file));
  for (const file of files) assert.equal(readFileSync(join(sourceRoot, file), 'utf8'), content(file));
});

function assertIntegrityGateAcknowledgements(profile, selected) {
  for (const [file, owner] of integrityGates) {
    const acknowledgements = (profile.acknowledgedRemovedGates ?? []).filter(row => row.file === file);
    assert.equal(acknowledgements.length, gateSelected(selected, owner) ? 0 : 1, `${file}: acknowledged removal must follow its owner`);
    for (const row of acknowledgements) assert.ok(row.reason.trim().length > 0);
  }
}

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

// [2026-09-30 DEC-OPS-182] 제한 스킬은 산출물에서 빼는 것만으로 부족하다 — 공개 원본 저장소가 추적하면 그 자체가 배포다.
test('restricted Anthropic skills are neither tracked nor re-addable in the source repository', () => {
  const restricted = ['docx', 'pdf', 'pptx', 'xlsx'].map(skill => `.agent/skills/${skill}`);
  const tracked = spawnSync('git', ['ls-files', '--', ...restricted], { cwd: root, encoding: 'utf8' });
  assert.equal(tracked.status, 0);
  assert.equal(tracked.stdout.trim(), '', `restricted skills are tracked again:
${tracked.stdout}`);
  for (const directory of restricted) {
    const ignored = spawnSync('git', ['check-ignore', '-q', `${directory}/SKILL.md`], { cwd: root });
    assert.equal(ignored.status, 0, `${directory} must stay ignored`);
  }
  // 같은 폴더의 다른 스킬(Apache-2.0 포함)은 계속 추적할 수 있어야 한다.
  for (const allowed of ['.agent/skills/db-governance/SKILL.md', '.agent/skills/skill-creator/SKILL.md', '.agent/skills/pdf-extra/SKILL.md']) {
    assert.equal(spawnSync('git', ['check-ignore', '-q', allowed], { cwd: root }).status, 1, `${allowed} must not be ignored`);
  }
});

test('every selectable capability preserves its declared frontend and mandatory entrypoints through actual import projection', () => {
  assert.equal(catalog.capabilities.length, 19, 'review the capability population when its declaration changes');
  for (const feature of catalog.capabilities) {
    const result = inspectFrontendSurvival([feature.id]);
    assert.ok(result.expectedCount > 3, `${feature.id} has no declared frontend population`);
    assert.deepEqual(result.missing, [], `${feature.id}: selected sources must not disappear through a shared import`);
  }
});

test('removing a shared UI dependency exposes the selected page loss instead of silently passing', () => {
  // Phase 0c: 통계는 core 라 설문·게시판과 통계 사이의 화면 의존이 사라졌다(survey <-> stats 삭제).
  for (const [from, dependency] of [['system', 'template']]) {
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
  // 선택 연동 판정이 정한 이벤트 소스(리스너·발행 위치)의 소유 기능은 생성기의 실제 연쇄 제거와 같아야 한다.
  //   다르면 판정이 core 로 본 파일이 실제로는 기능과 함께 지워져 연동이 숨는다(같은 패키지 단순 이름 참조 등).
  const supportOwners = new Map([...domainSupportFiles(root, manifest)].flatMap(([owner, files]) => files.map(file => [file, owner])));
  const eventSources = deriveEventSources(root, sourceOwner(supportOwners, catalog.capabilities.map(row => row.id), requiresClosure(catalog.capabilities)));
  const eventOwners = new Map([...eventSources.listeners, ...eventSources.constructions].map(row => [row.path, row.owner]));
  assert.ok(eventOwners.size >= 15, 'the census reads real event sources');
  for (const domain of catalog.capabilities.map(row => row.id)) {
    const composition = resolveProjectRecipe(recipe([domain]), catalog);
    const profile = composerProfile(manifest, composition);
    const plan = planJavaRemoval(root, manifest, profile, java);
    for (const [path, owner] of eventOwners) {
      assert.equal(!plan.removed.has(join(root, path)), owner === 'core' || composition.resolvedDomains.includes(owner),
        `${domain}: event source ${path} is owned by ${owner} in the census but the generator ${plan.removed.has(join(root, path)) ? 'removes' : 'keeps'} it`);
    }
    for (const file of displayNameSupport) assert.equal(plan.removed.has(join(root, file)), !composition.resolvedDomains.includes('memoreport'), `${domain}: ${file}`);
    assertIntegrityGateAcknowledgements(profile, composition.resolvedDomains);
    // 생성기의 승인 대조와 같은 판정: 실제로 지워지는 Java 게이트와 승인 목록이 정확히 같아야 한다.
    //   위 integrityGates 는 손으로 옮긴 사본이라 빠지면 결함을 못 본다(결재 단독 선택이 DB 단계 뒤에야 실패했다).
    const removedGates = [...plan.removed].filter(path => plan.gateSources.has(path)).map(path => relative(root, path).split(sep).join('/')).sort();
    assert.deepEqual(removedGates, profile.acknowledgedRemovedGates.map(row => row.file).sort(), `${domain}: removed Java gates must equal acknowledgements`);
    for (const [file, owner] of integrityGates) {
      assert.equal(plan.removed.has(join(root, file)), !gateSelected(composition.resolvedDomains, owner), `${domain}: ${file}`);
    }
    // 선택 도메인 디렉터리에서 지워도 되는 것은 제외된 소비자가 소유한 지원 파일뿐이다(템플릿 단독의 커뮤니티 전용 구현).
    const excludedSupport = new Set([...domainSupportFiles(root, manifest)].filter(([owner]) => !composition.resolvedDomains.includes(owner))
      .flatMap(([, supportFiles]) => supportFiles.map(file => join(root, file))));
    for (const selected of composition.resolvedDomains) for (const file of plan.removed) {
      if (excludedSupport.has(file)) continue;
      const path = file.replaceAll('\\', '/');
      assert.ok(!['domain', 'service'].some(layer => path.includes(`/business-app/src/main/java/nuri/business/${layer}/${selected}/`)), `${domain}: unexpectedly removed ${file}`);
    }
  }
});

test('preset integrity gate acknowledgements match the real removal plan', () => {
  for (const [name, profile] of Object.entries(manifest.profiles)) {
    const selected = profile.packs.flatMap(pack => manifest.packs[pack].backend?.appDomains ?? []);
    assertIntegrityGateAcknowledgements(profile, selected);
    const plan = planJavaRemoval(root, manifest, profile, java);
    for (const file of displayNameSupport) assert.equal(plan.removed.has(join(root, file)), !selected.includes('memoreport'), `${name}: ${file}`);
    for (const [file, owner] of integrityGates) {
      assert.equal(plan.removed.has(join(root, file)), !gateSelected(selected, owner), `${name}: ${file}`);
    }
  }
});

test('missing integrity gate ownership is red for a custom composition', async () => {
  const source = readFileSync(join(root, 'scripts/project-composer-source.mjs'), 'utf8').replaceAll('\r\n', '\n');
  const composition = resolveProjectRecipe(recipe([]), catalog);
  for (const [file, owner] of integrityGates) {
    const declaration = `  '${file}': [${gateDomains(owner).map(domain => `'${domain}'`).join(', ')}],\n`;
    assert.ok(source.includes(declaration), `${file}: owner declaration is present before mutation`);
    // data: URL 은 상대 import 를 풀지 못한다. 변이본의 형제 모듈 import 를 절대 파일 URL 로 바꿔 같은 모듈을 쓰게 한다.
    const siblings = `${pathToFileURL(join(root, 'scripts')).href}/`;
    const mutated = source.replace(declaration, '').replaceAll("from './", `from '${siblings}`);
    const mutant = await import(`data:text/javascript;base64,${Buffer.from(mutated).toString('base64')}`);
    assert.throws(() => assertIntegrityGateAcknowledgements(mutant.composerProfile(manifest, composition), []), /acknowledged removal/);
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

test('the unread-notes card on the work home needs both the dashboard and the note domains', () => {
  const file = 'frontend/src/app/UnifiedDashboardClient.tsx';
  const source = readFileSync(join(root, file), 'utf8');
  // The card block is owned by dashboard + note. Today dashboard pulls in note through board, so the
  // card survives with the dashboard; the dual ownership keeps it from dangling if that dependency moves.
  const withoutDashboard = projectComposerFrontend(file, source, resolveProjectRecipe(recipe(['mail']), catalog));
  assert.doesNotMatch(withoutDashboard, /UnreadNotesCard/);
  const withDashboard = projectComposerFrontend(file, source, resolveProjectRecipe(recipe(['dashboard']), catalog));
  assert.match(withDashboard, /import \{ UnreadNotesCard \}/);
  assert.match(withDashboard, /<UnreadNotesCard \/>/);
  const forcedWithoutNote = projectComposerFrontend(file, source, { profile: 'custom', resolvedDomains: ['dashboard', 'board'] });
  assert.doesNotMatch(forcedWithoutNote, /UnreadNotesCard/);
  assert.match(forcedWithoutNote, /업무게시판 글/);
});

test('the statistics shell keeps board and survey tabs only with their owning domains (Phase 0c)', () => {
  const file = 'frontend/src/app/admin/stats/IntelligenceHubClient.tsx';
  const source = readFileSync(join(root, file), 'utf8');
  const project = domains => projectComposerFrontend(file, source, resolveProjectRecipe(recipe(domains), catalog));
  // 통계 셸은 core 다. 설문 탭은 설문이 넘기는 패널이라 설문이 없으면 import·탭·등록이 함께 빠지고, 셸은 설문 서비스를 모른다.
  const coreOnly = project([]);
  assert.doesNotMatch(coreOnly, /StatsHubSurveyTab|'SURVEYS',|SURVEYS: surveyTab/);
  assert.doesNotMatch(coreOnly, /getBbsStats|getDataUsageStats|label="자료 이용 건수"/);
  assert.doesNotMatch(source, /SurveyAdminService/, 'the shell must not import the survey service directly');
  const withSurvey = project(['survey']);
  assert.match(withSurvey, /import \{ useStatsHubSurveyTab \}/);
  assert.match(withSurvey, /SURVEYS: surveyTab/);
  assert.doesNotMatch(withSurvey, /getBbsStats/);
  const withBoard = project(['board']);
  assert.match(withBoard, /getBbsStats/);
  assert.match(withBoard, /getDataUsageStats/);
  assert.doesNotMatch(withBoard, /StatsHubSurveyTab/);
  // 분류가 없는 pack 의 블록은 조용히 남거나 빠지지 않고 실패한다.
  const empty = resolveProjectRecipe(recipe([]), catalog);
  assert.throws(() => projectComposerFrontend(file, `${source}\n/* reusable-base:demo:start */\nx\n/* reusable-base:demo:end */\n`,
    empty), /Unclassified composer UI block/);
  assert.throws(() => projectComposerFrontend('frontend/src/app/admin/stats/AdminStatsClient.tsx',
    '/* reusable-base:survey:start */\nx\n/* reusable-base:survey:end */\n', empty), /Unclassified composer UI block/);
  const admin = 'frontend/src/app/admin/stats/AdminStatsClient.tsx';
  const adminSource = readFileSync(join(root, admin), 'utf8');
  assert.doesNotMatch(projectComposerFrontend(admin, adminSource, empty), /title="누적 게시물"/);
  assert.match(projectComposerFrontend(admin, adminSource, resolveProjectRecipe(recipe(['board']), catalog)), /title="누적 게시물"/);
  // 셸이 core 로 남으므로 기능을 하나도 고르지 않아도, 설문만 골라도 셸·통계 화면이 import 로 사라지지 않는다.
  for (const domains of [[], ['survey']]) assert.deepEqual(inspectFrontendSurvival(domains).missing, [], `${domains}`);
});

test('custom RBAC projection preserves selected assertions and removes only absent surfaces', () => {
  const file = 'api-server/src/test/java/nuri/security/RbacDemoSurfaceAuthorizationMatrixTest.java';
  const source = readFileSync(join(root, file), 'utf8');
  // Phase 0c: 통계 단언은 core 매트릭스로 옮겼다. 이 클래스의 경계는 설문 표지가 잇는다.
  assert.doesNotMatch(source, /nuri\.business\.service\.stats|\/api\/v1\/admin\/system\/statistics/);
  const survey = projectComposerJava(file, source, { resolvedDomains: ['survey'] });
  assert.match(survey, /SURVEY_PACK_BOUNDARY = nuri\.business\.service\.survey\.SurveyService\.class/);
  assert.match(survey, /explicitSurveyReadGrantWorksWithoutAnAdministrativeGroup/);
  assert.match(survey, /ordinaryPollParticipantCannotCreateUpdateOrDeletePolls/);
  assert.doesNotMatch(survey, /@Test void ordinaryUserCannotEnterDemoOwnedAdministrativeEndpoints/);
  const system = projectComposerJava(file, source, { resolvedDomains: ['system'] });
  // 설문이 없으면 표지를 지워 남은 표면(배너·팝업)의 단언이 연쇄 제거되지 않게 한다.
  assert.doesNotMatch(system, /SurveyService/);
  assert.match(system, /get\(path\)\.with\(user\(ordinary\)\)\)\.andExpect\(status\(\)\.isForbidden\(\)\)/);
  assert.match(system, /List\.of\("\/api\/v1\/admin\/system\/banners"/);
  assert.doesNotMatch(system, /\/api\/v1\/admin\/system\/ism\/1\/confirm/);
  assert.doesNotMatch(system, /@Test void explicitSurvey/);
  assert.throws(() => projectComposerJava(file, source.replace('explicitSurveyReadGrantWorksWithoutAnAdministrativeGroup', 'renamed'), { resolvedDomains: ['system'] }), /contract drifted/);
  assert.throws(() => projectComposerJava(file, source.replace('Class<?> SURVEY_PACK_BOUNDARY', 'Class<?> RENAMED_BOUNDARY'), { resolvedDomains: ['system'] }), /survey boundary marker drifted/);
  assert.throws(() => projectComposerJava(file, source.replace('ordinaryUserCannotEnterDemoOwnedAdministrativeEndpoints', 'renamed'), { resolvedDomains: ['system'] }), /Mixed RBAC projection contract drifted/);
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
  assert.doesNotThrow(() => assertComposerSourceSurvives(upstream, output, composition, { packs: {} }));
  writeFileSync(join(upstream, 'frontend/src/board/required.tsx'), 'required');
  assert.throws(() => assertComposerSourceSurvives(upstream, output, composition, { packs: {} }), /Selected capability source/);
});

test('validated DB bundle requires the exact locked SQL population and unchanged raw file bytes', t => {
  const base = realpathSync(tmpdir());
  const fixture = mkdtempSync(join(base, 'composer-db-files-'));
  t.after(() => {
    const child = relative(base, realpathSync(fixture));
    assert.ok(child.startsWith('composer-db-files-') && !child.includes(sep));
    rmSync(fixture, { recursive: true, force: true });
  });
  const sqlNames = ['V1_0__baseline.sql', 'V1_1__seed_meta_standard.sql', 'R__seed_framework.sql', 'R__seed_reference_data.sql', 'R__zz_seed_base_admin.sql'];
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

test('the source generator accepts only a validated DB bundle of the same composition and says why otherwise', () => {
  const catalog = loadProjectComposerCatalog(root);
  const composition = resolveProjectRecipe({ schemaVersion: 1, project: { name: 'core' }, sourceRef: 'v1.0.0', selection: { preset: 'core' } }, catalog);
  const lock = { profile: 'core', layout: composition.backendLayout, composition, compositionHash: composition.compositionHash, validated: true };
  assert.doesNotThrow(() => assertCompositionDatabaseLock(lock, composition));
  const { composition: _legacy, ...legacy } = lock;
  assert.throws(() => assertCompositionDatabaseLock(legacy, composition), /검증된 구성 번들이 아니다/, 'a pre-unification profile bundle is refused');
  assert.throws(() => assertCompositionDatabaseLock({ ...lock, validated: undefined }, composition), /검증된 구성 번들이 아니다/);
  assert.throws(() => assertCompositionDatabaseLock({ ...lock, profile: 'demo' }, composition), /DB bundle profile demo != source profile core/);
  assert.throws(() => assertCompositionDatabaseLock({ ...lock, layout: 'single-module' }, composition), /--layout multi-module/);
  assert.throws(() => assertCompositionDatabaseLock({ ...lock, compositionHash: 'f'.repeat(64) }, composition), /composition hash mismatch/);
});
