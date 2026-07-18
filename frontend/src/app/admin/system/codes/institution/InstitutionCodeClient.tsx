'use client';

import React, { useState, useEffect } from 'react';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { codeAdminService, InstitutionCode, InstitutionCodeRecptn } from '@/services/foundation/system/CodeAdminService';
import { useToast } from '@/app/components/ui/toast';
import { Clock,  
 RefreshCw,  
 Database,  
 Search,  
 Plus,  
 ShieldCheck,  
 Building2,  
 History,  
 Server, 
 Download, 
 Globe, 
 Zap, 
 MonitorCheck, 
 CheckCircle2, 
 Network } from 'lucide-react';
import { PagePagination } from '@/components/common/PagePagination';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
;
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstitutionCodeClient({ initialData }: { initialData: any }) {
 const [activeTab, setActiveTab] = useState<'list' | 'reception'>('list');
 const [data, setData] = useState<InstitutionCode[]>(initialData?.list || []);
 const [receptionData, setReceptionData] = useState<InstitutionCodeRecptn[]>([]);
 const [total, setTotal] = useState(initialData?.total || 0);
 const [loading, setLoading] = useState(false);
 const [pageNo, setPageNo] = useState(1);
 const [searchWrd, setSearchWrd] = useState('');
 const { toast } = useToast();

 const loadListData = async (wrd: string = searchWrd, page: number = pageNo) => {
 try {
 setLoading(true);
 const res = await codeAdminService.getInstitutionCodeList({ searchWrd: wrd, pageNo: page });
 setData(res.list || []);
 setTotal(res.total || 0);
 setPageNo(page);
 } catch (error) {
 toast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
 } finally {
 setLoading(false);
 }
 };

 const loadReceptionData = async (wrd: string = searchWrd, page: number = pageNo) => {
 try {
 setLoading(true);
 const res = await codeAdminService.getInstitutionCodeRecptnList({ searchWrd: wrd, pageNo: page });
 setReceptionData(res.list || []);
 setTotal(res.total || 0);
 setPageNo(page);
 } catch (error) {
 toast('수신 내역을 불러오는 중 오류가 발생했습니다.', 'error');
 } finally {
 setLoading(false);
 }
 };

 const handleProcess = async (item: InstitutionCodeRecptn) => {
 if (!confirm(`${item.allInstNm} 코드를 반영하시겠습니까?`)) return;
 
 try {
 await codeAdminService.processInstitutionCodeRecptn({
 ocrnYmd: item.ocrnYmd,
 instCd: item.instCd,
 jobSn: item.jobSn
 });
 toast('성공적으로 반영되었습니다.', 'success');
 loadReceptionData();
 } catch (error) {
 toast('반영 처리 중 오류가 발생했습니다.', 'error');
 }
 };

 useEffect(() => {
 if (activeTab === 'list') {
 loadListData(searchWrd, 1);
 } else {
 loadReceptionData(searchWrd, 1);
 }
 }, [activeTab]);

 const listColumns: Column<InstitutionCode>[] = [
 { 
 header: '식별 코드', 
 accessor: (item: InstitutionCode) => (
 <div className="flex items-center gap-4 py-2">
 <div className="w-10 h-9 rounded-xl bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-lg group-hover:rotate-6 transition-transform">
 <Building2 size={18} />
 </div>
 <div>
 <span className="font-black tracking-tighter text-foreground block text-xs uppercase leading-none">{item.instCd}</span>
 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">INST_CODE</span>
 </div>
 </div>
 ),
 className: 'w-48 py-4'
 },
 { 
 header: '기관 명칭', 
 accessor: (item: InstitutionCode) => (
 <span className="font-black text-foreground text-sm tracking-tight">{item.allInstNm}</span>
 ),
 className: 'py-4'
 },
 { 
 header: '최하위 기관', 
 accessor: (item: InstitutionCode) => (
 <div className="px-3 py-1 bg-muted/50 border border-border/50 rounded-lg w-fit shadow-sm">
 <span className="text-[10px] font-black text-primary tracking-widest uppercase">{item.lwtrkInstNm}</span>
 </div>
 ),
 className: 'w-40 py-4'
 },
 { 
 header: '연락처', 
 accessor: (item: InstitutionCode) => (
 <div className="flex items-center gap-1.5 font-black text-[10px] text-muted-foreground tracking-widest tabular-nums uppercase">
 <Network size={12} className="opacity-30" />
 {item.telno || 'None'}
 </div>
 ),
 className: 'w-32 py-4' 
 },
 { 
 header: '상태', 
 accessor: (item: InstitutionCode) => (
 <div className={cn(
 "flex items-center gap-2 px-3 py-1 rounded-lg border w-fit shadow-sm",
 item.ablYn === '0' 
 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
 : "bg-muted text-muted-foreground border-border/50"
 )}>
 <div className={cn("w-1.5 h-1.5 rounded-full", item.ablYn === '0' ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
 <span className="text-[10px] font-black tracking-widest uppercase">{item.ablYn === '0' ? '사용 중' : '폐지'}</span>
 </div>
 ),
 className: 'w-24 py-4'
 },
 ];

 const receptionColumns: Column<InstitutionCodeRecptn>[] = [
 { 
 header: '발생 일자', 
 accessor: (item: InstitutionCodeRecptn) => (
 <div className="flex items-center gap-2 font-black text-[10px] text-muted-foreground tracking-widest uppercase">
 <History size={14} className="text-primary opacity-40" />
 {item.ocrnYmd}
 </div>
 ),
 className: 'w-40 py-4' 
 },
 { 
 header: '식별 코드', 
 accessor: (item: InstitutionCodeRecptn) => (
 <div className="flex items-center gap-4">
 <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shadow-inner">
 <Database size={16} />
 </div>
 <span className="font-black tracking-tighter text-foreground uppercase text-xs">{item.instCd}</span>
 </div>
 ),
 className: 'w-40 py-4' 
 },
 { header: '기관 명칭', accessor: (item) => <span className="font-black text-sm text-foreground">{item.allInstNm}</span>, className: 'py-4' },
 { 
 header: '변경 구분', 
 accessor: (item: InstitutionCodeRecptn) => {
 const typeMap: any = {
 '1': { label: '신규', color: 'bg-primary/10 text-primary border-primary/20', icon: <Plus size={12} /> },
 '2': { label: '수정', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: <RefreshCw size={12} /> },
 '3': { label: '정제', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20', icon: <ShieldCheck size={12} /> }
 };
 const config = typeMap[item.chgSeCd] || typeMap['1'];
 return (
 <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-lg border w-fit font-black text-[10px] tracking-widest uppercase shadow-sm", config.color)}>
 {config.icon}
 {config.label}
 </div>
 );
 },
 className: 'w-32 py-4'
 },
 { 
 header: '상태', 
 accessor: (item: InstitutionCodeRecptn) => (
 <div className={cn(
 "flex items-center gap-2 px-3 py-1 rounded-lg border w-fit shadow-sm",
 item.procSe === '1' 
 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
 : "bg-amber-500/10 text-amber-600 border-amber-500/20"
 )}>
 {item.procSe === '1' ? <CheckCircle2 size={12} /> : <Clock size={12} className="animate-spin duration-[3s]" />}
 <span className="text-[10px] font-black tracking-widest uppercase">{item.procSe === '1' ? '완료' : '대기'}</span>
 </div>
 ),
 className: 'w-24 py-4'
 },
 {
 header: '관리',
 accessor: (item: InstitutionCodeRecptn) => (
 item.procSe !== '1' && (
 <Button 
 onClick={() => handleProcess(item)}
 className="h-9 px-5 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-black text-[10px] tracking-widest uppercase shadow-xl hover:bg-primary transition-all gap-2 active:scale-95"
 >
 <MonitorCheck size={14} /> 반영
 </Button>
 )
 ),
 className: 'w-24 py-4 text-right'
 }
 ];

 return (
 <div className="space-y-10 pb-24 animate-in fade-in duration-1000">
 
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-border/50 pb-8">
 <div className="space-y-1">
 <h4 className="text-2xl font-black tracking-tighter text-foreground uppercase leading-none">{activeTab === 'list' ? '기관 인벤토리' : '수신 파이프라인'}</h4>
 <p className="text-[10px] font-black text-muted-foreground tracking-[0.3em] uppercase mt-2">{activeTab === 'list' ? '활성 노드 리스트' : '실시간 데이터 수집'}</p>
 </div>
 <div className="flex bg-white/40 backdrop-blur-md p-1.5 rounded-xl border border-white/60 shadow-xl ring-1 ring-black/5">
 <button 
 onClick={() => setActiveTab('list')}
 className={cn(
 "px-6 h-10 rounded-lg font-black text-[10px] tracking-widest uppercase transition-all flex items-center gap-2",
 activeTab === 'list' ? "bg-surface-inverse text-surface-inverse-foreground shadow-xl" : "text-muted-foreground hover:bg-white/50 hover:text-muted-foreground"
 )}>
 <Server size={14} /> Inventory
 </button>
 <button 
 onClick={() => setActiveTab('reception')}
 className={cn(
 "px-6 h-10 rounded-lg font-black text-[10px] tracking-widest uppercase transition-all flex items-center gap-2",
 activeTab === 'reception' ? "bg-surface-inverse text-surface-inverse-foreground shadow-xl" : "text-muted-foreground hover:bg-white/50 hover:text-muted-foreground"
 )}>
 <History size={14} /> Pipeline
 </button>
 </div>
 </div>

 <HubMetricGrid>
 <HubMetricCard title="전체 노드" value={total} icon={Database} color="primary" />
 <HubMetricCard title="활성 상태" value={data.filter(i => i.ablYn === '0').length || 0} icon={ShieldCheck} color="emerald" />
 <HubMetricCard title="대기 큐" value={receptionData.filter(i => i.procSe !== '1').length || 0} icon={Clock} color="amber" status={receptionData.filter(i => i.procSe !== '1').length > 0 ? "Pending" : "Normal"} />
 <HubMetricCard title="동기화망" value="안전" icon={Zap} color="indigo" />
 </HubMetricGrid>

 <HubSectionCard
 title={activeTab === 'list' ? "기관 인벤토리" : "수집 파이프라인"}
 description={activeTab === 'list' ? "모든 공공기관 노드 식별자의 활성 리스트입니다." : "지속적으로 유입되는 코드 변동 데이터의 수신 이력입니다."}
 icon={activeTab === 'list' ? Globe : Zap}
 >
 <div className="bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-xl p-8 mb-8 ring-1 ring-black/5">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div className="flex-1">
 <div className="relative group/search max-w-xl">
 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" size={18} />
 <Input
 placeholder="검색어를 입력하세요..."
 value={searchWrd}
 onChange={(e) => setSearchWrd(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 activeTab === 'list' ? loadListData(searchWrd, 1) : loadReceptionData(searchWrd, 1);
 }
 }}
 className="h-10 pl-14 pr-8 w-full bg-muted/50 border-none rounded-xl text-xs font-bold tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground"
 />
 </div>
 </div>
 <Button variant="outline" size="lg" className="h-10 px-8 rounded-xl border border-border bg-white font-black text-xs tracking-widest uppercase gap-2 hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all shadow-sm group">
 <Download size={18} className="group-hover:translate-y-0.5 transition-transform" /> Export
 </Button>
 </div>
 </div>

 <div className="bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-xl overflow-hidden ring-1 ring-black/5">
 <div className="p-2 overflow-hidden">
 <StandardDataTable
 columns={(activeTab === 'list' ? listColumns : receptionColumns) as any}
 data={(activeTab === 'list' ? data : receptionData) as any}
 loading={loading}
 emptyMessage="데이터가 존재하지 않습니다."
 className="border-none bg-transparent shadow-none"
 isPremium={true}
 />
 </div>
 </div>

 <AnimatePresence>
 {total > 10 && (
 <motion.div 
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="mt-10 flex justify-center"
 >
 <PagePagination
 total={total}
 size={10}
 page={pageNo}
 onPageChange={(p) => activeTab === 'list' ? loadListData(searchWrd, p) : loadReceptionData(searchWrd, p)}
 />
 </motion.div>
 )}
 </AnimatePresence>
 </HubSectionCard>
 </div>
 );
}
