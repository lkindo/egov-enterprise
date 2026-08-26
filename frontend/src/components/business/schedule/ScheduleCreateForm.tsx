'use client';

import { useRef, useState } from 'react';
import { useAppForm } from '@/hooks/useAppForm';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormErrorSummary,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScheduleDtoSchema } from '@/types/generated-zod';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage } from '@/app/actions/actionUtils';

const scheduleValidationLabels: Record<string, string> = {
  schdlNm: '일정명',
  schdlBgngYmd: '시작일',
  schdlEndYmd: '종료일',
  schdlPlcNm: '장소',
  schdlCn: '내용',
  schdlSeCd: '공유 범위',
};

function isValidYmd(value: string): boolean {
  if (!/^\d{8}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year
    && parsed.getMonth() === month - 1
    && parsed.getDate() === day;
}

/**
 * 일정 등록 폼 스키마.
 * FE 헌법 제13조 2항에 따라 인라인 z.object 를 쓰지 않고 백엔드 SSOT(generated-zod)를 확장한다.
 * 날짜는 물리 컬럼이 varchar(8) 이므로 'yyyyMMdd' 8자로 고정한다(시각 정보는 스키마에 없다).
 */
export const scheduleFormSchema = ScheduleDtoSchema.extend({
  schdlNm: z.string()
    .trim()
    .min(1, '일정명을 입력하세요.')
    .max(100, '일정명은 최대 100자까지 입력할 수 있습니다.')
    .pipe(ScheduleDtoSchema.shape.schdlNm),
  schdlCn: z.string()
    .trim()
    .max(4000, '내용은 최대 4000자까지 입력할 수 있습니다.')
    .pipe(ScheduleDtoSchema.shape.schdlCn.unwrap())
    .optional(),
  schdlBgngYmd: z.string()
    .trim()
    .min(1, '시작일을 선택하세요.')
    .length(8, '시작일 형식을 확인해 주세요.')
    .regex(/^\d{8}$/, '시작일 형식을 확인해 주세요.')
    .refine(isValidYmd, '시작일을 확인해 주세요.')
    .pipe(ScheduleDtoSchema.shape.schdlBgngYmd.unwrap()),
  schdlEndYmd: z.string()
    .trim()
    .min(1, '종료일을 선택하세요.')
    .length(8, '종료일 형식을 확인해 주세요.')
    .regex(/^\d{8}$/, '종료일 형식을 확인해 주세요.')
    .refine(isValidYmd, '종료일을 확인해 주세요.')
    .pipe(ScheduleDtoSchema.shape.schdlEndYmd.unwrap()),
  schdlPlcNm: z.string()
    .trim()
    .max(100, '장소는 최대 100자까지 입력할 수 있습니다.')
    .pipe(ScheduleDtoSchema.shape.schdlPlcNm.unwrap())
    .optional(),
  schdlSeCd: z.string()
    .trim()
    .refine((value: string): boolean => value === '1' || value === '2', '공유 범위를 확인해 주세요.')
    .pipe(ScheduleDtoSchema.shape.schdlSeCd.unwrap()),
}).refine((v) => !v.schdlEndYmd || !v.schdlBgngYmd || v.schdlEndYmd >= v.schdlBgngYmd, {
  message: '종료일은 시작일보다 빠를 수 없습니다.',
  path: ['schdlEndYmd'],
});

export type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

/** 저장 포맷 'yyyyMMdd' → <input type="date"> 의 'yyyy-MM-dd' */
const ymdToInput = (ymd?: string) =>
  ymd && ymd.length >= 8 ? `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}` : '';
/** <input type="date"> 의 'yyyy-MM-dd' → 저장 포맷 'yyyyMMdd' */
const inputToYmd = (value: string) => value.replace(/-/g, '');

interface ScheduleCreateFormProps {
  /** 캘린더에서 선택한 날짜(yyyyMMdd). 없으면 오늘. 등록 모드에서만 쓰인다. */
  defaultYmd: string;
  /** 수정 모드일 때 기존 값. */
  initialData?: Partial<ScheduleFormValues>;
  mode?: 'create' | 'edit';
  onSubmit: (data: ScheduleFormValues) => Promise<void>;
  onCancel: () => void;
  /** 합성 화면이 소유하는 저장/삭제 상호 배제 상태. */
  isPending?: boolean;
}

export function ScheduleCreateForm({ defaultYmd, initialData, mode = 'create', onSubmit, onCancel, isPending = false }: ScheduleCreateFormProps) {
  const isEdit = mode === 'edit';
  const { toast } = useToast();
  const submitPendingRef = useRef(false);
  const [isSubmitPending, setSubmitPending] = useState(false);
  const form = useAppForm(scheduleFormSchema, {
    defaultValues: {
      schdlNm: initialData?.schdlNm ?? '',
      schdlCn: initialData?.schdlCn ?? '',
      schdlBgngYmd: initialData?.schdlBgngYmd ?? defaultYmd,
      schdlEndYmd: initialData?.schdlEndYmd ?? defaultYmd,
      schdlPlcNm: initialData?.schdlPlcNm ?? '',
      // 기본은 개인 일정('2'). 체크 시 부서 공유('1')로 등록되어 같은 부서원에게도 보인다.
      schdlSeCd: initialData?.schdlSeCd ?? '2',
    },
  });

  const { isSubmitting } = form.formState;
  const isSavePending = isSubmitting || isSubmitPending || isPending;
  const isDeptShared = form.watch('schdlSeCd') === '1';

  const handleSubmit = async (values: ScheduleFormValues) => {
    if (submitPendingRef.current) return;
    submitPendingRef.current = true;
    setSubmitPending(true);
    try {
      await onSubmit(values);
    } catch (error: unknown) {
      if (!form.applyServerErrors(error)) {
        toast(extractErrorMessage(error, '일정 저장 중 오류가 발생했습니다.'), 'error');
      }
    } finally {
      submitPendingRef.current = false;
      setSubmitPending(false);
    }
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    void form.handleSubmit(handleSubmit)(event);
  };

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} noValidate className="space-y-6 pt-2 text-left">
        <FormErrorSummary labels={scheduleValidationLabels} onNavigate={form.focusError} />

        <FormField
          control={form.control}
          name="schdlNm"
          required
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel className="text-xs font-bold text-foreground uppercase tracking-tight ml-1">
                일정명
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  className={cn('h-11 rounded-lg text-sm font-bold tracking-tight', fieldState.error && 'border-rose-500')}
                  placeholder="예: 주간 팀 회의"
                  maxLength={100}
                />
              </FormControl>
              <FormMessage className="text-xs font-bold text-rose-500 mt-1 ml-1" />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="schdlBgngYmd"
            required
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-foreground uppercase tracking-tight ml-1">시작일</FormLabel>
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
            name="schdlEndYmd"
            required
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-foreground uppercase tracking-tight ml-1">종료일</FormLabel>
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
        </div>

        <FormField
          control={form.control}
          name="schdlPlcNm"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-bold text-foreground uppercase tracking-tight ml-1">장소</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  className="h-11 rounded-lg"
                  placeholder="예: 대회의실"
                  maxLength={100}
                />
              </FormControl>
              <FormMessage className="text-xs font-bold text-destructive-emphasis mt-1 ml-1" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="schdlCn"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-bold text-foreground uppercase tracking-tight ml-1">내용</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ''}
                  className="rounded-lg min-h-[90px]"
                  placeholder="일정 상세 내용"
                  maxLength={4000}
                />
              </FormControl>
              <FormMessage className="text-xs font-bold text-destructive-emphasis mt-1 ml-1" />
            </FormItem>
          )}
        />

        {/* 개인/부서 구분. 부서로 등록하면 같은 부서원의 캘린더에도 표시된다. */}
        <FormField
          control={form.control}
          name="schdlSeCd"
          render={({ field }) => (
            <FormItem>
              <label className="flex items-center gap-3 cursor-pointer select-none rounded-lg border border-border bg-muted/40 px-4 py-3">
                <FormControl>
                  <input
                    type="checkbox"
                    aria-label="부서 일정으로 공유"
                    className="h-4 w-4 accent-primary"
                    checked={field.value === '1'}
                    onChange={(e) => field.onChange(e.target.checked ? '1' : '2')}
                  />
                </FormControl>
                <span className="text-xs font-bold tracking-tight text-foreground">
                  부서 일정으로 공유
                  <span className="ml-2 font-medium text-muted-foreground">
                    {isDeptShared ? '같은 부서원에게도 표시됩니다' : '나만 볼 수 있습니다'}
                  </span>
                </span>
              </label>
              <FormMessage className="text-xs font-bold text-destructive-emphasis mt-1 ml-1" />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSavePending} className="flex-1 h-11 rounded-lg font-bold">
            취소
          </Button>
          <Button type="submit" disabled={isSavePending} aria-busy={isSavePending || undefined} className="flex-[2] h-11 rounded-lg font-bold shadow-lg">
            {isSavePending ? '저장 중…' : isEdit ? '일정 수정' : '일정 등록'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
