'use client';

import { useTodayStorageYmd } from '@/lib/hooks/use-today-ymd';

/** 게시 종료일(yyyyMMdd 또는 yyyy-MM-dd)이 오늘보다 앞이면 게시가 끝난 글이다. 판정할 수 없으면 끝나지 않은 것으로 본다. */
export function isPostingEnded(pstEndYmd: string | null | undefined, todayYmd: string): boolean {
  const end = (pstEndYmd ?? '').replace(/-/g, '');
  return /^\d{8}$/.test(end) && /^\d{8}$/.test(todayYmd) && end < todayYmd;
}

/**
 * '게시 종료' 표시(2026-10-01 결정 23).
 *
 * 종료일이 지난 글은 서버가 일반 사용자에게 내려주지 않는다. 그래서 이 표시를 보는 사람은 작성자이거나 전체 열람
 * 권한자뿐이며, 다른 사람에게는 이미 보이지 않는다는 사실을 알린다. 서버 렌더 중에는 오늘을 모르므로 그리지 않는다.
 */
export function PostingEndedBadge({ pstEndYmd }: { pstEndYmd?: string | null }) {
  const today = useTodayStorageYmd();
  if (!isPostingEnded(pstEndYmd, today)) return null;
  return (
    <span
      className="ml-1.5 inline-flex shrink-0 items-center rounded bg-muted px-1.5 py-0.5 align-middle text-xs font-semibold text-muted-foreground"
      title="게시 종료일이 지나 다른 사용자에게는 보이지 않습니다."
    >
      게시 종료
    </span>
  );
}
