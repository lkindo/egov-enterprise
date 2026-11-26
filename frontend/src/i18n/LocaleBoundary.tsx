'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'use-intl';
import { I18nProvider } from './I18nProvider';
import type { AppMessages } from './catalog';
import { resolveLocale, type AppLocale } from './locales';
import { effectiveLocale, rememberRenderedLocale } from './surfaces';

interface BoundaryState {
  preferred: AppLocale;
  /** 한국어 카탈로그(고른 로케일이 한국어면 그 카탈로그). */
  koreanMessages: AppMessages;
  /** 이 화면을 경로와 무관하게 한국어 전용으로 선언한다. 돌려준 함수로 푼다. */
  claimKoreanOnly: () => () => void;
}

const BoundaryContext = createContext<BoundaryState | null>(null);

/**
 * 사용자가 고른 로케일. 번역을 마치지 않은 화면은 한국어 카탈로그로 그리므로 `useLocale()` 은 그 화면의 로케일(한국어)을 준다 — 언어
 * 선택기는 고른 값을 이것으로 읽는다. 경계 밖(단위 시험의 단독 렌더)에서는 공급자 로케일이다.
 */
export function usePreferredLocale(): AppLocale {
  const boundary = useContext(BoundaryContext);
  const provided = useLocale();
  return boundary?.preferred ?? resolveLocale(provided);
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
 *   <li>화면마다 실제로 그리는 로케일을 정하고 카탈로그 공급자를 그것으로 둔다 — 번역을 마치지 않은 경로와, 경로와 무관하게 한국어
 *       전용을 선언한 화면({@link KoreanOnlyScreen}, 예: 임시 비밀번호 변경 관문)은 한국어다.</li>
 *   <li>문서 언어(`html[lang]`)를 그 로케일로 맞춘다 — 본문 밖에 그려지는 대화상자·토스트(포털)도 같은 언어로 읽힌다.</li>
 *   <li>API 요청 언어가 읽을 수 있게 이 탭이 그린 로케일을 알린다 — 다른 탭이 쿠키를 바꿔도, 선택기가 쿠키를 쓰고 다시 그리기를 기다리는
 *       동안에도 요청 언어가 화면과 어긋나지 않는다.</li>
 *   <li>한국어로 그리는 화면이면 맨 위에 고른 언어로 한 줄 안내를 둔다.</li>
 * </ul>
 *
 * <p>로케일을 바꿔도 트리 모양이 같다(안내 자리는 비어 있을 뿐이고 공급자는 속성만 바뀐다) — 작성 중인 입력이 사라지지 않는다.
 */
export function LocaleBoundary({ preferred, messages, koreanMessages, children }: LocaleBoundaryProps) {
  const pathname = usePathname();
  const [claims, setClaims] = useState(0);
  const korean = koreanMessages ?? messages;
  const effective: AppLocale = claims > 0 ? 'ko' : koreanMessages ? effectiveLocale(preferred, pathname) : preferred;
  const koreanOnly = effective !== preferred;

  useLayoutEffect(() => {
    if (document.documentElement.lang !== effective) document.documentElement.lang = effective;
  }, [effective]);
  useLayoutEffect(() => rememberRenderedLocale(effective), [effective]);

  const claimKoreanOnly = useCallback(() => {
    setClaims((count) => count + 1);
    return () => setClaims((count) => count - 1);
  }, []);
  const state = useMemo<BoundaryState>(() => ({ preferred, koreanMessages: korean, claimKoreanOnly }), [claimKoreanOnly, korean, preferred]);

  return (
    <BoundaryContext.Provider value={state}>
      {koreanOnly && (
        <I18nProvider locale={preferred} messages={messages}>
          <KoreanOnlyNotice locale={preferred} />
        </I18nProvider>
      )}
      <I18nProvider locale={effective} messages={koreanOnly ? korean : messages}>
        {children}
      </I18nProvider>
    </BoundaryContext.Provider>
  );
}

/**
 * 경로와 무관하게 이 화면을 한국어 전용으로 그린다 — 번역 원장의 경로(예: `/login`) 위에 아직 번역하지 않은 화면이 통째로 대신 그려질 때
 * (임시 비밀번호 변경 관문) 쓴다. 안의 공용 부품은 처음부터 한국어 카탈로그로 그리고(서버 렌더 포함), 화면이 떠 있는 동안 경계가 문서
 * 언어·API 언어·안내를 한국어 화면으로 맞춘다. 그리는 쪽은 자기 최상위 요소에 `lang="ko"` 를 단다(문서 언어가 맞춰지기 전의 첫 화면).
 * 탭 제목은 경로의 메타데이터가 정한다(클라이언트가 덮어쓰면 Next 의 제목 갱신과 겨룬다) — 관문이 남는 /login 은 그 메타데이터가 관문
 * 제목을 낸다.
 */
export function KoreanOnlyScreen({ children }: { children: ReactNode }) {
  const boundary = useContext(BoundaryContext);
  const claim = boundary?.claimKoreanOnly;
  useLayoutEffect(() => claim?.(), [claim]);
  if (!boundary) return <>{children}</>;
  return <I18nProvider locale="ko" messages={boundary.koreanMessages}>{children}</I18nProvider>;
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
