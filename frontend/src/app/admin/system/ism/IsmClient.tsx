'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { ismAdminService, InfrmlSanctn } from '@/services/foundation/system/IsmAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import {
 ShieldCheck,
 FileText,
 CheckCircle2,
 XCircle,
 Clock,
 Trash2,
 Activity,
 Sparkles,
 Info,
 ArrowRightCircle,
 ShieldAlert,
 Terminal,
 Cpu,
 Fingerprint,
 User,
 Zap,
 Layers,
 SearchCode,
 CheckCircle,
 AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useAppForm } from '@/hooks/useAppForm';
import {
 Form,
 FormControl,
 FormField as ShadcnFormField,
 FormItem,
 FormLabel,
 FormMessage,
} from '@/components/ui/form';

const ismSchema = z.object({
 returnResn: z.string().min(1, '�ǰ� �ǰ��� �ʼ� �Է� �����Դϴ�.'),
});

type IsmFormValues = z.infer<typeof ismSchema>;

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

export default function IsmClient({ initialData }: { initialData: { list: InfrmlSanctn[] } }) {
 const router = useRouter();
 const { toast } = useToast();
 const confirm = useConfirm();

 const [isModalOpen, setIsOpen] = useState(false);
 const [selectedSanctn, setSelectedSanctn] = useState<InfrmlSanctn | null>(null);
 const [loading, setLoading] = useState(false);

 const form = useAppForm(ismSchema, {
 defaultValues: {
 returnResn: ''
 }
 });

 const ismList = initialData.list || [];

 const handleOpenConfirm = (sanctn: InfrmlSanctn) => {
 setSelectedSanctn(sanctn);
 form.reset({
 returnResn: ''
 });
 setIsOpen(true);
 };

 const onFormSubmit = async (values: IsmFormValues, status: 'C' | 'R') => {
 if (!selectedSanctn) return;
 try {
 setLoading(true);
 await ismAdminService.confirmInfrmlSanctn(selectedSanctn.infrmlSanctnId, status, values.returnResn);
 toast(`���� �������� ${status === 'C' ? '���������� ����' : '�ݷ�'} ó���Ǿ����ϴ�.`, 'success');
 setIsOpen(false);
 router.refresh();
 } catch (error) {
 toast('���μ��� ó�� �� ������ �߻��߽��ϴ�.', 'error');
 } finally {
 setLoading(false);
 }
 };

 const columns: Column<InfrmlSanctn>[] = [
 {
 header: '������ �� ��Ű��ó',
 accessor: (item: InfrmlSanctn) => (
 <div className="flex items-center gap-5 py-4">
 <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center text-white/40 shadow-xl group-hover:scale-110 transition-transform">
 <Layers size={18} />
 </div>
 <div className="flex flex-col gap-1 text-left">
 <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-lg text-xs font-bold tracking-tight border border-slate-200 w-fit">
 {(item?.jobSe || item?.jobSeCode) || 'STATIC_NODE'}
 </span>
 <span className="font-bold tracking-tight text-foreground text-md uppercase leading-tight mt-1">{item?.sancltNm || 'Untitled Sequence'}</span>
 </div>
 </div>
 )
 },
 {
 header: '���� ���̵�ƼƼ',
 accessor: (item: InfrmlSanctn) => (
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-inner group-hover:bg-primary/5 group-hover:text-primary transition-colors">
 <Fingerprint size={16} />
 </div>
 <div className="flex flex-col text-left">
 <span className="text-sm font-bold text-foreground tracking-tight">{item?.applcntId || 'UNKNOWN'}</span>
 <span className="text-xs font-bold text-muted-foreground/40 tracking-[0.3em] font-mono ">ID: {item?.infrmlSanctnId?.slice(0, 8) || 'N/A'}</span>
 </div>
 </div>
 ),
 className: 'w-56'
 },
 {
 header: '���� ��� (PENDING)',
 accessor: (item: InfrmlSanctn) => {
 let status: 'Ȱ��' | 'DISABLED' | 'INACTIVE' = 'INACTIVE';
 if (item.confmAt === 'Y') status = 'Ȱ��';
 if (item.confmAt === 'R') status = 'DISABLED';
 
 return (
 <HubStatusBadge 
 status={status} 
 labels={{ Ȱ��: '���ε� (CONFIRMED)', DISABLED: '�ݷ��� (REJECTED)', INACTIVE: '���� ��� (PENDING)' }} 
 />
 );
 },
 className: 'w-48'
 },
 {
 header: '���� ����',
 className: 'text-right w-48',
 accessor: (item: InfrmlSanctn) => (
 <div className="flex justify-end gap-3 pr-4">
 {(item.confmAt === 'N' || item.confmAt === 'A') && (
 <Button
 onClick={() => handleOpenConfirm(item)}
 className="h-10 px-6 bg-slate-900 text-white rounded-lg text-xs font-bold tracking-widest uppercase hover:bg-primary transition-all active:scale-95 shadow-xl shadow-slate-900/10 flex items-center gap-2 group"
 >
 <ShieldCheck size={16} className="group-hover:rotate-12 transition-transform" /> ���� ����
 </Button>
 )}
 <Button
 variant="ghost"
 size="icon"
 className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-lg transition-all opacity-40 hover:opacity-100"
 onClick={() => toast('��ī�̺� ���� ����Դϴ�.', 'info')}
 >
 <Trash2 size={16} />
 </Button>
 </div>
 )
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="������ ���� ��Ű��ó"
 breadcrumbs={[{ label: '�ý��۰���' }, { label: '��İ���' }]}
 />

 <HubHeader 
 title="����" 
 highlight="���� ������" 
 subtitle="�԰�ȭ���� ���� ������ ���� ��û�� �����ϰ� �����ϰ� ���� �ǻ���� ü�踦 ���� �����մϴ�." 
 icon={ShieldCheck} 
 actions={
 <div className="flex gap-4 p-2 items-center">
 <div className="px-6 py-3 bg-emerald-50 border-2 border-emerald-100 rounded-lg flex items-center gap-4 shadow-sm">
 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
 <span className="text-xs font-bold text-emerald-700 tracking-widest uppercase">�ǻ����_���: �¶���</span>
 </div>
 <Button
 variant="ghost"
 onClick={() => router.refresh()}
 className="h-11 w-14 rounded-lg bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95 px-4"
 >
 <Activity size={22} className="group-hover:rotate-180 transition-transform duration-700" />
 </Button>
 </div>
 }
 />

 <HubMetricGrid>
 <HubMetricCard title="����_���_������" value={ismList.filter(i => i.confmAt === 'N' || i.confmAt === 'A').length} icon={Clock} color="amber" status="����" />
 <HubMetricCard title="����_�ڻ�_��" value={ismList.filter(i => i.confmAt === 'Y').length} icon={CheckCircle2} color="emerald" status="����" />
 <HubMetricCard title="�ݷ�_�α�_��" value={ismList.filter(i => i.confmAt === 'R').length} icon={XCircle} color="rose" />
 <HubMetricCard title="��ü_�ǻ����_��" value={ismList.length} icon={FileText} color="primary" />
 </HubMetricGrid>

 <div className="grid grid-cols-12 gap-12 text-left">
 {/* Intelligence Shield Panel */}
 <div className="col-span-12 lg:col-span-4 h-full">
 <div className="rounded-lg bg-slate-900 text-white p-12 shadow-2xl relative overflow-hidden group h-full border-none">
 <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
 <Terminal size={240} className="text-primary" />
 </div>
 <div className="relative z-10 space-y-12">
 <div className="space-y-4">
 <div className="w-20 h-20 rounded-lg bg-white/10 flex items-center justify-center border border-white/5 shadow-inner">
 <Cpu size={36} className="text-primary" />
 </div>
 <h4 className="text-3xl font-bold tracking-tight leading-tight uppercase">�Һ�<br />�ǰ� ����</h4>
 </div>
 
 <p className="text-sm text-slate-400 font-bold leading-relaxed border-l-4 border-primary pl-8">
 ��� ��� ���� ��Ű��ó�� ������ ���Ἲ ������ ��ġ�� ���� �ٰŴ� �л� ����Ǿ� ���������� ��ϵǾ� ���簡 �����մϴ�.
 </p>

 <div className="space-y-6 pt-12 border-t border-white/5">
 <div className="flex items-center justify-between group/stat">
 <span className="text-xs font-bold text-white/40 tracking-[0.3em] uppercase group-hover/stat:text-primary transition-colors">����_���_���Ἲ</span>
 <span className="text-lg font-bold font-mono tracking-tight text-emerald-500">����</span>
 </div>
 <div className="flex items-center justify-between group/stat">
 <span className="text-xs font-bold text-white/40 tracking-[0.3em] uppercase group-hover/stat:text-amber-500 transition-colors">����_��������</span>
 <span className="text-lg font-bold font-mono tracking-tight">ENF_2.0</span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Approval Inventory */}
 <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
 <HubSectionCard title="��� ���� ������ ������ ��Ʈ����" description="�ý����� ������ �ǻ������ ���� ĸó�� ��� ������ ���� ��û �ǽð� ����Դϴ�." icon={SearchCode}>
 <div className="overflow-hidden min-h-[500px]">
 <StandardDataTable
 columns={columns}
 data={ismList}
 loading={loading}
 emptyMessage="��ȸ�� ��� ���� ���������� ���� Ŭ�����Ϳ� �������� �ʽ��ϴ�."
 className="border-none bg-transparent"
 />
 </div>
 </HubSectionCard>
 </div>
 </div>

 <StandardModal
 isOpen={isModalOpen}
 onClose={() => setIsOpen(false)}
 title="���� ������ ����"
 maxWidth="xl"
 footer={
 <div className="flex w-full gap-4">
 <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-12 rounded-lg font-bold text-xs tracking-widest uppercase border-2">����_���</Button>
 <Button 
 onClick={form.handleSubmit((v) => onFormSubmit(v, 'R'))}
 disabled={loading}
 className="flex-1 h-12 bg-rose-50 text-rose-500 rounded-lg font-bold text-xs tracking-widest uppercase hover:bg-rose-500 hover:text-white transition-all active:scale-95 border-2 border-rose-100 flex items-center justify-center gap-3"
 >
 <XCircle size={18} strokeWidth={3} /> ������ �ݷ�
 </Button>
 <Button
 onClick={form.handleSubmit((v) => onFormSubmit(v, 'C'))}
 disabled={loading}
 className="flex-[2] h-12 bg-slate-900 border-none text-white rounded-lg font-bold text-xs tracking-widest uppercase shadow-2xl flex items-center justify-center gap-3 hover:-translate-y-2 hover:bg-primary transition-all active:scale-95 group"
 >
 <CheckCircle2 size={18} strokeWidth={3} className="text-primary group-hover:rotate-12 transition-transform" /> ���� ����
 </Button>
 </div>
 }
 >
 <Form {...form}>
 <form className="space-y-12 pt-4 text-left">
 <div className="p-10 bg-slate-900 rounded-lg shadow-2xl relative overflow-hidden group/modal-target">
 <div className="relative z-10 space-y-4">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20">
 <Activity size={16} className="text-primary animate-pulse" />
 </div>
 <span className="text-xs text-primary/60 font-bold tracking-[0.4em] uppercase">Target_Sequence_Probe</span>
 </div>
 <h4 className="text-3xl font-bold text-white tracking-tight uppercase leading-tight">{selectedSanctn?.sancltNm}</h4>
 <div className="flex items-center gap-6 pt-4 border-t border-white/5">
 <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-lg border border-white/5">
 <User size={14} className="text-slate-400" />
 <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{selectedSanctn?.applcntId}</span>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-xs font-bold text-white/20 tracking-[0.3em] font-mono uppercase ">UUID: {selectedSanctn?.infrmlSanctnId}</span>
 </div>
 </div>
 </div>
 <Zap size={240} className="absolute right-[-40px] bottom-[-40px] opacity-[0.03] -rotate-12 group-hover/modal-target:rotate-0 transition-transform duration-1000" />
 </div>

 <ShadcnFormField
 control={form.control}
 name="returnResn"
 render={({ field }) => (
 <FormItem className="space-y-4">
 <FormLabel className="text-xs font-bold tracking-[0.4em] text-slate-400 uppercase flex items-center gap-3">
 <SearchCode size={14} className="text-primary" /> ����/�ݷ� �ǻ���� �α� (Decision Opinion) <span className="text-rose-500 animate-pulse">*</span>
 </FormLabel>
 <FormControl>
 <textarea
 {...field}
 placeholder="���� �Ǵ� �ݷ� ������ �Է��ϼ���..."
 className="w-full min-h-[200px] p-10 rounded-lg border-2 bg-slate-50 font-bold text-lg outline-none focus:bg-white focus:ring-[12px] focus:ring-primary/5 focus:border-primary/20 transition-all shadow-inner leading-relaxed resize-none placeholder:text-slate-300"
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />

 <div className="flex items-center gap-3 px-6 py-4 bg-amber-50 border border-amber-100 rounded-lg">
 <AlertCircle size={16} className="text-amber-500" />
 <p className="text-xs font-bold text-amber-700 leading-relaxed uppercase opacity-80">
 * �ۼ��� �ǰ��� ������ �Ұ����ϸ� ��� �����ڿ��� �ǽð����� �����˴ϴ�.
 </p>
 </div>
 </form>
 </Form>
 </StandardModal>
 </div>
 );
}

