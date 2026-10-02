import { summarizeError } from '@/lib/safe-error-log';
import type { MenuStructureItem } from '@/services/foundation/system/MenuAdminService';

/**
 * 화면 관리가 읽는 메뉴 구조의 출처 상태(순수 계산, 2026-10-02 D3).
 *
 * 화면 목록의 '연결 메뉴'(메뉴 경로가 여는 화면)와 이전 프로그램의 '연결 메뉴'(메뉴의 연결 프로그램)는 같은 조회 한 번
 * (`getMenuStructure`, MENU_READ)을 읽는다. 이 조회는 서버의 메뉴 목록 캐시를 거치지 않고 DB 를 직접 읽는다 —
 * 프로그램 삭제 거부(409, `tb_menu_info.prgrm_file_nm` 참조)와 같은 표를 같은 시점에 본다. 다만 화면을 연 뒤에 다른 곳에서
 * 바뀐 연결은 다시 불러와야 보이므로 화면은 이 값을 참고 정보로 말하고, 삭제의 최종 판정은 서버가 한다.
 *
 * 이 화면은 PROGRAM_READ 만으로 들어올 수 있다. MENU_READ 가 없으면 조회를 보내지 않는다(서버에 403 거부 기록을 남기지
 * 않는다). 조회가 거부·실패하면 0건으로 위장하지 않고 상태를 그대로 넘긴다.
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
}

/**
 * 조회 상태를 출처 상태로 바꾼다. 권한이 없으면 조회 결과를 보지 않고 '권한 없음' 이다 — 권한을 확인하는 중에는 아직
 * 모른다고 말한다(권한 없음으로 단정하지 않는다). 응답에 메뉴 배열이 없으면 빈 구조로 위장하지 않고 실패로 둔다.
 */
export function menuStructureSource(state: MenuStructureQueryState): MenuStructureSource {
  if (!state.canReadMenus) return state.authorizationPending ? { status: 'checking' } : { status: 'forbidden' };
  if (state.status === 'pending') return { status: 'checking' };
  if (state.status === 'error') return menuStructureFailure(state.error);
  const menus = state.data?.menus;
  return Array.isArray(menus) ? { status: 'loaded', menus } : { status: 'failed' };
}
