'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import {
  EMPTY_PERIOD,
  activePresetOf,
  presetToPeriod,
  type PeriodPreset,
  type PeriodValue,
} from '@/app/components/patterns/period-filter';
import { useTodayStorageYmd } from '@/lib/hooks/use-today-ymd';

/**
 * 화면별 최근 조회 조건 기억(2026-09-26 DIP B5 F3) — 기간 프리셋과 페이지당 건수만.
 *
 * - 이 브라우저에만 남는 편의 기록이다. 서버에도 URL 에도 싣지 않는다(로그 화면은 기간을 URL 에 싣지 않는 계약이다).
 * - 기간은 날짜가 아니라 **프리셋 이름**만 남긴다 — 날짜를 남기면 다음 날 '최근 1주' 가 어제 기준으로 굳는다.
 *   직접 입력한 기간과 '전체' 는 남기지 않는다.
 * - 서버 렌더와 하이드레이션은 기본값이다(저장소는 useSyncExternalStore 의 서버 스냅샷이 null). 이 화면에서
 *   사용자가 고른 값은 로컬 상태가 우선하므로 저장소를 쓸 수 없어도 조회는 그대로 한다.
 * - 값이 어휘 밖이거나 손상됐으면 기본값으로 둔다.
 */
const KEY_PREFIX = 'egov.list-conditions.v1:';
const REMEMBERED_PRESETS: readonly PeriodPreset[] = ['1d', '1w', '1m'];
const listeners = new Set<() => void>();

interface StoredConditions {
  pageSize?: number;
  periodPreset?: PeriodPreset;
}

function readRaw(screenKey: string): string | null {
  try {
    return window.localStorage.getItem(KEY_PREFIX + screenKey);
  } catch {
    return null;
  }
}

function parse(raw: string | null): StoredConditions {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as StoredConditions) : {};
  } catch {
    return {};
  }
}

function write(screenKey: string, patch: StoredConditions): void {
  const next = { ...parse(readRaw(screenKey)), ...patch };
  try {
    if (next.pageSize === undefined && next.periodPreset === undefined) {
      window.localStorage.removeItem(KEY_PREFIX + screenKey);
    } else {
      window.localStorage.setItem(KEY_PREFIX + screenKey, JSON.stringify(next));
    }
  } catch {
    // 기억하지 못해도 조회는 그대로 한다.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function dateOfYmd(ymd: string): Date {
  return new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)));
}

export interface RememberedListConditionsOptions {
  defaultPageSize: number;
  pageSizeOptions: readonly number[];
}

export function useRememberedListConditions(screenKey: string, options: RememberedListConditionsOptions) {
  const { defaultPageSize, pageSizeOptions } = options;
  const raw = useSyncExternalStore(subscribe, () => readRaw(screenKey), () => null);
  const today = useTodayStorageYmd();
  const [chosenPageSize, setChosenPageSize] = useState<number | null>(null);
  const [chosenPeriod, setChosenPeriod] = useState<PeriodValue | null>(null);

  const stored = useMemo(() => parse(raw), [raw]);
  const rememberedPageSize = typeof stored.pageSize === 'number' && pageSizeOptions.includes(stored.pageSize)
    ? stored.pageSize : defaultPageSize;
  const rememberedPeriod = useMemo(() => (
    stored.periodPreset && REMEMBERED_PRESETS.includes(stored.periodPreset) && today
      ? presetToPeriod(stored.periodPreset, dateOfYmd(today))
      : EMPTY_PERIOD
  ), [stored.periodPreset, today]);

  const setPageSize = useCallback((size: number) => {
    setChosenPageSize(size);
    write(screenKey, { pageSize: size === defaultPageSize ? undefined : size });
  }, [screenKey, defaultPageSize]);

  const setPeriod = useCallback((next: PeriodValue) => {
    setChosenPeriod(next);
    const preset = activePresetOf(next, new Date());
    write(screenKey, { periodPreset: preset && REMEMBERED_PRESETS.includes(preset) ? preset : undefined });
  }, [screenKey]);

  return {
    pageSize: chosenPageSize ?? rememberedPageSize,
    setPageSize,
    period: chosenPeriod ?? rememberedPeriod,
    setPeriod,
  };
}
