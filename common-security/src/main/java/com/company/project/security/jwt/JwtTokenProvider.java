package com.company.project.security.jwt;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import com.company.project.domain.auth.RefreshToken;
import com.company.project.domain.auth.RefreshTokenRepository;
import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Arrays;
import java.util.Date;
import java.util.Objects;

@Slf4j
@Component
public class JwtTokenProvider {
    @Value("${jwt.secret}")
    private String secretKey;

    private final long accessTokenValidityInMilliseconds = 1000L * 60 * 60; // 1 hour
    private final long refreshTokenValidityInMilliseconds = 1000L * 60 * 60 * 24 * 7; // 7 days
    private SecretKey key;

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private UserDetailsService userDetailsService;

    @org.springframework.beans.factory.annotation.Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @PostConstruct
    protected void init() {
        if (secretKey == null || secretKey.trim().isEmpty()) {
            throw new IllegalStateException("JWT Secret is not configured.");
        }
        this.key = Keys.hmacShaKeyFor(secretKey.getBytes());
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

    @Transactional
    public String createRefreshToken(@org.springframework.lang.NonNull String userId) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + refreshTokenValidityInMilliseconds);
        String token = Jwts.builder()
                .subject(userId)
                .issuedAt(now)
                .expiration(validity)
                .signWith(key)
                .compact();

        RefreshToken refreshToken = refreshTokenRepository.findById(userId)
                .map(existingToken -> {
                    existingToken.updateToken(token, validity.toInstant());
                    return existingToken;
                })
                .orElse(RefreshToken.builder()
                        .userId(userId)
                        .token(token)
                        .expiryDate(validity.toInstant())
                        .build());
        refreshTokenRepository.save(Objects.requireNonNull(refreshToken));
        return token;
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
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
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
        Cookie cookie = new Cookie("refreshToken", refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // Changed to false for non-HTTPS dev env
        cookie.setPath("/");
        cookie.setMaxAge((int) (refreshTokenValidityInMilliseconds / 1000));
        response.addCookie(cookie);
    }

    public String resolveRefreshToken(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(cookie -> "refreshToken".equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    public void removeRefreshTokenCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie("refreshToken", null);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }

    public boolean validateRefreshToken(String token) {
        if (!validateToken(token)) return false;
        return refreshTokenRepository.findByToken(token)
                .map(storedToken -> storedToken.getExpiryDate().isAfter(Instant.now()))
                .orElse(false);
    }

    public SecretKey getKeyForTest() {
        return this.key;
    }
}