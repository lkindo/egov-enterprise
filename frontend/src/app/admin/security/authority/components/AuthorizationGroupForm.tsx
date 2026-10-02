'use client';

import { useEffect } from 'react';
import { z } from 'zod';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { useAppForm } from '@/hooks/useAppForm';
import { Form, FormControl, FormErrorSummary, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { authorizationGroupFormSchema, type AuthorizationGroupFormValues } from '@/lib/auth/authorization-management-contract';

/**
 * 수정 양식은 그룹 코드를 바꾸지 않는다(읽기 전용). 코드 형식 규칙은 새 코드를 만들 때(등록·복제)만 본다 — 규칙이 생기기 전에
 * 만들어진 코드(예: 다른 기관 DB 의 'ROLE-X')를 가진 그룹도 이름·설명을 고칠 수 있어야 한다. 서버 수정 요청은 코드를 받지 않는다.
 */
const authorizationGroupEditFormSchema = authorizationGroupFormSchema.extend({ code: z.string() });

export function AuthorizationGroupForm({ initial, creating, externalBusy, onSubmit, onDirtyChange, labels }: {
  initial: AuthorizationGroupFormValues;
  creating: boolean;
  externalBusy: boolean;
  onSubmit: (values: AuthorizationGroupFormValues) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  /** 양식 이름과 제출 버튼 글자. 생략하면 등록('권한 그룹 등록'·'그룹 등록') 또는 수정('권한 그룹 정보'·'그룹 정보 저장')이다. */
  labels?: { form: string; submit: string };
}) {
  const schema = creating ? authorizationGroupFormSchema : authorizationGroupEditFormSchema;
  const form = useAppForm(schema, { defaultValues: initial });
  useUnsavedChanges({ dirty: form.formState.isDirty, pending: form.formState.isSubmitting });
  useEffect(() => { onDirtyChange?.(form.formState.isDirty); }, [form.formState.isDirty, onDirtyChange]);
  const submit = form.handleSubmit(async (values) => {
    if (externalBusy) return;
    try { await onSubmit(values); form.reset(values); }
    catch (error) { form.applyServerErrors(error); }
  });
  return (
    <Form {...form}>
      <form aria-label={labels?.form ?? (creating ? '권한 그룹 등록' : '권한 그룹 정보')} onSubmit={submit} noValidate className="space-y-4">
        <FormErrorSummary onNavigate={form.focusError} labels={{ code: '그룹 코드', name: '그룹명', description: '설명' }} />
        <FormField control={form.control} name="code" render={({ field }) => (
          <FormItem><FormLabel>그룹 코드</FormLabel><FormControl><Input {...field} aria-required="true" readOnly={!creating} disabled={externalBusy} maxLength={20} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>그룹명</FormLabel><FormControl><Input {...field} aria-required="true" disabled={externalBusy} maxLength={authorizationGroupFormSchema.shape.name.maxLength ?? undefined} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>설명</FormLabel><FormControl><Textarea {...field} disabled={externalBusy} maxLength={4000} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" disabled={externalBusy || form.formState.isSubmitting} aria-busy={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? '저장 중…' : labels?.submit ?? (creating ? '그룹 등록' : '그룹 정보 저장')}
        </Button>
      </form>
    </Form>
  );
}
