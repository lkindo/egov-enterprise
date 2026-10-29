import test from 'node:test';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { compositionDigest, loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';
import { assertCompositionDatabaseLock, composerProfile,
  projectComposerJava, assertComposerSourceSurvives, supportFileOwners, verifyCompositionDatabaseFiles } from './project-composer-source.mjs';
import { RETIRED_OWNERSHIP_DECLARATION, composerMarkerDeclarations, composerOwnership, loadComposerModules, markerDeclarationViolations, moduleDatabaseInventory, projectComposerModuleFiles,
  projectedModuleViolations, readComposerModuleFiles, sharedTableTransfers } from './composer-modules.mjs';
import { activeCompositionEntry } from './generate-reusable-base-source.mjs';
import { presetIds } from './composition-profiles.mjs';
import { PROPOSAL_RELATIVE_PATH as DISPOSITION_OVERLAY } from './ui-navigation-disposition-contract.mjs';
import { FRONTEND_LAYOUT, createFrontendProjector, isFrontendModuleFile, parseMarkerBlocks, planFrontendRemoval } from './reusable-source-frontend.mjs';
import { pageSurvivalExpectation, pageSurvivalViolations } from './reusable-page-survival.mjs';
import { planJavaRemoval } from './reusable-source-java.mjs';
import { deriveEventSources, requiresClosure, sourceOwner } from './project-composer-integrations.mjs';
import { SKILL_DISTRIBUTION, copySourceTree, isReusableSkillPath, trackedAndUntrackedFiles } from './reusable-source-tree.mjs';

const root = resolve(import.meta.dirname, '..');
const catalog = loadProjectComposerCatalog(root);
// 생성기는 매니페스트 v2 의 기능 소유와 구성으로 투영한다(11단계 C3). 시험도 같은 입력을 쓴다.
const modules = loadComposerModules(root);
const ownership = composerOwnership(modules);
const recipe = domains => ({ schemaVersion: 1, project: { name: 'composition-test' }, sourceRef: 'main',
  selection: { domains }, database: { vendor: 'postgresql' }, backendLayout: 'multi-module' });
const presetComposition = id => resolveProjectRecipe({ ...recipe([]), selection: { preset: id } }, catalog);
// Match copySourceTree: tracked deletions are absent from the current source projection.
const files = trackedAndUntrackedFiles().filter(file => existsSync(join(root, file)));
const java = files.filter(file => file.endsWith('.java')).map(file => join(root, file));
const frontendFiles = files.filter(file => file.startsWith('frontend/'));
const frontendSources = new Map(frontendFiles.filter(isFrontendModuleFile)
  .map(file => [file, readFileSync(join(root, file), 'utf8')]));
// Java 원문도 한 번만 읽는다(frontendSources 와 같다). 시험 중 저장소 파일은 바뀌지 않으므로 계획들이 같은 원문을 쓴다.
const javaSources = new Map(java.map(path => [path, readFileSync(path, 'utf8')]));
const readJava = path => javaSources.get(path) ?? readFileSync(path, 'utf8');
/*
 * 실제 저장소로 세우는 생성기 계획의 메모. 같은 입력이면 같은 계획이 나오는 결정적 함수라, 같은 구성을 여러 시험이 다시 계산하지 않는다.
 * Java 계획은 저장소 루트·모듈의 기능 소유(ownership)·모듈의 Java 모집단(java)이 같으면 해석된 기능 목록으로만 정해진다 — 키는 정렬한
 * resolvedDomains 다. 다른 소유(지원 파일 선언을 걷은 변형)나 합성 트리는 이 메모를 쓰지 않는다. 프런트 계획은 구성 해시가 키다 — 깨뜨린
 * 카탈로그에서 푼 구성은 카탈로그 해시가 들어가 해시가 달라 섞이지 않는다. 계획 객체는 여러 시험이 함께 읽으므로 고치지 않는다.
 */
const javaPlans = new Map();
const javaPlanFor = profile => {
  const key = JSON.stringify([...profile.resolvedDomains].sort());
  if (!javaPlans.has(key)) javaPlans.set(key, planJavaRemoval(root, ownership, profile, java, { readSource: readJava }));
  return javaPlans.get(key);
};
const frontendPlans = new Map();
function frontendPlanFor(composition) {
  const build = () => {
    const projector = createFrontendProjector({ composition, files: frontendFiles });
    const projected = new Map([...frontendSources].map(([file, source]) => [join(root, file), projector.project(file, source).source]));
    const plan = planFrontendRemoval({ frontendRoot: join(root, 'frontend'), files: frontendFiles.map(file => join(root, file)),
      directPaths: projector.directPaths, readSource: path => projected.get(path) });
    return { projector, projected, plan };
  };
  if (!composition.compositionHash) return build();
  if (!frontendPlans.has(composition.compositionHash)) frontendPlans.set(composition.compositionHash, build());
  return frontendPlans.get(composition.compositionHash);
}
const covers = (prefix, path) => path === prefix || path.startsWith(`${prefix}/`);
// 소유 판정 시험도 생산 projector(createFrontendProjector)를 지난다 — 구성을 주면 기능 투영이다(시작 구성과 직접 선택이 같다).
const projectCustom = (file, source, composition) => createFrontendProjector({ composition }).project(file, source).source;
// 합성 기능 소유({ domains, support: 기능 → 지원 파일 })를 로더와 같은 판정(supportFileOwners)으로 푼다. 생성기는 같은 모양을
// 기능 파일에서 얻는다(composerOwnership). 기능 목록에 없는 기능의 지원 파일 선언은 소유하지 않은 선언으로 거부된다.
const fixtureOwnership = (directory, fixture) => ({ domains: [...fixture.domains].sort(), supportFiles: supportFileOwners(directory,
  Object.entries(fixture.support).map(([domain, files]) => ({ owner: domain, owned: fixture.domains.includes(domain) ? [domain] : [], domain, files })),
  fixture.domains) });
const planWith = (directory, fixture, resolvedDomains, javaFiles) =>
  planJavaRemoval(directory, fixtureOwnership(directory, fixture), { resolvedDomains }, javaFiles);
const integrityGates = [
  ['api-server/src/test/java/nuri/api/schema/AssignmentRecipientIntegrityIntegrationTest.java', ['note', 'notification']],
  ['api-server/src/test/java/nuri/api/schema/MemoReportRecipientIntegrityIntegrationTest.java', 'memoreport'],
  ['api-server/src/test/java/nuri/api/schema/CommunityDecisionConcurrencyIntegrationTest.java', 'community'],
  ['api-server/src/test/java/nuri/api/schema/CommentUpdateDeleteConcurrencyIntegrationTest.java', ['comment', 'board']],
  ['api-server/src/test/java/nuri/api/schema/CommunityTemplateIntegrityIntegrationTest.java', ['community', 'template']],
  ['api-server/src/test/java/nuri/api/schema/EventApprovalIntegrityIntegrationTest.java', 'event'],
  ['api-server/src/test/java/nuri/api/schema/DeptJobReassignmentConcurrencyIntegrationTest.java', 'notification'],
  ['api-server/src/test/java/nuri/api/schema/NotificationDurabilityIntegrationTest.java', 'notification'],
  ['api-server/src/test/java/nuri/api/schema/ScheduleCalendarQueryIntegrationTest.java', 'schedule'],
  ['api-server/src/test/java/nuri/api/schema/TemplateCreationIntegrityIntegrationTest.java', 'template'],
  ['api-server/src/test/java/nuri/api/schema/AddressBookSnapshotConcurrencyIntegrationTest.java', 'addressbook'],
  ['api-server/src/test/java/nuri/api/schema/SmsDeliveryStateIntegrationTest.java', 'sms'],
  ['api-server/src/test/java/nuri/api/schema/MailFailureNotificationIntegrationTest.java', ['mail', 'notification']],
  ['api-server/src/test/java/nuri/api/schema/SmsFailureNoticeIntegrationTest.java', ['sms', 'notification']],
  ['api-server/src/test/java/nuri/api/schema/ApprovalReferenceNotificationIntegrationTest.java', ['informalsanction', 'notification']],
  ['api-server/src/test/java/nuri/api/schema/ApprovalWorkflowIntegrationTest.java', 'informalsanction'],
  ['api-server/src/test/java/nuri/api/schema/ReferenceIntegrityCommunityFkIntegrationTest.java', ['board', 'community']],
  ['api-server/src/test/java/nuri/api/schema/SurveySubmissionConcurrencyIntegrationTest.java', 'survey'],
];
const gateDomains = owner => Array.isArray(owner) ? owner : [owner];
const gateSelected = (selected, owner) => gateDomains(owner).every(domain => selected.includes(domain));
const coreIntegrityGates = [
  'api-server/src/test/java/nuri/api/schema/UserSecurityStateConcurrencyIntegrationTest.java',
  'api-server/src/test/java/nuri/api/schema/OperationalSignalIsolationIntegrationTest.java',
];

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
  assert.deepEqual(modules.files['sms.json'].backend.supportFiles, [smsApiSources[1]]);
  for (const selected of [[], ['sms']]) {
    const composition = resolveProjectRecipe(recipe(selected), catalog);
    const profile = composerProfile(modules, composition);
    const plan = javaPlanFor(profile);
    for (const file of smsApiSources) assert.equal(plan.removed.has(join(root, file)), !selected.includes('sms'), `${file}: exact SMS owner`);
  }
  for (const preset of catalog.presets) {
    const plan = javaPlanFor(composerProfile(modules, presetComposition(preset.id)));
    // 문자 기능이 없는 시작 구성(공통 기반·설문·결재)에서만 빠진다 — 시작 구성 이름이 아니라 해석된 기능 목록으로 판정한다.
    const excluded = !presetComposition(preset.id).resolvedDomains.includes('sms');
    for (const file of smsApiSources) assert.equal(plan.removed.has(join(root, file)), excluded, `${preset.id}: ${file}`);
  }
  const unowned = { ...ownership, supportFiles: new Map([...ownership.supportFiles].filter(([domain]) => domain !== 'sms')) };
  const excluded = composerProfile(modules, resolveProjectRecipe(recipe([]), catalog));
  assert.equal(planJavaRemoval(root, unowned, excluded, java, { readSource: readJava }).removed.has(join(root, smsApiSources[1])), false,
    'removing the exact support declaration reproduces the isolated Properties survivor');
});

// 템플릿 배정 포트(DEC-OPS-280). 구현은 템플릿 기능의 서비스이고 커뮤니티는 포트를 선택 주입으로 받는다.
const templatePort = 'foundation/src/main/java/nuri/foundation/core/template/TemplateAssignmentPolicy.java';
const templateService = 'business-app/src/main/java/nuri/business/service/template/TmplatInfoService.java';

test('the template assignment port survives every composition and its only implementation leaves with the template feature', () => {
  // 종전에는 템플릿 디렉터리의 별도 구현을 커뮤니티 지원 파일로 묶어 커뮤니티가 템플릿을 늘 끌어왔다.
  assert.deepEqual(modules.files['community.json'].backend.supportFiles, [], 'the community no longer declares template support');
  // 구현은 하나이고 템플릿 API 가 쓰는 @Service 다 — 템플릿만 고른 생성물에 소비자 없는 구현이 남지 않는다(도달 불가 서비스 게이트).
  //   별도 구현을 다시 만들면 템플릿 단독 생성물에서 그 구현이 소비자 없이 남는다.
  const implementations = java.filter(file => /\bimplements\b[^{]*\bTemplateAssignmentPolicy\b/u.test(readJava(file)))
    .map(file => relative(root, file).split(sep).join('/'));
  assert.deepEqual(implementations, [templateService]);
  assert.match(readFileSync(join(root, templateService), 'utf8'), /@Service\b/u);
  for (const [selected, kept] of [[['template'], true], [['community'], false], [['community', 'template'], true], [['promotion'], false], [[], false]]) {
    const composition = resolveProjectRecipe(recipe(selected), catalog);
    assert.equal(composition.resolvedDomains.includes('template'), kept, `${selected}: template resolution`);
    const plan = javaPlanFor(composerProfile(modules, composition));
    assert.equal(plan.removed.has(join(root, templateService)), !kept, `${selected}: ${templateService}`);
    assert.equal(plan.removed.has(join(root, templatePort)), false, `${selected}: the port stays in foundation`);
  }
  for (const preset of catalog.presets) {
    const plan = javaPlanFor(composerProfile(modules, presetComposition(preset.id)));
    assert.equal(plan.removed.has(join(root, templateService)), preset.id !== 'demo', `${preset.id}: ${templateService}`);
    assert.equal(plan.removed.has(join(root, templatePort)), false, `${preset.id}: ${templatePort}`);
  }
  // 커뮤니티는 템플릿을 요구하지 않는다 — 선택 연동(포트)으로만 잇고, 템플릿이 빠진 구성은 기능 저하로 알린다.
  assert.ok(!catalog.capabilities.find(row => row.id === 'community').requires.some(row => row.domain === 'template'));
  assert.ok(catalog.integrates.some(row => row.from === 'community' && row.to === 'template' && row.via === 'port:TemplateAssignmentPolicy'));
});

test('new management HTTP matrices project every selected surface and reject an unowned addition', () => {
  const file = 'api-server/src/test/java/nuri/security/RbacDemoSurfaceAuthorizationMatrixTest.java';
  const source = readFileSync(join(root, file), 'utf8');
  const owners = new Map([
    ['/api/v1/admin/operation/events', 'event'],
    ['/api/v1/admin/operation/rewards', 'reward'],
    ['/api/v1/help/hpcm', 'help'],
    ['/api/v1/help/manuals', 'help'],
    ['/api/v1/admin/system/banners', 'promotion'],
    ['/api/v1/admin/system/popups', 'promotion'],
    ['/api/v1/admin/system/templates', 'template'],
  ]);
  const paths = value => [...value.matchAll(/new ManagedSurface\("([^"]+)"/g)].map(match => match[1]);
  const sharedMethod = (value, name) => value.match(new RegExp(`^(?:    @[^\\r\\n]*\\r?\\n)*    (?:void|static Stream<Arguments>|private void) ${name}\\([\\s\\S]*?^    \\}`, 'm'))?.[0];
  assert.deepEqual(paths(source), [...owners.keys()], 'the management surface inventory is exact');
  // 표면 소유의 원천은 기능 파일의 owns.rbacMatrix 다(11단계 C7 — 생성기 상수를 걷었다). 이 시험의 기대 표와 정확히 같다.
  assert.deepEqual(ownership.rbac.surfaces, Object.fromEntries(owners));
  // [2026-10-18 ADR-0034] 약식결재는 이 매트릭스의 표면이 아니다 — 유일한 단언(관리 경로 결재 처리)이 그 API 와 함께 걷혔다.
  assert.deepEqual([...ownership.rbac.domains].sort(), ['event', 'help', 'promotion', 'reward', 'survey', 'template']);
  assert.equal(projectComposerJava(file, source, { resolvedDomains: ['informalsanction'] }, ownership.rbac), source, 'declared removal');
  assert.throws(() => projectComposerJava(file, source, { resolvedDomains: ['help'] }), /RBAC projection needs the feature RBAC ownership/);
  for (const selected of [['event'], ['reward'], ['help'], ['promotion'], ['template'], ['survey'], ['event', 'reward', 'help', 'promotion', 'template']]) {
    const projected = projectComposerJava(file, source, { resolvedDomains: selected }, ownership.rbac);
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
    const profile = composerProfile(modules, { profile: 'custom', packs: ['core', 'demo'], resolvedDomains: selected, frontend: { removePaths: [] } });
    assert.ok(!profile.acknowledgedRemovedGates.some(row => row.file === file), `${selected}: the selected RBAC surface must retain its gate`);
    assert.equal(javaPlanFor(profile).removed.has(join(root, file)), false, `${selected}: actual dependency projection must preserve the selected RBAC gate`);
  }
  assert.throws(() => projectComposerJava(file, source.replace('/api/v1/help/manuals', '/api/v1/help/new-api'), { resolvedDomains: ['help'] }, ownership.rbac), /RBAC.*(inventory|owner|contract).*drifted/i);
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
  const fixture = { domains: ['memoreport'], support: { memoreport: [...displayNameSupport] } };
  return { directory, fixture, java: [...sources.keys()].map(file => join(directory, file)) };
}

test('domain support follows its selected consumer without weakening mandatory dependency guards', t => {
  const { directory, fixture, java } = supportFixture(t);
  const plan = planWith(directory, fixture, [], java);
  for (const file of displayNameSupport) assert.ok(plan.removed.has(join(directory, file)), `${file}: excluded consumer must remove its support`);
  assert.equal(planWith(directory, fixture, ['memoreport'], java).removed.size, 0);
  const required = join(directory, 'business-core/src/main/java/nuri/business/service/user/RequiredService.java');
  writeFileSync(required, 'package nuri.business.service.user; import nuri.foundation.core.user.UserDisplayNameLookup; class RequiredService { UserDisplayNameLookup lookup; }');
  assert.throws(() => planWith(directory, fixture, [], [...java, required]), /필수 모듈이 제외 domain을 참조한다/);
  // Java 투영은 pack 을 보지 않는다 — 해석된 기능 목록이 없는 pack 프로필은 투영하지 않고 실패한다(11단계 C3).
  assert.throws(() => planJavaRemoval(directory, fixtureOwnership(directory, fixture), { packs: ['core'] }, java), /해석된 기능 목록\(resolvedDomains\)이 필요하다/);
  assert.throws(() => planJavaRemoval(directory, fixture, { resolvedDomains: [] }, java), /기능 소유\(기능 목록·지원 파일\)가 필요하다/);
});

test('domain support rejects unsafe, missing, duplicate and unowned declarations', t => {
  const { directory, fixture, java } = supportFixture(t);
  for (const files of [
    ['../outside.java'],
    ['foundation/src/main/java/../../outside.java'],
    ['foundation/src/main/java/nuri/Missing.java'],
    ['api-server/src/main/java/nuri/api/integration/sms/../../Outside.java'],
    ['api-server/src/main/java/nuri/api/integration/sms/Missing.java'],
    [displayNameSupport[0], displayNameSupport[0]],
  ]) {
    const changed = structuredClone(fixture);
    changed.support.memoreport = files;
    assert.throws(() => planWith(directory, changed, [], java), /support/i);
  }
  const changed = structuredClone(fixture);
  changed.support.unknown = [displayNameSupport[0]];
  assert.throws(() => planWith(directory, changed, [], java), /Invalid domain support owner: unknown\/unknown/);
  changed.domains.push('unknown');
  assert.throws(() => planWith(directory, changed, [], java), /duplicate domain support/i);
  // 업무 앱 파일은 다른 선택 도메인의 디렉터리에 있을 때만 지원 파일이다. 자기 디렉터리는 이미 자기 소유이고,
  // 어느 기능 파일에도 없는 도메인 디렉터리는 선택으로 되살릴 수 없다. 파일이 실제로 있어도 형식에서 거부한다.
  const own = 'business-app/src/main/java/nuri/business/service/memoreport/MemoReportService.java';
  const foreign = 'business-app/src/main/java/nuri/business/service/orphan/OrphanPolicy.java';
  mkdirSync(dirname(join(directory, foreign)), { recursive: true });
  writeFileSync(join(directory, foreign), 'package nuri.business.service.orphan; class OrphanPolicy {}');
  for (const file of [own, foreign]) {
    const rejected = structuredClone(fixture);
    rejected.support.memoreport = [file];
    assert.throws(() => planWith(directory, rejected, [], java), /Invalid or duplicate domain support file/, file);
  }
  const accepted = structuredClone(fixture);
  accepted.domains.push('orphan');
  accepted.support.memoreport = [foreign];
  assert.ok(planWith(directory, accepted, ['orphan'], [...java, join(directory, foreign)]).removed.has(join(directory, foreign)),
    'a selected domain directory file owned by an excluded consumer is removed');
});

test('API support is removed or survives with its exact consumer and cannot silently disappear', t => {
  const { directory, fixture, java } = supportFixture(t);
  const file = 'api-server/src/main/java/nuri/api/integration/memoreport/LocalProperties.java';
  mkdirSync(dirname(join(directory, file)), { recursive: true });
  writeFileSync(join(directory, file), 'package nuri.api.integration.memoreport; class LocalProperties {}');
  fixture.support.memoreport.push(file);
  const allJava = [...java, join(directory, file)];
  assert.ok(planWith(directory, fixture, [], allJava).removed.has(join(directory, file)));
  assert.equal(planWith(directory, fixture, ['memoreport'], allJava).removed.size, 0);
  const output = join(directory, 'output');
  for (const source of allJava) {
    const path = relative(directory, source);
    mkdirSync(dirname(join(output, path)), { recursive: true });
    writeFileSync(join(output, path), readFileSync(source));
  }
  const composition = { profile: 'custom', resolvedDomains: ['memoreport'], frontend: { includedPaths: [], removePaths: [] } };
  const owned = fixtureOwnership(directory, fixture);
  assert.doesNotThrow(() => assertComposerSourceSurvives(directory, output, composition, owned));
  rmSync(join(output, file));
  assert.throws(() => assertComposerSourceSurvives(directory, output, composition, owned), /Selected capability source was removed: api-server/);
  // 생성 단계는 이 실패를 코드로 엔진에 알린다. 세부 정보는 저장소 기준 '/' 경로다.
  assert.throws(() => assertComposerSourceSurvives(directory, output, composition, owned),
    error => error.code === 'SOURCE_SURVIVAL' && JSON.stringify(error.details) === JSON.stringify({ files: [file.split(sep).join('/')] }));
});

/*
 * 디렉터리 소유 기능이 선택된 api-server 컨트롤러는 남아야 한다(DEC-OPS-280). 커뮤니티 사용자 API 는 게시판 타입을 참조해, 게시판 없이
 * 커뮤니티를 고르면 생성기가 그 컨트롤러를 연쇄로 지운다. 참조 기능이 모두 선택됐을 때만 생존을 요구하던 검사는 이 손실을 통과시켰다.
 * 카탈로그가 그 참조를 간선으로 세므로 실제 해석에서는 게시판이 함께 들어온다. 간선을 메모리에서 걷어 손실을 재현한다.
 */
test('a selected feature keeps the api-server controllers of its own directory even when the requires edge is missing', () => {
  const controller = 'api-server/src/main/java/nuri/api/controller/business/community/CommunityUserApiController.java';
  const survives = (catalogValue, selected) => {
    const composition = resolveProjectRecipe(recipe(selected), catalogValue);
    const plan = javaPlanFor(composerProfile(modules, composition));
    return { composition, plan, check: () => assertComposerSourceSurvives(root, root, composition, ownership,
      { present: path => !plan.removed.has(join(root, path)) }) };
  };
  const real = survives(catalog, ['community']);
  assert.ok(real.composition.resolvedDomains.includes('board'), 'the real catalog pulls the board in for the community');
  assert.equal(real.plan.removed.has(join(root, controller)), false);
  assert.doesNotThrow(real.check);
  const { catalogHash: _realHash, ...body } = { ...catalog, capabilities: catalog.capabilities.map(row => (row.id !== 'community' ? row
    : { ...row, requires: row.requires.filter(edge => edge.domain !== 'board') })) };
  const lost = survives({ ...body, catalogHash: compositionDigest(body) }, ['community']);
  assert.ok(!lost.composition.resolvedDomains.includes('board'));
  assert.ok(lost.plan.removed.has(join(root, controller)), 'the generator removes the controller through its board reference');
  assert.throws(lost.check, error => error.code === 'SOURCE_SURVIVAL' && error.details.files.includes(controller));
});

test('a selected domain directory may lose only the support owned by an excluded consumer', t => {
  const { directory, fixture } = supportFixture(t);
  const foreign = 'business-app/src/main/java/nuri/business/service/orphan/OrphanPolicy.java';
  const sibling = 'business-app/src/main/java/nuri/business/service/orphan/OrphanService.java';
  for (const [file, source] of [[foreign, 'package nuri.business.service.orphan; class OrphanPolicy {}'], [sibling, 'package nuri.business.service.orphan; class OrphanService {}']]) {
    mkdirSync(dirname(join(directory, file)), { recursive: true });
    writeFileSync(join(directory, file), source);
  }
  fixture.domains.push('orphan');
  fixture.support.memoreport = [foreign];
  const output = join(directory, 'output');
  mkdirSync(dirname(join(output, sibling)), { recursive: true });
  writeFileSync(join(output, sibling), readFileSync(join(directory, sibling)));
  const composition = selected => ({ profile: 'custom', resolvedDomains: selected, frontend: { includedPaths: [], removePaths: [] } });
  const owned = fixtureOwnership(directory, fixture);
  // 생성기가 템플릿 단독에서 커뮤니티 전용 구현을 지운 뒤 "선택된 소스가 지워졌다" 로 실패하던 경로다.
  assert.doesNotThrow(() => assertComposerSourceSurvives(directory, output, composition(['orphan']), owned));
  // 지워진 소스는 모두 모아 한 번에 알린다(정밀 점검과 같은 합집합). 메모 보고 서비스도 이 출력에 없어 함께 실린다.
  assert.throws(() => assertComposerSourceSurvives(directory, output, composition(['orphan', 'memoreport']), owned),
    error => error.code === 'SOURCE_SURVIVAL' && error.details.files.includes('business-app/src/main/java/nuri/business/service/orphan/OrphanPolicy.java')
      && /^Selected capability source was removed: .*business-app\/src\/main\/java\/nuri\/business\/service\/orphan\/OrphanPolicy\.java/.test(error.message));
  rmSync(join(output, sibling));
  assert.throws(() => assertComposerSourceSurvives(directory, output, composition(['orphan']), owned), /OrphanService\.java/);
});

test('selected domain support cannot disappear from a custom artifact', t => {
  const { directory, fixture } = supportFixture(t);
  const output = join(directory, 'output');
  mkdirSync(output);
  const composition = { profile: 'custom', resolvedDomains: ['memoreport'], frontend: { includedPaths: [], removePaths: [] } };
  const consumer = 'business-app/src/main/java/nuri/business/service/memoreport/MemoReportService.java';
  for (const file of [consumer, ...displayNameSupport]) {
    mkdirSync(dirname(join(output, file)), { recursive: true });
    writeFileSync(join(output, file), readFileSync(join(directory, file)));
  }
  assert.doesNotThrow(() => assertComposerSourceSurvives(directory, output, composition, fixtureOwnership(directory, fixture)));
  rmSync(join(output, displayNameSupport[1]));
  assert.throws(() => assertComposerSourceSurvives(directory, output, composition, fixtureOwnership(directory, fixture)), /Selected capability source/);
});

/*
 * [11단계 C3] 생성물의 매니페스트 v2(config/modules)는 구성의 기능 파일·core·활성 구성 하나만 담는다. 소유 기능이 빠진 공유 테이블은
 * 넘겨받는 기능 파일의 owns.tables 로 옮겨, 생성물 기능 파일의 테이블이 구성의 테이블과 정확히 같다. 생성물 무결성 검사가 같은 판정
 * (projectedModuleViolations)을 생성물 디스크에 건다. [C5] 생성물에는 v1 manifest 가 없다 — 종전 투영 manifest 시험이 보던 지원 파일·
 * 프런트 전용 기능·공유 테이블 소유는 선택한 기능 파일 집합과 테이블·시퀀스 소유 대조가 본다. 활성 구성의 id 는 생성물 표지(active)다.
 */
test('projected modules keep exactly the composition features, its active entry and every table owner', () => {
  const projectFor = composition => projectComposerModuleFiles(modules.files, composition,
    activeCompositionEntry(modules, composition, composerProfile(modules, composition), { cascadeRemoved: [{ file: 'x.java' }] }));
  const check = (composition, projected, names = ['_schema.json', ...Object.keys(projected)]) =>
    projectedModuleViolations({ names, read: name => projected[name], composition });
  for (const composition of [...catalog.presets.map(preset => presetComposition(preset.id)), ...[['template'], ['board', 'template'], ['mail', 'schedule']]
    .map(domains => resolveProjectRecipe(recipe(domains), catalog))]) {
    const label = `${composition.profile}:${composition.resolvedDomains.join(',')}`;
    const projected = projectFor(composition);
    assert.deepEqual(check(composition, projected), [], label);
    assert.deepEqual(Object.keys(projected).filter(name => !['core.json', 'presets.json'].includes(name)).sort(),
      composition.resolvedDomains.map(domain => `${domain}.json`), `${label}: only the selected feature files`);
    const [active] = projected['presets.json'].presets;
    assert.equal(projected['presets.json'].active, composition.profile, `${label}: the generated-product marker names the composition`);
    if (composition.profile === 'custom') {
      assert.deepEqual({ id: active.id, domains: active.domains, javaCascade: active.expected.javaCascade },
        { id: 'custom', domains: composition.resolvedDomains, javaCascade: ['x.java'] }, `${label}: the direct selection records what the generator removed`);
    } else {
      assert.equal(active, modules.files['presets.json'].presets.find(preset => preset.id === composition.profile), `${label}: the preset entry is copied as declared`);
    }
  }
  // 템플릿만 고르면 소유 기능(게시판)이 빠진 tb_tmplt_info 를 템플릿이 넘겨받는다. 넘기지 않으면 소유 기능이 없는 테이블이 남는다.
  const template = resolveProjectRecipe(recipe(['template']), catalog);
  const projected = projectFor(template);
  assert.ok(projected['template.json'].owns.tables.includes('tb_tmplt_info'), 'the template receives the shared table');
  assert.ok(!modules.files['template.json'].owns.tables.includes('tb_tmplt_info'), 'the upstream template file is not mutated');
  const untransferred = { ...projected, 'template.json': modules.files['template.json'] };
  assert.deepEqual(check(template, untransferred), ['projected module table ownership differs from composition']);
  // 구성 밖 기능 파일이 남거나 구성 기능 파일이 빠지면 파일 집합이 다르다고 말한다.
  assert.deepEqual(check(template, { ...projected, 'board.json': modules.files['board.json'] }),
    ['projected module set differs from composition (extra: board.json; missing: -)']);
  const { 'template.json': _template, ...lacking } = projected;
  assert.deepEqual(check(template, lacking), ['projected module set differs from composition (extra: -; missing: template.json)']);
  // 활성 구성은 하나이고 그 구성이어야 한다.
  const otherPreset = { ...projected, 'presets.json': modules.files['presets.json'] };
  assert.deepEqual(check(template, otherPreset), ['projected active composition differs from composition: custom']);
  // 표지(active)가 빠지면 활성 구성 하나가 맞아도 생성물로 보지 않는다(11단계 C5).
  const { active: _marker, ...unmarked } = projected['presets.json'];
  assert.deepEqual(check(template, { ...projected, 'presets.json': unmarked }), ['projected active composition differs from composition: custom']);
  // 독립 시퀀스 소유도 구성과 같아야 한다.
  const sequenceDrift = { ...projected, 'core.json': { ...projected['core.json'], owns: { ...projected['core.json'].owns, sequences: [] } } };
  assert.deepEqual(check(template, sequenceDrift), ['projected module sequence ownership differs from composition']);
});

/*
 * [11단계 C3] 생성기·정밀 점검·DB 생성기는 매니페스트 v2 의 기능 소유로 투영한다. 생성기·관찰자 소스가 pack 목록과 순위를 다시 읽지
 * 않는지는 retired-pack-vocabulary.test.mjs 의 표가 본다(이 자리의 grep 단언을 그 표로 옮겼다).
 */
test('the DB generator takes its ownership inventory from the feature files', () => {
  // DB 생성기가 원본 스키마와 대조하는 소유 목록은 기능 파일에서 온다 — 카탈로그의 core·기능 테이블·독립 시퀀스와 같다.
  const inventory = moduleDatabaseInventory(modules.files);
  const sortedUnique = values => [...new Set(values)].sort();
  assert.deepEqual(inventory.tables, sortedUnique([...catalog.core.tables, ...catalog.capabilities.flatMap(row => row.database.tables)]));
  assert.deepEqual(inventory.sequences, sortedUnique([...catalog.core.explicitSequences, ...catalog.capabilities.flatMap(row => row.database.explicitSequences)]));
});

/*
 * [11단계 C7] 기능 소유는 config/modules 하나다. v1 manifest(`config/reusable-base-profiles.json`)와 그것을 v2 로 옮겨 쓰던 생성 스크립트·
 * merge:main 단계·modules:generate 명령을 걷었다. 옛 파일이 되살아나거나, 생산 코드(스크립트·도구·워크플로·훅·앱 소스·설정)가 그 이름을
 * 다시 적으면 두 번째 소유 선언이 조용히 생긴다. 이름을 적어도 되는 자리는 그 이름을 막는 로더의 상수(RETIRED_OWNERSHIP_DECLARATION)
 * 하나다. 설정 가운데 지난 승인의 근거 문장(disposition overlay 의 evidence)은 기록이라 대상이 아니다.
 */
test('the old ownership declaration is gone and no production code names it again', () => {
  assert.equal(existsSync(join(root, RETIRED_OWNERSHIP_DECLARATION)), false, `old ownership declaration remains: ${RETIRED_OWNERSHIP_DECLARATION}`);
  assert.equal(existsSync(join(root, 'scripts/composer-modules-generate.mjs')), false, 'the v1 to v2 generator remains');
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(Object.hasOwn(pkg.scripts, 'modules:generate'), false, 'npm run modules:generate remains');
  const production = file => /^(?:scripts\/.+\.(?:mjs|cjs|js|ps1|sh)|tools\/.+\.(?:mjs|cjs|js)|\.github\/.+\.(?:ya?ml|json)|\.githooks\/.+|package\.json|config\/.+\.json|(?:foundation|business-core|business-app|api-server|migration-tool)\/src\/main\/.+|frontend\/src\/.+\.(?:ts|tsx))$/.test(file)
    && !/(?:\.test\.(?:mjs|ts|tsx)|\.test-helpers\.mjs|\/__tests__\/.*)$/.test(file)
    // overlay 경로는 disposition 계약의 상수로 받는다 — 경로를 적으면 그 계약이 이 시험을 등록되지 않은 overlay 소비자로 본다.
    && file !== DISPOSITION_OVERLAY;
  const scanned = files.filter(production);
  assert.ok(scanned.length > 1000, `scanned ${scanned.length} files — the scan is empty`);
  const naming = scanned.filter(file => readFileSync(join(root, file), 'utf8').includes('reusable-base-profiles'));
  assert.deepEqual(naming, ['scripts/composer-modules.mjs'], 'old ownership declaration remains in production code');
  // 그 한 자리도 상수 정의 한 줄뿐이다.
  const lines = readFileSync(join(root, 'scripts/composer-modules.mjs'), 'utf8').split(/\r?\n/).filter(line => line.includes('reusable-base-profiles'));
  assert.deepEqual(lines, ["export const RETIRED_OWNERSHIP_DECLARATION = 'config/reusable-base-profiles.json';"]);
});

/*
 * [11단계 C8] 인증 시작 구성 id 는 presets.json 이 정한다. 스크립트(시험 포함)·도구·워크플로가 시작 구성 id 전부를 리터럴로 열거하면,
 * 시작 구성을 더할 때(13b) 검사기가 새 구성을 모르는 이름으로 거부하거나 검증 범위에서 뺀다 — composition-profiles.mjs 의
 * presetIds·compositionProfiles 를 읽는다. 따옴표 리터럴이나 맨 이름이 쉼표·`|` 로 이어져 모든 id 를 덮거나(여러 줄 배열·사용법
 * 문장·YAML 행렬 포함), 한 줄에 모든 id 가 따옴표 리터럴로 나오면 열거로 센다. 특정 기능을 담은 시작 구성의 부분 목록과 한 시작
 * 구성의 이름은 대상이 아니다.
 */
function presetEnumerations(text, ids) {
  const alternatives = ids.map(id => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const item = `(?:'(?:${alternatives})'|"(?:${alternatives})"|\`(?:${alternatives})\`|(?<![\\w-])(?:${alternatives})(?![\\w-]))`;
  const covers = segment => ids.every(id => new RegExp(`(?<![\\w-])${id}(?![\\w-])`).test(segment));
  const lineOf = index => text.slice(0, index).split('\n').length;
  const lines = new Set();
  for (const match of text.matchAll(new RegExp(`${item}(?:\\s*[,|]\\s*${item})+`, 'g'))) if (covers(match[0])) lines.add(lineOf(match.index));
  text.split('\n').forEach((line, index) => {
    if (ids.every(id => [`'${id}'`, `"${id}"`, `\`${id}\``].some(quoted => line.includes(quoted)))) lines.add(index + 1);
  });
  return [...lines].sort((left, right) => left - right);
}

test('no script, tool or workflow enumerates the preset ids — they read presets.json', () => {
  const ids = presetIds(root);
  assert.ok(ids.length >= 2, `presets.json declares ${ids.length} presets`);
  const scanned = files.filter(file => /^(?:scripts\/.+\.(?:mjs|cjs|js|ps1|sh)|tools\/.+\.(?:mjs|cjs|js)|\.github\/workflows\/.+\.ya?ml)$/.test(file));
  assert.ok(scanned.length > 200, `scanned ${scanned.length} files — the scan is empty`);
  const violations = scanned.flatMap(file => presetEnumerations(readFileSync(join(root, file), 'utf8').replace(/\r\n/g, '\n'), ids)
    .map(line => `${file}:${line}`));
  assert.deepEqual(violations, [], 'enumerated preset ids — read presets.json through composition-profiles.mjs');
  // 판정 대조군: 견본은 id 에서 만든다(이 파일 자신이 열거가 되지 않게).
  const quoted = ids.map(id => `'${id}'`);
  for (const sample of [
    `const names = [${quoted.join(', ')}];`,
    `const names = new Set([${[...quoted, "'custom'"].join(', ')}]);`,
    `const names = [\n  ${quoted.join(',\n  ')},\n];`,
    `throw new Error('usage: --profile ${ids.join('|')}');`,
    `        profile: [${ids.join(', ')}]`,
    `if (!(${ids.map(id => `p === '${id}'`).join(' || ')})) fail();`,
  ]) assert.deepEqual(presetEnumerations(sample, ids).length > 0, true, sample);
  for (const sample of [
    `const some = [${quoted.slice(0, -1).join(', ')}];`,
    `const one = '${ids[0]}';`,
    `const path = 'src/app/${ids.at(-1)}/page.tsx';`,
    `const names = presetIds();`,
  ]) assert.deepEqual(presetEnumerations(sample, ids), [], sample);
});

test('a shared table goes to the first selected consumer in declared order, not by pack rank', () => {
  const files = {
    'core.json': modules.files['core.json'], 'presets.json': modules.files['presets.json'],
    'owner.json': { id: 'owner', owns: { tables: ['tb_shared'], sharedTables: [{ table: 'tb_shared', consumers: ['owner', 'zeta', 'alpha'], reason: '시험' }] } },
    'alpha.json': { id: 'alpha', owns: { tables: [], sharedTables: [] } }, 'zeta.json': { id: 'zeta', owns: { tables: [], sharedTables: [] } },
  };
  assert.deepEqual([...sharedTableTransfers(files, ['alpha', 'zeta'])], [['tb_shared', 'zeta']], 'declared order wins over name order');
  assert.deepEqual([...sharedTableTransfers(files, ['alpha'])], [['tb_shared', 'alpha']]);
  assert.deepEqual([...sharedTableTransfers(files, ['owner', 'alpha'])], [], 'a selected owner keeps its table');
  assert.deepEqual([...sharedTableTransfers(files, [])], [], 'a table without any selected consumer is not part of the composition');
});

test('source copying keeps only project skills while preserving ordinary source and the producer', t => {
  const base = realpathSync(tmpdir());
  const fixture = mkdtempSync(join(base, 'composer-copy-'));
  t.after(() => {
    const child = relative(base, realpathSync(fixture));
    assert.ok(child.startsWith('composer-copy-') && !child.includes(sep));
    rmSync(fixture, { recursive: true, force: true });
  });
  const sourceRoot = join(fixture, 'source');
  const output = join(fixture, 'output');
  // 재배포 제한(docx…)·외부 범용(skill-creator…)·저장소 전용 범용(explain-diff)·분류표에 없는 스킬은 복사하지 않는다.
  const excluded = ['docx', 'pdf', 'pptx', 'xlsx', 'skill-creator', 'test-driven-development', 'explain-diff', 'pdf-extra', 'unlisted-generic']
    .flatMap(skill => [
      `.agent/skills/${skill}/SKILL.md`,
      `.agent/skills/${skill}/scripts/nested/tool.js`,
      `.agent/skills/${skill}/LICENSE.txt`,
    ]).concat(['.agent/skills/README.md']);
  const retained = [
    'frontend/src/new-local-file.ts',
    '.agent/skills/db-governance/SKILL.md',
    '.agent/skills/zero-downtime-migration-planner/nested/notes.md',
    '.agent/skillsets/generic/SKILL.md',
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

/**
 * The generator's own projection functions (marker projection, import cascade, screen survival) run against the current
 * source inventory. `selection` is a domain list or `{ preset }`. `missing` lists selected sources the cascade removes;
 * `screens` compares the surviving registered screens with the composition's expectation (reusable-page-survival.mjs).
 */
function inspectFrontendSurvival(selection, currentCatalog = catalog) {
  const composition = resolveProjectRecipe({ ...recipe([]), selection: Array.isArray(selection) ? { domains: selection } : selection }, currentCatalog);
  const { plan } = frontendPlanFor(composition);
  const repositoryPaths = paths => new Set([...paths].map(path => relative(root, path).split(sep).join('/')));
  const [direct, removed] = [repositoryPaths(plan.direct), repositoryPaths(plan.removed)];
  const selected = frontendFiles.filter(file => !direct.has(file)
    && composition.frontend.includedPaths.some(prefix => covers(`frontend/${prefix}`, file)));
  const expected = [...selected, `frontend/${FRONTEND_LAYOUT}`];
  const screens = pageSurvivalViolations({ ...pageSurvivalExpectation({ root, catalog: currentCatalog, composition }), survives: source => !removed.has(source) });
  return { expectedCount: expected.length, missing: expected.filter(file => removed.has(file)), screens };
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

/**
 * 저장소에 있는 스킬은 모두 SKILL_DISTRIBUTION(reusable-source-tree.mjs)에 분류돼야 한다. 외부에서 들여온 스킬(external)은
 * SKILL.md 머리에 source·license 를 적고 LICENSE 파일을 두며, 이 저장소 스킬(project·repository-only)은 source 를 적지 않는다.
 * 생성물은 project 스킬만 가지므로 project 가 아닌 분류는 없어도 된다.
 */
function skillDistributionViolations(skillFiles, read, distribution = SKILL_DISTRIBUTION) {
  const violations = [];
  const inSkill = skill => file => file.startsWith(`.agent/skills/${skill}/`);
  const skills = new Set(skillFiles.filter(file => file.startsWith('.agent/skills/')).map(file => file.split('/')[2]));
  for (const skill of [...skills].sort()) {
    if (!Object.hasOwn(distribution, skill)) {
      violations.push(`${skill}: 분류되지 않은 스킬입니다 — SKILL_DISTRIBUTION 에 project·repository-only·external 중 하나로 적으십시오.`);
      continue;
    }
    const skillFile = `.agent/skills/${skill}/SKILL.md`;
    if (!skillFiles.includes(skillFile)) {
      violations.push(`${skill}: SKILL.md 가 없습니다.`);
      continue;
    }
    const head = (read(skillFile).replace(/^﻿/u, '').match(/^---\r?\n([\s\S]*?)\r?\n---/u)?.[1] ?? '').split(/\r?\n/u);
    const declares = key => head.some(line => line.startsWith(`${key}:`));
    if (distribution[skill] === 'external') {
      if (!declares('source') || !declares('license')) violations.push(`${skill}: 외부 스킬은 SKILL.md 머리에 source·license 를 적어야 합니다.`);
      if (!skillFiles.filter(inSkill(skill)).some(file => /\/LICENSE(?:\.txt|\.md)?$/u.test(file))) {
        violations.push(`${skill}: 외부 스킬은 LICENSE 파일을 함께 둬야 합니다.`);
      }
    } else if (declares('source')) {
      violations.push(`${skill}: source 를 적은 스킬은 external 로 분류해야 합니다.`);
    }
  }
  for (const [skill, kind] of Object.entries(distribution)) {
    if (kind === 'project' && !skills.has(skill)) violations.push(`${skill}: 생성물로 복사할 project 스킬이 없습니다.`);
  }
  return violations;
}

test('every repository skill is classified and only project skills reach generated outputs', () => {
  const read = file => readFileSync(join(root, file), 'utf8');
  assert.deepEqual(skillDistributionViolations(files, read), []);
  // 에이전트별 안내 파일(scripts/agent-skill-adapters.mjs)도 정본과 같은 분류를 따른다 — 정본이 빠진 안내 파일은 가리킬 곳이 없다.
  for (const skillRoot of ['.agent/skills', '.agents/skills', '.claude/skills']) {
    for (const [skill, kind] of Object.entries(SKILL_DISTRIBUTION)) {
      assert.equal(isReusableSkillPath(`${skillRoot}/${skill}/SKILL.md`), kind === 'project', `${skillRoot}/${skill} (${kind})`);
    }
    assert.equal(isReusableSkillPath(`${skillRoot}/unlisted-generic/SKILL.md`), false);
  }
  assert.equal(isReusableSkillPath('docs/README.md'), true);

  // red: 분류하지 않은 새 스킬, 라이선스 표기·파일이 없는 외부 스킬, source 를 적은 저장소 스킬, 사라진 project 스킬.
  const synthetic = {
    '.agent/skills/kept/SKILL.md': '---\nname: kept\n---\n',
    '.agent/skills/outside/SKILL.md': '---\nname: outside\n---\n',
    '.agent/skills/claimed/SKILL.md': '﻿---\nname: claimed\nsource: someone/else\n---\n',
    '.agent/skills/stray/SKILL.md': '---\nname: stray\n---\n',
  };
  const distribution = { kept: 'project', outside: 'external', claimed: 'repository-only', missing: 'project' };
  assert.deepEqual(skillDistributionViolations(Object.keys(synthetic), file => synthetic[file], distribution), [
    'claimed: source 를 적은 스킬은 external 로 분류해야 합니다.',
    'outside: 외부 스킬은 SKILL.md 머리에 source·license 를 적어야 합니다.',
    'outside: 외부 스킬은 LICENSE 파일을 함께 둬야 합니다.',
    'stray: 분류되지 않은 스킬입니다 — SKILL_DISTRIBUTION 에 project·repository-only·external 중 하나로 적으십시오.',
    'missing: 생성물로 복사할 project 스킬이 없습니다.',
  ]);
  // 표기와 LICENSE 를 갖추면 같은 외부 스킬이 통과한다.
  const licensed = { ...synthetic, '.agent/skills/outside/SKILL.md': '---\nname: outside\nsource: a/b\nlicense: MIT\n---\n', '.agent/skills/outside/LICENSE.txt': 'MIT' };
  assert.deepEqual(skillDistributionViolations(Object.keys(licensed), file => licensed[file], distribution).filter(message => message.startsWith('outside:')), []);
});

/*
 * 화면 생존 대조(슬롯 단계 PR-1)를 커밋된 그물로 돈다: 시작 구성마다, 빈 선택, 기능마다의 단독 선택, CI 대표 직접 선택 2개, 그리고 주소록이
 * 수신자 피커에 기여하는 {mail, sms, addressbook}. 판정 통일(PR-2)의 골든 diff 를 이 대조가 화면 단위로 지킨다.
 * 기능 모집단은 기능 선언(config/modules)이 정본이고 project-composer-catalog.test.mjs 가 카탈로그와 정확한 집합으로 대조한다 —
 * 여기서는 그 수를 다시 적지 않고 비지 않았는지만 본다(DEC-OPS-340).
 */
test('every selectable capability preserves its declared frontend and the screens its composition expects through actual import projection', () => {
  assert.ok(catalog.capabilities.length > 1, 'the declared capability population must not be empty');
  for (const feature of catalog.capabilities) {
    const result = inspectFrontendSurvival([feature.id]);
    assert.ok(result.expectedCount > 1, `${feature.id} has no declared frontend population`);
    assert.deepEqual(result.missing, [], `${feature.id}: selected sources must not disappear through a shared import`);
    assert.deepEqual({ missing: result.screens.missing.map(entry => entry.route), extra: result.screens.extra.map(entry => entry.route) },
      { missing: [], extra: [] }, `${feature.id}: surviving screens must equal the composition's screens`);
  }
});

test('presets and representative selections keep exactly the screens their composition expects', () => {
  const selections = [...catalog.presets.map(preset => ({ preset: preset.id })), [], ['mail', 'schedule'], ['board', 'survey'], ['addressbook', 'mail', 'sms']];
  for (const selection of selections) {
    const { missing, screens } = inspectFrontendSurvival(selection);
    assert.deepEqual(missing, [], `${JSON.stringify(selection)}: selected sources must survive`);
    assert.deepEqual({ missing: screens.missing.map(entry => entry.route), extra: screens.extra.map(entry => entry.route) },
      { missing: [], extra: [] }, `${JSON.stringify(selection)}: surviving screens must equal the composition's screens`);
  }
});

test('removing a shared UI dependency exposes the selected page loss instead of silently passing', () => {
  // Phase 0c: 통계는 core 라 설문·게시판과 통계 사이의 화면 의존이 사라졌다(survey <-> stats 삭제).
  // 커뮤니티 → 템플릿은 선택 연동(포트)이 되어 화면 의존이 아니다(DEC-OPS-280). 남은 화면 의존은 도움말 → 게시판이다.
  for (const [from, dependency, lostRoute] of [['help', 'board', '/help']]) {
    const changed = structuredClone(catalog);
    const feature = changed.capabilities.find(row => row.id === from);
    assert.ok(feature.requires.some(edge => edge.domain === dependency), `${from} -> ${dependency} must exist`);
    feature.requires = feature.requires.filter(edge => edge.domain !== dependency);
    const { catalogHash: ignored, ...body } = changed;
    changed.catalogHash = compositionDigest(body);
    const broken = inspectFrontendSurvival([from], changed);
    assert.ok(broken.missing.length > 0, `${from} -> ${dependency}: broken dependency must be red`);
    assert.ok(broken.screens.missing.some(entry => entry.route === lostRoute), `${from} -> ${dependency}: the lost ${lostRoute} screen is named`);
  }
});

test('each selectable domain retains its Java production sources after actual dependency pruning', () => {
  // 선택 연동 판정이 정한 이벤트 소스(리스너·발행 위치)의 소유 기능은 생성기의 실제 연쇄 제거와 같아야 한다.
  //   다르면 판정이 core 로 본 파일이 실제로는 기능과 함께 지워져 연동이 숨는다(같은 패키지 단순 이름 참조 등).
  const supportOwners = new Map([...ownership.supportFiles].flatMap(([owner, files]) => files.map(file => [file, owner])));
  const eventSources = deriveEventSources(root, sourceOwner(supportOwners, catalog.capabilities.map(row => row.id), requiresClosure(catalog.capabilities)));
  const eventOwners = new Map([...eventSources.listeners, ...eventSources.constructions].map(row => [row.path, row.owner]));
  assert.ok(eventOwners.size >= 15, 'the census reads real event sources');
  for (const domain of catalog.capabilities.map(row => row.id)) {
    const composition = resolveProjectRecipe(recipe([domain]), catalog);
    const profile = composerProfile(modules, composition);
    const plan = javaPlanFor(profile);
    for (const file of coreIntegrityGates) assert.equal(plan.removed.has(join(root, file)), false, `${domain}: core gate ${file} must survive`);
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
    // 선택 도메인 디렉터리에서 지워도 되는 것은 제외된 소비자가 소유한 지원 파일뿐이다(제외된 소비자만 쓰는 다른 기능 디렉터리의 구현).
    const excludedSupport = new Set([...ownership.supportFiles].filter(([owner]) => !composition.resolvedDomains.includes(owner))
      .flatMap(([, supportFiles]) => supportFiles.map(file => join(root, file))));
    for (const selected of composition.resolvedDomains) for (const file of plan.removed) {
      if (excludedSupport.has(file)) continue;
      const path = file.replaceAll('\\', '/');
      assert.ok(!['domain', 'service'].some(layer => path.includes(`/business-app/src/main/java/nuri/business/${layer}/${selected}/`)), `${domain}: unexpectedly removed ${file}`);
    }
  }
});

test('preset and empty-selection integrity gate acknowledgements match the real removal plan', () => {
  for (const file of coreIntegrityGates) assert.equal(modules.extras.gateOwners[file], undefined, `core gate ${file} has no optional owner`);
  const compositions = [...catalog.presets.map(preset => presetComposition(preset.id)), resolveProjectRecipe(recipe([]), catalog)];
  for (const composition of compositions) {
    const name = composition.profile;
    const profile = composerProfile(modules, composition);
    const selected = composition.resolvedDomains;
    assertIntegrityGateAcknowledgements(profile, selected);
    const plan = javaPlanFor(profile);
    for (const file of coreIntegrityGates) assert.equal(plan.removed.has(join(root, file)), false, `${name}: core gate ${file} must survive`);
    for (const file of displayNameSupport) assert.equal(plan.removed.has(join(root, file)), !selected.includes('memoreport'), `${name}: ${file}`);
    for (const [file, owner] of integrityGates) {
      assert.equal(plan.removed.has(join(root, file)), !gateSelected(selected, owner), `${name}: ${file}`);
    }
  }
});

// 게이트 소유는 기능 파일의 owns.gates 다(매니페스트 v2, 생성기 프로필이 읽는다). 소유 선언 하나를 걷으면 직접 선택의 승인 목록에서
// 그 게이트가 빠져 위 대조가 붉다.
test('missing integrity gate ownership is red for a custom composition', () => {
  const composition = resolveProjectRecipe(recipe([]), catalog);
  const plan = javaPlanFor(composerProfile(modules, composition));
  for (const [file, owner] of integrityGates) {
    assert.ok(plan.removed.has(join(root, file)), `${file}: actual source pruning removes the unselected gate`);
    assert.deepEqual(modules.extras.gateOwners[file], gateDomains(owner), `${file}: owner declaration is present before mutation`);
    const { [file]: _dropped, ...gateOwners } = modules.extras.gateOwners;
    const mutant = { ...modules, extras: { ...modules.extras, gateOwners } };
    assert.throws(() => assertIntegrityGateAcknowledgements(composerProfile(mutant, composition), []), /acknowledged removal/);
  }
});

/*
 * [2026-10-11 슬롯 단계 PR-2 · 11단계 C6] 마커 래칫: 공용 파서로 센 파일별·기능별 블록 수가 기능 파일의 마커 선언(owns.markerBlocks)과
 * 정확히 같아야 한다. 마커 토큰은 블록을 소유한 기능 id 다. 모집단은 Git 이 보는 frontend 아래 프런트 모듈 파일(isFrontendModuleFile —
 * 해석기의 모듈 확장자) 전부이고 시험을 포함한다. 블록을 더하거나 걷으면 기능 파일의 선언을 함께 고쳐 단계·사유를 남긴다. 이 파일은
 * 원본 저장소에서만 돈다(생성물에서는 카탈로그 적재가 먼저 실패한다). 생성물에 빠진 기능의 마커가 남지 않는다는 성질은 파서가 지킨다 —
 * 생성물의 기능 파일에 있는 기능만 알므로 다른 기능의 마커는 실패다.
 */
const markers = composerMarkerDeclarations(readComposerModuleFiles(root));
function measuredMarkerBlocks() {
  const measured = new Map();
  for (const file of frontendFiles.filter(isFrontendModuleFile)) {
    const { blocks } = parseMarkerBlocks(frontendSources.get(file), { knownFeatures: markers.features, label: file });
    if (!blocks.length) continue;
    const counts = {};
    for (const block of blocks) counts[block.feature] = (counts[block.feature] ?? 0) + 1;
    measured.set(file.replace(/^frontend\//, ''), counts);
  }
  return measured;
}

test('every frontend marker block is declared exactly in its feature file with a step and a reason', () => {
  const measured = measuredMarkerBlocks();
  assert.deepEqual(markerDeclarationViolations(markers.rows, measured), []);
  const blocks = [...measured.values()].reduce((sum, counts) => sum + Object.values(counts).reduce((total, count) => total + count, 0), 0);
  assert.ok(blocks > 0 && measured.size > 0, 'the marker census is empty');
  // 마커 토큰은 카탈로그의 기능이고 로더가 넘긴 선언과 같다(11단계 C6 — 소유를 따로 적지 않는다).
  const capabilities = new Set(catalog.capabilities.map(row => row.id));
  assert.deepEqual([...markers.features].sort(), [...capabilities].sort());
  assert.deepEqual(modules.extras.markerBlocks, markers.rows);
  assert.ok(markers.rows.every(row => capabilities.has(row.feature)), 'every marker block belongs to a catalog feature');
  // 기능 파일에 선언하지 않은 블록은 투영에서 실패한다 — 알려진 기능의 토큰이어도 그 파일에 선언이 없으면 조용히 남거나 빠지지 않는다.
  assert.throws(() => projectCustom('frontend/src/app/new.tsx', '/* reusable-base:board:start */\nhello\n/* reusable-base:board:end */\n',
    resolveProjectRecipe(recipe([]), catalog)), /Unclassified composer UI block: src\/app\/new\.tsx\/board/);
  // 기능이 아닌 토큰(옛 pack 이름·오타)은 마커 줄에서 실패한다. 필수 기반은 늘 있으므로 core 토큰도 없다. 마커 문자열은 리터럴로 둔다
  // (마커 접두에 계산을 붙이면 단일 파서 계약이 두 번째 파서로 본다).
  for (const [token, source] of [
    ['boarx', '/* reusable-base:boarx:start */\nx\n/* reusable-base:boarx:end */\n'],
    ['demo', '/* reusable-base:demo:start */\nx\n/* reusable-base:demo:end */\n'],
    ['collaboration', '/* reusable-base:collaboration:start */\nx\n/* reusable-base:collaboration:end */\n'],
    ['core', '/* reusable-base:core:start */\nx\n/* reusable-base:core:end */\n'],
  ]) {
    assert.throws(() => projectCustom('frontend/src/app/search/SearchClient.tsx', source, resolveProjectRecipe(recipe([]), catalog)),
      new RegExp(`unknown marker feature: ${token} \\(frontend/src/app/search/SearchClient\\.tsx:1\\)`), token);
  }
});

test('the marker ratchet is red for an added or removed block, an undeclared block, a stale declaration and an empty step or reason', () => {
  const rows = [{ file: 'src/a.tsx', feature: 'help', blocks: 2, step: 'PR-6', reason: '링크' }];
  const measured = counts => new Map([['src/a.tsx', counts]]);
  assert.deepEqual(markerDeclarationViolations(rows, measured({ help: 2 })), []);
  assert.match(markerDeclarationViolations(rows, measured({ help: 3 })).join('\n'), /블록 수가 기능 파일 선언과 다르다: src\/a\.tsx\/help 실측 3 · 선언 2/);
  assert.match(markerDeclarationViolations(rows, measured({ help: 1 })).join('\n'), /블록 수가 기능 파일 선언과 다르다/);
  assert.match(markerDeclarationViolations(rows, measured({ help: 2, board: 1 })).join('\n'), /기능 파일에 선언이 없는 마커 블록: src\/a\.tsx\/board 실측 1/);
  assert.match(markerDeclarationViolations(rows, new Map([...measured({ help: 2 }), ['src/b.tsx', { help: 1 }]])).join('\n'),
    /기능 파일에 선언이 없는 마커 블록: src\/b\.tsx\/help/);
  assert.match(markerDeclarationViolations(rows, new Map()).join('\n'), /마커가 없는 선언: src\/a\.tsx\/help/);
  assert.match(markerDeclarationViolations(rows, measured({ board: 2 })).join('\n'), /마커가 없는 선언: src\/a\.tsx\/help/, 'the token is the owner');
  for (const field of ['step', 'reason']) {
    assert.match(markerDeclarationViolations([{ ...rows[0], [field]: ' ' }], measured({ help: 2 })).join('\n'), /단계나 사유가 빈 선언/);
  }
  for (const blocks of [0, 1.5, '2']) {
    assert.match(markerDeclarationViolations([{ ...rows[0], blocks }], measured({ help: 2 })).join('\n'), /블록 수가 양의 정수가 아니다/, String(blocks));
  }
  assert.match(markerDeclarationViolations([...rows, rows[0]], measured({ help: 2 })).join('\n'), /같은 파일·기능의 선언이 두 번 있다: src\/a\.tsx\/help/);
  // 로더도 한 기능 파일 안의 같은 파일 선언 둘을 거부한다. 경로 접두로 소유를 짐작하지 않는다 — 소유는 토큰이다.
  const files = readComposerModuleFiles(root);
  const board = files['board.json'];
  const twice = { ...files, 'board.json': { ...board, owns: { ...board.owns, markerBlocks: [...board.owns.markerBlocks, board.owns.markerBlocks[0]] } } };
  assert.throws(() => composerMarkerDeclarations(twice), /marker blocks are declared twice: src\/app\/search\/SearchClient\.tsx\/board/);
});

test('dashboard, notifications and optional address book blocks follow their domains rather than coarse packs', () => {
  const composition = resolveProjectRecipe(recipe(['mail']), catalog);
  const project = path => projectCustom(path, readFileSync(join(root, path), 'utf8'), composition);
  // [Phase 2 9단계] 업무 홈 page·셸은 마커가 없다 — 메일만 고르면 그대로이고 업무 홈 레지스트리가 빈 배열이다(아래 표).
  for (const home of ['frontend/src/app/page.tsx', 'frontend/src/app/UnifiedDashboardClient.tsx']) {
    assert.equal(project(home), readFileSync(join(root, home), 'utf8'), home);
  }
  const projector = createFrontendProjector({ composition, files: frontendFiles });
  // [슬롯 단계 PR-6] 알림 벨·도움말 링크는 header-widgets·shell-links 슬롯이다. 고르지 않으면 셸 파일은 그대로이고 레지스트리가 빈 배열이다.
  //   [스크랩 슬롯] 게시글 상세의 스크랩 버튼(post-actions)도 같다.
  assert.deepEqual(['help', 'notification', 'scrap'].filter(domain => composition.resolvedDomains.includes(domain)), [],
    'the mail selection leaves out help, notifications and scraps');
  for (const shell of ['frontend/src/app/components/layout/header.tsx', 'frontend/src/app/components/layout/footer.tsx', 'frontend/src/app/error.tsx']) {
    assert.equal(project(shell), readFileSync(join(root, shell), 'utf8'), shell);
  }
  //   [허브 분해 H1] 허브 탭(허브마다 hub-tabs-<허브>, GAP-SLOT-001)도 같다. 셸 링크 레지스트리에는 메일 자신의 협업 허브 링크만 남는다.
  for (const [shellRegistry, empty] of [
    ['frontend/src/extensions/generated-header-widgets.ts', "headerWidgets: readonly SlotContributions<'header-widgets'>[] = [];"],
    ['frontend/src/extensions/generated-shell-links.ts', "shellLinks: readonly SlotContributions<'shell-links'>[] = [mail];"],
    ['frontend/src/extensions/generated-post-actions.ts', "postActions: readonly SlotContributions<'post-actions'>[] = [];"],
    ['frontend/src/extensions/generated-hub-tabs-collaboration.ts', "hubTabsCollaboration: readonly SlotContributions<'hub-tabs-collaboration'>[] = [];"],
    ['frontend/src/extensions/generated-hub-tabs-knowledge.ts', "hubTabsKnowledge: readonly SlotContributions<'hub-tabs-knowledge'>[] = [];"],
    ['frontend/src/extensions/generated-hub-tabs-monitoring.ts', "hubTabsMonitoring: readonly SlotContributions<'hub-tabs-monitoring'>[] = [];"],
    ['frontend/src/extensions/generated-home-sections.ts', "homeSections: readonly SlotContributions<'home-sections'>[] = [];"],
  ]) {
    const shellRendered = projector.project(shellRegistry, readFileSync(join(root, shellRegistry), 'utf8')).source;
    assert.ok(shellRendered.includes(empty), `${shellRegistry}: ${shellRendered}`);
  }
  // [슬롯 단계 PR-4] 메일 화면은 주소록 출처를 슬롯 레지스트리에서 받는다. 주소록을 고르지 않으면 화면은 그대로이고, 레지스트리가
  //   빈 배열로 다시 렌더된다(투영이 기여 파일을 직접 지운다).
  const mail = 'frontend/src/app/admin/collaboration/mail-send/MailSendHubClient.tsx';
  assert.equal(project(mail), readFileSync(join(root, mail), 'utf8'));
  const registry = 'frontend/src/extensions/generated-recipient-picker-sources.ts';
  const rendered = projector.project(registry, readFileSync(join(root, registry), 'utf8')).source;
  assert.doesNotMatch(rendered, /import addressbook/);
  assert.ok(rendered.includes("recipientPickerSources: readonly SlotContributions<'recipient-picker-sources'>[] = [];"), rendered);
});

/*
 * [Phase 2 9단계 H0] 업무 홈 투영 그물. 구성마다 업무 홈('/')에 무엇이 남는지 생성기의 실제 투영·연쇄로 재고 골든과 대조한다.
 * 업무 홈 page 에서 import 간선으로 닿고 지워지지 않은 파일을 모아, 파일 자체(팝업·배너·쪽지 카드·실시간)와 주석을 뺀 글(카드·
 * 단추·목록)로 조각을 판정한다 — 마커 블록으로 조립하는 화면과 슬롯 기여로 조립하는 화면에 같은 판정이 선다.
 * 접근 불가 안내는 기능의 조각(기여)이 하나라도 있을 때만, 부제는 요약 카드가 있을 때만 화면에 나온다.
 * [2026-10-20] 늘 비어 있던 활동 구역과 그 문장(feedNote)을 걷었다. 처리 대기 카드 — 메모 보고·일정·설문 기여와 core 셸의 부서 업무
 * 카드 — 를 더했다. core 카드는 기여가 아니라 접근 판정을 만들지 않고, 모든 구성에 남는다(부서 업무는 core 다).
 */
const HOME_PAGE = 'frontend/src/app/page.tsx';
const HOME_PIECES = [
  ['popup', { file: 'frontend/src/app/components/dashboard/PopupManager.tsx' }],
  ['banner', { file: 'frontend/src/app/components/dashboard/BannerSlider.tsx' }],
  ['unreadNotes', { file: 'frontend/src/app/components/dashboard/UnreadNotesCard.tsx' }],
  ['realtime', { file: 'frontend/src/components/features/dashboard/RealTimeDashboard.tsx' }],
  ['approvalCard', { text: /결재 대기<\/span>/ }],
  ['approvalButton', { text: />결재함 열기</ }],
  ['boardCards', { text: /업무게시판 글</ }],
  ['boardLists', { text: /title="업무게시판 최근 글"/ }],
  ['newPost', { text: /새 게시글 작성/ }],
  ['memoCard', { file: 'frontend/src/app/components/dashboard/MemoReportHome.tsx' }],
  ['scheduleCard', { file: 'frontend/src/app/components/dashboard/ScheduleHome.tsx' }],
  ['surveyCard', { file: 'frontend/src/app/components/dashboard/SurveyHome.tsx' }],
  ['deptJobsCard', { file: 'frontend/src/app/components/dashboard/DeptJobHomeCard.tsx' }],
];
const HOME_CARDS = ['approvalCard', 'unreadNotes', 'boardCards', 'memoCard', 'scheduleCard', 'surveyCard', 'deptJobsCard'];
/** core 셸이 직접 그리는 조각 — 기여가 아니라 접근 판정(등록된 기여가 있을 때만)을 만들지 않는다. */
const HOME_CORE_PIECES = ['deptJobsCard'];
function homeSurface(selection) {
  const composition = resolveProjectRecipe({ ...recipe([]), selection }, catalog);
  const { projected, plan } = frontendPlanFor(composition);
  const reached = new Set([join(root, HOME_PAGE)].filter(path => !plan.removed.has(path)));
  for (const path of reached) for (const { to } of plan.edges.get(path) ?? []) if (!plan.removed.has(to)) reached.add(to);
  const text = [...reached].map(path => stripCode(projected.get(path) ?? '')).join('\n');
  const pieces = HOME_PIECES.filter(([, rule]) => (rule.file ? reached.has(join(root, rule.file)) : rule.text.test(text))).map(([name]) => name);
  if (pieces.some(piece => !HOME_CORE_PIECES.includes(piece)) && /업무 홈 대시보드에 접근할 권한이 없습니다/.test(text)) pieces.push('accessGate');
  if (pieces.some(piece => HOME_CARDS.includes(piece)) && /확인할 일과 업무 현황입니다/.test(text)) pieces.push('subtitle');
  return { alive: reached.size > 0, pieces: pieces.sort() };
}

test('the work home keeps exactly the pieces of the features each composition selects (H0 golden, H1 slots)', () => {
  const all = ['accessGate', 'approvalButton', 'approvalCard', 'banner', 'boardCards', 'boardLists', 'deptJobsCard', 'memoCard', 'newPost', 'popup',
    'realtime', 'scheduleCard', 'subtitle', 'surveyCard', 'unreadNotes'];
  const collaboration = all.filter(piece => !['approvalButton', 'approvalCard', 'banner', 'memoCard', 'popup', 'scheduleCard', 'surveyCard'].includes(piece));
  // core 셸의 부서 업무 카드는 모든 구성에 남고(요약 카드라 부제를 연다), 기여가 아니라 접근 판정을 만들지 않는다(2026-10-20).
  const core = ['deptJobsCard', 'subtitle'];
  const golden = [
    [{ preset: 'core' }, core],
    [{ preset: 'collaboration' }, collaboration],
    [{ preset: 'demo' }, all],
    [{ preset: 'survey' }, ['accessGate', ...core, 'surveyCard'].sort()],
    // [H2] 실시간 대시보드는 게시판을 포트로 읽는다 — 대시보드만 고르면 게시판이 따라오지 않아 실시간 구역과 접근 판정만 남는다.
    [{ domains: ['dashboard'] }, ['accessGate', ...core, 'realtime'].sort()],
    // [H1] 게시판·결재·쪽지 조각은 그 기능의 home-sections 기여다 — 그 기능만 골라도 홈에 나온다(H0 에서는 대시보드 기능의 마커
    //   블록이라 나오지 않았다). 기여가 등록되면 셸이 DASHBOARD_READ 로 진입을 판정하고, 요약 카드가 있으면 부제를 그린다.
    [{ domains: ['board'] }, ['accessGate', 'boardCards', 'boardLists', ...core, 'newPost'].sort()],
    [{ domains: ['informalsanction'] }, ['accessGate', 'approvalButton', 'approvalCard', ...core].sort()],
    [{ domains: ['note'] }, ['accessGate', ...core, 'unreadNotes'].sort()],
    [{ domains: ['board', 'informalsanction'] },
      ['accessGate', 'approvalButton', 'approvalCard', 'boardCards', 'boardLists', ...core, 'newPost'].sort()],
    // [2026-10-20] 처리 대기 카드도 그 기능의 기여다 — 그 기능만 골라도 홈에 나오고 접근 판정이 함께 생긴다.
    [{ domains: ['memoreport'] }, ['accessGate', ...core, 'memoCard'].sort()],
    [{ domains: ['schedule'] }, ['accessGate', ...core, 'scheduleCard'].sort()],
    // [H1] 홍보 조각도 기여라 접근 판정이 함께 생긴다(H0 에서는 홍보 블록만 남고 판정은 대시보드 블록이었다). 부제는 core 카드가 연다.
    [{ domains: ['promotion'] }, ['accessGate', 'banner', ...core, 'popup'].sort()],
    [{ domains: ['notification'] }, core],
  ];
  for (const [selection, pieces] of golden) {
    const surface = homeSurface(selection);
    assert.ok(surface.alive, `${JSON.stringify(selection)}: the work home page survives`);
    assert.deepEqual(surface.pieces, pieces, JSON.stringify(selection));
  }
});

test('the unread-notes card on the work home leaves with the note domain only (H1 home-sections)', () => {
  // [Phase 2 9단계] 카드는 쪽지의 home-sections 기여다. 종전에는 대시보드 기능의 마커 블록(소유 dashboard+note)이라 쪽지만 골라도
  //   나오지 않았다. 이제 쪽지와 함께 남고 쪽지와 함께 빠진다 — 대시보드와 무관하다.
  const registry = 'frontend/src/extensions/generated-home-sections.ts';
  const source = readFileSync(join(root, registry), 'utf8');
  const rendered = domains => {
    const composition = resolveProjectRecipe(recipe(domains), catalog);
    return createFrontendProjector({ composition, files: frontendFiles })
      .project(registry, source).source;
  };
  assert.match(rendered(['note']), /import note from '\.\/note\/home-sections';/);
  const dashboardOnly = resolveProjectRecipe(recipe(['dashboard']), catalog);
  assert.ok(!dashboardOnly.resolvedDomains.includes('note'), dashboardOnly.resolvedDomains.join(','));
  assert.doesNotMatch(rendered(['dashboard']), /note\/home-sections/);
  assert.match(rendered(['dashboard']), /import dashboard from '\.\/dashboard\/home-sections';/);
  assert.doesNotMatch(rendered(['mail']), /from '\.\/\w+\/home-sections'/);
});

/*
 * 마커 블록 안의 라우트 리터럴은 블록이 남는 구성에 그 화면도 남을 때만 쓴다. 블록 소유 기능을 해석해(자동 포함 포함)
 * 라우트를 소유한 기능(공동 화면은 그 기능 전부)이 모두 들어오는지 본다. 어긋나면 지워진 화면으로 가는 링크가 남는다 —
 * tsc·정밀 점검·화면 생존 대조는 문자열 목적지를 보지 않는다.
 */
/*
 * 허브 분해 H2: 기여 탭(`?tab=COMMUNITY` 등)으로 가는 출처는 그 탭을 기여한 기능과 함께 빠져야 한다. 허브는 남고 기여가 빠진 구성에서
 * 출처가 남으면 그 링크는 오류 없이 기본 탭으로 떨어진다. 탭 목적지 계약(cross-stack)은 원본에서 기여 파일이 늘 있어 이 경우를 보지
 * 못하므로, 생성기의 실제 투영·연쇄로 단독 선택마다 본다. 메뉴 행은 recipe 의 excludedMenuTabs 가 따로 숨긴다(recipe 시험).
 */
// 저장소 기준 경로의 원문 — 모듈 맨 위에서 읽어 둔 프런트·Java 원문을 쓴다(없으면 디스크).
const repositoryText = file => frontendSources.get(file) ?? readJava(join(root, file));
const stripCode = source => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function contributedHubTabs() {
  return frontendFiles.filter(file => /^frontend\/src\/app\/.*-tabs\.ts$/.test(file)).flatMap(file => {
    const source = stripCode(repositoryText(file));
    const body = source.match(/contributable:\s*\{([^}]*)\}/)?.[1];
    if (!body) return [];
    const routes = [...(source.match(/routes:\s*\[([^\]]*)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map(match => match[1]);
    return [...body.matchAll(/(\w+):\s*'([^']+)'/g)].map(([, tab, contribution]) => ({ file, routes, tab, contribution }));
  });
}
function contributedTabSources({ routes, tab }, candidates) {
  const escaped = routes.map(route => route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(?:${escaped.join('|')})\\?tab=${tab}\\b`, 'i');
  return candidates.filter(file => !/\/__tests__\/|\.test\.|\/generated-/.test(file) && pattern.test(stripCode(repositoryText(file))));
}

test('every source of a contributed hub tab leaves with the contribution in each selection that keeps the hub', () => {
  const tabs = contributedHubTabs();
  // 원본에는 협업(쪽지·스크랩)·지식(커뮤니티)·감시(하네스) 허브가 기여 탭을 받는다. 모집단이 비면 시험이 vacuous 하다.
  assert.deepEqual(tabs.map(row => row.tab).sort(), ['COMMUNITY', 'HARNESS', 'MESSAGES', 'SCRAPS']);
  // 화면 코드만 본다 — e2e 시나리오는 기능별로 투영하지 않는다(생성물의 e2e 는 이 시험의 범위 밖이다).
  const sources = new Map(tabs.map(row => [row, {
    frontend: contributedTabSources(row, frontendFiles.filter(file => file.startsWith('frontend/src/') && isFrontendModuleFile(file))),
    java: contributedTabSources(row, files.filter(file => file.endsWith('.java') && file.includes('/src/main/'))),
  }]));
  // 출처가 실제로 있어야 이 시험이 무엇을 지킨다 — 커뮤니티 탭은 별칭 화면 둘과 커뮤니티 서비스의 알림 목적지가 연다.
  const community = [...sources].find(([row]) => row.tab === 'COMMUNITY')[1];
  assert.ok(community.frontend.length >= 2 && community.java.length >= 1, JSON.stringify(community));
  let checked = 0;
  const violations = [];
  for (const capability of catalog.capabilities) {
    const composition = resolveProjectRecipe(recipe([capability.id]), catalog);
    const profile = composerProfile(modules, composition);
    const { plan } = frontendPlanFor(composition);
    const removed = file => plan.removed.has(join(root, file));
    let javaPlan = null;
    for (const [row, { frontend, java: javaSources }] of sources) {
      const hubKept = row.routes.some(route => {
        const page = `frontend/src/app${route}/page.tsx`;
        return existsSync(join(root, page)) && !removed(page);
      });
      if (!hubKept || !removed(row.contribution)) continue;
      checked++;
      for (const file of frontend) if (!removed(file)) violations.push(`${capability.id}: ${file} -> ${row.tab}`);
      if (javaSources.length) {
        javaPlan ??= javaPlanFor(profile);
        for (const file of javaSources) if (!javaPlan.removed.has(join(root, file))) violations.push(`${capability.id}: ${file} -> ${row.tab}`);
      }
    }
  }
  // 게시판을 남기고 커뮤니티를 빼는 단독 선택(게시판·댓글·도움말 등)과 협업 허브가 남는 단독 선택이 실제로 판정됐다.
  assert.ok(checked >= 5, `selections checked: ${checked}`);
  assert.deepEqual(violations, []);
});

function routeOwnerDomains(path) {
  let best = null;
  const consider = (route, domains) => { if (covers(route, path) && (!best || route.length > best.route.length)) best = { route, domains }; };
  for (const capability of catalog.capabilities) for (const route of capability.frontend.routes) consider(route, [capability.id]);
  for (const group of catalog.sharedUi) for (const route of group.routes) consider(route, group.domains);
  return best?.domains ?? null;
}

test('every route literal in a marker block survives in every composition that keeps the block', () => {
  const violations = [];
  let checked = 0;
  for (const file of [...new Set(markers.rows.map(row => row.file))]) {
    const source = readFileSync(join(root, 'frontend', file), 'utf8');
    for (const block of parseMarkerBlocks(source, { knownFeatures: markers.features, label: file }).blocks) {
      // 토큰이 곧 소유다(11단계 C6) — 블록은 그 기능이 있는 구성에만 남는다.
      const owners = [block.feature];
      const kept = new Set(resolveProjectRecipe(recipe(owners), catalog).resolvedDomains);
      // 주석 속 경로는 링크가 아니다(허브 분해 H2: 업무 홈 블록의 주석이 종전 목적지 별칭을 설명한다). 블록·줄 주석을 지우고 본다.
      const code = block.text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
      for (const match of code.matchAll(/['"`](\/[a-z][^'"`?#\s$]*)/g)) {
        const screen = routeOwnerDomains(match[1].replace(/\/$/, ''));
        if (!screen) continue;
        checked++;
        const missing = screen.filter(domain => !kept.has(domain));
        if (missing.length) violations.push(`${file}:${block.startLine} ${block.feature} ${match[1]} -> ${missing}`);
      }
    }
  }
  // 마커 블록 안의 경로 literal 은 주석을 세지 않는다. 지금 남은 것은 통합 검색 블록이다 — 통계 셸 탭 경로와 업무 홈 링크는 기여 파일의
  //   href 로 옮겨, 경계 계약의 stats-panels 규칙(href = page 술어)·관리 링크 census·리다이렉트 가드가 본다. 이력은 git 에 있다.
  assert.ok(checked >= 1, `route literals checked: ${checked}`);
  assert.deepEqual(violations, []);
  // 명령 센터의 협업 허브 바로가기는 쪽지의 shell-links 기여다(허브 분해 H1). 명령 센터 원본에는 마커도 협업 허브 경로도 없고,
  //   게시판·설문(CI 대표 구성)에서는 레지스트리에 쪽지 항목이 없으며, 쪽지를 고르면 있다.
  const file = 'frontend/src/app/components/ui/global-command-center.tsx';
  const center = readFileSync(join(root, file), 'utf8');
  assert.doesNotMatch(center, /reusable-base:|\/admin\/collaboration|act-collab/);
  const links = 'frontend/src/extensions/generated-shell-links.ts';
  const registryFor = domains => {
    const composition = resolveProjectRecipe(recipe(domains), catalog);
    return createFrontendProjector({ composition, files: frontendFiles })
      .project(links, readFileSync(join(root, links), 'utf8')).source;
  };
  assert.doesNotMatch(registryFor(['board', 'survey']), /import note from/);
  assert.match(registryFor(['note']), /import note from '\.\/note\/shell-links';/);
});

test('the statistics shell keeps board and survey tabs only with their owning domains (Phase 0c, H4 stats-panels)', () => {
  // [허브 분해 H4] 통계 셸·요약은 core 이고 마커가 없다. 게시물·자료 이용 탭과 전체 등록 건수 칸은 게시판, 설문조사 분석 탭은 설문의
  //   stats-panels 기여다. 셸은 기능 탭의 이름도 서비스도 모른다 — 기능이 빠지면 기여 파일이 직접 지워지고 레지스트리가 다시 렌더된다.
  const shell = 'frontend/src/app/admin/stats/IntelligenceHubClient.tsx';
  const admin = 'frontend/src/app/admin/stats/AdminStatsClient.tsx';
  for (const file of [shell, admin]) {
    const source = readFileSync(join(root, file), 'utf8');
    assert.doesNotMatch(source, /reusable-base:|SurveyAdminService|StatsHubSurveyTab|getBbsStats|getDataUsageStats|CONTENT_STATS|DATA_USAGE|'SURVEYS'|전체 등록 건수/, file);
    assert.match(source, /from '@\/extensions\/generated-stats-panels'/, file);
  }
  const registry = 'frontend/src/extensions/generated-stats-panels.ts';
  const registryFor = domains => {
    const composition = resolveProjectRecipe(recipe(domains), catalog);
    return createFrontendProjector({ composition, files: frontendFiles })
      .project(registry, readFileSync(join(root, registry), 'utf8')).source;
  };
  const coreOnly = registryFor([]);
  assert.doesNotMatch(coreOnly, /import (?:board|survey) from/);
  assert.match(coreOnly, /export const statsPanels: readonly SlotContributions<'stats-panels'>\[\] = \[\];/);
  const withSurvey = registryFor(['survey']);
  assert.match(withSurvey, /import survey from '\.\/survey\/stats-panels';/);
  assert.doesNotMatch(withSurvey, /import board from/);
  const withBoard = registryFor(['board']);
  assert.match(withBoard, /import board from '\.\/board\/stats-panels';/);
  assert.doesNotMatch(withBoard, /import survey from/);
  // 기능 파일에 선언하지 않은 블록은 조용히 남거나 빠지지 않고 실패한다(분류 없는 블록) — 설문 토큰이어도 이 셸에는 선언이 없다.
  const empty = resolveProjectRecipe(recipe([]), catalog);
  assert.throws(() => projectCustom(shell, `${readFileSync(join(root, shell), 'utf8')}\n/* reusable-base:survey:start */\nx\n/* reusable-base:survey:end */\n`,
    empty), /Unclassified composer UI block: src\/app\/admin\/stats\/IntelligenceHubClient\.tsx\/survey/);
  // 기능이 아닌 토큰은 마커 줄에서 실패한다 — 시작 구성도 같은 기능 투영이다(11단계 C3·C6).
  assert.throws(() => projectCustom(admin, '/* reusable-base:boarx:start */\nx\n/* reusable-base:boarx:end */\n', empty),
    /unknown marker feature: boarx/);
  // 셸이 core 로 남으므로 기능을 하나도 고르지 않아도, 설문만 골라도 셸·통계 화면이 import 로 사라지지 않는다.
  for (const domains of [[], ['survey']]) assert.deepEqual(inspectFrontendSurvival(domains).missing, [], `${domains}`);
});

test('custom RBAC projection preserves selected assertions and removes only absent surfaces', () => {
  const file = 'api-server/src/test/java/nuri/security/RbacDemoSurfaceAuthorizationMatrixTest.java';
  const source = readFileSync(join(root, file), 'utf8');
  // Phase 0c: 통계 단언은 core 매트릭스로 옮겼다. 이 클래스의 경계는 설문 표지가 잇는다.
  assert.doesNotMatch(source, /nuri\.business\.service\.stats|\/api\/v1\/admin\/system\/statistics/);
  const survey = projectComposerJava(file, source, { resolvedDomains: ['survey'] }, ownership.rbac);
  assert.match(survey, /SURVEY_PACK_BOUNDARY = nuri\.business\.service\.survey\.SurveyService\.class/);
  assert.match(survey, /explicitSurveyReadGrantWorksWithoutAnAdministrativeGroup/);
  assert.match(survey, /ordinaryPollParticipantCannotCreateUpdateOrDeletePolls/);
  assert.doesNotMatch(survey, /@Test void ordinaryUserCannotEnterDemoOwnedAdministrativeEndpoints/);
  const promotion = projectComposerJava(file, source, { resolvedDomains: ['promotion'] }, ownership.rbac);
  // 설문이 없으면 표지를 지워 남은 표면(배너·팝업)의 단언이 연쇄 제거되지 않게 한다.
  assert.doesNotMatch(promotion, /SurveyService/);
  // 표지의 미사용 경고 애노테이션도 함께 지워져 다음 필드에 붙지 않는다.
  assert.match(survey, /@SuppressWarnings\("unused"\)\r?\n *private static final Class<\?> SURVEY_PACK_BOUNDARY/);
  assert.doesNotMatch(promotion, /@SuppressWarnings\("unused"\)/, 'boundary annotation left behind');
  assert.match(promotion, /get\(path\)\.with\(user\(ordinary\)\)\)\.andExpect\(status\(\)\.isForbidden\(\)\)/);
  assert.match(promotion, /List\.of\("\/api\/v1\/admin\/system\/banners"/);
  assert.doesNotMatch(promotion, /\/api\/v1\/admin\/system\/ism\/1\/confirm/);
  assert.doesNotMatch(promotion, /@Test void explicitSurvey/);
  // 커뮤니티는 이 매트릭스의 표면이 아니다 — 커뮤니티만 고르면 매트릭스가 통째로 빠진다(선언된 제거).
  assert.equal(projectComposerJava(file, source, { resolvedDomains: ['community'] }, ownership.rbac), source);
  assert.throws(() => projectComposerJava(file, source.replace('explicitSurveyReadGrantWorksWithoutAnAdministrativeGroup', 'renamed'), { resolvedDomains: ['promotion'] }, ownership.rbac), /contract drifted/);
  assert.throws(() => projectComposerJava(file, source.replace('Class<?> SURVEY_PACK_BOUNDARY', 'Class<?> RENAMED_BOUNDARY'), { resolvedDomains: ['promotion'] }, ownership.rbac), /survey boundary marker drifted/);
  assert.throws(() => projectComposerJava(file, source.replace('ordinaryUserCannotEnterDemoOwnedAdministrativeEndpoints', 'renamed'), { resolvedDomains: ['promotion'] }, ownership.rbac), /Mixed RBAC projection contract drifted/);
  // 배너·팝업 단언 밖의 요청이 이 시험에 섞이면 소유를 판정할 수 없다 — 섞인 채로 promotion 몫으로 남기지 않는다.
  const mixed = source.replace(/(    @Test void ordinaryUserCannotEnterDemoOwnedAdministrativeEndpoints\(\) throws Exception \{\r?\n)/,
    '$1        mockMvc.perform(patch("/api/v1/admin/system/ism/1/confirm").with(user(ordinary))).andExpect(status().isForbidden());\n');
  assert.notEqual(mixed, source);
  assert.throws(() => projectComposerJava(file, mixed, { resolvedDomains: ['promotion'] }, ownership.rbac), /Mixed RBAC assertion inventory drifted/);
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
  const owned = { domains: [], supportFiles: new Map() };
  assert.doesNotThrow(() => assertComposerSourceSurvives(upstream, output, composition, owned));
  writeFileSync(join(upstream, 'frontend/src/board/required.tsx'), 'required');
  assert.throws(() => assertComposerSourceSurvives(upstream, output, composition, owned), /Selected capability source/);
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
