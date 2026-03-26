'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { operationAdminService } from '@/services/foundation/operation'/OperationAdminService';
import { useToast } from '@/app/components/ui/toast';
import { Plus, Trophy, Calendar, CheckCircle2, XCircle } from 'lucide-react';

export default function RewardManageClient({ initialData }: { initialData: any[] }) {
 const [data, setData] = useState(initialData || []);
 const [loading, setLoading] = useState(false);
 const { toast } = useToast();

 const loadData = async (name: string = '') => {
 try {
 setLoading(true);
 const res = await operationAdminService.getRewardList({ name });
 setData(res.list || []);
 } catch (error) {
 toast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
 } finally {
 setLoading(false);
 }
 };

 const columns = [
 { 
 header: '포상명', 
 accessor: (item: any) => (
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
 <Trophy size={18} />
 </div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 leading-tight">{item.rwardNm}</span>
 <span className="text-[10px] text-amber-600 font-medium tracking-tight">{item.rwardCode}</span>
 </div>
 </div>
 )
 },
 { 
 header: '수상자 ID', 
 accessor: 'rwardwnrId',
 className: 'w-32 font-mono text-sm text-slate-500'
 },
 { 
 header: '포상일자', 
 accessor: (item: any) => (
 <div className="flex items-center gap-2 text-slate-500">
 <Calendar size={14} className="opacity-40" />
 <span>{item.rwardDe}</span>
 </div>
 )
 },
 { 
 header: '승인상태', 
 accessor: (item: any) => (
 <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${
 item.confmAt === 'Y' 
 ? 'bg-emerald-50 text-emerald-600' 
 : 'bg-slate-50 text-slate-400'
 }`}>
 {item.confmAt === 'Y' ? (
 <>
 <CheckCircle2 size={12} />
 <span>승인됨</span>
 </>
 ) : (
 <>
 <XCircle size={12} />
 <span>대기중</span>
 </>
 )}
 </div>
 ),
 className: 'w-32 text-center'
 },
 { 
 header: '승인일시', 
 accessor: 'sanctnDt',
 className: 'w-40 text-slate-400 text-sm'
 }
 ];

 return (
 <div className="space-y-6 max-w-6xl mx-auto pb-20">
 <PageHeader
 title="포상 관리"
 breadcrumbs={[{ label: '운영지원' }, { label: '상훈관리' }, { label: '포상관리' }]}
 actions={
 <button className="h-11 px-6 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200">
 <Plus size={18} /> 포상 기록 등록
 </button>
 }
 />

 <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
 <StandardSearchFilter
 fields={[
 { name: 'name', label: '포상명', type: 'text', placeholder: '포상명을 검색하세요...' }
 ]}
 onSearch={(v) => loadData(v.name)}
 />
 </div>

 <div className="bg-white p-2 rounded-[2.5rem] border border-slate-100 shadow-xl">
 <StandardDataTable
 columns={columns}
 data={data}
 loading={loading}
 emptyMessage="등록된 포상 기록이 없습니다."
 />
 </div>
 </div>
 );
}
