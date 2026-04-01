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
 } catch {
 toast('?곗씠?곕? 遺덈윭?ㅻ뒗 以님ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', 'error');
 } finally {
 setLoading(false);
 }
 };

 const columns = [
 { 
 header: '?깅챸', 
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
 header: '?뚯냽湲곌?', 
 accessor: (item: any) => (
 <div className="flex items-center gap-2 text-slate-600">
 <Building2 size={14} className="opacity-40" />
 <span>{item.psitnInsttNm}</span>
 </div>
 )
 },
 { 
 header: '?곕씫泥?, 
 accessor: (item: any) => (
 <div className="flex items-center gap-2 text-slate-500 font-mono text-sm">
 <Phone size={14} className="opacity-40" />
 <span>{`${item.areaNo}-${item.middleTelno}-${item.endTelno}`}</span>
 </div>
 )
 },
 { 
 header: '?대찓님, 
 accessor: (item: any) => (
 <div className="flex items-center gap-2 text-slate-500">
 <Mail size={14} className="opacity-40" />
 <span className="text-sm">{item.emailAdres}</span>
 </div>
 )
 },
 { 
 header: '?앸뀈?붿씪', 
 accessor: 'brthdy',
 className: 'w-32 text-slate-400 text-sm'
 }
 ];

 return (
 <div className="space-y-6 max-w-6xl mx-auto pb-20">
 <PageHeader
 title="?몃님몄궗?뺣낫 愿由?
 breadcrumbs={[{ label: '?댁쁺吏님 }, { label: '?됱궗愿由? }, { label: '?몃님몄궗?뺣낫' }]}
 actions={
 <button className="h-11 px-6 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200">
 <Plus size={18} /> ?몄궗 ?뺣낫 등록
 </button>
 }
 />

 <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
 <StandardSearchFilter
 fields={[
 { name: 'name', label: '?몄궗 ?깅챸', type: 'text', placeholder: '?깅챸님?낅젰?섏꽭님..' }
 ]}
 onSearch={(v) => loadData(v.name)}
 />
 </div>

 <div className="bg-white p-2 rounded-[2.5rem] border border-slate-100 shadow-xl">
 <StandardDataTable
 columns={columns}
 data={data}
 loading={loading}
 emptyMessage="등록님?몃님몄궗 ?뺣낫媛 ?놁뒿?덈떎."
 />
 </div>
 </div>
 );
}

