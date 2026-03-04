'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Download,
  Search,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface Column<T> {
  header: string;
  accessorKey: keyof T | string;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onSearch?: (term: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  title?: string;
  searchPlaceholder?: string;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  onSort,
  onSearch,
  onRefresh,
  onExport,
  title,
  searchPlaceholder = "검색어를 입력하세요...",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSort = (key: string) => {
    const isAsc = sortKey === key && sortOrder === 'asc';
    const direction = isAsc ? 'desc' : 'asc';
    setSortKey(key);
    setSortOrder(direction);
    onSort?.(key, direction);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchTerm);
  };

  return (
    <div className="space-y-4">
      {/* Table Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div>
          {title && <h2 className="text-xl font-bold tracking-tight">{title}</h2>}
        </div>
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              className="pl-9 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
          {onRefresh && (
            <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading} className="h-9 w-9">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="h-9 gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">엑셀 다운로드</span>
            </Button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              {columns.map((column, idx) => (
                <TableHead
                  key={`${String(column.accessorKey)}-${idx}`}
                  className={cn(
                    "h-11 font-bold text-xs uppercase tracking-wider",
                    column.sortable && "cursor-pointer select-none hover:bg-muted transition-colors",
                    column.className
                  )}
                  onClick={() => column.sortable && handleSort(String(column.accessorKey))}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && (
                      <div className="text-muted-foreground/50">
                        {sortKey === column.accessorKey ? (
                          sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3" />
                        )}
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading State (Skeleton Rows)
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`loading-${i}`}>
                  {columns.map((_, j) => (
                    <TableCell key={`loading-cell-${j}`}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length > 0 ? (
              data.map((item, rowIdx) => (
                <TableRow key={`row-${rowIdx}`} className="hover:bg-muted/20 transition-colors">
                  {columns.map((column, colIdx) => (
                    <TableCell key={`cell-${rowIdx}-${colIdx}`} className={cn("py-3 text-sm", column.className)}>
                      {column.cell ? column.cell(item) : (item[column.accessorKey as keyof T] as React.ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground italic">
                  데이터가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
