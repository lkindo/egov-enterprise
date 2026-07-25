import React, { useState, useMemo, memo, useCallback, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ErrorStateDisplay, EmptyStateDisplay } from './status-displays';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T, index?: number) => React.ReactNode);
  className?: string;
}

interface BulkAction<T> {
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline';
  onClick: (selectedItems: T[]) => void;
}

export interface StandardDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  enableSelection?: boolean;
  bulkActions?: BulkAction<T>[];
  keyField?: keyof T;
  className?: string;
  isPremium?: boolean;
  error?: Error | null;
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

const DataRow = memo(function DataRow({
  item,
  columns,
  isSelected,
  index,
  enableSelection,
  onToggle,
  onRowClick,
  rowTestId
}: {
  item: any;
  columns: Column<any>[];
  isSelected: boolean;
  index: number;
  enableSelection: boolean;
  onToggle: () => void;
  onRowClick?: (item: any) => void;
  rowTestId?: string;
}) {
  if (!item) return null;

  return (
    <tr
      tabIndex={onRowClick ? 0 : undefined}
      aria-label={onRowClick ? '상세 보기' : undefined}
      data-testid={rowTestId}
      onKeyDown={(e) => { if((e.key === 'Enter' || e.key === ' ') && onRowClick) { e.preventDefault(); onRowClick(item); } }}
      className={cn(
        "group transition-all duration-300 outline-none focus-within:bg-muted/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
        isSelected ? "bg-primary/5" : "hover:bg-muted/40",
        onRowClick && "cursor-pointer"
      )}
      onClick={() => onRowClick?.(item)}
    >
      {enableSelection && (
        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
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
          className={cn(
            "px-6 py-5 text-sm font-medium text-foreground/80 tracking-tight transition-colors group-hover:text-foreground",
            column.className
          )}
        >
          <div className="outline-none">
            {typeof column.accessor === 'function'
              ? (column.accessor as any)(item, index)
              : item?.[column.accessor as any]}
          </div>
        </td>
      ))}
    </tr>
  );
});

const MobileCard = memo(function MobileCard({
  item,
  columns,
  isSelected,
  index,
  enableSelection,
  onToggle,
  onRowClick
}: any) {
  if (!item) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if((e.key === 'Enter' || e.key === ' ') && onRowClick) { e.preventDefault(); onRowClick(item); } }}
      className={cn(
        "text-left w-full p-6 rounded-lg border-2 transition-all relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isSelected ? "border-primary bg-primary/5 shadow-lg scale-[1.02]" : "border-border bg-card hover:border-primary/30"
      )}
      onClick={() => onRowClick?.(item)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          {enableSelection && (
            // 상위 카드(button)로의 이벤트 전파만 차단하는 래퍼 — 자체는 조작 대상이 아니므로 presentation
            <div role="presentation" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="relative z-10">
              <Checkbox checked={isSelected} onCheckedChange={onToggle} className="w-6 h-6 rounded-lg" aria-label="항목 선택" />
            </div>
          )}
          <div className="flex flex-col gap-1 overflow-hidden">
            <span className="text-xs font-bold text-primary/90 uppercase tracking-[0.2em]">{columns[0].header}</span>
            <div className="font-[number:var(--font-weight-hub-title)] text-lg text-foreground truncate tracking-tight">
              {typeof columns[0].accessor === 'function' ? (columns[0].accessor as any)(item, index) : item?.[columns[0].accessor]}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-5 gap-x-4 pt-5 border-t border-border/50">
        {columns.slice(1).map((column: any, idx: number) => (
          <div key={`mobile-col-${idx}`} className="space-y-1 overflow-hidden">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">{column.header}</p>
            <div className="text-sm font-bold text-foreground/80 truncate">
              {typeof column.accessor === 'function' ? (column.accessor as any)(item, index) : item?.[column.accessor]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export function StandardDataTable<T extends { [key: string]: any }>({
  columns,
  data,
  loading,
  onRowClick,
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

  const [selectedIds, setSelectedIds] = useState<Set<any>>(new Set());
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

  // 페이지/검색 변경 시 선택 초기화 — 현재 페이지 밖 항목이 선택 카운트에만 남아
  // "8개 선택됨인데 3건만 처리"되는 데이터 정합 결함 방지
  useEffect(() => {
    setSelectedIds(prev => (prev.size > 0 ? new Set() : prev));
  }, [currentPage, appliedKeyword]);

  // keyField 미전달 경고 (개발 모드 전용, 1회만)
  const keyFieldWarnedRef = React.useRef(false);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || keyFieldProp !== undefined || keyFieldWarnedRef.current) return;
    const rows = data || [];
    if (rows.length > 0) keyFieldWarnedRef.current = true;
    if (rows.length > 0 && rows.some(item => item && item['id'] === undefined)) {
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
  }, [data, selectedIds.size, keyField]);

  const toggleOne = useCallback((id: any) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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

      {/* 1. Desktop View - Glass Style Table */}
      <div className={cn(
        "hidden md:block w-full border-2 border-border/60 bg-card shadow-sm transition-all relative",
        isPremium ? "rounded-2xl" : "rounded-lg",
        stickyHeader ? "max-h-[700px] overflow-auto" : "overflow-hidden"
      )}>
        <div className="w-full">
          <table className={cn(
            "w-full text-sm text-left border-collapse",
            stickyHeader && "table-sticky-header"
          )}>
            <thead className="relative z-20">
              <tr className="bg-muted/80 backdrop-blur-xl border-b-2 border-border/80">
                {enableSelection && (
                  <th className="px-6 py-5 w-16 text-center" scope="col" aria-label="전체 항목 선택">
                    <Checkbox
                      checked={(data || []).length > 0 && selectedIds.size === (data || []).length}
                      onCheckedChange={toggleAll}
                      aria-label="전체 항목 선택"
                    />
                  </th>
                )}
                {columns.map((column, idx) => (
                  <th key={`header-${idx}`} className={cn(
                    "px-6 py-5 font-bold text-foreground text-xs uppercase tracking-[0.25em] whitespace-nowrap",
                    column.className
                  )} scope="col" aria-label={typeof column.header === 'string' && column.header ? column.header : '열'}>
                    <div className="flex items-center gap-2">
                      {column.header}
                      <div className="w-1 h-1 bg-primary/30 rounded-full" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  // 로딩 스켈레톤은 순수 장식이므로 접근성 트리에서 제외한다(중복 낭독 방지).
                  <tr key={`loading-row-${i}`} className="animate-pulse" aria-hidden="true">
                    {/* control-has-associated-label 은 빈 td 를 컨트롤로 오판한다. 이 행은 aria-hidden 장식이라 라벨 대상이 아니다. */}
                    {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
                    {enableSelection ? <td role="presentation" className="px-6 py-5 text-center"><div className="w-5 h-5 bg-muted rounded m-auto opacity-50" /></td> : null}
                    {columns.map((_, j) => (
                      // eslint-disable-next-line jsx-a11y/control-has-associated-label
                      <td key={`loading-cell-${j}`} role="presentation" className="px-6 py-5">
                        <div className="h-4 bg-muted/40 rounded-lg w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={columns.length + (enableSelection ? 1 : 0)} className="px-6 py-20 text-center">
                    <ErrorStateDisplay error={error} onRetry={onRetry} />
                  </td>
                </tr>
              ) : (data || []).length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (enableSelection ? 1 : 0)} className="px-6 py-20 text-center" data-testid="empty-table-msg">
                    <EmptyStateDisplay message={resolvedEmptyMessage} />
                  </td>
                </tr>
              ) : (
                (data || []).map((item, rowIdx) => {
                  if (!item) return null;
                  const itemId = item?.[keyField] ?? rowIdx;
                  return (
                    <DataRow
                      key={`row-${itemId}`}
                      item={item}
                      columns={columns}
                      index={rowIdx}
                      isSelected={selectedIds.has(item?.[keyField])}
                      enableSelection={enableSelection}
                      onToggle={() => toggleOne(item?.[keyField])}
                      onRowClick={onRowClick}
                      rowTestId={rowTestId}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Mobile View (Premium Cards) */}
      <div className="md:hidden space-y-5 px-1">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={`loading-card-${i}`} className="h-56 bg-muted/20 animate-pulse rounded-lg" />
          ))
        ) : error ? (
          <div className="p-16 bg-card border-2 border-border/60 rounded-lg text-center shadow-inner">
            <ErrorStateDisplay error={error} onRetry={onRetry} />
          </div>
        ) : (data || []).length === 0 ? (
          <div className="p-16 bg-card border-2 border-dashed border-border/60 rounded-lg text-center shadow-inner">
            <EmptyStateDisplay message={resolvedEmptyMessage} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {(data || []).map((item, idx) => {
              if (!item) return null;
              const itemId = item?.[keyField] ?? idx;
              return (
                <MobileCard
                  key={`card-${itemId}`}
                  item={item}
                  columns={columns}
                  index={idx}
                  isSelected={selectedIds.has(item?.[keyField])}
                  enableSelection={enableSelection}
                  onToggle={() => toggleOne(item?.[keyField])}
                  onRowClick={onRowClick}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Controls — 총 건수·페이지 번호 노출 (PagePagination 과 동일한 윈도우 규칙) */}
      {pagination && (pagination.totalPages > 1 || pagination.totalCount !== undefined) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 pb-4">
          <p className="text-xs font-bold text-muted-foreground tracking-wider order-2 sm:order-1" aria-live="polite">
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
          </p>

          {pagination.totalPages > 1 && (
            <nav
              role="navigation"
              aria-label="페이지 탐색"
              className="order-1 sm:order-2 flex items-center gap-1.5"
            >
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

              {pageNumbers[0] > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-lg font-bold"
                    onClick={() => pagination.onPageChange(1)}
                    aria-label="1 페이지"
                  >
                    1
                  </Button>
                  {pageNumbers[0] > 2 && (
                    <span className="px-1 text-muted-foreground" aria-hidden="true">…</span>
                  )}
                </>
              )}

              {pageNumbers.map((pageNo) => (
                <Button
                  key={`page-${pageNo}`}
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
              ))}

              {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <>
                  {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                    <span className="px-1 text-muted-foreground" aria-hidden="true">…</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-lg font-bold"
                    onClick={() => pagination.onPageChange(totalPages)}
                    aria-label={`${totalPages} 페이지`}
                  >
                    {totalPages}
                  </Button>
                </>
              )}

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
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
