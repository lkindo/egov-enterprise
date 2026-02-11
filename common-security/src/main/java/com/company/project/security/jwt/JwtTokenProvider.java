package com.company.project.security.jwt;

import io.jsonwebtoken.*;
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
        } catch (JwtException | IllegalArgumentException e) {
            log.error("Expired or invalid JWT token: {}", e.getMessage());
            return false;
        }
    }

    // Check if Refresh Token is valid in DB
    public boolean validateRefreshToken(String token) {
        if (!validateToken(token)) return false;
        
        Optional<RefreshToken> storedToken = refreshTokenRepository.findByToken(token);
        return storedToken.isPresent() && storedToken.get().getExpiryDate().isAfter(Instant.now());
    }
}
