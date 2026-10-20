/**
 * 백엔드로 넘길 이중 제출 CSRF 헤더 — CredentialCookieCsrfPolicy.
 *
 * <p>재발급·로그아웃 BFF 는 브라우저 쿠키(refreshToken 등)를 그대로 백엔드로 넘긴다. 백엔드는 쿠키 자격을 실은 쓰기
 * 요청에서 XSRF-TOKEN 쿠키와 X-XSRF-TOKEN 헤더가 같은지 보므로, 브라우저가 보낸 헤더도 그대로 넘겨야 한다.
 * 쿠키는 Cookie 헤더로 함께 간다. 헤더가 없으면 아무것도 넘기지 않아 백엔드가 거부한다(fail-closed).
 */

type HeaderSource = { get(name: string): string | null };

export const CSRF_TOKEN_HEADER = 'X-XSRF-TOKEN';

export function forwardedCsrfTokenHeader(incoming: HeaderSource): Record<string, string> {
  const token = incoming.get(CSRF_TOKEN_HEADER);
  return token ? { [CSRF_TOKEN_HEADER]: token } : {};
}
