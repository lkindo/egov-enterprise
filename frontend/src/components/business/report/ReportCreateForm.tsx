'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAppForm } from '@/hooks/useAppForm';
import * as z from 'zod';
import { Form, FormControl, FormErrorSummary, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { WorkReportDtoRequestSchema } from '@/types/generated-zod';
import { cn } from '@/lib/utils';

/**
 * 업무 보고 등록 폼.
 * FE 헌법 제13조 2항에 따라 인라인 z.object 를 쓰지 않고 백엔드 SSOT(generated-zod)를 확장한다.
 * rptYmd 는 물리 컬럼이 varchar(8) 이라 'yyyyMMdd' 로 고정한다.
 * userId 는 보내지 않는다 — 작성자는 서버가 인증 주체로 채운다.
 */
export const reportFormSchema = WorkReportDtoRequestSchema.extend({
    rptTtl: z.string().trim()
        .min(1, '보고 제목을 입력하세요.')
        .max(100, '보고 제목은 최대 100자까지 입력할 수 있습니다.')
        .pipe(WorkReportDtoRequestSchema.shape.rptTtl),
    rptYmd: z.string().length(8, '보고 일자를 선택하세요.')
        .pipe(WorkReportDtoRequestSchema.shape.rptYmd.unwrap()),
    atchFileSn: z.number().nullable().optional().transform(v => v === null ? undefined : v),
});

export type ReportFormValues = z.infer<typeof reportFormSchema>;

type NullableReportFormValues = {
    [Field in keyof ReportFormValues]?: ReportFormValues[Field] | null;
};

const ymdToInput = (ymd?: string) =>
    ymd && ymd.length >= 8 ? `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}` : '';
const inputToYmd = (value: string) => value.replace(/-/g, '');

interface ReportCreateFormProps {
    defaultYmd: string;
    /** 수정 모드일 때 기존 값. */
    initialData?: NullableReportFormValues;
    mode?: 'create' | 'edit';
    onSubmit: (data: ReportFormValues) => Promise<void>;
    onCancel: () => void;
    /** 합성 화면이 소유하는 저장/삭제 상호 배제 상태. */
    isPending?: boolean;
    /** 합성 화면이 닫기 가드를 걸 수 있도록 편집 상태를 올려 준다(DeptJobForm 과 같은 계약). */
    onEditStateChange?: (state: { dirty: boolean; pending: boolean }) => void;
}

export function ReportCreateForm({ defaultYmd, initialData, mode = 'create', onSubmit, onCancel, isPending = false, onEditStateChange }: ReportCreateFormProps) {
    const isEdit = mode === 'edit';
    const submitPendingRef = useRef(false);
    const [isSubmitPending, setSubmitPending] = useState(false);
    const form = useAppForm(reportFormSchema, {
        defaultValues: {
            rptTtl: initialData?.rptTtl ?? '',
            rptCn: initialData?.rptCn ?? '',
            rptYmd: initialData?.rptYmd ?? defaultYmd,
            // 수정 시 폼에 없는 필드를 빠뜨리면 서버 update 가 null 로 덮어쓴다.
            rptSeCd: initialData?.rptSeCd ?? undefined,
            atchFileSn: initialData?.atchFileSn ?? undefined,
        },
    });

    const { isSubmitting } = form.formState;
    const isSavePending = isSubmitting || isSubmitPending || isPending;

    useEffect(() => {
        onEditStateChange?.({ dirty: form.formState.isDirty, pending: isSavePending });
    }, [form.formState.isDirty, isSavePending, onEditStateChange]);

    const handleSubmit = async (values: ReportFormValues) => {
        if (submitPendingRef.current) return;
        submitPendingRef.current = true;
        setSubmitPending(true);
        try {
            await onSubmit(values);
        } catch (error) {
            if (!form.applyServerErrors(error)) throw error;
        } finally {
            submitPendingRef.current = false;
            setSubmitPending(false);
        }
    };

    const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
        void form.handleSubmit(handleSubmit)(event);
    };

    return (
        <Form {...form}>
            <form noValidate onSubmit={handleFormSubmit} className="space-y-6 pt-2 text-left">
                <FormErrorSummary
                    labels={{ rptTtl: '보고 제목', rptYmd: '보고 일자', rptCn: '보고 내용' }}
                    onNavigate={form.focusError}
                />
                <FormField
                    control={form.control}
                    name="rptTtl"
                    required
                    render={({ field, fieldState }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold text-foreground uppercase tracking-tight ml-1">
                                보고 제목
                            </FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    value={field.value ?? ''}
                                    maxLength={100}
                                    className={cn('h-11 rounded-lg text-sm font-bold tracking-tight', fieldState.error && 'border-rose-500')}
                                    placeholder="예: 7월 3주차 업무 보고"
                                />
                            </FormControl>
                            <FormMessage className="text-xs font-bold text-rose-500 mt-1 ml-1" />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="rptYmd"
                    required
                    render={({ field, fieldState }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold text-foreground uppercase tracking-tight ml-1">보고 일자</FormLabel>
                            <FormControl>
                                <Input
                                    type="date"
                                    className={cn('h-11 rounded-lg', fieldState.error && 'border-rose-500')}
                                    value={ymdToInput(field.value)}
                                    onChange={(e) => field.onChange(inputToYmd(e.target.value))}
                                />
                            </FormControl>
                            <FormMessage className="text-xs font-bold text-rose-500 mt-1 ml-1" />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="rptCn"
                    render={({ field, fieldState }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold text-foreground uppercase tracking-tight ml-1">보고 내용</FormLabel>
                            <FormControl>
                                <Textarea
                                    {...field}
                                    value={field.value ?? ''}
                                    maxLength={4000}
                                    className={cn('rounded-lg min-h-[120px]', fieldState.error && 'border-destructive')}
                                    placeholder="주요 업무 내용과 진행 상황"
                                />
                            </FormControl>
                            <FormMessage className="text-xs font-bold text-destructive mt-1 ml-1" />
                        </FormItem>
                    )}
                />

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSavePending} className="flex-1 h-11 rounded-lg font-bold">
                        취소
                    </Button>
                    <Button type="submit" disabled={isSavePending} aria-busy={isSavePending || undefined} className="flex-[2] h-11 rounded-lg font-bold shadow-lg">
                        {isSavePending ? '저장 중…' : isEdit ? '수정 저장' : '보고 등록'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
