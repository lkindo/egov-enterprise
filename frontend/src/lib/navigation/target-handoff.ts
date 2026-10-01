'use client';

import { useMemo, useSyncExternalStore } from 'react';

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
 */
export type HandoffSlot = 'authority-user' | 'authority-history-user' | 'login-log-user';

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

function readRaw(slot: HandoffSlot): string | null {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + slot);
    if (!raw) return null;
    const at = (JSON.parse(raw) as { at?: unknown }).at;
    return typeof at === 'number' && Date.now() - at <= HANDOFF_TTL_MS ? raw : null;
  } catch {
    return null;
  }
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
  try {
    window.sessionStorage.setItem(PREFIX + slot, JSON.stringify({ ...target, at: Date.now() }));
  } catch {
    // 저장소를 쓸 수 없으면 대상 없이 열린다(종전 동작).
  }
  emit();
}

/** 받은 화면에서 사용자가 대상을 직접 바꾸면 인계를 지운다. */
export function clearTargetHandoff(...slots: HandoffSlot[]) {
  for (const slot of slots) {
    try { window.sessionStorage.removeItem(PREFIX + slot); } catch { /* 저장소가 없으면 지울 것도 없다. */ }
  }
  emit();
}

/** 이 화면으로 넘어온 대상. 서버 렌더와 하이드레이션 중에는 null 이다. */
export function useTargetHandoff(slot: HandoffSlot): HandoffTarget | null {
  const raw = useSyncExternalStore(subscribe, () => readRaw(slot), () => null);
  return useMemo(() => parse(raw), [raw]);
}
