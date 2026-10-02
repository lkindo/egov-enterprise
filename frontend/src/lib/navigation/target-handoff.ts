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
  /** 화면 경로(쿼리 없는 앱 절대 경로, 동적 세그먼트 없음 — 예: '/admin/system/programs'). */
  route: string;
  /** 화면 이름. 화면 목록에 이름이 없으면 null 이다 — 받는 화면이 이름을 묻는다. */
  label: string | null;
  /** 인계 시각(epoch ms). 받는 화면이 같은 인계를 한 번만 적용하는 키로 쓴다. */
  at: number;
}

const SCREEN_PREFIX = 'egov.screen-handoff.v1:';

/**
 * 넘길 수 있는 화면 경로인가. 메뉴에 연결할 화면만 넘긴다 — 앱 절대 경로이고, 내부 경로 해석(normalizeInternalRoute)을
 * 거쳐도 그대로이며, 쿼리·해시·동적 세그먼트('[id]')가 없어야 한다. 아니면 넘기지도 받지도 않는다.
 */
export function isHandOffScreenRoute(route: string): boolean {
  return route.startsWith('/') && !/[?#[\]]/.test(route) && normalizeInternalRoute(route) === route;
}

function parseScreen(raw: string | null): ScreenHandoff | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ScreenHandoff>;
    if (typeof value.route !== 'string' || !isHandOffScreenRoute(value.route)
      || (value.label !== null && typeof value.label !== 'string')
      || typeof value.at !== 'number') return null;
    return { route: value.route, label: value.label, at: value.at };
  } catch {
    return null;
  }
}

/**
 * 다음 화면에 화면 하나(경로·이름)를 넘긴다. 같은 슬롯의 이전 인계는 덮는다. 넘기지 못하면 false 를 돌려준다 — 넘길 수
 * 없는 경로(isHandOffScreenRoute)면 아무것도 두지 않고, 저장소를 쓸 수 없으면 이전 인계까지 지운다. 화면 인계는 받는
 * 화면의 동작(새 메뉴 위치 고르기) 자체가 목적이라, 호출부는 false 일 때 이동하지 않고 그 사실을 안내한다.
 */
export function handOffScreen(screen: { route: string; label: string | null }, slot: ScreenHandoffSlot = 'menu-add-screen'): boolean {
  if (!isHandOffScreenRoute(screen.route)) return false;
  return write(SCREEN_PREFIX + slot, { route: screen.route, label: screen.label });
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
