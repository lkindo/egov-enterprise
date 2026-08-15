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
/**
 * exp 파싱이 실패했을 때 쓰는 쿠키 수명(초). 백엔드 액세스 토큰 기본 수명과 같은 1시간이다.
 *
 * <p>파싱 실패는 곧 "정상 JWT 가 아니다" 라는 뜻이고 그 토큰은 어차피 미들웨어가 거부하므로,
 * 이 값이 실제로 쓰이는 경우는 사실상 없다. 그럼에도 24시간이 아니라 1시간을 고르는 이유는
 * <b>알 수 없을 때는 짧게</b> 가 쿠키 수명의 안전한 기본값이기 때문이다.
 */
const FALLBACK_COOKIE_MAX_AGE_SECONDS = 3600;

/**
 * 인증 쿠키의 {@code maxAge}(초)를 토큰 만료시각에서 유도한다.
 *
 * <p>[2026-08-15 신설] 종전에는 login·reissue 라우트가 모두 {@code maxAge: 86400}(24시간)을
 * <b>하드코딩</b>했다. 그런데 백엔드 액세스 토큰의 기본 수명은 1시간이다(E2E 는 6시간으로 늘린다).
 * 즉 <b>토큰이 만료된 뒤에도 쿠키는 최대 23시간 더 남았다.</b>
 *
 * <p>그 상태가 만드는 것은 "로그인된 것처럼 보이지만 아무것도 되지 않는" 구간이다 —
 * 브라우저는 쿠키를 계속 실어 보내고, 미들웨어는 exp 를 보고 매번 /login 으로 되돌린다.
 * 쿠키 수명을 토큰 수명에 맞추면 그 어긋난 구간 자체가 사라진다.
 *
 * <p>토큰 수명을 환경변수로 바꿔도(JWT_ACCESS_TOKEN_VALIDITY_MS) 이 값이 자동으로 따라가므로,
 * 프런트에 같은 숫자를 두 번 적어 두는 드리프트가 생기지 않는다.
 *
 * @param expiryMs {@link getJwtExpiryMs} 의 반환값
 * @returns 남은 수명(초). 이미 만료됐거나 시계 오차로 음수면 0 — 만료된 토큰을 쿠키에 심지 않는다.
 */
export function cookieMaxAgeSecondsFrom(expiryMs: number | null): number {
  if (expiryMs === null) {
    return FALLBACK_COOKIE_MAX_AGE_SECONDS;
  }
  return Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
}

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
