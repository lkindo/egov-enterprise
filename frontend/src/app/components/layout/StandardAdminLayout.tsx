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

 /** ?꾩껜 ?덉퐫님님*/
 totalCount?: number;
 /** ?섏씠吏님님ぉ 님(湲곕낯 10) */
 pageSize?: number;
 /** 현재 ?섏씠吏 踰덊샇 (1-based) */
 currentPage?: number;
 /** ?섏씠吏 蹂寃?肄쒕갚 */
 onPageChange?: (page: number) => void;

 actionButton?: React.ReactNode;
 children?: React.ReactNode; // 紐⑤떖 님異붽? ?붿냼
}

/**
 * ?쒖? 愿由ъ옄 ?섏씠吏 ?덉씠?꾩썐 而댄룷?뚰듃
 * - 寃님?꾪꽣, ?곗씠님洹몃━님 ?섏씠吏 ?ㅻ뜑瑜님듯빀님?쒖? ?⑦꽩
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

