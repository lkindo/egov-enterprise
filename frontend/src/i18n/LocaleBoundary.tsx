'use client';

import { createContext, useContext, useLayoutEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'use-intl';
import { I18nProvider } from './I18nProvider';
import type { AppMessages } from './catalog';
import { resolveLocale, type AppLocale } from './locales';
import { effectiveLocale } from './surfaces';

const PreferredLocaleContext = createContext<AppLocale | null>(null);

/**
 * 사용자가 고른 로케일. 번역을 마치지 않은 화면은 한국어 카탈로그로 그리므로 `useLocale()` 은 그 화면의 로케일(한국어)을 준다 — 언어
 * 선택기는 고른 값을 이것으로 읽는다. 경계 밖(단위 시험의 단독 렌더)에서는 공급자 로케일이다.
 */
export function usePreferredLocale(): AppLocale {
  const preferred = useContext(PreferredLocaleContext);
  const provided = useLocale();
  return preferred ?? resolveLocale(provided);
}

interface LocaleBoundaryProps {
  /** 사용자가 고른 로케일(쿠키). */
  preferred: AppLocale;
  /** 고른 로케일의 카탈로그. */
  messages: AppMessages;
  /** 한국어 카탈로그 — 고른 로케일이 한국어가 아닐 때만 받는다(번역을 마치지 않은 화면에서 쓴다). */
  koreanMessages?: AppMessages;
  children: ReactNode;
}

/**
 * 화면 로케일 경계(ADR-0063 결정 4). 루트 레이아웃이 앱 전체를 한 번 감싼다.
 *
 * <ul>
 *   <li>화면(경로)마다 실제로 그리는 로케일을 정하고 카탈로그 공급자를 그것으로 둔다 — 번역을 마치지 않은 화면은 한국어다.</li>
 *   <li>문서 언어(`html[lang]`)를 그 로케일로 맞춘다 — 본문 밖에 그려지는 대화상자·토스트(포털)도 같은 언어로 읽힌다.</li>
 *   <li>번역을 마치지 않은 화면이면 맨 위에 고른 언어로 한 줄 안내를 둔다.</li>
 * </ul>
 *
 * <p>로케일을 바꿔도 트리 모양이 같다(안내 자리는 비어 있을 뿐이고 공급자는 속성만 바뀐다) — 작성 중인 입력이 사라지지 않는다.
 */
export function LocaleBoundary({ preferred, messages, koreanMessages, children }: LocaleBoundaryProps) {
  const pathname = usePathname();
  const effective = koreanMessages ? effectiveLocale(preferred, pathname) : preferred;
  const koreanOnly = effective !== preferred;

  useLayoutEffect(() => {
    if (document.documentElement.lang !== effective) document.documentElement.lang = effective;
  }, [effective]);

  return (
    <PreferredLocaleContext.Provider value={preferred}>
      {koreanOnly && (
        <I18nProvider locale={preferred} messages={messages}>
          <KoreanOnlyNotice locale={preferred} />
        </I18nProvider>
      )}
      <I18nProvider locale={effective} messages={koreanOnly && koreanMessages ? koreanMessages : messages}>
        {children}
      </I18nProvider>
    </PreferredLocaleContext.Provider>
  );
}

/** 고른 언어로 쓴 한 줄 안내. 고른 로케일의 공급자 안에서 그린다. */
function KoreanOnlyNotice({ locale }: { locale: AppLocale }) {
  const t = useTranslations('locale');
  return (
    <aside lang={locale} aria-label={t('noticeLabel')} data-testid="korean-only-notice"
      className="bg-muted px-4 py-1.5 text-center text-xs text-muted-foreground">
      <p>{t('koreanOnlyNotice')}</p>
    </aside>
  );
}
