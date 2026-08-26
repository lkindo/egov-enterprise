'use client';

import { useState, useEffect } from 'react';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { policyAdminService, SystemPolicy } from '@/services/foundation/system/PolicyAdminService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import dynamic from 'next/dynamic';
import { Settings, Edit2, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor'), {
 ssr: false,
 loading: () => <Skeleton className="h-[400px] w-full" />
});
import { z } from 'zod';
import { useAppForm } from '@/hooks/useAppForm';
import { useToast } from '@/app/components/ui/toast';
import {
 Form,
 FormControl,
 FormField as ShadcnFormField,
 FormItem,
 FormLabel,
 FormMessage,
 FormErrorSummary,
} from '@/components/ui/form';

import { PolicyUpdateRequestSchema } from '@/types/generated-zod';

export const policySchema = PolicyUpdateRequestSchema.extend({
  plcyTtl: PolicyUpdateRequestSchema.shape.plcyTtl
    .trim()
    .min(1, '정책 제목을 입력해 주세요.')
    .max(100, '정책 제목은 최대 100자까지 입력할 수 있습니다.'),
  plcyCn: PolicyUpdateRequestSchema.shape.plcyCn
    .trim()
    .min(1, '정책 내용을 입력해 주세요.')
    .max(4000, '정책 내용은 최대 4,000자까지 입력할 수 있습니다.'),
}).superRefine((values, context) => {
  const plainText = values.plcyCn.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  if (!plainText) {
    context.addIssue({ code: 'custom', path: ['plcyCn'], message: '정책 내용을 입력해 주세요.' });
  }
});

const POLICY_FORM_LABELS = {
 plcyTtl: '정책 제목',
 plcyCn: '정책 내용',
 'root.server': '저장 오류',
};

type PolicyFormValues = z.infer<typeof policySchema>;

/** 조회 실패 사유를 Error 로 정규화한다(StandardDataTable 의 error prop 계약). */
function toError(value: unknown): Error {
 if (value instanceof Error) return value;
 if (typeof value === 'string' && value) return new Error(value);
 return new Error('정책 목록을 불러오지 못했습니다.');
}

export default function PolicyAdminClient() {
 const { toast } = useToast();
 const [policies, setPolicies] = useState<SystemPolicy[]>([]);
 const [loading, setLoading] = useState(true);
 // 조회 실패를 "등록된 정책 없음"으로 위장하지 않기 위해 실패 사유를 목록 영역에 그대로 노출한다.
 const [error, setError] = useState<Error | null>(null);
 const [selectedPolicy, setSelectedPolicy] = useState<SystemPolicy | null>(null);
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);

 const form = useAppForm(policySchema, {
 defaultValues: {
 plcyTtl: '',
 plcyCn: ''
 }
 });

 const fetchPolicies = async () => {
 setLoading(true);
 setError(null);
 try {
 const data = await policyAdminService.getPolicies();
 setPolicies(data);
 } catch (err) {
 setError(toError(err));
 setPolicies([]);
 toast('정책 목록을 불러오는 데 실패했습니다.', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchPolicies();
 }, []);

 const handleEdit = (policy: SystemPolicy) => {
 setSelectedPolicy(policy);
 form.reset({
 plcyTtl: policy.plcyTtl || '',
 plcyCn: policy.plcyCn || ''
 });
 setIsEditModalOpen(true);
 };

 const onFormSubmit = async (values: PolicyFormValues) => {
 if (!selectedPolicy) return;
 // 정책 유형 코드가 없으면 PUT 경로가 잘못 구성되므로 사전 차단한다.
 if (!selectedPolicy.plcyTypeCd) {
 form.setError('root.server', { type: 'server', message: '정책 유형 코드가 없어 저장할 수 없습니다.' });
 void form.focusError('root.server', 'server');
 return;
 }
 try {
 await policyAdminService.updatePolicy(selectedPolicy.plcyTypeCd, {
 plcyTtl: values.plcyTtl,
 plcyCn: values.plcyCn
 });
 toast('정책이 성공적으로 수정되었습니다', 'success');
 setIsEditModalOpen(false);
 fetchPolicies();
 } catch (error: unknown) {
 if (!form.applyServerErrors(error)) {
 toast('정책 수정에 실패했습니다. 입력값은 유지됩니다.', 'error');
 }
 }
 };

 const columns: Column<SystemPolicy>[] = [
 {
 header: '정책 유형(ID)',
 accessor: (item) => (
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
 <Settings size={14} />
 </div>
 <span className="font-bold tracking-tighter uppercase">{item.plcyTypeCd}</span>
 </div>
 )
 },
 {
 header: '정책 제목',
 accessor: (item) => <span className="font-bold text-foreground text-left block">{item.plcyTtl}</span>
 },
 {
 header: '내용 요약',
 accessor: (item) => (
 <div className="max-w-xs truncate text-muted-foreground opacity-60 text-left">
 {(() => {
 const plain = (item.plcyCn || '').replace(/<[^>]*>?/gm, '');
 if (!plain) return '내용 없음';
 return plain.length > 50 ? `${plain.substring(0, 50)}...` : plain;
 })()}
 </div>
 )
 },
 {
 header: '관리',
 className: 'text-right',
 accessor: (item) => (
 <div className="flex justify-end">
 <Button
 variant="ghost"
 size="sm"
 aria-label={`${item.plcyTtl || item.plcyTypeCd} 정책 수정`}
 onClick={() => handleEdit(item)}
 className="hover:bg-primary/10 hover:text-primary rounded-lg"
 >
 <Edit2 size={14} className="mr-2" /> 수정
 </Button>
 </div>
 )
 }
 ];

 return (
 <WorkListPage
 title="시스템 정책 관리"
 description="로그인·개인정보 처리방침 등 시스템 전반의 정책을 조회·수정합니다."
 breadcrumbItems={[{ label: '시스템관리' }, { label: '정책 관리' }]}
 totalCount={error ? undefined : policies.length}
 actions={
 <Button onClick={fetchPolicies} variant="outline" size="sm">
 새로고침
 </Button>
 }
 >
 <StandardDataTable
 accessibleLabel="시스템 정책 목록"
 columns={columns}
 data={policies}
 loading={loading}
 error={error}
 onRetry={fetchPolicies}
 keyField="plcyTypeCd"
 emptyMessage="등록된 시스템 정책이 없습니다."
 />

 {/* Edit Modal */}
 <Dialog
 open={isEditModalOpen}
 onOpenChange={(open) => {
 if (!form.formState.isSubmitting) setIsEditModalOpen(open);
 }}
 >
 <DialogContent className="max-w-5xl rounded-lg overflow-hidden border-none shadow-2xl p-0">
 <div className="bg-surface-inverse p-8 text-surface-inverse-foreground flex items-center justify-between">
 <DialogHeader>
 <DialogTitle className="text-2xl font-bold flex items-center gap-3">
 <Edit2 className="text-primary" /> 정책 수정 : <span className="opacity-50 tracking-widest uppercase">{selectedPolicy?.plcyTypeCd}</span>
 </DialogTitle>
 </DialogHeader>
 <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg text-xs font-bold tracking-widest uppercase">
 <CheckCircle2 size={14} className="text-primary" /> 실시간 편집 모드
 </div>
 </div>

 <Form {...form}>
 <form onSubmit={form.handleSubmit(onFormSubmit)} noValidate>
 <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar text-left">
 <FormErrorSummary labels={POLICY_FORM_LABELS} onNavigate={form.focusError} />
 <ShadcnFormField
 control={form.control}
 name="plcyTtl"
 required
 render={({ field }) => (
 <FormItem className="space-y-3">
 <FormLabel className="text-sm font-bold tracking-widest uppercase opacity-40 ml-2">정책 제목</FormLabel>
 <FormControl>
 <Input 
 {...field}
 maxLength={100}
 placeholder="정책 제목을 입력하세요"
 className="h-11 rounded-lg border-2 border-border/50 focus:border-primary/50 bg-muted/50 font-bold text-lg"
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />

 <ShadcnFormField
 control={form.control}
 name="plcyCn"
 required
 render={({ field }) => (
 <FormItem className="space-y-3">
 <FormLabel className="text-sm font-bold tracking-widest uppercase opacity-40 ml-2">정책 내용</FormLabel>
 <FormControl>
 <RichTextEditor 
 value={field.value} 
 onChange={field.onChange} 
 className="min-h-[400px]"
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 </div>

 <DialogFooter className="p-8 bg-muted border-t border-border/50 flex items-center justify-between">
 <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
 * 수정 즉시 프론트엔드 인터페이스 및 정책 페이지에 반영됩니다.
 </div>
 <div className="flex gap-3">
 <Button variant="ghost" type="button" disabled={form.formState.isSubmitting} onClick={() => setIsEditModalOpen(false)} className="rounded-lg h-12 px-8 font-bold text-xs tracking-widest uppercase">취소</Button>
 <Button 
 type="submit"
 disabled={form.formState.isSubmitting}
 className="rounded-lg h-12 px-8 bg-surface-inverse hover:bg-primary text-surface-inverse-foreground transition-all shadow-lg font-bold text-xs tracking-widest uppercase"
 >
 {form.formState.isSubmitting ? '저장 중...' : '변경 사항 반영하기'}
 </Button>
 </div>
 </DialogFooter>
 </form>
 </Form>
 </DialogContent>
 </Dialog>
 </WorkListPage>
 );
}

