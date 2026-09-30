'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';

/**
 * [2026-10-01] 목록 화면의 조회 조건(검색어·페이지·조회 범위 등)을 이 탭이 살아 있는 동안 기억한다.
 *
 * 부서 업무·주소록 같은 목록은 조건을 컴포넌트 상태에만 두어, 상세에 다녀오면 1페이지·빈 검색어로 돌아갔다.
 * 상세의 '목록으로' 가 뒤로 가기로 목록에 돌아와도(useReturnToList) 목록 컴포넌트는 새로 마운트되므로 상태는 사라진다.
 *
 * - sessionStorage 에 화면 키로 둔다 — 이 탭에만 남고 URL·서버로는 나가지 않는다(PD-UX-002 경계 밖에 새 URL 을
 *   만들지 않는다). 새 탭·새 창은 기본값에서 시작한다.
 * - 서버 렌더와 하이드레이션은 기본값이다(서버 스냅샷 null). 하이드레이션 뒤 저장값으로 다시 그린다.
 * - 저장값은 기본값과 같은 키·같은 원시 타입만 받는다. 손상됐거나 저장소를 쓸 수 없으면 기본값이다.
 */
const KEY_PREFIX = 'egov.list-session.v1:';
const listeners = new Set<() => void>();

type Primitive = string | number;

function readRaw(screenKey: string): string | null {
  try {
    return window.sessionStorage.getItem(KEY_PREFIX + screenKey);
  } catch {
    return null;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function sanitize<T extends Record<string, Primitive>>(raw: string | null, defaults: T): Partial<T> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Partial<T> = {};
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const value = (parsed as Record<string, unknown>)[key as string];
      if (typeof value === typeof defaults[key]) out[key] = value as T[keyof T];
    }
    return out;
  } catch {
    return {};
  }
}

export function useSessionListState<T extends Record<string, Primitive>>(
  screenKey: string,
  defaults: T,
): [T, (patch: Partial<T>) => void] {
  const raw = useSyncExternalStore(subscribe, () => readRaw(screenKey), () => null);
  const [chosen, setChosen] = useState<Partial<T> | null>(null);
  const defaultsKey = JSON.stringify(defaults);
  const stored = useMemo(() => sanitize(raw, JSON.parse(defaultsKey) as T), [raw, defaultsKey]);
  const value = useMemo(
    () => ({ ...(JSON.parse(defaultsKey) as T), ...stored, ...(chosen ?? {}) }),
    [defaultsKey, stored, chosen],
  );

  const update = useCallback((patch: Partial<T>) => {
    try {
      const base = sanitize(readRaw(screenKey), JSON.parse(defaultsKey) as T);
      window.sessionStorage.setItem(KEY_PREFIX + screenKey, JSON.stringify({ ...base, ...patch }));
    } catch {
      // 기억하지 못해도 조회는 그대로 한다 — 이 화면 안의 상태는 아래가 소유한다.
    }
    setChosen((current) => ({ ...(current ?? {}), ...patch }));
  }, [screenKey, defaultsKey]);

  return [value, update];
}
