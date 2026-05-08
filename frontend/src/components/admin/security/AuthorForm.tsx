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
import { AuthorInfo } from '@/services/foundation/system/AuthorAdminService';
import { cn } from '@/lib/utils';
import { Zap, Key, ShieldCheck, Binary } from 'lucide-react';

export const authorSchema = z.object({
  authorCode: z.string()
    .min(1, '권한 코드는 필수입니다.')
    .max(30, '권한 코드는 30자 이내여야 합니다.')
    .regex(/^[A-Z0-9_]+$/, '영문 대문자, 숫자, 언더바(_)만 가능합니다.'),
  authorNm: z.string()
    .min(1, '권한 명칭은 필수입니다.')
    .max(60, '권한 명칭은 60자 이내여야 합니다.'),
  authorDc: z.string()
    .max(200, '내용이 너무 깁니다. (최대 200자)')
    .optional()
    .or(z.literal('')),
});

export type AuthorFormValues = z.infer<typeof authorSchema>;

interface AuthorFormProps {
  initialData?: Partial<AuthorInfo>;
  mode: 'create' | 'edit';
  onSubmit: (data: AuthorFormValues) => Promise<void>;
  onCancel: () => void;
}

export function AuthorForm({ initialData, mode, onSubmit, onCancel }: AuthorFormProps) {
  const form = useAppForm(authorSchema, {
    defaultValues: {
      authorCode: initialData?.authorCode || '',
      authorNm: initialData?.authorNm || '',
      authorDc: initialData?.authorDc || '',
    },
  });

  const { isSubmitting } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-12 text-left">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <FormField
            control={form.control}
            name="authorCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                  보안 역할 식별자(Role Code) <span className="text-rose-500 font-bold text-xs">*</span>
                </FormLabel>
                <div className="relative group/id">
                  <Key size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/id:opacity-100 transition-opacity z-10" />
                  <FormControl>
                    <Input
                      {...field}
                      id="authorCode"
                      disabled={mode === 'edit'}
                      className={cn(
                        "h-11 rounded-lg border-2 text-md font-bold italic tracking-widest uppercase shadow-inner pl-16 pt-0",
                        mode === 'edit' && "bg-muted/50 border-none"
                      )}
                      placeholder="ROLE_IDENTIFIER (MAX_30)"
                    />
                  </FormControl>
                </div>
                <FormMessage className="text-xs font-bold text-rose-500 mt-2 ml-2 tracking-tight" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="authorNm"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                  역할 레이블 명칭 <span className="text-rose-500 font-bold text-xs">*</span>
                </FormLabel>
                <div className="relative group/nm">
                  <ShieldCheck size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/nm:opacity-100 transition-opacity z-10" />
                  <FormControl>
                    <Input
                      {...field}
                      id="authorNm"
                      className="h-11 pl-16 rounded-lg border-2 text-md font-bold tracking-tight shadow-inner"
                      placeholder="역할 명칭 입력 (MAX_60)"
                    />
                  </FormControl>
                </div>
                <FormMessage className="text-xs font-bold text-rose-500 mt-2 ml-2 tracking-tight" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="authorDc"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                보안 정책 정보 명세
              </FormLabel>
              <div className="relative group/dc">
                <Binary size={18} className="absolute left-6 top-6 text-muted-foreground opacity-30 group-focus-within/dc:opacity-100 transition-opacity z-10" />
                <FormControl>
                  <textarea
                    {...field}
                    id="authorDc"
                    className="min-h-[160px] w-full pl-16 p-8 rounded-lg border-2 bg-slate-50/50 text-xs font-bold focus:ring-8 focus:ring-primary/5 outline-none transition-all resize-none shadow-inner"
                    placeholder="상세 명세 입력... (최대 200자)"
                  />
                </FormControl>
              </div>
              <FormMessage className="text-xs font-bold text-rose-500 mt-2 ml-2 tracking-tight" />
            </FormItem>
          )}
        />

        <div className="flex w-full gap-6 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest border-2">취소</Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-[2] h-11 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-2 group px-6"
          >
            <Zap size={18} className="group-hover:animate-pulse mr-2" />
            {mode === 'create' ? '권한 배포' : '권한 수정'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
