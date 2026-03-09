'use client';

import React from 'react';
import { PageHeader } from './page-header';
import { SmartSearchPanel, FilterField } from '../ui/standard-search-filter';
import { UltimateDataGrid, ColumnDef } from '../ui/ultimate-data-grid';
import { useMessage } from '@/hooks/useMessage';

interface StandardAdminLayoutProps<T> {
    title: string;
    breadcrumbParent?: string;
    filterFields: FilterField[];
    onSearch: (values: Record<string, any>) => void;
    onReset?: () => void;
    
    gridTitle: string;
    columns: ColumnDef<T>[];
    data: T[];
    keyField: keyof T;
    
    actionButton?: React.ReactNode;
    children?: React.ReactNode; // 모달 등 추가 요소
}

/**
 * 표준 관리자 페이지 레이아웃 컴포넌트
 * - 검색 필터, 데이터 그리드, 페이지 헤더를 통합한 표준 패턴
 */
export function StandardAdminLayout<T>({
    title,
    breadcrumbParent = 'ADMIN',
    filterFields,
    onSearch,
    onReset,
    gridTitle,
    columns,
    data,
    keyField,
    actionButton,
    children
}: StandardAdminLayoutProps<T>) {
    const { t } = useMessage();

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

            {/* 3. Data Grid */}
            <div className="rounded-[3rem] bg-white shadow-2xl border border-slate-100 overflow-hidden ring-1 ring-slate-50">
                <UltimateDataGrid
                    title={gridTitle}
                    columns={columns}
                    data={data}
                    keyField={keyField as string}
                />
            </div>

            {/* 4. Extra Content (Modals, etc.) */}
            {children}
        </div>
    );
}
