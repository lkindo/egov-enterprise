'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trophy, Calendar, CheckCircle2, XCircle, Search, Plus, Filter, Activity, Zap, Layers, RefreshCcw } from 'lucide-react';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { operationAdminService } from '@/services/foundation/operation/OperationAdminService';
import { useToast } from '@/app/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RewardManageClient({ initialData }: { initialData: any[] }) {
 const queryClient = useQueryClient();
 const { toast } = useToast();
 const [page, setPage] = useState(1);
 const [searchKeyword, setSearchKeyword] = useState('');
 const size = 10;

 const { data, isLoading } = useQuery({
 queryKey: ['admin-rewards', searchKeyword, page],
 queryFn: () => operationAdminService.getRewardList({
 searchKeyword,
 pageNo: page,
 pageSize: size
 }),
 initialData: { list: initialData, total: initialData.length, totalPage: Math.ceil(initialData.length / size), page: 1, size },
 });

 const rewards = data?.list || [];
 const totalItems = data?.total || 0;
 const totalPages = data?.totalPage || Math.ceil(totalItems / size);

 const columns: Column<any>[] = [
 {
 header: '번호',
 accessor: (_, index) => (
 <span className="font-mono text-xs font-bold text-slate-400">
 {index !== undefined ? (index + 1 + (page - 1) * size).toString().padStart(2, '0') : '-'}
 </span>
 ),
 className: 'w-20 text-center'
 },
 {
 header: '포상 명칭',
 accessor: (item) => (
 <div className="flex flex-col gap-1 py-1">
 <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors tracking-tight">
 {item.rwardNm}
 </span>
 <div className="flex items-center gap-2 opacity-60">
 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.rwardCode}</span>
 <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter">•</span>
 <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.rwardLevel || 'STANDARD'}</span>
 </div>
 </div>
 )
 },
 {
 header: '수상자 ID',
 accessor: 'rwardwnrId',
 className: 'w-32 font-mono text-xs font-bold text-slate-400 tracking-tighter'
 },
 {
 header: '포상일자',
 accessor: (item) => (
 <span className="text-xs font-bold text-slate-500 tabular-nums tracking-tighter">
 {item.rwardDe}
 </span>
 ),
 className: 'w-32'
 },
 {
 header: '승인상태',
 accessor: (item) => (
 <div className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${item.confmAt === 'Y'
 ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
 : 'bg-slate-100 text-slate-400 border border-slate-200'
 }`}>
 {item.confmAt === 'Y' ? '동기화승인' : '대기중'}
 </div>
 ),
 className: 'w-36 text-center'
 },
 {
 header: '승인일시',
 accessor: 'sanctnDt',
 className: 'w-48 text-slate-300 text-[10px] tabular-nums font-bold pr-8 text-right'
 }
 ];

 const handleSearch = (e: React.FormEvent) => {
 e.preventDefault();
 setPage(1);
 };

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="상훈 및 포상 관리 체계"
 breadcrumbs={[{ label: '운영지원' }, { label: '상훈관리' }, { label: '포상관리' }]}
 />

 <HubHeader
 title="Reward &"
 highlight="Honor"
 subtitle="조직 내 우수한 성과 및 공헌에 대한 포상 기록을 관리합니다."
 icon={Trophy}
 actions={
 <div className="flex gap-4">
 <Button
 variant="outline"
 onClick={() => queryClient.invalidateQueries()}
 className="h-11 w-14 rounded-xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary transition-all shadow-sm active:scale-95"
 >
 <RefreshCcw size={20} />
 </Button>
 <Button className="h-11 px-10 rounded-xl bg-slate-900 text-white font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl">
 <Plus size={20} /> 포상 기록 등록
 </Button>
 </div>
 }
 />

 <HubMetricGrid>
 <HubMetricCard title="포상 현황" value={totalItems} icon={Layers} color="amber" />
 <HubMetricCard title="동기화상태" value="확인됨" icon={Zap} color="emerald" status="동기화됨" />
 <HubMetricCard title="활성 레코드" value={rewards.length} icon={Activity} color="primary" />
 <HubMetricCard title="감시 프로브" value="안전함" icon={Filter} color="indigo" />
 </HubMetricGrid>

 <HubSectionCard
 title="포상 아카이브 매트릭스"
 description="전사적으로 관리되는 상훈 및 포상 데이터 유닛의 실시간 스트림입니다."
 icon={Trophy}
 className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
 >
 <div className="space-y-8">
 <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100/50 pb-10 mb-8">
 <form onSubmit={handleSearch} className="flex items-center gap-4 relative group/search max-w-xl w-full">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={18} />
 <Input
 placeholder="포상 명칭 또는 대상자 식별자로 분석..."
 className="h-11 pl-16 rounded-xl border-none bg-slate-50/50 text-sm font-bold tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
 value={searchKeyword}
 onChange={(e) => setSearchKeyword(e.target.value)}
 />
 <Button type="submit" className="h-11 px-10 rounded-xl bg-slate-900 text-white font-bold text-xs tracking-widest uppercase shadow-xl hover:bg-primary transition-all">ANALYZE</Button>
 </form>
 </div>

 <div className="min-h-[500px]">
 <StandardDataTable
 columns={columns}
 data={rewards}
 loading={isLoading}
 emptyMessage="식별된 포상 내역 레코드가 존재하지 않습니다."
 className="border-none bg-transparent shadow-none"
 isPremium={true}
 pagination={{
 currentPage: page,
 totalPages: totalPages,
 onPageChange: (p) => setPage(p)
 }}
 />
 </div>
 </div>
 </HubSectionCard>
 </div>
 );
}

