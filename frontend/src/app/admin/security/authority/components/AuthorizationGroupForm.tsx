'use client';

import { useAppForm } from '@/hooks/useAppForm';
import { Form, FormControl, FormErrorSummary, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { authorizationGroupFormSchema, type AuthorizationGroupFormValues } from '@/lib/auth/authorization-management-contract';

export function AuthorizationGroupForm({ initial, creating, externalBusy, onSubmit }: {
  initial: AuthorizationGroupFormValues;
  creating: boolean;
  externalBusy: boolean;
  onSubmit: (values: AuthorizationGroupFormValues) => Promise<void>;
}) {
  const form = useAppForm(authorizationGroupFormSchema, { defaultValues: initial });
  const submit = form.handleSubmit(async (values) => {
    if (externalBusy) return;
    try { await onSubmit(values); }
    catch (error) { form.applyServerErrors(error); }
  });
  return (
    <Form {...form}>
      <form aria-label={creating ? '권한 그룹 등록' : '권한 그룹 정보'} onSubmit={submit} noValidate className="space-y-4">
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
          {form.formState.isSubmitting ? '저장 중…' : creating ? '그룹 등록' : '그룹 정보 저장'}
        </Button>
      </form>
    </Form>
  );
}
