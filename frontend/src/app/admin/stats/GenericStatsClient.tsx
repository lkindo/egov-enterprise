'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardChartWrapper } from '@/app/components/ui/standard-chart-wrapper';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import { StatsDto } from '@/services/foundation/system'/StatsAdminService';
import {
 Calendar,
 Search,
 RefreshCcw,
 BarChart3,
 TrendingUp,
 FileText,
 MousePointer2,
 Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, subMonths } from 'date-fns';

interface GenericStatsClientProps {
 title: string;
 subtitle: string;
 breadcrumbs: { label: string }[];
 initialData: StatsDto[];
 statsName: string; // e.g., "게시물 수", "이용 건수", "보고서 건수"
 exportFilename: string;
}

export default function GenericStatsClient({
 title,
 subtitle,
 breadcrumbs,
 initialData,
 statsName,
 exportFilename
}: GenericStatsClientProps) {
 const router = useRouter();
 const searchParams = useSearchParams();
 const [loading, setLoading] = useState(false);
 
 const [fromDate, setFromDate] = useState(
 searchParams.get('fromDate') || format(subMonths(new Date(), 1), 'yyyy-MM-dd')
 );
 const [toDate, setToDate] = useState(
 searchParams.get('toDate') || format(new Date(), 'yyyy-MM-dd')
 );

 const handleSearch = () => {
 setLoading(true);
 const params = new URLSearchParams(searchParams);
 params.set('fromDate', fromDate.replace(/-/g, ''));
 params.set('toDate', toDate.replace(/-/g, ''));
 router.push(`?${params.toString()}`);
 setTimeout(() => setLoading(false), 800);
 };

 const handleRefresh = () => {
 setLoading(true);
 router.refresh();
 setTimeout(() => setLoading(false), 800);
 };

 const chartData = initialData.map(item => ({
 name: item.statsDate ? `${item.statsDate.substring(4, 6)}/${item.statsDate.substring(6, 8)}` : 'N/A',
 count: item.statsCo || 0
 }));

 const columns = [
 {
 header: '날짜',
 accessor: (item: StatsDto) => (
 <span className="font-mono font-black text-slate-900 tracking-tighter ">
 {item.statsDate ? `${item.statsDate.substring(0, 4)}-${item.statsDate.substring(4, 6)}-${item.statsDate.substring(6, 8)}` : 'N/A'}
 </span>
 )
 },
 {
 header: statsName,
 accessor: (item: StatsDto) => (
 <div className="flex items-center gap-3">
 <span className="font-mono font-black text-primary text-lg">{item.statsCo.toLocaleString()}</span>
 <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
 <div 
 className="h-full bg-primary/40" 
 style={{ width: `${Math.min(100, (item.statsCo / Math.max(...initialData.map(d => d.statsCo || 1))) * 100)}%` }} 
 />
 </div>
 </div>
 )
 }
 ];

 return (
 <div className="max-w-6xl mx-auto space-y-8 md:space-y-12 px-4 md:px-0 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
 <PageHeader
 title={title}
 breadcrumbs={breadcrumbs}
 actions={
 <div className="flex items-center gap-2 md:gap-4 flex-wrap">
 <Button
 onClick={handleRefresh}
 variant="outline"
 className="h-10 md:h-14 w-10 md:w-14 rounded-xl md:rounded-2xl border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-md active:scale-95"
 >
 <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
 </Button>
 <DataExportExcel
 data={initialData}
 headers={[{ label: '날짜', key: 'statsDate' }, { label: statsName, key: 'statsCo' }]}
 filename={exportFilename}
 />
 </div>
 }
 />

 {/* Luxury Filter Card */}
 <div className="responsive-card p-6 md:p-10 border-2 border-slate-100 bg-white/50 backdrop-blur-xl relative overflow-hidden group">
 <div className="flex flex-col md:flex-row md:items-end gap-6 relative z-10">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
 <div className="space-y-3">
 <label className="text-[10px] font-black text-slate-400 tracking-tight ml-1">분석 시작</label>
 <div className="relative">
 <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
 <Input
 type="date"
 value={fromDate}
 onChange={(e) => setFromDate(e.target.value)}
 className="h-14 pl-12 rounded-2xl border-2 border-slate-100 font-black text-sm focus:ring-4 focus:ring-primary/10 transition-all bg-white"
 />
 </div>
 </div>
 <div className="space-y-3">
 <label className="text-[10px] font-black text-slate-400 tracking-tight ml-1">분석 종료</label>
 <div className="relative">
 <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
 <Input
 type="date"
 value={toDate}
 onChange={(e) => setToDate(e.target.value)}
 className="h-14 pl-12 rounded-2xl border-2 border-slate-100 font-black text-sm focus:ring-4 focus:ring-primary/10 transition-all bg-white"
 />
 </div>
 </div>
 </div>
 <Button
 onClick={handleSearch}
 disabled={loading}
 className="h-14 px-10 bg-slate-900 text-white rounded-2xl font-black text-sm tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 min-w-[160px]"
 >
 {loading ? <RefreshCcw size={16} className="animate-spin" /> : <Search size={16} />}
 동기화
 </Button>
 </div>
 <div className="absolute right-[-2%] bottom-[-10%] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000">
 <TrendingUp size={180} />
 </div>
 </div>

 <div className="grid grid-cols-1 gap-10">
 <div className="responsive-card p-6 md:p-12 relative overflow-hidden group">
 <div className="flex items-center gap-4 mb-10">
 <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
 <BarChart3 size={24} />
 </div>
 <div>
 <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter ">{subtitle}</h3>
 <p className="text-[9px] font-black text-slate-400 tracking-[0.3em]">시간적 추이 분석</p>
 </div>
 </div>
 <StandardChartWrapper
 title={`${statsName} 시계열 추이`}
 type="area"
 data={chartData}
 dataKeys={['count']}
 loading={loading}
 height={400}
 className="border-none p-0 shadow-none bg-transparent"
 />
 </div>

 <div className="responsive-card p-6 md:p-12">
 <div className="flex items-center gap-4 mb-10 px-2">
 <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
 <Database size={24} />
 </div>
 <div>
 <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter ">데이터 무결성 매트릭스</h3>
 <p className="text-[9px] font-black text-slate-400 tracking-[0.3em]">표 형식 데이터셋 뷰</p>
 </div>
 </div>
 <div className="px-2 overflow-x-auto">
 <StandardDataTable
 columns={columns}
 data={initialData}
 loading={loading}
 emptyMessage="통계 데이터를 분석 중입니다..."
 className="border-none bg-slate-50/50 rounded-[2rem] md:rounded-[3rem] p-4 md:p-8"
 />
 </div>
 </div>
 </div>
 </div>
 );
}
