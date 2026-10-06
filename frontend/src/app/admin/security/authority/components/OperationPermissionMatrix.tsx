'use client';

import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WORK_FILL_REGION_CLASS } from '@/app/components/patterns/work-fill';
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
  operationKey,
  planBulkToggle,
  type CellPosition,
  type MatrixOperation,
  type MatrixRow,
} from './operation-permission-matrix-model';
import { focusAdjacentA5Cell } from './a5-cell-navigation';
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
  /** 업무면 fill 셸 안에서 남은 높이를 채운다(부모는 세로 flex). 조건 밖에서는 70vh 상자다. */
  fill?: boolean;
}

/*
 * [2026-10-05 한 화면 압축] 칸 패딩은 업무 표 행 토큰(--work-cell-px/py, 카탈로그 §4)이다 — 화면별 권한 표와 같은 이유·같은 등재
 * (work-screen-grammar-contract WORK_TABLE_TOKEN_OWNERS). 행 일괄 선택은 행 머리 셋째 줄의 버튼에서 좁은 '전체' 열의 24px 버튼으로
 * 옮겨 행이 한 줄이다(종전 약 109px). 열·분류 일괄 버튼도 이름표와 같은 줄이다.
 */
const CELL_PAD = 'px-[var(--work-cell-px)] py-[var(--work-cell-py)]';
/** 행 머리 폭. 고정 첫 열이라 스크롤 여백(scroll-pl)과 같은 값이어야 칸이 첫 열 밑에 가리지 않는다. */
const ROW_HEADER_CLASS = 'w-[11rem] min-w-[11rem]';
/** 고정 머리글(이름표와 24px 일괄 버튼 한 줄, 약 2.25rem)·고정 첫 열 폭만큼의 스크롤 여백(WCAG 2.4.11). */
const SCROLL_PADDING_CLASS = 'scroll-pt-10 scroll-pl-[11rem]';
/** 보호 권한 설명(보이는 문장은 '이 표 읽는 법' 안, 같은 문장을 보조기술용으로 그 밖에 늘 둔다). */
const PROTECTED_DESCRIPTION = '보호 표시가 붙은 권한은 권한 설정과 사용자 배정 권한을 모두 가진 관리자만 저장할 수 있어, 줄·열·분류 일괄 선택에서 빠집니다.';
const PROTECTED_MARKER_CLASS = 'rounded border border-warning/40 bg-warning/10 px-1 text-xs text-foreground';

interface CellDescriptor {
  operation: MatrixOperation;
  actionLabel: string;
  position: CellPosition;
}

/**
 * '기능별 권한' — 업무 영역(행) × 행위(열) 표. 카탈로그 §5 A5(교차 상태 편집)의 소비자다.
 *
 * 칸·머리글 패딩은 업무 표 행 토큰(--work-cell-px/--work-cell-py, 카탈로그 §4)을 쓴다 — 배포 전역 data-density 를 따라간다.
 *
 * 행·열 머리글은 스크롤해도 남고, 바뀐 칸은 표시와 설명을 함께 단다. 칸은 즉시 저장하지 않는다 — 초안을 바꿀 뿐이고
 * 저장은 편집기의 '권한 변경 저장' 하나다(감사 이력 없는 즉시 반영 금지).
 */
export function OperationPermissionMatrix({
  operations, selection, baseline, editable, disabled, allowAdd, onChange,
  onSaveShortcut, saveShortcutDisabled = false, unsavedChangeCount, fill = false,
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

  /**
   * 줄·열·분류 일괄 버튼(24px). 보이는 글자는 동사('선택'·'해제')이고, 접근 이름이 범위와 보호 권한 제외를 함께 말한다
   * (보이는 동사를 이름이 포함한다, WCAG 2.5.3). 보호 권한은 planBulkToggle 이 범위에서 뺀다(H3).
   */
  const bulk = (scope: readonly MatrixOperation[], label: string) => {
    if (!editable) return null;
    const plan = planBulkToggle(scope, selection, allowAdd);
    const verb = plan.mode === 'clear' ? '해제' : '선택';
    return (
      <Button type="button" variant="outline" size="xs" className="px-1.5 text-xs font-normal"
        aria-label={`${label} 전체 ${verb}(보호 권한 제외)`} title={`${label} 전체 ${verb}(보호 권한 제외)`} disabled={disabled || plan.mode === null}
        onClick={() => { if (plan.mode) onChange(plan.keys, plan.mode === 'select'); }}>
        {verb}
      </Button>
    );
  };

  const handleTableKeyDown = (event: KeyboardEvent<HTMLTableElement>) => focusAdjacentA5Cell(event, tableRef.current);

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
      ? <span aria-hidden="true" className={PROTECTED_MARKER_CLASS}>보호</span> : null;
    if (!labelled) return <span className="inline-flex items-center gap-1">{checkbox}{marker}</span>;
    return (
      <span key={operation.code} className={cn('inline-flex items-center gap-1 rounded px-1', changed && 'bg-primary/10')}>
        {checkbox}<span className="text-xs">{actionLabel}</span>{marker}
      </span>
    );
  };

  return (
    <div role="group" aria-label="기능별 권한 선택" className={cn('flex flex-col gap-2', fill && WORK_FILL_REGION_CLASS)} onKeyDown={handleSaveKey}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="shrink-0">기능 검색</span>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="업무 영역·코드·권한 이름" className="h-[var(--control-h-sm)] w-52" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="shrink-0">업무 분류</span>
          <select className="block h-[var(--control-h-sm)] rounded-md border border-input bg-background px-2 text-sm" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="">전체 분류</option>
            {categories.map((category) => <option key={category.key} value={category.key}>{category.label}</option>)}
          </select>
        </label>
        {/* [2026-10-05 반박 리뷰 반영] 도구 줄을 한 줄로 — 결과 수는 거를 때만(거르지 않으면 표시 수와 전체 수가 같다), '보호' 표시의
            뜻은 '이 표 읽는 법'으로 옮겼다. 표가 남은 높이를 더 받는다. */}
        {(query.trim() !== '' || categoryFilter !== '') && <span className="text-sm text-muted-foreground">표시 {visibleRows.length} / 전체 {totalRows}개 영역</span>}
        <p className="text-sm" aria-live="polite">{changedCount > 0 ? `이 표에서 바꾼 칸 ${changedCount}개` : ''}</p>
        {/* '이 표 읽는 법'은 도구 줄 오른쪽 끝(ml-auto)에 두지 않고 거르기 단추 뒤에 잇는다(2026-10-05 실측 반영). 오른쪽 끝에 붙이면 글자 끝이
            스크롤 상자(탭 내용)의 잘림 경계와 표의 오른쪽 테두리에 맞닿아, 바로 아래 가로로 잘려 나간 표 머리와 함께 마지막 글자가 잘린 것처럼
            보였고(1366×768) 포커스 표시도 경계에 붙었다. 줄이 모자라면 줄째 다음 줄로 내려가고(flex-wrap), 글자는 한 줄을 지킨다. */}
        <details className="open:basis-full">
          <summary className="w-fit cursor-pointer whitespace-nowrap text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">이 표 읽는 법</summary>
          <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p>API와 화면 동작에 적용됩니다. 본인 자료·공개 범위 등 자료별 조건은 함께 적용됩니다. 칸은 저장하지 않은 변경에만 반영되고 &apos;권한 변경 저장&apos;으로 저장됩니다.</p>
            <p><span aria-hidden="true" className={PROTECTED_MARKER_CLASS}>보호</span> {PROTECTED_DESCRIPTION}</p>
            <p>&apos;전체&apos; 열의 단추는 그 업무 영역을, 열 머리의 단추는 보이는 영역의 그 행위를, 분류 줄의 단추는 그 분류를 한 번에 선택하거나 해제합니다. 기능 검색·업무 분류 밖의 선택도 유지됩니다.</p>
          </div>
        </details>
      </div>
      <span id={changedDescriptionId} className="sr-only">저장하지 않은 변경</span>
      {/* 보호 권한 설명은 닫힌 '이 표 읽는 법' 밖에 늘 둔다 — 닫힌 details 안을 가리키는 설명은 브라우저 접근성 트리에서 비어 버린다
          (2026-10-05 반박 리뷰 CDP 실측, jsdom 은 이를 모델링하지 않아 계약은 대상이 details 밖인지를 본다). */}
      <span id={protectedDescriptionId} className="sr-only">{PROTECTED_DESCRIPTION}</span>
      {visibleRows.length === 0 ? <p role="status" className="text-sm">조건에 맞는 업무 영역이 없습니다.</p> : (
        <PermissionScrollRegion label="기능별 권한 표 스크롤 영역" fill={fill} scrollPaddingClassName={SCROLL_PADDING_CLASS}>
          <table ref={tableRef} className="w-full border-separate border-spacing-0 text-left text-sm" onKeyDown={handleTableKeyDown}>
            <caption className="sr-only">업무 영역별 기능권한 선택. 칸에서 방향키로 이동하고 Space로 바꿉니다. 바꾼 칸은 저장해야 반영됩니다.</caption>
            <thead>
              <tr>
                <th scope="col" className={`sticky left-0 top-0 z-30 ${ROW_HEADER_CLASS} border-b border-border bg-muted ${CELL_PAD} text-xs font-semibold`}>업무 영역</th>
                <th scope="col" className={`sticky top-0 z-20 whitespace-nowrap border-b border-border bg-muted ${CELL_PAD} text-center text-xs font-semibold`}>전체</th>
                {PERMISSION_MATRIX_COLUMNS.map((column, col) => (
                  <th key={column.action} scope="col" aria-label={column.label} className={`sticky top-0 z-20 whitespace-nowrap border-b border-border bg-muted ${CELL_PAD} text-center`}>
                    <span className="inline-flex items-center gap-1">
                      <span className="text-xs font-semibold">{column.label}</span>
                      {bulk(visibleRows.flatMap((row) => row.columns[col] ? [row.columns[col]!] : []), column.label)}
                    </span>
                  </th>
                ))}
                <th scope="col" className={`sticky top-0 z-20 whitespace-nowrap border-b border-border bg-muted ${CELL_PAD} text-xs font-semibold`}>{PERMISSION_MATRIX_OTHER_COLUMN_LABEL}</th>
              </tr>
            </thead>
            {visibleCategories.map((category) => (
              <tbody key={category.key}>
                <tr>
                  <th scope="rowgroup" aria-label={category.label} colSpan={PERMISSION_MATRIX_COLUMNS.length + 3} className="border-b border-border bg-muted/50 p-0 text-left">
                    <div className={`sticky left-0 inline-flex items-center gap-2 ${CELL_PAD}`}>
                      <span className="font-semibold">{category.label}</span>
                      {bulk(category.rows.flatMap((row) => row.operations), category.label)}
                    </div>
                  </th>
                </tr>
                {category.rows.map((row) => {
                  const cells = cellsOf(row);
                  return (
                    <tr key={row.domain}>
                      <th scope="row" aria-label={row.label} className={`sticky left-0 z-10 ${ROW_HEADER_CLASS} border-b border-border bg-card ${CELL_PAD} text-left font-normal`}>
                        <span className="flex max-w-[9.5rem] items-baseline gap-1.5">
                          <span className="min-w-0 break-words font-medium">{row.label}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{row.domain}</span>
                        </span>
                      </th>
                      <td className={`border-b border-border ${CELL_PAD} text-center`}>{bulk(row.operations, row.label)}</td>
                      {row.columns.map((operation, col) => {
                        const cell = operation && cells.find((entry) => entry.operation === operation);
                        const changed = !!operation && selection.has(operationKey(operation.code)) !== baseline.has(operationKey(operation.code));
                        return (
                          <td key={PERMISSION_MATRIX_COLUMNS[col].action} className={cn(`border-b border-border ${CELL_PAD} text-center`, changed && 'bg-primary/10')}>
                            {cell ? renderCell(cell, row, false) : null}
                          </td>
                        );
                      })}
                      <td className={`border-b border-border ${CELL_PAD}`}>
                        <div className="flex flex-wrap gap-1">
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
