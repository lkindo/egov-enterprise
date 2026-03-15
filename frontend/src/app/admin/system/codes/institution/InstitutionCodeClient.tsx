'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { codeAdminService, InstitutionCode, InstitutionCodeRecptn } from '@/services/admin/system/CodeAdminService';
import { useToast } from '@/app/components/ui/toast';
import { CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { PagePagination } from '@/components/common/PagePagination';

export default function InstitutionCodeClient({ initialData }: { initialData: any }) {
    const [activeTab, setActiveTab] = useState<'list' | 'reception'>('list');
    const [data, setData] = useState<InstitutionCode[]>(initialData?.list || []);
    const [receptionData, setReceptionData] = useState<InstitutionCodeRecptn[]>([]);
    const [total, setTotal] = useState(initialData?.total || 0);
    const [loading, setLoading] = useState(false);
    const [pageIndex, setPageIndex] = useState(1);
    const [searchWrd, setSearchWrd] = useState('');
    const { toast } = useToast();

    const loadListData = async (wrd: string = searchWrd, page: number = pageIndex) => {
        try {
            setLoading(true);
            const res = await codeAdminService.getInstitutionCodeList({ searchWrd: wrd, pageIndex: page });
            setData(res.list || []);
            setTotal(res.total || 0);
            setPageIndex(page);
        } catch (error) {
            toast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadReceptionData = async (wrd: string = searchWrd, page: number = pageIndex) => {
        try {
            setLoading(true);
            const res = await codeAdminService.getInstitutionCodeRecptnList({ searchWrd: wrd, pageIndex: page });
            setReceptionData(res.list || []);
            setTotal(res.total || 0);
            setPageIndex(page);
        } catch (error) {
            toast('수신 내역을 불러오는 중 오류가 발생했습니다.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = async (item: InstitutionCodeRecptn) => {
        if (!confirm(`${item.allInsttNm} 코드를 반영하시겠습니까?`)) return;
        
        try {
            await codeAdminService.processInstitutionCodeRecptn({
                occrrncDe: item.occrrncDe,
                insttCode: item.insttCode,
                opertSn: item.opertSn
            });
            toast('성공적으로 반영되었습니다.', 'success');
            loadReceptionData();
        } catch (error) {
            toast('반영 처리 중 오류가 발생했습니다.', 'error');
        }
    };

    useEffect(() => {
        if (activeTab === 'list') {
            loadListData();
        } else {
            loadReceptionData();
        }
    }, [activeTab]);

    const listColumns: Column<InstitutionCode>[] = [
        { header: '기관코드', accessor: 'insttCode', className: 'w-32' },
        { header: '전체기관명', accessor: 'allInsttNm' },
        { header: '최하위기관명', accessor: 'lowestInsttNm' },
        { header: '전화번호', accessor: 'telno', className: 'w-40' },
        { 
            header: '폐지여부', 
            accessor: (item: InstitutionCode) => (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.ablEnnc === '0' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                    {item.ablEnnc === '0' ? '활성' : '폐지'}
                </span>
            ),
            className: 'w-24 text-center'
        },
    ];

    const receptionColumns: Column<InstitutionCodeRecptn>[] = [
        { header: '발생일자', accessor: 'occrrncDe', className: 'w-24' },
        { header: '기관코드', accessor: 'insttCode', className: 'w-28' },
        { header: '기관명', accessor: 'allInsttNm' },
        { 
            header: '변경구분', 
            accessor: (item: InstitutionCodeRecptn) => (
                <span className="font-medium text-blue-600">{item.changeSeCode === '1' ? '신규' : item.changeSeCode === '2' ? '수정' : '폐기'}</span>
            ),
            className: 'w-20 text-center'
        },
        { 
            header: '처리상태', 
            accessor: (item: InstitutionCodeRecptn) => (
                <div className="flex items-center gap-1 justify-center">
                    {item.processSe === '1' ? (
                        <span className="text-green-600 flex items-center gap-1 font-bold"><CheckCircle size={14} /> 완료</span>
                    ) : (
                        <span className="text-amber-600 flex items-center gap-1 font-bold"><Clock size={14} /> 대기</span>
                    )}
                </div>
            ),
            className: 'w-24 text-center'
        },
        {
            header: '작업',
            accessor: (item: InstitutionCodeRecptn) => (
                item.processSe !== '1' && (
                    <button 
                        onClick={() => handleProcess(item)}
                        className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition-colors font-bold"
                    >
                        데이터 반영
                    </button>
                )
            ),
            className: 'w-24 text-center'
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="기관코드 수신 및 관리"
                breadcrumbs={[{ label: '시스템관리' }, { label: '코드관리' }, { label: '기관코드' }]}
            />

            <div className="flex border-b border-slate-200">
                <button 
                    onClick={() => setActiveTab('list')}
                    className={`px-6 py-3 font-bold transition-all border-b-2 ${activeTab === 'list' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    기관코드 현황
                </button>
                <button 
                    onClick={() => setActiveTab('reception')}
                    className={`px-6 py-3 font-bold transition-all border-b-2 ${activeTab === 'reception' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    수신 내역 관리
                </button>
            </div>

            <StandardSearchFilter
                fields={[
                    { name: 'searchWrd', label: '기관명', type: 'text', placeholder: '기관명 입력...' }
                ]}
                onSearch={(v) => {
                    setSearchWrd(v.searchWrd);
                    activeTab === 'list' ? loadListData(v.searchWrd, 1) : loadReceptionData(v.searchWrd, 1);
                }}
            />

            {activeTab === 'list' ? (
                <StandardDataTable
                    columns={listColumns}
                    data={data}
                    loading={loading}
                    emptyMessage="조회된 기관코드가 없습니다."
                />
            ) : (
                <StandardDataTable
                    columns={receptionColumns}
                    data={receptionData}
                    loading={loading}
                    emptyMessage="수신된 내역이 없습니다."
                />
            )}

            <PagePagination
                total={total}
                size={10}
                page={pageIndex}
                onPageChange={(p) => activeTab === 'list' ? loadListData(searchWrd, p) : loadReceptionData(searchWrd, p)}
            />
        </div>
    );
}
