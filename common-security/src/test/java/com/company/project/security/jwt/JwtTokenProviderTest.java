package com.company.project.security.jwt;

import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.SecretKey;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class JwtTokenProviderTest {

    @InjectMocks
    private JwtTokenProvider jwtTokenProvider;

    private final String secretKeyString = "testSecretKeyWithEnoughLengthForHMACSHA256Algorithm1234567890";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(jwtTokenProvider, "secretKey", secretKeyString);
        jwtTokenProvider.init();
    }

    @Test
    @DisplayName("액세스 토큰 생성 및 유효성 검증 테스트")
    void createAndValidateAccessTokenTest() {
        String userId = "user01";
        String role = "ROLE_USER";

        String token = jwtTokenProvider.createAccessToken(userId, role);

        assertThat(token).isNotNull();
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
        assertThat(jwtTokenProvider.getUserId(token)).isEqualTo(userId);
    }

    @Test
    @DisplayName("잘못된 토큰 검증 테스트")
    void validateInvalidTokenTest() {
        String invalidToken = "invalid.token.here";
        assertThat(jwtTokenProvider.validateToken(invalidToken)).isFalse();
    }

    @Test
    @DisplayName("만료된 토큰 검증 테스트")
    void validateExpiredTokenTest() {
        // Given: Create a token with 0 validity (already expired)
        SecretKey key = Keys.hmacShaKeyFor(secretKeyString.getBytes());
        String expiredToken = io.jsonwebtoken.Jwts.builder()
                .subject("expiredUser")
                .expiration(new java.util.Date(System.currentTimeMillis() - 1000))
                .signWith(key)
                .compact();

        // When & Then
        assertThat(jwtTokenProvider.validateToken(expiredToken)).isFalse();
    }
}
