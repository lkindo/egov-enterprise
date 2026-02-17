'use client';

import React, { useState, useMemo, memo, useCallback } from 'react';
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, Edit3, MoreHorizontal, ChevronDown, List } from "lucide-react";

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface BulkAction<T> {
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
        "group transition-all duration-200 outline-none focus-within:bg-primary/[0.02]",
        isSelected ? "bg-primary/[0.03]" : "hover:bg-accent/30",
        onRowClick && "cursor-pointer"
      )}
    >
      {enableSelection && (
        <td className="px-4 py-4 text-center">
          <Checkbox 
            checked={isSelected}
            onCheckedChange={onToggle}
            aria-label="행 선택"
          />
        </td>
      )}
      {columns.map((column: any, colIdx: number) => (
        <td 
          key={colIdx} 
          className={cn("px-4 py-4", column.className)}
          onClick={() => onRowClick?.(item)}
        >
          <div className="font-medium outline-none">
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
        "p-6 rounded-[2.25rem] border-2 transition-all duration-300 relative overflow-hidden",
        isSelected ? "border-primary bg-primary/[0.03] shadow-xl shadow-primary/5" : "border-primary/5 bg-card hover:border-primary/20 hover:shadow-lg"
      )}
      onClick={() => onRowClick?.(item)}
    >
      <div className="flex justify-between items-start mb-5">
        {enableSelection && (
          <div onClick={(e) => e.stopPropagation()} className="relative z-10">
            <Checkbox 
              checked={isSelected}
              onCheckedChange={onToggle}
              className="rounded-lg w-6 h-6 border-2"
            />
          </div>
        )}
        <div className="flex flex-col gap-1 flex-1 ml-4 overflow-hidden">
          <div className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em]">
            {columns[0].header}
          </div>
          <div className="font-black text-lg text-foreground truncate">
            {typeof columns[0].accessor === 'function' ? columns[0].accessor(item) : item[columns[0].accessor]}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-5 gap-x-4 pt-5 border-t border-primary/5">
        {columns.slice(1, 5).map((column: any, idx: number) => (
          <div key={idx} className="space-y-1 overflow-hidden">
            <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">{column.header}</p>
            <div className="text-xs font-bold text-foreground/70 truncate">
              {typeof column.accessor === 'function' ? column.accessor(item) : item[column.accessor]}
            </div>
          </div>
        ))}
      </div>
      
      <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.02] rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none">
        <List size={100} />
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
    <div className={cn("space-y-6", className)}>
      {/* Bulk Action Toolbar */}
      {enableSelection && selectedIds.size > 0 && (
        <div 
          className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-[1.5rem] animate-in fade-in slide-in-from-top-2 shadow-inner"
          role="toolbar"
          aria-label="선택 항목 작업"
        >
          <div className="flex items-center gap-4 ml-2">
            <span className="text-sm font-black text-primary" aria-live="polite">
              {selectedIds.size}개 선택됨
            </span>
            <div className="h-5 w-px bg-primary/20 aria-hidden" />
            <div className="flex gap-2.5">
              {bulkActions.map((action, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant={action.variant || "outline"}
                  className="h-9 px-4 rounded-xl font-bold gap-2 shadow-sm"
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
            className="text-xs font-bold h-9 px-4 hover:bg-primary/5"
          >
            선택 해제
          </Button>
        </div>
      )}

      {/* 1. Desktop View (Table) */}
      <div className="hidden md:block w-full overflow-hidden border-2 border-primary/5 rounded-[2.5rem] bg-card shadow-2xl shadow-primary/5 transition-all duration-500">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-muted/30 border-b border-primary/5">
              <tr>
                {enableSelection && (
                  <th className="px-6 py-6 w-12 text-center" scope="col">
                    <Checkbox 
                      checked={data.length > 0 && selectedIds.size === data.length}
                      onCheckedChange={toggleAll}
                      aria-label="전체 항목 선택"
                    />
                  </th>
                )}
                {columns.map((column, idx) => (
                  <th key={idx} className={cn("px-6 py-6 font-black text-muted-foreground uppercase tracking-[0.2em] text-[10px] whitespace-nowrap", column.className)} scope="col">
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {enableSelection && <td className="px-6 py-8 text-center"><div className="w-5 h-5 bg-muted rounded-lg m-auto" /></td>}
                    {columns.map((_, j) => (
                      <td key={j} className="px-6 py-8">
                        <div className="h-4 bg-muted/60 rounded-full w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (enableSelection ? 1 : 0)} className="px-6 py-32 text-center">
                    <EmptyStateDisplay emptyMessage={emptyMessage} />
                  </td>
                </tr>
              ) : (
                data.map((item, rowIdx) => (
                  <DataRow 
                    key={item[keyField] || rowIdx}
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
      <div className="md:hidden space-y-5 px-1">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-56 bg-muted/40 animate-pulse rounded-[2.5rem]" />
          ))
        ) : data.length === 0 ? (
          <div className="p-16 bg-card border-2 border-dashed border-primary/10 rounded-[3rem] text-center shadow-inner">
            <EmptyStateDisplay emptyMessage={emptyMessage} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {data.map((item, idx) => (
              <MobileCard 
                key={item[keyField] || idx}
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
    <div className="flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in-95 duration-700">
      <div className="w-24 h-24 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mb-2 rotate-6 hover:rotate-0 transition-transform duration-500 shadow-inner">
        <MoreHorizontal size={48} className="text-primary/20" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <p className="text-2xl font-black text-foreground/80 tracking-tight">{emptyMessage}</p>
        <p className="text-sm text-muted-foreground font-medium max-w-[280px] mx-auto leading-relaxed">
          현재 표시할 수 있는 데이터가 없습니다. <br />검색 조건을 변경하거나 페이지를 새로고침 해보세요.
        </p>
      </div>
      <Button variant="outline" className="mt-4 rounded-2xl font-black h-12 px-8 border-2 hover:bg-primary/5 transition-all shadow-xl shadow-primary/5" onClick={() => window.location.reload()}>
        Refresh Connection
      </Button>
    </div>
  );
}
