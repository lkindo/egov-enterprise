'use client';

import type React from 'react';
import { AlertTriangle, Inbox, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 통계 허브에 다른 기능이 붙이는 탭 하나.
 *
 * 통계 셸은 모든 구성에 남고, 설문처럼 선택하지 않을 수 있는 기능의 탭은 그 기능이 소유한 파일이
 * 이 모양으로 넘긴다. 셸은 이 값으로 내보내기·본문·새로고침을 처리할 뿐 그 기능의 서비스를 import 하지 않는다 —
 * 그래야 기능이 빠진 구성에서 셸이 연쇄로 사라지지 않는다.
 */
export interface StatsExtraTab {
  /** 통계 새로고침이 함께 다시 부르는 조회. */
  refetch: () => Promise<unknown>;
  /** 이 탭이 열려 있을 때 내보내기가 반출하는 행. 화면에 보이는 데이터만 담는다. */
  exportRows: Record<string, unknown>[];
  exportHeaders: { label: string; key: string }[];
  /** 이 탭의 본문. 로딩·오류·빈 상태를 스스로 그린다. */
  body: React.ReactNode;
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
