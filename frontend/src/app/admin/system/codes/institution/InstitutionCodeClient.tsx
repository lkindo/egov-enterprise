'use client';

import React, { useState, useEffect } from 'react';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { codeAdminService, InstitutionCode, InstitutionCodeRecptn } from '@/services/foundation/system/CodeAdminService';
import { useToast } from '@/app/components/ui/toast';
import { 
 CheckCircle, 
 Clock, 
 RefreshCw, 
 Database, 
 Search, 
 Plus, 
 Filter, 
 Layers, 
 ArrowRight, 
 ShieldCheck, 
 Activity, 
 Building2, 
 History, 
 Server,
 Download,
 FileCode,
 Globe,
 Zap,
 ChevronRight,
 MonitorCheck,
 CheckCircle2,
 XCircle,
 Network
} from 'lucide-react';
import { PagePagination } from '@/components/common/PagePagination';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
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
 toast('�����͸� �ҷ����� �� ������ �߻��߽��ϴ�.', 'error');
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
 toast('���� ������ �ҷ����� �� ������ �߻��߽��ϴ�.', 'error');
 } finally {
 setLoading(false);
 }
 };

 const handleProcess = async (item: InstitutionCodeRecptn) => {
 if (!confirm(`${item.allInsttNm} �ڵ带 �ݿ��Ͻðڽ��ϱ�?`)) return;
 
 try {
 await codeAdminService.processInstitutionCodeRecptn({
 occrrncDe: item.occrrncDe,
 insttCode: item.insttCode,
 opertSn: item.opertSn
 });
 toast('���������� �ݿ��Ǿ����ϴ�.', 'success');
 loadReceptionData();
 } catch (error) {
 toast('�ݿ� ó�� �� ������ �߻��߽��ϴ�.', 'error');
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
 header: '��� �ĺ���', 
 accessor: (item: InstitutionCode) => (
 <div className="flex items-center gap-4 py-3">
 <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
 <Building2 size={20} />
 </div>
 <div>
 <span className="font-bold tracking-tight text-foreground block text-lg uppercase leading-none">{item.insttCode}</span>
 <span className="text-xs font-bold text-muted-foreground tracking-[0.3em] mt-2 uppercase opacity-40">��� �ĺ��ڵ�</span>
 </div>
 </div>
 )
 },
 { 
 header: '��� ��Ī (Full Name)', 
 accessor: (item: InstitutionCode) => (
 <span className="font-bold text-foreground text-sm tracking-tight">{item.allInsttNm}</span>
 )
 },
 { 
 header: '������ �����', 
 accessor: (item: InstitutionCode) => (
 <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg w-fit">
 <span className="text-xs font-bold text-primary tracking-tight font-mono">{item.lowestInsttNm}</span>
 </div>
 ),
 className: 'w-48'
 },
 { 
 header: '����ó ����', 
 accessor: (item: InstitutionCode) => (
 <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground tracking-tight tabular-nums">
 <Network size={12} className="opacity-30" />
 {item.telno || '---'}
 </div>
 ),
 className: 'w-40' 
 },
 { 
 header: '��������', 
 accessor: (item: InstitutionCode) => (
 <div className={cn(
 "flex items-center gap-2 px-4 py-1.5 rounded-full border w-fit shadow-sm",
 item.ablEnnc === '0' 
 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
 : "bg-slate-100 text-slate-400 border-border/50"
 )}>
 {item.ablEnnc === '0' ? <Activity size={12} className="animate-pulse" /> : <ShieldCheck size={12} className="opacity-40" />}
 <span className="text-xs font-bold tracking-[0.2em] uppercase">{item.ablEnnc === '0' ? 'Ȱ��' : '������'}</span>
 </div>
 ),
 className: 'w-32 text-center'
 },
 ];

 const receptionColumns: Column<InstitutionCodeRecptn>[] = [
 { 
 header: '�߻�����', 
 accessor: (item: InstitutionCodeRecptn) => (
 <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/60 tracking-tight ">
 <History size={14} className="text-primary opacity-40" />
 {item.occrrncDe}
 </div>
 ),
 className: 'w-48' 
 },
 { 
 header: '��� �ĺ���', 
 accessor: (item: InstitutionCodeRecptn) => (
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shadow-inner">
 <Database size={18} />
 </div>
 <span className="font-bold tracking-tight text-foreground uppercase">{item.insttCode}</span>
 </div>
 ),
 className: 'w-40' 
 },
 { header: '��� ��Ī', accessor: 'allInsttNm', className: 'font-bold' },
 { 
 header: '����ȭ ����', 
 accessor: (item: InstitutionCodeRecptn) => {
 const typeMap: any = {
 '1': { label: '�ű� ���', color: 'bg-primary/20 text-primary border-primary/20', icon: <Plus size={12} /> },
 '2': { label: '���� ������Ʈ', color: 'bg-amber-500/20 text-amber-600 border-amber-500/20', icon: <RefreshCw size={12} /> },
 '3': { label: '������ ����', color: 'bg-rose-500/20 text-rose-600 border-rose-500/20', icon: <ShieldCheck size={12} /> }
 };
 const config = typeMap[item.changeSeCode] || typeMap['1'];
 return (
 <div className={cn("flex items-center gap-2 px-3 py-1 rounded-lg border w-fit font-bold text-xs tracking-widest uppercase", config.color)}>
 {config.icon}
 {config.label}
 </div>
 );
 },
 className: 'w-40'
 },
 { 
 header: '���������� ���', 
 accessor: (item: InstitutionCodeRecptn) => (
 <div className={cn(
 "flex items-center gap-2 px-4 py-1.5 rounded-full border w-fit shadow-sm",
 item.processSe === '1' 
 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
 : "bg-amber-500/10 text-amber-600 border-amber-500/20"
 )}>
 {item.processSe === '1' ? <CheckCircle2 size={12} /> : <Clock size={12} className="animate-spin duration-[3s]" />}
 <span className="text-xs font-bold tracking-[0.2em] uppercase">{item.processSe === '1' ? '����ȭ��' : '��� ��'}</span>
 </div>
 ),
 className: 'w-32'
 },
 {
 header: '������ �۾�',
 accessor: (item: InstitutionCodeRecptn) => (
 item.processSe !== '1' && (
 <Button 
 onClick={() => handleProcess(item)}
 className="h-10 px-6 rounded-lg bg-primary border-none text-white font-bold text-xs tracking-widest uppercase shadow-xl hover:brightness-110 transition-all gap-2"
 >
 <MonitorCheck size={14} /> �ݿ� ����
 </Button>
 )
 ),
 className: 'w-32 text-right'
 }
 ];

 return (
 <div className="space-y-12 animate-in fade-in duration-1000">
 
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-slate-100 pb-10">
 <div className="space-y-1">
 <h4 className="text-3xl font-bold tracking-tight text-foreground uppercase">{activeTab === 'list' ? '��� ������ ����Ʈ' : '����ȭ ����������'}</h4>
 <p className="text-xs font-bold text-muted-foreground/40 tracking-[0.4em] uppercase">{activeTab === 'list' ? 'Ȱ�� ��� �κ��丮 �� �ĺ� ü�� ����' : '�ǽð� ������ ���� �� �浹 �ذ�'}</p>
 </div>
 <div className="flex bg-slate-100/80 backdrop-blur-md p-2 rounded-lg border border-slate-200/50 shadow-inner">
 <button 
 onClick={() => setActiveTab('list')}
 className={cn(
 "px-8 h-12 rounded-lg font-bold text-xs tracking-widest uppercase transition-all flex items-center gap-2",
 activeTab === 'list' ? "bg-white text-slate-900 shadow-xl ring-1 ring-slate-100" : "text-muted-foreground hover:bg-white/50"
 )}>
 <Server size={14} /> ��� �κ��丮
 </button>
 <button 
 onClick={() => setActiveTab('reception')}
 className={cn(
 "px-8 h-12 rounded-lg font-bold text-xs tracking-widest uppercase transition-all flex items-center gap-2",
 activeTab === 'reception' ? "bg-white text-slate-900 shadow-xl ring-1 ring-slate-100" : "text-muted-foreground hover:bg-white/50"
 )}>
 <History size={14} /> ���� ����������
 </button>
 </div>
 </div>

 <HubMetricGrid>
 <HubMetricCard title="�κ��丮 ����" value={total} icon={Database} color="primary" />
 <HubMetricCard title="Ȱ�� ��� ��" value={data.filter(i => i.ablEnnc === '0').length || 0} icon={ShieldCheck} color="emerald" />
 <HubMetricCard title="��� ���� Ŀ��" value={receptionData.filter(i => i.processSe !== '1').length || 0} icon={Clock} color="amber" status={receptionData.filter(i => i.processSe !== '1').length > 0 ? "����" : "����"} />
 <HubMetricCard title="����ȭ ó����" value="����" icon={Zap} color="indigo" />
 </HubMetricGrid>

 <HubSectionCard
 title={activeTab === 'list' ? "��� �κ��丮 ���̺귯��" : "������ ���� ���������� ����"}
 description={activeTab === 'list' ? "�ý��� ���ݿ��� �����ϴ� ��� ������� ��� �ĺ����� Ȱ�� ������ ����Ʈ�Դϴ�." : "�ܺ� �ý��� ������ ���� ���������� ���ԵǴ� �ڵ� ���� �������� ���� �� �ݿ� �̷��Դϴ�."}
 icon={activeTab === 'list' ? Globe : Zap}
 >
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
 <div className="flex-1">
 <div className="relative group/search max-w-xl">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
 <Input
 placeholder="Ȱ�� ��� �� ���������� ��� �˻�.."
 value={searchWrd}
 onChange={(e) => setSearchWrd(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 activeTab === 'list' ? loadListData(searchWrd, 1) : loadReceptionData(searchWrd, 1);
 }
 }}
 className="h-12 pl-16 pr-8 w-full bg-slate-50/50 border-none rounded-lg text-xs font-bold tracking-widest uppercase shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
 />
 </div>
 </div>
 <Button variant="outline" size="lg" className="h-12 px-10 rounded-lg border-2 font-bold text-xs tracking-widest uppercase gap-2 hover:bg-slate-50 transition-all group">
 <Download size={18} className="group-hover:translate-y-0.5 transition-transform" /> ������ ��������
 </Button>
 </div>

 <div className="overflow-hidden">
 <StandardDataTable
 columns={(activeTab === 'list' ? listColumns : receptionColumns) as any}
 data={(activeTab === 'list' ? data : receptionData) as any}
 loading={loading}
 emptyMessage={activeTab === 'list' ? "��ȸ�� ��� ��尡 �����ϴ�." : "���ŵ� ����ȭ �αװ� �������� �ʽ��ϴ�."}
 className="border-none bg-transparent"
 />
 </div>

 <AnimatePresence>
 {total > 10 && (
 <motion.div 
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="mt-12 flex justify-center border-t border-slate-100 pt-10"
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

