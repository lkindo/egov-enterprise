'use client';

import React from 'react';
import { useAppForm } from '@/hooks/useAppForm';
import * as z from 'zod';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DeptJobDtoSchema } from '@/types/generated-zod';
import { deptJobUserService } from '@/services/business/user/deptJob/DeptJobUserService';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

/**
 * 부서 업무 등록·수정 공용 폼.
 *
 * FE 헌법 제7조(useAppForm)·제13조 2항(인라인 z.object 금지, generated-zod 확장)을 따른다.
 * 종전의 등록 화면들은 useState + 수동 검증 + raw axios 였고, 같은 폼이 세 곳에 복제돼 있었다
 * (create/, insertDeptJob/, selectDeptJobDetail/[id]/ — 마지막 것은 경로가 '상세'인데 내용은 등록 폼이었다).
 * 등록과 수정이 같은 필드를 다루므로 한 컴포넌트로 합치고 mode 로만 구분한다.
 */
export const deptJobFormSchema = DeptJobDtoSchema.extend({
    deptTaskNm: z.string().min(1, '업무명을 입력하세요.').max(100, '업무명은 100자를 넘을 수 없습니다.'),
    // dept_task_cn 은 varchar(4000). 필수는 아니지만 상한은 스키마로 막는다.
    deptTaskCn: z.string().max(4000, '업무 내용은 4000자를 넘을 수 없습니다.').optional(),
});

export type DeptJobFormValues = z.infer<typeof deptJobFormSchema>;

/** 우선순위 코드 ↔ 표시. 등록/수정/목록이 같은 표를 쓰도록 여기서 단일 정의한다. */
export const PRIORITY_OPTIONS = [
    { value: '1', label: '🔴 높음' },
    { value: '2', label: '🟡 보통' },
    { value: '3', label: '🟢 낮음' },
] as const;

export const PRIORITY_LABEL: Record<string, string> = {
    '1': '높음',
    '2': '보통',
    '3': '낮음',
};

interface DeptJobFormProps {
    mode?: 'create' | 'edit';
    initialData?: Partial<DeptJobFormValues>;
    onSubmit: (data: DeptJobFormValues) => Promise<void>;
    onCancel: () => void;
}

/** 업무함 미지정을 나타내는 Select 값. Radix Select 는 빈 문자열 value 를 허용하지 않는다. */
const NO_BOX = '__none__';

export function DeptJobForm({ mode = 'create', initialData, onSubmit, onCancel }: DeptJobFormProps) {
    const isEdit = mode === 'edit';

    // 업무함 목록. 조회는 관리자 전용이 아니므로 일반 사용자도 선택할 수 있다
    // (등록·수정 등 쓰기만 @AdminOrSystem 이다).
    const { data: boxData } = useQuery({
        queryKey: ['dept-job-boxes'],
        queryFn: () => deptJobUserService.getDeptJobBoxes({}),
        staleTime: 5 * 60 * 1000,
    });
    const boxes = boxData?.list ?? [];

    const form = useAppForm(deptJobFormSchema, {
        defaultValues: {
            deptTaskNm: initialData?.deptTaskNm ?? '',
            deptTaskCn: initialData?.deptTaskCn ?? '',
            // 미지정 시 '보통'. 등록 화면의 종전 기본값과 동일하다.
            prrtyRnk: initialData?.prrtyRnk ?? '2',
            // 업무함은 서버에서 nullable 이다. 수정 시 기존 값을 잃지 않도록 폼에 실어 왕복시킨다
            // (보내지 않으면 update 가 null 로 덮어써 소속이 소리 없이 사라진다).
            deptTaskBoxId: initialData?.deptTaskBoxId,
            // 담당자 선택 UI 는 아직 없다. 사용자 목록 API 가 /admin/system/users 뿐이라
            // 일반 사용자에게 조직 인명부를 여는 보안 결정이 선행되어야 한다.
            // 그때까지 등록 시에는 서버가 등록자를 담당자로 채우고, 수정 시에는 기존 값을 왕복시킨다.
            picId: initialData?.picId,
            atchFileId: initialData?.atchFileId,
        },
    });

    const { isSubmitting } = form.formState;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2 text-left">
                <FormField
                    control={form.control}
                    name="deptTaskNm"
                    render={({ field, fieldState }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold text-foreground uppercase tracking-tight ml-1">
                                업무명 <span className="text-rose-500">*</span>
                            </FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    value={field.value ?? ''}
                                    className={cn('h-11 rounded-lg text-sm font-bold tracking-tight', fieldState.error && 'border-rose-500')}
                                    placeholder="예: 3분기 예산 집행 점검"
                                />
                            </FormControl>
                            <FormMessage className="text-xs font-bold text-rose-500 mt-1 ml-1" />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="prrtyRnk"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold text-foreground uppercase tracking-tight ml-1">우선 순위</FormLabel>
                            <Select value={field.value ?? '2'} onValueChange={field.onChange}>
                                <FormControl>
                                    <SelectTrigger className="h-11 rounded-lg font-bold">
                                        <SelectValue placeholder="순위 선택" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-lg">
                                    {PRIORITY_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value} className="font-bold py-3">
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage className="text-xs font-bold text-rose-500 mt-1 ml-1" />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="deptTaskBoxId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold text-foreground uppercase tracking-tight ml-1">업무함</FormLabel>
                            <Select
                                value={field.value || NO_BOX}
                                onValueChange={(v) => field.onChange(v === NO_BOX ? undefined : v)}
                            >
                                <FormControl>
                                    <SelectTrigger className="h-11 rounded-lg font-bold">
                                        <SelectValue placeholder="업무함 선택" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-lg">
                                    <SelectItem value={NO_BOX} className="font-bold py-3">지정 안 함</SelectItem>
                                    {boxes.map((box: { deptTaskBoxId?: string; deptTaskBoxNm?: string }) => (
                                        <SelectItem key={box.deptTaskBoxId} value={box.deptTaskBoxId ?? ''} className="font-bold py-3">
                                            {box.deptTaskBoxNm ?? box.deptTaskBoxId}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage className="text-xs font-bold text-rose-500 mt-1 ml-1" />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="deptTaskCn"
                    render={({ field, fieldState }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold text-foreground uppercase tracking-tight ml-1">업무 내용</FormLabel>
                            <FormControl>
                                <Textarea
                                    {...field}
                                    value={field.value ?? ''}
                                    className={cn('rounded-lg min-h-[140px]', fieldState.error && 'border-rose-500')}
                                    placeholder="업무의 목적과 범위, 완료 기준을 적어 주세요."
                                />
                            </FormControl>
                            <FormMessage className="text-xs font-bold text-rose-500 mt-1 ml-1" />
                        </FormItem>
                    )}
                />

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-11 rounded-lg font-bold">
                        취소
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="flex-[2] h-11 rounded-lg font-bold shadow-lg">
                        {isSubmitting ? '저장 중…' : isEdit ? '수정 저장' : '업무 등록'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
