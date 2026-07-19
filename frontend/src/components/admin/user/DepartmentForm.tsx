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
  ognzNm: z.string().min(1, '부서명을 입력하세요.').max(100),
  ognzExpln: z.string().max(4000).optional().or(z.literal('')),
});

export type DeptFormValues = z.infer<typeof deptSchema>;

interface DepartmentFormProps {
  initialData?: Partial<Department>;
  mode: 'create' | 'edit';
  onSubmit: (data: DeptFormValues) => Promise<void>;
  onCancel: () => void;
}

export function DepartmentForm({ initialData, mode, onSubmit, onCancel }: DepartmentFormProps) {
  const form = useAppForm(deptSchema, {
    defaultValues: {
      ognzNm: initialData?.ognzNm || '',
      ognzExpln: initialData?.ognzExpln || '',
    },
  });

  const { isSubmitting } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-4 text-left">
        <FormField
          control={form.control}
          name="ognzNm"
          render={({ field, fieldState }) => (
            <FormItem>
              <motion.div
                animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                  부서 명칭 <span className="text-rose-500 font-bold text-xs">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className={cn(
                        "h-11 rounded-lg text-sm font-bold tracking-tight transition-all focus:ring-4 focus:ring-primary/10",
                        fieldState.error && "border-rose-500 ring-rose-500/10 ring-4"
                    )}
                    placeholder="DEPT_NAME"
                  />
                </FormControl>
                <FormMessage className="text-xs font-bold text-rose-500 mt-2 ml-2" />
              </motion.div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ognzExpln"
          render={({ field, fieldState }) => (
            <FormItem>
              <motion.div
                animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                  부서 설명명세
                </FormLabel>
                <FormControl>
                  <textarea
                    {...field}
                    className={cn(
                        "w-full min-h-[120px] p-6 rounded-lg border-2 border-border bg-muted text-xs font-bold outline-none resize-none shadow-inner transition-all focus:ring-4 focus:ring-primary/10",
                        fieldState.error && "border-rose-500 ring-rose-500/10 ring-4"
                    )}
                    placeholder="부서의 역할 및 책임 정의..."
                  />
                </FormControl>
                <FormMessage className="text-xs font-bold text-rose-500 mt-2 ml-2" />
              </motion.div>
            </FormItem>
          )}
        />

        <div className="flex w-full gap-4 pt-4 border-t border-border">
          <button 
            type="button" 
            onClick={onCancel} 
            className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest border border-border text-muted-foreground bg-white hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all outline-none cursor-pointer flex items-center justify-center"
          >
            취소
          </button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-[2] h-11 rounded-lg font-bold text-xs tracking-widest shadow-xl bg-surface-inverse text-surface-inverse-foreground hover:bg-primary transition-all group"
          >
            <Zap size={18} className="group-hover:animate-pulse mr-2" />
            {mode === 'create' ? '부서 등록' : '정보 수정'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
