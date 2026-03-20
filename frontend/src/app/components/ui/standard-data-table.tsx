'use client';

import React, { useState, useMemo, memo, useCallback } from 'react';
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { List, MoreHorizontal } from "lucide-react";

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

interface StandardDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  enableSelection?: boolean;
  bulkActions?: BulkAction<T>[];
  keyField?: keyof T;
  className?: string;
}

// 1. Row 컴포넌트 메모이제이션으로 성능 최적화
const DataRow = memo(function DataRow({
  item,
  columns,
  isSelected,
  enableSelection,
  onToggle,
  onRowClick
}: any) {
  return (
    <tr
      className={cn(
        "group transition-colors outline-none focus-within:bg-muted/30",
        isSelected ? "bg-primary/5" : "hover:bg-muted/50",
        onRowClick && "cursor-pointer"
      )}
    >
      {enableSelection && (
        <td className="px-4 py-3 text-center">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggle}
            aria-label="행 선택"
          />
        </td>
      )}
      {columns.map((column: any, colIdx: number) => (
        <td
          key={`row-cell-${colIdx}`}
          className={cn("px-4 py-3 text-sm text-foreground/90 font-medium", column.className)}
          onClick={() => onRowClick?.(item)}
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

// 2. 모바일 카드 컴포넌트
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
        "p-5 rounded-xl border transition-all relative overflow-hidden",
        isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/20"
      )}
      onClick={() => onRowClick?.(item)}
    >
      <div className="flex justify-between items-start mb-4">
        {enableSelection && (
          <div onClick={(e) => e.stopPropagation()} className="relative z-10">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggle}
              className="w-5 h-5"
            />
          </div>
        )}
        <div className="flex flex-col gap-1 flex-1 ml-3 overflow-hidden">
          <div className="text-[10px] font-bold text-primary/70 uppercase tracking-tighter">
            {columns[0].header}
          </div>
          <div className="font-bold text-base text-foreground truncate">
            {typeof columns[0].accessor === 'function' ? columns[0].accessor(item) : item[columns[0].accessor]}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-4 gap-x-4 pt-4 border-t border-border/50">
        {columns.slice(1, 5).map((column: any, idx: number) => (
          <div key={`mobile-col-${idx}`} className="space-y-0.5 overflow-hidden">
            <p className="text-[10px] font-bold text-muted-foreground/60 tracking-tight">{column.header}</p>
            <div className="text-sm font-semibold text-foreground/80 truncate">
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
  className
}: StandardDataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<any>>(new Set());

  const selectedItems = useMemo(() =>
    data.filter(item => selectedIds.has(item[keyField])),
    [data, selectedIds, keyField]
  );

  const toggleAll = useCallback(() => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map(item => item[keyField])));
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

  return (
    <div className={cn("space-y-4", className)}>
      {/* Bulk Action Toolbar */}
      {enableSelection && selectedIds.size > 0 && (
        <div
          className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl animate-in fade-in slide-in-from-top-2"
          role="toolbar"
          aria-label="선택 항목 작업"
        >
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-primary" aria-live="polite">
              {selectedIds.size}개 선택됨
            </span>
            <div className="h-4 w-px bg-primary/20 aria-hidden" />
            <div className="flex gap-2">
              {bulkActions.map((action, idx) => (
                <Button
                  key={`bulk-action-${idx}`}
                  size="sm"
                  variant={action.variant || "outline"}
                  className="h-8 px-3 rounded-lg font-bold gap-2"
                  onClick={() => action.onClick(selectedItems)}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs font-bold h-8 px-3"
          >
            선택 해제
          </Button>
        </div>
      )}

      {/* 1. Desktop View (Table) */}
      <div className="hidden md:block w-full overflow-hidden border border-border rounded-xl bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                {enableSelection && (
                  <th className="px-4 py-3 w-12 text-center" scope="col">
                    <Checkbox
                      checked={data.length > 0 && selectedIds.size === data.length}
                      onCheckedChange={toggleAll}
                      aria-label="전체 항목 선택"
                    />
                  </th>
                )}
                {columns.map((column, idx) => (
                  <th key={`header-${idx}`} className={cn("px-4 py-3 font-bold text-muted-foreground text-xs uppercase tracking-tight whitespace-nowrap", column.className)} scope="col">
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`loading-row-${i}`} className="animate-pulse">
                    {enableSelection ? <td className="px-4 py-3 text-center"><div className="w-5 h-5 bg-muted rounded m-auto" /></td> : null}
                    {columns.map((_, j) => (
                      <td key={`loading-cell-${j}`} className="px-4 py-3">
                        <div className="h-4 bg-muted/60 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
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

      {/* 2. Mobile View (Cards) */}
      <div className="md:hidden space-y-4 px-1">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={`loading-card-${i}`} className="h-48 bg-muted/40 animate-pulse rounded-xl" />
          ))
        ) : data.length === 0 ? (
          <div className="p-12 bg-card border border-dashed border-border rounded-2xl text-center shadow-sm">
            <EmptyStateDisplay emptyMessage={emptyMessage} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
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
    </div>
  );
}

// --- Internal Helper Components ---

function EmptyStateDisplay({ emptyMessage }: { emptyMessage: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in-95 duration-500 py-10">
      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-2">
        <List size={32} className="text-muted-foreground/30" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-bold text-foreground/80 tracking-tight">{emptyMessage}</p>
        <p className="text-xs text-muted-foreground font-medium max-w-[280px] mx-auto leading-relaxed">
          현재 표시할 수 있는 데이터가 없습니다. <br />검색 조건을 변경하거나 페이지를 새로고침 해보세요.
        </p>
      </div>
      <Button variant="outline" size="sm" className="mt-4 rounded-lg font-bold" onClick={() => window.location.reload()}>
        새로고침
      </Button>
    </div>
  );
}
