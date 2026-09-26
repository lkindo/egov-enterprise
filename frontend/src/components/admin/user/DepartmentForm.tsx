'use client';

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
} from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Department } from '@/services/foundation/system/DeptAdminService';
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

import { DeptManageDtoSchema } from '@/types/generated-zod';

/**
 * 부서 등록/수정 폼 스키마 (FE 헌법 제13조 2항: generated-zod 를 import 후 .extend 로만 확장).
 *
 * 종전에는 `.partial()` 로 모든 필드의 필수성을 지웠는데, 그 결과 ognzId 가 없어도 클라이언트 검증을
 * 통과시킨 뒤 서버 @NotBlank 에서 400 을 맞았다(부서를 하나도 만들 수 없던 원인의 한 축).
 * 이제 ognzId 는 서버가 채번하므로 SSOT 스키마에서도 optional 이며, `.partial()` 없이
 * 필요한 제약만 좁힌다 — 부서명은 실제로 필수여야 한다.
 */
export const deptSchema = DeptManageDtoSchema.extend({
  ognzNm: DeptManageDtoSchema.shape.ognzNm.min(1, '부서명을 입력하세요.'),
  ognzExpln: z.string().max(4000).optional().or(z.literal('')),
  upOgnzId: z.string().max(20).optional().or(z.literal('')),
});

export type DeptFormValues = z.infer<typeof deptSchema>;

/** 상위 부서 선택지. `label` 은 계층을 들여쓴 이름이다. */
export interface DeptParentOption {
  ognzId: string;
  label: string;
}

interface DepartmentFormProps {
  initialData?: Partial<Department>;
  /** 등록 모드에서 고를 수 있는 상위 부서. 비어 있으면 최상위로만 등록된다. */
  parentOptions?: DeptParentOption[];
  mode: 'create' | 'edit';
  onSubmit: (data: DeptFormValues) => Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
  externalBusy?: boolean;
}

export function DepartmentForm({
  initialData,
  parentOptions = [],
  mode,
  onSubmit,
  onCancel,
  isPending = false,
  externalBusy = false,
}: DepartmentFormProps) {
  const form = useAppForm(deptSchema, {
    defaultValues: {
      ognzNm: initialData?.ognzNm || '',
      ognzExpln: initialData?.ognzExpln || '',
      upOgnzId: '',
    },
  });

  const { isSubmitting } = form.formState;
  const isWritePending = isSubmitting || isPending;
  const areActionsDisabled = isWritePending || externalBusy;

  const handleSubmit = async (values: DeptFormValues) => {
    if (isPending || externalBusy) return;
    try {
      await onSubmit(values);
    } catch (error) {
      if (!form.applyServerErrors(error)) throw error;
    }
  };

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={(event) => {
          if (isPending || externalBusy) {
            event.preventDefault();
            return;
          }
          void form.handleSubmit(handleSubmit)(event);
        }}
        className="space-y-8 pt-4 text-left"
      >
        <FormErrorSummary
          labels={{ ognzNm: '부서 명칭', upOgnzId: '상위 부서', ognzExpln: '부서 설명명세' }}
          onNavigate={form.focusError}
        />
        <FormField
          control={form.control}
          name="ognzNm"
          required
          render={({ field, fieldState }) => (
            <FormItem>
              <motion.div
                animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1">
                  부서 명칭
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    maxLength={200}
                    className={cn(
                        "rounded-lg text-sm font-bold tracking-tight transition-all focus:ring-4 focus:ring-primary/10",
                        fieldState.error && "border-destructive ring-destructive/10 ring-4"
                    )}
                    placeholder="예: 기획부"
                  />
                </FormControl>
                <FormMessage className="text-xs font-bold text-destructive-emphasis mt-2 ml-2" />
              </motion.div>
            </FormItem>
          )}
        />

        {/*
          [2026-09-26 DIP C5] 등록 폼에서 상위 부서를 고른다. 종전에는 새 부서가 늘 최상위로 만들어져, 하위로
          옮기려면 드래그로 다시 배치해야 했다. 수정은 계층을 바꾸지 않는다(계층은 조직 구조에서 끌어서 바꾼다).
        */}
        {mode === 'create' && (
          <FormField
            control={form.control}
            name="upOgnzId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1">
                  상위 부서
                </FormLabel>
                <FormControl>
                  <select
                    {...field}
                    value={field.value ?? ''}
                    className="h-[var(--control-h)] w-full rounded-lg border border-border bg-card px-3 text-sm font-bold"
                  >
                    <option value="">최상위 (상위 부서 없음)</option>
                    {parentOptions.map((option) => (
                      <option key={option.ognzId} value={option.ognzId}>{option.label}</option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage className="text-xs font-bold text-destructive-emphasis mt-2 ml-2" />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="ognzExpln"
          render={({ field, fieldState }) => (
            <FormItem>
              <motion.div
                animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1">
                  부서 설명명세
                </FormLabel>
                <FormControl>
                  <textarea
                    {...field}
                    maxLength={4000}
                    className={cn(
                        "w-full min-h-[120px] p-6 rounded-lg border-2 border-border bg-muted text-xs font-bold outline-none resize-none shadow-inner transition-all focus:ring-4 focus:ring-primary/10",
                        fieldState.error && "border-destructive ring-destructive/10 ring-4"
                    )}
                    placeholder="부서의 역할 및 책임 정의..."
                  />
                </FormControl>
                <FormMessage className="text-xs font-bold text-destructive-emphasis mt-2 ml-2" />
              </motion.div>
            </FormItem>
          )}
        />

        <div className="flex w-full gap-4 pt-4 border-t border-border">
          <button 
            type="button" 
            disabled={areActionsDisabled}
            onClick={() => {
              if (!areActionsDisabled) onCancel();
            }}
            className="flex-1 h-[var(--control-h)] rounded-lg font-bold text-xs tracking-widest border border-border text-muted-foreground bg-card hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all outline-none cursor-pointer flex items-center justify-center"
          >
            취소
          </button>
          <Button
            type="submit"
            disabled={areActionsDisabled}
            aria-busy={isWritePending || undefined}
            className="flex-[2] rounded-lg font-bold text-xs tracking-widest shadow-xl bg-surface-inverse text-surface-inverse-foreground hover:bg-primary transition-all group"
          >
            <Zap size={18} className="group-hover:animate-pulse mr-2" />
            {isWritePending ? '처리 중…' : mode === 'create' ? '부서 등록' : '정보 수정'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
