package com.company.project.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
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
import java.util.Date;
import java.util.Optional;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;

@Slf4j
@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String secretKey;

    // Access Token: 1 hour
    private final long accessTokenValidityInMilliseconds = 1000L * 60 * 60;
    // Refresh Token: 7 days
    private final long refreshTokenValidityInMilliseconds = 1000L * 60 * 60 * 24 * 7;

    private SecretKey key;

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private UserDetailsService userDetailsService;

    @org.springframework.beans.factory.annotation.Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @PostConstruct
    protected void init() {
        this.key = Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    // Create Access Token
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

    // Create Refresh Token and Save to DB
    @Transactional
    public String createRefreshToken(String userId) {
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

        refreshTokenRepository.save(refreshToken);
        return token;
    }

    // Get Auth from Token
    public Authentication getAuthentication(String token) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(getUserId(token));
        return new UsernamePasswordAuthenticationToken(userDetails, "", userDetails.getAuthorities());
    }

    // Extract UserID
    public String getUserId(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    // Resolve Token from Header
    public String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    // Validate Token
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            log.error("Expired JWT token: {}", e.getMessage());
            return false;
        } catch (io.jsonwebtoken.MalformedJwtException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
            return false;
        } catch (io.jsonwebtoken.UnsupportedJwtException e) {
            log.error("Unsupported JWT token: {}", e.getMessage());
            return false;
        } catch (io.jsonwebtoken.SignatureException e) {
            log.error("Invalid JWT signature: {}", e.getMessage());
            return false;
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty: {}", e.getMessage());
            return false;
        }
    }

    // Create and Add Refresh Token Cookie to Response
    public void addRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        Cookie cookie = new Cookie("refreshToken", refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(true); // Set to true for production (HTTPS)
        cookie.setPath("/");
        cookie.setMaxAge((int) (refreshTokenValidityInMilliseconds / 1000));
        response.addCookie(cookie);
    }

    // Resolve Refresh Token from Request Cookie
    public String resolveRefreshToken(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(cookie -> "refreshToken".equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    // Remove Refresh Token Cookie
    public void removeRefreshTokenCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie("refreshToken", null);
        cookie.setHttpOnly(true);
        cookie.setSecure(true); // Set to true for production (HTTPS)
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }

    // Check if Refresh Token is valid in DB
    public boolean validateRefreshToken(String token) {
        if (!validateToken(token)) return false;
        
        Optional<RefreshToken> storedToken = refreshTokenRepository.findByToken(token);
        return storedToken.isPresent() && storedToken.get().getExpiryDate().isAfter(Instant.now());
    }
    
    // Test helper method to access the key
    public SecretKey getKeyForTest() {
        return this.key;
    }
}