// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { keepInProjection } from '@/test-utils/projection';
import { codeWithoutComments } from '../../../scripts/code-without-comments.mjs';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP_DIR = join(FRONTEND_DIR, 'src', 'app');

/**
 * A1 archetype 채택 census — 이행이 진행 중임을 **숫자로** 고정한다.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §6·§7.
 *
 * 이 게이트가 없으면 이행은 "했다는 주장"으로만 남는다. 화면 문법은 컴포넌트가 존재한다고
 * 지켜지는 게 아니라 **화면이 그것을 경유할 때** 지켜지기 때문에, 두 모집단을 exact 로 묶는다.
 *
 *   ADOPTER_SCREENS       WorkListPage 를 경유하는 화면 — 빠지면 red(이행 되돌리기 차단), 목록 밖 채택도 red
 *   DIRECT_ONLY_SCREENS   셸 없이 StandardDataTable 을 직접 조립하는 화면 — 늘어나면 red(신규 유입 차단)
 *
 * ⚠ DIRECT_ONLY_SCREENS 의 목표는 빈 목록이 아니다. 마스터-디테일(A2)·매트릭스(A5)처럼 A1이 아닌
 *   archetype 은 정당하게 직접 소비한다 — 각 화면이 자기 셸로 이행할 때 함께 빠진다. 지금 0 을
 *   목표로 잡으면 A1 이 아닌 화면을 A1 셸에 우겨넣는 잘못된 압력이 된다.
 *
 * 목록을 바꿀 때는 소스를 먼저 고치고 **실측 red 를 확인한 뒤** 목록을 갱신한다.
 * ADOPTER_SCREENS 에 더하는 것과 DIRECT_ONLY_SCREENS 에서 빼는 것만 정상 경로다(AGENTS H2).
 */
// [2026-09-06 DEC-OPS-040] 40 → 39: /admin/system/ism(IsmClient)이 /approvals 로 통합돼 화면이 사라졌다 — 되돌리기가 아니라
//   같은 개인 결재함 두 화면을 하나로 모은 결과다(DEC-OPS-039 제안의 owner 승인). 정본 /approvals 는 A2 MasterDetailPage 소비자다.
// [2026-09-07] 39 -> 40: /admin/system/isg 신설. 백엔드 5본이 완비인데 프런트 호출부가 0 이라
//   등록 경로조차 없던 고아 도메인을 배선했다 — 되돌리기가 아니라 새 A1 소비자다.
// [2026-09-08 PD-SRVY-001] 40 -> 39: /admin/survey/respondents 를 걷었다. tb_srvy_rspdnt 는 성명·
//   생년월일·전화번호를 담는데 응답 결과와 ID 로 연결되지 않고 행을 만드는 경로가 없어 그 A1 화면은
//   **항상 빈 목록**이었다. 되돌리기가 아니라 표면 제거이며, 사용자 결정(PD-SRVY-001)에 따른다.
// [2026-09-08 PD-MYPG-001] 39 -> 38: /admin/workspace/my-page 를 걷었다. tb_indv_pg_conts 는 시드도
//   생성 경로도 없고 **그 값을 읽는 화면조차 없어**(대시보드 위젯 SPI 구현 2개가 쓰지 않는다) 켜고
//   꺼도 어디에도 나타나지 않았다. 되돌리기가 아니라 표면 제거이며 사용자 결정(PD-MYPG-001)에 따른다.
// The unified authority hub adopts WorkListPage and retires one direct table.
// [상향 2026-09-20] 39 -> 40: 관리센터 > 사용자조직 허브(UserOrgHubClient — manage·departments·
//   absences·indvdl-info-policy 네 라우트가 공유)가 A1 셸을 경유한다. 종전에는 PageHeader +
//   HubSectionCard(96px 아이콘 박스·400px 블러) + 수제 grid 로 골격을 직접 조립해 결과 툴바도
//   조회조건 영역도 없었다(카탈로그 §6 이 "USERS 의 직접 표" 로 인지하던 화면이다).
//   ⚠ DIRECT_ONLY 는 불변이다 — 이 파일은 A2 셸도 import 하므로 종전에도 직접조립으로 세지 않았다.
// [상향 2026-09-20(2)] 40 -> 42: 권한보안의 그룹별 메뉴 현황(/admin/system/menus/by-authority)과
//   로그인 정책 관리(/admin/security/login-policy)가 A1 셸을 경유한다. 둘 다 종전에는 PageHeader/
//   HubHeader + HubMetricGrid + HubSectionCard 로 골격을 직접 조립해 결과 툴바도 조회조건 영역도 없었다.
// [상향 2026-09-20(3)] 42 -> 43: 지식 허브(/admin/help·faq·qna 와 /admin/community 별칭)가
//   A1 셸을 경유한다. 종전에는 카드 한 장이 한 문서인 목록이라 행이 약 100px 였고 조회수를
//   한 행에 두 번 찍었다(64px 타일 + 눈 아이콘). 카테고리 탭은 navigation 슬롯, 검색·정렬은
//   조회조건, 총계는 결과 툴바가 소유한다.
//   ⚠ DIRECT_ONLY 는 불변이다 — 이 화면은 종전에 표를 쓰지 않아 직접 조립으로 세지 않았다.
// [2026-09-25 DEC-OPS-129] 43 -> 42: /admin/system/network 를 걷었다. 저장 테이블·계측 소스가 없어 조회는
//   **항상 빈 목록**, 쓰기는 501 이었고 메뉴·링크 어디에도 없었다. 되돌리기가 아니라 표면 제거이며 사용자 결정에 따른다.
// [2026-09-25 DEC-OPS-130] 42 -> 41: /admin/community/[id] 를 정본 커뮤니티 상세로의 page-redirect 로 통합했다.
//   그 화면은 이름과 달리 경로의 id 를 읽지 않고 선택한 게시판 글 목록을 보여 줬다(메뉴·인바운드 링크 0).
//   게시판 글 목록은 게시판 목록 화면이 계속 제공하므로 이행 되돌리기가 아니라 중복 표면 제거다.
// [2026-10-01 결정 19] 41 -> 43: 민감 작업 감사 원장(/admin/system/logs/audit)과 후속 작업 상태(/admin/system/durable-jobs)를
//   셸로 신설했다. 서버에 원장·작업이 쌓이는데 볼 화면이 없었다 — 이행 되돌리기가 아니라 새 화면이다.
// [허브 분해 H6] 43 -> 44: 댓글 및 평가 관리(/admin/system/comments)가 감시 허브 위임을 떠나 댓글 기능의 독립 A1 화면이 됐다.
//   감시 허브는 그대로 셸을 경유한다 — 이행 되돌리기가 아니라 새 화면이다.
// [업무 허브 분해 W1] 44 -> 45: 업무 허브 클라이언트(업무 보고·일정 탭 공유)가 업무 보고·일정 두 화면으로 나뉘었다 — 둘 다 셸을
//   경유한다. 나의 업무·업무 관리는 core 섹션(components/business/deptJob)이라 이 census 의 화면 모집단(src/app) 밖이다.
/*
 * [2026-10-10 Phase 2 D6] 화면 목록을 동결한다 — 재사용 생성물에서는 투영으로 빠진 화면만 뺀다(원장 확인).
 *   위의 수 변천은 이 목록 길이의 이력이다. 수는 목록 길이에서 나오므로 따로 동결하지 않는다 — 수와 목록을 함께 고치게 하는
 *   상수 비교는 코드를 보지 않는다(FE-CONTRACT-07). 화면을 옮기거나 이행하면 목록만 고친다.
 */
const ADOPTER_SCREENS = [
  // [허브 분해 H1] 협업 허브는 core 틀(collaboration-hub-frame)이 셸을 경유하고 탭 뷰가 그 틀에 조각을 넘긴다 — 수는 같다.
  'src/app/admin/collaboration/collaboration-hub-frame.tsx',
  'src/app/admin/collaboration/address-book/select-address-book-list/AddressBookListClient.tsx',
  'src/app/admin/collaboration/scraps/selectScrapList/ScrapListClient.tsx',
  'src/app/admin/community/boards/master/BoardMasterListClient.tsx',
  'src/app/admin/community/templates/TemplateAdminClient.tsx',
  'src/app/admin/help/KnowledgeHubClient.tsx',
  'src/app/admin/operation/events/EventManagementClient.tsx',
  'src/app/admin/operation/external-hr/ExternalHrClient.tsx',
  'src/app/admin/operation/memo-reports/MemoReportManagementClient.tsx',
  'src/app/admin/operation/rewards/RewardManageClient.tsx',
  'src/app/admin/operation/rough-map/RoughMapManagementClient.tsx',
  'src/app/admin/patterns/PatternGalleryClient.tsx',
  'src/app/admin/security/authority/SecurityHubClient.tsx',
  'src/app/admin/security/dept-authority/SecurityDeptAuthorityClient.tsx',
  'src/app/admin/security/group/SecurityGroupClient.tsx',
  'src/app/admin/security/login-policy/LoginPolicyAdminClient.tsx',
  'src/app/admin/survey/manage/SurveyManageClient.tsx',
  'src/app/admin/survey/polls/OnlinePollAdminClient.tsx',
  'src/app/admin/system/banner/BannerAdminClient.tsx',
  'src/app/admin/system/codes/administ/AdministCodeClient.tsx',
  'src/app/admin/system/codes/institution/InstitutionCodeClient.tsx',
  'src/app/admin/system/comments/CommentModerationClient.tsx',
  'src/app/admin/system/durable-jobs/DurableJobsClient.tsx',
  'src/app/admin/system/hpcm/HpcmClient.tsx',
  'src/app/admin/system/isg/InternetSvcGuidanceClient.tsx',
  'src/app/admin/system/logs/LogDashboardClient.tsx',
  'src/app/admin/system/logs/audit/AuditJournalClient.tsx',
  'src/app/admin/system/logs/login/SystemLogsLoginClient.tsx',
  'src/app/admin/system/logs/privacy/SystemLogsPrivacyClient.tsx',
  'src/app/admin/system/logs/system/SystemLogsSystemClient.tsx',
  'src/app/admin/system/logs/user/SystemLogsUserClient.tsx',
  'src/app/admin/system/logs/web/SystemLogsWebClient.tsx',
  'src/app/admin/system/menus/by-authority/MenuByAuthorityClient.tsx',
  'src/app/admin/system/monitoring/MonitoringHubClient.tsx',
  'src/app/admin/system/policies/PolicyAdminClient.tsx',
  'src/app/admin/system/programs/ProgramAdminClient.tsx',
  'src/app/admin/user/UserOrgHubClient.tsx',
  'src/app/admin/uss/ion/sms/SmsAdminClient.tsx',
  'src/app/admin/uss/olh/online-manual/ManualAdminClient.tsx',
  'src/app/cop/cmy/selectCommunityList/CommunityHubClient.tsx',
  'src/app/help/HelpClient.tsx',
  'src/app/note/NoteHubClient.tsx',
  'src/app/smart-toolkit/schedule/ScheduleCalendarClient.tsx',
  'src/app/smart-toolkit/work-report/WorkReportClient.tsx',
  'src/app/survey/SurveyClient.tsx',
];
// [하향 2026-09-20] 3 -> 2: 로그인 정책 관리가 StandardDataTable 직접 조립에서 A1 셸 경유로 옮겨갔다.
const DIRECT_ONLY_SCREENS = [
  'src/app/components/ui/smart-notification-hub.tsx',
  'src/app/cop/sms/selectSmsList/SmsHubClient.tsx',
];
const inProjectionScreens = (screens: string[]) => keepInProjection(screens, (screen) => join(FRONTEND_DIR, screen));

const TABLE_IMPORT = 'components/ui/standard-data-table';
const SHELL_IMPORT = 'components/patterns/work-list-page';
/**
 * A1 이 아닌 archetype 셸들. 이 셸을 쓰는 화면은 "셸 없이 직접 조립"이 아니다 —
 * A2(마스터-디테일)·A7(현황+원본 표)은 각자의 census 가 따로 검증한다.
 * 여기서 빼지 않으면 이미 이행한 화면이 영원히 미이행으로 집계된다.
 */
const OTHER_SHELL_IMPORTS = [
  'components/patterns/master-detail-page',
  'components/patterns/report-page',
];
/**
 * A1 셸을 감싼 허브 틀(허브 분해 H1). 틀이 WorkListPage 를 경유하므로 채택 수에는 틀 하나만 센다. 틀에 조각을 넘기는 탭 뷰(기능의
 * hub-tabs-<허브> 기여 뷰)는 직접 조립이 아니고, 셸 화면 규칙(G2 조회/Enter·총 건수 단일 표기)은 탭 뷰에도 그대로 적용한다.
 */
const A1_FRAME_IMPORTS = ['admin/collaboration/collaboration-hub-frame'];

/** 화면 파일만 센다 — 테스트와 로딩 스켈레톤은 소비자가 아니다. */
function screenFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : screenFiles(path);
    if (!entry.name.endsWith('.tsx')) return [];
    if (entry.name === 'loading.tsx' || entry.name.endsWith('.test.tsx')) return [];
    return [path];
  });
}

/** `pagination={{ … }}` 로 넘기는 객체 본문만 잘라낸다(파일 전체 스캔의 오탐 방지). */
function paginationBlocks(code: string): string[] {
  const blocks: string[] = [];
  const opening = /pagination=\{\{/g;
  let match = opening.exec(code);
  while (match !== null) {
    const end = code.indexOf('}}', match.index);
    blocks.push(end === -1 ? code.slice(match.index) : code.slice(match.index, end));
    match = opening.exec(code);
  }
  return blocks;
}

/**
 * 같은 폴더의 화면이 `./조각` 으로 불러 쓰는 파일. 셸 화면의 표시 조각은 그 화면의 일부라, 화면을 여러 파일로 나눠도
 * 판정이 바뀌지 않아야 한다(2026-10-18 트랙 B — 공통코드 상세 표가 A2 화면의 CodeTreeNode 로, 사용자·조직 허브의 조각이
 * UserOrgHubParts 로 옮겨졌다). 같은 폴더의 직접 import 만 본다 — 공용 컴포넌트는 어느 셸 화면이 불러도 자기 판정을 받는다.
 */
function siblingImports(path: string, source: string): string[] {
  return [...codeWithoutComments(source, path).matchAll(/from\s+['"]\.\/([^'"/]+)['"]/g)]
    .map(([, name]) => join(dirname(path), /\.tsx?$/.test(name) ? name : `${name}.tsx`));
}

function census() {
  const adopters: string[] = [];
  const directOnly: string[] = [];
  const frameUsers: string[] = [];

  const screens = screenFiles(APP_DIR).map((path) => ({ path, source: readFileSync(path, 'utf8') }));
  const shellFragments = new Set(screens
    .filter(({ source }) => [SHELL_IMPORT, ...OTHER_SHELL_IMPORTS, ...A1_FRAME_IMPORTS].some((shell) => source.includes(shell)))
    .flatMap(({ path, source }) => siblingImports(path, source)));

  for (const { path, source } of screens) {
    const usesShell = source.includes(SHELL_IMPORT);
    const usesOtherShell = OTHER_SHELL_IMPORTS.some((shell) => source.includes(shell));
    const usesFrame = A1_FRAME_IMPORTS.some((frame) => source.includes(frame));
    const usesTable = source.includes(TABLE_IMPORT);
    const relativePath = relative(FRONTEND_DIR, path).split(sep).join('/');

    if (usesShell) adopters.push(relativePath);
    else if (usesFrame) frameUsers.push(relativePath);
    else if (usesTable && !usesOtherShell && !shellFragments.has(path)) directOnly.push(relativePath);
  }

  return { adopters: adopters.sort(), directOnly: directOnly.sort(), frameUsers: frameUsers.sort() };
}

describe('A1 archetype 채택 census', () => {
  const { adopters, directOnly, frameUsers } = census();
  /** 셸 화면 규칙을 받는 화면 — 셸 경유 화면과 셸 틀에 조각을 넘기는 탭 뷰. */
  const shellScreens = [...adopters, ...frameUsers];
  const expectedAdopters = inProjectionScreens(ADOPTER_SCREENS);
  const expectedDirectOnly = inProjectionScreens(DIRECT_ONLY_SCREENS);

  // 목록 exact 대조다 — 셸을 떠난 화면(이행 되돌리기)도, 목록에 없는 새 셸 화면도 red 다.
  it(`WorkListPage 경유 화면은 동결한 화면 목록(${expectedAdopters.length}개)과 정확히 같다`, () => {
    const missing = expectedAdopters.filter((screen) => !adopters.includes(screen));
    const added = adopters.filter((screen) => !expectedAdopters.includes(screen));
    expect(
      { missing, added },
      `셸을 떠난 화면은 되돌리고, 새로 셸을 쓴 화면은 ADOPTER_SCREENS 에 더하세요.\n현재 채택 화면:\n${adopters.join('\n')}`,
    ).toEqual({ missing: [], added: [] });
  });

  it('허브 틀에 조각을 넘기는 탭 뷰는 직접 조립으로 세지 않고 목록으로 동결한다', () => {
    expect(frameUsers).toEqual(inProjectionScreens([
      'src/app/admin/collaboration/scraps/ScrapCollaborationTab.tsx',
      'src/app/note/NoteCollaborationTab.tsx',
    ]));
  });

  // 목록 exact 대조다 — 신규 유입도, 이행했는데 목록에서 빼지 않은 화면도 red 다.
  it(`셸 없이 표를 직접 조립하는 화면은 동결한 목록(${expectedDirectOnly.length}개)과 정확히 같다(신규 유입 차단)`, () => {
    const added = directOnly.filter((screen) => !expectedDirectOnly.includes(screen));
    const gone = expectedDirectOnly.filter((screen) => !directOnly.includes(screen));
    expect(
      { added, gone },
      added.length
        ? `신규 ${added.length}건 유입 — 조회형 목록이면 WorkListPage 를 경유하세요.`
        : `${gone.length}건 감소 — 이행분을 확정하려면 DIRECT_ONLY_SCREENS 에서 빼세요.`,
    ).toEqual({ added: [], gone: [] });
  });

  /*
   * [2026-09-26 DIP C9] 카탈로그 G2 — 조회 조건은 `조회`/Enter 로 적용한다. W3 는 "조회 시점을 타이핑 디바운스에서
   * `조회`/Enter 로 통일했다" 고 기록했지만 셸 경유 12화면이 여전히 입력 디바운스로 목록을 조회했다(규칙은 있는데 게이트가
   * 없었다). 셸을 쓰는 화면은 목록 조회에 입력 디바운스 훅을 쓰지 않는다 — 예외 목록은 두지 않는다.
   */
  it('셸을 쓰는 화면은 목록을 입력 디바운스로 조회하지 않는다(G2 조회/Enter)', () => {
    const debouncing = shellScreens.filter((relativePath) => {
      const source = readFileSync(join(FRONTEND_DIR, relativePath), 'utf8');
      return /from ['"]@\/lib\/hooks\/use-debounced-value['"]/.test(source);
    });
    expect(debouncing, `조회 시점이 입력 디바운스인 셸 화면: ${debouncing.join(', ')} — KeywordFilter(조회/Enter)로 적용하세요.`).toEqual([]);
  });

  it('셸을 쓰는 화면은 총 건수를 표 하단에 중복 표기하지 않는다', () => {
    const duplicated = shellScreens.filter((relativePath) => {
      const source = readFileSync(join(FRONTEND_DIR, relativePath), 'utf8');
      // ⚠ 주석을 먼저 지운다 — 이 규칙을 **설명하는 주석**이 대상 파일에 들어 있어서, 지우지 않으면
      //   계약이 자기 설명을 위반으로 신고한다(dom-identity-invariants 가 남긴 함정과 같은 것).
      // ⚠ 주석 제거는 공용 판정(scripts/code-without-comments.mjs)이 한다 — 종전 정규식은 지우는 순서를 바꿔도(2026-08-29)
      //   문자열 속 주석 기호에서 블록 주석을 열어 그 사이 실행 코드를 통째로 지웠다(FE-CONTRACT-01).
      const code = codeWithoutComments(source, relativePath);
      // 셸이 총 건수를 소유하므로 표 pagination 에 totalCount 를 다시 넘기면 위아래 이중 표기가 된다.
      // ⚠ 검사는 pagination 블록 **안**으로 한정한다 — 파일 전체를 훑으면 셸에 정상적으로 넘긴
      //   `totalCount={...}` 까지 걸려 오탐이 난다(2026-08-24 실측: 설문 응답자 화면).
      // ⚠ **속성 전달**만 본다. `totalPages: Math.ceil(totalCount / PAGE_SIZE)` 처럼 계산식에
      //   식별자로 쓰는 것은 이중 표기가 아니다(2026-08-25 실측: 온라인 설문 관리에서 오탐).
      return paginationBlocks(code).some((block) => /(^|[\s,{])totalCount\s*[,:}]/.test(block));
    });

    expect(duplicated, `총 건수 이중 표기:\n${duplicated.join('\n')}`).toEqual([]);
  });
});
