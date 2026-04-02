package com.company.project.foundation.security.jwt;

import com.company.project.foundation.domain.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("JwtTokenProvider 테스트")
class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private final String secretKey = "testSecretKeytestSecretKeytestSecretKeytestSecretKey";
    private final long tokenValidityInMilliseconds = 3600000; // 1hour

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "secretKey", secretKey);
        ReflectionTestUtils.setField(jwtTokenProvider, "tokenValidityInMilliseconds", tokenValidityInMilliseconds);
        jwtTokenProvider.afterPropertiesSet();
    }

    @Test
    @DisplayName("액세스 토큰 생성 및 검증 성공")
    void createToken_and_validate_success() {
        // Given
        User user = User.builder()
                .loginId("testuser")
                .name("테스트")
                .build();
        
        // When
        String token = jwtTokenProvider.createAccessToken(user.getLoginId(), Collections.singletonList("ROLE_USER"));
        
        // Then
        assertThat(token).isNotNull();
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
    }

    @Test
    @DisplayName("토큰에서 인증 정보 조회 성공")
    void getAuthentication_success() {
        // Given
        String token = jwtTokenProvider.createAccessToken("testuser", Collections.singletonList("ROLE_USER"));
        
        // When
        Authentication authentication = jwtTokenProvider.getAuthentication(token);
        
        // Then
        assertThat(authentication.getName()).isEqualTo("testuser");
        assertThat(authentication.getAuthorities()).isNotEmpty();
    }

    @Test
    @DisplayName("잘못된 토큰 검증 실패")
    void validateToken_fail() {
        // Given
        String invalidToken = "invalidToken";
        
        // When & Then
        assertThat(jwtTokenProvider.validateToken(invalidToken)).isFalse();
    }
}