'use client';

import { useEffect, useRef } from 'react';
import {
  useForm,
  UseFormProps,
  FieldValues,
  UseFormReturn,
  SubmitErrorHandler,
  UseFormHandleSubmit,
  Resolver,
} from 'react-hook-form';
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
export type AppFormReturn<
  TFieldValues extends FieldValues,
  TTransformedValues extends FieldValues = TFieldValues,
> = UseFormReturn<TFieldValues, unknown, TTransformedValues> & {
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
  TSchema extends z.ZodType<unknown, FieldValues>,
  TFieldValues extends FieldValues = z.infer<TSchema> & FieldValues,
>(
  schema: TSchema,
  props?: Omit<UseFormProps<TFieldValues, unknown>, 'resolver'>
): AppFormReturn<TFieldValues> {
  const form = useForm<TFieldValues, unknown>({
    ...props,
    // resolver 패키지는 구체 Zod 스키마의 입출력을 이 제네릭 경계에서 보존하지 못한다.
    // 소비 폼의 TFieldValues 로 한 번만 좁히고, 이후 register/submit 표면은 강타입으로 유지한다.
    resolver: zodResolver(schema) as Resolver<TFieldValues, unknown>,
  });

  // [2026-08-09 누수 정정] 첫 오류 필드로 포커스를 옮기는 setTimeout 이 **취소되지 않았다.**
  //   컴포넌트가 100ms 안에 사라지면(제출 직후 라우팅·모달 닫힘) 콜백이 **사라진 DOM 을 건드린다.**
  //   테스트 환경에서는 jsdom 해체 뒤에 발동해 `ReferenceError: document is not defined` 로
  //   드러났고(2026-08-09 CI 실측), 그때는 테스트를 가짜 타이머로 우회했다.
  //   여기서는 원인 자체를 없앤다 — 예약한 타이머를 붙들고 언마운트 시 지운다.
  //   두 경로(검증 실패·서버 오류)가 같은 일을 하고 있어 헬퍼로 모은다.
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (focusTimerRef.current !== null) {
        clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
    };
  }, []);

  /** 첫 오류 필드로 스크롤·포커스한다. 이전 예약이 남아 있으면 대체한다. */
  const focusFirstErrorField = (fieldName: string) => {
    if (focusTimerRef.current !== null) {
      clearTimeout(focusTimerRef.current);
    }
    focusTimerRef.current = setTimeout(() => {
      focusTimerRef.current = null;
      const element =
        document.getElementsByName(fieldName)[0] ||
        document.querySelector(`[name="${fieldName}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof (element as HTMLElement).focus === 'function') {
          (element as HTMLElement).focus();
        }
      }
    }, 100);
  };

  const originalHandleSubmit = form.handleSubmit;

  const enhancedHandleSubmit: UseFormHandleSubmit<TFieldValues> = (onValid, onInvalid) => {
    const customOnInvalid: SubmitErrorHandler<TFieldValues> = (errors, event) => {
      console.error('Validation Errors:', errors);
      
      const errorKeys = Object.keys(errors);
      if (errorKeys.length > 0) {
        const firstErrorPath = errorKeys[0];
        const firstError = errors[firstErrorPath];
        const errorMessage = firstError
          && typeof firstError === 'object'
          && 'message' in firstError
          && typeof firstError.message === 'string'
          ? firstError.message
          : undefined;
        
        toast.error(errorMessage || '입력 항목을 확인해주세요.', {
          description: `항목: ${firstErrorPath}`,
        });

        focusFirstErrorField(firstErrorPath);
      }

      return onInvalid?.(errors, event);
    };

    return originalHandleSubmit(onValid, customOnInvalid);
  };

  // [W1-14] 서버 검증 오류를 폼 필드에 귀속시킨다.
  //   백엔드가 필드 정보를 내려주기 전까지는 이 연결 자체가 불가능했다(오류가 한 문장으로 뭉개져 있었다).
  //   저장소 전체에 react-hook-form 의 setError 호출부가 0건이라, 이것이 그 진입점이 된다.
  //
  //   사용 예: catch (e) { form.applyServerErrors(e) || toast.error(extractErrorMessage(e)) }
  //   반환값이 false 면 필드 오류가 아니므로 호출부가 일반 오류로 처리하면 된다.
  const applyServerErrors = (error: unknown): boolean => {
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
      focusFirstErrorField(firstField);
    }
    return true;
  };

  return {
    ...form,
    handleSubmit: enhancedHandleSubmit,
    applyServerErrors,
  };
}
