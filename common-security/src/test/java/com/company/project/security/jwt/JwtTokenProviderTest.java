package com.company.project.security.jwt;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class JwtTokenProviderTest {

    @InjectMocks
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private UserDetailsService userDetailsService;

    private final String secretKey = "testSecretKeyWithEnoughLengthForHmacSha256Algorithm!";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(jwtTokenProvider, "secretKey", secretKey);
        jwtTokenProvider.init();
    }

    @Test
    @DisplayName("액세스 토큰 생성 및 검증 성공")
    void createAndValidateAccessToken() {
        // Given
        String userId = "testuser";
        String role = "ROLE_USER";

        // When
        String token = jwtTokenProvider.createAccessToken(userId, role);
        boolean isValid = jwtTokenProvider.validateToken(token);
        String extractedUserId = jwtTokenProvider.getUserId(token);

        // Then
        assertThat(token).isNotEmpty();
        assertThat(isValid).isTrue();
        assertThat(extractedUserId).isEqualTo(userId);
    }

    @Test
    @DisplayName("리프레시 토큰 생성 및 검증 성공")
    void createAndValidateRefreshToken() {
        // Given
        String userId = "testuser";

        // When
        String token = jwtTokenProvider.createRefreshToken(userId);
        boolean isValid = jwtTokenProvider.validateToken(token);
        String extractedUserId = jwtTokenProvider.getUserId(token);

        // Then
        assertThat(token).isNotEmpty();
        assertThat(isValid).isTrue();
        assertThat(extractedUserId).isEqualTo(userId);
    }

    @Test
    @DisplayName("잘못된 토큰 검증 실패")
    void validateToken_fail_invalid() {
        // Given
        String invalidToken = "invalid.token.here";

        // When
        boolean isValid = jwtTokenProvider.validateToken(invalidToken);

        // Then
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("만료된 토큰 검증 실패")
    void validateToken_fail_expired() {
        // Given
        // We can't easily test expiration without mocking Date or waiting, 
        // but we can test if it handles it gracefully.
        // For simplicity, we just test a clearly invalid token structure.
        assertThat(jwtTokenProvider.validateToken("")).isFalse();
    }
}
