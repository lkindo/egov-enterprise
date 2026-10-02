'use client';

import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  PERMISSION_MATRIX_COLUMNS,
  PERMISSION_MATRIX_OTHER_COLUMN_LABEL,
  permissionActionLabel,
} from '@/lib/auth/permission-labels';
import {
  buildOperationMatrix,
  changedOperationKeys,
  isProtectedPermission,
  isSaveShortcut,
  matrixRowMatches,
  nextCellPosition,
  operationKey,
  planBulkToggle,
  type CellPosition,
  type MatrixOperation,
  type MatrixRow,
} from './operation-permission-matrix-model';
import { PermissionScrollRegion } from './PermissionScrollRegion';

export interface OperationPermissionMatrixProps {
  operations: readonly MatrixOperation[];
  /** 지금 초안의 선택(`OPERATION:<code>` 등). */
  selection: ReadonlySet<string>;
  /** 마지막으로 불러온 서버 상태. 다른 칸이 '저장하지 않은 변경'이다. */
  baseline: ReadonlySet<string>;
  /** 권한 설정 권한이 있는가. 없으면 일괄 선택 버튼을 그리지 않는다(누를 수 없는 버튼을 두지 않는다). */
  editable: boolean;
  /** 일시 잠금(저장 중·최신 정보 아님·기본 정보 편집 중). */
  disabled: boolean;
  /** 꺼진 칸을 켤 수 있는가. 공개 메뉴 그룹은 기능권한을 더할 수 없다. */
  allowAdd: boolean;
  onChange: (keys: readonly string[], checked: boolean) => void;
  /** Ctrl/Cmd+S — 표 안에 포커스가 있고 저장할 변경이 있을 때만 부른다. */
  onSaveShortcut?: () => void;
  saveShortcutDisabled?: boolean;
  /** 같은 저장 단위의 전체 변경 수(메뉴 표시 포함). 생략하면 이 표의 변경 칸 수다. */
  unsavedChangeCount?: number;
}

interface CellDescriptor {
  operation: MatrixOperation;
  actionLabel: string;
  position: CellPosition;
}

/**
 * '기능별 권한' — 업무 영역(행) × 행위(열) 표. 카탈로그 §5 A5(교차 상태 편집)의 소비자다.
 *
 * 칸·머리글 패딩은 표 셀 밀도 토큰(--cell-px/--cell-py, 카탈로그 §4)을 쓴다 — compact 배포에서 다른 표와 같은 축으로 조밀해진다.
 *
 * 행·열 머리글은 스크롤해도 남고, 바뀐 칸은 표시와 설명을 함께 단다. 칸은 즉시 저장하지 않는다 — 초안을 바꿀 뿐이고
 * 저장은 편집기의 '권한 변경 저장' 하나다(감사 이력 없는 즉시 반영 금지).
 */
export function OperationPermissionMatrix({
  operations, selection, baseline, editable, disabled, allowAdd, onChange,
  onSaveShortcut, saveShortcutDisabled = false, unsavedChangeCount,
}: OperationPermissionMatrixProps) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const tableRef = useRef<HTMLTableElement>(null);
  const descriptionId = useId();
  const changedDescriptionId = `${descriptionId}-changed`;
  const protectedDescriptionId = `${descriptionId}-protected`;

  const categories = useMemo(() => buildOperationMatrix(operations), [operations]);
  const totalRows = categories.reduce((sum, category) => sum + category.rows.length, 0);
  const visibleCategories = categories
    .filter((category) => !categoryFilter || category.key === categoryFilter)
    .map((category) => ({ ...category, rows: category.rows.filter((row) => matrixRowMatches(row, query)) }))
    .filter((category) => category.rows.length > 0);
  const visibleRows = visibleCategories.flatMap((category) => category.rows);
  const changedCount = changedOperationKeys(operations, selection, baseline).length;
  const pendingChanges = unsavedChangeCount ?? changedCount;

  const rowIndex = new Map<string, number>(visibleRows.map((row, index) => [row.domain, index]));
  const cellsOf = (row: MatrixRow): CellDescriptor[] => {
    const position = rowIndex.get(row.domain) ?? -1;
    const fixed = row.columns.flatMap((operation, col) => operation
      ? [{ operation, actionLabel: PERMISSION_MATRIX_COLUMNS[col].label, position: { row: position, col } }] : []);
    const others = row.others.map((operation, index) => ({
      operation, actionLabel: permissionActionLabel(operation.action), position: { row: position, col: PERMISSION_MATRIX_COLUMNS.length + index },
    }));
    return [...fixed, ...others];
  };

  const bulk = (scope: readonly MatrixOperation[], label: string) => {
    if (!editable) return null;
    const plan = planBulkToggle(scope, selection, allowAdd);
    const verb = plan.mode === 'clear' ? '해제' : '선택';
    return (
      <Button type="button" variant="ghost" size="sm" className="px-2 text-xs font-normal"
        aria-label={`${label} 전체 ${verb}`} disabled={disabled || plan.mode === null}
        onClick={() => { if (plan.mode) onChange(plan.keys, plan.mode === 'select'); }}>
        전체 {verb}
      </Button>
    );
  };

  const handleTableKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-a5-cell]') : null;
    if (!target || !tableRef.current) return;
    const current = { row: Number(target.dataset.rowIndex), col: Number(target.dataset.colIndex) };
    if (Number.isNaN(current.row) || Number.isNaN(current.col)) return;
    const cells = [...tableRef.current.querySelectorAll<HTMLElement>('[data-a5-cell]:not(:disabled)')];
    const next = nextCellPosition(cells.map((cell) => ({ row: Number(cell.dataset.rowIndex), col: Number(cell.dataset.colIndex) })), current, event.key);
    const element = next && cells.find((cell) => Number(cell.dataset.rowIndex) === next.row && Number(cell.dataset.colIndex) === next.col);
    if (!element) return;
    event.preventDefault();
    element.focus();
  };

  const handleSaveKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isSaveShortcut(event) || !onSaveShortcut || saveShortcutDisabled || pendingChanges === 0) return;
    event.preventDefault();
    onSaveShortcut();
  };

  const renderCell = ({ operation, actionLabel, position }: CellDescriptor, row: MatrixRow, labelled: boolean) => {
    const key = operationKey(operation.code);
    const checked = selection.has(key);
    const changed = checked !== baseline.has(key);
    const protectedPermission = isProtectedPermission(operation.code);
    const describedBy = [changed ? changedDescriptionId : null, protectedPermission ? protectedDescriptionId : null].filter(Boolean).join(' ') || undefined;
    const checkbox = (
      <Checkbox
        data-a5-cell=""
        data-row-index={position.row}
        data-col-index={position.col}
        data-changed={changed ? 'true' : undefined}
        aria-label={`${row.label} × ${actionLabel} (${operation.code})`}
        aria-describedby={describedBy}
        title={operation.name}
        checked={checked}
        disabled={disabled || !editable || (!allowAdd && !checked)}
        onCheckedChange={(next) => onChange([key], next === true)}
        className="data-[changed=true]:ring-2 data-[changed=true]:ring-primary data-[changed=true]:ring-offset-1"
      />
    );
    const marker = protectedPermission
      ? <span aria-hidden="true" className="rounded border border-warning/40 bg-warning/10 px-1 text-xs text-foreground">보호</span> : null;
    if (!labelled) return <span className="inline-flex items-center gap-1">{checkbox}{marker}</span>;
    return (
      <span key={operation.code} className={cn('inline-flex items-center gap-1 rounded px-1', changed && 'bg-primary/10')}>
        {checkbox}<span className="text-xs">{actionLabel}</span>{marker}
      </span>
    );
  };

  return (
    <div role="group" aria-label="기능별 권한 선택" className="space-y-3" onKeyDown={handleSaveKey}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block space-y-1 text-sm">기능 검색
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="업무 영역·코드·권한 이름" />
        </label>
        <label className="block space-y-1 text-sm">업무 분류
          <select className="block h-[var(--control-h)] rounded-md border border-input bg-background px-3" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="">전체 분류</option>
            {categories.map((category) => <option key={category.key} value={category.key}>{category.label}</option>)}
          </select>
        </label>
      </div>
      <p className="text-sm text-muted-foreground">표시 {visibleRows.length} / 전체 {totalRows}개 영역 · 검색 결과 밖의 선택도 유지됩니다.</p>
      <p className="text-sm" aria-live="polite">{changedCount > 0 ? `이 표에서 바꾼 칸 ${changedCount}개 — '권한 변경 저장'을 눌러야 반영됩니다.` : ''}</p>
      <p id={protectedDescriptionId} className="text-xs text-muted-foreground">보호 표시가 붙은 권한은 권한 설정과 사용자 배정 권한을 모두 가진 관리자만 저장할 수 있어, 줄·열·분류 일괄 선택에서 빠집니다.</p>
      <span id={changedDescriptionId} className="sr-only">저장하지 않은 변경</span>
      {visibleRows.length === 0 ? <p role="status" className="text-sm">조건에 맞는 업무 영역이 없습니다.</p> : (
        <PermissionScrollRegion label="기능별 권한 표 스크롤 영역">
          <table ref={tableRef} className="w-full border-separate border-spacing-0 text-left text-sm" onKeyDown={handleTableKeyDown}>
            <caption className="sr-only">업무 영역별 기능권한 선택. 칸에서 방향키로 이동하고 Space로 바꿉니다. 바꾼 칸은 저장해야 반영됩니다.</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 top-0 z-30 min-w-[12rem] border-b border-border bg-muted px-[var(--cell-px)] py-[var(--cell-py)]">업무 영역</th>
                {PERMISSION_MATRIX_COLUMNS.map((column, col) => (
                  <th key={column.action} scope="col" aria-label={column.label} className="sticky top-0 z-20 border-b border-border bg-muted px-[var(--cell-px)] py-[var(--cell-py)] text-center align-top">
                    <span className="block whitespace-nowrap text-xs font-semibold">{column.label}</span>
                    {bulk(visibleRows.flatMap((row) => row.columns[col] ? [row.columns[col]!] : []), column.label)}
                  </th>
                ))}
                <th scope="col" className="sticky top-0 z-20 border-b border-border bg-muted px-[var(--cell-px)] py-[var(--cell-py)] text-xs font-semibold">{PERMISSION_MATRIX_OTHER_COLUMN_LABEL}</th>
              </tr>
            </thead>
            {visibleCategories.map((category) => (
              <tbody key={category.key}>
                <tr>
                  <th scope="rowgroup" aria-label={category.label} colSpan={PERMISSION_MATRIX_COLUMNS.length + 2} className="border-b border-border bg-muted/50 p-0 text-left">
                    <div className="sticky left-0 inline-flex items-center gap-2 px-[var(--cell-px)] py-[var(--cell-py)]">
                      <span className="font-semibold">{category.label}</span>
                      {bulk(category.rows.flatMap((row) => row.operations), category.label)}
                    </div>
                  </th>
                </tr>
                {category.rows.map((row) => {
                  const cells = cellsOf(row);
                  return (
                    <tr key={row.domain}>
                      <th scope="row" aria-label={row.label} className="sticky left-0 z-10 border-b border-border bg-card px-[var(--cell-px)] py-[var(--cell-py)] text-left font-normal">
                        <span className="block font-medium">{row.label}</span>
                        <span className="block text-xs text-muted-foreground">{row.domain}</span>
                        {bulk(row.operations, row.label)}
                      </th>
                      {row.columns.map((operation, col) => {
                        const cell = operation && cells.find((entry) => entry.operation === operation);
                        const changed = !!operation && selection.has(operationKey(operation.code)) !== baseline.has(operationKey(operation.code));
                        return (
                          <td key={PERMISSION_MATRIX_COLUMNS[col].action} className={cn('border-b border-border px-[var(--cell-px)] py-[var(--cell-py)] text-center', changed && 'bg-primary/10')}>
                            {cell ? renderCell(cell, row, false) : null}
                          </td>
                        );
                      })}
                      <td className="border-b border-border px-[var(--cell-px)] py-[var(--cell-py)]">
                        <div className="flex flex-wrap gap-2">
                          {cells.filter((entry) => entry.position.col >= PERMISSION_MATRIX_COLUMNS.length).map((entry) => renderCell(entry, row, true))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </PermissionScrollRegion>
      )}
    </div>
  );
}
