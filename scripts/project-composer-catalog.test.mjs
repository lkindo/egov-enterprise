import assert from 'node:assert/strict';
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { compositionDigest, javaDomainReferences as javaDomainReferencesOf, loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { REQUIRES_USER_REASONS, attachUserReasons, userReasonProblem } from './project-composer-reasons.mjs';
import { INTEGRATES, degradationPredicate, eventConstructionsIn, eventListenersIn, requiresClosure, resolveIntegrations, sourceOwner, stripComments } from './project-composer-integrations.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'config/reusable-base-profiles.json'), 'utf8'));
const catalog = loadProjectComposerCatalog(ROOT);

function fixture(t) {
  const base = resolve(tmpdir());
  const root = mkdtempSync(join(base, 'egov-composer-catalog-'));
  for (const path of ['config/reusable-base-profiles.json', 'config/governance/permission-catalog.json', 'config/project-composer-menus.json']) {
    mkdirSync(dirname(join(root, path)), { recursive: true }); copyFileSync(join(ROOT, path), join(root, path));
  }
  // 선택 연동 판정은 네 모듈의 생산 Java 를 모두 읽는다(발행은 core·api-server 에도 있다).
  for (const module of ['foundation', 'business-core', 'business-app', 'api-server']) {
    cpSync(join(ROOT, module, 'src/main/java'), join(root, module, 'src/main/java'), { recursive: true });
  }
  for (const anchor of INTEGRATES.flatMap(edge => edge.anchors ?? [])) {
    mkdirSync(dirname(join(root, anchor.path)), { recursive: true }); copyFileSync(join(ROOT, anchor.path), join(root, anchor.path));
  }
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
  // Phase 0c: 자료 이용 기록이 게시판 소유가 되어 그 외래 키는 기능 안으로 들어갔다(5 → 4).
  assert.equal(catalog.requiredForeignKeys.length, 4);
  assert.ok(!catalog.requiredForeignKeys.some(contract => contract.childTable === 'tb_dta_use_stats'));
  for (const contract of catalog.requiredForeignKeys) {
    const child = catalog.capabilities.find(capability => capability.id === contract.sourceDomain);
    const parent = catalog.capabilities.find(capability => capability.id === contract.targetDomain);
    assert.ok(child.database.tables.includes(contract.childTable) && parent.database.tables.includes(contract.parentTable), contract.name);
  }
  const root = fixture(t);
  const evidence = catalog.requiredForeignKeys.find(contract => contract.name === 'fk_tb_bbs_scrap_tb_bbs_item').evidence;
  writeFileSync(join(root, evidence), readFileSync(join(root, evidence), 'utf8').replaceAll('ADD CONSTRAINT fk_tb_bbs_scrap_tb_bbs_item', 'ADD CONSTRAINT fk_renamed'));
  assert.throws(() => loadProjectComposerCatalog(root), /declared foreign key drifted: fk_tb_bbs_scrap_tb_bbs_item/);
});

test('a declared foreign key whose child table moved into its parent domain is refused', t => {
  // Phase 0c 에서 자료 이용 기록이 게시판 소유가 되며 그 외래 키 선언을 지웠다. 엔티티만 옮기고 선언을 남기면
  // 소유 판정이 어긋나 거부돼야 한다. 같은 상황을 댓글 엔티티로 재현한다. 스크랩 엔티티는 스크랩이 게시판을 요구하는
  // 유일한 근거라(묶음 선언이 없다) 옮기면 사유 표 대조가 먼저 실패한다.
  const root = fixture(t);
  const from = join(root, 'business-app/src/main/java/nuri/business/domain/comment/Comment.java');
  const to = join(root, 'business-app/src/main/java/nuri/business/domain/board/Comment.java');
  writeFileSync(to, readFileSync(from, 'utf8').replace('package nuri.business.domain.comment;', 'package nuri.business.domain.board;'));
  rmSync(from);
  assert.throws(() => loadProjectComposerCatalog(root), /declared foreign key ownership drifted: fk_tb_bbs_comment_tb_bbs_item/);
});

test('a declared tab menu must match an active menu row of an existing screen', t => {
  // 허브 분해 H2: 지식 허브 셸은 게시판 소유라 위키·FAQ·Q&A 메뉴는 셸 경로 소유다. 남은 탭 메뉴는 커뮤니티 기여 탭뿐이다.
  assert.deepEqual(catalog.capabilities.filter(capability => capability.menuTabs.length).map(capability => [capability.id, capability.menuTabs]), [
    ['community', ['/admin/help?tab=COMMUNITY']],
  ]);
  const board = catalog.capabilities.find(capability => capability.id === 'board');
  assert.deepEqual(board.frontend.routes.filter(route => route.startsWith('/admin/help')), ['/admin/help', '/admin/help/faq', '/admin/help/qna']);
  // 게시판 디렉터리 안의 커뮤니티 탭 별칭은 그 탭을 기여한 커뮤니티가 소유한다 — 같은 길이면 exact 선언이 접두 선언을 이긴다.
  assert.ok(catalog.capabilities.find(capability => capability.id === 'community').frontend.routes.includes('/admin/community/boards'));
  assert.ok(!board.frontend.routes.includes('/admin/community/boards'));
  assert.ok(board.frontend.routes.includes('/admin/community/boards/detail'), 'the board keeps the screens under the alias');
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
  // Phase 0c: 통계는 고를 수 있는 기능이 아니라 core 다(20 -> 19). 게시물·자료 이용 화면은 게시판이 소유한다.
  // Phase 2 기능 분할(DEC-OPS-273): 행사·포상을 나누고(19 -> 20) 커뮤니티·배너와 팝업·시연 화면을 나눴다(20 -> 22).
  assert.equal(catalog.capabilities.length, 22);
  assert.ok(!catalog.capabilities.some(capability => capability.id === 'stats'));
  assert.ok(catalog.core.tables.includes('tb_rptp_stats'));
  assert.ok(['STATS_ADMIN_READ', 'STATS_READ'].every(code => catalog.core.permissionCodes.includes(code)));
  assert.deepEqual(catalog.core.menuRoutes.filter(route => route.startsWith('/admin/stats')),
    ['/admin/stats', '/admin/stats/report', '/admin/stats/screen', '/admin/stats/user']);
  const board = catalog.capabilities.find(capability => capability.id === 'board');
  assert.deepEqual(board.menuRoutes.filter(route => route.startsWith('/admin/stats')), ['/admin/stats/board', '/admin/stats/data-usage']);
  assert.ok(board.database.tables.includes('tb_dta_use_stats'));
  assert.deepEqual(catalog.mandatory, ['foundation', 'core']);
  const tables = [...new Set([...catalog.core.tables, ...catalog.capabilities.flatMap(capability => capability.database.tables)])].sort();
  assert.deepEqual(tables, Object.values(manifest.packs).flatMap(pack => pack.database.tables).sort());
  const sequences = [...new Set([...catalog.core.explicitSequences, ...catalog.capabilities.flatMap(capability => capability.database.explicitSequences)])].sort();
  assert.deepEqual(sequences, Object.values(manifest.packs).flatMap(pack => pack.database.sequences).sort());
  for (const id of ['board', 'template']) assert.ok(catalog.capabilities.find(capability => capability.id === id).database.tables.includes('tb_tmplt_info'));
  for (const [id, target] of [['comment', 'board'], ['reward', 'informalsanction']]) {
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

/*
 * 나눈 기능의 권한 도메인은 각각 정확히 한 선택 기능에 있고 core 필수 권한으로 넘어가지 않는다(H3, DEC-OPS-273).
 * 카탈로그는 FEATURES 가 주장하지 않은 권한 도메인을 core 필수 권한으로 본다 — 도메인을 빠뜨려도 적재는 실패하지 않으므로
 * 이 단언이 없으면 행사·포상 권한이 모든 구성에 조용히 남는다.
 */
test('split capabilities keep each permission domain in exactly one optional capability', () => {
  const owners = { EVENT: 'event', EXT_HR: 'event', REWARD: 'reward', COMMUNITY: 'community', BANNER: 'promotion', POPUP: 'promotion' };
  const permissions = JSON.parse(readFileSync(join(ROOT, 'config/governance/permission-catalog.json'), 'utf8')).permissions;
  for (const [domain, owner] of Object.entries(owners)) {
    const codes = permissions.filter(permission => permission.domain === domain).map(permission => permission.code);
    assert.ok(codes.length > 0, domain);
    for (const code of codes) {
      assert.deepEqual(catalog.capabilities.filter(capability => capability.permissionCodes.includes(code)).map(capability => capability.id), [owner], code);
      assert.ok(!catalog.core.permissionCodes.includes(code), code);
    }
  }
});

/*
 * 시연 화면은 프런트 전용 기능이다(DEC-OPS-273). manifest 의 frontendOnlyDomains 만 소스 없이 적재되고,
 * 그 목록이 서랍이 되지 않도록 소스·테이블·권한 도메인을 가진 기능을 올리면 실패한다.
 */
test('a frontend-only capability is declared in the manifest and owns no backend, table or permission', t => {
  const showcase = catalog.capabilities.find(capability => capability.id === 'showcase');
  assert.deepEqual([showcase.backend, showcase.database, showcase.permissionCodes, showcase.requires],
    [{ sourcePaths: [], sourceFiles: [] }, { tables: [], explicitSequences: [] }, [], []]);
  assert.deepEqual(showcase.menuRoutes, ['/admin/patterns', '/admin/system/layout']);
  const root = fixture(t);
  const file = join(root, 'config/reusable-base-profiles.json');
  const without = structuredClone(manifest);
  delete without.packs.demo.backend.frontendOnlyDomains;
  writeFileSync(file, JSON.stringify(without));
  assert.throws(() => loadProjectComposerCatalog(root), /capability has no source: showcase/);
  const promoted = structuredClone(manifest);
  promoted.packs.demo.backend.frontendOnlyDomains = ['promotion', 'showcase'];
  writeFileSync(file, JSON.stringify(promoted));
  assert.throws(() => loadProjectComposerCatalog(root), /frontend-only capability has backend source: promotion/);
  const misplaced = structuredClone(manifest);
  misplaced.packs.collaboration.backend.frontendOnlyDomains = ['showcase'];
  delete misplaced.packs.demo.backend.frontendOnlyDomains;
  writeFileSync(file, JSON.stringify(misplaced));
  assert.throws(() => loadProjectComposerCatalog(root), /frontend-only capability is not an appDomain of its pack: showcase/);
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

// ── 선택 연동(integrates, 설계서 9.1·B4) ──────────────────────────────────────────────

const edgeKey = edge => `${edge.from} -> ${edge.to} via ${edge.via}`;
const replaceIn = (root, path, from, to) => {
  const source = readFileSync(join(root, path), 'utf8');
  assert.ok(source.includes(from), `${path} fixture anchor`);
  writeFileSync(join(root, path), source.replace(from, to));
};

test('selective integrations are declared exactly and every evidence line points at the code that proves them', () => {
  assert.deepEqual(catalog.integrates.map(edgeKey), [
    'board -> community via fk-optional:fk_tb_bbs_master_tb_cmnty_info',
    'board -> notification via event:NotificationRequestedEvent',
    'community -> notification via event:NotificationRequestedEvent',
    'core -> notification via event:NotificationRequestedEvent',
    'informalsanction -> mail via event:MailRequestedEvent',
    'informalsanction -> notification via event:NotificationRequestedEvent',
    'informalsanction -> sms via event:SmsRequestedEvent',
    'mail -> addressbook via port:RecipientAddressBookSource',
    'mail -> notification via event:NotificationRequestedEvent',
    'memoreport -> notification via event:NotificationRequestedEvent',
    'note -> notification via event:NotificationRequestedEvent',
    'sms -> addressbook via port:RecipientAddressBookSource',
    'sms -> notification via event:NotificationRequestedEvent',
  ]);
  for (const edge of catalog.integrates) {
    const [kind, target] = edge.via.split(/:(.+)/);
    assert.match(edge.reason, /^[^A-Za-z]+\.$/, `${edgeKey(edge)}: plain Korean sentence without internal names`);
    for (const evidence of edge.evidence) {
      const line = readFileSync(join(ROOT, evidence.path), 'utf8').split(/\r?\n/)[evidence.line - 1];
      const expected = evidence.role === 'anchor'
        ? INTEGRATES.find(row => edgeKey(row) === edgeKey(edge)).anchors.find(row => row.path === evidence.path).anchor : target;
      assert.ok(line?.includes(expected), `${edgeKey(edge)}: ${evidence.path}:${evidence.line} must contain ${expected}`);
    }
    if (kind === 'event') {
      assert.ok(edge.evidence.some(row => row.role === 'publisher') && edge.evidence.some(row => row.role === 'listener'), edgeKey(edge));
    }
  }
  // api-server 의 알림 리스너는 알림 서비스를 import 해 알림과 함께 지워진다 — core 발행으로 세면 안 된다.
  const core = catalog.integrates.find(edge => edge.from === 'core');
  assert.deepEqual(core.evidence.filter(row => row.role === 'publisher').map(row => row.path),
    ['business-core/src/main/java/nuri/business/service/deptjob/DeptJobService.java']);
});

test('a new cross-feature event publisher without a declaration is refused, and a removed one is stale', t => {
  const root = fixture(t);
  replaceIn(root, 'business-app/src/main/java/nuri/business/service/survey/SurveyService.java', 'public class SurveyService {',
    'public class SurveyService {\n    private Object probe() { return new nuri.foundation.core.event.NotificationRequestedEvent("u", "t", "c", "/"); }');
  assert.throws(() => loadProjectComposerCatalog(root), /undeclared integration: survey -> notification via event:NotificationRequestedEvent/);

  const stale = fixture(t);
  // 주석 속 생성은 발행이 아니다 — 남은 것이 주석뿐이면 선언이 낡았다.
  const sms = 'business-app/src/main/java/nuri/business/service/sms/SmsAsyncProcessor.java';
  const source = readFileSync(join(stale, sms), 'utf8');
  writeFileSync(join(stale, sms), source.replace(/eventPublisher\.publishEvent\(new nuri\.foundation\.core\.event\.NotificationRequestedEvent\(/,
    'notifyNothing(/* new nuri.foundation.core.event.NotificationRequestedEvent( */'));
  assert.throws(() => loadProjectComposerCatalog(stale), /declared event integration has no publisher and listener: sms -> notification/);
});

test('registration-only cleanup listeners must still exist and an api-server source naming two features is ambiguous', t => {
  const root = fixture(t);
  replaceIn(root, 'business-app/src/main/java/nuri/business/service/addressbook/listener/AddressBookUserDeletionCleanupListener.java',
    'public void onUserDeletion(UserDeletionEvent event)', 'public void onUserDeletion(RetiredCleanupEvent event)');
  assert.throws(() => loadProjectComposerCatalog(root), /registration-only event has no publisher and listener: core -> addressbook via UserDeletionEvent/);

  // 소유 디렉터리 없이 두 기능을 참조하는 api-server 파일은 이벤트 소유 판정 전에 간선 판정(DEC-OPS-280)이 거부한다 — 어느 기능이
  // 그 파일을 요구하는지 정할 수 없다. 이벤트 소유의 모호성 자체는 아래 sourceOwner 단위 시험이 본다.
  const ambiguous = fixture(t);
  const probe = 'api-server/src/main/java/nuri/api/ProbePublisher.java';
  writeFileSync(join(ambiguous, probe), 'package nuri.api;\nimport nuri.business.service.mail.MailService;\nimport nuri.business.service.note.NoteService;\n'
    + 'class ProbePublisher { MailService mail; NoteService note; Object probe() { return new nuri.foundation.core.event.NotificationRequestedEvent("u", "t", "c", "/"); } }\n');
  assert.throws(() => loadProjectComposerCatalog(ambiguous),
    /api-server source references several capabilities without an owning directory: api-server\/src\/main\/java\/nuri\/api\/ProbePublisher\.java \(mail, note\)/);
});

/*
 * api-server 컨트롤러의 기능 결합(DEC-OPS-280). 생성기는 지운 기능의 타입을 참조하는 api-server 파일을 연쇄로 지운다. 업무 앱만 세면
 * 커뮤니티 사용자 API(게시판 목록·가입·탈퇴)가 게시판 참조로 지워지는 결합이 간선에 없어, 다른 간선이 빠지는 순간 커뮤니티만 고른
 * 생성물이 그 API 없이 생성·검증을 통과한다. 디렉터리 소유 기능이 나머지 참조 기능을 요구한다고 센다.
 */
test('an api-server source requires, from its owning directory feature, every other feature it references', t => {
  const apiEdges = (from, to) => catalog.capabilities.find(row => row.id === from).requires
    .filter(row => row.domain === to && row.kind === 'java' && row.evidence.startsWith('api-server/')).map(row => row.evidence);
  assert.deepEqual(apiEdges('community', 'board'), ['api-server/src/main/java/nuri/api/controller/business/community/CommunityUserApiController.java'],
    'community requires board through its user API');
  assert.deepEqual(apiEdges('comment', 'board'), ['api-server/src/main/java/nuri/api/controller/business/comment/CommentApiController.java'],
    'comment requires board through its API');
  // 기능 사이 api-server 간선은 이 둘뿐이다. 늘면 사용자 문장과 수동 삭제 표가 함께 움직인다.
  assert.deepEqual(catalog.capabilities.flatMap(row => row.requires.filter(edge => edge.kind === 'java' && edge.evidence.startsWith('api-server/'))
    .map(edge => `${row.id}>${edge.domain}`)).sort(), ['comment>board', 'community>board']);
  // 근거 파일의 지문이 카탈로그 해시에 들어간다.
  const root = fixture(t);
  assert.equal(loadProjectComposerCatalog(root).provenance.sourceInventoryHash, catalog.provenance.sourceInventoryHash);
  const controller = 'api-server/src/main/java/nuri/api/controller/business/community/CommunityUserApiController.java';
  writeFileSync(join(root, controller), `// 지문만 바뀐다\n${readFileSync(join(root, controller), 'utf8')}`);
  assert.notEqual(loadProjectComposerCatalog(root).provenance.sourceInventoryHash, catalog.provenance.sourceInventoryHash);
});

test('port and optional foreign key evidence must occur exactly once in code, never only in a comment', t => {
  const mail = 'frontend/src/app/admin/collaboration/mail-send/MailSendHubClient.tsx';
  const anchor = "useRecipientAddressBook('mail')";
  const drifted = fixture(t);
  replaceIn(drifted, mail, anchor, 'undefined');
  assert.throws(() => loadProjectComposerCatalog(drifted), /declared integration drifted: frontend\/src\/app\/admin\/collaboration\/mail-send\/MailSendHubClient\.tsx/);
  const commented = fixture(t);
  replaceIn(commented, mail, anchor, `/* ${anchor} */ undefined`);
  assert.throws(() => loadProjectComposerCatalog(commented), /declared integration drifted/);
  const duplicated = fixture(t);
  replaceIn(duplicated, mail, anchor, `${anchor}; ${anchor}`);
  assert.throws(() => loadProjectComposerCatalog(duplicated), /integration evidence anchor is ambiguous/);
});

test('listener and publisher detection covers qualified, class-argument and functional forms and ignores comments and strings', () => {
  const code = stripComments([
    'class A {',
    '  @org.springframework.context.event.EventListener',
    '  public void a(final com.x.FirstEvent event) {}',
    '  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, condition = "#e.ok()")',
    '  @Async',
    '  void b(@NonNull SecondEvent e) {}',
    '  @EventListener({ThirdEvent.class, FourthEvent.class})',
    '  void c() {}',
    '  // @EventListener void hidden(HiddenEvent e) {}',
    '  String s = "@EventListener void quoted(QuotedEvent e)";',
    // 클래스를 적으면 그 클래스만 받는다 — 매개변수는 상위 타입일 수 있다(Spring 과 같다).
    '  @EventListener(SixthEvent.class) public void d(Object any) {}',
    // 수식어 뒤의 애노테이션 괄호를 매개변수로 읽지 않는다.
    '  @EventListener public @Transactional(propagation = Propagation.MANDATORY) java.util.List<String> e(SeventhEvent e) { return null; }',
    '}',
    'class B implements ApplicationListener<com.y.FifthEvent> {}',
  ].join('\n'), { strings: false });
  assert.deepEqual(eventListenersIn(code).map(row => `${row.type}@${row.line}`),
    ['FirstEvent@3', 'SecondEvent@6', 'ThirdEvent@8', 'FourthEvent@8', 'SixthEvent@11', 'SeventhEvent@12', 'FifthEvent@14']);
  assert.throws(() => eventListenersIn(stripComments('class C { @EventListener\n void none() {} }', { strings: false })), /Event listener type could not be resolved/);
  // 생성자·생성자 참조·빌더/팩토리 호출을 모두 발행으로 센다. .class 와 주석·문자열·텍스트 블록 안은 세지 않는다.
  const publishers = stripComments([
    'a(new x.y.Evt(1)); b(Evt::new); // new Evt(',
    ' c("new Evt("); d(Evt.builder().build()); e(Evt.class);',
    ' String t = """',
    '   new Evt( \\""" still inside',
    '   """; f(x.Evt.of(2));',
  ].join('\n'), { strings: false });
  assert.deepEqual(eventConstructionsIn(publishers, 'Evt'), [1, 1, 2, 5]);
});

test('a listener whose type is too broad, or an anchor in a test file, is refused', t => {
  const root = fixture(t);
  const probe = 'business-app/src/main/java/nuri/business/service/survey/listener/SurveyProbeListener.java';
  mkdirSync(dirname(join(root, probe)), { recursive: true });
  writeFileSync(join(root, probe), 'package nuri.business.service.survey.listener;\nclass SurveyProbeListener {\n  @org.springframework.context.event.EventListener\n  void on(Object event) {}\n}\n');
  assert.throws(() => loadProjectComposerCatalog(root), /Event listener type is too broad to tell its events apart: .+SurveyProbeListener\.java:4 Object/);
  const triple = { from: 'a', to: 'c', event: 'Evt', publishers: [], listeners: [] };
  const testAnchor = { from: 'a', to: 'c', via: 'port:Thing', reason: '설명입니다.',
    anchors: [{ path: 'frontend/src/app/components/ui/__tests__/recipient-picker.test.tsx', anchor: 'RecipientPicker' }] };
  assert.throws(() => resolveIntegrations({ root: ROOT, declared: [testAnchor], registrationOnly: [], triples: [triple], canDegrade: () => true,
    domains: ['a', 'c'], optionalForeignKeys: [] }), /integration evidence is not a product source/);
});

test('a TSX apostrophe before a commented-out anchor does not hide the comment', t => {
  const root = fixture(t);
  const mail = 'frontend/src/app/admin/collaboration/mail-send/MailSendHubClient.tsx';
  // 실제 사용 지점은 걷고, 같은 문장을 JSX 텍스트의 따옴표 뒤 주석에만 남긴다.
  replaceIn(root, mail, "useRecipientAddressBook('mail')", 'undefined');
  replaceIn(root, mail, 'addressBook={addressBook?.source}', "<span>don't</span> {/* useRecipientAddressBook('mail') */}");
  assert.throws(() => loadProjectComposerCatalog(root), /declared integration drifted/);
  // 코드 위치의 따옴표는 계속 문자열이다 — 문자열 속 '//' 를 주석으로 읽지 않는다.
  assert.equal(stripComments("const a = 'http://x'; f(b);", { kind: 'ts' }), "const a = 'http://x'; f(b);");
  assert.equal(stripComments("<p>it's // shown</p>", { kind: 'ts' }).includes('shown'), false);
});

test('event-source ownership follows support declarations, the module and the dominant referenced feature', () => {
  const capabilities = [{ id: 'board', requires: [{ domain: 'comment' }] }, { id: 'comment', requires: [{ domain: 'board' }] },
    { id: 'mail', requires: [] }, { id: 'note', requires: [] }, { id: 'system', requires: [{ domain: 'board' }] }];
  const owner = sourceOwner(new Map([['business-core/src/main/java/x/Support.java', 'mail']]), capabilities.map(row => row.id), requiresClosure(capabilities));
  assert.equal(owner('business-core/src/main/java/x/Support.java', ''), 'mail');
  // business-core 의 nuri.business.service.system 패키지는 선택 기능 system 이 아니다.
  assert.equal(owner('business-core/src/main/java/nuri/business/service/system/job/Job.java', 'package nuri.business.service.system.job;'), 'core');
  assert.equal(owner('business-app/src/main/java/nuri/business/service/note/A.java', 'import nuri.business.service.mail.M;'), 'note');
  assert.equal(owner('api-server/src/main/java/nuri/api/A.java', 'import nuri.business.service.mail.M;'), 'mail');
  // 서로 끌어오는 두 기능, 또는 한쪽이 다른 쪽을 끌어오면 소유가 정해진다.
  assert.equal(owner('api-server/src/main/java/nuri/api/B.java', 'import nuri.business.service.comment.C; import nuri.business.service.board.B;'), 'board');
  assert.equal(owner('api-server/src/main/java/nuri/api/C.java', 'import nuri.business.service.system.S; import nuri.business.service.board.B;'), 'system');
  assert.throws(() => owner('api-server/src/main/java/nuri/api/D.java', 'import nuri.business.service.mail.M; import nuri.business.service.note.N;'),
    /Event source ownership is ambiguous/);
  // api-server 파일은 참조한 기능 가운데 디렉터리 소유 기능이 소유자다(DEC-OPS-280) — 카탈로그 간선과 같은 판정이다.
  //   폐포만 보면 서로 끌어오는 게시판·댓글 가운데 정렬 첫째(게시판)가 되어, 댓글 컨트롤러가 게시판 소유로 잘못 셌다.
  assert.equal(owner('api-server/src/main/java/nuri/api/controller/business/comment/E.java', 'import nuri.business.service.comment.C; import nuri.business.service.board.B;'), 'comment');
  assert.equal(owner('api-server/src/main/java/nuri/api/controller/business/mail/F.java', 'import nuri.business.service.mail.M; import nuri.business.service.note.N;'), 'mail');
  // 디렉터리 소유 기능을 참조하지 않으면 그 파일의 생존은 디렉터리와 무관하다 — 폐포 규칙으로 정한다.
  assert.equal(owner('api-server/src/main/java/nuri/api/controller/business/note/G.java', 'import nuri.business.service.comment.C; import nuri.business.service.board.B;'), 'board');
});

test('one predicate decides both whether an event needs a declaration and whether a declaration can ever degrade', () => {
  const capabilities = [
    { id: 'a', requires: [{ domain: 'b', customOnly: true }] }, { id: 'b', requires: [] }, { id: 'c', requires: [] },
  ];
  const presets = [{ id: 'p', domains: ['a', 'b'] }];
  const canDegrade = degradationPredicate(capabilities, presets);
  // a 는 직접 선택에서 b 를 끌어오고(화면 결합), a 를 담은 프리셋도 b 를 담는다 — a 가 b 없이 있을 수 없다.
  assert.equal(canDegrade('a', 'b'), false);
  assert.equal(canDegrade('a', 'c'), true);
  assert.equal(canDegrade('core', 'a'), true);
  assert.equal(degradationPredicate(capabilities, [...presets, { id: 'q', domains: ['a'] }])('a', 'b'), true, 'a preset without b makes the edge live');
  const triple = { from: 'a', to: 'b', event: 'Evt', publishers: [{ path: 'x', line: 1 }], listeners: [{ path: 'y', line: 2 }] };
  // 합성 시험은 실제 기여 분류표와 무관하다 — 기여도, 등록만 하는 기여도 비운다(실제 표는 아래 슬롯 기여 시험이 본다).
  const base = { root: ROOT, registrationOnly: [], registrationOnlyContributions: [], domains: ['a', 'b', 'c'], optionalForeignKeys: [], canDegrade };
  // 늘 함께 있는 쌍의 발행은 선언 없이 통과하고, 선언하면 '저하될 수 없다' 로 거부된다. 두 판정 사이에 빈틈이 없다.
  assert.deepEqual(resolveIntegrations({ ...base, declared: [], triples: [triple] }), []);
  assert.throws(() => resolveIntegrations({ ...base, triples: [triple], declared: [{ from: 'a', to: 'b', via: 'event:Evt', reason: '설명입니다.' }] }),
    /declared integration can never degrade: a -> b/);
});

test('integration declarations reject unknown kinds, duplicates, double classification and a missing optional key', () => {
  const triple = { from: 'a', to: 'c', event: 'Evt', publishers: [{ path: 'x', line: 1 }], listeners: [{ path: 'y', line: 2 }] };
  const base = { root: ROOT, registrationOnly: [], registrationOnlyContributions: [], domains: ['a', 'b', 'c'], optionalForeignKeys: [],
    canDegrade: () => true, triples: [triple] };
  const edge = { from: 'a', to: 'c', via: 'event:Evt', reason: '설명입니다.' };
  assert.equal(resolveIntegrations({ ...base, declared: [edge] }).length, 1);
  assert.throws(() => resolveIntegrations({ ...base, declared: [{ ...edge, via: 'slot:home.cards' }] }), /unsupported integration kind: slot:home\.cards/);
  assert.throws(() => resolveIntegrations({ ...base, declared: [edge, edge] }), /duplicate integration/);
  assert.throws(() => resolveIntegrations({ ...base, declared: [{ ...edge, reason: 'english only' }] }), /integration needs a user sentence/);
  assert.throws(() => resolveIntegrations({ ...base, declared: [edge], registrationOnly: [{ from: 'a', to: 'c', event: 'Evt', reason: '정리합니다.' }] }),
    /event classified twice: a -> c via Evt/);
  assert.throws(() => resolveIntegrations({ ...base, declared: [edge], optionalForeignKeys: [{ name: 'fk_x', sourceDomain: 'a', targetDomain: 'b' }] }),
    /optional foreign key lacks its integration: fk_x/);
  assert.throws(() => resolveIntegrations({ ...base, declared: [{ ...edge, anchors: [{ path: 'x', anchor: 'y' }] }] }),
    /event integration evidence is derived, not declared/);
});

/*
 * 슬롯 기여(슬롯 단계 PR-4). 기여 디렉터리(src/extensions/<기능 id>)는 그 기능의 paths 와 소유 pack 의 removePaths 양쪽에 있어야 하고,
 * 기여 파일은 연동 근거(INTEGRATES anchor)나 REGISTRATION_ONLY_CONTRIBUTIONS 중 정확히 한쪽으로 분류돼야 한다.
 */
test('a slot contribution directory is a feature declared in both its feature paths and its pack removePaths', t => {
  const contribution = 'frontend/src/extensions/addressbook/recipient-picker-sources.ts';
  assert.ok(catalog.capabilities.find(capability => capability.id === 'addressbook').frontend.paths.includes('src/extensions/addressbook'));
  assert.ok(manifest.packs.demo.frontend.removePaths.includes('src/extensions/addressbook'));
  assert.ok(catalog.integrates.filter(edge => edge.to === 'addressbook').every(edge => edge.evidence.some(row => row.path === contribution)),
    'the address book contribution evidences both recipient picker integrations');
  const writeManifest = (root, edit) => {
    const value = JSON.parse(readFileSync(join(root, 'config/reusable-base-profiles.json'), 'utf8'));
    edit(value);
    writeFileSync(join(root, 'config/reusable-base-profiles.json'), JSON.stringify(value, null, 2));
  };
  const unknown = fixture(t);
  mkdirSync(join(unknown, 'frontend/src/extensions/widgetlab'), { recursive: true });
  writeFileSync(join(unknown, 'frontend/src/extensions/widgetlab/recipient-picker-sources.ts'), 'export default [];\n');
  assert.throws(() => loadProjectComposerCatalog(unknown), /slot contribution directory is not a feature: src\/extensions\/widgetlab/);
  const featureOnly = fixture(t);
  writeManifest(featureOnly, value => { value.packs.demo.frontend.removePaths = value.packs.demo.frontend.removePaths.filter(path => path !== 'src/extensions/addressbook'); });
  assert.throws(() => loadProjectComposerCatalog(featureOnly), /slot contribution directory is missing from its pack removePaths: src\/extensions\/addressbook \(demo\)/);
  const wrongPack = fixture(t);
  writeManifest(wrongPack, value => { value.packs.collaboration.frontend.removePaths.push('src/extensions/addressbook'); });
  assert.throws(() => loadProjectComposerCatalog(wrongPack), /pack removes a slot path that is not its feature's contribution directory: collaboration src\/extensions\/addressbook/);
  const undeclared = fixture(t);
  mkdirSync(join(undeclared, 'frontend/src/extensions/sms'), { recursive: true });
  writeFileSync(join(undeclared, 'frontend/src/extensions/sms/recipient-picker-sources.ts'), 'export default [];\n');
  assert.throws(() => loadProjectComposerCatalog(undeclared), /slot contribution directory is missing from its feature paths: src\/extensions\/sms/);
  const stray = fixture(t);
  writeFileSync(join(stray, 'frontend/src/extensions/helpers.ts'), 'export {};\n');
  assert.throws(() => loadProjectComposerCatalog(stray), /슬롯 디렉터리에는/);
});

test('every slot contribution is classified exactly once: an integration it evidences, or a registration-only reason', () => {
  const path = 'frontend/src/extensions/addressbook/recipient-picker-sources.ts';
  const contributions = [{ path, owner: 'addressbook', slot: 'recipient-picker-sources' }];
  const base = { root: ROOT, registrationOnly: [], domains: ['mail', 'sms', 'addressbook'], optionalForeignKeys: [], canDegrade: () => true, triples: [] };
  const edge = { from: 'mail', to: 'addressbook', via: 'port:X', reason: '설명입니다.', anchors: [{ path, anchor: "defineContributions('recipient-picker-sources'" }] };
  const registered = [{ path, reason: '기능 자신의 진입점만 사라집니다.' }];
  assert.equal(resolveIntegrations({ ...base, declared: [edge], contributions, registrationOnlyContributions: [] }).length, 1);
  assert.equal(resolveIntegrations({ ...base, declared: [], contributions, registrationOnlyContributions: registered }).length, 0);
  assert.throws(() => resolveIntegrations({ ...base, declared: [], contributions, registrationOnlyContributions: [] }),
    /unclassified slot contribution: frontend\/src\/extensions\/addressbook\/recipient-picker-sources\.ts/);
  assert.throws(() => resolveIntegrations({ ...base, declared: [edge], contributions, registrationOnlyContributions: registered }), /slot contribution classified twice/);
  assert.throws(() => resolveIntegrations({ ...base, declared: [{ ...edge, to: 'sms' }], contributions, registrationOnlyContributions: [] }),
    /slot contribution evidences another feature's integration/);
  assert.throws(() => resolveIntegrations({ ...base, declared: [], contributions, registrationOnlyContributions: [...registered, ...registered] }),
    /duplicate registration-only contribution/);
  assert.throws(() => resolveIntegrations({ ...base, declared: [], contributions, registrationOnlyContributions: [{ path, reason: 'no reason' }] }),
    /registration-only contribution needs a user sentence/);
  assert.throws(() => resolveIntegrations({ ...base, declared: [edge], contributions, registrationOnlyContributions: [{ path: 'frontend/src/x.ts', reason: '없는 기여입니다.' }] }),
    /registration-only contribution is not a slot contribution file: frontend\/src\/x\.ts/);
});

/*
 * 자동 포함 사유(설계서 9.1 R5·E2). 화면은 간선의 개발자 원문 대신 기능 쌍마다 하나인 사용자 문장을 보인다.
 * 문장 선언은 실제 간선과 양방향으로 대조되어, 간선이 생기거나 사라지면 카탈로그가 만들어지지 않는다.
 */
test('every dependency edge carries one Korean sentence per feature pair and the declarations match the edges exactly', () => {
  const pairs = new Map();
  for (const capability of catalog.capabilities) for (const edge of capability.requires) {
    const key = `${capability.id}>${edge.domain}`;
    assert.equal(userReasonProblem(edge.userReason), null, key);
    assert.equal(edge.userReason, REQUIRES_USER_REASONS[key], key);
    if (pairs.has(key)) assert.equal(pairs.get(key), edge.userReason, `one sentence per pair: ${key}`);
    pairs.set(key, edge.userReason);
    for (const id of catalog.capabilities.map(item => item.id)) assert.ok(!edge.userReason.includes(id), `${key} names ${id}`);
  }
  assert.deepEqual([...pairs.keys()].sort(), Object.keys(REQUIRES_USER_REASONS).sort());
  // 같은 쌍의 코드 참조와 묶음 선언이 한 문장으로 모인다 — 종전 화면은 같은 원인을 두 번 보였다.
  const board = catalog.capabilities.find(capability => capability.id === 'board').requires.filter(edge => edge.domain === 'comment');
  assert.deepEqual(board.map(edge => edge.kind).sort(), ['java', 'manifest']);
  assert.equal(new Set(board.map(edge => edge.userReason)).size, 1);
  // 근거 없는 묶음 간선은 걷었다(DEC-OPS-272). 스크랩·행사는 코드로 게시판·결재를 요구하지만 그 반대는 없다.
  const requires = (from, to) => catalog.capabilities.find(capability => capability.id === from).requires.filter(edge => edge.domain === to).map(edge => edge.kind).sort();
  assert.deepEqual(requires('scrap', 'board'), ['java']);
  assert.deepEqual(requires('reward', 'informalsanction'), ['java']);
  // 행사는 결재를 참조하지 않는다 — 결재 참조는 포상의 것이고, 나눈 뒤 행사는 혼자 고를 수 있다.
  assert.deepEqual(requires('event', 'informalsanction'), []);
  for (const [from, to] of [['board', 'scrap'], ['comment', 'scrap'], ['scrap', 'comment'], ['informalsanction', 'event'], ['informalsanction', 'reward']]) {
    assert.deepEqual(requires(from, to), [], `${from}>${to}`);
  }
});

test('a new dependency without a sentence, a sentence without its dependency and developer text in a sentence are refused', t => {
  const root = fixture(t);
  const bridge = join(root, 'business-app/src/main/java/nuri/business/service/note/NoteMailBridge.java');
  writeFileSync(bridge, 'package nuri.business.service.note;\nclass NoteMailBridge { nuri.business.service.mail.MailService mail; }\n');
  assert.throws(() => loadProjectComposerCatalog(root), /requires edge lacks a user reason: note>mail/);
  rmSync(bridge);
  const manifestPath = join(root, 'config/reusable-base-profiles.json');
  const edited = structuredClone(manifest);
  edited.clusters = edited.clusters.filter(cluster => cluster.id !== 'realtime-stats');
  writeFileSync(manifestPath, `${JSON.stringify(edited, null, 2)}\n`);
  assert.throws(() => loadProjectComposerCatalog(root), /user reason has no requires edge: dashboard>board, dashboard>notification/);
  const capabilities = [{ id: 'a', requires: [{ domain: 'b', kind: 'java' }] }];
  assert.deepEqual(attachUserReasons(capabilities, { 'a>b': '가는 나를 씁니다.' })[0].requires[0].userReason, '가는 나를 씁니다.');
  assert.throws(() => attachUserReasons(capabilities, { 'a>b': 'BoardErrorCode 를 참조합니다.' }), /contains Latin text/);
  assert.throws(() => attachUserReasons(capabilities, { 'a>b': '가는 나를 씁니다(예전 근거는 역전됐다).' }), /contains parentheses/);
  assert.throws(() => attachUserReasons(capabilities, { 'a>b': '마침표가 없습니다' }), /must end with a period/);
  assert.throws(() => attachUserReasons(capabilities, { 'a>b': `${'길'.repeat(60)}.` }), /longer than 60 characters/);
  assert.throws(() => attachUserReasons(capabilities, { 'a>b': ' ' }), /is empty/);
  assert.throws(() => attachUserReasons(capabilities, {}), /requires edge lacks a user reason: a>b/);
  assert.throws(() => attachUserReasons(capabilities, { 'a>b': '가는 나를 씁니다.', 'b>a': '나는 가를 씁니다.' }), /user reason has no requires edge: b>a/);
});

/*
 * 화면 → 다른 기능 API 의 숨은 의존(허브 분해 H2). 프런트 import 그래프에도 Java 간선에도 보이지 않는다 — 생성 operation 은 core 다.
 * 기능 소유 프런트 파일이 부르는 생성 operation 의 컨트롤러(권한 원장 operationBindings.handler)가 참조하는 업무 기능은 그 기능의
 * requires 폐포 안이어야 한다. 지식 허브 공동 화면 간선이 가려 오던 도움말 → 게시판(도움말 센터의 FAQ·Q&A)을 UI_DEPENDENCIES 로
 * 적은 이유이며, 이 선언을 지우면 생성물은 컴파일·화면 대조를 통과하고 실행 중에 404 가 된다 — 이 단언이 유일한 그물이다.
 * 판정은 기능 파일의 직접 `xxxOperation` 참조만 본다(하한).
 */
function apiDependencyViolations(capabilities) {
  const domains = new Set(capabilities.map(capability => capability.id));
  const operations = new Map();
  const operationsSource = readFileSync(join(ROOT, 'frontend/src/types/generated-operations.ts'), 'utf8');
  for (const match of operationsSource.matchAll(/export const (\w+Operation) = [\s\S]*?method: "(\w+)",\s*path: "([^"]+)"/g)) {
    operations.set(match[1], `${match[2].toUpperCase()} ${match[3]}`);
  }
  const handlers = new Map(JSON.parse(readFileSync(join(ROOT, 'config/governance/authorization-policies.json'), 'utf8')).operationBindings
    .map(binding => [`${binding.method} ${binding.path}`, binding.handler]));
  const controllerDomains = new Map();
  const domainsOf = handler => {
    const file = join(ROOT, `api-server/src/main/java/${handler.split('#')[0].replaceAll('.', '/')}.java`);
    if (!controllerDomains.has(file)) {
      let source = '';
      try { source = readFileSync(file, 'utf8'); } catch { /* 원장에 있는데 소스가 없으면 아래 단언이 0 건으로 비지 않게 센다 */ }
      controllerDomains.set(file, [...new Set(javaDomainReferencesOf(source))].filter(domain => domains.has(domain)));
    }
    return controllerDomains.get(file);
  };
  const closure = requiresClosure(capabilities);
  const frontend = join(ROOT, 'frontend');
  const walkFiles = directory => {
    let entries;
    try { entries = readdirSync(directory, { withFileTypes: true }); } catch { return []; }
    return entries.flatMap(entry => entry.isDirectory()
      ? (entry.name === '__tests__' ? [] : walkFiles(join(directory, entry.name)))
      : (/\.tsx?$/.test(entry.name) && !/\.test\.|generated-/.test(entry.name) ? [join(directory, entry.name)] : []));
  };
  const violations = new Set();
  let checked = 0;
  for (const capability of capabilities) {
    const allowed = closure(capability.id);
    for (const path of capability.frontend.paths) {
      const target = join(frontend, path);
      const files = /\.tsx?$/.test(path) ? [target] : walkFiles(target);
      for (const file of files) {
        let source;
        try { source = readFileSync(file, 'utf8'); } catch { continue; }
        for (const match of source.matchAll(/\b(\w+Operation)\b/g)) {
          const operation = operations.get(match[1]);
          const handler = operation && handlers.get(operation);
          if (!handler) continue;
          checked += 1;
          for (const needed of domainsOf(handler).filter(domain => !allowed.has(domain))) {
            violations.add(`${relative(ROOT, file).split(sep).join('/')} [${capability.id}] ${match[1]} -> ${needed}`);
          }
        }
      }
    }
  }
  return { violations: [...violations].sort(), checked };
}

test('a feature screen calls only APIs whose controllers belong to features it requires (hidden UI-to-API edges)', () => {
  const { violations, checked } = apiDependencyViolations(catalog.capabilities);
  assert.ok(checked > 50, `operation references checked: ${checked}`);
  assert.deepEqual(violations, []);
  // 대조: 도움말 → 게시판 UI 의존을 지우면 도움말 센터 서비스의 게시판 operation 이 붉다.
  const withoutHelpBoard = catalog.capabilities.map(capability => (capability.id !== 'help' ? capability
    : { ...capability, requires: capability.requires.filter(edge => edge.domain !== 'board') }));
  assert.match(apiDependencyViolations(withoutHelpBoard).violations.join('\n'),
    /frontend\/src\/services\/business\/user\/help\/HelpUserService\.ts \[help\] getPublicFaqsOperation -> board/);
});
