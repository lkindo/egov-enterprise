'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { AlertTriangle, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** 저장하지 않은 변경 한 건. 되돌리기는 그 변경만 기준선으로 돌린다. */
export interface MenuChangeEntry {
  id: string;
  text: string;
  /** 되돌리기 단추의 접근 이름(예: '결재 변경 되돌리기'). */
  revertLabel: string;
  /** 되돌릴 수 없는 이유(하위가 남은 새 메뉴 등). 있으면 단추를 막고 이유를 보인다. */
  revertBlockedReason?: string;
}

/** 해결해야 저장할 수 있는 문제 — 저장하면 메뉴가 어떤 그룹에서 숨겨지는 경우(서버가 저장을 거부한다). */
export interface MenuChangeConflict {
  id: string;
  text: string;
  actions: { label: string; onClick: () => void; disabled?: boolean }[];
  /** 해결 단추를 쓸 수 없는 이유(권한 설정 권한 없음 등). */
  note?: string;
}

/** 저장할 메뉴의 입력 오류. */
export interface MenuChangeError {
  id: string;
  text: string;
  selectLabel: string;
  onSelect: () => void;
}

/**
 * [2026-10-02 D2] 저장하지 않은 변경 목록 — 위치·속성·새 메뉴·삭제·그룹 배정. 변경은 기준선 대비 계산값이라 항목마다 따로
 * 되돌릴 수 있다. 저장을 막는 문제(숨겨지는 메뉴·입력 오류)는 목록 맨 위에 둔다. 저장 상태 문장(`noteId`)을 '변경 저장' 이
 * aria-describedby 로 가리킨다 — 목록이 닫혀 있어도 그 문장은 DOM 에 남아 설명으로 읽힌다.
 *
 * [2026-10-05] 여닫기는 도구 막대의 '변경 n건' 단추(부르는 쪽)가 맡는다 — 종전에는 첫 변경이 생기면 이 상자가 저절로 나타나
 * 보드를 밀었다. [2026-10-05 2차 리뷰] 저장을 막는 문제가 생겨도 저절로 펼치지 않는다(부르는 쪽 changesOpen).
 *
 * 되돌리기·해결 단추는 누르면 그 항목과 함께 사라진다. 포커스가 문서 밖으로 빠지지 않게, 같은 목록의 다음(없으면 앞) 항목의
 * 단추로 옮기고, 목록에 남은 것이 없으면 '변경 n건' 단추(toggleRef)로, 그것도 없으면 onFocusLost 로 부르는 쪽에 맡긴다.
 */
export function MenuChangeList({
  entries,
  conflicts,
  errors,
  open,
  panelId,
  toggleRef,
  noteId,
  note,
  disabled = false,
  onRevert,
  onRevertAll,
  onFocusLost,
}: {
  entries: readonly MenuChangeEntry[];
  conflicts: readonly MenuChangeConflict[];
  errors: readonly MenuChangeError[];
  /** 목록을 보이는가(부르는 쪽의 '변경 n건' 단추가 정한다). */
  open: boolean;
  /** '변경 n건' 단추의 aria-controls 대상. */
  panelId: string;
  /** '변경 n건' 단추 — 목록이 비면 포커스를 이리로 옮긴다. */
  toggleRef: RefObject<HTMLButtonElement | null>;
  noteId: string;
  /** 저장 상태를 말하는 한 문장(무엇이 저장을 막는가). */
  note: string;
  disabled?: boolean;
  /** 항목 하나를 되돌린다(항목 키). */
  onRevert: (id: string) => void;
  onRevertAll: () => void;
  /** 누른 단추가 사라지고 이 목록 안에 옮길 곳이 없을 때 부른다. */
  onFocusLost?: () => void;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const pendingFocusRef = useRef<{ zone: 'entry' | 'conflict'; index: number } | null>(null);
  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (pending === null) return;
    pendingFocusRef.current = null;
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return;
    const selector = pending.zone === 'entry' ? '[data-change-revert]' : '[data-conflict-first-action]';
    const candidates = [...(sectionRef.current?.querySelectorAll<HTMLButtonElement>(selector) ?? [])].filter((button) => !button.disabled);
    const target = candidates[Math.min(pending.index, candidates.length - 1)] ?? toggleRef.current;
    if (target && !target.disabled && target.isConnected) target.focus();
    else onFocusLost?.();
  });
  if (entries.length + conflicts.length + errors.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      id={panelId}
      hidden={!open}
      aria-label="저장하지 않은 변경"
      // 펼쳐도 높이 10rem(fill 조건에서는 마스터 칸의 40% 와 10rem 중 작은 값) 안에서 스스로 스크롤한다 — 변경이 많아도 보드를
      // 화면 밖으로 밀어내지 않는다(2차 리뷰). 스크롤 상자이므로 안쪽 sr-only 를 가두는 relative 를 둔다(scroll-region-containment).
      // 안의 단추로 키보드 스크롤이 된다.
      className="relative max-h-40 shrink-0 space-y-2 overflow-y-auto rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs work-fill:max-h-[min(10rem,40%)]"
    >
      <p id={noteId} className="text-foreground">{note}</p>

      {conflicts.length > 0 && (
        <div role="group" aria-label="저장 전에 해결할 문제" className="space-y-1">
          {conflicts.map((conflict, conflictIndex) => (
            <div key={conflict.id} className="space-y-1 rounded bg-card px-2 py-1">
              <p className="flex items-start gap-1 text-foreground">
                <AlertTriangle size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-warning-emphasis" />
                <span>{conflict.text}</span>
              </p>
              <div className="flex flex-wrap gap-1">
                {conflict.actions.map((action, actionIndex) => (
                  <Button
                    key={action.label}
                    type="button"
                    size="sm"
                    variant="outline"
                    data-conflict-first-action={actionIndex === 0 ? '' : undefined}
                    disabled={disabled || action.disabled}
                    onClick={() => {
                      pendingFocusRef.current = { zone: 'conflict', index: conflictIndex };
                      action.onClick();
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
              {conflict.note && <p className="text-muted-foreground">{conflict.note}</p>}
            </div>
          ))}
        </div>
      )}

      {errors.length > 0 && (
        <ul aria-label="입력 오류" className="space-y-1">
          {errors.map((error) => (
            <li key={error.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-card px-2 py-1">
              <span className="min-w-0 break-words text-destructive-emphasis">{error.text}</span>
              <Button type="button" size="sm" variant="ghost" onClick={error.onSelect}>{error.selectLabel}</Button>
            </li>
          ))}
        </ul>
      )}

      {entries.length > 0 && (
        <div className="space-y-2">
          <ul aria-label="변경 항목" className="space-y-1">
            {entries.map((entry, entryIndex) => {
              const reasonId = `${panelId}-${entry.id}`;
              return (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-card px-2 py-1">
                  <span className="min-w-0 break-words text-foreground">{entry.text}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={disabled || Boolean(entry.revertBlockedReason)}
                    aria-describedby={entry.revertBlockedReason ? reasonId : undefined}
                    aria-label={entry.revertLabel}
                    data-change-revert=""
                    onClick={() => {
                      pendingFocusRef.current = { zone: 'entry', index: entryIndex };
                      onRevert(entry.id);
                    }}
                  >
                    <Undo2 aria-hidden="true" />되돌리기
                  </Button>
                  {entry.revertBlockedReason && <p id={reasonId} className="w-full text-muted-foreground">{entry.revertBlockedReason}</p>}
                </li>
              );
            })}
          </ul>
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onRevertAll}>
            모두 되돌리기
          </Button>
        </div>
      )}
    </section>
  );
}
