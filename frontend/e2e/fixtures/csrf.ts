import fs from 'node:fs';
import path from 'node:path';

/**
 * E2E 의 이중 제출 CSRF 토큰(백엔드 CredentialCookieCsrfPolicy).
 *
 * 쿠키 자격(accessToken·refreshToken 등)을 실은 쓰기 요청은 XSRF-TOKEN 쿠키와 같은 값의 X-XSRF-TOKEN 헤더를 요구한다.
 * 브라우저 화면은 axios 가 쿠키를 읽어 헤더를 붙이지만 API 요청 컨텍스트는 그러지 않는다. 그래서 시험이 만드는 요청
 * 컨텍스트는 같은 값의 쿠키와 헤더를 함께 싣는다 — 브라우저와 같은 조건이다. 쿠키 자격이 없는 요청에는 영향이 없다.
 * 이중 제출은 같은 출처만 쿠키를 읽을 수 있다는 데 기대므로 값의 비밀성은 전제가 아니다(시험은 고정값을 쓴다).
 */
export const E2E_CSRF_TOKEN = 'e2e-double-submit-csrf-token';
export const CSRF_HEADER = 'X-XSRF-TOKEN';
export const CSRF_COOKIE = 'XSRF-TOKEN';

type Cookie = { name: string; value: string; domain: string; path: string; expires: number;
  httpOnly: boolean; secure: boolean; sameSite: 'Strict' | 'Lax' | 'None' };
type StorageState = { cookies: Cookie[]; origins: { origin: string; localStorage: { name: string; value: string }[] }[] };

function tokenCookie(url: string): Cookie {
  return { name: CSRF_COOKIE, value: E2E_CSRF_TOKEN, domain: new URL(url).hostname, path: '/', expires: -1,
    httpOnly: false, secure: false, sameSite: 'Strict' };
}

/** storageState(파일 경로·객체·없음)에 주어진 출처들의 토큰 쿠키를 더한다. 이미 있는 토큰 쿠키는 같은 값으로 바꾼다. */
export function withCsrfCookies(storageState: string | StorageState | undefined, urls: (string | undefined)[]): StorageState {
  const base: StorageState = typeof storageState === 'string'
    ? JSON.parse(fs.readFileSync(path.resolve(storageState), 'utf8'))
    : storageState ?? { cookies: [], origins: [] };
  const hosts = [...new Set(urls.filter((url): url is string => Boolean(url)).map((url) => new URL(url).hostname))];
  return { ...base, cookies: [...base.cookies.filter((cookie) => cookie.name !== CSRF_COOKIE),
    ...hosts.map((host) => tokenCookie(`http://${host}`))] };
}

/** 쿠키 자격 없이 시작하는 요청 컨텍스트의 옵션 — 토큰 쿠키와 같은 값의 헤더만 싣는다. */
export function anonymousCsrfRequestState(url: string | undefined): { storageState: StorageState; extraHTTPHeaders: Record<string, string> } {
  return {
    storageState: withCsrfCookies(undefined, [url ?? process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3001']),
    extraHTTPHeaders: { [CSRF_HEADER]: E2E_CSRF_TOKEN },
  };
}
