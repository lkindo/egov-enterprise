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
import { userSearchService, type UserSearchResult } from '@/services/business/user/UserSearchService';
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
    deptTaskBoxId: z.string().nullable().optional().transform(v => v === null ? undefined : v),
    atchFileId: z.string().nullable().optional().transform(v => v === null ? undefined : v),
    picId: z.string().nullable().optional().transform(v => v === null ? undefined : v),
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

/**
 * 담당자 검색을 시작하는 최소 글자 수. 서버(`UserService.PIC_SEARCH_MIN_KEYWORD_LENGTH`)와 같은 값이다.
 * 서버도 미달 시 빈 목록을 돌려주지만, 애초에 요청을 보내지 않는 편이 인명부 조회 횟수를 줄인다.
 */
const PIC_SEARCH_MIN_KEYWORD = 2;

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

    // ── 담당자 검색 ──────────────────────────────────────────────────────────
    // 검색어는 폼 값이 아니라 로컬 상태다. 제출되는 값은 어디까지나 picId 하나다.
    const [picQuery, setPicQuery] = React.useState('');
    const [picQueryDebounced, setPicQueryDebounced] = React.useState('');
    // 선택된 담당자의 표시용 이름. 화면 표시 전용이며 제출 대상이 아니다
    // (서버는 picId 만 읽고 picNm 은 조회 시 스스로 채워 준다).
    // 수정 모드에서는 이미 지정된 담당자 이름이 initialData 로 들어온다.
    const [picNm, setPicNm] = React.useState(initialData?.picNm ?? '');

    React.useEffect(() => {
        const timer = setTimeout(() => setPicQueryDebounced(picQuery), 300);
        return () => clearTimeout(timer);
    }, [picQuery]);

    const picKeyword = picQueryDebounced.trim();
    const { data: picCandidates, isFetching: isPicSearching } = useQuery({
        queryKey: ['user-search', picKeyword],
        queryFn: () => userSearchService.searchAssignableUsers(picKeyword),
        enabled: picKeyword.length >= PIC_SEARCH_MIN_KEYWORD,
        staleTime: 60 * 1000,
    });
    const candidates: UserSearchResult[] = picCandidates ?? [];

    const form = useAppForm(deptJobFormSchema, {
        defaultValues: {
            deptTaskNm: initialData?.deptTaskNm ?? '',
            deptTaskCn: initialData?.deptTaskCn ?? '',
            // 미지정 시 '보통'. 등록 화면의 종전 기본값과 동일하다.
            prrtyRnk: initialData?.prrtyRnk ?? '2',
            // 업무함은 서버에서 nullable 이다. 수정 시 기존 값을 잃지 않도록 폼에 실어 왕복시킨다
            // (보내지 않으면 update 가 null 로 덮어써 소속이 소리 없이 사라진다).
            deptTaskBoxId: initialData?.deptTaskBoxId,
            // 담당자. 업무함과 마찬가지로 nullable 이므로 수정 시 기존 값을 폼에 실어 왕복시킨다
            // (보내지 않으면 update 가 null 로 덮어써 담당자가 소리 없이 사라진다).
            // 등록 시 미지정으로 두면 서버가 등록자를 담당자로 채운다 — 그 동작을 유지하기 위해
            // 빈 문자열이 아니라 undefined 로 둔다(서버는 blank 도 미지정으로 보지만 수정 경로에서는
            // 빈 문자열이 그대로 저장되므로 축을 맞춘다).
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

                {/*
                  담당자 선택. 목록을 통째로 내려받아 Select 로 고르는 방식이 아니라 검색형이다.
                  전 직원 명부를 화면에 미리 붓지 않기 위한 것으로, 서버도 같은 전제로 만들어졌다
                  (GET /api/v1/users/search — 2자 이상 검색어 요구, 최대 20건, 페이징 없음).
                  폼에 실리는 값은 picId(esntlId) 하나이며, 이름은 표시용 로컬 상태로만 다룬다.
                */}
                <FormField
                    control={form.control}
                    name="picId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold text-foreground uppercase tracking-tight ml-1">담당자</FormLabel>

                            {field.value ? (
                                <div className="flex items-center justify-between gap-3 h-11 px-3 rounded-lg border border-border bg-muted/40">
                                    <span className="text-sm font-bold tracking-tight truncate">
                                        {/* 수정 화면 진입 직후에는 이름이 없을 수 있다(목록에서 picNm 을 못 받은 경우).
                                            그때는 식별자라도 보여 줘 담당자가 '비어 있는 것처럼' 보이지 않게 한다. */}
                                        {picNm || field.value}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-8 px-3 rounded-md text-xs font-bold shrink-0"
                                        onClick={() => {
                                            // 빈 문자열이 아니라 undefined 로 되돌린다. 등록 경로에서는 둘 다
                                            // '미지정'으로 처리되지만 수정 경로는 빈 문자열을 그대로 저장한다.
                                            field.onChange(undefined);
                                            setPicNm('');
                                            setPicQuery('');
                                        }}
                                    >
                                        변경
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <FormControl>
                                        {/* field 를 spread 하지 않는다. 이 입력창의 값은 검색어이지 picId 가 아니다. */}
                                        <Input
                                            value={picQuery}
                                            onChange={(e) => setPicQuery(e.target.value)}
                                            className="h-11 rounded-lg text-sm font-bold tracking-tight"
                                            placeholder={`담당자 이름을 ${PIC_SEARCH_MIN_KEYWORD}자 이상 입력하세요`}
                                            autoComplete="off"
                                        />
                                    </FormControl>

                                    {picKeyword.length >= PIC_SEARCH_MIN_KEYWORD && (
                                        <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border">
                                            {isPicSearching ? (
                                                <p className="px-3 py-3 text-xs font-bold text-muted-foreground">검색 중…</p>
                                            ) : candidates.length === 0 ? (
                                                <p className="px-3 py-3 text-xs font-bold text-muted-foreground">일치하는 사용자가 없습니다.</p>
                                            ) : (
                                                <ul>
                                                    {candidates.map((user) => (
                                                        <li key={user.esntlId}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    // picId 가 담는 축은 esntlId 다(로그인 ID 가 아니다).
                                                                    field.onChange(user.esntlId);
                                                                    setPicNm(user.userNm ?? '');
                                                                    setPicQuery('');
                                                                }}
                                                                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                                                            >
                                                                <span className="text-sm font-bold tracking-tight truncate">{user.userNm}</span>
                                                                {user.deptNm && (
                                                                    <span className="text-xs font-bold text-muted-foreground shrink-0">{user.deptNm}</span>
                                                                )}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}

                                    {!isEdit && (
                                        <p className="text-xs font-bold text-muted-foreground mt-1 ml-1">
                                            지정하지 않으면 등록한 본인이 담당자가 됩니다.
                                        </p>
                                    )}
                                </>
                            )}

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
