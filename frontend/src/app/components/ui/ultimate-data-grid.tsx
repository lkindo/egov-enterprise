'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
    Pin,
    PinOff,
    Edit2,
    Check,
    Download,
    Settings2,
    ColumnsIcon,
    Search,
    ArrowUpDown
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ColumnDef<T> {
    id: string;
    header: string;
    accessor: keyof T | ((item: T) => React.ReactNode);
    pinned?: 'left' | 'right';
    width?: number | string;
    sortable?: boolean;
    editable?: boolean;
    className?: string;
    type?: 'text' | 'number' | 'date' | 'status';
}

interface UltimateDataGridProps<T> {
    columns: ColumnDef<T>[];
    data: T[];
    loading?: boolean;
    keyField: keyof T;
    className?: string;
    onDataChange?: (newData: T[]) => void;
    title?: string;
    emptyMessage?: string;
}

export function UltimateDataGrid<T extends { [key: string]: any }>({
    columns: initialColumns,
    data: initialData,
    loading,
    keyField,
    className,
    onDataChange,
    title = "데이터 인텔리전스"
}: UltimateDataGridProps<T>) {
    const [data, setData] = useState<T[]>(initialData);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }[]>([]);
    const [editingCell, setEditingCell] = useState<{ rowId: any; colId: string } | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [pinnedCols, setPinnedCols] = useState<Set<string>>(new Set(initialColumns.filter(c => c.pinned).map(c => c.id)));

    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    const handleSort = (colId: string) => {
        setSortConfig(prev => {
            const existing = prev.find(s => s.key === colId);
            if (existing) {
                if (existing.direction === 'asc') return [{ key: colId, direction: 'desc' }];
                return [];
            }
            return [{ key: colId, direction: 'asc' }];
        });
    };

    const togglePin = (colId: string) => {
        setPinnedCols(prev => {
            const next = new Set(prev);
            if (next.has(colId)) next.delete(colId);
            else next.add(colId);
            return next;
        });
    };

    const filteredData = useMemo(() => {
        const filtered = searchQuery
            ? data.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(searchQuery.toLowerCase())
                )
            )
            : data;

        if (sortConfig.length === 0) return filtered;

        return [...filtered].sort((a, b) => {
            for (const { key, direction } of sortConfig) {
                if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
                if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [data, searchQuery, sortConfig]);

    const sortedColumns = useMemo(() => {
        const left = initialColumns.filter(c => pinnedCols.has(c.id));
        const normalized = initialColumns.filter(c => !pinnedCols.has(c.id));
        return [...left, ...normalized];
    }, [initialColumns, pinnedCols]);

    const getPinnedOffset = (colId: string) => {
        if (!pinnedCols.has(colId)) return undefined;
        let offset = 0;
        for (const col of sortedColumns) {
            if (col.id === colId) break;
            offset += Number(col.width || 150);
        }
        return offset;
    };

    const startEditing = (item: T, col: ColumnDef<T>) => {
        if (!col.editable) return;
        setEditingCell({ rowId: item[keyField], colId: col.id });
        setEditValue(String(item[col.accessor as keyof T] || ''));
    };

    const saveEdit = () => {
        if (!editingCell) return;
        const newData = data.map(item => {
            if (item[keyField] === editingCell.rowId) {
                return { ...item, [editingCell.colId]: editValue };
            }
            return item;
        });
        setData(newData);
        onDataChange?.(newData);
        setEditingCell(null);
    };

    return (
        <div className={cn("flex flex-col gap-6 bg-card border-2 border-primary/5 rounded-[0.1rem] p-8 shadow-2xl", className)}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-[0.1rem] text-primary">
                        <Settings2 size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black tracking-tight text-foreground ">{title}</h3>
                        <p className="text-[10px] font-bold text-slate-700 tracking-tight leading-none">고성능 인텔리전스 그리드</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            className="w-full bg-muted/30 border-none rounded-[0.1rem] py-3 pl-12 pr-4 text-sm font-bold outline-none ring-2 ring-transparent focus:ring-primary/20 transition-all font-sans"
                            placeholder="전역 검색.."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon" className="rounded-[0.1rem] border-2 hover:bg-primary/5"><Download size={18} /></Button>
                    <Button variant="outline" size="icon" className="rounded-[0.1rem] border-2 hover:bg-primary/5"><ColumnsIcon size={18} /></Button>
                </div>
            </div>

            <div className="relative overflow-hidden border rounded-[0.1rem] bg-background/50 backdrop-blur-sm shadow-inner">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-muted/50">
                                {sortedColumns.map((col, idx) => {
                                    const leftOffset = getPinnedOffset(col.id);
                                    const isLastPinned = pinnedCols.has(col.id) && !pinnedCols.has(sortedColumns[idx + 1]?.id);

                                    return (
                                        <th
                                            key={col.id}
                                            className={cn(
                                                "px-6 py-5 border-b border-primary/5 font-black text-[10px] tracking-[0.2em] text-slate-700 transition-all duration-300",
                                                pinnedCols.has(col.id) ? "sticky z-20 bg-muted/95 backdrop-blur-md" : "relative",
                                                isLastPinned && "shadow-[10px_0_15px_-10px_rgba(0,0,0,0.15)] border-r border-primary/10"
                                            )}
                                            style={{ minWidth: col.width || 150, left: leftOffset }}
                                        >
                                            <div className="flex items-center justify-between group/header">
                                                <div
                                                    className={cn("flex items-center gap-2 cursor-pointer transition-colors", col.sortable && "hover:text-primary")}
                                                    onClick={() => col.sortable && handleSort(col.id)}
                                                >
                                                    {col.header}
                                                    {col.sortable && (
                                                        <ArrowUpDown size={12} className={cn(
                                                            "opacity-0 transition-all",
                                                            sortConfig.find(s => s.key === col.id) ? "opacity-100 text-primary rotate-180" : "group-hover/header:opacity-100"
                                                        )} />
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => togglePin(col.id)}
                                                    className={cn(
                                                        "opacity-0 group-hover/header:opacity-100 transition-all hover:text-primary p-1 rounded-md hover:bg-primary/10",
                                                        pinnedCols.has(col.id) && "opacity-100 text-primary"
                                                    )}
                                                >
                                                    {pinnedCols.has(col.id) ? <PinOff size={11} /> : <Pin size={11} />}
                                                </button>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-primary/5">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={`grid-loading-row-${i}`} className="animate-pulse">
                                        {sortedColumns.map((c, j) => <td key={`grid-loading-cell-${j}`} className="px-6 py-6 border-b border-primary/5"><div className="h-4 bg-muted rounded-lg w-3/4" /></td>)}
                                    </tr>
                                ))
                            ) : filteredData.map((item, rowIdx) => (
                                <tr key={`row-${item[keyField] || rowIdx}`} className="group hover:bg-primary/[0.02] transition-colors">
                                    {sortedColumns.map((col, colIdx) => {
                                        const isEditing = editingCell?.rowId === item[keyField] && editingCell?.colId === col.id;
                                        const value = typeof col.accessor === 'function' ? col.accessor(item) : item[col.accessor as keyof T];
                                        const leftOffset = getPinnedOffset(col.id);
                                        const isLastPinned = pinnedCols.has(col.id) && !pinnedCols.has(sortedColumns[colIdx + 1]?.id);

                                        return (
                                            <td
                                                key={`cell-${col.id}`}
                                                className={cn(
                                                    "px-6 py-5 border-b border-primary/5 transition-all duration-300",
                                                    pinnedCols.has(col.id) ? "sticky z-10 bg-background/95 backdrop-blur-md group-hover:bg-primary/[0.03]/95" : "relative group-hover:bg-primary/[0.01]",
                                                    isLastPinned && "shadow-[10px_0_15px_-10px_rgba(0,0,0,0.15)] border-r border-primary/10",
                                                    col.className
                                                )}
                                                style={{ left: leftOffset }}
                                            >
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2 animate-in fade-in zoom-in-95">
                                                        <input
                                                            autoFocus
                                                            className="bg-card border-2 border-primary rounded-[0.1rem] px-3 py-1.5 text-sm font-bold w-full outline-none shadow-lg shadow-primary/10 ring-4 ring-primary/5"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') saveEdit();
                                                                if (e.key === 'Escape') setEditingCell(null);
                                                            }}
                                                            onBlur={saveEdit}
                                                        />
                                                        <button onClick={saveEdit} className="p-1.5 bg-primary text-white rounded-lg shadow-lg shadow-primary/20"><Check size={14} /></button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={cn(
                                                            "flex items-center justify-between group/cell transition-all",
                                                            col.editable && "cursor-text hover:bg-primary/5 rounded-lg px-2 -mx-2 py-1"
                                                        )}
                                                        onClick={() => startEditing(item, col)}
                                                    >
                                                        <div className="text-sm font-bold text-foreground overflow-hidden truncate">
                                                            {value}
                                                        </div>
                                                        {col.editable && (
                                                            <Edit2 size={10} className="opacity-0 group-hover/cell:opacity-40 text-primary transition-opacity" />
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between px-6 pt-4 border-t border-primary/5 mt-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-700 tracking-tight">라이브 엔진 활성</span>
                    </div>
                    <div className="h-4 w-px bg-muted" />
                    <span className="text-[10px] font-black text-slate-700 underline decoration-primary/30 underline-offset-4">
                        {filteredData.length}개의 레코드 검색됨
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="rounded-[0.1rem] text-[10px] font-black tracking-tight disabled:opacity-30">이전</Button>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3].map(p => (
                            <Button key={`page-${p}`} variant={p === 1 ? "default" : "ghost"} size="sm" className="w-9 h-9 rounded-[0.1rem] text-[10px] font-black p-0 shadow-sm">{p}</Button>
                        ))}
                    </div>
                    <Button variant="ghost" size="sm" className="rounded-[0.1rem] text-[10px] font-black tracking-tight">다음</Button>
                </div>
            </div>
        </div>
    );
}
