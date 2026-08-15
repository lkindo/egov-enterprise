/**
 * JWT 페이로드에서 만료시각(exp)만 추출하는 경량 디코더.
 *
 * ⚠ 서명 검증을 하지 않는다 — 값의 신뢰가 필요한 인가 판단에 쓰지 말 것.
 * 유일한 용도는 클라이언트 만료경고(SessionExpiryWarning)를 위한 <b>비민감 만료힌트</b>
 * (`session_exp` 쿠키) 생성이다. 토큰 본문(민감)은 HttpOnly 쿠키로만 보관하고,
 * JS 로 읽는 것은 만료시각(타임스탬프)뿐이라 탈취 표면이 되지 않는다.
 *
 * @param token JWT 문자열
 * @returns 만료시각(ms epoch) 또는 파싱 실패/exp 부재 시 null
 */
export function getJwtExpiryMs(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const binary =
      typeof atob === 'function'
        ? atob(base64)
        : Buffer.from(base64, 'base64').toString('binary');
    const json = decodeURIComponent(
      binary
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(json) as { exp?: unknown };
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp) || payload.exp <= 0) {
      return null;
    }

    const expiryMs = payload.exp * 1000;
    return Number.isFinite(expiryMs) ? expiryMs : null;
  } catch {
    return null;
  }
}
