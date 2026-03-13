'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { codeAdminService } from '@/services/admin/system/CodeAdminService';
import { useToast } from '@/app/components/ui/toast';
import { Download } from 'lucide-react';

export default function InstitutionCodeClient({ initialData }: { initialData: any }) {
    const [data, setData] = useState(initialData?.list || []);
    const [total, setTotal] = useState(initialData?.totalCount || 0);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const loadData = async (searchWrd: string = '', page: number = 1) => {
        try {
            setLoading(true);
            const res = await codeAdminService.getInstitutionCodes({ searchWrd, pageIndex: page });
            setData(res.list || []);
            setTotal(res.totalCount || 0);
        } catch (error) {
            toast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { header: '기관코드', accessor: 'insttCode', className: 'w-32' },
        { header: '전체기관명', accessor: 'allInsttNm' },
        { header: '최하위기관명', accessor: 'lowestInsttNm' },
        { header: '전화번호', accessor: 'telno', className: 'w-40' },
        { 
            header: '폐지여부', 
            accessor: (item: any) => (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.ablEnnc === '0' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                    {item.ablEnnc === '0' ? '활성' : '폐지'}
                </span>
            ),
            className: 'w-24 text-center'
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="기관코드 수신 및 관리"
                breadcrumbs={[{ label: '시스템관리' }, { label: '코드관리' }, { label: '기관코드' }]}
                actions={
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition-colors">
                        <Download size={18} /> 외부 코드 수신
                    </button>
                }
            />

            <StandardSearchFilter
                fields={[
                    { name: 'searchWrd', label: '기관명', type: 'text', placeholder: '기관명 입력...' }
                ]}
                onSearch={(v) => loadData(v.searchWrd, 1)}
            />

            <StandardDataTable
                columns={columns}
                data={data}
                loading={loading}
                emptyMessage="조회된 기관코드가 없습니다."
            />
        </div>
    );
}
