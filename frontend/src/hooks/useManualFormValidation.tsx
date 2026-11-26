'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { useLocale, useTranslations } from 'use-intl';
import { catalogKeyOf, type CatalogKey } from '@/i18n/catalog';
import { contentLang } from '@/i18n/content-lang';

export type ManualFormErrors = Record<string, string>;

type FocusTarget = string | (() => HTMLElement | null);

type ManualFormValidationOptions = {
  focusTargets?: Record<string, FocusTarget>;
  labels?: Record<string, string>;
  /** 같은 name을 쓰는 폼이 한 화면에 여러 개일 때 탐색 범위를 고정한다. */
  form?: () => HTMLFormElement | null;
};

type ValidationTranslate = ReturnType<typeof useTranslations<'validation'>>;
type RootTranslate = ReturnType<typeof useTranslations<never>>;

/**
 * 필드 오류의 원인 — 문장이 아니라 원인을 저장하고 그릴 때 그 순간의 로케일로 바꾼다(ADR-0063). 로케일을 바꾸면 이미 보이는 오류도 새
 * 언어로 다시 그려진다.
 */
type ErrorSource =
  | { readonly issue: z.core.$ZodIssue }
  | { readonly text: string }
  | { readonly root: true };
type ErrorSources = Record<string, ErrorSource>;

const NO_ERROR_SOURCES: ErrorSources = Object.freeze({}) as ErrorSources;

/** 카탈로그 키 표지(`$t:네임스페이스.키`)를 지금 로케일 문장으로 바꾼다. 카탈로그에 없는 키는 없다(쓰는 쪽이 일반 안내로 대신한다). */
function translateCatalogKey(message: string, tRoot: RootTranslate): string | undefined {
  const key = catalogKeyOf(message) as CatalogKey | undefined;
  if (key === undefined || !tRoot.has(key)) return undefined;
  return tRoot(key);
}

/**
 * 검증 문구. [2026-11-26 ADR-0063] 스키마가 카탈로그 키를 적었으면 지금 로케일로 바꾼다. 한국어 문장(아직 번역하지 않은 화면의 스키마나
 * 전역 오류 맵)은 한국어로 그리는 화면에서만 그대로 쓴다 — 영어로 그리는 화면에서는 그 밖(zod 기본 영문)처럼 항목 이름과 함께 지금
 * 로케일의 일반 안내로 바꾼다.
 */
function issueMessage(issue: z.core.$ZodIssue, label: string, locale: string, t: ValidationTranslate, tRoot: RootTranslate) {
  if (catalogKeyOf(issue.message) !== undefined) return translateCatalogKey(issue.message, tRoot) ?? t('invalid', { label });
  if (locale === 'ko' && contentLang(issue.message)) return issue.message;
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

/** 화면이 직접 준 오류 문구. 카탈로그 키 표지면 지금 로케일로 바꾸고, 그 밖(아직 번역하지 않은 화면의 문장·서버 사유)은 그대로다. */
function textMessage(text: string, t: ValidationTranslate, tRoot: RootTranslate) {
  if (catalogKeyOf(text) === undefined) return text;
  return translateCatalogKey(text, tRoot) ?? t('formRoot');
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
  const [sources, setSources] = useState<ErrorSources>(NO_ERROR_SOURCES);
  const t = useTranslations('validation');
  const tRoot = useTranslations();
  const locale = useLocale();
  const generatedNamespace = `manual-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  // 기존 Standard FormField는 <name>-error ID를 소유한다. 명시적 form scope를
  // 쓰는 다중 폼만 인스턴스 namespace를 적용해 기존 소비자 연결을 보존한다.
  const errorNamespace = options.form ? generatedNamespace : '';
  const scheduledRef = useRef<number | null>(null);
  const focusTargetsRef = useRef(options.focusTargets);
  const formGetterRef = useRef(options.form);
  const ownerFormRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    focusTargetsRef.current = options.focusTargets;
    formGetterRef.current = options.form;
  }, [options.focusTargets, options.form]);

  // 항목 이름은 값으로 비교한다 — 쓰는 쪽이 렌더마다 새 객체를 넘겨도 오류 객체가 렌더마다 바뀌지 않는다.
  const labelsKey = options.labels ? JSON.stringify(options.labels) : '';
  const errors = useMemo<ManualFormErrors>(() => {
    const labels = (labelsKey ? JSON.parse(labelsKey) : {}) as Record<string, string>;
    const resolved: ManualFormErrors = {};
    for (const [name, source] of Object.entries(sources)) {
      if ('issue' in source) resolved[name] = issueMessage(source.issue, labels[name] ?? name, locale, t, tRoot);
      else if ('text' in source) resolved[name] = textMessage(source.text, t, tRoot);
      else resolved[name] = t('formRoot');
    }
    return resolved;
  }, [labelsKey, locale, sources, t, tRoot]);

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

  const focusFirst = useCallback((nextErrors: Readonly<Record<string, unknown>>) => {
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
      setSources(NO_ERROR_SOURCES);
      return result.data;
    }

    const nextSources: ErrorSources = {};
    for (const issue of result.error.issues) {
      const name = issue.path.map(String).join('.');
      if (name && nextSources[name] === undefined) nextSources[name] = { issue };
    }
    if (Object.keys(nextSources).length === 0) {
      nextSources.root = { root: true };
    }
    setSources(nextSources);
    focusFirst(nextSources);
    return null;
  }, [focusFirst, schema]);

  const clearError = useCallback((name: string) => {
    setSources((current) => {
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
    // 값이 없는 항목은 오류가 아니다(종전처럼 `errors[name] !== undefined` 로 판정하던 의미를 지킨다).
    const entries = Object.entries(nextErrors).filter((entry): entry is [string, string] => typeof entry[1] === 'string');
    setSources(entries.length === 0 ? NO_ERROR_SOURCES : Object.fromEntries(entries.map(([name, text]) => [name, { text }])));
    if (focus && entries.length > 0) focusFirst(Object.fromEntries(entries));
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
