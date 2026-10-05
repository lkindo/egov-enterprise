'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { htmlToSemanticPlainText } from '@/lib/html-to-text';
import { useAuth } from '@/contexts/AuthContext';
import { useUnsavedCloseGuard } from '@/hooks/useDirtyCloseGuard';
import { canPermission } from '@/lib/auth/permissions';

export const policySchema = PolicyUpdateRequestSchema.extend({
  plcyTypeCd: z.string().trim().min(1, '정책 유형 코드를 입력해 주세요.')
    .max(12, '정책 유형 코드는 최대 12자입니다.')
    .regex(/^[A-Z0-9_]+$/, '정책 유형 코드는 영대문자·숫자·밑줄만 사용할 수 있습니다.').optional(),
  plcyTtl: PolicyUpdateRequestSchema.shape.plcyTtl
    .trim()
    .min(1, '정책 제목을 입력해 주세요.')
    .max(100, '정책 제목은 최대 100자까지 입력할 수 있습니다.'),
  plcyCn: PolicyUpdateRequestSchema.shape.plcyCn
    .trim()
    .min(1, '정책 내용을 입력해 주세요.')
    .max(4000, '정책 내용은 최대 4,000자까지 입력할 수 있습니다.'),
}).superRefine((values, context) => {
  const plainText = htmlToSemanticPlainText(values.plcyCn);
  if (!plainText) {
    context.addIssue({ code: 'custom', path: ['plcyCn'], message: '정책 내용을 입력해 주세요.' });
  }
});

const POLICY_FORM_LABELS = {
 plcyTypeCd: '정책 유형 코드',
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
 const { user } = useAuth();
 const canWrite = canPermission(user, 'POLICY_UPDATE');
 const { toast } = useToast();
 const [policies, setPolicies] = useState<SystemPolicy[]>([]);
 const [loading, setLoading] = useState(true);
 const policyRequestRef = useRef(0);
 // 조회 실패를 "등록된 정책 없음"으로 위장하지 않기 위해 실패 사유를 목록 영역에 그대로 노출한다.
 const [error, setError] = useState<Error | null>(null);
 const [selectedPolicy, setSelectedPolicy] = useState<SystemPolicy | null>(null);
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);

 const form = useAppForm<typeof policySchema, PolicyFormValues>(policySchema, {
 defaultValues: {
 plcyTtl: '',
 plcyCn: ''
 }
 });
 // [2026-10-01] 폼에 입력이 있으면 Esc·배경·X 닫기 전에 확인한다(StandardModal 과 같은 보호). 저장 중에는 닫지 않는다.
 const unsavedGuard = useUnsavedCloseGuard({
 isOpen: isEditModalOpen,
 onClose: () => setIsEditModalOpen(false),
 closeDisabled: form.formState.isSubmitting,
 });

  const fetchPolicies = useCallback(async () => {
    const requestId = ++policyRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await policyAdminService.getPolicies();
      if (requestId !== policyRequestRef.current) return;
      setPolicies(data);
    } catch (err) {
      if (requestId !== policyRequestRef.current) return;
      setError(toError(err));
      setPolicies([]);
      toast('정책 목록을 불러오는 데 실패했습니다.', 'error');
    } finally {
      if (requestId === policyRequestRef.current) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchPolicies();
    return () => { policyRequestRef.current += 1; };
  }, [fetchPolicies]);

 const handleEdit = (policy: SystemPolicy) => {
 if (!canWrite) return;
 setSelectedPolicy(policy);
 form.reset({
 plcyTypeCd: policy.plcyTypeCd,
 plcyTtl: policy.plcyTtl || '',
 plcyCn: policy.plcyCn || ''
 });
 setIsEditModalOpen(true);
 };

 const handleCreate = () => {
 if (!canWrite) return;
 setSelectedPolicy(null);
 form.reset({ plcyTypeCd: '', plcyTtl: '', plcyCn: '' });
 setIsEditModalOpen(true);
 };

 const onFormSubmit = async (values: PolicyFormValues) => {
 if (!canWrite) return;
 // 정책 유형 코드가 없으면 PUT 경로가 잘못 구성되므로 사전 차단한다.
 const type = selectedPolicy?.plcyTypeCd ?? values.plcyTypeCd;
 if (!type) {
 form.setError('root.server', { type: 'server', message: '정책 유형 코드가 없어 저장할 수 없습니다.' });
 void form.focusError('root.server', 'server');
 return;
 }
 try {
 const payload = {
 plcyTtl: values.plcyTtl,
 plcyCn: values.plcyCn
 };
 if (selectedPolicy) await policyAdminService.updatePolicy(type, payload);
 else await policyAdminService.createPolicy(type, payload);
 toast(selectedPolicy ? '정책이 성공적으로 수정되었습니다' : '정책을 등록했습니다.', 'success');
 setIsEditModalOpen(false);
 fetchPolicies();
 } catch (error: unknown) {
 if (!form.applyServerErrors(error)) {
 toast('정책 저장에 실패했습니다. 입력값은 유지됩니다.', 'error');
 }
 }
 };

 const columns: Column<SystemPolicy>[] = [
 {
 header: '정책 유형(ID)',
 accessor: (item) => (
 <div className="flex items-center gap-2">
 <Settings size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
 <span className="font-mono text-[length:var(--font-size-body)] text-foreground">{item.plcyTypeCd}</span>
 </div>
 )
 },
 {
 header: '정책 제목',
 accessor: (item) => <span className="text-[length:var(--font-size-body)] font-medium text-foreground">{item.plcyTtl}</span>
 },
 {
 header: '내용 요약',
 accessor: (item) => (
 <div className="max-w-xs truncate text-[length:var(--font-size-body)] text-muted-foreground">
 {(() => {
 const plain = htmlToSemanticPlainText(item.plcyCn || '');
 if (!plain) return '내용 없음';
 return plain.length > 50 ? `${plain.substring(0, 50)}...` : plain;
 })()}
 </div>
 )
 },
 {
 header: '관리',
 className: 'text-right',
 accessor: (item) => canWrite ? (
 <div className="flex justify-end">
 <Button
 variant="ghost"
 size="sm"
 aria-label={`${item.plcyTtl || item.plcyTypeCd} 정책 수정`}
 onClick={() => handleEdit(item)}
 >
 <Edit2 size={14} aria-hidden="true" /> 수정
 </Button>
 </div>
 ) : null
 }
 ];

 return (
 <WorkListPage
 title="시스템 정책 관리"
 description="정책을 등록·수정합니다. 열람에는 기존 정책 조회 권한이 필요합니다."
 breadcrumbItems={[{ label: '시스템관리' }, { label: '정책 관리' }]}
 totalCount={error ? undefined : policies.length}
 actions={
 <div className="flex gap-2">
 {canWrite && <Button type="button" onClick={handleCreate}>새 정책 등록</Button>}
 <Button onClick={fetchPolicies} variant="outline" size="sm">
 새로고침
 </Button>
 </div>
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
 if (open) setIsEditModalOpen(true);
 else unsavedGuard.requestClose();
 }}
 >
 <DialogContent onInputCapture={unsavedGuard.trackInput} onChangeCapture={unsavedGuard.trackInput} className="sm:max-w-5xl max-h-[90vh] overflow-y-auto rounded-lg border-none p-0 shadow-lg">
 <div className="flex items-center justify-between gap-4 border-b border-border bg-card pb-3 pl-5 pr-12 pt-4">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
 {selectedPolicy ? <>정책 수정 : <span className="font-mono text-muted-foreground">{selectedPolicy.plcyTypeCd}</span></> : '새 정책 등록'}
 </DialogTitle>
 </DialogHeader>
 <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
 <CheckCircle2 size={14} aria-hidden="true" /> 실시간 편집 모드
 </div>
 </div>

 <Form {...form}>
 <form onSubmit={(event) => { void form.handleSubmit(onFormSubmit)(event); }} noValidate>
 <div className="space-y-[var(--form-gap)] bg-card px-5 py-4 custom-scrollbar text-left">
 <FormErrorSummary labels={POLICY_FORM_LABELS} onNavigate={form.focusError} />
 {!selectedPolicy && <ShadcnFormField
 control={form.control}
 name="plcyTypeCd"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel>정책 유형 코드</FormLabel>
 <FormControl><Input {...field} value={field.value ?? ''} maxLength={12} placeholder="영대문자·숫자·밑줄, 최대 12자" /></FormControl>
 <FormMessage />
 </FormItem>
 )}
 />}
 <ShadcnFormField
 control={form.control}
 name="plcyTtl"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-[length:var(--font-size-body)] font-medium text-foreground">정책 제목</FormLabel>
 <FormControl>
 <Input 
 {...field}
 maxLength={100}
 placeholder="정책 제목을 입력하세요"
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />

 <ShadcnFormField
 control={form.control}
 name="plcyCn"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-[length:var(--font-size-body)] font-medium text-foreground">정책 내용</FormLabel>
 <FormControl>
 <RichTextEditor 
 value={field.value} 
 onChange={field.onChange} 
 className="min-h-[400px]"
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 </div>

 <DialogFooter className="flex items-center border-t border-border bg-muted px-5 py-3">
 <div className="text-left text-xs text-muted-foreground">
 저장한 정책은 기존 정책 조회 권한 안에서 열람합니다. 로그인 전 공개로 전환되지 않습니다.
 </div>
 <div className="flex shrink-0 gap-2">
 <Button variant="ghost" type="button" disabled={form.formState.isSubmitting} onClick={() => setIsEditModalOpen(false)}>취소</Button>
 <Button 
 type="submit"
 disabled={form.formState.isSubmitting}
 className="px-6"
 >
 {form.formState.isSubmitting ? '저장 중...' : selectedPolicy ? '변경 사항 반영하기' : '정책 등록하기'}
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

