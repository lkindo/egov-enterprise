'use client';

import { useForm, UseFormProps, FieldValues, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { extractFieldErrors } from '@/app/actions/actionUtils';

/**
 * `useAppForm` 의 반환 타입.
 *
 * [W1-14 보완] 종전에는 반환 타입이 `UseFormReturn<T>` 이라 `applyServerErrors` 가
 * **타입 표면에 없었다**. 런타임에는 존재하는데 호출하면 TS2339 로 컴파일이 깨졌고,
 * 이 파일의 사용 예시 주석조차 그대로는 컴파일되지 않았다. 소비 호출부가 0건이라
 * `tsc --noEmit` 는 계속 green 이었다 — 그래서 아무도 몰랐다.
 * 헬퍼를 제공하기로 한 결정의 목적은 '후속 폼 배선의 진입점' 이므로, 진입점을 타입에 올린다.
 */
export type AppFormReturn<TFieldValues extends FieldValues> = UseFormReturn<TFieldValues> & {
  /**
   * 서버가 내려준 필드 오류를 폼에 귀속시킨다.
   * @returns 필드 오류가 있어 처리했으면 `true`. `false` 면 일반 오류이므로 호출부가 토스트 등으로 처리한다.
   */
  applyServerErrors: (error: unknown) => boolean;
};

/**
 * 프로젝트 표준 폼 핸들링 훅
 * - Zod 리졸버 자동 적용
 * - 검증 실패 시 첫 번째 에러 필드로 포커스 및 토스트 알림
 * - 서버 필드 오류 귀속(`applyServerErrors`)
 */
export function useAppForm<
  TSchema extends z.ZodType<any, any>,
  TFieldValues extends FieldValues = z.infer<TSchema>
>(
  schema: TSchema,
  props?: Omit<UseFormProps<TFieldValues>, 'resolver'>
): AppFormReturn<TFieldValues> {
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

  // [W1-14] 서버 검증 오류를 폼 필드에 귀속시킨다.
  //   백엔드가 필드 정보를 내려주기 전까지는 이 연결 자체가 불가능했다(오류가 한 문장으로 뭉개져 있었다).
  //   저장소 전체에 react-hook-form 의 setError 호출부가 0건이라, 이것이 그 진입점이 된다.
  //
  //   사용 예: catch (e) { form.applyServerErrors(e) || toast.error(extractErrorMessage(e)) }
  //   반환값이 false 면 필드 오류가 아니므로 호출부가 일반 오류로 처리하면 된다.
  const appForm = form as AppFormReturn<TFieldValues>;
  appForm.applyServerErrors = (error: unknown): boolean => {
    const fieldErrors = extractFieldErrors(error);
    if (!fieldErrors) {
      return false;
    }

    const entries = Object.entries(fieldErrors);
    for (const [field, message] of entries) {
      // type:'server' 로 표시해 클라이언트 재검증 시 자동으로 걷히게 한다.
      form.setError(field as never, { type: 'server', message });
    }

    // 첫 오류 필드로 포커스를 옮긴다 — 위 검증 실패 경로와 같은 거동을 유지한다.
    const firstField = entries[0]?.[0];
    if (firstField) {
      setTimeout(() => {
        const element = document.querySelector(`[name="${firstField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (typeof (element as HTMLElement).focus === 'function') {
            (element as HTMLElement).focus();
          }
        }
      }, 100);
    }
    return true;
  };

  return appForm;
}
