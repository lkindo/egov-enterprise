'use client';

import type { RefObject } from 'react';
import { AlertTriangle, ChevronDown, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * 마스터 머리 도구 줄의 '변경 n건'(변경 목록 여닫기)과 '되돌리기'(직전 변경, Ctrl+Z) 단추(2026-10-18 화면 분해 때
 * MenuAdminClient 에서 옮겼다 — 마크업·문구 그대로). 찾기 칸과 그룹 미리보기는 화면이 그린다.
 *
 * <p>[2026-10-05 리뷰 반영] 도구 줄은 상태가 바뀌어도 폭이 바뀌지 않는다 — '변경 n건' 단추는 늘 그리고(변경이 없으면 '변경 0건'
 * 으로 막힌다), 저장을 막는 문제의 수는 그 단추 모서리의 배지(폭에 들지 않는다)로 보인다.
 */
export function MenuAdminToolButtons({
  changeToggleRef,
  changeCount,
  blockingCount,
  changesOpen,
  changePanelId,
  onToggleChanges,
  undoDisabled,
  onUndo,
}: {
  changeToggleRef: RefObject<HTMLButtonElement | null>;
  changeCount: number;
  /** 저장을 막는 문제(숨김 충돌·입력 오류)의 수. */
  blockingCount: number;
  changesOpen: boolean;
  changePanelId: string;
  onToggleChanges: () => void;
  /** 되돌릴 단계가 없거나 저장·다시 불러오기 중이다. */
  undoDisabled: boolean;
  onUndo: () => void;
}) {
  return (
    <>
      <Button
        ref={changeToggleRef}
        type="button"
        size="sm"
        variant="outline"
        disabled={changeCount === 0}
        aria-expanded={changesOpen}
        aria-controls={changePanelId}
        onClick={onToggleChanges}
        // 늘 그리고 폭을 미리 잡는다(두 자리 수까지) — 변경·저장을 막는 문제가 생기고 사라질 때 도구 줄의 폭이 바뀌지 않는다.
        className="relative min-w-[7rem] tabular-nums"
      >
        <ChevronDown aria-hidden="true" className={cn('transition-transform', changesOpen && 'rotate-180')} />
        변경 {changeCount.toLocaleString()}건
        {blockingCount > 0 && (
          <>
            {' '}
            {/* 저장을 막는 문제의 수는 단추 모서리에 겹쳐 그린다(absolute) — 단추 폭에 들지 않아 도구 줄이 접히지 않는다
                (2차 리뷰: 두 자리 수 배지가 단추를 153px 로 늘려 도구 줄이 제목 아래로 내려갔다). */}
            <span
              data-blocking-badge=""
              className="absolute -right-2 -top-2 inline-flex items-center gap-0.5 rounded-full border border-warning/50 bg-card px-1 text-xs font-semibold leading-4 text-warning-emphasis tabular-nums"
            >
              <AlertTriangle aria-hidden="true" className="size-3" />
              <span aria-hidden="true">{blockingCount > 99 ? '99+' : blockingCount.toLocaleString()}</span>
              <span className="sr-only">{`저장 전 해결 ${blockingCount.toLocaleString()}건`}</span>
            </span>
          </>
        )}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label="직전 변경 되돌리기"
        aria-keyshortcuts="Control+Z"
        // disabled 가 아니라 aria-disabled 다 — 마지막 단계를 이 단추로 되돌리면 단추가 막히는데, disabled 면 브라우저가
        // 포커스를 문서 밖으로 내보내 키보드 사용자가 자리를 잃는다. 막힌 동안 누르면 되돌릴 것이 없다고 말한다.
        aria-disabled={undoDisabled || undefined}
        onClick={onUndo}
        className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
      >
        <Undo2 aria-hidden="true" />되돌리기
      </Button>
    </>
  );
}
