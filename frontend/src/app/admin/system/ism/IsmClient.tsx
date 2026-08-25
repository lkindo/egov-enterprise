'use client';

import { useState } from 'react';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import {
 ismAdminService,
 InformalSanctionDto,
 SANCTION_STATUS,
 isSanctionPending,
} from '@/services/foundation/system/IsmAdminService';
import { useToast } from '@/app/components/ui/toast';
import { ShieldCheck,
 CheckCircle2,
 XCircle,
 Activity,
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

export default function IsmClient({
 initialData,
 fetchError = null,
}: {
 initialData: { list: InformalSanctionDto[] };
 /** 서버 컴포넌트에서 목록 조회가 실패한 사유(성공 시 null). 빈 목록 위장을 막기 위해 표시한다. */
 fetchError?: string | null;
}) {
 const router = useRouter();
 const { toast } = useToast();

 const [isModalOpen, setIsOpen] = useState(false);
 const [selectedSanctn, setSelectedSanctn] = useState<InformalSanctionDto | null>(null);
 const [loading, setLoading] = useState(false);

 const form = useAppForm(ismSchema, {
 defaultValues: {
 rjctRsnCn: ''
 }
 });

 const ismList = initialData.list || [];
 /** 조회 실패는 '데이터 없음'이 아니라 오류로 드러낸다(재시도는 서버 컴포넌트 재실행). */
 const listError = fetchError ? new Error(fetchError) : null;

 const pendingCount = ismList.filter(i => isSanctionPending(i.aprvYn)).length;
 const approvedCount = ismList.filter(i => i.aprvYn === SANCTION_STATUS.APPROVED).length;
 const rejectedCount = ismList.filter(i => i.aprvYn === SANCTION_STATUS.REJECTED).length;

 const handleOpenConfirm = (sanctn: InformalSanctionDto) => {
 setSelectedSanctn(sanctn);
 form.reset({
 rjctRsnCn: ''
 });
 setIsOpen(true);
 };

 const onFormSubmit = async (values: IsmFormValues, aprvYn: 'C' | 'R') => {
 if (!selectedSanctn?.ifmlAtrzSn) return;
 try {
 setLoading(true);
 await ismAdminService.confirmInfrmlSanctn(selectedSanctn.ifmlAtrzSn, aprvYn, values.rjctRsnCn);
 toast(`결재 시퀀스가 ${aprvYn === SANCTION_STATUS.APPROVED ? '성공적으로 승인' : '반려'} 처리되었습니다.`, 'success');
 setIsOpen(false);
 router.refresh();
 } catch (error) {
 // 서버가 사유를 내려주면 그대로 노출한다(권한·상태 불일치 등 원인 파악 가능).
 const message = error instanceof Error && error.message ? error.message : '';
 toast(message || '결재 처리 중 오류가 발생했습니다.', 'error');
 } finally {
 setLoading(false);
 }
 };

 // [삭제 버튼 제거] 서버는 '신청자 본인 + 신청(A) 상태'에서만 삭제를 허용한다.
 // 본 화면은 결재 대기함(type=received, 결재자 시점)이므로 삭제는 구조적으로 항상 403이며
 // 결재함의 유효 동작이 아니다. 삭제는 신청함 화면의 책임으로 남긴다.

 const columns: Column<InformalSanctionDto>[] = [
 {
 header: '도메인 및 아키텍처',
 accessor: (item: InformalSanctionDto) => (
 <div className="flex items-center gap-5 py-4">
 <div className="w-12 h-12 rounded-lg bg-surface-inverse flex items-center justify-center text-white/40 shadow-xl group-hover:scale-110 transition-transform">
 <Layers size={18} />
 </div>
 <div className="flex flex-col gap-1 text-left">
 <span className="px-3 py-1 bg-muted text-foreground rounded-lg text-xs font-bold tracking-tight border border-border w-fit">
 {item?.taskSeCd || 'STATIC_NODE'}
 </span>
 <span className="font-bold tracking-tighter text-foreground text-md uppercase leading-tight mt-1">{item?.taskSeNm || item?.taskSeCd || 'Untitled Sequence'}</span>
 </div>
 </div>
 )
 },
 {
 header: '결재 아이덴티티',
 accessor: (item: InformalSanctionDto) => (
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground shadow-inner group-hover:bg-primary/5 group-hover:text-primary transition-colors">
 <Fingerprint size={16} />
 </div>
 <div className="flex flex-col text-left">
 <span className="text-sm font-bold text-foreground tracking-tight">{item?.aplcntNm || item?.aplcntId || 'UNKNOWN'}</span>
 <span className="text-xs font-bold text-muted-foreground/40 tracking-[0.3em] font-mono ">SN: {item?.ifmlAtrzSn ?? 'N/A'}</span>
 </div>
 </div>
 ),
 className: 'w-56'
 },
 {
 header: '결재 상태',
 accessor: (item: InformalSanctionDto) => {
 let status: '활성' | 'DISABLED' | 'INACTIVE' = 'INACTIVE';
 if (item.aprvYn === SANCTION_STATUS.APPROVED) status = '활성';
 if (item.aprvYn === SANCTION_STATUS.REJECTED) status = 'DISABLED';

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
 accessor: (item: InformalSanctionDto) => (
 <div className="flex justify-end gap-3 pr-4">
 {isSanctionPending(item.aprvYn) ? (
 <Button
 onClick={() => handleOpenConfirm(item)}
 className="h-10 px-6 bg-surface-inverse text-surface-inverse-foreground rounded-lg text-xs font-bold tracking-widest uppercase hover:bg-primary transition-all active:scale-95 shadow-xl flex items-center gap-2 group"
 >
 <ShieldCheck size={16} className="group-hover:rotate-12 transition-transform" /> 승인 실행
 </Button>
 ) : (
 <span className="text-xs font-bold text-muted-foreground/50 tracking-widest uppercase">처리 완료</span>
 )}
 </div>
 )
 }
 ];

 return (
 <WorkListPage
 title="약식 결재 관리"
 description="규격화되지 않은 비정형 결재 요청을 조회하고 승인·반려합니다."
 breadcrumbItems={[{ label: '시스템관리' }, { label: '약식결재' }]}
 totalCount={listError ? undefined : ismList.length}
 actions={
 // [P1-5] '의사결정_허브: 온라인' 고정 배지 제거 — 실제 가동 상태를 계측하지 않으면서
 // 상시 초록 'ONLINE' 을 표시해 장애를 은폐하던 근거 없는 지표였다.
 <Button
 variant="outline"
 size="sm"
 aria-label="약식 결재 목록 새로고침"
 onClick={() => router.refresh()}
 className="gap-2"
 >
 <Activity size={16} aria-hidden="true" />
 새로고침
 </Button>
 }
 toolbarActions={
 /*
   [P1-5] 지표는 근거 없는 고정 문구가 아니라 조회분 집계에서 파생시킨다.
   종전 `결재_대기_시퀀스` 같은 밑줄 의사코드 라벨은 업무 문구로 정정한다(카탈로그 G14).
   값은 현재 조회된 결재 대기함(최대 50건) 기준이라는 사실을 라벨에 밝힌다.
 */
 <span className="text-[length:var(--font-size-body)] text-muted-foreground">
 조회분 기준 · 대기 <span className="font-bold text-foreground">{pendingCount}</span>건 ·
 승인 <span className="font-bold text-foreground">{approvedCount}</span>건 ·
 반려 <span className="font-bold text-foreground">{rejectedCount}</span>건
 </span>
 }
 >
 <StandardDataTable
 accessibleLabel="약식 결재 목록"
 columns={columns}
 data={ismList}
 loading={loading}
 keyField="ifmlAtrzSn"
 error={listError}
 onRetry={() => router.refresh()}
 emptyMessage="결재 대기 중인 약식 결재 요청이 없습니다."
 />

 <StandardModal
 isOpen={isModalOpen}
 onClose={() => setIsOpen(false)}
 title="결재 시퀀스 실행"
 maxWidth="xl"
 footer={
 <div className="flex w-full gap-4">
 <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest uppercase border-2">조사_취소</Button>
 <Button 
 onClick={form.handleSubmit((v) => onFormSubmit(v, SANCTION_STATUS.REJECTED))}
 disabled={loading}
 className="flex-1 h-11 bg-rose-50 text-rose-500 rounded-lg font-bold text-xs tracking-widest uppercase hover:bg-rose-500 hover:text-white transition-all active:scale-95 border-2 border-rose-100 flex items-center justify-center gap-3"
 >
 <XCircle size={18} strokeWidth={3} /> 시퀀스 반려
 </Button>
 <Button
 onClick={form.handleSubmit((v) => onFormSubmit(v, SANCTION_STATUS.APPROVED))}
 disabled={loading}
 className="flex-[2] h-11 bg-surface-inverse border-none text-surface-inverse-foreground rounded-lg font-bold text-xs tracking-widest uppercase shadow-2xl flex items-center justify-center gap-3 hover:-translate-y-2 hover:bg-primary transition-all active:scale-95 group"
 >
 <CheckCircle2 size={18} strokeWidth={3} className="text-primary group-hover:rotate-12 transition-transform" /> 최종 승인
 </Button>
 </div>
 }
 >
 <Form {...form}>
 <form className="space-y-12 pt-4 text-left">
 <div className="p-10 bg-surface-inverse rounded-lg shadow-2xl relative overflow-hidden group/modal-target">
 <div className="relative z-10 space-y-4">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20">
 <Activity size={16} className="text-primary animate-pulse" />
 </div>
 <span className="text-xs text-primary/60 font-bold tracking-[0.4em] uppercase">Target_Sequence_Probe</span>
 </div>
 <h4 className="text-3xl font-bold text-surface-inverse-foreground tracking-tighter uppercase leading-tight">{selectedSanctn?.taskSeNm || selectedSanctn?.taskSeCd}</h4>
 <div className="flex items-center gap-6 pt-4 border-t border-white/5">
 <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-lg border border-white/5">
 <User size={14} className="text-muted-foreground" />
 <span className="text-xs font-bold text-surface-inverse-muted uppercase tracking-widest">{selectedSanctn?.aplcntNm || selectedSanctn?.aplcntId}</span>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-xs font-bold text-white/20 tracking-[0.3em] font-mono uppercase ">SN: {selectedSanctn?.ifmlAtrzSn}</span>
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
 <FormLabel className="text-xs font-bold tracking-[0.4em] text-muted-foreground uppercase flex items-center gap-3">
 <SearchCode size={14} className="text-primary" /> 결재/반려 의사결정 로그 (Decision Opinion) <span className="text-rose-500 animate-pulse">*</span>
 </FormLabel>
 <FormControl>
 <textarea
 {...field}
 placeholder="결재 또는 반려 사유를 입력하세요..."
 className="w-full min-h-[200px] p-10 rounded-lg border-2 bg-muted font-bold text-lg outline-none focus:bg-card focus:ring-[12px] focus:ring-primary/5 focus:border-primary/20 transition-all shadow-inner leading-relaxed resize-none placeholder:text-muted-foreground"
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
 </WorkListPage>
 );
}

