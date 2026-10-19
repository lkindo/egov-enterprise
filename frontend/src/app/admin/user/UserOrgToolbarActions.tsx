'use client';

import { useQueryClient } from '@tanstack/react-query';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * 사용자·조직 허브 결과 툴바의 보조 동작 — 보고 있는 구간과 새로고침(2026-10-18 허브 분해 때 UserOrgHubClient 에서 옮겼다 —
 * 마크업·문구 그대로).
 */
export function UserOrgToolbarActions({ rowRange, refreshing }: {
  /** 현재 페이지가 보여주는 구간. 총 건수가 0 이거나 모르면 null 이다. */
  rowRange: { from: number; to: number } | null;
  refreshing: boolean;
}) {
  const queryClient = useQueryClient();
  return (
    <>
    {/* 표 하단의 'N–M번째' 는 StandardDataTable 이 pagination.totalCount 를 받을 때만 그리는데,
        총 건수는 셸 툴바가 단독 소유해야 해서(이중 표기 금지) 표에 넘기지 않는다. 그 결과 사라지는
        "지금 몇 번째를 보고 있는가" 를 여기서 직접 말한다. */}
    {rowRange && (
      <span className="text-[length:var(--font-size-body)] text-muted-foreground tabular-nums">
        {rowRange.from.toLocaleString()}–{rowRange.to.toLocaleString()}번째
      </span>
    )}
    <Button
      type="button"
      variant="outline"
      size="sm"
      // 무인자 invalidateQueries() 는 메뉴·알림 등 이 화면과 무관한 캐시까지
      // 전부 재요청시킨다 — 이 화면이 쓰는 두 키로 좁힌다(감사 P2).
      onClick={() => {
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        queryClient.invalidateQueries({ queryKey: ['admin-depts'] });
      }}
      className="gap-1.5"
    >
      <RefreshCcw size={14} aria-hidden="true" className={cn(refreshing && 'animate-spin')} />
      새로고침
    </Button>
    </>
  );
}
