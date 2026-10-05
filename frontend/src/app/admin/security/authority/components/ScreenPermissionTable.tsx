'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { MenuVisibilityPreview } from '@/lib/navigation/menu-visibility-preview';
import { WORK_FILL_REGION_CLASS } from '@/app/components/patterns/work-fill';
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
  navigationCodesUnder,
  rowChanged,
  rowHasProblem,
  rowsUnder,
  SCREEN_PERMISSION_COLUMNS,
  screenRowStatus,
  sectionStatus,
  visibleScreenRows,
  type ScreenColumnKey,
  type ScreenEntry,
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
  /** 화면 줄의 메뉴 표시 — 하위를 켜면 상위도 함께 켜고, 상위를 끄면 하위도 끈다(편집기의 계층 규칙). */
  onToggleNavigation: (code: string, checked: boolean) => void;
  /**
   * 영역·섹션 줄의 메뉴 표시 — 그 아래 메뉴 전체(2026-10-05). codes 는 켤 메뉴(줄 자신과 보이는 하위 메뉴)이고, 끌 때는 줄 아래
   * 전체를 끈다(screen-permission-model 의 toggleNavigationSubtree).
   */
  onToggleNavigationSubtree: (rootCode: string, codes: readonly string[], checked: boolean) => void;
  entryFixes: EntryPermissionFixState;
  /** 처음 펼칠 문제 메뉴(진입 권한 없음). 마운트할 때 한 번만 읽는다. */
  problemMenuCodes: readonly string[];
  /** 이 메뉴 줄로 옮겨 포커스한다(메뉴 미리보기의 '줄로 가기'). nonce 가 바뀔 때마다 한 번. */
  focusRequest?: { menuCode: string; nonce: number } | null;
  onSaveShortcut?: () => void;
  saveShortcutDisabled?: boolean;
  /** 같은 저장 단위의 전체 변경 수(기능별 권한 포함). */
  unsavedChangeCount: number;
  /** 업무면 fill 셸 안에서 남은 높이를 채운다(부모는 세로 flex). 조건 밖에서는 70vh 상자다. */
  fill?: boolean;
}

const COLUMN_INDEX: Readonly<Record<ScreenColumnKey, number>> = { navigation: 0, entry: 1, create: 2, update: 3, delete: 4, other: 5 };
const columnLabel = (column: ScreenColumnKey) => SCREEN_PERMISSION_COLUMNS[COLUMN_INDEX[column]].label;
/*
 * [2026-10-05 한 화면 압축] 칸 패딩은 업무 표 행 토큰(--work-cell-px/py, 카탈로그 §4 '업무 표 행 토큰')이다. 종전 표 셀 밀도 토큰
 * (--cell-px/py)은 기본 comfortable 에서 24·20px 라 한 줄이 약 77px 였다. 업무 표 토큰은 배포 전역 data-density 를 따라가는
 * 컴포넌트 표현이고 화면별 밀도 선택이 아니다(헌법 제2조 2항, 등재: work-screen-grammar-contract WORK_TABLE_TOKEN_OWNERS).
 */
const CELL_PAD = 'px-[var(--work-cell-px)] py-[var(--work-cell-py)]';
const CELL_CLASS = `border-b border-border ${CELL_PAD} text-center align-middle`;
/** 이름 열 폭. 고정 첫 열이라 스크롤 여백(scroll-pl)과 같은 값이어야 칸이 첫 열 밑에 가리지 않는다. */
const NAME_COLUMN_CLASS = 'w-[15rem] min-w-[15rem]';
/** 고정 머리글 높이(한 줄, 약 1.75rem)·고정 첫 열 폭만큼의 스크롤 여백(WCAG 2.4.11). */
const SCROLL_PADDING_CLASS = 'scroll-pt-8 scroll-pl-[15rem]';
const CHANGED_CLASS = 'data-[changed=true]:ring-2 data-[changed=true]:ring-primary data-[changed=true]:ring-offset-1';
const GROUP_CODE_EXCLUSIONS = '보호 권한·타인 자료 권한·다른 화면 진입 권한 제외';
/** '화면 진입' 묶음 칸의 제외 — 보호·타인 자료 진입 권한은 더하지도 끄지도 않고, 그런 권한이 필요한 화면은 '직접 고르기'로 센다. */
const GROUP_ENTRY_EXCLUSIONS = '보호 권한·타인 자료 권한 제외';
/** 거르기 단추 — 눌림은 aria-pressed, 거를 줄이 없으면 aria-disabled(포커스는 남는다)로 보인다. */
const NARROW_BUTTON_CLASS = 'aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-foreground aria-disabled:cursor-not-allowed aria-disabled:opacity-50';
/** 보호 권한 설명(보이는 문장은 '이 표 읽는 법' 안, 같은 문장을 보조기술용으로 그 밖에 늘 둔다). */
const PROTECTED_DESCRIPTION = '보호 표시가 붙은 권한은 권한 설정과 사용자 배정 권한을 모두 가진 관리자만 저장할 수 있어, 영역·섹션 줄의 일괄 선택에서 빠집니다.';

/** 화면 진입 판정을 한 문장으로(현재 줄 띠). */
function entrySentence(entry: ScreenEntry, label: (code: string) => string): string {
  if (entry.state === 'open') return '화면 진입: 로그인만 하면 열림';
  if (entry.state === 'unregistered') return '화면 진입: 등록되지 않은 화면';
  if (entry.state === 'unlisted') return '화면 진입: 화면 목록에 없는 경로';
  if (entry.state === 'unknown') return '화면 진입: 기능 목록에 없는 권한';
  if (entry.codes.length === 1) return `화면 진입: ${label(entry.codes[0])}`;
  return entry.mode === 'ALL'
    ? `화면 진입(모두 필요): ${entry.codes.map(label).join(' + ')}`
    : `화면 진입(하나만 있으면 됨): ${entry.codes.map(label).join(' 또는 ')}`;
}

/** 메뉴 줄의 머리글(없으면 null). */
function rowHeaderIn(container: HTMLElement | null, menuCode: string): HTMLElement | null {
  const key = menuRowKey(menuCode);
  return [...(container?.querySelectorAll<HTMLElement>('[data-row-key]') ?? [])].find((element) => element.dataset.rowKey === key) ?? null;
}

/** 두 고정 집합의 교집합(둘 다 없으면 null — 거르지 않는다). */
function intersect(left: ReadonlySet<string> | null, right: ReadonlySet<string> | null): ReadonlySet<string> | null {
  if (!left) return right;
  if (!right) return left;
  return new Set([...left].filter((key) => right.has(key)));
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
 *    빠진다(H3) — 화면 줄의 칸에서 따로 고른다. 화면 검색·줄 거르기 중에는 보이는 화면만 바꾼다.
 *  · 영역·섹션 줄의 메뉴 표시 칸(2026-10-05): 그 아래 메뉴 전체를 켜고 끈다. 켤 때는 상위도 함께 켜고(상위 누락을 만들지
 *    않는다), 끌 때는 아래 전체를 끈다. 화면 줄의 메뉴 표시 칸은 그 메뉴 자신이다(켜면 상위도 함께).
 *  · 칸의 상태(몇 개 중 몇 개, 무엇이 빠졌는지)는 보이는 글자와 같은 내용을 설명(aria-describedby)으로도 싣는다 — 변경·보호
 *    설명이 붙어도 보조기술이 수를 잃지 않게 한다. 'k/n' 버튼의 이름은 보이는 수를 담는다(WCAG 2.5.3).
 *
 * [2026-10-05 한 화면 압축] 표 위의 설명 문단은 '이 표 읽는 법' 도움말 하나로 접고(문구는 DOM 에 남는다), 도구는 한 줄이다:
 * 화면 검색 · '문제 줄만' · '바뀐 줄만' · 바꾼 권한 수. 거르기는 누른 때의 줄을 고정해 보인다 — 고치는 동안 줄이 사라져
 * 포커스를 잃지 않게 한다. 거를 줄이 없으면 단추를 aria-disabled 로 막고 '없음'이라고 말한다('조건에 맞는 결과 없음'으로 빈 표를
 * 보이지 않는다, G15). 이름은 한 줄 말줄임이고 경로는 설명(aria-describedby)이다.
 *
 * [2026-10-05 반박 리뷰 반영] '현재 줄' 띠 — 표 바로 아래 한 줄이 마지막으로 누르거나(마우스·터치) 키보드로 옮긴 줄의 이름 전체·
 * 경로·화면 진입에 필요한 권한(섹션 줄은 '진입 권한 추가'가 더할 권한)을 글자로 보인다. 종전에는 그 줄의 칸에 포커스가 오면 이름을
 * 펼쳐(group-focus-within 줄바꿈) 줄 높이가 33→73px 로 바뀌었다. Chromium 은 mousedown 에 포커스를 주므로 칸이 아래로 밀려 mouseup
 * 이 칸 밖에 떨어지고, 긴 이름 줄의 첫 클릭이 칸을 바꾸지 못했다(Playwright check 도 실패). 경로·필요한 권한은 title·sr-only 에만
 * 있어 터치 사용자는 볼 수 없었다(헌법 제16조 3항). 띠는 줄 높이를 바꾸지 않고, 포인터로 누를 때는 click(뗀 뒤)에 갱신해 누르는
 * 동안 배치가 움직이지 않게 한다. 키보드 포커스는 바로 갱신한다.
 */
export function ScreenPermissionTable({
  model, operations, selection, baseline, preview, editable, disabled, allowAdd, onChangeOperations, onToggleNavigation,
  onToggleNavigationSubtree, entryFixes, problemMenuCodes, focusRequest, onSaveShortcut, saveShortcutDisabled = false,
  unsavedChangeCount, fill = false,
}: ScreenPermissionTableProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(() => initialExpandedKeys(model, problemMenuCodes));
  /** '문제 줄만'·'바뀐 줄만'이 누른 때 고정한 줄(null 이면 그 거르기가 꺼져 있다). 화면 안 상태(URL·저장소 금지). */
  const [problemOnly, setProblemOnly] = useState<ReadonlySet<string> | null>(null);
  const [changedOnly, setChangedOnly] = useState<ReadonlySet<string> | null>(null);
  const [handledFocus, setHandledFocus] = useState<number | null>(null);
  /** '현재 줄' 띠가 보이는 줄(화면 안 상태). */
  const [currentRowKey, setCurrentRowKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  /** 포인터를 누르고 있는 동안 — 그 사이의 포커스로는 띠를 바꾸지 않는다(뗀 뒤 click 에서 바꾼다). */
  const pointerPressedRef = useRef(false);
  const descriptionId = useId();
  const changedDescriptionId = `${descriptionId}-changed`;
  const protectedDescriptionId = `${descriptionId}-protected`;
  const operationNames = useMemo(() => new Map(operations.map((operation) => [operation.code, operation.name])), [operations]);
  const fixMenuCodes = useMemo(() => new Set(entryFixes.fixByMenu.keys()), [entryFixes.fixByMenu]);
  // 누름은 표 밖에서 끝날 수 있으므로(끌어서 놓기) 문서에서 뗌·취소를 본다.
  useEffect(() => {
    const release = () => { pointerPressedRef.current = false; };
    document.addEventListener('pointerup', release, true);
    document.addEventListener('pointercancel', release, true);
    return () => {
      document.removeEventListener('pointerup', release, true);
      document.removeEventListener('pointercancel', release, true);
    };
  }, []);

  // '줄로 가기' — 그 줄이 보이도록 상위를 펼치고 검색·거르기를 비운다. 렌더 중 조정이다(effect 안 setState 는 연쇄 렌더를 만든다).
  if (focusRequest && focusRequest.nonce !== handledFocus) {
    setHandledFocus(focusRequest.nonce);
    setQuery('');
    setProblemOnly(null);
    setChangedOnly(null);
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

  const problemKeys = model.rows.filter((row) => rowHasProblem(row, preview, selection, fixMenuCodes)).map((row) => row.key);
  const changedKeys = model.rows.filter((row) => rowChanged(row, selection, baseline)).map((row) => row.key);
  // 거를 줄이 없을 때 누르면 빈 집합이 고정돼 표가 통째로 사라지고 '조건에 맞는 결과 없음'만 남는다 — 고칠 것이 없다는 사실을
  // 그렇게 말하지 않도록 단추를 막고 '없음'이라고 보인다(켜져 있는 거르기는 끌 수 있어야 하므로 꺼져 있을 때만).
  const problemUnavailable = problemOnly === null && problemKeys.length === 0;
  const changedUnavailable = changedOnly === null && changedKeys.length === 0;
  const include = intersect(problemOnly, changedOnly);
  const rows = visibleScreenRows(model, expanded, query, include);
  const rowIndex = new Map(rows.map((row, index) => [row.key, index]));
  const searching = query.trim().length > 0;
  const narrowed = searching || include !== null;
  const visibleKeys = new Set(rows.map((row) => row.key));
  /** 묶음 줄이 다루는 줄 — 검색·거르기 중이면 보이는 줄만. */
  const rowsForGroup = (row: ScreenRow) => {
    const under = rowsUnder(model, row);
    return narrowed ? under.filter((entry) => visibleKeys.has(entry.key)) : under;
  };
  const scopeLabel = searching ? '검색 결과의' : narrowed ? '보이는' : '아래';
  const changed = (key: string) => selection.has(key) !== baseline.has(key);
  const anyChanged = (codes: readonly string[]) => codes.some((code) => changed(operationKey(code)));

  const toggleExpanded = (key: string) => setExpanded((previous) => {
    const next = new Set(previous);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const toggleProblemOnly = () => {
    if (problemUnavailable) return;
    setProblemOnly((current) => (current ? null : new Set(problemKeys)));
  };
  const toggleChangedOnly = () => {
    if (changedUnavailable) return;
    setChangedOnly((current) => (current ? null : new Set(changedKeys)));
  };
  /** 이벤트가 난 표의 줄(포털로 그린 고르는 창 안이면 null). */
  const rowKeyOf = (target: EventTarget | null): string | null => (target instanceof Element
    ? target.closest<HTMLElement>('tr[data-screen-row-key]')?.dataset.screenRowKey ?? null : null);

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

  /**
   * 기능권한 하나를 켜고 끄는 체크박스. '그 밖의 기능' 칸은 열 이름만으로는 무엇인지 알 수 없어 권한 이름을 보이는 글자로 옆에 두고
   * 접근 이름에도 싣는다(헌법 제16조 2·3항, WCAG 2.5.3 — 종전에는 title 에만 있었다). 등록·수정·삭제 칸은 열 이름이 곧 행위다.
   */
  const singleCode = (row: ScreenRow, column: ScreenColumnKey, code: string) => {
    const key = operationKey(code);
    const checked = selection.has(key);
    const isChanged = changed(key);
    const isProtected = isProtectedPermission(code);
    const stateId = stateIdOf(row, column);
    const name = operationNames.get(code) ?? code;
    const labelled = column === 'other';
    return (
      <span className="inline-flex items-center gap-1">
        <Checkbox {...cellAttributes(row, column, isChanged)}
          aria-label={labelled ? `${row.name} × ${columnLabel(column)}: ${name} (${code})` : `${row.name} × ${columnLabel(column)} (${code})`}
          aria-describedby={describedBy(isChanged, isProtected, stateId)} title={name}
          checked={checked} disabled={disabled || !editable || (!allowAdd && !checked)}
          onCheckedChange={(next) => onChangeOperations([key], next === true)} className={CHANGED_CLASS} />
        {labelled && <span aria-hidden="true" className="whitespace-nowrap text-xs">{name}</span>}
        {stateText(stateId, name)}
        {isProtected && protectedMarker}
      </span>
    );
  };

  /** 권한이 여럿인 칸 — 24px 'k/n' 버튼이 권한마다 고르는 창을 연다. 이름은 보이는 수를 담는다(WCAG 2.5.3). */
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
            <Button type="button" variant="outline" size="xs" {...cellAttributes(row, column, isChanged)}
              aria-label={`${row.name} × ${columnLabel(column)} ${selected}/${codes.length}`} aria-describedby={describedBy(isChanged, isProtected, stateId)}
              title={summary} className={cn('px-1.5 text-xs tabular-nums', CHANGED_CLASS)}>
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
      if (entry.state === 'open') return <span className="whitespace-nowrap text-xs text-muted-foreground">로그인만 하면 열림</span>;
      if (entry.state === 'unregistered') return <span className="whitespace-nowrap text-xs text-muted-foreground">등록되지 않은 화면</span>;
      if (entry.state === 'unlisted') return <span className="whitespace-nowrap text-xs text-muted-foreground">화면 목록에 없는 경로</span>;
      if (entry.state === 'unknown') return <span className="whitespace-nowrap text-xs text-muted-foreground">기능 목록에 없는 권한</span>;
      if (entry.codes.length === 1) return singleCode(row, 'entry', entry.codes[0]);
      if (entry.mode === 'ALL') return allEntry(row, entry.codes);
      return multipleCodes(row, 'entry', entry.codes, '하나라도 있으면 이 화면에 들어갈 수 있습니다.');
    }
    const codes = cellCodes(row, column);
    if (codes.length === 0) return null;
    if (codes.length === 1) return singleCode(row, column, codes[0]);
    return multipleCodes(row, column, codes, '권한마다 따로 켜고 끕니다. 같은 권한은 다른 화면에서도 켜진 상태로 보입니다.');
  };

  /**
   * 영역·섹션 줄의 칸 — 아래 화면 전체를 한 번에(보호 권한·타인 자료 권한·다른 화면 진입 권한 제외, 검색·거르기 중이면 보이는 화면만).
   * '화면 진입' 칸은 보호·타인 자료 진입 권한이 필요한 화면을 빼고 '직접 고르기 n'으로 센다(aggregateCell, H3). 그런 화면만 있으면
   * 체크박스 대신 그 수를 글자로 보인다 — 빈 칸으로 두면 아래에 진입 권한이 필요한 화면이 있다는 사실이 사라진다.
   */
  const groupCell = (row: ScreenRow, column: Exclude<ScreenColumnKey, 'navigation'>): ReactNode => {
    const under = rowsForGroup(row);
    const aggregate = aggregateCell(under, column, selection, allowAdd);
    if (!aggregate) return null;
    const manual = aggregate.manual.length;
    const manualNote = manual > 0 ? ` · 직접 고르기 ${manual}(보호·타인 자료 권한이 필요한 화면)` : '';
    if (aggregate.total === 0) {
      return (
        <span className="whitespace-nowrap text-xs text-muted-foreground" title={`${scopeLabel} 화면 ${manual}개는 보호·타인 자료 권한이 필요해 화면 줄에서 직접 고릅니다`}>
          직접 고르기 {manual}
        </span>
      );
    }
    // 바뀐 칸 표시는 그 열의 아래 칸 전체를 본다 — 묶음 칸이 다루지 않는 칸(보호·타인 자료 권한)이 바뀌어도 그 줄 아래에 바뀐 것이 있다고 알린다.
    const codes = column === 'entry' ? [...new Set(under.flatMap((entry) => (entry.entry?.state === 'gated' ? entry.entry.codes : [])))] : [...new Set(under.flatMap((entry) => entry.codes[column]))];
    const isChanged = anyChanged(codes);
    const state = aggregate.selected === aggregate.total ? true : aggregate.selected > 0 ? 'indeterminate' : false;
    const summary = column === 'entry'
      ? `${scopeLabel} 화면 ${aggregate.total}개 중 ${aggregate.selected}개 · ${GROUP_ENTRY_EXCLUSIONS}${manualNote}`
      : `${scopeLabel} 권한 ${aggregate.total}개 중 ${aggregate.selected}개 · ${GROUP_CODE_EXCLUSIONS}`;
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

  /** 메뉴 표시 칸이 다루는 메뉴 — 화면 줄은 그 메뉴 자신, 묶음 줄은 줄 자신과 아래 메뉴(검색·거르기 중이면 보이는 메뉴). */
  const navigationCodes = (row: ScreenRow): string[] => (isGroupRow(row)
    ? navigationCodesUnder(model, row, narrowed ? visibleKeys : undefined)
    : [row.menuCode!]);

  const navigationCell = (row: ScreenRow) => {
    if (row.kind !== 'menu' || !row.menuCode) return null;
    if (!isGroupRow(row)) {
      const key = `NAVIGATION:${row.menuCode}`;
      const isChanged = changed(key);
      return (
        <Checkbox {...cellAttributes(row, 'navigation', isChanged)} aria-label={`${row.name} × 메뉴 표시 (${row.menuCode})`}
          aria-describedby={describedBy(isChanged, false)} checked={selection.has(key)} disabled={disabled || !editable}
          onCheckedChange={(next) => onToggleNavigation(row.menuCode!, next === true)} className={CHANGED_CLASS} />
      );
    }
    // 영역·섹션 줄 — 그 아래 메뉴 표시 전체(시안 의미). 상태는 다루는 메뉴의 집계다.
    const codes = navigationCodes(row);
    const selected = codes.filter((code) => selection.has(`NAVIGATION:${code}`)).length;
    const state = selected === codes.length ? true : selected > 0 ? 'indeterminate' : false;
    const isChanged = codes.some((code) => changed(`NAVIGATION:${code}`));
    const own = selection.has(`NAVIGATION:${row.menuCode}`);
    const summary = `${scopeLabel} 메뉴 ${codes.length}개 중 ${selected}개 표시 · 이 메뉴 ${own ? '표시' : '표시 안 함'} · 끄면 아래 메뉴 전체를 끕니다`;
    const stateId = stateIdOf(row, 'navigation');
    return (
      <span className="inline-flex items-center gap-1">
        <Checkbox {...cellAttributes(row, 'navigation', isChanged)} aria-label={`${row.name} × 메뉴 표시 (${row.menuCode})`}
          aria-describedby={describedBy(isChanged, false, stateId)} title={summary}
          checked={state} disabled={disabled || !editable}
          onCheckedChange={() => onToggleNavigationSubtree(row.menuCode!, codes, state !== true)} className={CHANGED_CLASS} />
        <span aria-hidden="true" className="text-xs tabular-nums text-muted-foreground">{selected}/{codes.length}</span>
        {stateText(stateId, summary)}
      </span>
    );
  };

  /**
   * 영역·섹션 줄의 상태 — '보임 n/m · 경고 n'과 그 섹션의 자동 가능한 진입 권한만 더하는 '진입 권한 추가'. 보호·타인 자료 권한이
   * 필요하거나 후보가 여럿인 메뉴는 빠지고 '직접 고르기 n'으로 센다(sectionStatus, H3). 더할 권한 목록은 '현재 줄' 띠가 글자로 보인다.
   */
  const sectionStatusCell = (row: ScreenRow) => {
    const status = sectionStatus(rowsForGroup(row), preview, selection, entryFixes.fixByMenu);
    if (status.total === 0) return null;
    const addsId = `${descriptionId}-section-adds-${rowIndex.get(row.key)}`;
    const adds = `더할 권한: ${status.autoCodes.map(entryFixes.describe).join(', ')}`;
    return (
      <div className="flex items-center gap-1.5 whitespace-nowrap text-left text-xs">
        <span className="text-muted-foreground">보임 {status.visible}/{status.total}</span>
        {status.warnings > 0 && <span className="font-medium text-destructive-emphasis">· 경고 {status.warnings}</span>}
        {entryFixes.editable && status.manualMenus.length > 0 && <span className="text-muted-foreground">· 직접 고르기 {status.manualMenus.length}</span>}
        {entryFixes.editable && status.autoCodes.length > 0 && (
          <>
            {/* 더할 권한은 설명(보조기술)·title(마우스)·'현재 줄' 띠(누르거나 키보드로 옮긴 줄, 모든 입력)로 누르기 전에 알 수 있다. */}
            <Button type="button" variant="outline" size="xs" disabled={entryFixes.disabled}
              aria-label={`${row.name} 아래 메뉴 ${status.autoMenus.length}개 진입 권한 추가`} aria-describedby={addsId} title={adds}
              onClick={() => entryFixes.add(status.autoCodes,
                () => `${row.name} 아래 메뉴 ${status.autoMenus.length}개의 진입 권한을 추가했습니다. '권한 변경 저장'으로 저장하세요.`, row.menuCode ?? undefined)}>
              진입 권한 추가
            </Button>
            <span id={addsId} className="sr-only">{adds}</span>
          </>
        )}
      </div>
    );
  };

  /** '현재 줄' 띠에 이름 다음으로 보일 사실들(이름·경로·화면 진입에 필요한 권한, 섹션 줄은 일괄로 더할 권한). */
  const currentRowFacts = (row: ScreenRow): string[] => {
    const facts: string[] = [];
    if (row.unused) facts.push('사용 안 함');
    if (row.route) facts.push(row.route);
    if (row.entry) facts.push(entrySentence(row.entry, permissionLabel));
    if (row.kind === 'menu' && isGroupRow(row)) {
      const status = sectionStatus(rowsForGroup(row), preview, selection, entryFixes.fixByMenu);
      if (entryFixes.editable && status.autoCodes.length > 0) facts.push(`'진입 권한 추가'가 더할 권한: ${status.autoCodes.map(permissionLabel).join(', ')}`);
      if (entryFixes.editable && status.manualMenus.length > 0) facts.push(`화면 줄에서 직접 고를 메뉴 ${status.manualMenus.length}개`);
      // '화면 진입' 묶음 칸이 빼는 화면(보호·타인 자료 진입 권한 필요) — 칸에는 수만 있으므로 이름을 글자로 보인다(헌법 제16조 3항).
      const entryManual = aggregateCell(rowsForGroup(row), 'entry', selection, allowAdd)?.manual ?? [];
      if (entryManual.length > 0) facts.push(`'화면 진입' 칸에서 빠져 직접 고를 화면(보호·타인 자료 권한 필요): ${entryManual.map((entry) => entry.name).join(', ')}`);
    } else if (row.menuCode) {
      const fix = entryFixes.fixByMenu.get(row.menuCode);
      if (fix?.kind === 'choose') facts.push(`진입 권한 후보: ${fix.candidates.map(permissionLabel).join(' 또는 ')}`);
    }
    return facts;
  };
  const currentRow = currentRowKey ? model.byKey.get(currentRowKey) : undefined;

  const statusCell = (row: ScreenRow) => {
    if (row.kind === 'menu' && isGroupRow(row)) return sectionStatusCell(row);
    const status = screenRowStatus(row, preview, selection);
    const fix = row.menuCode ? entryFixes.fixByMenu.get(row.menuCode) : undefined;
    if (!status && !fix) return null;
    return (
      <div className="flex items-center gap-1.5 whitespace-nowrap text-left">
        {status && <span className={cn('text-xs', status.tone === 'problem' ? 'font-medium text-destructive-emphasis' : status.tone === 'ok' ? 'text-foreground' : 'text-muted-foreground')}>{status.label}</span>}
        {fix && <EntryFixControl state={entryFixes} fix={fix} />}
      </div>
    );
  };

  return (
    <div ref={containerRef} role="group" aria-label="화면별 권한 선택" className={cn('flex flex-col gap-2', fill && WORK_FILL_REGION_CLASS)} onKeyDown={handleSaveKey}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="shrink-0">화면 검색</span>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="메뉴 이름·경로·권한 코드" className="h-[var(--control-h-sm)] w-56" />
        </label>
        <Button type="button" variant="outline" size="sm" aria-pressed={problemOnly !== null} aria-disabled={problemUnavailable || undefined}
          className={NARROW_BUTTON_CLASS} onClick={toggleProblemOnly}>
          {problemUnavailable ? '문제 줄 없음' : `문제 줄만${problemOnly === null ? ` ${problemKeys.length}` : ''}`}
        </Button>
        <Button type="button" variant="outline" size="sm" aria-pressed={changedOnly !== null} aria-disabled={changedUnavailable || undefined}
          className={NARROW_BUTTON_CLASS} onClick={toggleChangedOnly}>
          {changedUnavailable ? '바뀐 줄 없음' : '바뀐 줄만'}
        </Button>
        <p className="text-sm" aria-live="polite">{unsavedChangeCount > 0 ? `바꾼 권한 ${unsavedChangeCount}개` : ''}</p>
        {/* '이 표 읽는 법'은 도구 줄 오른쪽 끝(ml-auto)에 두지 않고 거르기 단추 뒤에 잇는다(2026-10-05 실측 반영). 오른쪽 끝에 붙이면 글자 끝이
            스크롤 상자(탭 내용)의 잘림 경계와 표의 오른쪽 테두리에 맞닿아, 바로 아래 가로로 잘려 나간 표 머리와 함께 마지막 글자가 잘린 것처럼
            보였고(1366×768) 포커스 표시도 경계에 붙었다. 줄이 모자라면 줄째 다음 줄로 내려가고(flex-wrap), 글자는 한 줄을 지킨다. */}
        <details className="open:basis-full">
          <summary className="w-fit cursor-pointer whitespace-nowrap text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">이 표 읽는 법</summary>
          <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p>메뉴 표시는 사이드바에 메뉴를 보이게 하고, 화면 진입·등록·수정·삭제·그 밖의 기능은 기능권한입니다. 둘은 서로 다른 권한이며 &apos;권한 변경 저장&apos;으로 함께 저장됩니다.</p>
            <p>메뉴가 표시되려면 해당 메뉴와 모든 상위 메뉴가 선택되어 있고 사용 중이어야 합니다. 화면 줄의 메뉴 표시를 켜면 상위 메뉴도 함께 켜지고, 상위 메뉴를 끄면 하위 메뉴도 함께 꺼집니다. 영역·섹션 줄의 메뉴 표시 칸은 그 아래 메뉴 전체를 한 번에 켜고 끕니다 — 켤 때는 화면 검색·거르기로 보이는 메뉴만 켜고, 끌 때는 아래 메뉴 전체를 끕니다.</p>
            <p>메뉴 숨김은 기능권한을 회수하지 않습니다. 기능권한이 있으면 직접 URL로 화면을 열 수 있으며, 실제 조회·변경에는 기능권한과 자료별 접근 조건이 적용됩니다. 상태 칸은 이 그룹의 권한만으로 본 결과입니다 — 사용자에게는 배정된 모든 그룹의 권한이 합쳐집니다.</p>
            <p>메뉴 표시를 줬어도 그 화면의 진입 권한이 이 그룹에 없으면, 다른 그룹이 그 화면의 조회 기능을 주지 않는 한 사용자에게 메뉴가 보이지 않습니다. 상태 칸의 &apos;+ 권한 이름&apos;·&apos;권한 추가&apos;·&apos;진입 권한 추가&apos; 단추는 진입 권한을 저장하지 않은 변경에 더하고, &apos;권한 변경 저장&apos;으로 함께 저장됩니다. 섹션 줄의 &apos;진입 권한 추가&apos;는 보호 권한·타인 자료 권한(…_ALL)이 필요하거나 후보가 여럿인 메뉴를 빼고(&apos;직접 고르기 n&apos;), 그런 메뉴는 화면 줄에서 고릅니다.</p>
            <p>{PROTECTED_DESCRIPTION}</p>
            <p>영역·섹션 줄의 칸은 아래 화면의 권한을 한 번에 켜고 끕니다. 타인 자료 권한(…_ALL)과 다른 화면에 들어가는 진입 권한도 인가 의미가 달라 일괄 선택에서 빠지므로, 화면 줄의 칸에서 따로 고르세요. 화면 검색이나 거르기 중에는 보이는 화면만 바꿉니다.</p>
            <p>영역·섹션 줄의 &apos;화면 진입&apos; 칸은 들어갈 수 없는 화면마다 필요한 진입 권한만 더하고(후보가 여럿이면 조회 하나), 모두 들어갈 수 있으면 그 진입 권한을 끕니다. 보호 권한·타인 자료 권한(…_ALL)이 있어야 들어가는 화면은 이 칸이 더하지도 끄지도 않고 &apos;직접 고르기 n&apos;으로 세므로, 그 화면 줄의 칸에서 고르세요.</p>
            <p>&apos;문제 줄만&apos;·&apos;바뀐 줄만&apos;은 누른 때의 줄을 고정해 보입니다 — 고치는 동안 줄이 사라지지 않습니다. 다시 누르면 모든 줄을 보입니다.</p>
            <p>표 아래 &apos;현재 줄&apos;은 마지막으로 누르거나 키보드로 옮긴 줄의 이름 전체·경로·필요한 권한을 보입니다.</p>
          </div>
        </details>
      </div>
      <span id={changedDescriptionId} className="sr-only">저장하지 않은 변경</span>
      {/* 보호 권한 설명은 닫힌 '이 표 읽는 법' 밖에 늘 둔다 — 닫힌 details 안을 가리키는 설명은 브라우저 접근성 트리에서 비어 버린다
          (2026-10-05 반박 리뷰 CDP 실측, jsdom 은 이를 모델링하지 않아 계약은 대상이 details 밖인지를 본다). */}
      <span id={protectedDescriptionId} className="sr-only">{PROTECTED_DESCRIPTION}</span>
      {model.rows.length === 0 ? <p role="status" className="text-sm text-muted-foreground">표시할 메뉴와 화면이 없습니다.</p>
        : rows.length === 0 ? <p role="status" className="text-sm">조건에 맞는 메뉴나 화면이 없습니다.</p> : (
          <PermissionScrollRegion label="화면별 권한 표 스크롤 영역" fill={fill} scrollPaddingClassName={SCROLL_PADDING_CLASS}>
            <table ref={tableRef} className="w-full border-separate border-spacing-0 text-left text-sm" onKeyDown={handleTableKeyDown}>
              <caption className="sr-only">메뉴와 화면별 권한 선택. 칸에서 방향키로 이동하고 Space로 바꿉니다. 바꾼 칸은 저장해야 반영됩니다.</caption>
              <thead>
                <tr>
                  <th scope="col" className={`sticky left-0 top-0 z-30 ${NAME_COLUMN_CLASS} border-b border-border bg-muted ${CELL_PAD} text-xs font-semibold`}>메뉴·화면</th>
                  {SCREEN_PERMISSION_COLUMNS.map((column) => (
                    <th key={column.key} scope="col" className={`sticky top-0 z-20 whitespace-nowrap border-b border-border bg-muted ${CELL_PAD} text-center text-xs font-semibold`}>{column.label}</th>
                  ))}
                  <th scope="col" className={`sticky top-0 z-20 whitespace-nowrap border-b border-border bg-muted ${CELL_PAD} text-xs font-semibold`}>상태</th>
                </tr>
              </thead>
              {/* '현재 줄' — 키보드 포커스·키 입력은 바로, 포인터는 뗀 뒤(click) 갱신한다. 고르는 창(포털) 안의 이벤트는 줄이 없어 무시한다.
                  click 은 칸·단추가 이미 처리하는 동작에 덧붙는 표시 갱신일 뿐이고, 같은 일을 키보드는 focus·keyup 이 한다. */}
              <tbody
                onPointerDownCapture={() => { pointerPressedRef.current = true; }}
                onFocus={(event) => {
                  if (pointerPressedRef.current) return;
                  const key = rowKeyOf(event.target);
                  if (key) setCurrentRowKey(key);
                }}
                onKeyUp={(event) => {
                  const key = rowKeyOf(event.target);
                  if (key) setCurrentRowKey(key);
                }}
                onClick={(event) => {
                  const key = rowKeyOf(event.target);
                  if (key) setCurrentRowKey(key);
                }}>
                {rows.map((row) => {
                  const group = isGroupRow(row);
                  const open = narrowed ? true : expanded.has(row.key);
                  const columnCell = (column: Exclude<ScreenColumnKey, 'navigation'>) => (row.kind === 'unmatched-group' ? null : group ? groupCell(row, column) : screenCell(row, column));
                  const navigationChanged = row.kind === 'menu' && !!row.menuCode && navigationCodes(row).some((code) => changed(`NAVIGATION:${code}`));
                  const routeId = `${descriptionId}-route-${rowIndex.get(row.key)}`;
                  return (
                    <tr key={row.key} data-screen-row-key={row.key} data-current={currentRowKey === row.key ? 'true' : undefined}
                      data-unused={row.unused ? 'true' : undefined}>
                      <th scope="row" data-row-key={row.key} tabIndex={-1} aria-label={row.name} aria-describedby={row.route ? routeId : undefined}
                        className={cn(`sticky left-0 z-10 ${NAME_COLUMN_CLASS} border-b border-border bg-card ${CELL_PAD} text-left font-normal`,
                          // '현재 줄' 띠가 가리키는 줄 — 왼쪽 안쪽 선으로 잇는다(배치를 바꾸지 않는 그림자).
                          currentRowKey === row.key && 'shadow-[inset_3px_0_0_0_var(--color-primary)]')}>
                        {/* 내용 폭을 첫 열 폭 안으로 묶는다 — 표 칸의 max-width 는 자동 배치에서 지켜지지 않아, 안쪽 상자가 말줄임의 기준이다. */}
                        <div className="flex max-w-[13.5rem] items-center gap-1" style={{ paddingLeft: `${row.depth}rem` }}>
                          {group ? <Button type="button" variant="ghost" size="icon-xs" aria-expanded={open} disabled={narrowed}
                            aria-label={`${row.name} 하위 메뉴 ${open ? '접기' : '펼치기'}`} onClick={() => toggleExpanded(row.key)}>
                            {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
                          </Button> : <span aria-hidden="true" className="w-6 shrink-0" />}
                          {/* 이름은 한 줄 말줄임이다 — 줄 높이를 바꾸지 않는다(포커스로 펼치면 칸이 밀려 첫 클릭이 빗나갔다). 이름 전체·경로는
                              표 아래 '현재 줄' 띠가 글자로 보인다(hover 의 title 에만 두지 않는다 — 헌법 제16조 2·3항). */}
                          <span title={row.route ? `${row.name} · ${row.route}` : row.name}
                            className={cn('min-w-0 truncate', group ? 'font-semibold' : 'font-medium')}>
                            {row.name}
                          </span>
                          {row.kind === 'unmatched-group' && <span className="shrink-0 text-xs font-normal text-muted-foreground">{row.childKeys.length}개</span>}
                          {row.unused && <span className="shrink-0 rounded border border-border px-1 text-xs font-normal text-muted-foreground">사용 안 함</span>}
                          {row.route && <span id={routeId} className="sr-only">{row.route}</span>}
                        </div>
                      </th>
                      <td className={cn(CELL_CLASS, navigationChanged && 'bg-primary/10')}>{navigationCell(row)}</td>
                      {(['entry', 'create', 'update', 'delete', 'other'] as const).map((column) => (
                        <td key={column} className={CELL_CLASS}>{columnCell(column)}</td>
                      ))}
                      <td className={`border-b border-border ${CELL_PAD}`}>{statusCell(row)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </PermissionScrollRegion>
        )}
      {rows.length > 0 && (
        // '현재 줄' 띠 — 알림 영역이 아니다(칸을 옮길 때마다 읽지 않는다). 같은 사실은 칸·머리글의 설명이 보조기술에 싣는다.
        <p data-testid="screen-permission-current-row" className="min-h-4 shrink-0 break-words text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">현재 줄</span>{' '}
          {currentRow ? <>
            <span className="font-medium text-foreground">{currentRow.name}</span>
            {currentRowFacts(currentRow).map((fact) => <span key={fact}> · <span className={fact.startsWith('/') ? 'break-all' : undefined}>{fact}</span></span>)}
          </> : '— 줄을 누르거나 키보드로 옮기면 이름 전체·경로·필요한 권한을 여기에 보입니다.'}
        </p>
      )}
    </div>
  );
}
