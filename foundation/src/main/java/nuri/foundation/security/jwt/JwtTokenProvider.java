package nuri.foundation.security.jwt;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import nuri.foundation.security.constants.SecurityConstants;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import javax.crypto.SecretKey;
import java.util.Arrays;
import java.util.Date;
import java.util.Objects;

@Slf4j
@Component
public class JwtTokenProvider {
    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.cookie.secure:false}")
    private boolean cookieSecure;

    /**
     * 액세스 토큰 수명(ms). 기본 1시간 — **운영 기본값은 종전과 동일하며 바꾸지 않는다.**
     *
     * [설정으로 뺀 이유 / 2026-07-28] 종전에는 상수였고, 그 결과 **E2E 전체 실행이 이 수명을
     * 넘기면 그 시점 이후의 모든 테스트가 한꺼번에 죽었다.** Playwright 는 setup 에서 storageState
     * 를 한 번만 만들고 재발급하지 않으며, 프론트 미들웨어는 exp 경과 시 재발급을 시도하지 않고
     * 곧바로 /login 으로 돌린다(middleware.ts). 그래서 증상이 "셀렉터를 못 찾음"으로 나타나
     * 원인이 전혀 달라 보인다 — 실제로 렌더된 것은 대상 화면이 아니라 로그인 폼이다.
     *
     * 실측(2026-07-28, CI run 30279822185): shard 2 가 **66분** 걸렸고 04 후반부터 05·06·07 이
     * 통째로 red 였다. 만료 토큰을 주입해 동일 증상을 재현·확증했다.
     * 러너가 느려질수록 더 많은 테스트가 만료 구간에 들어가는 구조라, 테스트를 개별로 고쳐도
     * 재발한다. E2E 환경에서만 수명을 늘릴 수 있도록 주입 지점을 만든다.
     */
    @Value("${jwt.access-token-validity-ms:3600000}")
    private long accessTokenValidityInMilliseconds;

    /** 리프레시 토큰 수명(ms). 기본 7일. */
    @Value("${jwt.refresh-token-validity-ms:604800000}")
    private long refreshTokenValidityInMilliseconds;

    private SecretKey key;

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private UserDetailsService userDetailsService;

    @PostConstruct
    protected void init() {
        if (secretKey == null || secretKey.trim().isEmpty()) {
            throw new IllegalStateException("JWT Secret is not configured.");
        }
        this.key = Keys.hmacShaKeyFor(secretKey.getBytes());
        log.info("JWT secret fingerprint = {} (sha256[:8], 값 아님)", secretFingerprint());
    }

    /**
     * 시크릿의 SHA-256 앞 8자. 값 자체는 절대 로그에 남기지 않는다.
     *
     * [존재 이유] 프론트 미들웨어(frontend/src/middleware.ts)가 같은 규칙으로 지문을 찍는다.
     * 두 지문이 다르면 좌우 시크릿 비대칭이고, 그 상태에서는 서명 검증이 전량 실패해
     * "로그인은 200 인데 페이지 진입에서 /login 으로 되돌아가는" 무음 루프가 된다(2026-07-19 발생).
     * 그때 원인을 알려주는 신호가 어디에도 없어 오래 헤맸기에, 양쪽에 대조 가능한 지문을 남긴다.
     */
    private String secretFingerprint() {
        try {
            byte[] digest = java.security.MessageDigest.getInstance("SHA-256")
                    .digest(secretKey.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 4; i++) {
                sb.append(String.format("%02x", digest[i]));
            }
            return sb.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            return "(지문 계산 실패)";
        }
    }

    public String createAccessToken(String userId, String role) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + accessTokenValidityInMilliseconds);
        return Jwts.builder()
                .subject(userId)
                .claim("role", role)
                .issuedAt(now)
                .expiration(validity)
                .signWith(key)
                .compact();
    }

    public String createRefreshToken(@org.springframework.lang.NonNull String userId) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + refreshTokenValidityInMilliseconds);
        return Jwts.builder()
                .subject(userId)
                .issuedAt(now)
                .expiration(validity)
                .signWith(key)
                .compact();
    }

    public Authentication getAuthentication(String token) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(getUserId(token));
        return new UsernamePasswordAuthenticationToken(userDetails, "", userDetails.getAuthorities());
    }

    public String getUserId(String token) {
        return Objects.requireNonNull(Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject(), "Subject in JWT token cannot be null");
    }

    public String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader(SecurityConstants.HEADER_AUTHORIZATION);
        if (bearerToken != null && bearerToken.startsWith(SecurityConstants.TOKEN_PREFIX)) {
            return bearerToken.substring(7);
        }
        return null;
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (io.jsonwebtoken.security.SignatureException e) {
            log.error(">>> [JWT] Invalid signature: {}", e.getMessage());
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            log.error(">>> [JWT] Expired token: {}", e.getMessage());
        } catch (io.jsonwebtoken.MalformedJwtException e) {
            log.error(">>> [JWT] Malformed token: {}", e.getMessage());
        } catch (Exception e) {
            log.error(">>> [JWT] Validation failed: {} - {}", e.getClass().getSimpleName(), e.getMessage());
        }
        return false;
    }

    public void addRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        org.springframework.http.ResponseCookie responseCookie = nuri.foundation.security.util.CookieUtil.createRefreshTokenCookie(
                refreshToken,
                cookieSecure,
                refreshTokenValidityInMilliseconds / 1000
        );
        response.addHeader(org.springframework.http.HttpHeaders.SET_COOKIE, responseCookie.toString());
    }

    public String resolveRefreshToken(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(cookie -> "refreshToken".equals(cookie.getName()))
                .map(cookie -> cookie.getValue())
                .findFirst()
                .orElse(null);
    }

    public void removeRefreshTokenCookie(HttpServletResponse response) {
        org.springframework.http.ResponseCookie responseCookie = nuri.foundation.security.util.CookieUtil.deleteRefreshTokenCookie(cookieSecure);
        response.addHeader(org.springframework.http.HttpHeaders.SET_COOKIE, responseCookie.toString());
    }

    public SecretKey getKeyForTest() {
        return this.key;
    }
}
