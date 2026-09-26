'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMenuBookmarkToggle } from '@/hooks/api/use-menu-bookmarks';

/**
 * 사이드바 말단 메뉴의 즐겨찾기 토글(2026-09-26 DIP B5 F2).
 *
 * 즐겨찾기한 메뉴에서만 늘 보이고, 나머지는 행에 마우스를 올리거나 키보드로 초점을 옮겼을 때 보인다 — 모든 행에 별을
 * 늘어놓으면 메뉴 이름보다 별이 먼저 읽힌다. 상태는 aria-pressed 로 말한다.
 */
export function NavBookmarkToggle({ menuNo, menuNm }: { menuNo: number; menuNm: string }) {
  const { isBookmarked, togglePending, toggle } = useMenuBookmarkToggle(menuNo, menuNm);
  return (
    <button
      type="button"
      aria-label={`${menuNm} 즐겨찾기`}
      aria-pressed={isBookmarked}
      aria-busy={togglePending || undefined}
      disabled={togglePending}
      onClick={() => void toggle()}
      className={cn(
        'absolute right-2 top-1/2 flex min-h-7 min-w-7 -translate-y-1/2 items-center justify-center rounded-md transition-opacity',
        'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isBookmarked ? 'opacity-100 text-primary' : 'opacity-0 text-muted-foreground group-hover/nav:opacity-100',
      )}
    >
      <Star size={14} aria-hidden="true" className={cn(isBookmarked && 'fill-current')} />
    </button>
  );
}
