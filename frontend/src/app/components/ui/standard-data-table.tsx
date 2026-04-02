
import React, { useState, useMemo, memo, useCallback } from 'react';
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { List, Search, RefreshCw, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

export interface BulkAction<T> {
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
}

const DataRow = memo(function DataRow({
  item,
  columns,
  isSelected,
  enableSelection,
  onToggle,
  onRowClick
}: {
  item: unknown;
  columns: unknown[];
  isSelected: boolean;
  enableSelection: boolean;
  onToggle: () => void;
  onRowClick?: (item: unknown) => void;
}) {
  return (
    <tr
      className={cn(
        "group transition-all duration-300 outline-none focus-within:bg-muted/30",
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
            className="행 선택"
          />
        </td>
      )}
      {columns.map((column: unknown, colIdx: number) => (
        <td
          key={`row-cell-${colIdx}`}
          className={cn(
            "px-6 py-5 text-sm font-medium text-foreground/80 tracking-tight transition-colors group-hover:text-foreground",
            column.className
          )}
        >
          <div className="outline-none">
            {typeof column.accessor === 'function'
              ? column.accessor(item)
              : item[column.accessor]}
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
  enableSelection,
  onToggle,
  onRowClick
}: any) {
  return (
    <div
      className={cn(
        "p-6 rounded-[var(--radius-hub-item)] border-2 transition-all relative overflow-hidden",
        isSelected ? "border-primary bg-primary/5 shadow-lg scale-[1.02]" : "border-border bg-card hover:border-primary/30"
      )}
      onClick={() => onRowClick?.(item)}
    >
      <div className="선택 항목 작업">
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          {enableSelection && (
            <div onClick={(e) => e.stopPropagation()} className="relative z-10">
              <Checkbox checked={isSelected} onCheckedChange={onToggle} className="w-6 h-6 rounded-lg" />
            </div>
          )}
          <div className="flex flex-col gap-1 overflow-hidden">
            <span className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em]">{columns[0].header}</span>
            <div className="font-[number:var(--font-weight-hub-title)] text-lg text-foreground truncate tracking-tight">
              {typeof columns[0].accessor === 'function' ? columns[0].accessor(item) : item[columns[0].accessor]}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-5 gap-x-4 pt-5 border-t border-border/50">
        {columns.slice(1, 5).map((column: any, idx: number) => (
          <div key={`mobile-col-${idx}`} className="space-y-1 overflow-hidden">
            <p className="hub-subtitle-label opacity-40">{column.header}</p>
            <div className="text-sm font-bold text-foreground/80 truncate">
              {typeof column.accessor === 'function' ? column.accessor(item) : item[column.accessor]}
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
  search
}: StandardDataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<any>>(new Set());
  const [searchKeyword, setSearchKeyword] = useState('');

  const selectedItems = useMemo(() =>
    data.filter(item => selectedIds.has(item[keyField])),
    [data, selectedIds, keyField]
  );

  const toggleAll = useCallback(() => {
    if (selectedIds.size === data.length && data.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.filter(item => item[keyField] !== undefined).map(item => item[keyField])));
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
            placeholder={search.placeholder || '寃됱뼱 ?낅젰...'}
            className="h-12 pl-12 rounded-xl border-2 bg-white ring-offset-0 focus:ring-4 focus:ring-primary/5 transition-all font-bold text-sm"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </form>
      )}

      {/* Bulk Action Toolbar - High Tech Style */}
      {enableSelection && selectedIds.size > 0 && (
        <div
          className="flex items-center justify-between p-4 bg-primary text-white rounded-[var(--radius-hub-item)] shadow-xl animate-in fade-in zoom-in-95"
          role="toolbar"
        >
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black opacity-60 tracking-widest uppercase">?좏깮 紐⑤뱶</span>
              <span className="text-sm font-black">{selectedIds.size}媛쒖쓽 님ぉ ?좏깮님/span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="flex gap-2">
              {bulkActions.map((action, idx) => (
                <Button
                  key={`bulk-action-${idx}`}
                  size="sm"
                  variant="secondary"
                  className="h-9 px-4 rounded-xl font-black text-[10px] tracking-tight gap-2 shadow-lg"
                  onClick={() => action.onClick(selectedItems)}
                >
                  {action.icon}
                  {action.label.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs font-black h-9 px-4 hover:bg-white/10 text-white/80"
          >
            ?좏깮 ?댁젣
          </Button>
        </div>
      )}

      {/* 1. Desktop View - Glass Style Table */}
      <div className={cn(
        "hidden md:block w-full overflow-hidden border-2 border-border/60 bg-card shadow-sm transition-all",
        isPremium ? "rounded-[var(--radius-hub-item)]" : "rounded-xl"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b-2 border-border/80">
                {enableSelection && (
                  <th className="px-6 py-5 w-16 text-center" scope="col">
                    <Checkbox
                      checked={data.length > 0 && selectedIds.size === data.length}
                      onCheckedChange={toggleAll}
                      className="전체 항목 선택"
                    />
                  </th>
                )}
                {columns.map((column, idx) => (
                  <th key={`header-${idx}`} className={cn(
                    "px-6 py-5 font-black text-muted-foreground/60 text-[10px] uppercase tracking-[0.2em] whitespace-nowrap",
                    column.className
                  )} scope="col">
                    {column.header}
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
                        <div className="h-4 bg-muted/40 rounded-full w-3/4" />
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
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (enableSelection ? 1 : 0)} className="px-6 py-20 text-center">
                    <EmptyStateDisplay emptyMessage={emptyMessage} />
                  </td>
                </tr>
              ) : (
                data.map((item, rowIdx) => (
                  <DataRow
                    key={item[keyField] !== undefined ? `row-${item[keyField]}` : `row-idx-${rowIdx}`}
                    item={item}
                    columns={columns}
                    isSelected={selectedIds.has(item[keyField])}
                    enableSelection={enableSelection}
                    onToggle={() => toggleOne(item[keyField])}
                    onRowClick={onRowClick}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Mobile View (Premium Cards) */}
      <div className="md:hidden space-y-5 px-1">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={`loading-card-${i}`} className="h-56 bg-muted/20 animate-pulse rounded-[var(--radius-hub-item)]" />
          ))
        ) : error ? (
          <div className="p-16 bg-card border-2 border-border/60 rounded-[var(--radius-hub-section)] text-center shadow-inner">
            <ErrorStateDisplay error={error} onRetry={onRetry} />
          </div>
        ) : data.length === 0 ? (
          <div className="p-16 bg-card border-2 border-dashed border-border/60 rounded-[var(--radius-hub-section)] text-center shadow-inner">
            <EmptyStateDisplay emptyMessage={emptyMessage} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {data.map((item, idx) => (
              <MobileCard
                key={item[keyField] !== undefined ? `card-${item[keyField]}` : `card-idx-${idx}`}
                item={item}
                columns={columns}
                isSelected={selectedIds.has(item[keyField])}
                enableSelection={enableSelection}
                onToggle={() => toggleOne(item[keyField])}
                onRowClick={onRowClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-8 pb-4">
          <Button
            variant="outline"
            size="icon"
            className="w-12 h-12 rounded-xl border-2"
            disabled={pagination.currentPage === 1}
            onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
          >
            <ChevronLeft size={20} />
          </Button>

          <div className="flex items-center gap-2 px-6 h-12 bg-white border-2 rounded-xl">
            <span className="text-sm font-black italic">{pagination.currentPage}</span>
            <span className="text-[10px] font-black text-slate-300 uppercase">of</span>
            <span className="text-sm font-black italic text-slate-400">{pagination.totalPages}</span>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="w-12 h-12 rounded-xl border-2"
            disabled={pagination.currentPage === pagination.totalPages}
            onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
          >
            <ChevronRight size={20} />
          </Button>
        </div>
      )}
    </div>
  );
}

function ErrorStateDisplay({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in-95 duration-700 py-12">
      <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-2 relative border-4 border-rose-100 shadow-xl">
        <AlertCircle size={40} className="text-rose-500" />
      </div>
      <div className="space-y-2">
        <p className="text-xl font-black text-rose-900 tracking-tighter uppercase whitespace-pre-line">데이터濡쒕뱶 ㅽ뙣</p>
        <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 inline-block">
          <p className="text-[10px] font-black font-mono text-rose-800 tracking-tight opacity-70">
            ERROR_STREAM: {error.message || 'UNKNOWN_EXEPTION'}
          </p>
        </div>
        <p className="text-xs text-muted-foreground font-black tracking-tight max-w-[360px] mx-auto leading-relaxed opacity-60 mt-4">
          ?곗씠?곕쿋?댁뒪 ?몄뀡?쇰줈遺님媛쒖껜 ?뺣낫瑜님섏떊?섏? 紐삵뻽?듬땲님 <br />ㅽ듃?뚰겕 ?곌껐 ?곹깭瑜님뺤씤?섍굅님?꾨옒 踰꾪듉님?듯빐 ъ떆?꾪븯님떆님
        </p>
      </div>
      <div className="flex gap-4 mt-6">
        <Button
          variant="outline"
          size="lg"
          className="rounded-2xl font-black text-[10px] tracking-[0.2em] border-2 px-10 hover:bg-slate-900 hover:text-white transition-all group shadow-lg"
          onClick={() => onRetry ? onRetry() : window.location.reload()}
        >
          <RefreshCw size={14} className="mr-2 group-hover:rotate-180 transition-transform duration-700" />
          RETRY_SYNC
        </Button>
      </div>
    </div>
  );
}

function EmptyStateDisplay({ emptyMessage }: { emptyMessage: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in-95 duration-700 py-12">
      <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-2 relative">
        <Search size={40} className="text-muted-foreground/20" />
        <div className="absolute -right-1 -bottom-1 w-8 h-8 bg-background border-2 border-border rounded-full flex items-center justify-center">
          <List size={14} className="text-muted-foreground" />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xl font-black text-foreground tracking-tighter uppercase">{emptyMessage}</p>
        <p className="text-xs text-muted-foreground font-black tracking-tight max-w-[320px] mx-auto leading-relaxed opacity-60">
          ?쒖뒪?쒖뿉님?곗씠?곕? 조회?섏? 紐삵뻽?듬땲님 <br />寃님議곌굔님議곗젙?섍굅님ㅼ떆 珥덇린?뷀빐 蹂댁떗?쒖삤.
        </p>
      </div>
      <Button
        variant="outline"
        size="lg"
        className="mt-6 rounded-2xl font-black text-[10px] tracking-[0.2em] border-2 px-10 hover:bg-slate-900 hover:text-white transition-all group"
        onClick={() => typeof window !== 'undefined' && window.location.reload()}
      >
        <RefreshCw size={14} className="mr-2 group-hover:rotate-180 transition-transform duration-700" />
        ?꾩껜 ?덈줈怨좎묠
      </Button>
    </div>
  );
}

