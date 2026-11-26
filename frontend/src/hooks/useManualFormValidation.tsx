'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { z } from 'zod';
import { useTranslations } from 'use-intl';
import { catalogKeyOf } from '@/i18n/messages';

export type ManualFormErrors = Record<string, string>;

type FocusTarget = string | (() => HTMLElement | null);

type ManualFormValidationOptions = {
  focusTargets?: Record<string, FocusTarget>;
  labels?: Record<string, string>;
  /** 같은 name을 쓰는 폼이 한 화면에 여러 개일 때 탐색 범위를 고정한다. */
  form?: () => HTMLFormElement | null;
};

type Translate = ReturnType<typeof useTranslations>;

/**
 * 검증 문구. [2026-11-26 ADR-0063] 스키마가 카탈로그 키(`$t:네임스페이스.키`)를 적었으면 현재 로케일로 바꾸고, 한국어 문장을 적었으면
 * (아직 번역하지 않은 화면) 그대로 쓴다. 그 밖(zod 기본 영문)은 항목 이름과 함께 현재 로케일의 일반 안내로 바꾼다.
 */
function issueMessage(issue: z.core.$ZodIssue, label: string, t: Translate, tRoot: Translate) {
  const key = catalogKeyOf(issue.message);
  if (key) return tRoot(key);
  if (/[가-힣]/.test(issue.message)) return issue.message;
  if (issue.code === 'too_big' && issue.origin === 'string') {
    return t('tooLong', { label, maximum: String(issue.maximum) });
  }
  if (issue.code === 'too_small' && issue.origin === 'string') {
    return t('tooShort', { label, minimum: String(issue.minimum) });
  }
  if (issue.code === 'invalid_format') return t('invalidFormat', { label });
  if (issue.code === 'invalid_type') return t('invalidType', { label });
  return t('invalid', { label });
}

function errorId(namespace: string, name: string) {
  const fieldId = `${name.replace(/[^A-Za-z0-9_-]/g, '-')}-error`;
  return namespace ? `${namespace}-${fieldId}` : fieldId;
}

function isUsableTarget(element: HTMLElement | null): element is HTMLElement {
  if (!element || !element.isConnected) return false;
  if (element.matches(':disabled,[hidden],[aria-hidden="true"]')) return false;
  if (element.closest('[hidden],[inert],[aria-hidden="true"]')) return false;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function targetFor(
  name: string,
  configured?: FocusTarget,
  scope?: HTMLFormElement | null,
): HTMLElement | null {
  if (typeof configured === 'function') return configured();
  const lookup = configured ?? name;
  const root: ParentNode = scope ?? document;
  const named = root.querySelectorAll<HTMLElement>('[name]');
  for (const candidate of named) {
    if (candidate.getAttribute('name') === lookup && isUsableTarget(candidate)) return candidate;
  }
  const byId = scope
    ? Array.from(scope.querySelectorAll<HTMLElement>('[id]'))
      .find((candidate) => candidate.id === lookup) ?? null
    : document.getElementById(lookup);
  return byId instanceof HTMLElement && isUsableTarget(byId) ? byId : null;
}

function activeOwnerForm(): HTMLFormElement | null {
  const active = document.activeElement;
  return active instanceof HTMLElement ? active.closest('form') : null;
}

function configuredOwnerForm(getForm?: () => HTMLFormElement | null): HTMLFormElement | null {
  try {
    return getForm?.() ?? null;
  } catch {
    return null;
  }
}

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function schedule(callback: () => void) {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(callback);
  return window.setTimeout(callback, 0);
}

function cancelScheduled(handle: number) {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(handle);
  else window.clearTimeout(handle);
}

/**
 * RHF 도입이 과도한 작은 버튼 기반 입력 화면용 검증 어댑터.
 * Zod 오류를 필드에 연결하고 첫 오류로 이동하며, 검증 실패를 예외로 던지지 않는다.
 */
export function useManualFormValidation<TSchema extends z.ZodType>(
  schema: TSchema,
  options: ManualFormValidationOptions = {},
) {
  const [errors, setErrors] = useState<ManualFormErrors>({});
  const t = useTranslations('validation');
  const tRoot = useTranslations();
  const generatedNamespace = `manual-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  // 기존 Standard FormField는 <name>-error ID를 소유한다. 명시적 form scope를
  // 쓰는 다중 폼만 인스턴스 namespace를 적용해 기존 소비자 연결을 보존한다.
  const errorNamespace = options.form ? generatedNamespace : '';
  const scheduledRef = useRef<number | null>(null);
  const focusTargetsRef = useRef(options.focusTargets);
  const labelsRef = useRef(options.labels);
  const formGetterRef = useRef(options.form);
  const ownerFormRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    focusTargetsRef.current = options.focusTargets;
    labelsRef.current = options.labels;
    formGetterRef.current = options.form;
  }, [options.focusTargets, options.form, options.labels]);

  useEffect(() => () => {
    if (scheduledRef.current !== null) cancelScheduled(scheduledRef.current);
  }, []);

  const focusError = useCallback((name: string): boolean => {
    try {
      const scope = ownerFormRef.current ?? configuredOwnerForm(formGetterRef.current);
      const element = targetFor(name, focusTargetsRef.current?.[name], scope);
      if (!element) {
        const summaries = scope
          ? scope.querySelectorAll<HTMLElement>('[data-form-error-summary="true"]')
          : document.querySelectorAll<HTMLElement>('[data-form-error-summary="true"]');
        const summary = summaries.length === 1 ? summaries[0] : null;
        summary?.focus({ preventScroll: true });
        return false;
      }
      element.focus({ preventScroll: true });
      element.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'center',
        inline: 'nearest',
      });
      return document.activeElement === element;
    } catch {
      return false;
    }
  }, []);

  const focusFirst = useCallback((nextErrors: ManualFormErrors) => {
    if (scheduledRef.current !== null) cancelScheduled(scheduledRef.current);
    scheduledRef.current = schedule(() => {
      scheduledRef.current = null;
      const candidates = Object.keys(nextErrors)
        .map((name) => ({
          name,
          target: targetFor(
            name,
            focusTargetsRef.current?.[name],
            ownerFormRef.current ?? configuredOwnerForm(formGetterRef.current),
          ),
        }))
        .sort((left, right) => {
          if (!left.target) return 1;
          if (!right.target) return -1;
          const position = left.target.compareDocumentPosition(right.target);
          return position & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1;
        });
      const first = candidates[0]?.name;
      if (first) focusError(first);
    });
  }, [focusError]);

  const validate = useCallback((values: z.input<TSchema>): z.output<TSchema> | null => {
    ownerFormRef.current = configuredOwnerForm(formGetterRef.current)
      ?? activeOwnerForm()
      ?? ownerFormRef.current;
    const result = schema.safeParse(values);
    if (result.success) {
      setErrors({});
      return result.data;
    }

    const nextErrors: ManualFormErrors = {};
    for (const issue of result.error.issues) {
      const name = issue.path.map(String).join('.');
      if (name && nextErrors[name] === undefined) {
        nextErrors[name] = issueMessage(issue, labelsRef.current?.[name] ?? name, t, tRoot);
      }
    }
    if (Object.keys(nextErrors).length === 0) {
      nextErrors.root = t('formRoot');
    }
    setErrors(nextErrors);
    focusFirst(nextErrors);
    return null;
  }, [focusFirst, schema, t, tRoot]);

  const clearError = useCallback((name: string) => {
    setErrors((current) => {
      if (!(name in current)) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }, []);

  const setFormErrors = useCallback((nextErrors: ManualFormErrors, focus = true) => {
    ownerFormRef.current = configuredOwnerForm(formGetterRef.current)
      ?? activeOwnerForm()
      ?? ownerFormRef.current;
    setErrors(nextErrors);
    if (focus && Object.keys(nextErrors).length > 0) focusFirst(nextErrors);
  }, [focusFirst]);

  const fieldProps = useCallback((name: string) => {
    const invalid = errors[name] !== undefined;
    return {
      name,
      'aria-invalid': invalid || undefined,
      'aria-describedby': invalid ? errorId(errorNamespace, name) : undefined,
      'aria-errormessage': invalid ? errorId(errorNamespace, name) : undefined,
    } as const;
  }, [errorNamespace, errors]);

  const messageProps = useCallback((name: string) => ({
    id: errorId(errorNamespace, name),
    children: errors[name],
  }), [errorNamespace, errors]);

  return {
    errors,
    validate,
    clearError,
    setFormErrors,
    fieldProps,
    messageProps,
    focusError,
  };
}
