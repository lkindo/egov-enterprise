'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { operationAdminService } from '@/services/foundation/operation/OperationAdminService';
import { useToast } from '@/app/components/ui/toast';
import { Plus, User, Building2, Mail, Phone } from 'lucide-react';

export default function ExternalHrClient({ initialData }: { initialData: any[] }) {
    const [data, setData] = useState(initialData || []);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const loadData = async (name: string = '') => {
        try {
            setLoading(true);
            const res = await operationAdminService.getExternalHrList({ name });
            setData(res.list || []);
        } catch (error) {
            toast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { 
            header: '성명', 
            accessor: (item: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <User size={14} />
                    </div>
                    <span className="font-bold text-slate-900">{item.extrlHrNm}</span>
                </div>
            )
        },
        { 
            header: '소속기관', 
            accessor: (item: any) => (
                <div className="flex items-center gap-2 text-slate-600">
                    <Building2 size={14} className="opacity-40" />
                    <span>{item.psitnInsttNm}</span>
                </div>
            )
        },
        { 
            header: '연락처', 
            accessor: (item: any) => (
                <div className="flex items-center gap-2 text-slate-500 font-mono text-sm">
                    <Phone size={14} className="opacity-40" />
                    <span>{`${item.areaNo}-${item.middleTelno}-${item.endTelno}`}</span>
                </div>
            )
        },
        { 
            header: '이메일', 
            accessor: (item: any) => (
                <div className="flex items-center gap-2 text-slate-500">
                    <Mail size={14} className="opacity-40" />
                    <span className="text-sm">{item.emailAdres}</span>
                </div>
            )
        },
        { 
            header: '생년월일', 
            accessor: 'brthdy',
            className: 'w-32 text-slate-400 text-sm'
        }
    ];

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20">
            <PageHeader
                title="외부인사정보 관리"
                breadcrumbs={[{ label: '운영지원' }, { label: '행사관리' }, { label: '외부인사정보' }]}
                actions={
                    <button className="h-11 px-6 bg-slate-900 text-white rounded-[0.1rem] font-bold flex items-center gap-2 hover:bg-slate-800 transition active:scale-95 shadow-lg shadow-slate-200">
                        <Plus size={18} /> 인사 정보 등록
                    </button>
                }
            />

            <div className="bg-white p-6 rounded-[0.1rem] border border-slate-100 shadow-sm">
                <StandardSearchFilter
                    fields={[
                        { name: 'name', label: '인사 성명', type: 'text', placeholder: '성명을 입력하세요...' }
                    ]}
                    onSearch={(v) => loadData(v.name)}
                />
            </div>

            <div className="bg-white p-2 rounded-[0.1rem] border border-slate-100 shadow-xl">
                <StandardDataTable
                    columns={columns}
                    data={data}
                    loading={loading}
                    emptyMessage="등록된 외부인사 정보가 없습니다."
                />
            </div>
        </div>
    );
}
