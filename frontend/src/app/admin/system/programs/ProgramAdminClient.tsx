'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { Input } from '@/components/ui/input';
import { Program } from '@/types/foundation/program';
import { PageResponse } from '@/types/foundation/system';
import { programAdminService } from '@/services/foundation/system/ProgramAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import {
 Plus,
 Trash2,
 Settings,
 Cpu,
 Globe,
 ShieldCheck,
 FileCode,
 Terminal,
 Link as LinkIcon,
 Search,
 RefreshCcw,
 Activity,
 Box,
 Layers,
 Zap,
 CheckCircle2,
 ShieldAlert,
 SearchCode,
 Database
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import {
 Tooltip,
 TooltipContent,
 TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { ProgramForm } from '@/components/admin/system/ProgramForm';
import { z } from 'zod';
import { useAppForm } from '@/hooks/useAppForm';

const programSchema = z.object({
 progrmFileNm: z.string()
 .min(1, '���ϸ��� �ʼ��Դϴ�.')
 .max(60, '���ϸ��� 60�� �̳����� �մϴ�.'),
 progrmStrePath: z.string()
 .max(100, '��ΰ� �ʹ� ��ϴ�. (�ִ� 100��)')
 .optional()
 .or(z.literal('')),
 progrmKoreanNm: z.string()
 .min(1, '���α׷� ��Ī�� �ʼ��Դϴ�.')
 .max(60, '��Ī�� 60�� �̳����� �մϴ�.'),
 url: z.string()
 .min(1, '��������Ʈ URL�� �ʼ��Դϴ�.')
 .startsWith('/', 'URL�� /�� �����ؾ� �մϴ�.')
 .max(100, 'URL�� 100�� �̳����� �մϴ�.'),
 progrmDc: z.string()
 .max(200, '������ �ʹ� ��ϴ�. (�ִ� 200��)')
 .optional()
 .or(z.literal('')),
});

type ProgramFormValues = z.infer<typeof programSchema>;

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

export default function ProgramAdminClient({ initialData, searchWrd }: { initialData: PageResponse<Program>; searchWrd: string }) {
 const { toast } = useToast();
 const confirm = useConfirm();

 const [isModalOpen, setIsOpen] = useState(false);
 const [mode, setMode] = useState<'create' | 'edit'>('create');
 
 const form = useAppForm(programSchema, {
 defaultValues: {
 progrmFileNm: '',
 progrmStrePath: '',
 progrmKoreanNm: '',
 url: '',
 progrmDc: ''
 }
 });

 const [data, setData] = useState<Program[]>(() => {
 return (initialData?.list || []) as Program[];
 });
 const [total, setTotal] = useState<number>(() => {
 return initialData?.total || 0;
 });
 const [loading, setLoading] = useState(false);
 const [currentSearchWrd, setCurrentSearchWrd] = useState(searchWrd);

 const loadData = async (wrd: string = currentSearchWrd, page: number = 1) => {
 try {
 setLoading(true);
 const res = await programAdminService.getProgramList({ page: page - 1, size: 10, searchWrd: wrd });

 const list = (res.list || []) as Program[];
 const totalCount = res.total || 0;

 setData(list);
 setTotal(totalCount);
 } catch (error: unknown) {
 toast('�����͸� �ҷ����� �� ������ �߻��߽��ϴ�.', 'error');
 } finally {
 setLoading(false);
 }
 };

 const handleOpenCreate = () => {
 setMode('create');
 form.reset({ progrmFileNm: '', progrmStrePath: '', progrmKoreanNm: '', url: '', progrmDc: '' });
 setIsOpen(true);
 };

 const handleOpenEdit = (program: Program) => {
 setMode('edit');
 form.reset(program);
 setIsOpen(true);
 };


 const handleDelete = async (name: string) => {
 const isConfirmed = await confirm({
 title: '���α׷� ����',
 message: `[${name}] ���α׷��� �����Ͻðڽ��ϱ�? �ش� ���α׷��� ����� ��� �޴� ������ ������ �� �ֽ��ϴ�.`,
 variant: 'destructive',
 confirmText: '���� ����'
 });
 if (isConfirmed) {
 try {
 await programAdminService.deleteProgram(name);
 toast('���α׷��� �����Ǿ����ϴ�.', 'success');
 loadData();
 } catch (err: any) {
 toast(err.message || '���� �� ������ �߻��߽��ϴ�.', 'error');
 }
 }
 };

 const columns: Column<Program>[] = [
 {
 header: '���ϸ�',
 accessor: (item: Program) => (
 <div className="flex items-center gap-4 py-3">
 <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
 <Cpu size={20} />
 </div>
 <div className="text-left">
 <span className="font-bold tracking-tight text-foreground block text-md uppercase leading-none">{item.progrmKoreanNm}</span>
 <span className="text-xs font-bold text-slate-600 tracking-[0.3em] mt-2 uppercase opacity-100 text-left">SYSTEM_MODULE</span>
 </div>
 </div>
 )
 },
 {
 header: '�ĺ� ���ϸ�',
 accessor: (item: Program) => (
 <div className="flex justify-start">
 <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg w-fit">
 <span className="text-xs font-bold text-primary tracking-tight font-mono">{item.progrmFileNm}</span>
 </div>
 </div>
 ),
 className: 'w-48'
 },
 {
 header: '��������Ʈ(API/URL)',
 accessor: (item: Program) => (
 <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-600 tracking-tight text-left">
 <LinkIcon size={12} className="text-primary opacity-40 shrink-0" />
 <span className="truncate">{item.url}</span>
 </div>
 ),
 className: 'w-64'
 },
 {
 header: '����',
 className: 'text-right w-32',
 accessor: (item: Program) => (
 <div className="flex justify-end gap-2 pr-4">
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-100 hover:bg-primary hover:border-primary hover:text-white transition-all" onClick={() => handleOpenEdit(item)}>
 <Settings size={16} />
 </Button>
 </TooltipTrigger>
 <TooltipContent side="top" className="bg-slate-900 text-white border-none rounded-lg px-4 py-2 text-xs font-bold tracking-widest uppercase">
 ���α׷� �Ӽ� �� ��������Ʈ ����
 </TooltipContent>
 </Tooltip>

 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-500 hover:text-white transition-all rounded-lg" onClick={() => handleDelete(item.progrmFileNm)}>
 <Trash2 size={16} />
 </Button>
 </TooltipTrigger>
 <TooltipContent side="top" className="bg-slate-900 text-white border-none rounded-lg px-4 py-2 text-xs font-bold tracking-widest uppercase text-rose-300">
 �ý��� �ڻ� ���� ����
 </TooltipContent>
 </Tooltip>
 </div>
 )
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="�ý��� ���α׷� �̵����"
 breadcrumbs={[{ label: '�ý��۰���' }, { label: '���α׷� ����' }]}
 />

 <HubHeader
 title="���α׷�"
 highlight="�ڻ� ����"
 subtitle="�ý����� �����ϴ� ��� ���� ���α׷� ��� �� API ��������Ʈ�� �����ֱ⸦ �����մϴ�."
 icon={Box}
 actions={
 <Tooltip>
 <TooltipTrigger asChild>
 <Button
 onClick={handleOpenCreate}
 size="lg"
 className="h-11 px-10 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3"
 >
 <Plus size={20} /> �ű� ���
 </Button>
 </TooltipTrigger>
 <TooltipContent side="bottom" className="bg-slate-900 text-white border-none rounded-lg px-4 py-2 text-xs font-bold tracking-widest uppercase">
 ���ο� ���� ���α׷� �ڻ� ����
 </TooltipContent>
 </Tooltip>
 }
 />

 <HubMetricGrid>
 <HubMetricCard title="Ȱ��_���α׷�_��" value={total} icon={Layers} color="primary" />
 <HubMetricCard title="�ý��� ���Ἲ" value="����" icon={ShieldCheck} color="emerald" status="Ȯ�ε�" />
 <HubMetricCard title="���� �����ð�" value="99.9%" icon={Zap} color="amber" />
 <HubMetricCard title="�κ��丮 ����ȭ" value="�ǽð�" icon={RefreshCcw} color="indigo" />
 </HubMetricGrid>

 <HubSectionCard 
 title="����Ʈ���� �������丮" 
 description="���� �ý��ۿ� ��ϵǾ� ���� ���� ��� ����Ʈ���� �ڻ��� ��� �� ��Ÿ������ �����Դϴ�." 
 icon={SearchCode}
 >
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
 <div className="flex-1 max-w-2xl text-left">
 <div className="relative group/search">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
 <Input
 placeholder="���α׷��� �Ǵ� ���ϸ��� �Է��Ͽ� �˻�.."
 value={currentSearchWrd}
 onChange={(e) => setCurrentSearchWrd(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && loadData()}
 className="h-12 pl-16 pr-8 w-full bg-slate-50/50 border-none rounded-lg text-xs font-bold tracking-widest uppercase shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
 />
 </div>
 </div>
 <Button onClick={() => loadData()} size="lg" className="h-12 px-10 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-widest uppercase shadow-xl hover:bg-primary transition-all gap-2">
 <Search size={18} /> �˻�
 </Button>
 </div>

 <div className="overflow-hidden">
 <StandardDataTable
 columns={columns}
 data={data}
 loading={loading}
 emptyMessage="�ý��ۿ� ��ϵ� ���α׷� �ڻ��� �������� �ʽ��ϴ�."
 className="border-none bg-transparent"
 />
 </div>
 </HubSectionCard>

 <StandardModal
 isOpen={isModalOpen}
 onClose={() => setIsOpen(false)}
 title={mode === 'create' ? '�ű� ���α׷� ���' : '���α׷� ���� ����'}
 maxWidth="2xl"
 >
 <ProgramForm 
 open={isModalOpen}
 onOpenChange={setIsOpen}
 data={mode === 'edit' ? (form.getValues() as any) : undefined}
 onSuccess={() => {
 loadData();
 setIsOpen(false);
 }}
 />
 </StandardModal>
 </div>
 );
}

