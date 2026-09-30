'use client';

import { useId, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FlattenedDept } from './departments/treeUtils';

const ROOT = '';

/**
 * [2026-10-01] 부서 자리 바꾸기의 키보드 대안. 조직도는 끌어서 순서·상위를 바꾸는데, 키보드 센서는 순서만 옮기고
 * 상위(깊이)를 바꾸지 못해 키보드·보조기술 사용자는 부서를 다른 부서 아래로 옮길 수 없었다(WCAG 2.1.1).
 * 옮긴 결과는 드래그와 같이 '조직 계층 저장' 을 눌러야 반영된다 — 결과 문장이 그 사실을 말한다.
 */
export function DeptPlacementControls({
  dept,
  depts,
  disabled,
  onMoveToParent,
  onShift,
}: {
  dept: FlattenedDept;
  depts: readonly FlattenedDept[];
  disabled?: boolean;
  onMoveToParent: (ognzId: string, parentId: string | null) => boolean;
  onShift: (ognzId: string, direction: 'up' | 'down') => boolean;
}) {
  const selectId = useId();
  const [parentChoice, setParentChoice] = useState<string>(dept.parentId ?? ROOT);
  const [message, setMessage] = useState('');
  const ognzId = dept.ognzId ?? '';
  const name = dept.ognzNm || ognzId;

  // 자기 자신과 자기 하위 부서는 상위가 될 수 없다.
  const start = depts.findIndex((d) => d.ognzId === ognzId);
  const blocked = new Set<string>();
  if (start >= 0) {
    blocked.add(ognzId);
    for (let i = start + 1; i < depts.length && depts[i].depth > dept.depth; i += 1) {
      if (depts[i].ognzId) blocked.add(depts[i].ognzId as string);
    }
  }
  const nameOf = (id: string | null) => (id ? depts.find((d) => d.ognzId === id)?.ognzNm || id : '최상위');

  const move = () => {
    const parentId = parentChoice === ROOT ? null : parentChoice;
    setMessage(onMoveToParent(ognzId, parentId)
      ? `${name} 부서를 ${parentId ? `${nameOf(parentId)} 아래로` : '최상위로'} 옮겼습니다. 조직 계층 저장을 눌러야 반영됩니다.`
      : `${name} 부서는 이미 ${parentId ? `${nameOf(parentId)} 아래에` : '최상위에'} 있습니다.`);
  };
  const shift = (direction: 'up' | 'down') => {
    setMessage(onShift(ognzId, direction)
      ? `${name} 부서를 한 칸 ${direction === 'up' ? '위로' : '아래로'} 옮겼습니다. 조직 계층 저장을 눌러야 반영됩니다.`
      : `${name} 부서는 같은 상위 안에서 더 ${direction === 'up' ? '위로' : '아래로'} 옮길 수 없습니다.`);
  };

  return (
    <section aria-label="부서 자리 바꾸기" className="space-y-2 rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">끌지 않고 상위 부서와 순서를 바꿉니다.</p>
      <div className="flex flex-wrap items-end gap-2">
        <label htmlFor={selectId} className="flex flex-col gap-1 text-xs font-medium text-foreground">
          상위 부서
          <select
            id={selectId}
            value={parentChoice}
            disabled={disabled}
            onChange={(event) => setParentChoice(event.target.value)}
            className="h-[var(--control-h)] min-w-48 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value={ROOT}>최상위</option>
            {depts.filter((d) => d.ognzId && !blocked.has(d.ognzId)).map((d) => (
              <option key={d.ognzId} value={d.ognzId as string}>
                {`${'　'.repeat(d.depth)}${d.ognzNm || d.ognzId}`}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={move}>상위 부서로 옮기기</Button>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => shift('up')}>
          <ArrowUp aria-hidden="true" />한 칸 위로
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => shift('down')}>
          <ArrowDown aria-hidden="true" />한 칸 아래로
        </Button>
      </div>
      <p role="status" className="text-xs text-muted-foreground">{message}</p>
    </section>
  );
}
