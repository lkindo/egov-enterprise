import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildFrontendReachabilityCensus,
  CURRENT_REPOSITORY_ASSERTIONS,
  parseModuleReferences,
  resolveCensusModuleReference,
  validateReachabilityAssertions,
} from './frontend-reachability-census.mjs';
import {
  SOURCE_EXTENSIONS,
  frontendDirectRemovePaths,
  frontendImportSpecifiers,
  planFrontendRemoval,
  projectFrontendPackMarkers,
  resolveFrontendImport,
} from './reusable-source-frontend.mjs';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';
import { composerProfile, projectComposerFrontend } from './project-composer-source.mjs';
import { trackedAndUntrackedFiles } from './reusable-source-tree.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoots = [];

test.afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function createFixture(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'frontend-reachability-'));
  temporaryRoots.push(root);
  mkdirSync(join(root, 'frontend', 'src'), { recursive: true });
  for (const [relativePath, source] of Object.entries(files)) {
    const target = join(root, relativePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, source, 'utf8');
  }
  return root;
}

function censusFixture(root, overrides = {}) {
  return buildFrontendReachabilityCensus({
    repoRoot: root,
    documentationRoots: [],
    configRoots: [],
    profileManifestPath: null,
    routeManifestPath: null,
    ...overrides,
  });
}

let repositoryCensusCache;
/** 저장소 census 는 한 번만 만든다(전체 빌드가 수십 초다). 시험은 이 결과를 바꾸지 않는다 — 바꿀 때는 복사본을 쓴다. */
function repositoryCensus() {
  repositoryCensusCache ??= buildFrontendReachabilityCensus({ repoRoot });
  return repositoryCensusCache;
}

function byFile(census, file) {
  const entry = census.files.find((candidate) => candidate.file === file);
  assert.ok(entry, `census entry missing: ${file}`);
  return entry;
}

test('immediate createRequire tracks literal dependencies and rejects dynamic or escaping factories', () => {
  for (const base of ['__filename', 'import.meta.url']) {
    const parsed = parseModuleReferences(`const loaded = createRequire(${base})('./target');`);
    assert.deepEqual(parsed.issues, []);
    assert.deepEqual(parsed.references, [{ kind: 'create-require', specifier: './target', typeOnly: false, line: 1 }]);
  }
  for (const source of [
    'createRequire(__filename)(target);',
    "createRequire(__filename)('./target', extra);",
    'consume(createRequire(__filename));',
  ]) {
    assert.ok(parseModuleReferences(source).issues.length > 0, source);
  }
});

test('immediate createRequire keeps local dependencies reachable and missing targets red', () => {
  const root = createFixture({
    'frontend/e2e/consumer.ts': "import { createRequire } from 'node:module';\nconst loaded = createRequire(__filename)('../src/target');\n",
    'frontend/src/target.ts': 'export const target = true;\n',
  });
  const target = byFile(censusFixture(root), 'frontend/src/target.ts');
  assert.equal(target.reachability.test, true);
  assert.equal(target.evidencePaths.test.edges.at(-1).kind, 'create-require');
  const missingRoot = createFixture({
    'frontend/e2e/consumer.ts': "createRequire(__filename)('../src/missing');\n",
    'frontend/src/anchor.ts': 'export const anchor = true;\n',
  });
  assert.throws(() => censusFixture(missingRoot), /MISSING_IMPORT_TARGET/);
});

test('current repository keeps the known live chain and user hub split explicit', () => {
  const census = repositoryCensus();
  assert.deepEqual(validateReachabilityAssertions(census, CURRENT_REPOSITORY_ASSERTIONS), []);
  assert.ok(census.summary.population > 0);
  assert.equal(census.summary.issueCount, 0);

  // [2026-09-07] 쪽지 작성이 UserPicker → RecipientPicker 로 옮겨가면서 이 체인의 **진입점**이
  // 바뀌었다. UserPicker 자체는 죽지 않았다 — 메모보고와 결재 기안 다이얼로그가 계속 렌더한다.
  // 이 단언이 지키는 것은 "가상 리스트가 실제 라우트에서 도달 가능하다" 이지 특정 진입점이 아니므로,
  // 진입점 변경은 체인을 갱신해 기록하고 도달 불가로의 회귀만 red 로 남긴다.
  const virtualList = byFile(census, 'frontend/src/app/components/ui/virtual-scroll-list.tsx');
  assert.equal(virtualList.deletionClass, 'runtime-reachable');
  assert.deepEqual(
    virtualList.evidencePaths.runtime.nodes,
    [
      'frontend/src/app/admin/operation/memo-reports/page.tsx',
      'frontend/src/app/admin/operation/memo-reports/MemoReportManagementClient.tsx',
      'frontend/src/app/components/ui/user-picker.tsx',
      'frontend/src/app/components/ui/virtual-scroll-list.tsx',
    ],
  );
  // UserPicker 가 소비자를 모두 잃으면 위 체인이 통째로 사라지므로, 그 자체의 도달성도 못 박는다.
  assert.equal(byFile(census, 'frontend/src/app/components/ui/user-picker.tsx').deletionClass, 'runtime-reachable');

  // [2026-08-23 m-2] test-only 로 분류돼 있던 manage/UserManageClient.tsx 는 전용 테스트와 함께
  // 삭제됐다 — 실제 라우트가 렌더하는 것은 아래 UserOrgHubClient 다. 재유입은 census 에 다시 잡힌다.
  assert.equal(
    census.files.some((file) => file.file.includes('UserManageClient')),
    false,
  );

  const liveHub = byFile(census, 'frontend/src/app/admin/user/UserOrgHubClient.tsx');
  assert.equal(liveHub.deletionClass, 'runtime-reachable');
  assert.equal(liveHub.reachability.runtime, true);
  assert.equal(liveHub.reachability.effectiveProduct, true);

  const shadowedLoginPolicy = byFile(census, 'frontend/src/app/admin/user/login-policy/page.tsx');
  assert.equal(shadowedLoginPolicy.routing.shadowedBy.kind, 'config-redirect');
  assert.equal(shadowedLoginPolicy.reachability.runtime, true);
  assert.equal(shadowedLoginPolicy.reachability.effectiveProduct, false);
});

// [2026-09-13 GAP-PACK-001 ②] 공용 수신자 피커가 demo 소유 주소록을 정적 import 해, collaboration 프로필에서
//   피커와 쪽지·메일·문자·알림 발송 화면이 import 그래프로 함께 사라지고 있었다. 피커는 이제 주소록 출처를 주입받고,
//   조합 지점(메일·문자)만 demo 마커 블록 안에서 어댑터를 넘긴다. 아래 두 단언이 그 경계를 main CI 에서 지킨다.
const COLLABORATION_SURVIVORS = [
  'frontend/src/app/components/ui/recipient-picker.tsx',
  'frontend/src/types/recipient-address-book.ts',
  'frontend/src/app/note/page.tsx',
  'frontend/src/app/admin/collaboration/mail-send/page.tsx',
  'frontend/src/app/admin/collaboration/mail-send/MailSendHubClient.tsx',
  'frontend/src/app/admin/uss/ion/sms/page.tsx',
  'frontend/src/app/admin/uss/ion/sms/SmsAdminClient.tsx',
  'frontend/src/app/admin/notifications/page.tsx',
  'frontend/src/app/admin/notifications/NotificationsClient.tsx',
  'frontend/src/app/admin/notifications/NotificationDispatchDialog.tsx',
  // [2026-09-15 GAP-PACK-001] pack 별로 가른 사용자 서비스 회귀 테스트 — 아래 CORE_SURVIVORS 주석 참조.
  'frontend/src/services/business/user/__tests__/CoreUserServices.test.ts',
  'frontend/src/services/business/user/__tests__/CollaborationUserServices.test.ts',
];

/*
  [2026-09-15 GAP-PACK-001] 공용 회귀 테스트가 여러 pack 의 서비스를 한 파일에 섞고 있었다.
  투영은 import 그래프로 cascade 를 판정하므로, 가장 먼저 빠지는 pack 때문에 파일 전체가 사라지고
  **살아남은 서비스의 검증까지 함께 없어진다**. 실측 세 건:

    ComprehensiveUserServices  demo(addressbook) + core(community·deptJob)
      → core·collaboration 에서 community·deptJob 검증 소실
    FinalDomainServices        collaboration(note·scrap·mail) + demo(report) + core(menu)
      → collaboration 에서 note·scrap·mail·menu 검증 소실
    UserDomainServices         collaboration(board) + demo(approval)
      → collaboration 에서 board 검증 소실

  pack 별로 가르면 cascade 제거가 오히려 정확한 동작이 된다 — 검증 대상이 없으면 검증도 없다.
  아래 가드는 다시 섞이는 회귀를 main CI 에서 잡는다. core 파일은 어떤 프로필에서도 빠지지 않아야
  하므로 가장 좁은 프로필(core)로 따로 본다.
*/
const CORE_SURVIVORS = [
  'frontend/src/services/business/user/__tests__/CoreUserServices.test.ts',
  // [2026-09-22 #707] 모니터링 허브는 core 화면인데 댓글(collaboration) 행 타입을 마커 밖에서 타입 전용으로 참조하는
  //   회귀가 들어와, core 투영에서 허브가 연쇄 제거되고 그곳을 목적지로 둔 관측성 리다이렉트 페이지까지 사라졌다.
  //   투영 tsc 는 CI 20분 뒤에야 잡았다 — 이 목록은 같은 회귀를 운영 계약(몇 초)에서 잡는다.
  'frontend/src/app/admin/system/monitoring/hub/page.tsx',
  'frontend/src/app/admin/system/monitoring/MonitoringHubClient.tsx',
  'frontend/src/app/admin/system/monitoring/components/MonitoringPanels.tsx',
  'frontend/src/app/admin/observability/page.tsx',
  // [Phase 0c] 통계 셸과 게시판 데이터를 쓰지 않는 통계 화면은 core 다. 셸은 게시판·설문 탭을 마커와 설문 패널로
  //   받으므로, 그 import 가 마커 밖으로 새면 core 투영에서 통계 화면 전체가 연쇄로 사라진다.
  'frontend/src/app/admin/stats/page.tsx',
  'frontend/src/app/admin/stats/AdminStatsClient.tsx',
  'frontend/src/app/admin/stats/IntelligenceHubClient.tsx',
  'frontend/src/app/admin/stats/StatsHubParts.tsx',
  'frontend/src/app/admin/stats/StatsHubFallback.tsx',
  'frontend/src/app/admin/stats/user/page.tsx',
  'frontend/src/app/admin/stats/screen/page.tsx',
  'frontend/src/app/admin/stats/report/page.tsx',
  'frontend/src/services/foundation/system/StatsAdminService.ts',
  'frontend/src/types/foundation/stats.ts',
];

test('core 프로필에서 살아남아야 하는 파일은 제외 pack 을 참조하지 않는다(주석·타입 전용 참조 포함)', () => {
  const manifest = JSON.parse(readFileSync(join(repoRoot, 'config/reusable-base-profiles.json'), 'utf8'));
  const exclusion = profileExclusion(manifest, 'core');
  const frontendRoot = join(repoRoot, 'frontend');
  assert.ok(exclusion.excludedRemovePaths.length > 0, 'core must exclude at least one frontend pack path');

  const census = repositoryCensus();
  for (const survivor of CORE_SURVIVORS) {
    const file = join(repoRoot, survivor);
    assert.deepEqual(
      excludedOwnedImports({ frontendRoot, file, source: readFileSync(file, 'utf8'), ...exclusion }),
      [],
      `${survivor} references a pack excluded from core`,
    );
    const coreRemoval = byFile(census, survivor).profileRemovalConstraints
      .find((constraint) => constraint.profile === 'core');
    assert.equal(
      coreRemoval,
      undefined,
      `${survivor} is removed from the core profile via ${JSON.stringify(coreRemoval?.evidencePath)}`,
    );
  }
  // [2026-09-27 DIP B5 F11] 하네스 아틀라스(정적 스킬 카탈로그·예시 계측 로그)는 demo 소유 샘플이다. 허브는 그 탭을
  //   demo 마커 안에서만 등록하므로, removePaths 에서 빠지면 탭은 사라지고 파일만 core 에 고아로 남는다.
  const harnessAtlas = byFile(census, 'frontend/src/app/admin/system/monitoring/components/HarnessAtlasPanels.tsx');
  assert.equal(
    harnessAtlas.profileRemovalConstraints.find((constraint) => constraint.profile === 'core')?.removal,
    'direct',
    'the harness atlas sample tab must be a demo removePath',
  );
});

/*
  [2026-09-22 GAP-PACK-001 · #707] route census(config/ui-route-capabilities.json)의 directProjectionProfiles 는
  선언 removePaths 만 본 관찰이라 "그 프로필에 남는다" 는 뜻이 아니다(그 계약의 note 가 명시). 실제 생존은 import
  cascade 를 따르는 이 도달성 census 가 안다. #707 에서 core 화면(모니터링 허브)이 collaboration 행 타입을 마커
  밖에서 참조해 core 투영에서 통째로 사라졌는데 원장 투영은 red 가 아니었고 20분짜리 투영 tsc 만 잡았다.

  아래는 "선언상 생존인데 cascade 로 사라지는 라우트" 의 exact 승인 집합이다(DEC-OPS-090 의 edge exact 패턴).
  늘어나면 새 소실이라 red, 줄어들면 낡은 승인이라 red. 현재 14건은 전부 화면이 collaboration 서비스를 정당하게
  쓰는 경우이며 route census 쪽 관찰 한계일 뿐이다. 새 항목을 넣기 전에 잘못된 import(가이드 §3.7-7)가 아닌지
  먼저 본다 — 승인 집합은 서랍이 아니다(H2). 위 CORE_SURVIVORS 는 주석 인용까지 보는 원문 축이라 별개로 둔다.
*/
const APPROVED_TRANSITIVE_ROUTE_LOSSES = [
  { profile: 'core', route: '/admin/collaboration', configuredPath: 'src/services/business/user/NoteService.ts', reason: '협업 허브가 쪽지 서비스(collaboration)를 쓴다' },
  { profile: 'core', route: '/admin/collaboration/mail-history', configuredPath: 'src/services/business/mail/MailService.ts', reason: '메일 이력은 메일 서비스(collaboration) 소비자다' },
  { profile: 'core', route: '/admin/collaboration/mail-send', configuredPath: 'src/services/business/mail/MailService.ts', reason: '메일 발송은 메일 서비스(collaboration) 소비자다' },
  { profile: 'core', route: '/admin/collaboration/scraps', configuredPath: 'src/services/business/user/NoteService.ts', reason: '협업 허브 클라이언트를 공유한다' },
  { profile: 'core', route: '/admin/collaboration/scraps/selectScrapList', configuredPath: 'src/services/business/user/ScrapService.ts', reason: '스크랩 목록은 스크랩 서비스(collaboration) 소비자다' },
  { profile: 'core', route: '/admin/community/boards/detail', configuredPath: 'src/services/business/knowledge/knowledgeService.ts', reason: '게시글 상세는 지식 서비스(collaboration) 소비자다' },
  { profile: 'core', route: '/admin/community/boards/insert-board-article', configuredPath: 'src/app/actions/boardActions.ts', reason: '게시글 작성은 게시판 서버 액션(collaboration) 소비자다' },
  { profile: 'core', route: '/admin/community/boards/maker', configuredPath: 'src/services/foundation/system/BoardAdminService.ts', reason: '게시판 마법사는 게시판 관리 서비스(collaboration) 소비자다' },
  { profile: 'core', route: '/admin/community/boards/master', configuredPath: 'src/services/foundation/system/BoardAdminService.ts', reason: '게시판 마스터 목록은 게시판 관리 서비스(collaboration) 소비자다' },
  // Static client import makes the user service the first cascade witness; the approved route/profile is unchanged.
  { profile: 'core', route: '/admin/community/boards/select-board-list', configuredPath: 'src/services/business/user/board/BoardUserService.ts', reason: '게시판 목록은 게시판 업무 서비스(collaboration) 소비자다' },
  { profile: 'core', route: '/admin/notifications', configuredPath: 'src/services/foundation/system/NotificationAdminService.ts', reason: '알림 센터의 관리자 발송 다이얼로그(DEC-OPS-042)가 알림 관리 서비스(collaboration)를 쓴다' },
  { profile: 'core', route: '/admin/uss/ion/sms', configuredPath: 'src/services/foundation/operation/SmsAdminService.ts', reason: '문자 관리는 문자 서비스(collaboration) 소비자다' },
  { profile: 'core', route: '/cop/sms/selectSmsList', configuredPath: 'src/services/foundation/operation/SmsAdminService.ts', reason: '문자 별칭 페이지는 같은 문자 서비스(collaboration) 소비자다' },
  { profile: 'core', route: '/note', configuredPath: 'src/services/business/user/NoteService.ts', reason: '쪽지함은 쪽지 서비스(collaboration) 소비자다' },
];

/** route census 가 생존이라 선언한 라우트 중 도달성 census 가 cascade 로 지우는 것을 모은다. */
function transitiveRouteLosses(routeCensus, census) {
  const losses = [];
  for (const route of routeCensus.routes) {
    const row = census.files.find((candidate) => candidate.file === route.source);
    if (!row) throw new Error(`${route.route}: ${route.source} has no reachability census row`);
    for (const profile of route.directProjectionProfiles ?? []) {
      const constraint = row.profileRemovalConstraints.find((candidate) => candidate.profile === profile);
      if (!constraint) continue;
      if (constraint.removal !== 'transitive') {
        throw new Error(`${route.route}@${profile}: ${constraint.removal} removal contradicts directProjectionProfiles`);
      }
      losses.push({ profile, route: route.route, configuredPath: constraint.configuredPath, evidencePath: constraint.evidencePath });
    }
  }
  return losses;
}

const lossKey = (entry) => `${entry.profile}\u0000${entry.route}\u0000${entry.configuredPath}`;

/** exact 대조 — 승인 밖 소실, 낡은 승인, 사유 없는 승인을 모두 위반으로 낸다. */
function transitiveRouteLossViolations(losses, approved) {
  const violations = [];
  for (const entry of approved) {
    if (!entry.reason?.trim()) violations.push(`승인 사유 없음: ${entry.profile} ${entry.route}`);
  }
  const approvedKeys = new Set(approved.map(lossKey));
  for (const entry of losses) {
    if (!approvedKeys.has(lossKey(entry))) {
      violations.push(`승인되지 않은 라우트 소실: ${entry.profile} ${entry.route} via ${entry.evidencePath.join(' → ')} — 잘못된 import 인지(가이드 §3.7-7) 먼저 확인한다`);
    }
  }
  const actualKeys = new Set(losses.map(lossKey));
  for (const entry of approved) {
    if (!actualKeys.has(lossKey(entry))) {
      violations.push(`낡은 승인: ${entry.profile} ${entry.route} 는 더 이상 cascade 로 사라지지 않는다 — 승인에서 뺀다`);
    }
  }
  return violations;
}

test('routes the route census declares surviving are lost only where an approved cascade says so', () => {
  const routeCensus = JSON.parse(readFileSync(join(repoRoot, 'config/ui-route-capabilities.json'), 'utf8'));
  const census = repositoryCensus();
  const losses = transitiveRouteLosses(routeCensus, census);
  assert.deepEqual(transitiveRouteLossViolations(losses, APPROVED_TRANSITIVE_ROUTE_LOSSES), []);
  assert.equal(losses.length, APPROVED_TRANSITIVE_ROUTE_LOSSES.length);
});

test('the route-loss gate is red for an unapproved loss, a stale approval, a moved cascade, and a reasonless approval', () => {
  const approved = [{ profile: 'core', route: '/kept', configuredPath: 'src/services/x.ts', reason: '정당한 cascade' }];
  const losses = [{ profile: 'core', route: '/kept', configuredPath: 'src/services/x.ts', evidencePath: ['a', 'b'] }];
  assert.deepEqual(transitiveRouteLossViolations(losses, approved), []);
  const hub = { profile: 'core', route: '/hub', configuredPath: 'src/services/y.ts', evidencePath: ['hub/page.tsx', 'HubClient.tsx', 'y.ts'] };
  assert.match(transitiveRouteLossViolations([...losses, hub], approved).join('\n'),
    /승인되지 않은 라우트 소실: core \/hub via hub\/page\.tsx → HubClient\.tsx → y\.ts/u);
  assert.match(transitiveRouteLossViolations([], approved).join('\n'), /낡은 승인: core \/kept/u);
  assert.match(transitiveRouteLossViolations(losses, [{ ...approved[0], reason: ' ' }]).join('\n'), /승인 사유 없음/u);
  // 같은 라우트라도 다른 경로로 사라지면 별개 소실이다 — 바뀐 cascade 를 옛 승인이 가리지 않는다.
  const moved = transitiveRouteLossViolations([{ ...losses[0], configuredPath: 'src/services/z.ts' }], approved);
  assert.equal(moved.length, 2);
  assert.ok(moved.some((line) => line.startsWith('승인되지 않은 라우트 소실')) && moved.some((line) => line.startsWith('낡은 승인')));
});

test('a direct removal of a route the route census declares surviving is a contradiction, and a missing census row is red', () => {
  const contradiction = {
    routes: [{ route: '/x', source: 'frontend/src/app/x/page.tsx', directProjectionProfiles: ['core'] }],
  };
  const census = { files: [{ file: 'frontend/src/app/x/page.tsx', profileRemovalConstraints: [{ profile: 'core', removal: 'direct', configuredPath: 'src/app/x', evidencePath: [] }] }] };
  assert.throws(() => transitiveRouteLosses(contradiction, census), /direct removal contradicts/u);
  assert.throws(() => transitiveRouteLosses({ routes: [{ route: '/y', source: 'frontend/src/app/y/page.tsx', directProjectionProfiles: ['core'] }] }, { files: [] }), /no reachability census row/u);
});

test('recipient picker and its collaboration consumers survive the collaboration projection', () => {
  const census = repositoryCensus();
  for (const file of COLLABORATION_SURVIVORS) {
    const collaborationRemoval = byFile(census, file).profileRemovalConstraints
      .find((constraint) => constraint.profile === 'collaboration');
    assert.equal(
      collaborationRemoval,
      undefined,
      `${file} is removed from the collaboration profile via ${JSON.stringify(collaborationRemoval?.evidencePath)}`,
    );
  }
  const adapter = byFile(census, 'frontend/src/services/business/user/addressbook/recipient-address-book-source.ts');
  assert.equal(
    adapter.profileRemovalConstraints.find((constraint) => constraint.profile === 'collaboration')?.removal,
    'direct',
  );
});

/**
 * 생성기(generate-reusable-base-source.mjs)는 제외 pack 마커 블록을 먼저 지운 뒤, 주석을 지우지 않은 **원문 전체**에
 * import 정규식을 적용하고 `@/`·상대 경로를 풀어 cascade 를 판정한다. census 토크나이저는 주석을 건너뛰므로, 생존 파일
 * 주석에 옛 import 를 인용하는 회귀는 위 단언을 통과하면서 실제 생성기에서만 cascade 를 일으킨다. 그래서 **생성기의
 * 투영·판정 함수 자체**로 생존 파일을 한 번 더 본다 — 흉내 낸 정규식이 아니라 같은 코드다.
 */
function excludedOwnedImports({ frontendRoot, file, source, knownPacks, excludedPacks, excludedRemovePaths }) {
  const projected = projectFrontendPackMarkers(source, { knownPacks, excludedPacks, label: file }).source;
  return frontendImportSpecifiers(projected)
    .map((specifier) => resolveFrontendImport(frontendRoot, file, specifier, new Set()))
    .filter(Boolean)
    .map((resolved) => relative(frontendRoot, resolved).split(sep).join('/'))
    .filter((target) => excludedRemovePaths.some((removePath) => target === removePath
      || target.startsWith(`${removePath}/`)));
}

function profileExclusion(manifest, profileName) {
  const included = new Set(manifest.profiles[profileName].packs);
  const excludedPacks = new Set(Object.keys(manifest.packs).filter((packName) => !included.has(packName)));
  return {
    knownPacks: new Set(Object.keys(manifest.packs)),
    excludedPacks,
    excludedRemovePaths: [...excludedPacks].flatMap((packName) => manifest.packs[packName].frontend?.removePaths ?? []),
  };
}

test('files that must survive the collaboration projection never reference an excluded pack, comments included', () => {
  const manifest = JSON.parse(readFileSync(join(repoRoot, 'config/reusable-base-profiles.json'), 'utf8'));
  const exclusion = profileExclusion(manifest, 'collaboration');
  const frontendRoot = join(repoRoot, 'frontend');
  assert.ok(exclusion.excludedRemovePaths.length > 0, 'collaboration must exclude at least one frontend pack path');

  for (const survivor of COLLABORATION_SURVIVORS) {
    const file = join(repoRoot, survivor);
    assert.deepEqual(
      excludedOwnedImports({ frontendRoot, file, source: readFileSync(file, 'utf8'), ...exclusion }),
      [],
      `${survivor} references a pack excluded from collaboration`,
    );
  }
});

test('the survivor guard catches alias, relative and comment-only quotes, but not imports inside an excluded pack block', () => {
  const pickerSource = [
    "/** import { addressbookUserService } from '@/services/business/user/addressbook/AddressbookUserService'; */",
    "// import { addressbookUserService } from '../../../services/business/user/addressbook/AddressbookUserService';",
    "import type { NameCard } from '@/types/business/addressbook';",
    '/* reusable-base:demo:start */',
    "import { recipientAddressBookSource } from '@/services/business/user/addressbook/recipient-address-book-source';",
    '/* reusable-base:demo:end */',
    'export const Picker = () => null;',
  ].join('\n');
  const root = createFixture({
    'frontend/src/services/business/user/addressbook/AddressbookUserService.ts': 'export const addressbookUserService = {};',
    'frontend/src/services/business/user/addressbook/recipient-address-book-source.ts': 'export const recipientAddressBookSource = {};',
    'frontend/src/types/business/addressbook.ts': 'export interface NameCard { nm: string }',
    'frontend/src/app/components/ui/picker.tsx': pickerSource,
  });
  const frontendRoot = join(root, 'frontend');
  const exclusion = {
    knownPacks: new Set(['core', 'collaboration', 'survey', 'demo']),
    excludedPacks: new Set(['survey', 'demo']),
    excludedRemovePaths: ['src/services/business/user/addressbook', 'src/types/business/addressbook.ts'],
  };

  // 마커 블록 안의 어댑터 import 는 생성기가 블록째 지우므로 간선이 아니다 — 블록 밖의 인용 셋만 잡혀야 한다.
  assert.deepEqual(
    excludedOwnedImports({ frontendRoot, file: join(frontendRoot, 'src/app/components/ui/picker.tsx'), source: pickerSource, ...exclusion }),
    [
      'src/services/business/user/addressbook/AddressbookUserService.ts',
      'src/services/business/user/addressbook/AddressbookUserService.ts',
      'src/types/business/addressbook.ts',
    ],
  );
});

test('census distinguishes every evidence axis without promoting non-runtime references', () => {
  const root = createFixture({
    'frontend/src/app/page.tsx': [
      "import type { CompileOnly } from '../runtime/compile-only';",
      "import { type InlineOnly } from '../runtime/inline-only';",
      "import { type MixedType, mixedValue } from '../runtime/mixed';",
      "import { Feature } from '../runtime/barrel';",
      "export const lazy = () => import('../runtime/lazy');",
      "export const resolved = require.resolve('../runtime/resolved');",
      "type ImportedShape = typeof import('../runtime/import-type');",
      'export default function Page(): CompileOnly & InlineOnly & MixedType & ImportedShape { return Feature ?? mixedValue; }',
    ].join('\n'),
    'frontend/src/runtime/barrel.ts': "export { Feature } from './feature';\n",
    'frontend/src/runtime/feature.ts': "export const Feature = 'feature';\n",
    'frontend/src/runtime/compile-only.ts': 'export interface CompileOnly { value: string }\n',
    'frontend/src/runtime/inline-only.ts': 'export interface InlineOnly { inline: string }\n',
    'frontend/src/runtime/mixed.ts': 'export interface MixedType { mixed: string }\nexport const mixedValue = true;\n',
    'frontend/src/runtime/import-type.ts': 'export interface ImportedShape { imported: string }\n',
    'frontend/src/runtime/resolved.ts': 'export const resolved = true;\n',
    'frontend/src/runtime/lazy.ts': "export const lazy = 'lazy';\n",
    'frontend/src/lib/test-target.test.ts': "import './test-target';\n",
    'frontend/src/lib/test-target.ts': 'export const tested = true;\n',
    'frontend/src/stories/guide.stories.tsx': "import '../lib/story-target';\nexport default {};\n",
    'frontend/src/lib/story-target.ts': 'export const story = true;\n',
    'frontend/src/lib/docs-target.ts': 'export const documented = true;\n',
    'frontend/src/lib/config-target.ts': 'export const configured = true;\n',
    'frontend/src/lib/config-graph-target.ts': 'export const configuredGraph = true;\n',
    'frontend/vitest.config.mts': "export default { test: { setupFiles: ['./vitest.setup.ts'] } };\n",
    'frontend/vitest.setup.ts': "import './src/lib/config-graph-target';\n",
    'frontend/playwright.config.ts': "export default { globalTeardown: './e2e/scripts/cleanup-db.ts' };\n",
    'frontend/e2e/scripts/cleanup-db.ts': "import '../../src/lib/cleanup-target';\n",
    'frontend/src/lib/cleanup-target.ts': 'export const cleanupTarget = true;\n',
    'frontend/e2e/create-require.ts': [
      "import { createRequire } from 'node:module';",
      'const localRequire = createRequire(import.meta.url);',
      "localRequire('../src/lib/create-require-target');",
    ].join('\n'),
    'frontend/src/lib/create-require-target.ts': 'export const createRequireTarget = true;\n',
    'frontend/src/profile/direct.ts': 'export const direct = true;\n',
    'frontend/src/profile/importer.ts': "import './direct';\nexport const importer = true;\n",
    'frontend/src/lib/safe.ts': 'export const candidate = true;\n',
    'frontend/src/lib/cycle-a.ts': "import './cycle-b';\n",
    'frontend/src/lib/cycle-b.ts': "import './cycle-a';\n",
    'docs/reference.md': '`frontend/src/lib/docs-target.ts` is documentation-only.\n',
    'config/reference.json': '{"source":"frontend/src/lib/config-target.ts"}\n',
    'config/reusable-base-profiles.json': JSON.stringify({
      schemaVersion: 1,
      profiles: {
        stripped: { packs: ['core'] },
        full: { packs: ['core', 'optional'] },
      },
      packs: {
        core: {},
        optional: { frontend: { removePaths: ['src/profile/direct.ts'] } },
      },
    }),
  });
  const census = censusFixture(root, {
    documentationRoots: [join(root, 'docs')],
    configRoots: [join(root, 'config')],
    profileManifestPath: join(root, 'config', 'reusable-base-profiles.json'),
  });

  assert.equal(byFile(census, 'frontend/src/app/page.tsx').entryKinds.nextRoute, true);
  assert.equal(byFile(census, 'frontend/src/runtime/feature.ts').deletionClass, 'runtime-reachable');
  assert.equal(byFile(census, 'frontend/src/runtime/lazy.ts').evidencePaths.runtime.edges.at(-1).kind, 'dynamic-import');

  const compileOnly = byFile(census, 'frontend/src/runtime/compile-only.ts');
  assert.equal(compileOnly.reachability.runtime, false);
  assert.equal(compileOnly.reachability.productionCompile, true);
  assert.equal(compileOnly.deletionClass, 'runtime-reachable');

  const inlineOnly = byFile(census, 'frontend/src/runtime/inline-only.ts');
  assert.equal(inlineOnly.reachability.runtime, false);
  assert.equal(inlineOnly.reachability.productionCompile, true);
  const mixed = byFile(census, 'frontend/src/runtime/mixed.ts');
  assert.equal(mixed.reachability.runtime, true);
  const importType = byFile(census, 'frontend/src/runtime/import-type.ts');
  assert.equal(importType.reachability.runtime, false);
  assert.equal(importType.reachability.productionCompile, true);
  assert.equal(importType.evidencePaths.productionCompile.edges.at(-1).kind, 'import-type');
  assert.equal(byFile(census, 'frontend/src/runtime/resolved.ts').evidencePaths.runtime.edges.at(-1).kind, 'require-resolve');

  assert.equal(byFile(census, 'frontend/src/lib/test-target.ts').deletionClass, 'test-only');
  assert.equal(byFile(census, 'frontend/src/lib/story-target.ts').reachability.story, true);
  assert.equal(byFile(census, 'frontend/src/lib/story-target.ts').deletionClass, 'ambiguous');
  assert.equal(byFile(census, 'frontend/src/lib/docs-target.ts').references.docs.length, 1);
  assert.equal(byFile(census, 'frontend/src/lib/docs-target.ts').deletionClass, 'ambiguous');
  assert.equal(byFile(census, 'frontend/src/lib/config-target.ts').references.config.length, 1);
  assert.equal(byFile(census, 'frontend/src/lib/config-target.ts').deletionClass, 'ambiguous');
  assert.equal(byFile(census, 'frontend/src/lib/config-graph-target.ts').reachability.config, true);
  assert.equal(byFile(census, 'frontend/src/lib/config-graph-target.ts').deletionClass, 'test-only');
  assert.equal(byFile(census, 'frontend/src/lib/cleanup-target.ts').deletionClass, 'test-only');
  assert.equal(byFile(census, 'frontend/src/lib/create-require-target.ts').deletionClass, 'test-only');
  assert.equal(
    byFile(census, 'frontend/src/lib/create-require-target.ts').evidencePaths.test.edges.at(-1).kind,
    'create-require',
  );

  const direct = byFile(census, 'frontend/src/profile/direct.ts');
  assert.deepEqual(
    direct.profileRemovalConstraints.map(({ profile, removal }) => [profile, removal]),
    [['stripped', 'direct']],
  );
  assert.equal(direct.deletionClass, 'ambiguous');
  const transitive = byFile(census, 'frontend/src/profile/importer.ts');
  assert.deepEqual(
    transitive.profileRemovalConstraints.map(({ profile, removal }) => [profile, removal]),
    [['stripped', 'transitive']],
  );
  assert.deepEqual(
    transitive.profileRemovalConstraints[0].evidencePath,
    ['frontend/src/profile/importer.ts', 'frontend/src/profile/direct.ts'],
  );
  assert.equal(byFile(census, 'frontend/src/lib/safe.ts').deletionClass, 'safe-candidate');
  assert.equal(byFile(census, 'frontend/src/lib/cycle-a.ts').deletionClass, 'ambiguous');
  assert.equal(byFile(census, 'frontend/src/lib/cycle-b.ts').deletionClass, 'ambiguous');
});

test('empty source population is a reproducible red', () => {
  const root = createFixture();
  assert.throws(
    () => censusFixture(root),
    /\[EMPTY_POPULATION\]/,
  );
});

test('missing local dependency is a reproducible red', () => {
  const root = createFixture({
    'frontend/src/app/page.tsx': "import './missing';\nexport default function Page() { return null; }\n",
  });
  assert.throws(
    () => censusFixture(root),
    /\[MISSING_IMPORT_TARGET\].*frontend\/src\/app\/page\.tsx:1.*\.\/missing/,
  );
});

test('computed dynamic import is ambiguous in inspection mode and red in gate mode', () => {
  const root = createFixture({
    'frontend/src/app/page.tsx': 'export default function Page() { return null; }\n',
    'frontend/src/lib/computed.ts': [
      "const target = './lazy';",
      'export const load = () => import(target);',
    ].join('\n'),
    'frontend/src/lib/computed.test.ts': [
      "const target = './lazy';",
      'export const load = () => import(target);',
    ].join('\n'),
    'frontend/src/lib/lazy.ts': 'export const lazy = true;\n',
  });

  const inspection = censusFixture(root, { failOnErrors: false });
  assert.equal(byFile(inspection, 'frontend/src/lib/computed.ts').deletionClass, 'ambiguous');
  assert.equal(byFile(inspection, 'frontend/src/lib/computed.test.ts').deletionClass, 'ambiguous');
  assert.equal(byFile(inspection, 'frontend/src/lib/computed.test.ts').deletionDecision, 'blocked');
  assert.ok(inspection.issues.some(({ code }) => code === 'UNPARSEABLE_DYNAMIC_IMPORT'));
  assert.throws(
    () => censusFixture(root),
    /\[UNPARSEABLE_DYNAMIC_IMPORT\].*frontend\/src\/lib\/computed\.ts:2/,
  );
});

test('local import suffixes and dynamic import options cannot be silently simplified', () => {
  const root = createFixture({
    'frontend/src/app/page.tsx': 'export default function Page() { return null; }\n',
    'frontend/src/lib/suffix.ts': "export const load = () => import('./lazy?raw');\n",
    'frontend/src/lib/options.ts': "export const load = () => import('./data.json', { with: { type: 'json' } });\n",
    'frontend/src/lib/lazy.ts': 'export const lazy = true;\n',
    'frontend/src/lib/data.json': '{}\n',
  });
  const inspection = censusFixture(root, { failOnErrors: false });
  assert.ok(inspection.issues.some(({ code }) => code === 'UNSUPPORTED_LOCAL_IMPORT_SUFFIX'));
  assert.ok(inspection.issues.some(({ code }) => code === 'UNSUPPORTED_DYNAMIC_IMPORT_OPTIONS'));
  assert.equal(byFile(inspection, 'frontend/src/lib/suffix.ts').deletionClass, 'ambiguous');
  assert.equal(byFile(inspection, 'frontend/src/lib/options.ts').deletionClass, 'ambiguous');
  assert.throws(
    () => censusFixture(root),
    /\[(?:UNSUPPORTED_DYNAMIC_IMPORT_OPTIONS|UNSUPPORTED_LOCAL_IMPORT_SUFFIX)\]/,
  );
});

test('comment, string, and regular-expression import decoys do not create graph edges', () => {
  const root = createFixture({
    'frontend/src/app/page.tsx': 'export default function Page() { return null; }\n',
    'frontend/src/lib/decoys.ts': [
      "const text = \"import('./missing-string')\";",
      "const expression = /import\\(['\"]\\.\\/missing-regex/;",
      "// import './missing-comment';",
      'export { text, expression };',
    ].join('\n'),
  });
  const census = censusFixture(root);
  const decoys = byFile(census, 'frontend/src/lib/decoys.ts');
  assert.equal(decoys.dependencies.length, 0);
  assert.equal(decoys.deletionClass, 'safe-candidate');
});

test('config redirects separate Next build reachability from effective product reachability', () => {
  const root = createFixture({
    'frontend/src/app/shadowed/page.tsx': "import ShadowOnly from './ShadowOnly';\nexport default ShadowOnly;\n",
    'frontend/src/app/shadowed/ShadowOnly.tsx': 'export default function ShadowOnly() { return null; }\n',
    'frontend/src/app/live/page.tsx': "import Live from './Live';\nexport default Live;\n",
    'frontend/src/app/live/Live.tsx': 'export default function Live() { return null; }\n',
    'config/ui-route-capabilities.json': JSON.stringify({
      routes: [
        {
          route: '/shadowed',
          source: 'frontend/src/app/shadowed/page.tsx',
          routing: { kind: 'config-redirect', target: '/live' },
        },
        {
          route: '/live',
          source: 'frontend/src/app/live/page.tsx',
          routing: { kind: 'page' },
        },
      ],
    }),
  });
  const census = censusFixture(root, {
    routeManifestPath: join(root, 'config', 'ui-route-capabilities.json'),
  });
  const shadowedPage = byFile(census, 'frontend/src/app/shadowed/page.tsx');
  assert.equal(shadowedPage.routing.buildEntry, true);
  assert.equal(shadowedPage.routing.effectiveProductEntry, false);
  assert.equal(shadowedPage.routing.shadowedBy.kind, 'config-redirect');
  const shadowOnly = byFile(census, 'frontend/src/app/shadowed/ShadowOnly.tsx');
  assert.equal(shadowOnly.reachability.runtime, true);
  assert.equal(shadowOnly.reachability.effectiveProduct, false);
  assert.equal(shadowOnly.deletionClass, 'runtime-reachable');
  assert.equal(byFile(census, 'frontend/src/app/live/Live.tsx').reachability.effectiveProduct, true);
});

test('known live-chain misclassification is a reproducible red in a temp fixture', () => {
  const root = createFixture({
    'frontend/src/app/note/page.tsx': "import { UserPicker } from '../components/ui/user-picker';\nexport default UserPicker;\n",
    'frontend/src/app/components/ui/user-picker.tsx': "import { VirtualScrollList } from './virtual-scroll-list';\nexport const UserPicker = VirtualScrollList;\n",
    'frontend/src/app/components/ui/virtual-scroll-list.tsx': 'export const VirtualScrollList = () => null;\n',
  });
  const census = censusFixture(root);
  const assertions = {
    runtimeChains: [[
      'frontend/src/app/note/page.tsx',
      'frontend/src/app/components/ui/user-picker.tsx',
      'frontend/src/app/components/ui/virtual-scroll-list.tsx',
    ]],
  };
  assert.deepEqual(validateReachabilityAssertions(census, assertions), []);

  const faulty = structuredClone(census);
  byFile(faulty, 'frontend/src/app/components/ui/virtual-scroll-list.tsx').deletionClass = 'safe-candidate';
  assert.match(
    validateReachabilityAssertions(faulty, assertions).join('\n'),
    /runtime chain terminal misclassified/,
  );
});

/*
  [2026-10-11 Phase 2 · 설계서 C5 — 프런트 판정 동치 측정]
  프런트 연쇄 제거를 판정하는 곳이 둘이다. 생성기는 원문 정규식(frontendImportSpecifiers)으로 간선을 읽고 resolveFrontendImport 로
  파일에 잇는다. 이 census 는 주석·문자열을 건너뛰는 토크나이저(parseModuleReferences)로 간선을 읽고 자기 해석기로 잇는다.
  판정을 하나로 모으기(설계서 11장) 전에 두 판정이 어디서 다른지 재고, 그 차이가 제거 결과를 바꾸지 않는지 본다.
  - 추출(간선을 읽는 방식): 구성(프리셋과 단독 선택)마다 생성기 연쇄에 두 추출을 넣은 결과가 같아야 한다(예외 없음).
  - 판정 전체: 실제 프로필마다 census 의 제거 판정이 census 모집단(frontend/src 모듈) 안에서 생성기 결과와 같아야 한다.
    위 라우트 소실 승인은 census 판정으로 센다.
  - 차이 목록: 파일별 추출 차이와 해석 차이 대상은 아래 exact 목록이다. 새 차이도, 사라진 차이(낡은 항목)도 red 이고
    래칫은 목록 길이와 같아야 한다(줄면 함께 내린다). 차이가 가리키는 대상은 어느 구성에서도 지워지지 않아야 한다 —
    그래야 차이가 연쇄 결과를 바꾸지 못한다. 판정을 모으면 두 목록은 0 이 된다(설계서 13장 예외 목록).
*/
const IMPORT_JUDGMENT_DIFFERENCES = [
  { file: 'frontend/e2e/scripts/run-e2e-with-coverage.test.ts', target: 'frontend/scripts/build-instrumented.js', judgment: 'census-only', kind: 'create-require', reason: '도구 시험이 createRequire 로 CommonJS 스크립트를 불러온다. 생성기 정규식은 require 를 읽지 않는다.' },
  { file: 'frontend/e2e/scripts/run-e2e-with-coverage.test.ts', target: 'frontend/scripts/coverage-instrumentation-loader.js', judgment: 'census-only', kind: 'create-require', reason: '도구 시험이 createRequire 로 CommonJS 스크립트를 불러온다. 생성기 정규식은 require 를 읽지 않는다.' },
  { file: 'frontend/e2e/scripts/run-e2e-with-coverage.test.ts', target: 'frontend/scripts/run-e2e-with-coverage.js', judgment: 'census-only', kind: 'create-require', reason: '도구 시험이 createRequire 로 CommonJS 스크립트를 불러온다. 생성기 정규식은 require 를 읽지 않는다.' },
  { file: 'frontend/scripts/run-e2e-with-coverage.js', target: 'frontend/scripts/build-instrumented.js', judgment: 'census-only', kind: 'require', reason: 'CommonJS 도구 스크립트의 require 다. 생성기 정규식은 require 를 읽지 않는다.' },
  { file: 'frontend/src/__tests__/cross-stack/governance-atlas-contract.test.ts', target: 'scripts/atlas-catalog.mjs', judgment: 'census-only', kind: 'create-require', reason: '원본 Atlas 계약이 createRequire 로 저장소 루트 스크립트를 읽는다(frontend 밖 대상).' },
  { file: 'frontend/src/app/admin/security/authority/__tests__/screen-registry-fixture.ts', target: 'frontend/src/app/admin/security/authority/__tests__/screen-registry-fixture.ts', judgment: 'generator-only', reason: '사용법 주석이 vi.mock 예시로 자기 모듈의 import 를 인용한다. 생성기 정규식은 주석도 간선으로 읽는다(자기 간선이라 연쇄 결과는 같다).' },
];
const IMPORT_JUDGMENT_DIFFERENCE_RATCHET = 6;
const CENSUS_MODULE_REFERENCE_KINDS = new Set(['static-import', 're-export', 'dynamic-import', 'import-type', 'require', 'require-resolve', 'create-require']);

const IMPORT_RESOLUTION_DIFFERENCES = [
  { target: 'frontend/next.config.ts', kind: 'script-extension-mapped', reason: 'e2e 도구 시험이 `../../next.config.js` 를 동적 import 한다. census 는 .js 지정자를 .ts 로 잇고 생성기는 잇지 않는다.' },
  { target: 'frontend/src/types/generated-api.d.ts', kind: 'declaration-file', reason: '생성 API 타입 선언을 확장자 없이 import 한다. census 는 .d.ts 를 잇고 생성기는 .ts/.tsx/.js/.jsx 만 잇는다.' },
];
const IMPORT_RESOLUTION_DIFFERENCE_RATCHET = 2;
const RESOLUTION_DIFFERENCE_KINDS = new Set(['declaration-file', 'script-extension-mapped', 'generator-only', 'different-target']);

/** census 토크나이저로 읽은 간선 지정자. 판정할 수 없는 소스는 통과가 아니라 실패다. */
function censusImportSpecifiers(source) {
  const { references, issues } = parseModuleReferences(source);
  if (issues.length) throw new Error(`census tokenizer cannot judge a source: ${issues.map((issue) => `${issue.code}@${issue.line}`).join(', ')}`);
  return references.map((reference) => reference.specifier);
}

let frontendInventory;
/** 생성기가 복사하는 프런트 파일(추적·추적 안 된 파일, 지운 추적 파일 제외)과 그 원문. */
function repositoryFrontendInventory() {
  if (!frontendInventory) {
    const files = trackedAndUntrackedFiles()
      .filter((file) => file.startsWith('frontend/') && existsSync(join(repoRoot, file)))
      .map((file) => join(repoRoot, file));
    const sources = new Map(files.filter((path) => SOURCE_EXTENSIONS.includes(extname(path)))
      .map((path) => [path, readFileSync(path, 'utf8')]));
    frontendInventory = { frontendRoot: join(repoRoot, 'frontend'), files, sources };
  }
  return frontendInventory;
}

const repoPath = (path) => relative(repoRoot, path).split(sep).join('/');

/** 한 구성의 투영된 원문 위에서, 같은 생성기 연쇄에 `importSpecifiers` 를 넣어 지울 파일을 계산한다. */
function frontendRemovalWith(importSpecifiers, { manifest, profile, inventory, projected }) {
  return new Set([...planFrontendRemoval({
    frontendRoot: inventory.frontendRoot,
    files: inventory.files,
    directPaths: frontendDirectRemovePaths(manifest, profile),
    readSource: (path) => projected.get(path),
    importSpecifiers,
  }).removed].map(repoPath));
}

/** 생성기처럼 선택 투영(직접 선택)과 pack 마커 투영을 한 원문. */
function projectedFrontendSources(manifest, profile, composition, inventory) {
  const knownPacks = new Set(Object.keys(manifest.packs));
  const excludedPacks = new Set([...knownPacks].filter((pack) => !profile.packs.includes(pack)));
  return new Map([...inventory.sources].map(([path, source]) => {
    const selected = composition?.profile === 'custom' ? projectComposerFrontend(repoPath(path), source, composition) : source;
    return [path, projectFrontendPackMarkers(selected, { knownPacks, excludedPacks, label: repoPath(path) }).source];
  }));
}

/** 파일별 추출 차이 — 원본 원문에서 두 추출이 다르게 읽은 간선(둘 다 생성기 해석기로 잇는다). */
function importJudgmentDifferences(inventory) {
  const rows = [];
  const known = new Set(inventory.sources.keys());
  for (const [path, source] of inventory.sources) {
    const resolveTarget = (specifier) => resolveFrontendImport(inventory.frontendRoot, path, specifier, known);
    const generator = new Set(frontendImportSpecifiers(source).map(resolveTarget).filter(Boolean).map(repoPath));
    const census = new Map();
    for (const reference of parseModuleReferences(source, repoPath(path)).references) {
      const target = resolveTarget(reference.specifier);
      if (target) census.set(repoPath(target), reference.kind);
    }
    for (const target of generator) if (!census.has(target)) rows.push({ file: repoPath(path), target, judgment: 'generator-only' });
    for (const [target, kind] of census) if (!generator.has(target)) rows.push({ file: repoPath(path), target, judgment: 'census-only', kind });
  }
  return rows;
}

/** 해석 차이의 종류 — 지정자와 두 해석 결과에서 기계적으로 정한다. */
function resolutionDifferenceKind(specifier, censusTarget, generatorTarget) {
  if (!censusTarget) return 'generator-only';
  if (generatorTarget) return 'different-target';
  if (censusTarget.endsWith('.d.ts')) return 'declaration-file';
  if (['.js', '.jsx', '.mjs', '.cjs'].includes(extname(specifier)) && extname(censusTarget) !== extname(specifier)) return 'script-extension-mapped';
  return 'different-target';
}

/**
 * 해석 차이 — census 토크나이저가 읽은 모든 지정자를 두 해석기로 이어, 결과가 다른 **대상**과 종류.
 * 가져오는 파일이 아니라 대상으로 센다. 같은 선언 파일을 import 하는 화면이 늘어도 차이가 새로 생기지 않는다.
 */
function importResolutionDifferences(inventory) {
  const rows = new Map();
  const known = new Set(inventory.sources.keys());
  for (const [path, source] of inventory.sources) {
    for (const { specifier } of parseModuleReferences(source, repoPath(path)).references) {
      const generatorTarget = resolveFrontendImport(inventory.frontendRoot, path, specifier, known);
      const censusTarget = resolveCensusModuleReference({ repoRoot, importer: path, specifier });
      const generator = generatorTarget && repoPath(generatorTarget);
      const census = censusTarget && repoPath(censusTarget);
      if (generator === census) continue;
      const row = { target: census ?? generator, kind: resolutionDifferenceKind(specifier, census, generator) };
      rows.set(`${row.target}|${row.kind}`, row);
    }
  }
  return [...rows.values()];
}

/** exact 대조 — 형식이 틀린 항목, 목록에 없는 차이, 낡은 항목, 래칫 불일치를 모두 위반으로 낸다. */
function differenceViolations({ measured, expected, ratchet, key, inVocabulary, noun }) {
  const violations = [];
  for (const entry of expected) {
    if (!inVocabulary(entry)) violations.push(`${noun} 항목의 판정·종류가 어휘 밖이다: ${key(entry)}`);
    if (!entry.reason?.trim()) violations.push(`${noun} 항목에 사유가 없다: ${key(entry)}`);
  }
  if (expected.length > ratchet) violations.push(`${noun} 목록 ${expected.length}건이 래칫 ${ratchet}건을 넘는다 — 판정을 모으는 방향으로만 줄인다`);
  if (expected.length < ratchet) violations.push(`${noun} 목록이 ${expected.length}건으로 줄었다 — 래칫 ${ratchet}건도 함께 내린다`);
  const expectedKeys = new Set(expected.map(key));
  const measuredKeys = new Set(measured.map(key));
  for (const row of measured) {
    if (!expectedKeys.has(key(row))) {
      violations.push(`두 판정이 다른 ${noun}: ${key(row)} — 주석·문자열 속 import 인용이나 require 를 걷거나, 정당하면 사유와 함께 목록에 적는다`);
    }
  }
  for (const entry of expected) {
    if (!measuredKeys.has(key(entry))) violations.push(`낡은 ${noun} 항목: ${key(entry)} — 목록과 래칫에서 뺀다`);
  }
  return violations;
}

const extractionKey = (row) => [row.file, row.target, row.judgment, row.kind ?? ''].join('|');
const resolutionKey = (row) => [row.target, row.kind].join('|');
const extractionViolations = (measured, expected, ratchet) => differenceViolations({
  measured, expected, ratchet, key: extractionKey, noun: '추출 차이',
  inVocabulary: (entry) => (entry.judgment === 'generator-only'
    ? entry.kind === undefined
    : entry.judgment === 'census-only' && CENSUS_MODULE_REFERENCE_KINDS.has(entry.kind)),
});
const resolutionViolations = (measured, expected, ratchet) => differenceViolations({
  measured, expected, ratchet, key: resolutionKey, noun: '해석 차이', inVocabulary: (entry) => RESOLUTION_DIFFERENCE_KINDS.has(entry.kind),
});

test('the generator cascade removes the same frontend files under the census tokenizer for every preset and single selection', () => {
  const manifest = JSON.parse(readFileSync(join(repoRoot, 'config/reusable-base-profiles.json'), 'utf8'));
  const catalog = loadProjectComposerCatalog(repoRoot);
  const inventory = repositoryFrontendInventory();
  const base = { schemaVersion: 1, project: { name: 'judgment-equivalence' }, sourceRef: 'main',
    database: { vendor: 'postgresql' }, backendLayout: 'multi-module' };
  const recipes = [
    ...catalog.presets.map((preset) => [`preset ${preset.id}`, { ...base, selection: { preset: preset.id } }]),
    ...catalog.capabilities.map((capability) => [`single ${capability.id}`, { ...base, selection: { domains: [capability.id] } }]),
  ];
  assert.ok(recipes.length >= catalog.presets.length + 19, `구성 ${recipes.length}개 — 프리셋과 단독 선택이 모두 들어야 한다`);
  // 차이가 가리키는 대상이 지워지지 않으면 그 차이는 어느 구성의 연쇄도 바꾸지 못한다(해석 차이는 아래 대조가 직접 보지 않는다).
  const differenceTargets = [...IMPORT_JUDGMENT_DIFFERENCES, ...IMPORT_RESOLUTION_DIFFERENCES].map((entry) => entry.target);
  let removing = 0;
  for (const [label, recipe] of recipes) {
    const composition = resolveProjectRecipe(recipe, catalog);
    const profile = composerProfile(manifest, composition);
    const context = { manifest, profile, inventory, projected: projectedFrontendSources(manifest, profile, composition, inventory) };
    const generator = frontendRemovalWith(frontendImportSpecifiers, context);
    const census = frontendRemovalWith(censusImportSpecifiers, context);
    assert.deepEqual(
      { generatorOnly: [...generator].filter((file) => !census.has(file)), censusOnly: [...census].filter((file) => !generator.has(file)) },
      { generatorOnly: [], censusOnly: [] },
      `${label}: 두 추출의 연쇄 제거가 다르다`,
    );
    assert.deepEqual(differenceTargets.filter((target) => generator.has(target)), [], `${label}: 판정 차이가 가리키는 대상이 지워진다`);
    if (generator.size > 0) removing += 1;
  }
  assert.ok(removing >= recipes.length - 1, `파일을 지우는 구성이 ${removing}개뿐이다 — 대조가 비어 있다`);
});

test('the census removal judgment equals the generator cascade for every real profile', () => {
  const manifest = JSON.parse(readFileSync(join(repoRoot, 'config/reusable-base-profiles.json'), 'utf8'));
  const inventory = repositoryFrontendInventory();
  const census = repositoryCensus();
  // census 는 frontend/src 의 모듈만 판정한다. 그 밖(e2e·도구 스크립트)의 생성기 제거는 census 가 말하지 않으므로 비교하지 않는다.
  const population = new Set(census.files.map((row) => row.file));
  assert.ok(population.size > 1000, `census 모집단 ${population.size} — 비교가 비어 있다`);
  for (const [name, profile] of Object.entries(manifest.profiles)) {
    const projected = projectedFrontendSources(manifest, profile, undefined, inventory);
    const generator = new Set([...frontendRemovalWith(frontendImportSpecifiers, { manifest, profile, inventory, projected })]
      .filter((file) => population.has(file)));
    const censusRemoved = new Set(census.files
      .filter((row) => row.profileRemovalConstraints.some((constraint) => constraint.profile === name))
      .map((row) => row.file));
    assert.deepEqual(
      { generatorOnly: [...generator].filter((file) => !censusRemoved.has(file)), censusOnly: [...censusRemoved].filter((file) => !generator.has(file)) },
      { generatorOnly: [], censusOnly: [] },
      `profile ${name}: census 판정과 생성기 연쇄 제거가 다르다`,
    );
  }
});

test('per-file import extraction and resolution differences match the approved lists exactly', () => {
  const inventory = repositoryFrontendInventory();
  const extraction = importJudgmentDifferences(inventory);
  assert.deepEqual(extractionViolations(extraction, IMPORT_JUDGMENT_DIFFERENCES, IMPORT_JUDGMENT_DIFFERENCE_RATCHET), []);
  assert.equal(extraction.length, IMPORT_JUDGMENT_DIFFERENCES.length);
  const resolution = importResolutionDifferences(inventory);
  assert.deepEqual(resolutionViolations(resolution, IMPORT_RESOLUTION_DIFFERENCES, IMPORT_RESOLUTION_DIFFERENCE_RATCHET), []);
  assert.equal(resolution.length, IMPORT_RESOLUTION_DIFFERENCES.length);
});

test('the judgment equivalence gate is red for a diverging cascade, a new or stale difference, a loose ratchet and a malformed entry', () => {
  // 생성기 연쇄가 넣은 판정을 실제로 쓴다 — 주석 속 import 인용은 정규식에서만 연쇄를 만든다.
  const root = createFixture({
    'frontend/src/removed/gone.ts': 'export const gone = 1;\n',
    'frontend/src/kept/quote.ts': "// usage: import { gone } from '../removed/gone';\nexport const kept = 1;\n",
  });
  const files = ['frontend/src/removed/gone.ts', 'frontend/src/kept/quote.ts'].map((file) => join(root, file));
  const sources = new Map(files.map((path) => [path, readFileSync(path, 'utf8')]));
  const plan = (importSpecifiers) => [...planFrontendRemoval({ frontendRoot: join(root, 'frontend'), files, directPaths: ['src/removed'],
    readSource: (path) => sources.get(path), importSpecifiers }).removed].map((path) => relative(root, path).split(sep).join('/')).sort();
  assert.deepEqual(plan(frontendImportSpecifiers), ['frontend/src/kept/quote.ts', 'frontend/src/removed/gone.ts']);
  assert.deepEqual(plan(censusImportSpecifiers), ['frontend/src/removed/gone.ts']);
  assert.throws(() => censusImportSpecifiers('const m = import(name);\n'), /cannot judge/u);

  const approved = [{ file: 'a.ts', target: 'b.js', judgment: 'census-only', kind: 'require', reason: 'CommonJS' }];
  const measured = [{ file: 'a.ts', target: 'b.js', judgment: 'census-only', kind: 'require' }];
  assert.deepEqual(extractionViolations(measured, approved, 1), []);
  assert.match(extractionViolations([...measured, { file: 'c.ts', target: 'c.ts', judgment: 'generator-only' }], approved, 1).join('\n'),
    /두 판정이 다른 추출 차이: c\.ts\|c\.ts\|generator-only/u);
  assert.match(extractionViolations([], approved, 1).join('\n'), /낡은 추출 차이 항목: a\.ts/u);
  assert.match(extractionViolations(measured, [{ ...approved[0], kind: 'import' }], 1).join('\n'), /어휘 밖/u);
  assert.match(extractionViolations(measured, [{ ...approved[0], reason: ' ' }], 1).join('\n'), /사유가 없다/u);
  assert.match(extractionViolations(measured, approved, 0).join('\n'), /래칫 0건을 넘는다/u);
  // 줄었는데 래칫을 그대로 두면 red 다 — 남는 여유가 새 차이를 조용히 받아들이지 않게 한다.
  assert.match(extractionViolations(measured, approved, 2).join('\n'), /줄었다 — 래칫 2건도 함께 내린다/u);
  // 같은 간선이라도 종류가 다르면 다른 차이다 — require 가 import 로 바뀐 것을 옛 항목이 가리지 않는다.
  assert.equal(extractionViolations([{ ...measured[0], kind: 'create-require' }], approved, 1).length, 2);

  // 해석 차이의 종류는 지정자와 두 해석 결과에서 기계적으로 정한다.
  assert.equal(resolutionDifferenceKind('@/types/generated-api', 'frontend/src/types/generated-api.d.ts', undefined), 'declaration-file');
  assert.equal(resolutionDifferenceKind('../../next.config.js', 'frontend/next.config.ts', undefined), 'script-extension-mapped');
  assert.equal(resolutionDifferenceKind('./x', undefined, 'frontend/src/x.ts'), 'generator-only');
  assert.equal(resolutionDifferenceKind('./x', 'frontend/src/x/index.ts', 'frontend/src/x.ts'), 'different-target');
  const resolutionApproved = [{ target: 'frontend/src/a.d.ts', kind: 'declaration-file', reason: '선언 파일' }];
  assert.deepEqual(resolutionViolations([{ target: 'frontend/src/a.d.ts', kind: 'declaration-file' }], resolutionApproved, 1), []);
  assert.match(resolutionViolations([{ target: 'frontend/src/b.d.ts', kind: 'declaration-file' }], resolutionApproved, 1).join('\n'),
    /두 판정이 다른 해석 차이: frontend\/src\/b\.d\.ts/u);
  assert.match(resolutionViolations([], resolutionApproved, 1).join('\n'), /낡은 해석 차이 항목/u);
  assert.match(resolutionViolations([], [{ ...resolutionApproved[0], kind: 'unknown' }], 1).join('\n'), /어휘 밖/u);
});
