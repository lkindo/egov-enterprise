'use client';

import { useSyncExternalStore } from 'react';
import { todayStorageYmd } from '@/lib/format-date';

const noopSubscribe = () => () => {};

/**
 * 오늘 날짜('yyyyMMdd')를 useSyncExternalStore 로 안전하게 제공하는 훅.
 * SSR 시점에는 ''(빈 문자열)을 반환하고 클라이언트에서는 로컬 오늘 날짜를 반환하여
 * 하이드레이션 불일치와 useEffect 동기 setState 로 인한 cascading render 를 방지한다.
 */
export function useTodayStorageYmd(): string {
  return useSyncExternalStore(noopSubscribe, todayStorageYmd, () => '');
}
