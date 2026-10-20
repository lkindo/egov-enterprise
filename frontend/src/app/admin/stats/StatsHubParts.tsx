'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { AlertTriangle, Inbox, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/*
 * 통계 셸과 기능 탭 본문이 함께 쓰는 상태 조각. 기능 탭의 모양(조회 키·로더·본문·내보내기)은 stats-panels 슬롯이 정한다
 * (src/extensions/slots.ts, 허브 분해 H4) — 이 파일은 core 이고 어떤 기능도 import 하지 않는다.
 */

/**
 * 통계 셸(IntelligenceHubClient)이 통계 개요(AdminStatsClient)에 넘기는 내비게이션. [2026-10-20] 종전에는 개요가 내비게이션 없이 그려져
 * '통계 개요' 탭에서 되돌아갈 길이 끊겼다. 개요 라우트는 서버가 그린 요약 화면을 셸에 넘기고, 셸이 그 둘레에 이 값을 둔다 — 셸이 요약
 * 화면을 import 하지 않으므로 요약 칸(overview-card)의 귀속은 개요 화면에만, 기능 탭(hub-tab)의 귀속은 셸을 그리는 화면에 남는다.
 * 셸 밖에서(시험 등) 그리면 값이 없어 내비게이션을 그리지 않는다.
 */
const StatsHubNavigationContext = createContext<ReactNode>(null);
export const StatsHubNavigationProvider = StatsHubNavigationContext.Provider;
export function useStatsHubNavigation(): ReactNode {
  return useContext(StatsHubNavigationContext);
}

/** 조회 실패를 "데이터 없음"으로 위장하지 않기 위한 명시적 에러 상태 (감사 P1-1) */
export function HubErrorState({ message, onRetry }: { message: string, onRetry: () => void }) {
  return (
    <div role="alert" className="h-[400px] flex flex-col items-center justify-center gap-5 text-center">
      <div className="w-14 h-14 rounded-lg bg-rose-500/10 flex items-center justify-center">
        <AlertTriangle size={26} className="text-rose-600" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-bold tracking-tight text-foreground">{message}</p>
        <p className="text-xs font-bold tracking-tight text-muted-foreground">잠시 후 다시 시도하거나 관리자에게 문의해 주세요.</p>
      </div>
      <Button variant="outline" onClick={onRetry} className="px-6 rounded-lg border-2 text-xs font-bold tracking-tight gap-2">
        <RefreshCcw size={16} /> 다시 시도
      </Button>
    </div>
  );
}

export function HubEmptyState({ message }: { message: string }) {
  return (
    <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-center">
      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
        <Inbox size={26} className="text-muted-foreground" />
      </div>
      <p className="text-sm font-bold tracking-tight text-muted-foreground">{message}</p>
    </div>
  );
}
