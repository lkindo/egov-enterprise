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

    private final long accessTokenValidityInMilliseconds = 1000L * 60 * 60; // 1 hour
    private final long refreshTokenValidityInMilliseconds = 1000L * 60 * 60 * 24 * 7; // 7 days
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
