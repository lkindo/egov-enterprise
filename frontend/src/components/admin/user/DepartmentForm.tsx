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

export const deptSchema = z.object({
  orgnztNm: z.string().min(1, '부서명은 필수입니다.').max(20, '부서명은 20자 이내여야 합니다.'),
  orgnztDc: z.string().max(100, '설명은 100자 이내여야 합니다.').optional().or(z.literal('')),
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
      orgnztNm: initialData?.orgnztNm || '',
      orgnztDc: initialData?.orgnztDc || '',
    },
  });

  const { isSubmitting } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-4 text-left">
        <FormField
          control={form.control}
          name="orgnztNm"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                부서 명칭 <span className="text-rose-500 font-extrabold text-[10px]">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="h-14 rounded-xl text-sm font-black tracking-tight"
                  placeholder="DEPT_NAME"
                />
              </FormControl>
              <FormMessage className="text-[10px] font-bold text-rose-500 mt-2 ml-2" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="orgnztDc"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                부서 설명명세
              </FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  className="w-full min-h-[120px] p-6 rounded-xl border-2 border-slate-100 bg-slate-50 text-xs font-bold outline-none resize-none shadow-inner"
                  placeholder="부서의 역할 및 책임 정의..."
                />
              </FormControl>
              <FormMessage className="text-[10px] font-bold text-rose-500 mt-2 ml-2" />
            </FormItem>
          )}
        />

        <div className="flex w-full gap-4 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-14 rounded-xl font-black text-[10px] tracking-widest uppercase border-2">취소</Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-[2] h-14 rounded-xl font-black text-[10px] tracking-widest shadow-xl bg-slate-900 text-white hover:bg-primary transition-all group"
          >
            <Zap size={18} className="group-hover:animate-pulse mr-2" />
            {mode === 'create' ? '부서 등록' : '정보 수정'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
