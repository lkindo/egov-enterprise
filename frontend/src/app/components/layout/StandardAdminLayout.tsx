'use client';

import React from 'react';
import { PageHeader } from './page-header';
import { SmartSearchPanel, FilterField } from '../ui/standard-search-filter';
import { UltimateDataGrid, ColumnDef } from '../ui/ultimate-data-grid';
import { useMessage } from '@/hooks/useMessage';
import { PagePagination } from '@/components/common/PagePagination';

interface StandardAdminLayoutProps<T extends { [key: string]: any }> {
 title: string;
 breadcrumbParent?: string;
 filterFields: FilterField[];
 onSearch: (values: Record<string, any>) => void;
 onReset?: () => void;

 gridTitle: string;
 columns: ColumnDef<T>[];
 data: T[];
 keyField: keyof T;

 /** ?„ì²´ ?ˆì½”????*/
 totalCount?: number;
 /** ?˜ì´ì§€????ª© ??(ê¸°ë³¸ 10) */
 pageSize?: number;
 /** ?„ì¬ ?˜ì´ì§€ ë²ˆí˜¸ (1-based) */
 currentPage?: number;
 /** ?˜ì´ì§€ ë³€ê²?ì½œë°± */
 onPageChange?: (page: number) => void;

 actionButton?: React.ReactNode;
 children?: React.ReactNode; // ëª¨ë‹¬ ??ì¶”ê? ?”ì†Œ
}

/**
 * ?œì? ê´€ë¦¬ì ?˜ì´ì§€ ?ˆì´?„ì›ƒ ì»´í¬?ŒíŠ¸
 * - ê²€???„í„°, ?°ì´??ê·¸ë¦¬?? ?˜ì´ì§€ ?¤ë”ë¥??µí•©???œì? ?¨í„´
 */
export function StandardAdminLayout<T extends { [key: string]: any }>({
 title,
 breadcrumbParent = 'ADMIN',
 filterFields,
 onSearch,
 onReset,
 gridTitle,
 columns,
 data,
 keyField,
 totalCount,
 pageSize = 10,
 currentPage = 1,
 onPageChange,
 actionButton,
 children
}: StandardAdminLayoutProps<T>) {
 const { t } = useMessage();

 const totalPageCount = totalCount !== undefined ? Math.max(1, Math.ceil(totalCount / pageSize)) : undefined;

 return (
 <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
 {/* 1. Page Header */}
 <PageHeader
 title={title}
 breadcrumbs={[{ label: breadcrumbParent }, { label: title }]}
 actions={actionButton}
 />

 {/* 2. Search Panel */}
 <div className="rounded-[2.5rem] bg-slate-50 border border-slate-100 p-8 shadow-inner">
 <SmartSearchPanel
 fields={filterFields}
 onSearch={onSearch}
 onReset={onReset}
 />
 </div>

 {/* 3. Data Grid + Pagination */}
 <div className="rounded-[3rem] bg-white shadow-2xl border border-slate-100 overflow-hidden ring-1 ring-slate-50">
 <UltimateDataGrid
 title={gridTitle}
 columns={columns}
 data={data}
 keyField={keyField as string}
 />
 {totalPageCount !== undefined && totalPageCount > 1 && onPageChange && (
 <div className="border-t border-slate-100 px-8 py-4">
 <PagePagination
 pagination={{
 currentPageNo: currentPage,
 totalPageCount,
 totalRecordCount: totalCount,
 recordCountPerPage: pageSize,
 }}
 onPageChange={onPageChange}
 />
 </div>
 )}
 </div>

 {/* 4. Extra Content (Modals, etc.) */}
 {children}
 </div>
 );
}
