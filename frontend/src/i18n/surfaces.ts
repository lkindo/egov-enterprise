/**
 * 번역을 마친 화면의 원장(ADR-0063 결정 4).
 *
 * <p>여기에 적힌 화면만 영어 로케일에서 영어로 그린다. 그 밖의 화면은 영어 로케일에서도 한국어로 그리고 영역에 `lang="ko"` 와
 * "한국어로만 제공" 안내를 둔다 — 한 화면 안에서 언어가 섞이지 않게 한다. `files` 는 그 화면의 고정 문구를 가진 파일이다.
 * 완결성 계약(src/__tests__/i18n-catalog-contract.test.ts)이 그 파일의 주석·시험 밖 문자열에 한글이 남지 않았는지 본다.
 */
export interface TranslatedSurface {
  id: string;
  /** 정확히 같거나 그 아래 경로가 이 화면이다. */
  routes: readonly string[];
  files: readonly string[];
}

export const TRANSLATED_SURFACES: readonly TranslatedSurface[] = [
  {
    id: 'login',
    routes: ['/login'],
    files: [
      'src/app/login/LoginClient.tsx',
      'src/app/login/login-form-validation.ts',
      'src/components/account/MfaChallengePanel.tsx',
      'src/components/ui/form.tsx',
      'src/hooks/useManualFormValidation.tsx',
      'src/app/components/layout/ApplicationFrame.tsx',
      'src/app/components/layout/LocaleSwitcher.tsx',
    ],
  },
];

/** 이 경로가 번역을 마친 화면인가. */
export function isTranslatedRoute(pathname: string | null | undefined): boolean {
  const path = (pathname ?? '').replace(/\/+$/, '') || '/';
  return TRANSLATED_SURFACES.some((surface) => surface.routes.some((route) => path === route || path.startsWith(`${route}/`)));
}
