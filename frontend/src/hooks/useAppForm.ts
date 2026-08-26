'use client';

import { useEffect, useRef, type BaseSyntheticEvent } from 'react';
import {
  useForm,
  UseFormProps,
  FieldValues,
  UseFormReturn,
  SubmitErrorHandler,
  SubmitHandler,
  UseFormHandleSubmit,
  Resolver,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { extractFieldErrors } from '@/app/actions/actionUtils';
import { flattenFormErrors, type FlatFormError } from '@/lib/validation/form-errors';

export type FormErrorSource = 'client' | 'server';

export interface AppFormBehavior {
  /** 탭·아코디언·wizard step 등 숨겨진 field를 focus 전에 연다. */
  revealField?: (fieldName: string, source: FormErrorSource) => void | Promise<void>;
}

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
  /** field를 안전하게 노출·스크롤·focus한다. target이 없으면 summary로 fallback한다. */
  focusError: (fieldName: string, source?: FormErrorSource) => Promise<boolean>;
};

function isHTMLElement(value: unknown): value is HTMLElement {
  return typeof HTMLElement !== 'undefined' && value instanceof HTMLElement;
}

function isUnavailableTarget(element: HTMLElement): boolean {
  if (!element.isConnected) return true;
  if (element instanceof HTMLInputElement && element.type === 'hidden') return true;
  if ('disabled' in element && (element as HTMLInputElement).disabled) return true;
  if (element.closest('[hidden], [aria-hidden="true"], [inert]')) return true;

  const style = window.getComputedStyle(element);
  return style.display === 'none' || style.visibility === 'hidden';
}

function getNamedTargets(fieldName: string, scope?: HTMLFormElement | null): HTMLElement[] {
  const root: ParentNode = scope ?? document;
  const named = Array.from(root.querySelectorAll<HTMLElement>('[name]'))
    .filter((element) => element.getAttribute('name') === fieldName);
  const annotated = Array.from(root.querySelectorAll<HTMLElement>('[data-form-field-name]'))
    .filter((element) => element.dataset.formFieldName === fieldName);
  const explicit = Array.from(root.querySelectorAll<HTMLElement>('[data-error-focus]'))
    .filter((element) => element.dataset.errorFocus === fieldName);
  return [...new Set([...named, ...annotated, ...explicit])];
}

function getErrorTarget(
  fieldName: string,
  ref?: unknown,
  includeUnavailable = false,
  scope?: HTMLFormElement | null,
): HTMLElement | null {
  const candidates = [ref, ...getNamedTargets(fieldName, scope)]
    .filter(isHTMLElement)
    .filter((element) => !scope || scope.contains(element));
  return candidates.find(
    (element) => element.isConnected && (includeUnavailable || !isUnavailableTarget(element)),
  ) ?? null;
}

function sortErrorsByDomOrder(errors: FlatFormError[], scope?: HTMLFormElement | null): FlatFormError[] {
  return [...errors].sort((left, right) => {
    const leftTarget = getErrorTarget(left.name, left.ref, true, scope);
    const rightTarget = getErrorTarget(right.name, right.ref, true, scope);
    if (!leftTarget && !rightTarget) return 0;
    if (!leftTarget) return 1;
    if (!rightTarget) return -1;
    const position = leftTarget.compareDocumentPosition(rightTarget);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
}

function ownerFormFromEvent(event?: BaseSyntheticEvent): HTMLFormElement | null {
  const target = event?.currentTarget;
  if (!isHTMLElement(target)) return null;
  if (target instanceof HTMLFormElement) return target;
  return target.closest('form');
}

function scopedErrorSummary(scope?: HTMLFormElement | null): HTMLElement | null {
  if (scope) return scope.querySelector<HTMLElement>('[data-form-error-summary="true"]');
  const summaries = document.querySelectorAll<HTMLElement>('[data-form-error-summary="true"]');
  return summaries.length === 1 ? summaries[0] : null;
}

function waitForNextPaint(): Promise<void> {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    return Promise.resolve();
  }
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getDirectFieldErrors(error: unknown): Record<string, string> | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as {
    field?: unknown;
    fieldErrors?: unknown;
    message?: unknown;
  };
  if (candidate.fieldErrors && typeof candidate.fieldErrors === 'object' && !Array.isArray(candidate.fieldErrors)) {
    const entries = Object.entries(candidate.fieldErrors)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0);
    if (entries.length > 0) return Object.fromEntries(entries);
  }
  return typeof candidate.field === 'string' && typeof candidate.message === 'string'
    ? { [candidate.field]: candidate.message }
    : undefined;
}

function getErrorAnnouncement(entries: FlatFormError[]): string {
  const details = entries
    .map((entry, index) => `${index + 1}. ${entry.name}: ${entry.message ?? '입력값을 확인해 주세요.'}`)
    .join(' ');
  return `입력 오류 ${entries.length}개. ${details}`;
}

/**
 * 프로젝트 표준 폼 핸들링 훅
 * - Zod 리졸버 자동 적용
 * - 검증 실패 시 첫 번째 에러 필드로 포커스 및 접근성 live 알림
 * - 서버 필드 오류 귀속(`applyServerErrors`)
 */
export function useAppForm<
  TSchema extends z.ZodType<unknown, FieldValues>,
  TFieldValues extends FieldValues = z.infer<TSchema> & FieldValues,
>(
  schema: TSchema,
  props?: Omit<UseFormProps<TFieldValues, unknown>, 'resolver'>,
  behavior?: AppFormBehavior,
): AppFormReturn<TFieldValues> {
  const form = useForm<TFieldValues, unknown>({
    ...props,
    // 오류 이동은 아래 공통 navigator가 단독 소유한다. 호출부가 명시적으로 true를 주면 RHF 기본 동작도 허용한다.
    shouldFocusError: props?.shouldFocusError ?? false,
    // resolver 패키지는 구체 Zod 스키마의 입출력을 이 제네릭 경계에서 보존하지 못한다.
    // 소비 폼의 TFieldValues 로 한 번만 좁히고, 이후 register/submit 표면은 강타입으로 유지한다.
    resolver: zodResolver(schema) as Resolver<TFieldValues, unknown>,
  });

  const mountedRef = useRef(true);
  const submitInFlightRef = useRef(false);
  const ownerFormRef = useRef<HTMLFormElement | null>(null);
  const navigationIdRef = useRef(0);
  const announcerRef = useRef<HTMLDivElement | null>(null);
  const announcementFrameRef = useRef<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    const announcer = document.createElement('div');
    announcer.className = 'sr-only';
    announcer.dataset.formErrorAnnouncer = 'true';
    announcer.setAttribute('role', 'alert');
    announcer.setAttribute('aria-live', 'assertive');
    announcer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(announcer);
    announcerRef.current = announcer;

    return () => {
      mountedRef.current = false;
      navigationIdRef.current += 1;
      if (announcementFrameRef.current !== null) {
        window.cancelAnimationFrame?.(announcementFrameRef.current);
        announcementFrameRef.current = null;
      }
      announcer.remove();
      if (announcerRef.current === announcer) announcerRef.current = null;
    };
  }, []);

  const clearAnnouncement = () => {
    if (announcementFrameRef.current !== null) {
      window.cancelAnimationFrame?.(announcementFrameRef.current);
      announcementFrameRef.current = null;
    }
    if (announcerRef.current) announcerRef.current.textContent = '';
  };

  const announceErrors = (entries: FlatFormError[]) => {
    clearAnnouncement();
    if (entries.length === 0) return;

    const announce = () => {
      announcementFrameRef.current = null;
      if (!mountedRef.current || !announcerRef.current) return;

      // 같은 form에 시각적 FormErrorSummary가 있으면 그 live region이 단독 발화한다.
      const firstTarget = entries
        .map((entry) => getErrorTarget(entry.name, entry.ref, true, ownerFormRef.current))
        .find((target): target is HTMLElement => target !== null);
      const ownerForm = ownerFormRef.current ?? firstTarget?.closest('form');
      if (ownerForm) ownerFormRef.current = ownerForm;
      const visualSummary = scopedErrorSummary(ownerForm);
      if (!visualSummary) announcerRef.current.textContent = getErrorAnnouncement(entries);
    };

    if (typeof window.requestAnimationFrame === 'function') {
      announcementFrameRef.current = window.requestAnimationFrame(announce);
    } else {
      announce();
    }
  };

  const focusErrorEntry = async (
    entry: FlatFormError,
    source: FormErrorSource = 'client',
  ): Promise<boolean> => {
    const navigationId = ++navigationIdRef.current;
    try {
      await behavior?.revealField?.(entry.name, source);
      await waitForNextPaint();
      if (!mountedRef.current || navigationId !== navigationIdRef.current) return false;

      const element = getErrorTarget(entry.name, entry.ref, false, ownerFormRef.current);
      if (element) {
        element.scrollIntoView?.({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'center',
        });
        element.focus({ preventScroll: true });
        return true;
      }

      const summary = scopedErrorSummary(ownerFormRef.current);
      if (summary && !isUnavailableTarget(summary)) {
        summary.focus({ preventScroll: true });
      }
      return false;
    } catch {
      // validation 안내 자체가 폼을 죽여서는 안 된다. 가능한 경우 summary로 복구한다.
      const summary = scopedErrorSummary(ownerFormRef.current);
      try {
        summary?.focus({ preventScroll: true });
      } catch {
        // summary까지 사라진 unmount race도 사용자 작업을 예외로 중단시키지 않는다.
      }
      return false;
    }
  };

  const focusError = (fieldName: string, source: FormErrorSource = 'client') =>
    focusErrorEntry({ name: fieldName }, source);

  const focusFirstError = (entries: FlatFormError[], source: FormErrorSource) => {
    const fieldErrors = entries.filter(
      (entry) => entry.name !== 'root' && !entry.name.startsWith('root.'),
    );
    // root-only 오류도 summary 발화 지점으로 이동해야 한다.
    const first = sortErrorsByDomOrder(fieldErrors, ownerFormRef.current)[0] ?? entries[0];
    return first ? focusErrorEntry(first, source) : Promise.resolve(false);
  };

  const originalHandleSubmit = form.handleSubmit;

  const enhancedHandleSubmit: UseFormHandleSubmit<TFieldValues> = <TResult>(
    onValid: SubmitHandler<TFieldValues, TResult>,
    onInvalid?: SubmitErrorHandler<TFieldValues>,
  ) => {
    const customOnInvalid: SubmitErrorHandler<TFieldValues> = (errors, event) => {
      const errorEntries = flattenFormErrors(errors);
      ownerFormRef.current = ownerFormFromEvent(event)
        ?? errorEntries
          .map((entry) => getErrorTarget(entry.name, entry.ref, true)?.closest('form'))
          .find((owner): owner is HTMLFormElement => owner instanceof HTMLFormElement)
        ?? ownerFormRef.current;
      if (errorEntries.length > 0) {
        announceErrors(errorEntries);
        void focusFirstError(errorEntries, 'client');
      }

      return onInvalid?.(errors, event);
    };

    const submit = originalHandleSubmit((values, event) => {
      clearAnnouncement();
      return onValid(values, event);
    }, customOnInvalid) as (event?: BaseSyntheticEvent) => Promise<Awaited<TResult> | undefined>;

    return (event) => {
      // formState.isSubmitting은 React 렌더 뒤 갱신되므로 같은 tick의 두 번째
      // submit을 막지 못한다. 검증 시작 전에 ref를 선점해 write 경계를 직렬화한다.
      if (submitInFlightRef.current) {
        // React onSubmit 반환값은 브라우저의 기본 submit을 취소하지 않는다.
        // 잠금에 걸린 같은 tick의 native submit도 페이지 이동 없이 소비해야 한다.
        event?.preventDefault?.();
        return Promise.resolve(undefined as Awaited<TResult> | undefined);
      }
      ownerFormRef.current = ownerFormFromEvent(event) ?? ownerFormRef.current;
      submitInFlightRef.current = true;
      return submit(event).finally(() => {
        submitInFlightRef.current = false;
      });
    };
  };

  // [W1-14] 서버 검증 오류를 폼 필드에 귀속시킨다.
  //   백엔드가 필드 정보를 내려주기 전까지는 이 연결 자체가 불가능했다(오류가 한 문장으로 뭉개져 있었다).
  //   저장소 전체에 react-hook-form 의 setError 호출부가 0건이라, 이것이 그 진입점이 된다.
  //
  //   사용 예: catch (e) { if (!form.applyServerErrors(e)) showGeneralError(); }
  //   반환값이 false 면 필드 오류가 아니므로 호출부가 일반 오류로 처리하면 된다.
  const applyServerErrors = (error: unknown): boolean => {
    const fieldErrors = extractFieldErrors(error) ?? getDirectFieldErrors(error);
    if (!fieldErrors) {
      return false;
    }

    const entries = Object.entries(fieldErrors);
    for (const [field, message] of entries) {
      // type:'server' 로 표시해 클라이언트 재검증 시 자동으로 걷히게 한다.
      form.setError(field as never, { type: 'server', message });
    }

    // 첫 오류 필드로 포커스를 옮긴다 — 위 검증 실패 경로와 같은 거동을 유지한다.
    const errorEntries = entries.map(([name, message]) => ({ name, message }));
    announceErrors(errorEntries);
    void focusFirstError(errorEntries, 'server');
    return true;
  };

  return {
    ...form,
    handleSubmit: enhancedHandleSubmit,
    applyServerErrors,
    focusError,
  };
}
