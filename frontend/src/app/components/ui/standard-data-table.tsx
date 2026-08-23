import React, { useState, useMemo, memo, useCallback, useEffect } from 'react';
import {
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Search, X, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { ErrorStateDisplay, EmptyStateDisplay } from './status-displays';
import { useOverflowRegion } from '@/components/ui/table';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T, index?: number) => React.ReactNode);
  className?: string;
  /**
   * 지정한 열만 클릭 정렬이 켜진다(opt-in). 미지정 열은 종전과 완전히 동일하다.
   * 정렬 값은 표시 accessor 가 아니라 이 키의 원시 값이며, **현재 페이지 데이터에 한한**
   * 클라이언트 정렬이다 — 서버 페이지네이션·서버 정렬 계약은 바꾸지 않는다.
   */
  sortKey?: keyof T;
}

/**
 * headless TanStack Table 기능 셋 (모듈 정적 1회 구성).
 * 마크업·role·data-label 은 전부 이 컴포넌트의 JSX 가 소유하고, TanStack 은
 * row model(정렬 순서·row id)과 정렬 상태 머신만 제공한다.
 */
const standardTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
});
type StandardTableFeatures = typeof standardTableFeatures;

/**
 * 우리 Column<T> 계약 → TanStack ColumnDef 어댑터.
 * 표시용 accessor 는 ColumnDef 에 넣지 않는다 — 셀 렌더는 DataRow 가 행×열당 정확히
 * 1회 실행한다(단일 렌더 계약, ADR-0006). sortKey 열만 정렬용 accessorFn 을 가진다.
 */
function buildColumnDefs<T extends object>(columns: Column<T>[]): ColumnDef<StandardTableFeatures, T>[] {
  return columns.map((column, index) => {
    const { sortKey } = column;
    if (sortKey === undefined) {
      return { id: `col-${index}`, enableSorting: false };
    }
    return {
      id: `col-${index}`,
      accessorFn: (item: T) => item?.[sortKey],
      enableSorting: true,
      // 숫자 열의 auto 방향(desc 우선)을 무시하고 모든 열이 none→asc→desc→none 으로 순환한다.
      sortDescFirst: false,
    };
  });
}

interface BulkAction<T> {
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline';
  onClick: (selectedItems: T[]) => void;
}

interface StandardDataTableBaseProps<T> {
  columns: Column<T>[];
  data: T[];
  /** 스크린리더가 같은 화면의 여러 표를 구분할 수 있는 이름. */
  accessibleLabel?: string;
  loading?: boolean;
  emptyMessage?: string;
  enableSelection?: boolean;
  bulkActions?: BulkAction<T>[];
  keyField?: keyof T;
  className?: string;
  isPremium?: boolean;
  /** ErrorStateDisplay와 동일하게 문자열·axios 오류·Error를 모두 전달할 수 있다. */
  error?: unknown;
  onRetry?: () => void;
  pagination?: {
    /** 1-base 현재 페이지 번호 */
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    /** 서버가 내려준 총 건수. 주면 '총 N건 · n/m 페이지' 요약이 노출된다. */
    totalCount?: number;
    /** 페이지당 건수(요약/페이저 계산 보조). 미지정 시 10 */
    pageSize?: number;
    /**
     * 지정한 경우에만 요약 옆에 페이지당 건수 셀렉트가 노출된다(opt-in).
     * 미지정 시 기존 소비자 DOM 은 한 글자도 달라지지 않는다.
     */
    onPageSizeChange?: (size: number) => void;
    /** onPageSizeChange 지정 시 선택지. 기본 [10, 20, 50, 100] */
    pageSizeOptions?: number[];
  };
  search?: {
    placeholder?: string;
    onSearch: (keyword: string) => void;
    /**
     * 외부에서 검색어를 주입/초기화할 때 사용(URL 쿼리·필터 리셋 등).
     * 값이 바뀌면 내부 입력값이 동기화된다. 미지정 시 컴포넌트 내부 상태로 동작(기존 계약).
     */
    value?: string;
    /** 지우기 버튼 동작. 미지정 시 onSearch('') 로 대체된다. */
    onClear?: () => void;
  };
  stickyHeader?: boolean;
  rowTestId?: string;
}

export type RowActionLabel<T> = string | ((item: T, index: number) => string);

/**
 * 행 작업이 있으면 호출부가 실제 intent를 명시해야 한다. 선택·토글을 "상세 보기"로
 * 오표기하지 않도록 onRowClick과 rowActionLabel을 타입 단계에서 함께 묶는다.
 */
type StandardDataTableRowActionProps<T> =
  | {
      onRowClick: (item: T) => void;
      rowActionLabel: RowActionLabel<T>;
    }
  | {
      onRowClick?: undefined;
      rowActionLabel?: never;
    };

export type StandardDataTableProps<T> = StandardDataTableBaseProps<T> & StandardDataTableRowActionProps<T>;

interface DataRowProps<T extends object> {
  item: T;
  columns: Column<T>[];
  isSelected: boolean;
  index: number;
  enableSelection: boolean;
  onToggle: () => void;
  onRowClick?: (item: T) => void;
  rowActionLabel?: string;
  rowTestId?: string;
}

function renderCell<T extends object>(column: Column<T>, item: T, index: number): React.ReactNode {
  return typeof column.accessor === 'function'
    ? column.accessor(item, index)
    : item[column.accessor] as React.ReactNode;
}

function resolveRowActionLabel<T extends object>(
  label: RowActionLabel<T> | undefined,
  item: T,
  index: number,
): string {
  const resolved = typeof label === 'function' ? label(item, index) : label;
  return resolved?.trim() || `${index + 1}번째 항목 작업`;
}

function DataRowComponent<T extends object>({
  item,
  columns,
  isSelected,
  index,
  enableSelection,
  onToggle,
  onRowClick,
  rowActionLabel,
  rowTestId
}: DataRowProps<T>) {
  if (!item) return null;

  return (
    <tr
      data-testid={rowTestId}
      className={cn(
        "group transition-all duration-300 outline-none focus-within:bg-muted/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
        isSelected ? "bg-primary/5" : "hover:bg-muted/40"
      )}
    >
      {enableSelection && (
        <td className="px-[var(--cell-px)] py-4 text-center" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggle}
            aria-label="항목 선택"
          />
        </td>
      )}
      {columns.map((column, colIdx) => (
        <td
          key={`row-cell-${colIdx}`}
          // md 미만에서 thead 가 시각적으로 숨겨지므로 각 셀이 자기 열 이름을 스스로 보여줘야 한다.
          // 문자열 header 만 라벨로 쓴다(ReactNode header 는 CSS content 로 표현할 수 없다).
          data-label={typeof column.header === 'string' ? column.header : undefined}
          className={cn(
            "px-[var(--cell-px)] py-[var(--cell-py)] text-sm font-medium text-foreground/80 tracking-tight transition-colors group-hover:text-foreground",
            column.className
          )}
        >
          <div className="outline-none">
            {renderCell(column, item, index)}
          </div>
        </td>
      ))}
      {onRowClick && (
        <td className="px-[var(--cell-px)] py-[var(--cell-py)] text-right">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={rowActionLabel}
            onClick={() => onRowClick(item)}
          >
            {rowActionLabel}
          </Button>
        </td>
      )}
    </tr>
  );
}

// React.memo 의 기본 선언은 제네릭 함수의 T 를 unknown 으로 지운다. 구현 시그니처를
// 다시 노출해 columns/data/onRowClick 이 같은 행 타입으로 끝까지 결속되게 한다.
const DataRow = memo(DataRowComponent) as typeof DataRowComponent;

const EMPTY_SELECTED_IDS = new Set<unknown>();

export function StandardDataTable<T extends object>({
  columns,
  data,
  accessibleLabel = "데이터 목록",
  loading,
  onRowClick,
  rowActionLabel,
  emptyMessage = "데이터가 없습니다.",
  enableSelection = false,
  bulkActions = [],
  keyField: keyFieldProp,
  className,
  isPremium = true,
  error = null,
  onRetry,
  pagination,
  search,
  stickyHeader = true,
  rowTestId
}: StandardDataTableProps<T>) {

  const keyField = (keyFieldProp ?? ('id' as keyof T)) as keyof T;

  const [searchKeyword, setSearchKeyword] = useState(search?.value ?? "");
  /** 실제로 서버/상위에 제출된 검색어 (빈 결과 문구·선택 초기화 기준) */
  const [appliedKeyword, setAppliedKeyword] = useState(search?.value ?? "");

  // 외부 주입값(search.value) 변화를 내부 입력값에 동기화 — 렌더 중 조정 패턴(effect 불필요)
  const externalKeyword = search?.value;
  const [syncedKeyword, setSyncedKeyword] = useState(externalKeyword);
  if (externalKeyword !== syncedKeyword) {
    setSyncedKeyword(externalKeyword);
    setSearchKeyword(externalKeyword ?? "");
    setAppliedKeyword(externalKeyword ?? "");
  }

  const currentPage = pagination?.currentPage;

  // 선택 집합을 페이지/적용 검색어 범위에 귀속한다. 범위가 바뀐 첫 렌더부터 빈 집합으로
  // 보이므로 effect 의 후행 setState·추가 렌더 없이 이전 페이지 선택이 섞이지 않는다.
  const [selectionState, setSelectionState] = useState<{
    currentPage: number | undefined;
    appliedKeyword: string;
    ids: Set<unknown>;
  }>(() => ({ currentPage, appliedKeyword, ids: new Set() }));
  const selectionMatchesScope = selectionState.currentPage === currentPage
    && selectionState.appliedKeyword === appliedKeyword;
  const selectedIds = selectionMatchesScope ? selectionState.ids : EMPTY_SELECTED_IDS;
  const setSelectedIds = useCallback((action: React.SetStateAction<Set<unknown>>) => {
    setSelectionState(previous => {
      const previousIds = previous.currentPage === currentPage
        && previous.appliedKeyword === appliedKeyword
        ? previous.ids
        : EMPTY_SELECTED_IDS;
      const ids = typeof action === 'function' ? action(previousIds) : action;
      return { currentPage, appliedKeyword, ids };
    });
  }, [currentPage, appliedKeyword]);

  // keyField 미전달 경고 (개발 모드 전용, 1회만)
  const keyFieldWarnedRef = React.useRef(false);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || keyFieldProp !== undefined || keyFieldWarnedRef.current) return;
    const rows = data || [];
    if (rows.length > 0) keyFieldWarnedRef.current = true;
    if (rows.length > 0 && rows.some(item => item && Reflect.get(item, 'id') === undefined)) {
      console.warn(
        '[StandardDataTable] keyField 가 지정되지 않아 기본값 "id" 를 사용하는데 데이터에 id 가 없습니다. ' +
        '행 key 와 선택 상태가 인덱스로 대체되어 정렬/페이지 이동 시 오작동할 수 있습니다. keyField 를 명시하세요.'
      );
    } else if (enableSelection && rows.length > 0) {
      console.warn('[StandardDataTable] enableSelection 사용 시 keyField 를 명시하는 것을 권장합니다(현재 기본값 "id").');
    }
  }, [keyFieldProp, data, enableSelection]);

  const selectedItems = useMemo(() =>
    (data || []).filter(item => item && selectedIds.has(item?.[keyField])),
    [data, selectedIds, keyField]
  );

  const toggleAll = useCallback(() => {
    if (selectedIds.size === (data || []).length && (data || []).length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set((data || []).filter(item => item && item?.[keyField] !== undefined).map(item => item?.[keyField])));
    }
  }, [data, selectedIds.size, keyField, setSelectedIds]);

  const toggleOne = useCallback((id: unknown) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [setSelectedIds]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedKeyword(searchKeyword);
    search?.onSearch(searchKeyword);
  };

  const handleSearchClear = () => {
    setSearchKeyword("");
    setAppliedKeyword("");
    if (search?.onClear) search.onClear();
    else search?.onSearch("");
  };

  const resolvedEmptyMessage = search && appliedKeyword
    ? `"${appliedKeyword}"에 대한 검색 결과가 없습니다.`
    : emptyMessage;

  // 페이지 번호 윈도우 (PagePagination 과 동일 규칙: 최대 5개 + 앞뒤 생략부호)
  const totalPages = Math.max(pagination?.totalPages ?? 0, 0);
  const pageNumbers = useMemo(() => {
    if (!currentPage || totalPages < 1) return [] as number[];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    const pages: number[] = [];
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  // 현재 페이지가 보여주는 레코드 구간 (totalCount + pageSize 를 모두 준 경우에만)
  const totalCount = pagination?.totalCount;
  const pageSize = pagination?.pageSize;
  const rowRange = (currentPage && pageSize && pageSize > 0 && totalCount !== undefined && totalCount > 0)
    ? { from: (currentPage - 1) * pageSize + 1, to: Math.min(currentPage * pageSize, totalCount) }
    : null;
  const desktopScrollRegionProps = useOverflowRegion<HTMLDivElement>(`${accessibleLabel} 스크롤 영역`);

  // headless TanStack Table — row model(정렬 순서·row id)과 정렬 상태만 위임한다.
  // 마크업·role·data-label·선택 상태는 종전 그대로 이 컴포넌트가 소유한다(ADR-0006 DOM 불변).
  const tableData = useMemo(() => data ?? [], [data]);
  const columnDefs = useMemo(() => buildColumnDefs(columns), [columns]);
  const getRowId = useCallback(
    (item: T, index: number) => String(item?.[keyField] ?? index),
    [keyField],
  );
  const table = useTable({
    features: standardTableFeatures,
    data: tableData,
    columns: columnDefs,
    getRowId,
  });
  const leafColumns = table.getAllLeafColumns();
  const tableRows = table.getRowModel().rows;

  return (
    <div className={cn("space-y-6", isPremium ? "animate-in fade-in slide-in-from-bottom-4 duration-700" : "", className)}>
      {/* Search Bar integration if provided */}
      {search && (
        <form onSubmit={handleSearchSubmit} role="search" className="relative group max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" aria-hidden="true" />
          <Input
            placeholder={search.placeholder || "검색어 입력..."}
            className="h-12 pl-12 pr-28 rounded-lg border-2 bg-card ring-offset-0 focus:ring-4 focus:ring-primary/5 transition-all font-bold text-sm"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            aria-label="데이터 검색"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchKeyword.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={handleSearchClear}
                aria-label="검색어 지우기"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
            <Button type="submit" size="sm" className="h-8 px-3 rounded-lg text-xs font-bold tracking-wider">
              검색
            </Button>
          </div>
        </form>
      )}

      {/* Floating Bulk Action Bar - Enterprise Premium Style */}
      <AnimatePresence>
        {enableSelection && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.95 }}
            className="fixed bottom-6 sm:bottom-12 left-1/2 -translate-x-1/2 z-[100] flex flex-col sm:flex-row items-center justify-between w-[95vw] sm:w-auto sm:min-w-[580px] max-w-[95vw] p-3 sm:p-2 bg-surface-inverse/95 backdrop-blur-2xl text-surface-inverse-foreground rounded-2xl shadow-2xl border border-white/10 overflow-hidden gap-3 sm:gap-0"
            role="toolbar"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-30 pointer-events-none" />
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-6 px-3 sm:px-6 relative z-10 w-full sm:w-auto">
              <div className="flex flex-col items-center sm:items-start shrink-0">
                <span className="text-[10px] font-black opacity-40 tracking-[0.3em] uppercase">선택 항목 제어</span>
                <div className="flex items-center gap-1.5 leading-none mt-1">
                  <span className="text-lg sm:text-xl font-black text-primary leading-none">{selectedIds.size}</span>
                  <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">개 선택됨</span>
                </div>
              </div>
              
              <div className="hidden sm:block h-10 w-px bg-white/10" />
              
              <div className="flex flex-wrap items-center justify-center gap-2 p-0.5 w-full sm:w-auto">
                {bulkActions.map((action, idx) => (
                  <Button
                    key={`bulk-action-${idx}`}
                    size="sm"
                    className="h-10 sm:h-12 px-4 sm:px-6 rounded-xl font-bold text-[10px] sm:text-xs tracking-widest gap-2 bg-white/10 hover:bg-surface-inverse-foreground text-surface-inverse-foreground hover:text-surface-inverse transition-all border border-white/5 hover:border-surface-inverse-foreground shadow-xl group whitespace-nowrap"
                    onClick={() => action.onClick(selectedItems)}
                  >
                    {action.icon && <span className="group-hover:scale-110 transition-transform shrink-0">{action.icon}</span>}
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="px-3 sm:pr-2 relative z-10 w-full sm:w-auto text-center shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                aria-label={`선택한 ${selectedIds.size}개 항목 전체 해제`}
                className="w-full sm:w-auto h-10 sm:h-12 px-6 rounded-xl text-[10px] sm:text-xs font-bold tracking-widest uppercase hover:bg-white/5 text-white/40 hover:text-surface-inverse-foreground transition-colors"
              >
                전체 해제
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 단일 표 트리 — 뷰포트 전환은 CSS 만 담당한다(ADR-0006).
          종전에는 이 블록(hidden md:block)과 모바일 카드 블록(md:hidden)이 **형제로 항상 함께 렌더**돼
          accessor 가 행×열마다 2회 실행되고 accessor 가 만든 testid·aria-label 이 2벌씩 생겼다.
          md 미만 카드 표현은 globals.css 의 `.standard-data-table-responsive` 규칙이 담당한다. */}
      <div className={cn(
        "block w-full border-2 border-border/60 bg-card shadow-sm transition-all relative outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        isPremium ? "rounded-2xl" : "rounded-lg",
        stickyHeader ? "max-h-[700px] overflow-auto" : "overflow-x-auto overflow-y-hidden"
      )}
        data-slot="standard-data-table-scroll-region"
        {...desktopScrollRegionProps}
      >
        <div className="w-full">
          <table
            role="table"
            className={cn(
              "w-full text-sm text-left border-collapse standard-data-table-responsive",
              stickyHeader && "table-sticky-header"
            )}
          >
            <caption className="sr-only">{accessibleLabel}</caption>
            <thead role="rowgroup" className="relative z-20">
              <tr role="row" className="bg-muted/80 backdrop-blur-xl border-b-2 border-border/80">
                {enableSelection && (
                  <th className="px-[var(--cell-px)] py-[var(--cell-py)] w-16 text-center" scope="col" aria-label="전체 항목 선택">
                    <Checkbox
                      checked={(data || []).length > 0 && selectedIds.size === (data || []).length}
                      onCheckedChange={toggleAll}
                      aria-label="전체 항목 선택"
                    />
                  </th>
                )}
                {columns.map((column, idx) => {
                  const tanColumn = leafColumns[idx];
                  const canSort = tanColumn?.getCanSort() ?? false;
                  const sortDirection = canSort ? tanColumn.getIsSorted() : false;
                  return (
                    <th
                      key={`header-${idx}`}
                      className={cn(
                        "px-[var(--cell-px)] py-[var(--cell-py)] font-bold text-foreground text-xs uppercase tracking-[0.25em] whitespace-nowrap",
                        column.className
                      )}
                      scope="col"
                      aria-label={typeof column.header === 'string' && column.header ? column.header : '열'}
                      // aria-sort 는 정렬 가능한 th 에만 둔다(none|ascending|descending).
                      aria-sort={canSort
                        ? (sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none')
                        : undefined}
                    >
                      {canSort ? (
                        <button
                          type="button"
                          onClick={tanColumn.getToggleSortingHandler()}
                          // 서버 페이지네이션은 그대로다 — 정렬 범위를 정직하게 문서화한다.
                          title="현재 페이지의 행만 정렬합니다"
                          className="flex items-center gap-2 font-bold uppercase tracking-[0.25em] text-foreground transition-colors hover:text-primary outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {column.header}
                          {sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                          ) : sortDirection === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/70" aria-hidden="true" />
                          )}
                          <span className="w-1 h-1 bg-primary/30 rounded-full" aria-hidden="true" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          {column.header}
                          <div className="w-1 h-1 bg-primary/30 rounded-full" />
                        </div>
                      )}
                    </th>
                  );
                })}
                {onRowClick && (
                  <th className="px-[var(--cell-px)] py-[var(--cell-py)] text-right" scope="col">
                    <span className="sr-only">행 작업</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody role="rowgroup" className="divide-y divide-border/40">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  // 로딩 스켈레톤은 순수 장식이므로 접근성 트리에서 제외한다(중복 낭독 방지).
                  <tr key={`loading-row-${i}`} className="animate-pulse" aria-hidden="true">
                    {/* control-has-associated-label 은 빈 td 를 컨트롤로 오판한다. 이 행은 aria-hidden 장식이라 라벨 대상이 아니다. */}
                    {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
                    {enableSelection ? <td role="presentation" className="px-[var(--cell-px)] py-[var(--cell-py)] text-center"><div className="w-5 h-5 bg-muted rounded m-auto opacity-50" /></td> : null}
                    {columns.map((_, j) => (
                      // eslint-disable-next-line jsx-a11y/control-has-associated-label
                      <td key={`loading-cell-${j}`} role="presentation" className="px-[var(--cell-px)] py-[var(--cell-py)]">
                        <div className="h-4 bg-muted/40 rounded-lg w-3/4" />
                      </td>
                    ))}
                    {onRowClick ? (
                      // eslint-disable-next-line jsx-a11y/control-has-associated-label
                      <td role="presentation" className="px-[var(--cell-px)] py-[var(--cell-py)]"><div className="h-8 w-20 bg-muted/40 rounded-lg ml-auto" /></td>
                    ) : null}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={columns.length + (enableSelection ? 1 : 0) + (onRowClick ? 1 : 0)} className="px-[var(--cell-px)] py-20 text-center">
                    <ErrorStateDisplay error={error} onRetry={onRetry} />
                  </td>
                </tr>
              ) : (data || []).length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (enableSelection ? 1 : 0) + (onRowClick ? 1 : 0)} className="px-[var(--cell-px)] py-20 text-center" data-testid="empty-table-msg">
                    <EmptyStateDisplay message={resolvedEmptyMessage} />
                  </td>
                </tr>
              ) : (
                // TanStack row model 이 표시 순서(정렬 반영)와 row id(keyField→getRowId)를 소유한다.
                // index 는 표시 위치다 — 정렬이 없으면 종전 data 인덱스와 동일하다.
                tableRows.map((row, displayIdx) => {
                  const item = row.original;
                  if (!item) return null;
                  return (
                    <DataRow
                      key={`row-${row.id}`}
                      item={item}
                      columns={columns}
                      index={displayIdx}
                      isSelected={selectedIds.has(item?.[keyField])}
                      enableSelection={enableSelection}
                      onToggle={() => toggleOne(item?.[keyField])}
                      onRowClick={onRowClick}
                      rowActionLabel={resolveRowActionLabel(rowActionLabel, item, displayIdx)}
                      rowTestId={rowTestId}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls — 총 건수·페이지 번호 노출 (PagePagination 과 동일한 윈도우 규칙) */}
      {pagination && (pagination.totalPages > 1 || pagination.totalCount !== undefined || pagination.onPageSizeChange !== undefined) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 pb-4">
          {(() => {
            const summary = (
              <>
                {pagination.totalCount !== undefined && (
                  <>
                    총 <span className="text-foreground font-black">{pagination.totalCount.toLocaleString()}</span>건
                    <span className="mx-2 opacity-40">·</span>
                  </>
                )}
                {rowRange && (
                  <>
                    {rowRange.from.toLocaleString()}–{rowRange.to.toLocaleString()}번째
                    <span className="mx-2 opacity-40">·</span>
                  </>
                )}
                <span className="text-foreground font-black">{pagination.currentPage}</span>
                {' / '}
                {Math.max(pagination.totalPages, 1)} 페이지
              </>
            );
            const { onPageSizeChange } = pagination;
            if (!onPageSizeChange) {
              // opt-in 미사용 시 기존 소비자 DOM 을 그대로 유지한다(래퍼도 추가하지 않는다).
              return (
                <p className="text-xs font-bold text-muted-foreground tracking-wider order-2 sm:order-1" aria-live="polite">
                  {summary}
                </p>
              );
            }
            return (
              <div className="flex flex-wrap items-center justify-center gap-3 order-2 sm:order-1">
                <p className="text-xs font-bold text-muted-foreground tracking-wider" aria-live="polite">
                  {summary}
                </p>
                <Select
                  value={String(pagination.pageSize ?? 10)}
                  onValueChange={(value) => onPageSizeChange(Number(value))}
                >
                  <SelectTrigger size="sm" aria-label="페이지당 항목 수" className="rounded-lg text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(pagination.pageSizeOptions ?? [10, 20, 50, 100]).map((size) => (
                      <SelectItem key={size} value={String(size)}>{size}개씩</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })()}

          {pagination.totalPages > 1 && (
            <nav
              role="navigation"
              aria-label="페이지 탐색"
              className="order-1 sm:order-2"
            >
              {/* 페이지 컨트롤은 순서 목록(ol/li)이어야 스크린리더가 "몇 개 중 몇 번째"를
                  셈할 수 있다 — breadcrumb(DynamicBreadcrumb)과 동일한 KRDS/WCAG 규격이다. */}
              <ol className="flex items-center gap-1.5">
                <li>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-10 h-10 rounded-lg border-2"
                    disabled={pagination.currentPage <= 1}
                    onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                    aria-label="이전 페이지"
                  >
                    <ChevronLeft size={18} aria-hidden="true" />
                  </Button>
                </li>

                {pageNumbers[0] > 1 && (
                  <>
                    <li>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-lg font-bold"
                        onClick={() => pagination.onPageChange(1)}
                        aria-label="1 페이지"
                      >
                        1
                      </Button>
                    </li>
                    {pageNumbers[0] > 2 && (
                      <li className="px-1 text-muted-foreground" aria-hidden="true">…</li>
                    )}
                  </>
                )}

                {pageNumbers.map((pageNo) => (
                  <li key={`page-${pageNo}`}>
                    <Button
                      variant={pageNo === pagination.currentPage ? "outline" : "ghost"}
                      size="icon"
                      className={cn(
                        "w-10 h-10 rounded-lg font-bold",
                        pageNo === pagination.currentPage && "border-2 border-primary text-primary"
                      )}
                      onClick={() => pagination.onPageChange(pageNo)}
                      aria-label={`${pageNo} 페이지`}
                      aria-current={pageNo === pagination.currentPage ? "page" : undefined}
                    >
                      {pageNo}
                    </Button>
                  </li>
                ))}

                {pageNumbers[pageNumbers.length - 1] < totalPages && (
                  <>
                    {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                      <li className="px-1 text-muted-foreground" aria-hidden="true">…</li>
                    )}
                    <li>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-lg font-bold"
                        onClick={() => pagination.onPageChange(totalPages)}
                        aria-label={`${totalPages} 페이지`}
                      >
                        {totalPages}
                      </Button>
                    </li>
                  </>
                )}

                <li>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-10 h-10 rounded-lg border-2"
                    disabled={pagination.currentPage >= pagination.totalPages}
                    onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                    aria-label="다음 페이지"
                  >
                    <ChevronRight size={18} aria-hidden="true" />
                  </Button>
                </li>
              </ol>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
