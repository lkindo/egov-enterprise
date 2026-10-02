'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { MenuVisibilityPreview } from '@/lib/navigation/menu-visibility-preview';
import {
  isProtectedPermission,
  isSaveShortcut,
  nextCellPosition,
  operationKey,
  type MatrixOperation,
} from './operation-permission-matrix-model';
import {
  aggregateCell,
  ancestorKeys,
  cellCodes,
  initialExpandedKeys,
  isGroupRow,
  menuRowKey,
  rowsUnder,
  SCREEN_PERMISSION_COLUMNS,
  screenRowStatus,
  visibleScreenRows,
  type ScreenColumnKey,
  type ScreenPermissionModel,
  type ScreenRow,
} from './screen-permission-model';
import { EntryFixControl, type EntryPermissionFixState } from './EntryPermissionFixes';
import { PermissionScrollRegion } from './PermissionScrollRegion';

export interface ScreenPermissionTableProps {
  model: ScreenPermissionModel;
  operations: readonly MatrixOperation[];
  /** 지금 초안의 선택(`OPERATION:<code>`·`NAVIGATION:<menu>`). 기능별 권한 표와 같은 초안이다. */
  selection: ReadonlySet<string>;
  /** 마지막으로 불러온 서버 상태. 다른 칸이 '저장하지 않은 변경'이다. */
  baseline: ReadonlySet<string>;
  /** 이 그룹의 초안으로 돌린 사이드바 판정(상태 칸). */
  preview: MenuVisibilityPreview;
  /** 권한 설정 권한이 있는가. 없으면 칸을 잠그고 묶음 칸 조작을 두지 않는다. */
  editable: boolean;
  /** 일시 잠금(저장 중·최신 정보 아님·카탈로그 손상). */
  disabled: boolean;
  /** 꺼진 기능권한 칸을 켤 수 있는가. 공개 메뉴 그룹은 기능권한을 더할 수 없다. */
  allowAdd: boolean;
  onChangeOperations: (keys: readonly string[], checked: boolean) => void;
  /** 메뉴 표시 — 하위를 켜면 상위도 함께 켜고, 상위를 끄면 하위도 끈다(편집기의 계층 규칙). */
  onToggleNavigation: (code: string, checked: boolean) => void;
  entryFixes: EntryPermissionFixState;
  /** 처음 펼칠 문제 메뉴(진입 권한 없음). 마운트할 때 한 번만 읽는다. */
  problemMenuCodes: readonly string[];
  /** 이 메뉴 줄로 옮겨 포커스한다(메뉴 미리보기의 '줄로 가기'). nonce 가 바뀔 때마다 한 번. */
  focusRequest?: { menuCode: string; nonce: number } | null;
  onSaveShortcut?: () => void;
  saveShortcutDisabled?: boolean;
  /** 같은 저장 단위의 전체 변경 수(기능별 권한 포함). */
  unsavedChangeCount: number;
}

const COLUMN_INDEX: Readonly<Record<ScreenColumnKey, number>> = { navigation: 0, entry: 1, create: 2, update: 3, delete: 4, other: 5 };
const columnLabel = (column: ScreenColumnKey) => SCREEN_PERMISSION_COLUMNS[COLUMN_INDEX[column]].label;
const CELL_CLASS = 'border-b border-border px-[var(--cell-px)] py-[var(--cell-py)] text-center align-middle';
const CHANGED_CLASS = 'data-[changed=true]:ring-2 data-[changed=true]:ring-primary data-[changed=true]:ring-offset-1';
const GROUP_CODE_EXCLUSIONS = '보호 권한·타인 자료 권한·다른 화면 진입 권한 제외';

/** 메뉴 줄의 머리글(없으면 null). */
function rowHeaderIn(container: HTMLElement | null, menuCode: string): HTMLElement | null {
  const key = menuRowKey(menuCode);
  return [...(container?.querySelectorAll<HTMLElement>('[data-row-key]') ?? [])].find((element) => element.dataset.rowKey === key) ?? null;
}

/**
 * '화면별 권한' — 메뉴 트리(영역 → 섹션 → 화면) 줄 × 메뉴 표시·화면 진입·등록·수정·삭제·그 밖의 기능 칸.
 * 권한 편집기의 기본 보기다(2026-10-02, 관리 콘솔 UX 2단계 D4). 카탈로그 §5 A5(교차 상태 편집)를 따른다:
 * 행·열 머리글 고정, 바뀐 칸 표시, 저장 전 요약, 방향키 이동, Space 토글, Ctrl/Cmd+S. 칸은 즉시 저장하지 않는다 —
 * 초안만 바꾸고 저장은 편집기의 '권한 변경 저장' 하나다.
 *
 *  · 화면 줄의 칸: 권한이 하나면 체크박스, 여럿이면 'k/n' 버튼이 권한마다 고르는 창을 연다. 화면 진입이 '모두 있어야
 *    열림'(ALL)이면 전부를 한 체크로 켜고 끈다. 화면에 없는 행위의 칸은 비운다.
 *  · 영역·섹션 줄의 칸: 아래 화면 전체를 한 번에 켜고 끈다('k/n' 집계). 보호 권한·타인 자료 권한·다른 화면의 진입 권한은
 *    빠진다(H3) — 화면 줄의 칸에서 따로 고른다. 화면 검색 중에는 검색 결과에 보이는 화면만 바꾼다.
 *    메뉴 표시 칸만은 그 메뉴 자신의 표시다(상위만 켜면 하위는 켜지지 않는다).
 *  · 칸의 상태(몇 개 중 몇 개, 무엇이 빠졌는지)는 보이는 글자와 같은 내용을 설명(aria-describedby)으로도 싣는다 — 변경·보호
 *    설명이 붙어도 보조기술이 수를 잃지 않게 한다. 'k/n' 버튼의 이름은 보이는 수를 담는다(WCAG 2.5.3).
 */
export function ScreenPermissionTable({
  model, operations, selection, baseline, preview, editable, disabled, allowAdd, onChangeOperations, onToggleNavigation,
  entryFixes, problemMenuCodes, focusRequest, onSaveShortcut, saveShortcutDisabled = false, unsavedChangeCount,
}: ScreenPermissionTableProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(() => initialExpandedKeys(model, problemMenuCodes));
  const [handledFocus, setHandledFocus] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const descriptionId = useId();
  const changedDescriptionId = `${descriptionId}-changed`;
  const protectedDescriptionId = `${descriptionId}-protected`;
  const operationNames = useMemo(() => new Map(operations.map((operation) => [operation.code, operation.name])), [operations]);

  // '줄로 가기' — 그 줄이 보이도록 상위를 펼치고 검색을 비운다. 렌더 중 조정이다(effect 안 setState 는 연쇄 렌더를 만든다).
  if (focusRequest && focusRequest.nonce !== handledFocus) {
    setHandledFocus(focusRequest.nonce);
    setQuery('');
    setExpanded((previous) => new Set([...previous, ...ancestorKeys(model, menuRowKey(focusRequest.menuCode))]));
  }
  // 펼친 결과가 그려진 뒤 그 줄의 머리글로 포커스를 옮긴다(상태를 바꾸지 않는 DOM 작업).
  useEffect(() => {
    if (!focusRequest) return;
    const header = rowHeaderIn(containerRef.current, focusRequest.menuCode);
    header?.scrollIntoView?.({ block: 'nearest' });
    header?.focus();
  }, [focusRequest]);
  // 상태 칸에서 진입 권한을 더하면 그 버튼은 사라진다 — 포커스를 표 밖으로 보내지 않고 같은 줄의 화면 진입 칸(없으면 머리글)에
  // 둔다. 여러 줄을 이어서 고치는 키보드 사용자가 표 안 자리를 잃지 않는다. 결과 문장은 표 위의 알림 영역이 읽어 준다.
  const { noticeSequence, noticeOrigin } = entryFixes;
  useEffect(() => {
    if (noticeSequence === 0 || !noticeOrigin) return;
    const header = rowHeaderIn(containerRef.current, noticeOrigin);
    const entryCell = header?.closest('tr')?.querySelector<HTMLElement>(`[data-a5-cell][data-col-index="${COLUMN_INDEX.entry}"]`);
    (entryCell ?? header)?.focus();
  }, [noticeSequence, noticeOrigin]);

  const rows = visibleScreenRows(model, expanded, query);
  const rowIndex = new Map(rows.map((row, index) => [row.key, index]));
  const searching = query.trim().length > 0;
  const visibleKeys = new Set(rows.map((row) => row.key));
  /** 묶음 줄이 다루는 줄 — 검색 중이면 검색 결과에 보이는 줄만. */
  const rowsForGroup = (row: ScreenRow) => {
    const under = rowsUnder(model, row);
    return searching ? under.filter((entry) => visibleKeys.has(entry.key)) : under;
  };
  const changed = (key: string) => selection.has(key) !== baseline.has(key);
  const anyChanged = (codes: readonly string[]) => codes.some((code) => changed(operationKey(code)));

  const toggleExpanded = (key: string) => setExpanded((previous) => {
    const next = new Set(previous);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

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
    if (!isSaveShortcut(event) || !onSaveShortcut || saveShortcutDisabled || unsavedChangeCount === 0) return;
    event.preventDefault();
    onSaveShortcut();
  };

  const cellAttributes = (row: ScreenRow, column: ScreenColumnKey, isChanged: boolean) => ({
    'data-a5-cell': '',
    'data-row-index': rowIndex.get(row.key),
    'data-col-index': COLUMN_INDEX[column],
    'data-changed': isChanged ? 'true' : undefined,
  });
  const describedBy = (isChanged: boolean, isProtected: boolean, stateId?: string) =>
    [stateId ?? null, isChanged ? changedDescriptionId : null, isProtected ? protectedDescriptionId : null].filter(Boolean).join(' ') || undefined;
  /** 칸 상태 문장의 id — 보이는 줄 순번과 열 순번으로 짓는다(한 표 안에서 고유). */
  const stateIdOf = (row: ScreenRow, column: ScreenColumnKey) => `${descriptionId}-state-${rowIndex.get(row.key)}-${COLUMN_INDEX[column]}`;
  /** 칸 상태 문장 — 화면에는 보이는 글자·title 로 드러나고, 보조기술에는 설명으로 읽힌다. */
  const stateText = (id: string, text: string) => <span id={id} className="sr-only">{text}</span>;
  const protectedMarker = <span aria-hidden="true" className="rounded border border-warning/40 bg-warning/10 px-1 text-xs text-foreground">보호</span>;
  const permissionLabel = (code: string) => `${operationNames.get(code) ?? code} (${code})`;

  /** 기능권한 하나를 켜고 끄는 체크박스. */
  const singleCode = (row: ScreenRow, column: ScreenColumnKey, code: string) => {
    const key = operationKey(code);
    const checked = selection.has(key);
    const isChanged = changed(key);
    const isProtected = isProtectedPermission(code);
    const stateId = stateIdOf(row, column);
    const name = operationNames.get(code) ?? code;
    return (
      <span className="inline-flex items-center gap-1">
        <Checkbox {...cellAttributes(row, column, isChanged)} aria-label={`${row.name} × ${columnLabel(column)} (${code})`}
          aria-describedby={describedBy(isChanged, isProtected, stateId)} title={name}
          checked={checked} disabled={disabled || !editable || (!allowAdd && !checked)}
          onCheckedChange={(next) => onChangeOperations([key], next === true)} className={CHANGED_CLASS} />
        {stateText(stateId, name)}
        {isProtected && protectedMarker}
      </span>
    );
  };

  /** 권한이 여럿인 칸 — 'k/n' 버튼이 권한마다 고르는 창을 연다. 이름은 보이는 수를 담는다(WCAG 2.5.3). */
  const multipleCodes = (row: ScreenRow, column: ScreenColumnKey, codes: readonly string[], note: string) => {
    const selected = codes.filter((code) => selection.has(operationKey(code))).length;
    const isChanged = anyChanged(codes);
    const isProtected = codes.some(isProtectedPermission);
    const stateId = stateIdOf(row, column);
    const summary = `권한 ${codes.length}개 중 ${selected}개 선택`;
    return (
      <>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" {...cellAttributes(row, column, isChanged)}
              aria-label={`${row.name} × ${columnLabel(column)} ${selected}/${codes.length}`} aria-describedby={describedBy(isChanged, isProtected, stateId)}
              title={summary} className={cn('tabular-nums', CHANGED_CLASS)}>
              {selected}/{codes.length}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 space-y-2" aria-label={`${row.name} × ${columnLabel(column)} 권한 고르기`}>
            <p className="text-xs text-muted-foreground">{note}</p>
            <ul className="space-y-1">
              {codes.map((code) => {
                const key = operationKey(code);
                const checked = selection.has(key);
                const codeChanged = changed(key);
                const codeProtected = isProtectedPermission(code);
                return (
                  <li key={code}>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={checked} data-changed={codeChanged ? 'true' : undefined} className={CHANGED_CLASS}
                        aria-describedby={describedBy(codeChanged, codeProtected)}
                        disabled={disabled || !editable || (!allowAdd && !checked)}
                        onCheckedChange={(next) => onChangeOperations([key], next === true)} />
                      <span className="min-w-0 break-words">{permissionLabel(code)}</span>
                      {codeProtected && protectedMarker}
                    </label>
                  </li>
                );
              })}
            </ul>
          </PopoverContent>
        </Popover>
        {stateText(stateId, summary)}
      </>
    );
  };

  /** 화면 진입이 '모두 있어야 열림'(ALL)이면 전부를 한 체크로. */
  const allEntry = (row: ScreenRow, codes: readonly string[]) => {
    const on = codes.filter((code) => selection.has(operationKey(code))).length;
    const isChanged = anyChanged(codes);
    const isProtected = codes.some(isProtectedPermission);
    const state = on === codes.length ? true : on > 0 ? 'indeterminate' : false;
    const keys = codes.filter((code) => !isProtectedPermission(code)).map(operationKey);
    const stateId = stateIdOf(row, 'entry');
    return (
      <>
        <Checkbox {...cellAttributes(row, 'entry', isChanged)} aria-label={`${row.name} × ${columnLabel('entry')}`}
          aria-describedby={describedBy(isChanged, isProtected, stateId)} title={`모두 있어야 열림: ${codes.join(', ')}`}
          checked={state} disabled={disabled || !editable || (!allowAdd && state !== true)}
          onCheckedChange={() => onChangeOperations(keys, state !== true)} className={CHANGED_CLASS} />
        {stateText(stateId, `모두 있어야 열림: ${codes.join(', ')} · 권한 ${codes.length}개 중 ${on}개 선택`)}
      </>
    );
  };

  const screenCell = (row: ScreenRow, column: Exclude<ScreenColumnKey, 'navigation'>): ReactNode => {
    if (column === 'entry') {
      const entry = row.entry;
      if (!entry) return null;
      if (entry.state === 'open') return <span className="text-xs text-muted-foreground">로그인만 하면 열림</span>;
      if (entry.state === 'unregistered') return <span className="text-xs text-muted-foreground">등록되지 않은 화면</span>;
      if (entry.state === 'unlisted') return <span className="text-xs text-muted-foreground">화면 목록에 없는 경로</span>;
      if (entry.state === 'unknown') return <span className="text-xs text-muted-foreground">기능 목록에 없는 권한</span>;
      if (entry.codes.length === 1) return singleCode(row, 'entry', entry.codes[0]);
      if (entry.mode === 'ALL') return allEntry(row, entry.codes);
      return multipleCodes(row, 'entry', entry.codes, '하나라도 있으면 이 화면에 들어갈 수 있습니다.');
    }
    const codes = cellCodes(row, column);
    if (codes.length === 0) return null;
    if (codes.length === 1) return singleCode(row, column, codes[0]);
    return multipleCodes(row, column, codes, '권한마다 따로 켜고 끕니다. 같은 권한은 다른 화면에서도 켜진 상태로 보입니다.');
  };

  /** 영역·섹션 줄의 칸 — 아래 화면 전체를 한 번에(보호 권한·타인 자료 권한·다른 화면 진입 권한 제외, 검색 중이면 보이는 화면만). */
  const groupCell = (row: ScreenRow, column: Exclude<ScreenColumnKey, 'navigation'>): ReactNode => {
    const under = rowsForGroup(row);
    const aggregate = aggregateCell(under, column, selection, allowAdd);
    if (!aggregate) return null;
    const codes = column === 'entry' ? [...new Set(under.flatMap((entry) => (entry.entry?.state === 'gated' ? entry.entry.codes : [])))] : [...new Set(under.flatMap((entry) => entry.codes[column]))];
    const isChanged = anyChanged(codes);
    const state = aggregate.selected === aggregate.total ? true : aggregate.selected > 0 ? 'indeterminate' : false;
    const scope = searching ? '검색 결과의' : '아래';
    const summary = column === 'entry'
      ? `${scope} 화면 ${aggregate.total}개 중 ${aggregate.selected}개 · 보호 권한 제외`
      : `${scope} 권한 ${aggregate.total}개 중 ${aggregate.selected}개 · ${GROUP_CODE_EXCLUSIONS}`;
    const stateId = stateIdOf(row, column);
    return (
      <span className="inline-flex items-center gap-1">
        <Checkbox {...cellAttributes(row, column, isChanged)} aria-label={`${row.name} × ${columnLabel(column)}`}
          aria-describedby={describedBy(isChanged, false, stateId)} title={summary}
          checked={state} disabled={disabled || !editable || aggregate.plan.mode === null}
          onCheckedChange={() => { if (aggregate.plan.mode) onChangeOperations(aggregate.plan.keys, aggregate.plan.mode === 'select'); }}
          className={CHANGED_CLASS} />
        <span aria-hidden="true" className="text-xs tabular-nums text-muted-foreground">{aggregate.selected}/{aggregate.total}</span>
        {stateText(stateId, summary)}
      </span>
    );
  };

  const navigationCell = (row: ScreenRow) => {
    if (row.kind !== 'menu' || !row.menuCode) return null;
    const key = `NAVIGATION:${row.menuCode}`;
    const isChanged = changed(key);
    return (
      <Checkbox {...cellAttributes(row, 'navigation', isChanged)} aria-label={`${row.name} × 메뉴 표시 (${row.menuCode})`}
        aria-describedby={describedBy(isChanged, false)} checked={selection.has(key)} disabled={disabled || !editable}
        onCheckedChange={(next) => onToggleNavigation(row.menuCode!, next === true)} className={CHANGED_CLASS} />
    );
  };

  const statusCell = (row: ScreenRow) => {
    const status = screenRowStatus(row, preview, selection);
    const fix = row.menuCode ? entryFixes.fixByMenu.get(row.menuCode) : undefined;
    if (!status && !fix) return null;
    return (
      <div className="flex min-w-[12rem] flex-col items-start gap-1 text-left">
        {status && <span className={cn('text-xs', status.tone === 'problem' ? 'font-medium text-destructive-emphasis' : status.tone === 'ok' ? 'text-foreground' : 'text-muted-foreground')}>{status.label}</span>}
        {fix && <EntryFixControl state={entryFixes} fix={fix} />}
      </div>
    );
  };

  return (
    <div ref={containerRef} role="group" aria-label="화면별 권한 선택" className="space-y-3" onKeyDown={handleSaveKey}>
      <label className="block max-w-md space-y-1 text-sm">화면 검색
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="메뉴 이름·경로·권한 코드" />
      </label>
      <p className="text-sm" aria-live="polite">{unsavedChangeCount > 0 ? `바꾼 권한 ${unsavedChangeCount}개 — '권한 변경 저장'을 눌러야 반영됩니다.` : ''}</p>
      <p id={protectedDescriptionId} className="text-xs text-muted-foreground">보호 표시가 붙은 권한은 권한 설정과 사용자 배정 권한을 모두 가진 관리자만 저장할 수 있어, 영역·섹션 줄의 일괄 선택에서 빠집니다.</p>
      <p className="text-xs text-muted-foreground">영역·섹션 줄의 칸은 아래 화면의 권한을 한 번에 켜고 끕니다. 타인 자료 권한(…_ALL)과 다른 화면에 들어가는 진입 권한도 인가 의미가 달라 일괄 선택에서 빠지므로, 화면 줄의 칸에서 따로 고르세요. 화면 검색 중에는 검색 결과에 보이는 화면만 바꿉니다.</p>
      <span id={changedDescriptionId} className="sr-only">저장하지 않은 변경</span>
      {model.rows.length === 0 ? <p role="status" className="text-sm text-muted-foreground">표시할 메뉴와 화면이 없습니다.</p>
        : rows.length === 0 ? <p role="status" className="text-sm">조건에 맞는 메뉴나 화면이 없습니다.</p> : (
          <PermissionScrollRegion label="화면별 권한 표 스크롤 영역">
            <table ref={tableRef} className="w-full border-separate border-spacing-0 text-left text-sm" onKeyDown={handleTableKeyDown}>
              <caption className="sr-only">메뉴와 화면별 권한 선택. 칸에서 방향키로 이동하고 Space로 바꿉니다. 바꾼 칸은 저장해야 반영됩니다.</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 top-0 z-30 min-w-[16rem] border-b border-border bg-muted px-[var(--cell-px)] py-[var(--cell-py)]">메뉴·화면</th>
                  {SCREEN_PERMISSION_COLUMNS.map((column) => (
                    <th key={column.key} scope="col" className="sticky top-0 z-20 whitespace-nowrap border-b border-border bg-muted px-[var(--cell-px)] py-[var(--cell-py)] text-center text-xs font-semibold">{column.label}</th>
                  ))}
                  <th scope="col" className="sticky top-0 z-20 border-b border-border bg-muted px-[var(--cell-px)] py-[var(--cell-py)] text-xs font-semibold">상태</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const group = isGroupRow(row);
                  const open = query.trim() ? true : expanded.has(row.key);
                  const columnCell = (column: Exclude<ScreenColumnKey, 'navigation'>) => (row.kind === 'unmatched-group' ? null : group ? groupCell(row, column) : screenCell(row, column));
                  return (
                    <tr key={row.key} data-unused={row.unused ? 'true' : undefined}>
                      <th scope="row" data-row-key={row.key} tabIndex={-1} aria-label={row.name}
                        className="sticky left-0 z-10 border-b border-border bg-card px-[var(--cell-px)] py-[var(--cell-py)] text-left font-normal">
                        <div className="flex items-center gap-1" style={{ paddingLeft: `${row.depth * 1.25}rem` }}>
                          {group ? <Button type="button" variant="ghost" size="icon-sm" aria-expanded={open} disabled={!!query.trim()}
                            aria-label={`${row.name} 하위 메뉴 ${open ? '접기' : '펼치기'}`} onClick={() => toggleExpanded(row.key)}>
                            {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
                          </Button> : <span aria-hidden="true" className="w-[var(--control-h-sm)] shrink-0" />}
                          <span className="min-w-0">
                            <span className={cn('block break-words', group ? 'font-semibold' : 'font-medium')}>{row.name}
                              {row.kind === 'unmatched-group' && <span className="ml-2 text-xs font-normal text-muted-foreground">{row.childKeys.length}개</span>}
                              {row.unused && <span className="ml-2 rounded border border-border px-1 text-xs font-normal text-muted-foreground">사용 안 함</span>}
                            </span>
                            {row.route && <span className="block break-all text-xs text-muted-foreground">{row.route}</span>}
                          </span>
                        </div>
                      </th>
                      <td className={cn(CELL_CLASS, changed(`NAVIGATION:${row.menuCode}`) && 'bg-primary/10')}>{navigationCell(row)}</td>
                      {(['entry', 'create', 'update', 'delete', 'other'] as const).map((column) => (
                        <td key={column} className={CELL_CLASS}>{columnCell(column)}</td>
                      ))}
                      <td className="border-b border-border px-[var(--cell-px)] py-[var(--cell-py)]">{statusCell(row)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </PermissionScrollRegion>
        )}
    </div>
  );
}
