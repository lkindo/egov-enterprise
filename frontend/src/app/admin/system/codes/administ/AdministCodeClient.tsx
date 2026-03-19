'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { codeAdminService, AdministCode } from '@/services/admin/system/CodeAdminService';
import { useToast } from '@/app/components/ui/toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { PagePagination } from '@/components/common/PagePagination';

export default function AdministCodeClient({ initialData }: { initialData: any }) {
 const [data, setData] = useState(initialData?.list || []);
 const [total, setTotal] = useState(initialData?.total || 0);
 const [loading, setLoading] = useState(false);
 const { toast } = useToast();
 const [searchWrd, setSearchWrd] = useState('');
 const [page번호, setPage번호] = useState(1);

 const loadData = async (wrd: string = searchWrd, page: number = page번호) => {
 try {
 setLoading(true);
 const res = await codeAdminService.getAdministCodeList({ searchWrd: wrd, page번호: page });
 setData(res.list || []);
 setTotal(res.total || 0);
 setPage번호(page);
 } catch (error) {
 toast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
 } finally {
 setLoading(false);
 }
 };

 const columns: Column<AdministCode>[] = [
 { header: '코드', accessor: 'administZoneCode', className: 'w-32' },
 { 
 header: '구분', 
 accessor: (item: any) => item.administZoneSe === '1' ? '법정동' : '행정동',
 className: 'w-24'
 },
 { header: '행정구역명', accessor: 'administZoneNm' },
 { header: '상위코드', accessor: 'upperAdministZoneCode', className: 'w-32' },
 { 
 header: '사용여부', 
 accessor: (item: any) => (
 <span className={`px-2 py-1 rounded-full text-sm font-bold ${item.useAt === 'Y' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
 {item.useAt === 'Y' ? '사용' : '미사용'}
 </span>
 ),
 className: 'w-24 text-center'
 },
 ];

 return (
 <div className="space-y-6">
 <PageHeader
 title="행정코드 관리"
 breadcrumbs={[{ label: '시스템관리' }, { label: '코드관리' }, { label: '행정코드' }]}
 actions={
 <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold">
 <Plus size={18} /> 코드 등록
 </button>
 }
 />

 <StandardSearchFilter
 fields={[
 { name: 'searchWrd', label: '행정구역명', type: 'text', placeholder: '검색어 입력...' }
 ]}
 onSearch={(v) => {
 setSearchWrd(v.searchWrd);
 loadData(v.searchWrd, 1);
 }}
 />

 <StandardDataTable
 columns={columns}
 data={data}
 loading={loading}
 emptyMessage="등록된 행정코드가 없습니다."
 />

 <PagePagination
 total={total}
 size={10}
 page={page번호}
 onPageChange={(p) => loadData(searchWrd, p)}
 />
 </div>
 );
}
