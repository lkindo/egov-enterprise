import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire, isBuiltin } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, extname, join, posix, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildFrontendReachabilityCensus,
  CURRENT_REPOSITORY_ASSERTIONS,
  profilePopulation,
  validateReachabilityAssertions,
} from './frontend-reachability-census.mjs';
import { parseModuleReferences, tokenizeDependencies } from './frontend-module-graph.mjs';
import {
  MODULE_EXTENSIONS,
  buildCaseMap,
  candidatePaths,
  repositoryFileLookup,
  resolveModuleReference,
} from './frontend-module-resolver.mjs';
import {
  applyFrontendProjection,
  createFrontendProjector,
  isFrontendModuleFile,
  parsePackMarkerBlocks,
  planFrontendRemoval,
} from './reusable-source-frontend.mjs';
import { ROUTE_LEDGER_PATH } from './reusable-page-survival.mjs';
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

/** 프로필 제약 픽스처의 manifest: stripped 는 optional pack 을 빼고, optional pack 은 src/profile/direct.ts 를 직접 지운다. */
const OPTIONAL_PROFILE_MANIFEST = JSON.stringify({
  schemaVersion: 1,
  profiles: { stripped: { packs: ['core'] }, full: { packs: ['core', 'optional'] } },
  packs: { core: {}, optional: { frontend: { removePaths: ['src/profile/direct.ts'] } } },
});

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
  // 코드까지 고정한다 — 판정을 지우는 변이뿐 아니라 다른 코드로 바꾸는 변이도 잡는다.
  for (const [source, code] of [
    ['createRequire(__filename)(target);', 'UNPARSEABLE_CREATE_REQUIRE_CALL'],
    ["createRequire(__filename)('./target', extra);", 'UNPARSEABLE_CREATE_REQUIRE_CALL'],
    ['consume(createRequire(__filename));', 'UNSUPPORTED_CREATE_REQUIRE_ALIAS'],
  ]) {
    assert.deepEqual(parseModuleReferences(source).issues.map((issue) => issue.code), [code], source);
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
//   피커와 쪽지·메일·문자·알림 발송 화면이 import 그래프로 함께 사라지고 있었다. 피커는 이제 주소록 출처를 주입받는다.
// [2026-10-11 슬롯 단계 PR-4] 출처는 주소록 기능의 슬롯 기여가 내놓고, 메일·문자 화면은 core 도우미로 슬롯 레지스트리를 읽는다.
//   주소록이 빠진 프로필에서는 기여가 직접 지워지고 레지스트리가 빈 배열로 다시 렌더된다 — 레지스트리를 렌더하지 않으면 레지스트리
//   → 도우미 → 메일·문자 화면이 연쇄로 사라진다. 아래 단언이 슬롯 장치·도우미의 생존과 기여·어댑터의 직접 제거를 main CI 에서 지킨다.
// [2026-10-11 슬롯 단계 PR-2] 화면(page)의 생존은 project-composer-source.test.mjs 'presets and representative selections' 가 같은
//   투영·연쇄로 본다. 이 목록에는 화면이 아닌 파일만 둔다 — 그 대조의 모집단 밖이고, 실패하면 연쇄 증거 경로를 이름으로 보여 준다.
const COLLABORATION_SURVIVORS = [
  'frontend/src/app/components/ui/recipient-picker.tsx',
  'frontend/src/types/recipient-address-book.ts',
  'frontend/src/app/admin/collaboration/mail-send/MailSendHubClient.tsx',
  'frontend/src/app/admin/uss/ion/sms/SmsAdminClient.tsx',
  'frontend/src/app/admin/notifications/NotificationsClient.tsx',
  'frontend/src/app/admin/notifications/NotificationDispatchDialog.tsx',
  'frontend/src/extensions/slots.ts',
  'frontend/src/extensions/use-slot-entries.ts',
  'frontend/src/extensions/generated-recipient-picker-sources.ts',
  'frontend/src/app/components/ui/recipient-picker-sources.ts',
  // [스크랩 슬롯] 게시글 상세의 스크랩 버튼은 스크랩 기여이고, 그 기여가 부르는 쓰기는 스크랩 소유 조회 모듈이다.
  'frontend/src/extensions/scrap/post-actions.ts',
  'frontend/src/queries/scrap-post-action.ts',
  'frontend/src/app/admin/community/boards/detail/BoardDetailClient.tsx',
  // [허브 분해 H2] 지식 허브는 게시판 셸이고 커뮤니티 탭은 커뮤니티 기여다. 셸이 커뮤니티 코드를 다시 import 하면 커뮤니티가 빠진
  //   collaboration 투영에서 허브가 연쇄로 사라진다.
  'frontend/src/app/admin/help/KnowledgeHubClient.tsx',
  'frontend/src/app/admin/help/knowledge-tabs.ts',
  'frontend/src/lib/board/qna-status.ts',
  'frontend/src/extensions/generated-hub-tabs.ts',
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
  //   투영 tsc 는 CI 20분 뒤에야 잡았다 — 이 목록은 같은 회귀를 운영 계약(몇 초)에서 잡는다. page 의 생존은
  //   project-composer-source.test.mjs 'presets and representative selections' 가 같은 투영·연쇄로 보므로(PR-2) 이 목록에는
  //   화면이 아닌 파일만 둔다.
  'frontend/src/app/admin/system/monitoring/MonitoringHubClient.tsx',
  'frontend/src/app/admin/system/monitoring/components/MonitoringPanels.tsx',
  // [Phase 0c] 통계 셸과 게시판 데이터를 쓰지 않는 통계 화면은 core 다. [허브 분해 H4] 셸은 게시판·설문 탭을 stats-panels
  //   레지스트리로 받는다 — 기능 코드를 다시 import 하거나 레지스트리 렌더가 빠지면 core 투영에서 통계 화면 전체가 연쇄로 사라진다.
  'frontend/src/extensions/generated-stats-panels.ts',
  'frontend/src/app/admin/stats/AdminStatsClient.tsx',
  'frontend/src/app/admin/stats/IntelligenceHubClient.tsx',
  'frontend/src/app/admin/stats/StatsHubParts.tsx',
  'frontend/src/app/admin/stats/StatsHubFallback.tsx',
  'frontend/src/services/foundation/system/StatsAdminService.ts',
  'frontend/src/types/foundation/stats.ts',
  // [슬롯 단계 PR-6] 셸(머리글·바닥글·오류 화면)은 셸 링크·머리글 위젯 레지스트리를 읽는다. core 에서는 기여가 모두 직접 지워지고
  //   레지스트리가 빈 배열로 다시 렌더된다 — 렌더가 빠지면 레지스트리 → 셸이 연쇄로 사라진다. 오류 화면은 layout 이 import 하지 않아
  //   필수 진입점 검사가 잡지 못하므로 여기에 둔다.
  'frontend/src/app/components/layout/header.tsx',
  'frontend/src/app/components/layout/footer.tsx',
  'frontend/src/app/error.tsx',
  'frontend/src/extensions/slots.ts',
  'frontend/src/extensions/generated-shell-links.ts',
  'frontend/src/extensions/generated-header-widgets.ts',
  // [스크랩 슬롯] 게시글 상세 부가 동작 레지스트리. core 에서는 소비자(게시글 상세)가 빠져도 레지스트리는 빈 배열로 남는다.
  'frontend/src/extensions/generated-post-actions.ts',
  // [허브 분해 H1] 협업 허브는 core 셸이다 — 탭(쪽지·스크랩)은 hub-tabs 기여, 머리 링크는 shell-links 기여다. 셸이 기능 코드를 다시
  //   import 하면 core 투영에서 허브가 연쇄로 사라진다. 명령 센터도 바로가기를 shell-links 레지스트리에서 받는다.
  'frontend/src/app/admin/collaboration/CollaborationHubClient.tsx',
  'frontend/src/app/admin/collaboration/collaboration-hub-frame.tsx',
  'frontend/src/app/admin/collaboration/collaboration-tabs.ts',
  'frontend/src/extensions/generated-hub-tabs.ts',
  'frontend/src/app/components/ui/global-command-center.tsx',
];

/*
  [2026-10-11 슬롯 단계 PR-2] census 의 프로필 제약은 생성기와 같은 투영·연쇄 계획으로 계산한다. 그래서 아래 생존 단언 하나가
  타입 전용 참조까지 포함한 연쇄 소실을 본다. 주석·문자열 속 import 인용은 더 이상 간선이 아니므로(같은 판정), 원문 정규식으로
  인용을 따로 찾던 가드(excludedOwnedImports)는 걷었다 — 아래 '간선 규칙' 시험이 그 규칙을 양방향으로 고정한다.
*/
test('core 프로필에서 살아남아야 하는 파일은 core 투영의 연쇄로 지워지지 않는다(타입 전용 참조 포함)', () => {
  const census = repositoryCensus();
  for (const survivor of CORE_SURVIVORS) {
    const coreRemoval = byFile(census, survivor).profileRemovalConstraints
      .find((constraint) => constraint.profile === 'core');
    assert.equal(
      coreRemoval,
      undefined,
      `${survivor} is removed from the core profile via ${JSON.stringify(coreRemoval?.evidencePath)}`,
    );
  }
  // [2026-09-27 DIP B5 F11] 하네스 아틀라스(정적 스킬 카탈로그·예시 계측 로그)는 demo pack 소유 샘플이다. 허브에는 시연 기능의
  //   hub-tabs 기여로만 붙으므로(허브 분해 H3), removePaths 에서 빠지면 탭은 사라지고 파일만 core 에 고아로 남는다.
  const harnessAtlas = byFile(census, 'frontend/src/app/admin/system/monitoring/components/HarnessAtlasPanels.tsx');
  assert.equal(
    harnessAtlas.profileRemovalConstraints.find((constraint) => constraint.profile === 'core')?.removal,
    'direct',
    'the harness atlas sample tab must be a demo removePath',
  );
  // [슬롯 단계 PR-6] 셸 링크·머리글 위젯 기여는 기능과 함께 직접 지워진다(연쇄가 아니다). 알림 벨은 collaboration 에 남는다.
  for (const [file, profiles] of [
    ['frontend/src/extensions/help/shell-links.ts', ['core', 'collaboration']],
    ['frontend/src/extensions/notification/header-widgets.ts', ['core']],
    // [스크랩 슬롯] 스크랩 기여도 스크랩과 함께 직접 지워진다(collaboration pack removePaths).
    ['frontend/src/extensions/scrap/post-actions.ts', ['core']],
    // [허브 분해 H1] 협업 허브 탭·머리 링크·명령 센터 바로가기 기여도 기능과 함께 직접 지워진다. 스크랩 화면 디렉터리도 직접 지운다 —
    //   그 page 는 core 셸만 import 해 연쇄로는 남는다(그러면 core 에 스크랩 화면이 남는다).
    ['frontend/src/extensions/note/hub-tabs.ts', ['core']],
    ['frontend/src/extensions/scrap/hub-tabs.ts', ['core']],
    ['frontend/src/extensions/note/shell-links.ts', ['core']],
    ['frontend/src/extensions/mail/shell-links.ts', ['core']],
    ['frontend/src/extensions/addressbook/shell-links.ts', ['core', 'collaboration']],
    ['frontend/src/app/admin/collaboration/scraps/page.tsx', ['core']],
    // [허브 분해 H2] 지식 허브 커뮤니티 탭 기여와 그 머리 동작은 커뮤니티와 함께, 지식 허브 셸은 게시판과 함께 직접 지워진다.
    ['frontend/src/extensions/community/hub-tabs.ts', ['core', 'collaboration']],
    ['frontend/src/components/business/community/knowledge-community-tab.tsx', ['core', 'collaboration']],
    ['frontend/src/app/admin/help/KnowledgeHubClient.tsx', ['core']],
    ['frontend/src/lib/board/qna-status.ts', ['core']],
    // [허브 분해 H3] 감시 허브의 하네스 아틀라스 탭 기여도 시연 기능과 함께 직접 지워진다(허브는 core 셸이라 남는다).
    ['frontend/src/extensions/showcase/hub-tabs.ts', ['core', 'collaboration']],
    // [허브 분해 H6] 댓글 및 평가 관리는 댓글 기능의 독립 화면이다 — 감시 허브(core)는 남고 이 화면은 댓글과 함께 직접 지워진다.
    ['frontend/src/app/admin/system/comments/CommentModerationClient.tsx', ['core']],
    // [허브 분해 H4] 통계 셸의 게시판·설문 기여도 기능과 함께 직접 지워진다(셸·요약은 core 라 남는다).
    ['frontend/src/extensions/board/stats-panels.ts', ['core']],
    ['frontend/src/extensions/survey/stats-panels.ts', ['core', 'collaboration']],
  ]) {
    for (const profile of profiles) {
      assert.equal(byFile(census, file).profileRemovalConstraints.find((constraint) => constraint.profile === profile)?.removal, 'direct',
        `${file} in ${profile}`);
    }
  }
  assert.equal(byFile(census, 'frontend/src/extensions/notification/header-widgets.ts').profileRemovalConstraints
    .find((constraint) => constraint.profile === 'collaboration'), undefined, 'the bell survives in collaboration');
});

/*
  [2026-10-11 슬롯 단계 PR-1] 종전에는 '선언상 생존인데 cascade 로 사라지는 라우트' 14건을 손으로 적은 exact 승인 집합으로
  동결했다(GAP-PACK-001 · #707). 이제 프리셋이 남겨야 할 화면은 기능 소유로 계산하고(reusable-page-survival.mjs), 생성기 연쇄가
  그 화면을 정확히 남기는지는 project-composer-source.test.mjs 가 본다.
  [PR-2] census 프로필 제약은 생성기와 같은 투영(createFrontendProjector)과 연쇄 계획(planFrontendRemoval)으로 계산하고, Git
  저장소에서는 입력도 생성기와 같은 복사 목록이다(frontend-reachability-census.mjs computeProfileConstraints·copiedFrontendFiles).
  그래서 생성기 쪽 화면 대조가 census 의 화면 생존도 본다 — 두 판정을 다시 대조하지 않는다. 같은 모집단이라는 전제는 아래 Git
  픽스처 시험('in a Git checkout the census plans…')이 고정한다. 여기서는 census 만 볼 수 있는 것을 본다:
  - 원장의 모든 화면 소스에 census 행이 있다.
  - 원장이 그 프로필에 남는다고 한 화면(directProjectionProfiles, 선언 removePaths 관찰)을 census 가 선언으로(direct) 지우지 않는다.
    두 경로 매칭 구현이 어긋나면 이것만 잡는다(화면 대조는 기대 밖 화면의 소실을 받아들인다).
*/
function ledgerCensusContradictions(ledgerRoutes, censusRows, profiles) {
  const violations = [];
  for (const route of ledgerRoutes) {
    const row = censusRows.get(route.source);
    if (!row) {
      violations.push(`${route.source} has no reachability census row`);
      continue;
    }
    for (const profile of profiles) {
      if (!route.directProjectionProfiles.includes(profile)) continue;
      if (row.profileRemovalConstraints.find((constraint) => constraint.profile === profile)?.removal === 'direct') {
        violations.push(`${route.route}@${profile}: direct removal contradicts directProjectionProfiles`);
      }
    }
  }
  return violations;
}

test('every ledger screen has a census row and no profile removes directly a screen the ledger keeps', () => {
  const ledger = JSON.parse(readFileSync(join(repoRoot, ROUTE_LEDGER_PATH), 'utf8'));
  const manifest = JSON.parse(readFileSync(join(repoRoot, 'config/reusable-base-profiles.json'), 'utf8'));
  const censusRows = new Map(repositoryCensus().files.map((row) => [row.file, row]));
  assert.ok(ledger.routes.length > 100);
  assert.deepEqual(ledgerCensusContradictions(ledger.routes, censusRows, Object.keys(manifest.profiles)), []);
});

test('the ledger/census cross-check is red for a direct removal of a ledger-surviving screen and for a missing census row', () => {
  const route = { route: '/x', source: 'frontend/src/app/x/page.tsx', directProjectionProfiles: ['core'] };
  const rows = (removal) => new Map([[route.source, { file: route.source, profileRemovalConstraints: removal ? [{ profile: 'core', removal }] : [] }]]);
  assert.deepEqual(ledgerCensusContradictions([route], rows(), ['core']), []);
  // 대조군: 연쇄 소실은 화면 대조가 판정하고, 원장도 그 프로필에서 지운다고 하면 모순이 아니다.
  assert.deepEqual(ledgerCensusContradictions([route], rows('transitive'), ['core']), []);
  assert.deepEqual(ledgerCensusContradictions([{ ...route, directProjectionProfiles: ['demo'] }], rows('direct'), ['core']), []);
  assert.deepEqual(ledgerCensusContradictions([route], rows('direct'), ['core']), ['/x@core: direct removal contradicts directProjectionProfiles']);
  assert.deepEqual(ledgerCensusContradictions([route], new Map(), ['core']), ['frontend/src/app/x/page.tsx has no reachability census row']);
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
  for (const file of [
    'frontend/src/services/business/user/addressbook/recipient-address-book-source.ts',
    'frontend/src/extensions/addressbook/recipient-picker-sources.ts',
  ]) {
    assert.equal(
      byFile(census, file).profileRemovalConstraints.find((constraint) => constraint.profile === 'collaboration')?.removal,
      'direct',
      `${file} must be a direct removePath of the address book in collaboration`,
    );
  }
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

/*
  프로필 투영이 실패하면(마커 오류) 생성기는 그 자리에서 실패한다. census 는 gate 모드에서 같은 자리를 짚어 실패하고, 검사 모드에서는
  실패한 프로필의 판정을 '모름'(unknown)으로 남긴다 — 위 계산된 동적 import 와 같은 규칙으로, 판정할 수 없는 것을 삭제 후보로 두지 않는다.
*/
test('a pack marker error is red in gate mode and drops no profile evidence in inspection mode', () => {
  const root = createFixture({
    'frontend/src/app/page.tsx': 'export default function Page() { return null; }\n',
    'frontend/src/profile/direct.ts': 'export const direct = true;\n',
    'frontend/src/profile/importer.ts': "import './direct';\nexport const importer = true;\n",
    'frontend/src/lib/broken.ts': '// reusable-base:optional:start\nexport const broken = true;\n',
    'config/reusable-base-profiles.json': OPTIONAL_PROFILE_MANIFEST,
  });
  const options = { profileManifestPath: join(root, 'config', 'reusable-base-profiles.json') };
  assert.throws(
    () => censusFixture(root, options),
    /\[PROFILE_PROJECTION_FAILED\] frontend\/src\/lib\/broken\.ts — stripped: 닫히지 않은 frontend pack marker: optional \(src\/lib\/broken\.ts:1\)/,
    'gate mode names the file whose marker failed the profile projection',
  );
  const inspection = censusFixture(root, { ...options, failOnErrors: false });
  assert.deepEqual(
    inspection.issues.filter(({ code }) => code === 'PROFILE_PROJECTION_FAILED').map(({ file, detail }) => [file, detail.split(':')[0]]).sort(),
    [['frontend/src/lib/broken.ts', 'full'], ['frontend/src/lib/broken.ts', 'stripped']],
  );
  const importer = byFile(inspection, 'frontend/src/profile/importer.ts');
  assert.deepEqual(
    importer.profileRemovalConstraints.map(({ profile, removal }) => [profile, removal]),
    [['full', 'unknown'], ['stripped', 'unknown']],
    'a failed profile leaves an unknown constraint on every file',
  );
  for (const file of ['frontend/src/profile/importer.ts', 'frontend/src/lib/broken.ts']) {
    assert.notEqual(byFile(inspection, file).deletionClass, 'safe-candidate', file);
  }
  assert.equal(byFile(inspection, 'frontend/src/lib/broken.ts').deletionDecision, 'blocked', 'the marker issue blocks its own file');
  // public/ 모듈 파일은 간선을 읽지 않지만 투영은 한다 — 생성기(applyFrontendProjection)와 정밀 점검이 그 마커 오류에서 실패하므로
  // census 도 같은 파일을 짚어 붉다.
  const publicRoot = createFixture({
    'frontend/src/app/page.tsx': 'export default function Page() { return null; }\n',
    'frontend/public/vendor/lib.js': '// reusable-base:optional:start\nwindow.vendor = true;\n',
    'config/reusable-base-profiles.json': OPTIONAL_PROFILE_MANIFEST,
  });
  assert.throws(
    () => censusFixture(publicRoot, { profileManifestPath: join(publicRoot, 'config', 'reusable-base-profiles.json') }),
    /\[PROFILE_PROJECTION_FAILED\] frontend\/public\/vendor\/lib\.js — stripped: 닫히지 않은 frontend pack marker: optional \(public\/vendor\/lib\.js:1\)/,
    'a marker error in a public/ module file fails the census like the generator',
  );
  const manifest = JSON.parse(OPTIONAL_PROFILE_MANIFEST);
  assert.throws(() => applyFrontendProjection(publicRoot, createFrontendProjector({ manifest, profile: manifest.profiles.stripped })),
    /닫히지 않은 frontend pack marker: optional \(public\/vendor\/lib\.js:1\)/, 'the generator projection fails at the same public/ file');
});

// 판정은 해석기의 모듈 확장자 전부(isFrontendModuleFile)를 읽는다 — .mts·.mjs 모듈의 간선도 연쇄하고, 그 마커도 판정한다.
test('census profile constraints read .mts and .mjs modules: their edges cascade and their markers are judged', () => {
  const files = {
    'frontend/src/app/page.tsx': "import { b } from '../lib/b.mjs';\nexport default function Page() { return b; }\n",
    'frontend/src/lib/b.mts': "import { direct } from '../profile/direct';\nexport const b = direct;\n",
    'frontend/src/profile/direct.ts': 'export const direct = true;\n',
    'config/reusable-base-profiles.json': OPTIONAL_PROFILE_MANIFEST,
  };
  const options = (root) => ({ profileManifestPath: join(root, 'config', 'reusable-base-profiles.json') });
  const root = createFixture(files);
  const census = censusFixture(root, options(root));
  for (const file of ['frontend/src/lib/b.mts', 'frontend/src/app/page.tsx']) {
    assert.deepEqual(
      byFile(census, file).profileRemovalConstraints.map(({ profile, removal }) => [profile, removal]),
      [['stripped', 'transitive']],
      `${file} cascades through the .mts module`,
    );
  }
  const marked = createFixture({ ...files, 'frontend/src/lib/b.mts': `// reusable-base:optional:start\n${files['frontend/src/lib/b.mts']}` });
  assert.throws(
    () => censusFixture(marked, options(marked)),
    /\[PROFILE_PROJECTION_FAILED\] frontend\/src\/lib\/b\.mts — stripped: 닫히지 않은 frontend pack marker: optional \(src\/lib\/b\.mts:1\)/,
    'an unclosed marker in a .mts module fails the profile projection',
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

// census 인접 그래프 경로(parseFile)의 decoy 가드다. 연쇄 계획 경로는 아래 '간선 규칙' 시험의 quote.ts 가 따로 본다.
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
  [2026-10-11 슬롯 단계 PR-2 판정 통일]
  census·생성기·정밀 점검이 같은 투영(createFrontendProjector)과 같은 연쇄 계획(planFrontendRemoval)을 같은 모집단(Git 복사 목록)에
  쓴다. 간선은 주석·문자열을 건너뛰는 토크나이저(frontend-module-graph.mjs)로 읽고, 넘겨받은 파일 목록 안에서만 정확한 표기로
  잇는다(frontend-module-resolver.mjs). 그래서 종전 C5 측정(DEC-OPS-264 ②)의 차이 목록·래칫과 두 판정 대조 시험은 동어반복이 되어
  걷었다. 대신 하나가 된 판정의 규칙을 아래 시험이 양방향으로 고정하고, 토크나이저가 읽는 지정자는 TypeScript AST 와 파일마다
  대조한다(아래 'AST 오라클' 시험 — 걷은 원문 정규식 대조가 잡던 오판을 독립 파서로 잡는다).
*/

/** 디스크에 없는 가상 frontend 의 연쇄 계획. 해석기가 디스크를 묻지 않는다는 것을 함께 보인다. */
function virtualPlan(sources, { directPaths = ['src/removed'], assets = [] } = {}) {
  const frontendRoot = join(tmpdir(), 'egov-virtual-frontend-not-on-disk', 'frontend');
  const files = [...Object.keys(sources), ...assets].map((file) => join(frontendRoot, file));
  const byPath = new Map(Object.entries(sources).map(([file, source]) => [join(frontendRoot, file), source]));
  const plan = planFrontendRemoval({ frontendRoot, files, directPaths, readSource: (path) => byPath.get(path) });
  const rel = (path) => relative(frontendRoot, path).split(sep).join('/');
  return { removed: [...plan.removed].map(rel).sort(), plan, rel };
}

test('import edges follow code, not comments or strings: type imports, require, createRequire, declarations, mapped scripts and assets cascade', () => {
  const { removed, plan, rel } = virtualPlan({
    'src/removed/gone.ts': 'export const gone = 1;\n',
    'src/removed/decl.d.ts': 'export interface Decl { x: number }\n',
    'src/removed/mapped.ts': 'export const mapped = 1;\n',
    'src/kept/quote.ts': "// usage: import { gone } from '../removed/gone';\nexport const text = \"import('../removed/gone')\";\nexport const pattern = /import\\('\\.\\.\\/removed\\/gone'\\)/;\n",
    'src/kept/type.ts': "import type { gone } from '../removed/gone';\nexport type Gone = typeof gone;\n",
    'src/kept/require.js': "const { gone } = require('../removed/gone');\nmodule.exports = gone;\n",
    'src/kept/resolve.js': "export const p = require.resolve('../removed/gone');\n",
    'src/kept/typeof-import.ts': "export type G = typeof import('../removed/gone');\n",
    'src/kept/create-require.ts': "import { createRequire } from 'node:module';\nconst load = createRequire(import.meta.url);\nexport const gone = load('../removed/gone');\n",
    'src/kept/declaration.ts': "import type { Decl } from '../removed/decl';\nexport type D = Decl;\n",
    'src/kept/mapped.ts': "export { mapped } from '../removed/mapped.js';\n",
    'src/kept/style.tsx': "import styles from '../removed/style.css';\nexport const s = styles;\n",
    'src/kept/dynamic.ts': "export const load = () => import('../removed/gone');\n",
    'src/kept/second.ts': "import { load } from './dynamic';\nexport const again = load;\n",
    'src/kept/both.ts': "import { mapped } from '../removed/mapped.js';\nimport { gone } from '../removed/gone';\nexport const both = [mapped, gone];\n",
    // dynamic.ts 뒤에 돈다. 같은 단계 안에서 찾은 파일을 바로 더하면 원인이 dynamic.ts 로 바뀐다(파일을 도는 순서에 매인다).
    'src/kept/order.ts': "import { load } from './dynamic';\nimport { gone } from '../removed/gone';\nexport const order = [load, gone];\n",
    // 해석기의 모듈 확장자(.mjs·.mts·.cjs·.cts)는 대상으로만이 아니라 importer 로도 읽는다(isFrontendModuleFile 하나로 판정한다).
    'src/kept/x.mjs': "import '../removed/gone';\n",
    'src/kept/y.mts': "import { gone } from '../removed/gone';\nexport const y = gone;\n",
    'src/kept/z.cjs': "const { gone } = require('../removed/gone');\nmodule.exports = gone;\n",
    'src/kept/w.cts': "import gone = require('../removed/gone');\nexport = gone;\n",
    'src/kept/bridge.mts': "import { gone } from '../removed/gone';\nexport const bridge = gone;\n",
    'src/kept/via-mjs.ts': "import './bridge.mjs';\n",
  }, { assets: ['src/removed/style.css'] });
  assert.deepEqual(removed, [
    'src/kept/both.ts', 'src/kept/bridge.mts', 'src/kept/create-require.ts', 'src/kept/declaration.ts', 'src/kept/dynamic.ts', 'src/kept/mapped.ts',
    'src/kept/order.ts', 'src/kept/require.js', 'src/kept/resolve.js', 'src/kept/second.ts', 'src/kept/style.tsx', 'src/kept/type.ts',
    'src/kept/typeof-import.ts', 'src/kept/via-mjs.ts', 'src/kept/w.cts', 'src/kept/x.mjs', 'src/kept/y.mts', 'src/kept/z.cjs',
    'src/removed/decl.d.ts', 'src/removed/gone.ts', 'src/removed/mapped.ts', 'src/removed/style.css',
  ], '주석·문자열·정규식 속 인용만 있는 파일은 남고, 코드 간선은 연쇄한다');
  // 연쇄 원인은 BFS 단계가 가장 낮은 제거 의존이고, 같은 단계면 참조 목록(parseModuleReferences) 순서상 첫 번째다 —
  // 즉시 호출 createRequire 참조가 앞이고 나머지는 소스 순서다.
  const causeOf = (file) => rel(plan.parent.get([...plan.removed].find((path) => rel(path) === file)).to);
  assert.equal(causeOf('src/kept/second.ts'), 'src/kept/dynamic.ts');
  assert.equal(causeOf('src/kept/both.ts'), 'src/removed/mapped.ts');
  assert.equal(causeOf('src/kept/order.ts'), 'src/removed/gone.ts');
  assert.equal(plan.edges.get([...plan.edges.keys()].find((path) => rel(path) === 'src/kept/quote.ts')).length, 0);
});

test('the shared plan fails on an unjudgeable import, a case-only target and an ambiguous target, and ignores targets outside the frontend', () => {
  assert.throws(() => virtualPlan({ 'src/a.ts': "const name = './b';\nexport const load = () => import(name);\n", 'src/b.ts': '' }),
    /프런트 import 를 판정할 수 없다: UNPARSEABLE_DYNAMIC_IMPORT frontend\/src\/a\.ts:2/, 'an unjudgeable dynamic import fails the plan');
  assert.throws(() => virtualPlan({ 'src/layout/footer.tsx': 'export default 1;\n', 'src/app.tsx': "import Footer from './layout/Footer';\n" }),
    /IMPORT_TARGET_CASE_MISMATCH frontend\/src\/app\.tsx:1 — \.\/layout\/Footer -> frontend\/src\/layout\/footer\.tsx/,
    'a case-only target fails the plan');
  assert.throws(() => virtualPlan({ 'src/x.ts': '', 'src/x/index.ts': '', 'src/app.tsx': "import './x';\n" }), /AMBIGUOUS_IMPORT_TARGET/,
    'an ambiguous target fails the plan');
  // 대조군: 정확한 일치는 대소문자만 다른 형제보다 앞선다(해석기가 대소문자 맵을 정확한 일치가 없을 때만 묻는 전제다).
  let exact;
  assert.doesNotThrow(() => {
    exact = virtualPlan({ 'src/layout/footer.tsx': '', 'src/layout/Footer.tsx': '', 'src/app.tsx': "import './layout/Footer';\n" });
  }, 'an exact match beats a case-only sibling');
  const appEdges = exact.plan.edges.get([...exact.plan.edges.keys()].find((path) => exact.rel(path) === 'src/app.tsx'));
  assert.deepEqual(appEdges.map(({ to }) => exact.rel(to)), ['src/layout/Footer.tsx'], 'the edge goes to the exact name');
  // 해석은 디스크를 묻지 않는다. 디스크에만 있고 목록에 없는 파일은 간선이 아니다 — 대소문자를 가리는 디스크에서도 붉으므로,
  // 디스크로 물러나는 회귀를 플랫폼과 무관하게 잡는다(아래 대소문자 단언은 가리지 않는 디스크에서만 그 회귀를 잡는다).
  const diskOnly = createFixture({
    'frontend/src/kept/a.ts': "import { b } from './b';\nexport const a = b;\n",
    'frontend/src/kept/b.ts': 'export const b = 1;\n',
  });
  const listedOnly = join(diskOnly, 'frontend/src/kept/a.ts');
  const diskPlan = planFrontendRemoval({ frontendRoot: join(diskOnly, 'frontend'), files: [listedOnly], directPaths: [],
    readSource: (path) => readFileSync(path, 'utf8') });
  assert.deepEqual(diskPlan.edges.get(listedOnly), [], '디스크에만 있고 목록에 없는 파일은 간선이 아니다');
  // 대소문자를 가리지 않는 디스크에 실제 파일이 있어도 대소문자만 다른 지정자는 실패다.
  const root = createFixture({
    'frontend/src/layout/footer.tsx': 'export default 1;\n',
    'frontend/src/app.tsx': "import Footer from './layout/Footer';\n",
  });
  const files = ['frontend/src/layout/footer.tsx', 'frontend/src/app.tsx'].map((file) => join(root, file));
  assert.throws(() => planFrontendRemoval({ frontendRoot: join(root, 'frontend'), files, directPaths: [],
    readSource: (path) => readFileSync(path, 'utf8') }), /IMPORT_TARGET_CASE_MISMATCH/, 'a case-only target fails even when the disk has the file');
  // 토크나이저 issue 는 코드마다 계획을 실패시킨다(생성기·정밀 점검 실패 사유). 코드와 줄까지 고정해 판정 제거·개명·위치 어긋남을 잡는다.
  // 미종결 블록 주석·템플릿 표본은 뒤에 제거 대상 import 를 둔다 — 판정을 지우면 그 import 가 삼켜져 간선이 조용히 사라지는 경우다.
  // 미종결 문자열은 파일 끝에 둔다 — 문자열이 줄바꿈에서 끝나든 넘어가든 시작 줄이 같다(판정을 지우면 앞의 import 로 계획이 통과한다).
  // UNPARSEABLE_DYNAMIC_IMPORT 는 위 첫 단언이 이름·줄로 단언한다. 해석기 issue(지정자 접미사)도 같은 자리에서 계획을 실패시킨다.
  for (const [code, line, source] of [
    ['UNSUPPORTED_IMPORT_META_GLOB', 1, "export const p = import.meta.glob('../removed/*.ts');\n"],
    ['UNSUPPORTED_REQUIRE_CONTEXT', 1, "export const c = require.context('../removed', true);\n"],
    ['UNPARSEABLE_REQUIRE', 2, "const name = '../removed/gone';\nexport const g = require(name);\n"],
    ['UNPARSEABLE_REQUIRE_RESOLVE', 2, "const name = '../removed/gone';\nexport const r = require.resolve(name);\n"],
    ['UNTERMINATED_BLOCK_COMMENT', 1, "/* open\nimport '../removed/gone';\n"],
    ['UNTERMINATED_STRING', 2, "import '../removed/gone';\nconst s = 'open\n"],
    ['UNTERMINATED_TEMPLATE', 1, "const s = `open\nimport '../removed/gone';\n"],
    ['DEPENDENCY_EXPRESSION_IN_TEMPLATE_INTERPOLATION', 1, "export const s = `${await import('../removed/gone')}`;\n"],
    ['UNPARSEABLE_STATIC_IMPORT', 1, "import x;\nimport '../removed/gone';\n"],
    ['UNPARSEABLE_RE_EXPORT', 2, "const name = '../removed/gone';\nexport * from name;\n"],
    ['UNSUPPORTED_CREATE_REQUIRE_ALIAS', 1, 'consume(createRequire(import.meta.url));\n'],
    ['UNPARSEABLE_CREATE_REQUIRE_CALL', 3, "const r = createRequire(import.meta.url);\nconst name = '../removed/gone';\nr(name);\n"],
    ['UNSUPPORTED_DYNAMIC_IMPORT_OPTIONS', 1, "export const m = () => import('../removed/gone', { with: { type: 'json' } });\n"],
    ['UNSUPPORTED_LOCAL_IMPORT_SUFFIX', 1, "export const m = () => import('../removed/gone?raw');\n"],
  ]) {
    assert.throws(() => virtualPlan({ 'src/a.ts': source, 'src/removed/gone.ts': '' }),
      new RegExp(`프런트 import 를 판정할 수 없다: ${code} frontend/src/a\\.ts:${line}\\b`), `issue ${code} fails the plan`);
  }
  // 대조군: frontend 밖 저장소 스크립트, 빌드 폴더, 목록에 없는 대상은 간선이 아니다(지워질 파일은 frontend 안에만 있다).
  // public/ 은 Next 가 URL 로만 내주는 정적 폴더라 그 파일의 간선은 읽지 않는다 — 벤더 번들의 변수 인자 require 가 계획을 막지 않고,
  // 제거 경로를 가리키는 리터럴 require 로 public 파일이 연쇄로 지워지지도 않는다(마커 투영은 한다 — 위 'pack marker error' 시험).
  const quiet = virtualPlan({
    'src/a.ts': "import '../../scripts/atlas.mjs';\nimport '../.next/types/routes.d.ts';\nimport './nowhere';\nimport 'react';\n",
    'src/removed/x.ts': '',
    'public/vendor/lib.min.js': "function n(r){return require(r)}\nrequire('../../src/removed/x');\n",
  });
  assert.deepEqual(quiet.removed, ['src/removed/x.ts']);
});

// 후보 경로 캐시는 모든 호출자(census 포함)가 같은 배열을 받는다. 얼려 두지 않으면 한 소비자가 배열을 고치는 순간 다음 해석이 조용히 바뀐다.
test('the resolver candidate cache is frozen, so a consumer cannot change the next resolution', () => {
  const frontendRoot = join(tmpdir(), 'egov-virtual-frontend-not-on-disk', 'frontend');
  const importer = join(frontendRoot, 'src', 'app.tsx');
  const target = resolve(frontendRoot, 'src', 'lib', 'x.ts');
  const decoy = resolve(frontendRoot, 'src', 'lib', 'x.decoy');
  const knownFiles = new Set([target, decoy]);
  const resolveX = () => resolveModuleReference({ importer, specifier: './lib/x', frontendRoot, knownFiles, caseMap: buildCaseMap([...knownFiles]), line: 1 });
  const before = resolveX();
  assert.deepEqual(before, { target });
  const first = candidatePaths(resolve(dirname(importer), './lib/x'));
  assert.ok(Object.isFrozen(first), 'candidatePaths returns a frozen array');
  assert.equal(candidatePaths(resolve(dirname(importer), './lib/x')), first, 'every caller receives the same cached array');
  assert.throws(() => first.push(decoy), TypeError, 'a consumer cannot add a candidate');
  assert.deepEqual(resolveX(), before, 'the same specifier resolves the same afterwards');
});

test('the census resolves repository scripts outside the frontend exactly, skips build output, and keeps missing frontend targets red', () => {
  const files = {
    'scripts/atlas.mjs': 'export const atlas = 1;\n',
    'frontend/src/app/page.tsx': 'export default function Page() { return null; }\n',
    'frontend/src/__tests__/atlas.test.ts': [
      "import { createRequire } from 'node:module';",
      'const atlasRequire = createRequire(import.meta.url);',
      "export const atlas = atlasRequire('../../../scripts/atlas.mjs');",
      "import '../../.next/types/routes.d.ts';",
    ].join('\n'),
  };
  assert.doesNotThrow(() => censusFixture(createFixture(files)));
  // 저장소 밖 대상이 실제로 풀려야 green 이다 — 없으면 red 다.
  const { 'scripts/atlas.mjs': ignored, ...withoutScript } = files;
  assert.throws(() => censusFixture(createFixture(withoutScript)), /\[MISSING_IMPORT_TARGET\].*atlas\.test\.ts:3/,
    'a missing repository script is red');
  // 대소문자만 다른 저장소 파일은 디스크와 무관하게 red 다(가리지 않는 디스크는 대소문자 불일치, 가리는 디스크는 없음).
  assert.throws(() => censusFixture(createFixture({ ...withoutScript, 'scripts/Atlas.mjs': 'export const atlas = 1;\n' })),
    /\[(?:IMPORT_TARGET_CASE_MISMATCH|MISSING_IMPORT_TARGET)\].*atlas\.test\.ts:3/, 'a case-only repository script is red');
  // e2e 처럼 src 밖 frontend 파일의 frontend 안 대상도 없으면 red 다.
  assert.throws(() => censusFixture(createFixture({ ...files, 'frontend/e2e/flow.spec.ts': "import './fixtures/missing';\n" })),
    /\[MISSING_IMPORT_TARGET\].*frontend\/e2e\/flow\.spec\.ts:1/);
});

// 위 시험의 대소문자 단언은 디스크에 따라 다른 코드로 붉다('case' 분기는 대소문자를 가리지 않는 디스크에서만 닿는다). 판정 자체는
// 디스크 질의를 가짜 디스크(대소문자를 가리지 않는다)로 바꿔 플랫폼과 무관하게 고정한다 — 정확한 이름, 대소문자만 다른 이름, 없는 파일,
// 저장소 밖 파일.
test('the repository file lookup tells exact, case-only, missing and outside files apart on any disk', () => {
  const fakeRoot = join(tmpdir(), 'egov-virtual-repo-not-on-disk');
  const outsideScript = join(tmpdir(), 'egov-virtual-outside-not-on-disk', 'tool.mjs');
  const onFakeDisk = [join(fakeRoot, 'scripts', 'atlas.mjs'), outsideScript];
  const found = (path) => onFakeDisk.some((file) => file.toLowerCase() === path.toLowerCase());
  const directories = new Map([[fakeRoot, ['scripts']], [join(fakeRoot, 'scripts'), ['atlas.mjs']]]);
  const lookup = repositoryFileLookup(fakeRoot, { exists: found, isFile: found, list: (directory) => directories.get(directory) ?? [] });
  assert.equal(lookup(join(fakeRoot, 'scripts', 'atlas.mjs')), 'exact', 'the exact name on the fake disk');
  assert.equal(lookup(join(fakeRoot, 'scripts', 'Atlas.mjs')), 'case', 'a case-only name on a case-insensitive disk');
  assert.equal(lookup(join(fakeRoot, 'scripts', 'missing.mjs')), undefined, 'a missing file');
  assert.equal(lookup(outsideScript), 'exact', 'a file outside the repository is not name-checked');
});

/*
  census 프로필 제약은 생성기와 같은 projector·planner 를 쓰므로, 입력 모집단까지 같아야 생성기 연쇄와 같다. Git 저장소에서는 생성기의
  복사 목록(git ls-files --cached --others --exclude-standard)을 쓴다. 무시된 로컬 파일 둘로 그 전제를 고정한다 — 디스크 걷기로 되돌리면
  무시된 임시 스크립트의 계산된 동적 import 가 프로필을 붉게 하고(PROFILE_PROJECTION_FAILED), 무시된 생성 모듈이 추적 화면을 연쇄로 지운다.
  census 자신의 도달성 그래프는 디스크 기준 그대로다(아래 화면이 그 모듈을 import 해도 MISSING_IMPORT_TARGET 이 아니다).
*/
test('in a Git checkout the census plans profile removal over the generator copy list, so ignored local files neither fail nor change it', () => {
  const root = createFixture({
    '.gitignore': 'frontend/local/\nfrontend/src/gen/\n',
    'frontend/src/app/page.tsx': "import { out } from '../gen/out';\nexport default function Page() { return out; }\n",
    'frontend/src/gen/out.ts': "import { direct } from '../profile/direct';\nexport const out = direct;\n",
    'frontend/src/profile/direct.ts': 'export const direct = true;\n',
    'frontend/local/scratch.ts': "const name = './x';\nexport const load = () => import(name);\n",
    'config/reusable-base-profiles.json': OPTIONAL_PROFILE_MANIFEST,
  });
  const init = spawnSync('git', ['init', '--quiet'], { cwd: root, encoding: 'utf8' });
  assert.equal(init.status, 0, init.stderr);
  const census = censusFixture(root, { profileManifestPath: join(root, 'config', 'reusable-base-profiles.json') });

  const manifest = JSON.parse(OPTIONAL_PROFILE_MANIFEST);
  const frontendRoot = join(root, 'frontend');
  const toRepo = (path) => relative(root, path).split(sep).join('/');
  const copied = trackedAndUntrackedFiles(root).filter((file) => file.startsWith('frontend/')).map((file) => join(root, file));
  assert.deepEqual(copied.map(toRepo).sort(), ['frontend/src/app/page.tsx', 'frontend/src/profile/direct.ts'], 'the fixture ignores both local files');
  const population = new Set(census.files.map((row) => row.file));
  const expected = new Map();
  for (const [profileName, profile] of Object.entries(manifest.profiles)) {
    const projector = createFrontendProjector({ manifest, profile });
    const plan = planFrontendRemoval({ frontendRoot, files: copied, directPaths: projector.directPaths,
      readSource: (path) => projector.project(relative(frontendRoot, path), readFileSync(path, 'utf8')).source });
    for (const path of plan.removed) {
      if (!population.has(toRepo(path))) continue;
      expected.set(toRepo(path), [...(expected.get(toRepo(path)) ?? []), [profileName, plan.direct.has(path) ? 'direct' : 'transitive']]);
    }
  }
  const actual = new Map(census.files.filter((row) => row.profileRemovalConstraints.length > 0)
    .map((row) => [row.file, row.profileRemovalConstraints.map(({ profile, removal }) => [profile, removal])]));
  assert.deepEqual(actual, expected, 'census profile constraints equal the generator plan over the Git copy list');
  assert.deepEqual([...actual.keys()], ['frontend/src/profile/direct.ts']);
  assert.ok(byFile(census, 'frontend/src/gen/out.ts').dependencies.length > 0, 'the census graph still reads the ignored module on disk');
});

/*
  복사 목록과 디스크 걷기 목록이 어긋나면 census 행(디스크 표기)이 계획 결과(복사 목록 표기)와 이어지지 않아 제약이 조용히 사라진다.
  대소문자만 다른 어긋남은 대소문자를 가리지 않는 디스크에서만 생기므로 두 목록을 넘겨 플랫폼과 무관하게 고정하고, 빈 복사 목록은
  중첩 저장소 픽스처로 끝까지 확인한다. 무시된 로컬 파일처럼 디스크에만 있는 파일은 정당한 차이다.
*/
test('the census profile population is red when the copy list differs from the disk only by case or holds no frontend file', () => {
  const repo = join(tmpdir(), 'egov-virtual-repo-not-on-disk');
  const at = (file) => join(repo, ...file.split('/'));
  const page = at('frontend/src/app/page.tsx');
  const population = (copied, diskFiles) => {
    const issues = [];
    const files = profilePopulation({ copied, repoRoot: repo, frontendRoot: at('frontend'), diskFiles,
      sourceFiles: new Set(diskFiles.filter((file) => file.startsWith(at('frontend/src')))), issues });
    return { files, issues: issues.map(({ code, file, detail }) => [code, file, detail]) };
  };
  // 색인은 Footer.ts, 디스크는 footer.ts(대소문자를 가리지 않는 디스크에서 이름만 바꿨다 — git status 는 깨끗하다).
  assert.deepEqual(population([page, at('frontend/src/lib/Footer.ts')], [page, at('frontend/src/lib/footer.ts')]).issues,
    [['PROFILE_POPULATION_CASE_MISMATCH', 'frontend/src/lib/footer.ts', 'Git copy list: frontend/src/lib/Footer.ts']], 'a case-only difference is red');
  assert.deepEqual(population([page], [page, at('frontend/local/scratch.ts')]), { files: [page], issues: [] }, 'an ignored local file is not a mismatch');
  assert.deepEqual(population(undefined, [page]), { files: [page], issues: [] }, 'outside a Git checkout the disk walk is the population');
  assert.deepEqual(population([], [page]), {
    files: [page],
    issues: [['EMPTY_PROFILE_POPULATION', 'frontend', 'the Git copy list has no frontend file (nested repository or submodule)']],
  }, 'an empty copy list is red and falls back to the disk walk');

  // frontend 가 중첩 저장소면 복사 목록에는 디렉터리 항목 하나만 남는다 — gate 는 붉고, 검사 모드는 디스크 걷기 목록으로 제약을 남긴다.
  const root = createFixture({
    'frontend/src/app/page.tsx': 'export default function Page() { return null; }\n',
    'frontend/src/profile/direct.ts': 'export const direct = true;\n',
    'frontend/src/profile/importer.ts': "import './direct';\nexport const importer = true;\n",
    'config/reusable-base-profiles.json': OPTIONAL_PROFILE_MANIFEST,
  });
  for (const cwd of [root, join(root, 'frontend')]) {
    const init = spawnSync('git', ['init', '--quiet'], { cwd, encoding: 'utf8' });
    assert.equal(init.status, 0, init.stderr);
  }
  const options = { profileManifestPath: join(root, 'config', 'reusable-base-profiles.json') };
  assert.throws(() => censusFixture(root, options), /\[EMPTY_PROFILE_POPULATION\] frontend — the Git copy list has no frontend file/,
    'a nested frontend repository is red in gate mode');
  const inspection = censusFixture(root, { ...options, failOnErrors: false });
  assert.deepEqual(
    byFile(inspection, 'frontend/src/profile/importer.ts').profileRemovalConstraints.map(({ profile, removal }) => [profile, removal]),
    [['stripped', 'transitive']],
    'inspection mode keeps the constraints of the disk walk',
  );
});

/*
  단일 모듈 계약: pack 마커를 읽는 파서는 reusable-source-frontend.mjs 하나다. 코드 토큰(문자열은 해석한 값, 템플릿·정규식은 원문,
  주석 제외) 안에서 마커 접두 뒤나 접두+`<pack>:` 뒤에 `(`·`[`·`$`·`.`·끝이 오거나, `\r`·`\n` 이 아닌 역슬래시 이스케이프(`\w`·`\S` 등)가
  오면 파서의 지문으로 센다. 마커를 글자 그대로 담은 정규식·문자열(시험 픽스처의 `<pack>:start` 등)과 ci.yml 의 잡 이름 정규식(`\r?\n`)은
  지문이 아니다. 이 시험 자신이 지문이 되지 않도록 접두를 조각으로 조립한다.
  예외는 없다(슬롯 단계 PR-6 에서 셸 접근성 계약의 pack 판정을 슬롯 데이터 검사로 바꿨다).
*/
const MARKER_WORD = ['reusable', 'base:'].join('-');
const MARKER_PARSER_FINGERPRINT = new RegExp(`${MARKER_WORD}(?:[a-z0-9_-]+:)?(?:[(\\[$.]|$|\\\\+(?![\\\\rn]))`);
const MARKER_PARSER_OWNER = 'scripts/reusable-source-frontend.mjs';

function markerParserFingerprints(entries) {
  const found = new Set();
  for (const { file, source } of entries) {
    if (!source.includes(MARKER_WORD)) continue;
    for (const token of tokenizeDependencies(source, file).tokens) {
      let text;
      if (token.type === 'string') text = token.value;
      else if (token.type === 'template') text = source.slice(token.start + 1, token.end - 1);
      else if (token.type === 'regex') text = source.slice(token.start + 1, source.lastIndexOf('/', token.end - 1));
      if (text !== undefined && MARKER_PARSER_FINGERPRINT.test(text)) found.add(file);
    }
  }
  return [...found].sort();
}

test('only the frontend projector parses pack markers (single module contract)', () => {
  const roots = ['scripts/', 'frontend/src/', 'frontend/scripts/', 'frontend/e2e/'];
  const entries = trackedAndUntrackedFiles()
    .map((file) => file.split(sep).join('/'))
    .filter((file) => roots.some((root) => file.startsWith(root)) && isFrontendModuleFile(file) && existsSync(join(repoRoot, file)))
    .map((file) => ({ file, source: readFileSync(join(repoRoot, file), 'utf8') }));
  assert.ok(entries.length > 1000, `scanned ${entries.length} files — the scan is empty`);
  assert.deepEqual(markerParserFingerprints(entries), [MARKER_PARSER_OWNER]);
  // 투영·연쇄·마커 판정이 읽는 확장자는 해석기의 모듈 확장자와 같다(대소문자 무시). 대상으로는 풀면서 그 파일의 간선·마커는
  // 읽지 않는 비대칭을 두지 않는다 — 판정은 isFrontendModuleFile 하나다.
  for (const extension of MODULE_EXTENSIONS) {
    assert.equal(isFrontendModuleFile(`src/a${extension}`), true, extension);
    assert.equal(isFrontendModuleFile(`src/A${extension.toUpperCase()}`), true, `${extension} in upper case`);
  }
  for (const extension of ['.json', '.css', '.svg', '.md', '.html', '.tsbuildinfo']) {
    assert.equal(isFrontendModuleFile(`src/a${extension}`), false, extension);
  }
});

test('the single module contract finds regex, template, concatenation and includes parsers but not markers, comments or job names', () => {
  const parsers = (source) => markerParserFingerprints([{ file: 'scripts/probe.mjs', source }]);
  // 픽스처가 JS 템플릿 안에 있으므로 원문에 역슬래시 하나를 남기려면 두 번 쓴다.
  for (const source of [
    `const marker = /${MARKER_WORD}([a-z0-9_-]+):(start|end)/g;\n`,
    `const marker = /${MARKER_WORD}[a-z]+:start/;\n`,
    'const marker = new RegExp(`' + MARKER_WORD + '${pack}:start`);\n',
    `const hit = line.includes('${MARKER_WORD}') && line.split(/${MARKER_WORD}/);\n`,
    `const prefix = '${MARKER_WORD}' + pack;\n`,
    `const marker = /${MARKER_WORD}\\w+:(start|end)/g;\n`,
    `const marker = /${MARKER_WORD}.+?:start/;\n`,
    `const marker = new RegExp('${MARKER_WORD}\\\\w+:(start|end)');\n`,
  ]) assert.deepEqual(parsers(source), ['scripts/probe.mjs'], source);
  for (const source of [
    `const job = /^  ${MARKER_WORD}\\r?\\n/m;\n`,
    `const job = new RegExp('^  ${MARKER_WORD}\\\\r?\\\\n', 'm');\n`,
    `const fixture = '/* ${MARKER_WORD}demo:start */\\nx\\n/* ${MARKER_WORD}demo:end */\\n';\n`,
    `assert.doesNotMatch(out, /${MARKER_WORD}demo:start/);\n`,
    `// const marker = /${MARKER_WORD}([a-z]+)/;\n`,
  ]) assert.deepEqual(parsers(source), [], source);
});

/*
  scripts 의 정적 import 그래프에는 순환이 없다. 순환이 있으면 진입점마다 모듈 평가 순서가 갈려, 최상위에서 상대 모듈의 값을 쓰는 순간
  한쪽 진입점에서만 TDZ 오류가 난다(PR-2 에서 projector ↔ composer 순환을 걷었다). 예외 목록은 두지 않는다.
*/
function scriptImportCycles(overrides = new Map()) {
  const directory = join(repoRoot, 'scripts');
  const names = readdirSync(directory).filter((name) => name.endsWith('.mjs')).sort();
  const known = new Set(names);
  const edges = new Map(names.map((name) => {
    const source = overrides.get(name) ?? readFileSync(join(directory, name), 'utf8');
    const targets = parseModuleReferences(source, `scripts/${name}`).references
      .filter(({ kind, specifier }) => (kind === 'static-import' || kind === 're-export') && specifier.startsWith('./'))
      .map(({ specifier }) => specifier.slice(2))
      .filter((target) => known.has(target));
    return [name, [...new Set(targets)]];
  }));
  // Tarjan 의 강한 연결 요소. 크기 2 이상이거나 자기 자신을 import 하는 요소가 순환이다.
  const order = new Map();
  const low = new Map();
  const stack = [];
  const onStack = new Set();
  const cycles = [];
  const visit = (node) => {
    order.set(node, order.size);
    low.set(node, order.get(node));
    stack.push(node);
    onStack.add(node);
    for (const next of edges.get(node)) {
      if (!order.has(next)) {
        visit(next);
        low.set(node, Math.min(low.get(node), low.get(next)));
      } else if (onStack.has(next)) {
        low.set(node, Math.min(low.get(node), order.get(next)));
      }
    }
    if (low.get(node) !== order.get(node)) return;
    const component = [];
    let member;
    do {
      member = stack.pop();
      onStack.delete(member);
      component.push(member);
    } while (member !== node);
    if (component.length > 1 || edges.get(node).includes(node)) cycles.push(component.sort());
  };
  for (const name of names) if (!order.has(name)) visit(name);
  return { files: names.length, cycles };
}

test('scripts have no static import cycle, so every entry point evaluates each module in the same order', () => {
  const { files, cycles } = scriptImportCycles();
  assert.ok(files > 200, `scanned ${files} scripts — the scan is empty`);
  assert.deepEqual(cycles, [], 'scripts/*.mjs static import cycles');
  // 대조: composer 가 projector 를 다시 import 하면 순환 하나다. 자기 자신을 import 해도 순환이다.
  const read = (name) => readFileSync(join(repoRoot, 'scripts', name), 'utf8');
  const composer = 'project-composer-source.mjs';
  assert.deepEqual(scriptImportCycles(new Map([[composer, `import { parsePackMarkerBlocks } from './reusable-source-frontend.mjs';\n${read(composer)}`]])).cycles,
    [[composer, 'reusable-source-frontend.mjs']]);
  assert.deepEqual(scriptImportCycles(new Map([['source-lexing.mjs', `import './source-lexing.mjs';\n${read('source-lexing.mjs')}`]])).cycles,
    [['source-lexing.mjs']]);
});

/*
  생성기(재사용 base 생성)와 정밀 점검은 의존성 설치 전에 돈다 — CI 의 reusable-base·reusable-custom 잡은 루트 설치 없이
  verify-reusable-base.mjs·verify-project-composer.mjs 를 돌린다. verify-reusable-base 는 DB·소스 생성기를 자식 프로세스로 띄우므로
  (import 가 아니다) 두 생성기도 진입점으로 센다. 그래서 다섯 진입점의 import 폐포는 Node 내장 모듈만 쓴다. 그 잡은 패키지 import 를
  다른 잡 뒤에야 붉히고, 실행하지 않는 지연 로드 경로는 보지 못한다. 이 시험이 같은 제약을 운영 계약 단계에서 모든 참조 종류(정적·동적
  import, require, createRequire)에 건다. 계산된 import 는 판정할 수 없으므로 issue 로 막는다. 하한은 2026-10-11 실측(35·17·16·5·34)
  아래다. 야간 생성물 시험(reusable-nightly.yml)도 루트 설치 없이 reusable-nightly.mjs 를 돌리므로 같은 진입점으로 센다(2026-10-12 실측 38).
*/
function scriptClosure(entry, overrides = new Map()) {
  const files = [];
  const issues = [];
  const packages = [];
  const missing = [];
  const queue = [entry];
  const seen = new Set();
  while (queue.length > 0) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    files.push(file);
    const parsed = parseModuleReferences(overrides.get(file) ?? readFileSync(join(repoRoot, file), 'utf8'), file);
    issues.push(...parsed.issues.map((issue) => `${issue.code} ${file}:${issue.line}`));
    for (const { kind, specifier } of parsed.references) {
      if (specifier.startsWith('./') || specifier.startsWith('../')) {
        const target = posix.normalize(posix.join(posix.dirname(file), specifier));
        if (!overrides.has(target) && !existsSync(join(repoRoot, target))) missing.push(`${file} ${kind} ${specifier}`);
        else if (/\.[cm]?js$/.test(target)) queue.push(target);
      } else if (!isBuiltin(specifier)) {
        packages.push(`${file} ${kind} ${specifier}`);
      }
    }
  }
  return { files, issues, packages, missing };
}

test('the generator and the deep plan load only Node built-in modules through their whole import closure', () => {
  for (const [entry, floor] of [
    ['scripts/generate-reusable-base-source.mjs', 30],
    ['scripts/project-composer-deep.mjs', 15],
    ['scripts/generate-reusable-base-db.mjs', 12],
    ['scripts/verify-reusable-base.mjs', 4],
    ['scripts/verify-project-composer.mjs', 25],
    ['scripts/reusable-nightly.mjs', 35],
  ]) {
    const closure = scriptClosure(entry);
    assert.ok(closure.files.length >= floor, `${entry}: the closure has only ${closure.files.length} files`);
    assert.deepEqual({ issues: closure.issues, packages: closure.packages, missing: closure.missing }, { issues: [], packages: [], missing: [] }, entry);
  }
  // 대조: 폐포 안 모듈이 패키지를 정적으로·지연으로 가져오거나 계산된 import 를 두면 붉다. 주석·문자열 속 패키지 이름은 import 가 아니다.
  const graph = 'scripts/frontend-module-graph.mjs';
  const source = readFileSync(join(repoRoot, graph), 'utf8');
  const probe = (text) => {
    const { issues, packages } = scriptClosure('scripts/generate-reusable-base-source.mjs', new Map([[graph, text]]));
    return { issues, packages };
  };
  assert.deepEqual(probe(`import Ajv from 'ajv';\n${source}`), { issues: [], packages: [`${graph} static-import ajv`] });
  assert.deepEqual(probe(`${source}\nexport const lazy = () => createRequire(import.meta.url)('pg');\n`),
    { issues: [], packages: [`${graph} create-require pg`] });
  assert.deepEqual(probe(`${source}\nexport const load = (name) => import(name);\n`),
    { issues: [`UNPARSEABLE_DYNAMIC_IMPORT ${graph}:${source.split('\n').length + 1}`], packages: [] });
  assert.deepEqual(probe(`// import 'ajv';\nexport const text = "require('ajv')";\n${source}`), { issues: [], packages: [] });
});

/*
  AST 오라클: 토크나이저(parseModuleReferences)가 frontend 모듈 파일마다 읽는 지정자 집합은 TypeScript 파서가 보는 import·export…from·
  import()·import type·require·require.resolve·createRequire(별칭 호출·즉시 호출)·import = require 지정자 집합과 같아야 한다. 걷은 원문
  정규식 대조(C5) 대신 독립 파서로 토크나이저의 오판(조용한 간선 소실·가짜 간선)을 잡는다. 모집단은 연쇄 계획이 토크나이즈하는 파일
  (Git 이 보는 frontend 모듈 파일, public/ 제외)이다. typescript 는 frontend 의존성에서 읽는다 — 생성기 폐포는 내장 모듈만 쓰므로(위 계약)
  오라클은 운영 계약에만 둔다. 판정할 수 없는 의존 호출(첫 인자가 문자열 리터럴이 아니거나 인자가 하나가 아닌 import()·require()·
  require.resolve()·createRequire 호출)도 줄 단위로 대조한다 — 그 줄에 토크나이저 issue 가 없으면 연쇄 계획을 실패시킬 판정이 조용히
  사라진 것이다(JSX 텍스트의 백틱 쌍 사이에 둔 계산된 import 가 그렇다).
*/
let typescriptModule;
function astModuleSpecifiers(file, source) {
  typescriptModule ??= createRequire(join(repoRoot, 'frontend', 'package.json'))('typescript');
  const ts = typescriptModule;
  const extension = extname(file).toLowerCase();
  const scriptKind = extension === '.tsx' ? ts.ScriptKind.TSX
    : extension === '.jsx' ? ts.ScriptKind.JSX
      : ['.js', '.mjs', '.cjs'].includes(extension) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, false, scriptKind);
  const specifiers = new Set();
  const unjudgeableLines = new Set();
  const aliases = new Set();
  const add = (node) => {
    if (node && ts.isStringLiteralLike(node)) specifiers.add(node.text);
  };
  const isCreateRequireCall = (node) => ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'createRequire';
  const isDependencyCallee = (callee) => callee.kind === ts.SyntaxKind.ImportKeyword || isCreateRequireCall(callee)
    || (ts.isIdentifier(callee) && (callee.text === 'require' || aliases.has(callee.text)))
    || (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && callee.expression.text === 'require'
      && callee.name.text === 'resolve');
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) add(node.moduleSpecifier);
    else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) add(node.moduleReference.expression);
    else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) add(node.argument.literal);
    else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && isCreateRequireCall(node.initializer)) {
      aliases.add(node.name.text);
    } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left)
      && isCreateRequireCall(node.right)) {
      aliases.add(node.left.text);
    } else if (ts.isCallExpression(node) && isDependencyCallee(node.expression)) {
      if (node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0])) add(node.arguments[0]);
      else unjudgeableLines.add(sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return { specifiers, unjudgeableLines };
}

/** 연쇄 계획을 실패시키는 '판정할 수 없는 의존 호출' issue 코드. */
const UNJUDGEABLE_CALL_ISSUE = /^(?:UNPARSEABLE_|UNSUPPORTED_DYNAMIC_IMPORT_OPTIONS$)/;
function moduleSpecifierDifferences(file, source, tokenize = parseModuleReferences) {
  const parsed = tokenize(source, file);
  const tokenizer = new Set(parsed.references.map(({ specifier }) => specifier));
  const issueLines = new Set(parsed.issues.filter(({ code }) => UNJUDGEABLE_CALL_ISSUE.test(code)).map(({ line }) => line));
  const ast = astModuleSpecifiers(file, source);
  return {
    tokenizerOnly: [...tokenizer].filter((specifier) => !ast.specifiers.has(specifier)).sort(),
    astOnly: [...ast.specifiers].filter((specifier) => !tokenizer.has(specifier)).sort(),
    astUnjudgeableOnly: [...ast.unjudgeableLines].filter((line) => !issueLines.has(line)).sort((left, right) => left - right),
  };
}

test('the tokenizer reads the same module specifiers as the TypeScript AST in every frontend module file (AST oracle)', () => {
  const files = trackedAndUntrackedFiles()
    .map((file) => file.split(sep).join('/'))
    .filter((file) => file.startsWith('frontend/') && !file.startsWith('frontend/public/') && isFrontendModuleFile(file)
      && existsSync(join(repoRoot, file)));
  assert.ok(files.length > 1000, `compared ${files.length} files — the population is empty`);
  const differences = [];
  for (const file of files) {
    const difference = moduleSpecifierDifferences(file, readFileSync(join(repoRoot, file), 'utf8'));
    if (Object.values(difference).some((list) => list.length > 0)) differences.push({ file, ...difference });
  }
  assert.deepEqual(differences, [], 'tokenizer and TypeScript AST module specifiers differ');
  const none = { tokenizerOnly: [], astOnly: [], astUnjudgeableOnly: [] };
  // 자기 점검: 대조가 차이를 실제로 잡는다. 참조 하나를 빼는 가짜 토크나이저는 astOnly 로, issue 를 빼는 가짜 토크나이저는
  // astUnjudgeableOnly 로 드러난다(오라클이 토크나이저를 자기 자신과 비교하게 되는 회귀도 이것으로 붉다).
  const probe = ["import { a } from './a';", "import { b } from './b';", 'export const load = (name) => import(name);'].join('\n');
  const dropFirstReference = (source, file) => {
    const parsed = parseModuleReferences(source, file);
    return { ...parsed, references: parsed.references.slice(1) };
  };
  const dropIssues = (source, file) => ({ ...parseModuleReferences(source, file), issues: [] });
  assert.deepEqual(moduleSpecifierDifferences('frontend/src/p.ts', probe), none, 'the real tokenizer agrees with the AST on the probe');
  assert.deepEqual(moduleSpecifierDifferences('frontend/src/p.ts', probe, dropFirstReference), { ...none, astOnly: ['./a'] },
    'the oracle sees a reference the tokenizer drops');
  assert.deepEqual(moduleSpecifierDifferences('frontend/src/p.ts', probe, dropIssues), { ...none, astUnjudgeableOnly: [3] },
    'the oracle sees an unjudgeable import the tokenizer does not report');
  // 알려진 토크나이저 한계(AST 쪽만 단언한다): JSX 텍스트의 백틱 쌍은 토크나이저가 템플릿으로 읽어 그 사이의 동적 import·re-export 와
  // 계산된 import 를 issue 없이 삼킨다. 아포스트로피 쌍도 같지만 react/no-unescaped-entities(경고 상한)가 먼저 막는다. 토크나이저를
  // 고쳐도 붉지 않도록 토크나이저의 결과는 단언하지 않는다 — 저장소에 이런 파일이 생기면 위 대조가 잡는다.
  const backtick = [
    'export const A = () => <p>open ` quote</p>;',
    "export const lazy = dynamic(() => import('./hidden'));",
    "export { hidden } from './reexported';",
    "const name = './computed';",
    'export const computed = () => import(name);',
    'export const B = () => <p>close ` quote</p>;',
  ].join('\n');
  const swallowed = astModuleSpecifiers('frontend/src/x.tsx', backtick);
  assert.deepEqual({ specifiers: [...swallowed.specifiers].sort(), unjudgeableLines: [...swallowed.unjudgeableLines] },
    { specifiers: ['./hidden', './reexported'], unjudgeableLines: [5] }, 'known tokenizer limitation: the AST sees what a JSX-text backtick pair hides');
  // 문자열 값 뒤의 '/' 는 나눗셈이다 — 정규식 시작으로 읽으면 JSX 의 `char=":" />` 뒤 `href="/x/y"` 부터 그 뒤 코드를 삼킨다.
  const division = ['export const A = () => <><Sep char=":" /><a href="/x/y">t</a></>;', "export { kept } from './after-division';"].join('\n');
  assert.deepEqual(moduleSpecifierDifferences('frontend/src/d.tsx', division), none, 'a slash after a string literal is division, not a regular expression');
  // 숫자 리터럴은 한 토큰이다 — 끝에 점이 붙은 숫자(`1.`)의 '.' 를 멤버 접근으로 읽으면 다음 줄의 import 가 조용히 사라지고,
  // 숫자 뒤의 '/' 를 정규식 시작으로 읽으면 그 뒤 코드를 삼킨다.
  assert.deepEqual(moduleSpecifierDifferences('frontend/src/n.ts', "const n = 1.\nimport x from './after-number';\n"), none,
    'a number literal ending in a dot is not a member access');
  assert.deepEqual(moduleSpecifierDifferences('frontend/src/n.ts', "const half = 1 / 2; const slash = '/';\nimport y from './after-division-number';\n"),
    none, 'a slash after a number literal is division, not a regular expression');
  // 멤버 호출과 함수 선언 이름의 import·require 는 모듈 참조가 아니다 — 토크나이저가 읽으면 가짜 간선(과다 연쇄)이나 거짓 실패다.
  const member = ["export const a = obj.require('./x');", "export const b = api.import('./y');", 'declare function require(id: string): unknown;'].join('\n');
  assert.deepEqual(moduleSpecifierDifferences('frontend/src/m.ts', member), none, 'member calls are not module references');
  assert.deepEqual(parseModuleReferences(member).issues, [], 'member calls and declarations are not unjudgeable imports');
});

test('a projector keeps no marker block of an excluded pack and rejects malformed or unknown markers for presets and direct selections', () => {
  const manifest = JSON.parse(readFileSync(join(repoRoot, 'config/reusable-base-profiles.json'), 'utf8'));
  const projector = createFrontendProjector({ manifest, profile: manifest.profiles.core });
  const file = 'src/app/search/SearchClient.tsx';
  const projected = projector.project(file, readFileSync(join(repoRoot, 'frontend', file), 'utf8'));
  assert.ok(projected.strippedBlocks > 0);
  assert.deepEqual(parsePackMarkerBlocks(projected.source, { knownPacks: new Set(Object.keys(manifest.packs)), label: file }).blocks, []);
  // 투영은 프런트 모듈 파일 전부(isFrontendModuleFile)를 걷는다 — .mjs 의 제외 pack 블록도 걷고, next.config.mjs 의 마커는 실패다.
  const output = createFixture({
    'frontend/src/lib/x.mjs': '// reusable-base:demo:start\nexport const demo = 1;\n// reusable-base:demo:end\nexport const kept = 1;\n',
  });
  assert.deepEqual(applyFrontendProjection(output, projector), { excludedPacks: projector.excludedPacks, strippedBlocks: 1, changedFiles: 1 },
    'a .mjs module is projected');
  assert.equal(readFileSync(join(output, 'frontend/src/lib/x.mjs'), 'utf8'), 'export const kept = 1;\n');
  const config = createFixture({ 'frontend/next.config.mjs': '// reusable-base:demo:start\nexport const x = 1;\n// reusable-base:demo:end\n' });
  assert.throws(() => applyFrontendProjection(config, projector), /next\.config 는 pack 마커를 둘 수 없다/, 'next.config.mjs is projected and its markers fail');
  // 마커 구조 오류와 알 수 없는 pack 은 투영 단계에서 실패한다. 직접 선택도 같다 — 종전 직접 선택의 정규식 투영은 중첩·알 수 없는 pack 을
  // 통과시켰다. 줄 번호까지 고정한다(미닫힘은 여는 마커의 줄이다).
  const custom = createFrontendProjector({ manifest, profile: { packs: ['core'], frontendRemovePaths: [] },
    composition: { profile: 'custom', resolvedDomains: [] } });
  const nested = '/* reusable-base:demo:start */\n/* reusable-base:collaboration:start */\nx\n/* reusable-base:collaboration:end */\n/* reusable-base:demo:end */\n';
  for (const [name, candidate] of [['preset', projector], ['direct selection', custom]]) {
    assert.throws(() => candidate.project('src/app/x.tsx', nested), /중첩은 허용하지 않는다/);
    assert.throws(() => candidate.project('src/app/x.tsx', '/* reusable-base:nope:start */\nx\n/* reusable-base:nope:end */\n'), /알 수 없는 frontend pack marker: nope/,
      `${name} projector rejects an unknown pack`);
    assert.throws(() => candidate.project('src/app/x.tsx', '/* reusable-base:demo:start */ x /* reusable-base:demo:end */\n'),
      /한 줄에 하나만 허용한다: src\/app\/x\.tsx:1/, `${name} projector rejects two markers on one line`);
    assert.throws(() => candidate.project('src/app/x.tsx', '/* reusable-base:demo:start */\nx\n/* reusable-base:collaboration:end */\n'),
      /짝이 맞지 않는 frontend pack marker: collaboration \(src\/app\/x\.tsx:3\)/, `${name} projector rejects a mismatched end marker`);
    assert.throws(() => candidate.project('src/app/x.tsx', 'x\n/* reusable-base:demo:start */\nx\n'),
      /닫히지 않은 frontend pack marker: demo \(src\/app\/x\.tsx:2\)/, `${name} projector reports an unclosed marker at its line`);
  }
  // 직접 선택 투영은 해석된 기능 목록이 있어야 한다 — 종전에는 목록이 없으면 블록을 조용히 걷었다.
  assert.throws(() => createFrontendProjector({ manifest, profile: { packs: ['core'], frontendRemovePaths: [] }, composition: { profile: 'custom' } }),
    /해석된 기능 목록/, 'a direct selection projector needs the resolved domains');
  // lock.frontend.packBlocks 는 종전 pack 마커 단계의 셈이다: 소유 기능이 빠져 걷은 블록은 세지 않고, 소유는 남지만 pack 이 빠진 블록만 센다.
  const home = 'src/app/UnifiedDashboardClient.tsx';
  const homeSource = readFileSync(join(repoRoot, 'frontend', home), 'utf8');
  const byCustom = custom.project(home, homeSource);
  assert.deepEqual({ stripped: byCustom.strippedBlocks, changed: byCustom.packChanged }, { stripped: 0, changed: false });
  assert.notEqual(byCustom.source, homeSource);
  assert.equal(byCustom.source, projector.project(home, homeSource).source);
  assert.equal(projector.project(home, homeSource).strippedBlocks, parsePackMarkerBlocks(homeSource, { label: home }).blocks.length);
});
