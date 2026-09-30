'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { recordRoute } from '@/lib/navigation/previous-route';

/** 앱 안 경로 이동을 기록한다 — 상세 화면의 '목록으로' 가 목록에서 왔는지 판정하는 근거다. 화면에 아무것도 그리지 않는다. */
export function RouteHistoryRecorder() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) recordRoute(pathname);
  }, [pathname]);
  return null;
}
