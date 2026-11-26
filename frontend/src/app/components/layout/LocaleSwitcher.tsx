'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'use-intl';
import { cn } from '@/lib/utils';
import { LOCALES, resolveLocale, writeBrowserLocale, type AppLocale } from '@/i18n/locales';

/**
 * 보이는 로케일 선택기(ADR-0063 결정 3). 언어 이름은 그 언어로 적고(endonym) `lang` 을 단다 — 어느 로케일에서도 고를 언어를 알아본다.
 * 바꾸면 쿠키를 쓰고 서버 렌더를 다시 받는다(루트 레이아웃이 `html[lang]` 과 카탈로그를 바꾼다).
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations('locale');
  const current = resolveLocale(useLocale());
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (locale: AppLocale) => {
    if (locale === current || pending) return;
    writeBrowserLocale(locale);
    startTransition(() => router.refresh());
  };

  return (
    <div role="group" aria-label={t('label')} className={cn('inline-flex items-center gap-1 rounded-md border border-border p-0.5 text-xs', className)}>
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-pressed={locale === current}
          disabled={pending}
          onClick={() => choose(locale)}
          className={cn(
            'rounded px-2 py-1 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            locale === current ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {t(locale)}
        </button>
      ))}
    </div>
  );
}
