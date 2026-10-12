'use client';

import { AlertTriangle, Inbox, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/*
 * 통계 셸과 기능 탭 본문이 함께 쓰는 상태 조각. 기능 탭의 모양(조회 키·로더·본문·내보내기)은 stats-panels 슬롯이 정한다
 * (src/extensions/slots.ts, 허브 분해 H4) — 이 파일은 core 이고 어떤 기능도 import 하지 않는다.
 */

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
