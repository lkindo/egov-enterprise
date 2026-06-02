'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
 FileText, Search, Plus, Mail, Inbox, Globe, 
 Send, User, Clock, ChevronRight, MessageSquare,
 AlertCircle, ShieldCheck, Sparkles, Filter, MoreVertical,
 ArrowRight, Trash2, Zap, Layers, History, RefreshCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { memoReportService, MemoReportInfo } from '@/services/business/memoreport/memoReportService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { PageHeader } from '@/app/components/layout/page-header';

type ReportTab = 'MY' | 'RECEIVED' | 'ALL';

export default function MemoReportManagementClient() {
 const { toast } = useToast();
 const [page, setPage] = useState(1);
 const size = 10;
 const [activeTab, setActiveTab] = useState<ReportTab>('RECEIVED');
 const [searchKeyword, setSearchKeyword] = useState('');

 const handleTabChange = (tab: ReportTab) => {
 setActiveTab(tab);
 setPage(1);
 };

 // --- Data Fetching ---
 const { data: reportsData, isLoading } = useQuery({
 queryKey: ['memo-reports', activeTab, searchKeyword, page],
 queryFn: () => {
 const params = { searchKeyword, page: page - 1, size };
 if (activeTab === 'MY') return memoReportService.getMyReports(params);
 if (activeTab === 'RECEIVED') return memoReportService.getReceivedReports(params);
 return memoReportService.getMemoReports(params);
 },
 });

 const displayItems = (reportsData?.list || []) as MemoReportInfo[];
 const totalItems = reportsData?.total || 0;
 const totalPages = Math.ceil(totalItems / size);

 const columns: Column<MemoReportInfo>[] = [
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
 header: '보고 제목',
 accessor: (report) => (
 <div className="flex flex-col gap-1 py-1">
 <div className="flex items-center gap-2">
 {!report.rptrInqDt && <span className="w-1.5 h-1.5 rounded-lg bg-primary animate-pulse" />}
 <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors tracking-tight">
 {report.rptTtl}
 </span>
 </div>
 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">
 {report.memoRptYmd}
 </span>
 </div>
 )
 },
 {
 header: '작성자',
 accessor: (report) => (
 <span className="text-xs font-bold text-slate-600 tracking-tight">{report.wrterNm}</span>
 ),
 className: 'w-32'
 },
 {
 header: '수신자',
 accessor: (report) => (
 <span className="text-xs font-bold text-slate-500 tracking-tight">{report.rptrNm}</span>
 ),
 className: 'w-32'
 },
 {
 header: '상태',
 accessor: (report) => (
 <div className={cn(
 "inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all",
 report.rptrInqDt ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-slate-100 text-slate-400 border border-slate-200"
 )}>
 {report.rptrInqDt ? '수신확인' : '미열람'}
 </div>
 ),
 className: 'w-36 text-center'
 },
 {
 header: '관리',
 accessor: () => (
 <div className="flex items-center justify-end pr-4">
 <Button variant="ghost" size="icon" className="w-10 h-10 rounded-lg hover:bg-slate-100">
 <MoreVertical size={16} className="text-slate-400" />
 </Button>
 </div>
 ),
 className: 'w-24 text-right'
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="메모 보고 관리"
 breadcrumbs={[{ label: '운영지원' }, { label: '메모보고' }]}
 />

 <HubHeader 
 title="Memo Report" 
 highlight="Matrix" 
 subtitle="사내 엔터프라이즈 통합 커뮤니케이션 및 보고 내역을 관리합니다." 
 icon={Mail} 
 actions={
 <div className="flex gap-4">
 <div className="flex bg-slate-100 p-1 rounded-xl border-2 border-slate-100">
 <Button 
 variant="ghost" 
 size="sm" 
 className={cn("h-9 rounded-lg px-6 font-bold text-xs", activeTab === 'RECEIVED' && "bg-white shadow-sm text-primary")}
 onClick={() => handleTabChange('RECEIVED')}
 >
 수신함
 </Button>
 <Button 
 variant="ghost" 
 size="sm" 
 className={cn("h-9 rounded-lg px-6 font-bold text-xs", activeTab === 'MY' && "bg-white shadow-sm text-primary")}
 onClick={() => handleTabChange('MY')}
 >
 발신함
 </Button>
 <Button 
 variant="ghost" 
 size="sm" 
 className={cn("h-9 rounded-lg px-6 font-bold text-xs", activeTab === 'ALL' && "bg-white shadow-sm text-primary")}
 onClick={() => handleTabChange('ALL')}
 >
 전체
 </Button>
 </div>
 <Button className="h-11 px-8 rounded-xl bg-slate-900 text-white font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl">
 <Plus size={18} /> 신규 보고
 </Button>
 </div>
 }
 />

 <HubMetricGrid>
 <HubMetricCard title="전체 보고" value={totalItems} icon={Layers} color="primary" />
 <HubMetricCard title="미열람" value={displayItems.filter(r => !r.rptrInqDt).length} icon={Zap} color="amber" />
 <HubMetricCard title="보안 등급" value="LVL_4" icon={ShieldCheck} color="emerald" status="최상" />
 <HubMetricCard title="동기화" value="ACTIVE" icon={RefreshCcw} color="indigo" />
 </HubMetricGrid>

 <HubSectionCard 
 title="리포트 스트림" 
 description="수신된 보고 및 지시사항에 대한 실시간 데이터 유닛입니다." 
 icon={Inbox}
 className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
 >
 <div className="space-y-8">
 <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100/50 pb-10 mb-8">
 <div className="relative group max-w-xl w-full">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
 <Input 
 value={searchKeyword}
 onChange={(e) => setSearchKeyword(e.target.value)}
 className="h-11 bg-slate-50/50 border-none rounded-xl pl-16 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all" 
 placeholder="보고 제목 또는 작성자 검색.." 
 />
 </div>
 </div>

 <div className="min-h-[500px]">
 <StandardDataTable
 columns={columns}
 data={displayItems}
 loading={isLoading}
 emptyMessage="식별된 데이터 유닛이 존재하지 않습니다."
 isPremium={true}
 className="bg-transparent border-none shadow-none"
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
