import React, { useState, useMemo, memo, useCallback } from 'react';
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { List, Search, RefreshCw, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
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
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  search?: {
    placeholder?: string;
    onSearch: (keyword: string) => void;
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
      role="button"
      tabIndex={0}
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
        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
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
            <div onClick={(e) => e.stopPropagation()} className="relative z-10">
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
            <p className="text-xs font-bold text-slate-600 uppercase tracking-[0.2em]">{column.header}</p>
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
  keyField = 'id' as keyof T,
  className,
  isPremium = true,
  error = null,
  onRetry,
  pagination,
  search,
  stickyHeader = true,
  rowTestId
}: StandardDataTableProps<T>) {

  const [selectedIds, setSelectedIds] = useState<Set<any>>(new Set());
  const [searchKeyword, setSearchKeyword] = useState("");

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
    search?.onSearch(searchKeyword);
  };

  return (
    <div className={cn("space-y-6", isPremium ? "animate-in fade-in slide-in-from-bottom-4 duration-700" : "", className)}>
      {/* Search Bar integration if provided */}
      {search && (
        <form onSubmit={handleSearchSubmit} className="relative group max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder={search.placeholder || "검색어 입력..."}
            className="h-12 pl-12 rounded-lg border-2 bg-white ring-offset-0 focus:ring-4 focus:ring-primary/5 transition-all font-bold text-sm"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            aria-label="데이터 검색"
          />
        </form>
      )}

      {/* Floating Bulk Action Bar - Enterprise Premium Style */}
      <AnimatePresence>
        {enableSelection && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.95 }}
            className="fixed bottom-6 sm:bottom-12 left-1/2 -translate-x-1/2 z-[100] flex flex-col sm:flex-row items-center justify-between w-[95vw] sm:w-auto sm:min-w-[580px] max-w-[95vw] p-3 sm:p-2 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-2xl text-white rounded-2xl shadow-2xl border border-white/10 overflow-hidden gap-3 sm:gap-0"
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
                    className="h-10 sm:h-12 px-4 sm:px-6 rounded-xl font-bold text-[10px] sm:text-xs tracking-widest gap-2 bg-white/10 hover:bg-white text-white hover:text-slate-900 transition-all border border-white/5 hover:border-white shadow-xl group whitespace-nowrap"
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
                className="w-full sm:w-auto h-10 sm:h-12 px-6 rounded-xl text-[10px] sm:text-xs font-bold tracking-widest uppercase hover:bg-white/5 text-white/40 hover:text-white transition-colors"
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
              <tr className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl border-b-2 border-border/80">
                {enableSelection && (
                  <th className="px-6 py-5 w-16 text-center" scope="col">
                    <Checkbox
                      checked={(data || []).length > 0 && selectedIds.size === (data || []).length}
                      onCheckedChange={toggleAll}
                      aria-label="전체 항목 선택"
                    />
                  </th>
                )}
                {columns.map((column, idx) => (
                  <th key={`header-${idx}`} className={cn(
                    "px-6 py-5 font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-[0.25em] whitespace-nowrap",
                    column.className
                  )} scope="col">
                    <div className="flex items-center gap-2">
                      {column.header}
                      <div className="w-1 h-1 bg-primary/30 rounded-lg" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`loading-row-${i}`} className="animate-pulse">
                    {enableSelection ? <td className="px-6 py-5 text-center"><div className="w-5 h-5 bg-muted rounded m-auto opacity-50" /></td> : null}
                    {columns.map((_, j) => (
                      <td key={`loading-cell-${j}`} className="px-6 py-5">
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
                    <EmptyStateDisplay message={emptyMessage} />
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
            <EmptyStateDisplay message={emptyMessage} />
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

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-8 pb-4">
          <Button
            variant="outline"
            size="icon"
            className="w-12 h-12 rounded-lg border-2"
            disabled={pagination.currentPage === 1}
            onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
            aria-label="이전 페이지"
          >
            <ChevronLeft size={20} />
          </Button>

          <div className="flex items-center gap-2 px-6 h-12 bg-white border-2 rounded-lg">
            <span className="text-sm font-bold">{pagination.currentPage}</span>
            <span className="text-xs font-bold text-slate-900 uppercase">of</span>
            <span className="text-sm font-bold text-slate-900">{pagination.totalPages}</span>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="w-12 h-12 rounded-lg border-2"
            disabled={pagination.currentPage === pagination.totalPages}
            onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
            aria-label="다음 페이지"
          >
            <ChevronRight size={20} />
          </Button>
        </div>
      )}
    </div>
  );
}
