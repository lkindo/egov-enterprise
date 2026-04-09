'use client';

import { useForm, UseFormProps, FieldValues, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useCallback } from 'react';

/**
 * 프로젝트 표준 폼 핸들링 훅
 * - Zod 리졸버 자동 적용
 * - 검증 실패 시 첫 번째 에러 필드로 포커스 및 토스트 알림
 */
export function useAppForm<
  TSchema extends z.ZodType<any, any>,
  TFieldValues extends FieldValues = z.infer<TSchema>
>(
  schema: TSchema,
  props?: Omit<UseFormProps<TFieldValues>, 'resolver'>
): UseFormReturn<TFieldValues> {
  const form = useForm<TFieldValues>({
    ...props as any,
    resolver: zodResolver(schema),
  });

  const originalHandleSubmit = form.handleSubmit;

  // @ts-ignore
  form.handleSubmit = (onValid: any, onInvalid?: any) => {
    const customOnInvalid = (errors: any) => {
      console.error('Validation Errors:', errors);
      
      const errorKeys = Object.keys(errors);
      if (errorKeys.length > 0) {
        const firstErrorPath = errorKeys[0];
        const firstError = errors[firstErrorPath];
        
        toast.error(firstError?.message || '입력 항목을 확인해주세요.', {
          description: `항목: ${firstErrorPath}`,
        });

        setTimeout(() => {
          const element = document.getElementsByName(firstErrorPath)[0] || 
                          document.querySelector(`[name="${firstErrorPath}"]`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (typeof (element as any).focus === 'function') {
              (element as any).focus();
            }
          }
        }, 100);
      }

      if (onInvalid) onInvalid(errors);
    };

    return originalHandleSubmit(onValid, customOnInvalid);
  };

  return form;
}
