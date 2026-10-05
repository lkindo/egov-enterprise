import { summarizeError } from '@/lib/safe-error-log';
import type { MenuStructureItem } from '@/services/foundation/system/MenuAdminService';

/**
 * 화면 관리가 읽는 메뉴 구조의 출처 상태(순수 계산, 2026-10-02 D3).
 *
 * 화면 목록의 '연결 메뉴'(메뉴 경로가 여는 화면)는 메뉴 구조 조회 한 번(`getMenuStructure`, MENU_READ)을 읽는다.
 * 이 조회는 서버의 메뉴 목록 캐시를 거치지 않고 DB 를 직접 읽는다. 화면을 연 뒤에 다른 곳에서 바뀐 연결은 다시 불러와야
 * 보이므로 화면은 이 값을 참고 정보로 말한다. (2026-10-04 프로그램 목록 퇴역 전에는 이전 프로그램의 연결 메뉴도 같은 조회를 읽었다.)
 *
 * MENU_READ 가 없으면 조회를 보내지 않는다(서버에 403 거부 기록을 남기지 않는다). 2026-10-04 부터 이 화면의 진입 권한이
 * MENU_READ 라 들어온 사람은 늘 조회하지만, 진입 권한이 다시 바뀌어도 거부 기록이 생기지 않도록 판정을 남긴다. 조회가 거부·실패하면 0건으로 위장하지 않고 상태를 그대로 넘긴다.
 *
 * - checking: 권한을 확인하거나 메뉴를 불러오는 중이다
 * - loaded: 메뉴 구조 전체(사용 안 함 메뉴 포함)
 * - forbidden: 메뉴 조회 권한(MENU_READ)이 없다 — 조회를 보내지 않았거나 서버가 403 으로 거부했다
 * - failed: 그 밖의 이유로 메뉴를 불러오지 못했다
 */
export type MenuStructureSource =
  | { status: 'checking' }
  | { status: 'loaded'; menus: readonly MenuStructureItem[] }
  | { status: 'forbidden' }
  | { status: 'failed' };

/** 메뉴 조회 실패를 출처 상태로 바꾼다. 403 만 '권한 없음' 이고 나머지는 '불러오지 못함' 이다. */
export function menuStructureFailure(error: unknown): MenuStructureSource {
  return summarizeError(error).status === 403 ? { status: 'forbidden' } : { status: 'failed' };
}

/** 화면의 메뉴 조회 상태(권한 판정 + 조회 결과). */
export interface MenuStructureQueryState {
  /** MENU_READ 가 있어 메뉴 조회를 보냈는가. 없으면 조회하지 않는다. */
  canReadMenus: boolean;
  /** 로그인 정보(권한)를 아직 확인하는 중인가 */
  authorizationPending: boolean;
  status: 'pending' | 'error' | 'success';
  data?: { menus?: readonly MenuStructureItem[] | null } | null;
  error?: unknown;
  /**
   * 화면을 연 뒤 첫 조회가 아직 끝나지 않았는가(캐시에 지난 방문의 결과가 있어도). [2026-10-05] 화면은 열 때마다 메뉴
   * 구조를 다시 읽는데, 그동안 지난 결과를 쓰면 메뉴 관리에서 방금 메뉴에 넣은 화면이 '메뉴 없음'·'메뉴에 추가' 를 단 채
   * 보이고 처음 보기도 그 낡은 값으로 정해진다. 이 동안은 불러오는 중으로 둔다.
   */
  awaitingFreshResult?: boolean;
  /**
   * 실패를 본 사용자가 '연결 메뉴 다시 불러오기' 를 눌러 다시 불러오는 중인가. [2026-10-05 반박 리뷰] 받은 데이터가 없을 때
   * 다시 조회하면 TanStack Query 가 상태를 'pending' 으로 되돌리고 오류도 지운다(query-core fetchState). 그대로 두면 출처가
   * '불러오는 중' 이 되어 실패 안내와 그 단추가 눌린 순간 사라지고 포커스가 문서 맨 앞으로 간다(WCAG 2.4.3). 이 동안은
   * 실패를 그대로 둔다 — 다시 불러오기는 실패('failed')에서만 보이므로 분류도 그대로다.
   */
  retryingAfterFailure?: boolean;
}

/**
 * 조회 상태를 출처 상태로 바꾼다. 권한이 없으면 조회 결과를 보지 않고 '권한 없음' 이다 — 권한을 확인하는 중에는 아직
 * 모른다고 말한다(권한 없음으로 단정하지 않는다). 응답에 메뉴 배열이 없으면 빈 구조로 위장하지 않고 실패로 둔다.
 */
export function menuStructureSource(state: MenuStructureQueryState): MenuStructureSource {
  if (!state.canReadMenus) return state.authorizationPending ? { status: 'checking' } : { status: 'forbidden' };
  if (state.status === 'pending' && state.retryingAfterFailure) return { status: 'failed' };
  if (state.status === 'pending' || state.awaitingFreshResult) return { status: 'checking' };
  if (state.status === 'error') return menuStructureFailure(state.error);
  const menus = state.data?.menus;
  return Array.isArray(menus) ? { status: 'loaded', menus } : { status: 'failed' };
}
