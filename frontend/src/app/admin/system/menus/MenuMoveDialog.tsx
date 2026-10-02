'use client';

import { useId, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FlattenedItem } from './treeUtils';
import { menuLabel, type MenuParentKey } from './menuDraft';
import { moveDestinations } from './menuBoardModel';

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then((mod) => mod.StandardModal), { ssr: false });

export type MenuMoveDialogMode =
  | { kind: 'move'; menuNo: number }
  /** 화면 관리의 '메뉴에 추가' 로 넘어온 화면 — 고른 자리에 그 경로·이름의 새 메뉴를 만든다. */
  | { kind: 'create'; route: string; label: string | null };

export type MenuMovePosition = 'first' | 'last';

/**
 * [2026-10-02 D1] 끌지 않고 메뉴를 옮기는 대화상자('다른 곳으로 옮기기…')이자, 화면 관리에서 넘어온 화면의 '새 메뉴 위치 고르기'.
 *
 * 목적지는 최상위·영역마다·2단계 메뉴마다다. 고를 수 없는 자리(자기·자기 하위, 3단계를 넘는 자리, 삭제 예정 메뉴 아래)는
 * 이유와 함께 막는다. 선택은 입력 칸이 아니라 누름 단추다 — 고르기만 하고 닫아도 '저장하지 않은 입력' 확인이 뜨지 않는다.
 * 확정해도 저장하지 않는다 — 초안에만 반영되고 '변경 저장' 으로 저장된다.
 */
export function MenuMoveDialog({ mode, items, deleted, onClose, onConfirm }: {
  mode: MenuMoveDialogMode;
  items: readonly FlattenedItem[];
  deleted: ReadonlySet<number>;
  onClose: () => void;
  onConfirm: (parent: MenuParentKey, position: MenuMovePosition) => void;
}) {
  const baseId = useId();
  const menuNo = mode.kind === 'move' ? mode.menuNo : null;
  const destinations = moveDestinations(items, deleted, menuNo);
  const [choice, setChoice] = useState<{ parent: MenuParentKey } | null>(null);
  const [position, setPosition] = useState<MenuMovePosition>('last');
  const chosen = choice === null ? null : destinations.find((destination) => destination.parent === choice.parent) ?? null;
  const ready = chosen !== null && chosen.problem === null;
  const name = menuNo === null ? null : menuLabel(items, menuNo);

  return (
    <StandardModal
      isOpen
      onClose={onClose}
      title={mode.kind === 'move' ? '다른 곳으로 옮기기' : '새 메뉴 위치 고르기'}
      maxWidth="xl"
      footer={(
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {mode.kind === 'move' ? '옮기기 취소' : '새 메뉴 만들기 취소'}
          </Button>
          <Button type="button" disabled={!ready} onClick={() => chosen && onConfirm(chosen.parent, position)}>
            {mode.kind === 'move' ? '선택한 위치로 메뉴 옮기기' : '선택한 위치에 새 메뉴 만들기'}
          </Button>
        </>
      )}
    >
      <div className="space-y-4 text-sm">
        <p className="text-foreground">
          {mode.kind === 'move'
            ? `${name} 메뉴(하위 메뉴 포함)를 옮길 곳을 고르세요. 확정해도 저장되지 않으며 '변경 저장' 을 눌러야 반영됩니다.`
            : `${mode.label ?? '이름 미확인'} 화면(${mode.route})을 연결한 새 메뉴를 만들 곳을 고르세요. 이름은 만든 뒤 고칠 수 있습니다.`}
        </p>
        <div>
          <p id={`${baseId}-destinations`} className="mb-2 font-medium text-foreground">놓을 곳</p>
          <ul aria-labelledby={`${baseId}-destinations`} className="max-h-[50vh] space-y-1 overflow-auto">
            {destinations.map((destination) => {
              const key = destination.parent === null ? 'root' : String(destination.parent);
              const reasonId = `${baseId}-reason-${key}`;
              const pressed = choice !== null && choice.parent === destination.parent;
              return (
                <li key={key} className={cn(destination.level === 1 && 'pl-4', destination.level === 2 && 'pl-8')}>
                  <button
                    type="button"
                    aria-pressed={pressed}
                    disabled={destination.problem !== null}
                    aria-describedby={destination.problem ? reasonId : undefined}
                    onClick={() => setChoice({ parent: destination.parent })}
                    className={cn(
                      'flex w-full flex-wrap items-center gap-x-2 rounded-md border px-2 py-1 text-left',
                      pressed ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted',
                      destination.problem !== null && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <span className="font-medium text-foreground">{destination.label}</span>
                    {destination.current && <>{' '}<span className="text-xs text-muted-foreground">· 지금 위치</span></>}
                  </button>
                  {destination.problem && <p id={reasonId} className="px-2 text-xs text-muted-foreground">{destination.problem}</p>}
                </li>
              );
            })}
          </ul>
        </div>
        <div role="group" aria-label="놓을 순서" className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">놓을 순서</span>
          <Button type="button" size="sm" variant={position === 'first' ? 'default' : 'outline'} aria-pressed={position === 'first'}
            onClick={() => setPosition('first')}>
            맨 앞에 두기
          </Button>
          <Button type="button" size="sm" variant={position === 'last' ? 'default' : 'outline'} aria-pressed={position === 'last'}
            onClick={() => setPosition('last')}>
            맨 뒤에 두기
          </Button>
        </div>
      </div>
    </StandardModal>
  );
}
