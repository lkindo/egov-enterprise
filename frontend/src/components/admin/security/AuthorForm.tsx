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
import { AuthorInfo } from '@/services/foundation/system/AuthorAdminService';
import { cn } from '@/lib/utils';
import { Zap, Key, ShieldCheck, Binary } from 'lucide-react';

import { AuthorManageDtoSchema } from '@/types/generated-zod';

export const authorSchema = AuthorManageDtoSchema.extend({
  authrtCd: AuthorManageDtoSchema.shape.authrtCd
    .min(1)
    .regex(/^[A-Z0-9_]+$/, '영문 대문자, 숫자, 언더바(_)만 가능합니다.'),
  authrtNm: AuthorManageDtoSchema.shape.authrtNm
    .min(1),
});

export type AuthorFormValues = z.infer<typeof authorSchema>;

interface AuthorFormProps {
  initialData?: Partial<AuthorInfo>;
  mode: 'create' | 'edit';
  onSubmit: (data: AuthorFormValues) => Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
  isDisabled?: boolean;
}

export function AuthorForm({ initialData, mode, onSubmit, onCancel, isPending = false, isDisabled = false }: AuthorFormProps) {
  const form = useAppForm(authorSchema, {
    defaultValues: {
      authrtCd: initialData?.authrtCd || '',
      authrtNm: initialData?.authrtNm || '',
      authrtExpln: initialData?.authrtExpln || '',
    },
  });

  const { isSubmitting } = form.formState;
  const isWritePending = isSubmitting || isPending;
  const areActionsDisabled = isWritePending || isDisabled;

  const handleSubmit = async (values: AuthorFormValues) => {
    if (isPending || isDisabled) return;
    try {
      await onSubmit(values);
    } catch (error) {
      if (!form.applyServerErrors(error)) throw error;
    }
  };

  return (
    <Form {...form}>
            <form noValidate onSubmit={form.handleSubmit(handleSubmit)} className="p-4 space-y-12 text-left">
        <FormErrorSummary
          labels={{ authrtCd: '보안 역할 식별자', authrtNm: '역할 레이블 명칭', authrtExpln: '보안 정책 정보 명세' }}
          onNavigate={form.focusError}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <FormField
            control={form.control}
            name="authrtCd"
            required
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                  보안 역할 식별자(Role Code)
                </FormLabel>
                <div className="relative group/id">
                  <Key size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/id:opacity-100 transition-opacity z-10" />
                  <FormControl>
                    <Input
                      {...field}
                      disabled={mode === 'edit'}
                      maxLength={20}
                      className={cn(
                        "h-11 rounded-lg border-2 text-md font-bold italic tracking-widest uppercase shadow-inner pl-16 pt-0",
                        mode === 'edit' && "bg-muted/50 border-none"
                      )}
                      placeholder="ROLE_IDENTIFIER (MAX_20)"
                    />
                  </FormControl>
                </div>
                <FormMessage className="text-xs font-bold text-rose-500 mt-2 ml-2 tracking-tight" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="authrtNm"
            required
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                  역할 레이블 명칭
                </FormLabel>
                <div className="relative group/nm">
                  <ShieldCheck size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/nm:opacity-100 transition-opacity z-10" />
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={60}
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
          name="authrtExpln"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                보안 정책 정보 명세
              </FormLabel>
              <div className="relative group/dc">
                <Binary size={18} className="absolute left-6 top-6 text-muted-foreground opacity-30 group-focus-within/dc:opacity-100 transition-opacity z-10" />
                <FormControl>
                  <textarea
                    {...field}
                    maxLength={200}
                    className="min-h-[160px] w-full pl-16 p-8 rounded-lg border-2 bg-muted/50 text-xs font-bold focus:ring-8 focus:ring-primary/5 outline-none transition-all resize-none shadow-inner"
                    placeholder="상세 명세 입력... (최대 200자)"
                  />
                </FormControl>
              </div>
              <FormMessage className="text-xs font-bold text-rose-500 mt-2 ml-2 tracking-tight" />
            </FormItem>
          )}
        />

        <div className="flex w-full gap-6 pt-4 border-t border-border">
          <button 
            type="button" 
            disabled={areActionsDisabled}
            onClick={() => {
              if (!areActionsDisabled) onCancel();
            }}
            className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest border border-border text-muted-foreground bg-card hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all outline-none cursor-pointer flex items-center justify-center"
          >
            취소
          </button>
          <Button
            type="submit"
            disabled={areActionsDisabled}
            aria-busy={isWritePending || undefined}
            className="flex-[2] h-11 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-xs tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-2 group px-6"
          >
            <Zap size={18} className="group-hover:animate-pulse mr-2" />
            {isWritePending ? '처리 중…' : mode === 'create' ? '권한 배포' : '권한 수정'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

