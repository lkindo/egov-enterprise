'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'use-intl';
import { cn } from '@/lib/utils';
import { LOCALES, writeBrowserLocale, type AppLocale } from '@/i18n/locales';
import { usePreferredLocale } from '@/i18n/LocaleBoundary';

/**
 * 보이는 로케일 선택기(ADR-0063 결정 3). 언어 이름은 그 언어로 적고(endonym) `lang` 을 단다 — 어느 로케일에서도 고를 언어를 알아본다.
 * 바꾸면 쿠키를 쓰고 서버 렌더를 다시 받는다(루트 레이아웃이 `html[lang]` 과 카탈로그를 바꾼다). 눌린 단추는 사용자가 고른 로케일이다 —
 * 번역을 마치지 않은 화면(한국어로 그린다)에서도 영어가 눌려 있고, 한국어를 누르면 한국어로 돌아간다.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations('locale');
  const current = usePreferredLocale();
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
