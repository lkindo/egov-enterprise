import React from 'react';
import { cn } from "@/lib/utils";

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface StandardDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function StandardDataTable<T extends { id?: string | number; [key: string]: any }>({ 
  columns, 
  data, 
  loading, 
  onRowClick,
  emptyMessage = "데이터가 없습니다."
}: StandardDataTableProps<T>) {
  return (
    <div className="w-full overflow-hidden border rounded-lg bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-muted/50 border-b">
            <tr>
              {columns.map((column, idx) => (
                <th key={idx} className={cn("px-4 py-3 font-semibold text-muted-foreground", column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-muted rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground italic">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => (
                <tr 
                  key={item.id || rowIdx} 
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    "hover:bg-accent/50 transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((column, colIdx) => (
                    <td key={colIdx} className={cn("px-4 py-3.5", column.className)}>
                      {typeof column.accessor === 'function' 
                        ? column.accessor(item) 
                        : item[column.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
