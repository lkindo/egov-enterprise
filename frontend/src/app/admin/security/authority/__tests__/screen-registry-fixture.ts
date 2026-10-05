import type { PermissionCode } from '@/types/generated-permissions';
import type * as ScreenRegistryModule from '@/types/generated-screen-registry';
import type { ScreenAlias, ScreenPermissionSource, ScreenRegistryEntry } from '@/types/generated-screen-registry';

/**
 * 시험용 고정 화면 목록 — '화면별 권한' 표의 모델·표 시험이 생성된 화면 목록 대신 쓴다.
 *
 * 생성된 화면 목록(generated-screen-registry)은 화면 소스의 canPermission 리터럴에서 다시 만들어진다. 다른 영역이 화면
 * 하나를 고치면 그 화면의 칸 내용이 바뀌므로, 칸의 내용·일괄 선택 범위·키보드 이동처럼 '어떤 화면에 어떤 권한이 있는가'에
 * 기대는 단언은 이 목록에 기댄다. 진입 권한은 라우트 게이트 원장(generated-permissions)을 그대로 쓴다 — 칸 판정이 게이트와
 * 같은 원장을 읽는다는 것이 계약이다. 그래서 아래 entry 는 그 원장과 같은 값으로 둔다.
 *
 * 실제 생성물과 맞물리는 불변식(공용 판정과의 일치, 일괄 코드의 범위)은 screen-permission-model.registry.test.ts 가 본다.
 *
 * 쓰는 법(시험 파일마다 — vi.mock 은 파일 단위다):
 *   vi.mock('@/types/generated-screen-registry', async (importOriginal) =>
 *     (await import('./screen-registry-fixture')).withFixtureScreenRegistry(await importOriginal()));
 */
type Permission = readonly [code: string, action: string, source: ScreenPermissionSource];

function screenOf(route: string, label: string, entry: readonly string[], mode: 'ANY' | 'ALL', permissions: readonly Permission[], dynamic = false): ScreenRegistryEntry {
  return {
    route, label, labelSource: 'menu', shellAccess: 'admin-system', dynamic,
    entry: { permissions: entry as PermissionCode[], mode },
    permissions: permissions.map(([code, action, source]) => ({ code: code as PermissionCode, action, source })),
  };
}

export const FIXTURE_SCREENS: readonly ScreenRegistryEntry[] = [
  screenOf('/admin/collaboration/address-book/select-address-book-list', '통합 주소록 관리', [], 'ANY', [
    ['ADBK_CREATE', 'CREATE', 'write'], ['ADBK_DELETE', 'DELETE', 'write'],
  ]),
  screenOf('/admin/community/boards/insert-board-article', '게시글 작성', [], 'ANY', [
    ['BOARD_CREATE', 'CREATE', 'write'], ['BOARD_UPDATE', 'UPDATE', 'write'], ['BOARD_UPDATE_ALL', 'UPDATE_ALL', 'write'],
  ]),
  screenOf('/admin/security/authority', '권한 그룹 관리', ['AUTHRT_READ', 'AUTHRT_AUDIT'], 'ANY', [
    ['AUTHRT_ASSIGN', 'ASSIGN', 'display'], ['AUTHRT_AUDIT', 'AUDIT', 'entry'], ['AUTHRT_CREATE', 'CREATE', 'display'],
    ['AUTHRT_DELETE', 'DELETE', 'write'], ['AUTHRT_GRANT', 'GRANT', 'write'], ['AUTHRT_READ', 'READ', 'entry'],
    ['AUTHRT_UPDATE', 'UPDATE', 'write'],
  ]),
  screenOf('/admin/survey/polls', '투표 관리', ['POLL_READ', 'POLL_READ_ALL'], 'ALL', [
    ['POLL_CREATE', 'CREATE', 'write'], ['POLL_READ', 'READ', 'entry'], ['POLL_READ_ALL', 'READ_ALL', 'entry'],
  ]),
  // [2026-10-04 프로그램 목록 퇴역] 종전 이 자리의 '화면 관리'(진입 PROGRAM_READ) 줄을 실재 화면·코드로 바꿨다 — 화면 관리의
  //   진입 권한이 MENU_READ 가 되어 메뉴 관리와 같아졌으므로, '다른 화면과 겹치지 않는 진입 권한' 을 가진 메뉴 밖 화면이 필요하다.
  screenOf('/admin/system/codes/administ', '행정 표준코드 관리', ['ADMCODE_READ'], 'ANY', [
    ['ADMCODE_CREATE', 'CREATE', 'write'], ['ADMCODE_DELETE', 'DELETE', 'write'], ['ADMCODE_READ', 'READ', 'entry'],
    ['ADMCODE_UPDATE', 'UPDATE', 'write'],
  ]),
  screenOf('/admin/system/menus', '메뉴 관리', ['MENU_READ'], 'ANY', [
    ['MENU_CREATE', 'CREATE', 'display'], ['MENU_DELETE', 'DELETE', 'display'], ['MENU_READ', 'READ', 'entry'],
    ['MENU_UPDATE', 'UPDATE', 'display'],
  ]),
  screenOf('/admin/user/manage', '계정 및 사용자 관리', ['USER_READ'], 'ANY', [
    ['ABSENCE_UPDATE', 'UPDATE', 'write'], ['AUTHRT_AUDIT', 'AUDIT', 'display'], ['AUTHRT_READ', 'READ', 'display'],
    ['DEPT_CREATE', 'CREATE', 'write'], ['DEPT_DELETE', 'DELETE', 'write'], ['DEPT_UPDATE', 'UPDATE', 'write'],
    ['MFA_RECOVER', 'RECOVER', 'display'], ['USER_CREATE', 'CREATE', 'write'], ['USER_DELETE', 'DELETE', 'write'],
    ['USER_DEPT', 'DEPT', 'write'], ['USER_PASSWORD', 'PASSWORD', 'write'], ['USER_READ', 'READ', 'entry'],
    ['USER_STATUS', 'STATUS', 'write'], ['USER_UPDATE', 'UPDATE', 'write'],
  ]),
  screenOf('/note', '업무 쪽지함', [], 'ANY', [
    ['DEPT_READ', 'READ', 'display'], ['NOTE_DELETE', 'DELETE', 'write'], ['NOTE_SEND', 'SEND', 'write'], ['USER_READ', 'READ', 'display'],
  ]),
  screenOf('/smart-toolkit/dept-job/[id]', '부서 업무 상세', [], 'ANY', [['DEPT_JOB_UPDATE', 'UPDATE', 'write']], true),
];

export const FIXTURE_ALIASES: readonly ScreenAlias[] = [
  // 정적 별칭 — 메뉴가 이 경로를 가리키면 목록 화면이 열린다(공용 판정이 한 번 따라간다).
  { route: '/admin/collaboration/address-book', target: '/admin/collaboration/address-book/select-address-book-list', kind: 'page-redirect' },
  // 동적 별칭 — 받은 값에 따라 넘기므로 공용 판정이 따라가지 않는다.
  { route: '/admin/community/boards/[id]', target: '/admin/community/boards/insert-board-article', kind: 'page-redirect' },
];

const DYNAMIC_SEGMENT = /^\[[^.[\]]+\]$/;

/** 생성물의 findScreen 과 같은 규칙(세그먼트 수가 같은 화면·별칭 중 리터럴이 가장 많이 맞는 것, 별칭이면 null)을 고정 목록에 적용한다. */
export function fixtureFindScreen(route: string): ScreenRegistryEntry | null {
  const pathOnly = route.split(/[?#]/)[0];
  if (pathOnly.trim() === '') return null;
  const segments = (pathOnly.replace(/\/+$/, '') || '/').split('/');
  let best: { literals: number; screen: ScreenRegistryEntry | null } | null = null;
  const candidates = [
    ...FIXTURE_SCREENS.map((screen) => ({ route: screen.route, screen })),
    ...FIXTURE_ALIASES.map((alias) => ({ route: alias.route, screen: null })),
  ];
  for (const candidate of candidates) {
    const parts = candidate.route.split('/');
    if (parts.length !== segments.length) continue;
    let literals = 0;
    const matches = parts.every((part, index) => {
      if (DYNAMIC_SEGMENT.test(part)) return segments[index].length > 0;
      literals += 1;
      return part === segments[index];
    });
    if (matches && (!best || literals > best.literals)) best = { literals, screen: candidate.screen };
  }
  return best?.screen ?? null;
}

/** 생성 모듈의 화면 목록·별칭·findScreen 만 고정 목록으로 바꾼다(보호 권한 등 나머지는 그대로). */
export function withFixtureScreenRegistry(actual: typeof ScreenRegistryModule): typeof ScreenRegistryModule {
  return { ...actual, SCREEN_REGISTRY: FIXTURE_SCREENS, SCREEN_ALIASES: FIXTURE_ALIASES, findScreen: fixtureFindScreen };
}
