// Allow the BFF time to return its safe error contract and cookie cleanup before
// the browser gives up. The upstream signal also bounds a trickling response.
export const AUTH_BROWSER_REQUEST_TIMEOUT_MS = 20_000;
const AUTH_UPSTREAM_REQUEST_TIMEOUT_MS = 15_000;

export function authUpstreamRequestConfig(request?: Pick<Request, 'signal'>) {
  const deadline = AbortSignal.timeout(AUTH_UPSTREAM_REQUEST_TIMEOUT_MS);
  return {
    timeout: AUTH_UPSTREAM_REQUEST_TIMEOUT_MS,
    signal: request ? AbortSignal.any([request.signal, deadline]) : deadline,
  };
}

/**
 * [2026-11-26 ADR-0063] 인증·추가 인증 BFF 가 백엔드로 넘기는 언어. 브라우저 서비스(authService·mfaService)는 지금 화면의 로케일을
 * `Accept-Language` 에 정확히 싣는다(`ko`·`en`). 그 밖의 값(브라우저 기본 `ko-KR,ko;q=0.9` 등)이나 없는 값은 한국어다 — 번역을 마치지
 * 않은 화면에서 부른 요청이 영어 문구를 받지 않는다.
 */
export function forwardedLanguageHeaders(headers: Pick<Headers, 'get'>): { 'Accept-Language': 'ko' | 'en' } {
  return { 'Accept-Language': headers.get('accept-language')?.trim() === 'en' ? 'en' : 'ko' };
}
