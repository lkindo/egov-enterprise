import { DEFAULT_LOCALE, readBrowserLocale, type AppLocale } from './locales';

/**
 * 번역을 마친 화면의 원장(ADR-0063 결정 4).
 *
 * <p>여기에 적힌 화면만 영어 로케일에서 영어로 그린다. 그 밖의 화면은 영어 로케일에서도 한국어로 그리고 문서 언어(`html[lang]`)를
 * 한국어로 두며 "한국어로만 제공" 안내를 둔다 — 한 화면 안에서 언어가 섞이지 않게 한다. `files` 는 그 화면이 그리는 고정 문구를 가진
 * 파일이다. 완결성 계약(src/__tests__/i18n-catalog-contract.test.ts)이 그 파일의 주석 밖 문자열에 한글이 남지 않았는지, 그 파일이
 * 가져오는 다른 모듈의 한글 문구가 화면에 닿지 않는지 본다.
 */
export interface TranslatedSurface {
  id: string;
  /** 정확히 같은 경로만 이 화면이다 — 아래 경로는 따로 번역을 마치고 적을 때까지 한국어 화면이다. */
  routes: readonly string[];
  files: readonly string[];
}

export const TRANSLATED_SURFACES: readonly TranslatedSurface[] = [
  {
    id: 'login',
    routes: ['/login'],
    files: [
      'src/app/login/page.tsx',
      'src/app/login/LoginClient.tsx',
      'src/app/login/login-form-validation.ts',
      'src/components/account/MfaChallengePanel.tsx',
      'src/components/ui/form.tsx',
      'src/hooks/useManualFormValidation.tsx',
      'src/app/loading.tsx',
      'src/app/components/layout/ApplicationFrame.tsx',
      'src/app/components/layout/ShellText.tsx',
      'src/app/components/layout/LocaleSwitcher.tsx',
      'src/app/components/layout/footer.tsx',
      'src/i18n/LocaleBoundary.tsx',
    ],
  },
];

/** proxy 가 문서 요청마다 다시 싣는 요청 경로 헤더 — 레이아웃은 경로를 받지 못해 이 값으로 그 화면의 로케일을 정한다. */
export const REQUEST_PATHNAME_HEADER = 'x-app-pathname';

function normalizedPath(pathname: string | null | undefined): string {
  return (pathname ?? '').replace(/\/+$/, '') || '/';
}

/** 이 경로가 번역을 마친 화면인가. 경로를 모르면 아니다. */
export function isTranslatedRoute(pathname: string | null | undefined): boolean {
  const path = normalizedPath(pathname);
  return TRANSLATED_SURFACES.some((surface) => surface.routes.includes(path));
}

/**
 * 이 경로에서 실제로 그리는 로케일 — 사용자가 고른 로케일이 한국어가 아니면 번역을 마친 화면에서만 그것을 쓰고, 그 밖(경로를 모를 때
 * 포함)은 한국어다. 문서 언어·화면 카탈로그·API 의 Accept-Language 가 모두 이 값을 따른다.
 */
export function effectiveLocale(preferred: AppLocale, pathname: string | null | undefined): AppLocale {
  return preferred !== DEFAULT_LOCALE && isTranslatedRoute(pathname) ? preferred : DEFAULT_LOCALE;
}

/**
 * 이 탭이 지금 그린 로케일 — 로케일 경계가 그릴 때마다 알린다. 쿠키는 탭끼리 함께 쓰므로 다른 탭이 바꿀 수 있고, 선택기는 쿠키를 먼저
 * 쓰고 다시 그리기를 기다린다. 주소도 화면보다 먼저 바뀔 수 있다(뒤로 가기). 요청 언어는 쿠키·주소가 아니라 이 값을 본다(경계가 아직
 * 그리지 않았으면 쿠키와 주소로 정한다).
 */
let renderedLocale: { readonly effective: AppLocale } | undefined;

export function rememberRenderedLocale(effective: AppLocale): () => void {
  const rendered = { effective };
  renderedLocale = rendered;
  return () => {
    if (renderedLocale === rendered) renderedLocale = undefined;
  };
}

/** 브라우저에서 지금 화면의 로케일(서버에서는 기본값) — API 요청의 Accept-Language 다. */
export function effectiveBrowserLocale(): AppLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  return renderedLocale?.effective ?? effectiveLocale(readBrowserLocale(), window.location.pathname);
}
