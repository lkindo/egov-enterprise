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
import { ShieldCheck, 
 FileText, 
 CheckCircle2, 
 XCircle, 
 Clock, 
 Trash2, 
 Activity, 
 Terminal, 
 Cpu, 
 Fingerprint, 
 User, 
 Zap, 
 Layers, 
 SearchCode, 
 AlertCircle } from 'lucide-react';
;
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

import { InformalSanctionDtoSchema } from '@/types/generated-zod';

const ismSchema = InformalSanctionDtoSchema.extend({
 taskSeCd: z.string().optional(),
 aplcntId: z.string().optional(),
 aprvrId: z.string().optional(),
 rjctRsnCn: z.string().min(1),
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
 rjctRsnCn: ''
 }
 });

 const ismList = initialData.list || [];

 const handleOpenConfirm = (sanctn: InfrmlSanctn) => {
 setSelectedSanctn(sanctn);
 form.reset({
 rjctRsnCn: ''
 });
 setIsOpen(true);
 };

 const onFormSubmit = async (values: IsmFormValues, status: 'C' | 'R') => {
 if (!selectedSanctn) return;
 try {
 setLoading(true);
 await ismAdminService.confirmInfrmlSanctn(selectedSanctn.infrmlSanctnId, status, values.rjctRsnCn);
 toast(`결재 시퀀스가 ${status === 'C' ? '성공적으로 승인' : '반려'} 처리되었습니다.`, 'success');
 setIsOpen(false);
 router.refresh();
 } catch (error) {
 toast('프로세스 처리 중 오류가 발생했습니다.', 'error');
 } finally {
 setLoading(false);
 }
 };

 const handleDeleteIsm = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: '결재 시퀀스 삭제',
      message: `[${name}] 결재 요청 데이터를 정말로 데이터베이스에서 영구 삭제하시겠습니까?`,
      confirmText: '삭제',
      cancelText: '취소',
      variant: 'destructive',
    });

    if (!isConfirmed) return;

    try {
      setLoading(true);
      await ismAdminService.deleteInfrmlSanctn(id);
      toast('성공적으로 삭제되었습니다.', 'success');
      router.refresh();
    } catch (error) {
      toast('삭제 처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

 const columns: Column<InfrmlSanctn>[] = [
 {
 header: '도메인 및 아키텍처',
 accessor: (item: InfrmlSanctn) => (
 <div className="flex items-center gap-5 py-4">
 <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center text-white/40 shadow-xl group-hover:scale-110 transition-transform">
 <Layers size={18} />
 </div>
 <div className="flex flex-col gap-1 text-left">
 <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-lg text-xs font-bold tracking-tight border border-slate-200 w-fit">
 {(item?.jobSe || item?.jobSeCode) || 'STATIC_NODE'}
 </span>
 <span className="font-bold tracking-tighter text-foreground text-md uppercase leading-tight mt-1">{item?.sancltNm || 'Untitled Sequence'}</span>
 </div>
 </div>
 )
 },
 {
 header: '결재 아이덴티티',
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
 header: '결재 대기 (PENDING)',
 accessor: (item: InfrmlSanctn) => {
 let status: '활성' | 'DISABLED' | 'INACTIVE' = 'INACTIVE';
 if (item.confmAt === 'Y') status = '활성';
 if (item.confmAt === 'R') status = 'DISABLED';
 
 return (
 <HubStatusBadge 
 status={status} 
 labels={{ 활성: '승인됨 (CONFIRMED)', DISABLED: '반려됨 (REJECTED)', INACTIVE: '결재 대기 (PENDING)' }} 
 />
 );
 },
 className: 'w-48'
 },
 {
 header: '관리 조정',
 className: 'text-right w-48',
 accessor: (item: InfrmlSanctn) => (
 <div className="flex justify-end gap-3 pr-4">
 {(item.confmAt === 'N' || item.confmAt === 'A') && (
 <Button
 onClick={() => handleOpenConfirm(item)}
 className="h-10 px-6 bg-slate-900 text-white rounded-lg text-xs font-bold tracking-widest uppercase hover:bg-primary transition-all active:scale-95 shadow-xl shadow-slate-900/10 flex items-center gap-2 group"
 >
 <ShieldCheck size={16} className="group-hover:rotate-12 transition-transform" /> 승인 실행
 </Button>
 )}
 <Button
 variant="ghost"
 size="icon"
 className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-lg transition-all opacity-40 hover:opacity-100"
 onClick={() => handleDeleteIsm(item.infrmlSanctnId, item.sancltNm)}
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
 title="인포멀 생션 아키텍처"
 breadcrumbs={[{ label: '시스템관리' }, { label: '약식결재' }]}
 />

 <HubHeader 
 title="결재" 
 highlight="결재 시퀀스" 
 subtitle="규격화되지 않은 비정형 결재 요청을 유연하게 검증하고 전사 의사결정 체계를 통합 관리합니다." 
 icon={ShieldCheck} 
 actions={
 <div className="flex gap-4 p-2 items-center">
 <div className="px-6 py-3 bg-emerald-50 border-2 border-emerald-100 rounded-lg flex items-center gap-4 shadow-sm">
 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
 <span className="text-xs font-bold text-emerald-700 tracking-widest uppercase">의사결정_허브: 온라인</span>
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
 <HubMetricCard title="결재_대기_시퀀스" value={ismList.filter(i => i.confmAt === 'N' || i.confmAt === 'A').length} icon={Clock} color="amber" status="주의" />
 <HubMetricCard title="승인_자산_수" value={ismList.filter(i => i.confmAt === 'Y').length} icon={CheckCircle2} color="emerald" status="최적" />
 <HubMetricCard title="반려_로그_수" value={ismList.filter(i => i.confmAt === 'R').length} icon={XCircle} color="rose" />
 <HubMetricCard title="전체_의사결정_수" value={ismList.length} icon={FileText} color="primary" />
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
 <div className="w-20 h-11 rounded-lg bg-white/10 flex items-center justify-center border border-white/5 shadow-inner">
 <Cpu size={36} className="text-primary" />
 </div>
 <h4 className="text-3xl font-bold tracking-tighter leading-tight uppercase">불변<br />의결 저장</h4>
 </div>
 
 <p className="text-sm text-slate-400 font-bold leading-relaxed border-l-4 border-primary pl-8">
 모든 약식 결재 아키텍처는 데이터 무결성 검증을 거치며 결정 근거는 분산 저장되어 영구적으로 기록되어 감사가 가능합니다.
 </p>

 <div className="space-y-6 pt-12 border-t border-white/5">
 <div className="flex items-center justify-between group/stat">
 <span className="text-xs font-bold text-white/40 tracking-[0.3em] uppercase group-hover/stat:text-primary transition-colors">로직_허브_무결성</span>
 <span className="text-lg font-bold font-mono tracking-tighter text-emerald-500">정상</span>
 </div>
 <div className="flex items-center justify-between group/stat">
 <span className="text-xs font-bold text-white/40 tracking-[0.3em] uppercase group-hover/stat:text-amber-500 transition-colors">보안_프로토콜</span>
 <span className="text-lg font-bold font-mono tracking-tighter">ENF_2.0</span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Approval Inventory */}
 <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
 <HubSectionCard title="약식 결재 시퀀스 데이터 매트릭스" description="시스템의 유연한 의사결정을 위해 캡처된 모든 비정형 결재 요청 실시간 명세입니다." icon={SearchCode}>
 <div className="overflow-hidden min-h-[500px]">
 <StandardDataTable
 columns={columns}
 data={ismList}
 loading={loading}
 emptyMessage="조회된 약식 결재 프로토콜이 현재 클러스터에 존재하지 않습니다."
 className="border-none bg-transparent"
 />
 </div>
 </HubSectionCard>
 </div>
 </div>

 <StandardModal
 isOpen={isModalOpen}
 onClose={() => setIsOpen(false)}
 title="결재 시퀀스 실행"
 maxWidth="xl"
 footer={
 <div className="flex w-full gap-4">
 <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest uppercase border-2">조사_취소</Button>
 <Button 
 onClick={form.handleSubmit((v) => onFormSubmit(v, 'R'))}
 disabled={loading}
 className="flex-1 h-11 bg-rose-50 text-rose-500 rounded-lg font-bold text-xs tracking-widest uppercase hover:bg-rose-500 hover:text-white transition-all active:scale-95 border-2 border-rose-100 flex items-center justify-center gap-3"
 >
 <XCircle size={18} strokeWidth={3} /> 시퀀스 반려
 </Button>
 <Button
 onClick={form.handleSubmit((v) => onFormSubmit(v, 'C'))}
 disabled={loading}
 className="flex-[2] h-11 bg-slate-900 border-none text-white rounded-lg font-bold text-xs tracking-widest uppercase shadow-2xl flex items-center justify-center gap-3 hover:-translate-y-2 hover:bg-primary transition-all active:scale-95 group"
 >
 <CheckCircle2 size={18} strokeWidth={3} className="text-primary group-hover:rotate-12 transition-transform" /> 최종 승인
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
 <h4 className="text-3xl font-bold text-white tracking-tighter uppercase leading-tight">{selectedSanctn?.sancltNm}</h4>
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
 name="rjctRsnCn"
 render={({ field }) => (
 <FormItem className="space-y-4">
 <FormLabel className="text-xs font-bold tracking-[0.4em] text-slate-400 uppercase flex items-center gap-3">
 <SearchCode size={14} className="text-primary" /> 결재/반려 의사결정 로그 (Decision Opinion) <span className="text-rose-500 animate-pulse">*</span>
 </FormLabel>
 <FormControl>
 <textarea
 {...field}
 placeholder="결재 또는 반려 사유를 입력하세요..."
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
 * 작성된 의견은 수정이 불가능하며 모든 관계자에게 실시간으로 공유됩니다.
 </p>
 </div>
 </form>
 </Form>
 </StandardModal>
 </div>
 );
}

