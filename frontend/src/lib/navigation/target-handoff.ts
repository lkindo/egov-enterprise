'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { normalizeInternalRoute } from './internal-route';

/**
 * 한 사용자를 다루는 화면끼리 대상을 넘긴다(2026-10-01 UI/UX 분석 15번).
 *
 * 종전에는 사용자 상세의 '권한 설정 열기' 가 대상 없이 권한 화면을 열어, 관리자가 탭을 바꾸고 같은 사람을
 * 다시 검색해야 했다. 로그인 잠김을 보고 실패 이력을 보려 해도 로그인 로그에서 ID 를 다시 쳐야 했다.
 *
 * URL 에 싣지 않는다 — 로그인 ID·내부 식별자를 주소창과 방문 기록에 남기지 않고(PD-UX-002 경계), 새 URL
 * 생산자를 만들지 않는다. 이 탭의 sessionStorage 에 슬롯별로 한 건만 두고, 짧은 시간(1분) 안에 연 화면만
 * 받는다. 받는 화면은 사용자가 탭·대상을 직접 바꾸면 인계를 지운다. 저장소를 쓸 수 없으면 인계가 없는
 * 것으로 본다 — 그때는 종전처럼 대상 없이 열린다.
 *
 * [2026-10-02 D3] 화면 하나(경로·이름)를 넘기는 화면 인계를 따로 둔다 — 화면 관리의 '메뉴에 추가' 가 메뉴 관리에
 * 새 메뉴의 경로·이름을 넘긴다. 사용자 인계와 같은 원칙(sessionStorage·같은 유효 시간·URL 비노출)이고, 저장 키와
 * 형식 검사는 따로다. 사용자 인계 API 는 그대로다.
 *
 * [2026-10-23 ADR-0040 결정 8] 세 번째로 메뉴 하나(메뉴 번호)를 넘기는 메뉴 인계(menu-focus)를 둔다 — 게시판 운영 화면이
 * 연결된 메뉴를 고른 상태로 메뉴 관리를 연다. 같은 원칙(URL 비노출·1분·적용 뒤 삭제)이고 저장 키·형식 검사는 따로다.
 * 인계는 선택만 한다 — 메뉴 활성화·그룹 표시의 저장 권한은 그대로 서버가 집행한다(H3).
 *
 * [2026-10-26 ADR-0043] 화면 인계가 식별자 쿼리 하나~셋이 붙은 메뉴 경로(예: 게시판 이용 화면 `?bbsId=`)도 넘기고, 화면·메뉴
 * 인계가 '돌아갈 곳'(내부 경로·이름)을 함께 실을 수 있다. 쿼리 값은 식별자 문자만 받아 자유 입력(검색어·이름)은 싣지 않는다.
 * 받는 쪽(메뉴 관리)은 게시판 코드를 모른다 — 경로와 돌아갈 곳은 넘기는 화면이 만든 데이터일 뿐이다.
 */
export type HandoffSlot = 'authority-user' | 'authority-history-user' | 'login-log-user' | 'mfa-recover-user';

export interface HandoffTarget {
  /** 사용자 고유 식별자(esntlId). */
  id: string;
  /** 로그인 ID — 이력·로그 조회 조건에 쓴다. */
  loginId: string;
  /** 표시 이름. */
  name: string;
  /** 인계 시각(epoch ms). 받는 화면이 같은 인계를 한 번만 적용하는 키로 쓴다. */
  at: number;
}

const PREFIX = 'egov.target-handoff.v1:';
/** 인계를 받을 수 있는 시간. 다른 화면을 거쳐 한참 뒤에 연 화면이 옛 대상을 다시 열지 않게 한다. */
export const HANDOFF_TTL_MS = 60_000;

const listeners = new Set<() => void>();
function emit() { listeners.forEach((listener) => listener()); }
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** 유효 시간 안의 원문. 값을 비교해 바뀐 때만 다시 그리도록(useSyncExternalStore) 문자열을 그대로 돌려준다. */
function readRaw(key: string): string | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const at = (JSON.parse(raw) as { at?: unknown }).at;
    return typeof at === 'number' && Date.now() - at <= HANDOFF_TTL_MS ? raw : null;
  } catch {
    return null;
  }
}

/**
 * 인계를 둔다. 저장했으면 true. 저장소를 쓸 수 없으면(사이트 데이터 차단·할당량 초과) false 이고, 같은 슬롯에 남은 이전
 * 인계도 지운다 — 받는 화면이 직전의 다른 대상·화면을 이번 인계로 알고 열지 않게 한다. 그때 받는 화면은 대상 없이 열린다.
 */
function write(key: string, value: object): boolean {
  let stored = false;
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ ...value, at: Date.now() }));
    stored = true;
  } catch {
    try { window.sessionStorage.removeItem(key); } catch { /* 저장소가 없으면 지울 것도 없다. */ }
  }
  emit();
  return stored;
}

function remove(keys: readonly string[]) {
  for (const key of keys) {
    try { window.sessionStorage.removeItem(key); } catch { /* 저장소가 없으면 지울 것도 없다. */ }
  }
  emit();
}

function parse(raw: string | null): HandoffTarget | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<HandoffTarget>;
    if (typeof value.id !== 'string' || !value.id
      || typeof value.loginId !== 'string' || typeof value.name !== 'string'
      || typeof value.at !== 'number') return null;
    return { id: value.id, loginId: value.loginId, name: value.name, at: value.at };
  } catch {
    return null;
  }
}

/** 다음 화면에 넘길 대상을 둔다. 같은 슬롯의 이전 인계는 덮는다. */
export function handOffTarget(slot: HandoffSlot, target: Omit<HandoffTarget, 'at'>) {
  write(PREFIX + slot, target);
}

/** 받은 화면에서 사용자가 대상을 직접 바꾸면 인계를 지운다. */
export function clearTargetHandoff(...slots: HandoffSlot[]) {
  remove(slots.map((slot) => PREFIX + slot));
}

/** 이 화면으로 넘어온 대상. 서버 렌더와 하이드레이션 중에는 null 이다. */
export function useTargetHandoff(slot: HandoffSlot): HandoffTarget | null {
  const raw = useSyncExternalStore(subscribe, () => readRaw(PREFIX + slot), () => null);
  return useMemo(() => parse(raw), [raw]);
}

// ─── 화면 인계(2026-10-02) ─────────────────────────────────────────────────────────────────────────────

/** 화면 인계 슬롯. 'menu-add-screen' = 화면 관리의 '메뉴에 추가' → 메뉴 관리의 새 메뉴. */
export type ScreenHandoffSlot = 'menu-add-screen';

export interface ScreenHandoff {
  /**
   * 메뉴에 연결할 경로(앱 절대 경로, 동적 세그먼트 없음 — 예: '/admin/system/programs'). 식별자 쿼리가 붙을 수 있다
   * (isHandOffMenuRoute — 예: '/admin/community/boards/select-board-list?bbsId=BBSMSTR_000000000001').
   */
  route: string;
  /** 화면 이름. 화면 목록에 이름이 없으면 null 이다 — 받는 화면이 이름을 묻는다. */
  label: string | null;
  /** 받는 화면에서 작업을 마친 뒤 돌아갈 곳. 없으면 null 이다. */
  returnTo: HandoffReturn | null;
  /** 인계 시각(epoch ms). 받는 화면이 같은 인계를 한 번만 적용하는 키로 쓴다. */
  at: number;
}

/**
 * 받는 화면이 '돌아가기' 단추로 보일 출발 화면. 경로는 앱 내부 절대 경로(쿼리 가능)이고, label 은 단추 문구 그대로다
 * (예: '게시판 운영 화면으로 돌아가기') — 받는 화면은 조사를 붙이지 않는다.
 */
export interface HandoffReturn {
  route: string;
  label: string;
}

/** 돌아가기 단추 문구의 최대 길이 — 단추 한 줄에 들어가는 길이다. */
const MAX_RETURN_LABEL = 40;

/** 돌아갈 수 있는 경로인가 — 앱 내부 절대 경로이고 내부 경로 해석을 거쳐도 그대로이며 해시가 없다. 쿼리는 받는다. */
export function isHandOffReturnRoute(route: string): boolean {
  return typeof route === 'string' && route.startsWith('/') && !route.startsWith('//') && !route.includes('#')
    && normalizeInternalRoute(route) === route;
}

function parseReturn(value: unknown): HandoffReturn | null {
  if (!value || typeof value !== 'object') return null;
  const { route, label } = value as Partial<HandoffReturn>;
  if (typeof route !== 'string' || !isHandOffReturnRoute(route)) return null;
  if (typeof label !== 'string' || !label.trim() || label.length > MAX_RETURN_LABEL) return null;
  return { route, label };
}

function validReturn(returnTo: HandoffReturn | null | undefined): boolean {
  return returnTo == null || parseReturn(returnTo) !== null;
}

const SCREEN_PREFIX = 'egov.screen-handoff.v1:';

/**
 * 넘길 수 있는 화면 경로인가. 메뉴에 연결할 화면만 넘긴다 — 앱 절대 경로이고, 내부 경로 해석(normalizeInternalRoute)을
 * 거쳐도 그대로이며, 쿼리·해시·동적 세그먼트('[id]')가 없어야 한다. 아니면 넘기지도 받지도 않는다.
 */
export function isHandOffScreenRoute(route: string): boolean {
  return route.startsWith('/') && !/[?#[\]]/.test(route) && normalizeInternalRoute(route) === route;
}

/** 메뉴 경로에 붙일 수 있는 쿼리 — 이름은 영문 식별자, 값은 식별자 문자(영문·숫자·_·-)만, 셋까지, 이름은 겹치지 않는다. */
const ROUTE_QUERY_KEY = /^[A-Za-z][A-Za-z0-9]{0,31}$/;
const ROUTE_QUERY_VALUE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_ROUTE_QUERY_PARAMS = 3;

/**
 * 메뉴에 연결할 경로로 넘길 수 있는가(ADR-0043). 쿼리가 없으면 isHandOffScreenRoute 와 같다. 쿼리가 있으면 그 앞 경로가
 * isHandOffScreenRoute 를 지나고, 쿼리는 식별자 쌍(이름=값)만 셋까지 받는다 — 검색어·이름 같은 자유 입력은 넘기지 않는다.
 */
export function isHandOffMenuRoute(route: string): boolean {
  if (typeof route !== 'string' || route.includes('#')) return false;
  const queryStart = route.indexOf('?');
  if (queryStart === -1) return isHandOffScreenRoute(route);
  const path = route.slice(0, queryStart);
  const query = route.slice(queryStart + 1);
  if (!query || !isHandOffScreenRoute(path) || normalizeInternalRoute(route) !== route) return false;
  const pairs = query.split('&');
  if (pairs.length > MAX_ROUTE_QUERY_PARAMS) return false;
  const seen = new Set<string>();
  for (const pair of pairs) {
    const parts = pair.split('=');
    if (parts.length !== 2) return false;
    const [key, value] = parts;
    if (!ROUTE_QUERY_KEY.test(key) || !ROUTE_QUERY_VALUE.test(value) || seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

function parseScreen(raw: string | null): ScreenHandoff | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ScreenHandoff>;
    if (typeof value.route !== 'string' || !isHandOffMenuRoute(value.route)
      || (value.label !== null && typeof value.label !== 'string')
      || typeof value.at !== 'number') return null;
    return { route: value.route, label: value.label, returnTo: parseReturn(value.returnTo), at: value.at };
  } catch {
    return null;
  }
}

/**
 * 다음 화면에 화면 하나(경로·이름)를 넘긴다. 같은 슬롯의 이전 인계는 덮는다. 넘기지 못하면 false 를 돌려준다 — 넘길 수
 * 없는 경로(isHandOffMenuRoute)나 돌아갈 곳(isHandOffReturnRoute·이름 40자)이면 아무것도 두지 않고, 저장소를 쓸 수 없으면
 * 이전 인계까지 지운다. 화면 인계는 받는 화면의 동작(새 메뉴 위치 고르기) 자체가 목적이라, 호출부는 false 일 때 이동하지
 * 않고 그 사실을 안내한다.
 */
export function handOffScreen(
  screen: { route: string; label: string | null; returnTo?: HandoffReturn | null },
  slot: ScreenHandoffSlot = 'menu-add-screen',
): boolean {
  if (!isHandOffMenuRoute(screen.route) || !validReturn(screen.returnTo)) return false;
  return write(SCREEN_PREFIX + slot, { route: screen.route, label: screen.label, returnTo: screen.returnTo ?? null });
}

/** 받은 화면이 인계를 적용했으면(또는 사용자가 다른 일을 시작하면) 지운다 — 다시 열어도 같은 화면을 또 넣지 않게. */
export function clearScreenHandoff(...slots: ScreenHandoffSlot[]) {
  remove((slots.length > 0 ? slots : ['menu-add-screen' as const]).map((slot) => SCREEN_PREFIX + slot));
}

/**
 * 이 화면으로 넘어온 화면(유효 시간 1분 안). 서버 렌더와 하이드레이션 중에는 null 이다. 받는 화면은 `at` 으로 한 번만
 * 적용하고 적용한 뒤 clearScreenHandoff() 로 지운다(React 개발 모드의 이중 이펙트에서도 두 번 넣지 않게 `at` 을 기억한다).
 */
export function useScreenHandoff(slot: ScreenHandoffSlot = 'menu-add-screen'): ScreenHandoff | null {
  const raw = useSyncExternalStore(subscribe, () => readRaw(SCREEN_PREFIX + slot), () => null);
  return useMemo(() => parseScreen(raw), [raw]);
}

// ─── 메뉴 인계(2026-10-23 ADR-0040 결정 8) ────────────────────────────────────────────────────────────────

export interface MenuFocusHandoff {
  /** 고를 메뉴 번호(메뉴 구조 응답의 menuNo 와 같은 값). 양의 정수만 받는다. */
  menuSn: number;
  /** 받는 화면에서 작업을 마친 뒤 돌아갈 곳. 없으면 null 이다. */
  returnTo: HandoffReturn | null;
  /** 인계 시각(epoch ms). 받는 화면이 같은 인계를 한 번만 적용하는 키로 쓴다. */
  at: number;
}

const MENU_FOCUS_KEY = 'egov.menu-focus-handoff.v1:menu-focus';

function isMenuSn(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function parseMenuFocus(raw: string | null): MenuFocusHandoff | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<MenuFocusHandoff>;
    if (!isMenuSn(value.menuSn) || typeof value.at !== 'number') return null;
    return { menuSn: value.menuSn, returnTo: parseReturn(value.returnTo), at: value.at };
  } catch {
    return null;
  }
}

/**
 * 다음 화면(메뉴 관리)에 고를 메뉴를 넘긴다. 넘기지 못하면 false 다 — 메뉴 번호가 양의 정수가 아니면 아무것도 두지 않고,
 * 저장소를 쓸 수 없으면 이전 인계까지 지운다. 호출부는 false 일 때 이동하지 않고 그 사실을 안내한다(화면 인계와 같은 계약).
 */
export function handOffMenuFocus(focus: { menuSn: number; returnTo?: HandoffReturn | null }): boolean {
  if (!isMenuSn(focus.menuSn) || !validReturn(focus.returnTo)) return false;
  return write(MENU_FOCUS_KEY, { menuSn: focus.menuSn, returnTo: focus.returnTo ?? null });
}

/** 받은 화면이 인계를 적용했으면 지운다 — 다시 열어도 같은 메뉴를 또 고르지 않게. */
export function clearMenuFocusHandoff() {
  remove([MENU_FOCUS_KEY]);
}

/** 이 화면으로 넘어온 메뉴(유효 시간 1분 안). 서버 렌더와 하이드레이션 중에는 null 이다. */
export function useMenuFocusHandoff(): MenuFocusHandoff | null {
  const raw = useSyncExternalStore(subscribe, () => readRaw(MENU_FOCUS_KEY), () => null);
  return useMemo(() => parseMenuFocus(raw), [raw]);
}
