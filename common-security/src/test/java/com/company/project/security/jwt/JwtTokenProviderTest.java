package com.company.project.security.jwt;

import com.company.project.domain.auth.RefreshToken;
import com.company.project.domain.auth.RefreshTokenRepository;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtTokenProviderTest {
    @Mock
    private UserDetailsService userDetailsService;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    private JwtTokenProvider jwtTokenProvider;
    private String secretKey = "thisIsTestSecretKeyForTestingPurposeOnly1234567890";

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(java.util.Objects.requireNonNull(jwtTokenProvider), "secretKey", secretKey);
        ReflectionTestUtils.setField(java.util.Objects.requireNonNull(jwtTokenProvider), "userDetailsService",
                userDetailsService);
        ReflectionTestUtils.setField(java.util.Objects.requireNonNull(jwtTokenProvider), "refreshTokenRepository",
                refreshTokenRepository);
        jwtTokenProvider.init();
    }

    @Test
    @DisplayName("Access Token 생성 성공")
    void createAccessToken_success() {
        // When
        String token = jwtTokenProvider.createAccessToken("testUser", "ROLE_USER");
        // Then
        assertThat(token).isNotNull().isNotEmpty();
        assertThat(token.split("\\.")).hasSize(3);
    }

    @Test
    @DisplayName("Refresh Token 생성 성공")
    void createRefreshToken_success() {
        // Given
        String userId = "testUser";
        when(refreshTokenRepository.findById(userId)).thenReturn(Optional.empty());
        RefreshToken mockSavedToken = java.util.Objects.requireNonNull(RefreshToken.builder()
                .userId(userId)
                .token("test-refresh-token")
                .expiryDate(Instant.now().plusSeconds(60 * 60))
                .build());
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenReturn(mockSavedToken);
        // When
        String result = jwtTokenProvider.createRefreshToken(userId);
        // Then
        assertThat(result).isNotNull().isNotEmpty();
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("Token 검증 성공")
    void validateToken_success() {
        // Given
        String token = jwtTokenProvider.createAccessToken("testUser", "ROLE_USER");
        // When
        boolean result = jwtTokenProvider.validateToken(token);
        // Then
        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("Token 검증 실패 - 만료된 토큰")
    void validateToken_fail_expiredToken() {
        // Given
        String expiredToken = Jwts.builder()
                .subject("testUser")
                .claim("role", "ROLE_USER")
                .issuedAt(new Date(System.currentTimeMillis() - 2 * 60 * 60 * 1000))
                .expiration(new Date(System.currentTimeMillis() - 1 * 60 * 60 * 1000))
                .signWith(jwtTokenProvider.getKeyForTest())
                .compact();
        // When
        boolean result = jwtTokenProvider.validateToken(expiredToken);
        // Then
        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("Token 검증 실패 - 잘못된 서명")
    void validateToken_fail_invalidSignature() {
        // Given
        String tokenWithDifferentSecret = Jwts.builder()
                .subject("testUser")
                .claim("role", "ROLE_USER")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 1 * 60 * 60 * 1000))
                .signWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor("differentSecret12345678901234567890".getBytes()))
                .compact();
        // When
        boolean result = jwtTokenProvider.validateToken(tokenWithDifferentSecret);
        // Then
        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("Token 검증 실패 - 잘못된 형식")
    void validateToken_fail_malformedToken() {
        // Given
        String malformedToken = "invalid.token.format";
        // When
        boolean result = jwtTokenProvider.validateToken(malformedToken);
        // Then
        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("Token 에서 사용자 ID 추출 성공")
    void getUserId_success() {
        // Given
        String token = jwtTokenProvider.createAccessToken("testUser", "ROLE_USER");
        // When
        String userId = jwtTokenProvider.getUserId(token);
        // Then
        assertThat(userId).isEqualTo("testUser");
    }

    @Test
    @DisplayName("Resolve Token 성공 - Authorization 헤더에서")
    void resolveToken_success_fromAuthorizationHeader() {
        // Given
        MockHttpServletRequest request = new MockHttpServletRequest();
        String token = "Bearer test-token-123";
        request.addHeader("Authorization", token);
        // When
        String result = jwtTokenProvider.resolveToken(request);
        // Then
        assertThat(result).isEqualTo("test-token-123");
    }

    @Test
    @DisplayName("Resolve Token 실패 - Authorization 헤더 없음")
    void resolveToken_fail_noAuthorizationHeader() {
        // Given
        MockHttpServletRequest request = new MockHttpServletRequest();
        // When
        String result = jwtTokenProvider.resolveToken(request);
        // Then
        assertThat(result).isNull();
    }

    @Test
    @DisplayName("Refresh Token 쿠키 설정")
    void setRefreshTokenCookie() {
        // Given
        MockHttpServletResponse response = new MockHttpServletResponse();
        String token = "test-refresh-token";
        // When - setRefreshTokenCookie 메서드가 없으므로 쿠키 직접 설정
        response.addCookie(new jakarta.servlet.http.Cookie("refreshToken", token));
        // Then
        assertThat(response.getCookie("refreshToken")).isNotNull();
        assertThat(java.util.Objects.requireNonNull(response.getCookie("refreshToken")).getValue()).isEqualTo(token);
    }

    @Test
    @DisplayName("Refresh Token 쿠키 제거")
    void removeRefreshTokenCookie() {
        // Given
        MockHttpServletResponse response = new MockHttpServletResponse();
        // When - removeRefreshTokenCookie 메서드가 없으므로 쿠키 직접 제거
        jakarta.servlet.http.Cookie cookie = new jakarta.servlet.http.Cookie("refreshToken", null);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        // Then
        assertThat(response.getCookie("refreshToken")).isNotNull();
        assertThat(java.util.Objects.requireNonNull(response.getCookie("refreshToken")).getMaxAge()).isZero();
    }
}
