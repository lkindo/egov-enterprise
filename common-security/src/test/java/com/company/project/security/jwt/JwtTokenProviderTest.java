package com.company.project.security.jwt;

import com.company.project.domain.auth.RefreshToken;
import com.company.project.domain.auth.RefreshTokenRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.SignatureException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Date;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtTokenProviderTest {

    @Mock
    private UserDetailsService userDetailsService;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @InjectMocks
    private JwtTokenProvider jwtTokenProvider;

    private String secretKey = "thisIsTestSecretKeyForTestingPurposeOnly1234567890"; // Must be at least 256 bits

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(jwtTokenProvider, "secretKey", secretKey);
        jwtTokenProvider.init();
    }

    @Test
    @DisplayName("Access Token 생성 성공")
    void createAccessToken_success() {
        // When
        String token = jwtTokenProvider.createAccessToken("testUser", "ROLE_USER");

        // Then
        assertThat(token).isNotNull();
        assertThat(token).isNotEmpty();
        assertThat(token.split("\\.")).hasSize(3); // JWT has 3 parts: header.payload.signature
    }

    @Test
    @DisplayName("Refresh Token 생성 성공")
    void createRefreshToken_success() throws Exception {
        // Given
        String userId = "testUser";
        String expectedToken = "refreshToken123";
        Date now = new Date();
        Date validity = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Mock JWT creation
        String token = Jwts.builder()
                .subject(userId)
                .issuedAt(now)
                .expiration(validity)
                .signWith(jwtTokenProvider.getKeyForTest()) // Using a test helper method
                .compact();

        when(refreshTokenRepository.findById(userId)).thenReturn(Optional.empty());
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        String result = jwtTokenProvider.createRefreshToken(userId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isNotEmpty();

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(captor.capture());

        RefreshToken savedToken = captor.getValue();
        assertThat(savedToken.getUserId()).isEqualTo(userId);
        assertThat(savedToken.getToken()).isNotNull();
        assertThat(savedToken.getExpiryDate()).isNotNull();
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
                .issuedAt(new Date(System.currentTimeMillis() - 2 * 60 * 60 * 1000)) // 2 hours ago
                .expiration(new Date(System.currentTimeMillis() - 1 * 60 * 60 * 1000)) // 1 hour ago
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
                .expiration(new Date(System.currentTimeMillis() + 1 * 60 * 60 * 1000)) // 1 hour later
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
    @DisplayName("Token에서 사용자 ID 추출 성공")
    void getUserId_success() {
        // Given
        String token = jwtTokenProvider.createAccessToken("testUser123", "ROLE_USER");

        // When
        String userId = jwtTokenProvider.getUserId(token);

        // Then
        assertThat(userId).isEqualTo("testUser123");
    }

    @Test
    @DisplayName("Header에서 토큰 추출 성공")
    void resolveToken_success() {
        // Given
        MockHttpServletRequest request = new MockHttpServletRequest();
        String token = jwtTokenProvider.createAccessToken("testUser", "ROLE_USER");
        request.addHeader("Authorization", "Bearer " + token);

        // When
        String extractedToken = jwtTokenProvider.resolveToken(request);

        // Then
        assertThat(extractedToken).isEqualTo(token);
    }

    @Test
    @DisplayName("Header에서 토큰 추출 실패 - Authorization 헤더 없음")
    void resolveToken_fail_noAuthHeader() {
        // Given
        MockHttpServletRequest request = new MockHttpServletRequest();

        // When
        String extractedToken = jwtTokenProvider.resolveToken(request);

        // Then
        assertThat(extractedToken).isNull();
    }

    @Test
    @DisplayName("Header에서 토큰 추출 실패 - Bearer 접두사 없음")
    void resolveToken_fail_noBearerPrefix() {
        // Given
        MockHttpServletRequest request = new MockHttpServletRequest();
        String token = jwtTokenProvider.createAccessToken("testUser", "ROLE_USER");
        request.addHeader("Authorization", token); // No "Bearer " prefix

        // When
        String extractedToken = jwtTokenProvider.resolveToken(request);

        // Then
        assertThat(extractedToken).isNull();
    }

    @Test
    @DisplayName("Refresh Token 쿠키 추가 성공")
    void addRefreshTokenCookie_success() {
        // Given
        MockHttpServletResponse response = new MockHttpServletResponse();
        String refreshToken = "refreshToken123";

        // When
        jwtTokenProvider.addRefreshTokenCookie(response, refreshToken);

        // Then
        assertThat(response.getCookies()).hasSize(1);
        var cookie = response.getCookie("refreshToken");
        assertThat(cookie).isNotNull();
        assertThat(cookie.getValue()).isEqualTo(refreshToken);
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getSecure()).isTrue(); // Now set to true for production
        assertThat(cookie.getPath()).isEqualTo("/");
    }

    @Test
    @DisplayName("Refresh Token 쿠키에서 추출 성공")
    void resolveRefreshToken_success() {
        // Given
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new jakarta.servlet.http.Cookie("refreshToken", "refreshToken123"));

        // When
        String refreshToken = jwtTokenProvider.resolveRefreshToken(request);

        // Then
        assertThat(refreshToken).isEqualTo("refreshToken123");
    }

    @Test
    @DisplayName("Refresh Token 쿠키에서 추출 실패 - 쿠키 없음")
    void resolveRefreshToken_fail_noCookie() {
        // Given
        MockHttpServletRequest request = new MockHttpServletRequest();

        // When
        String refreshToken = jwtTokenProvider.resolveRefreshToken(request);

        // Then
        assertThat(refreshToken).isNull();
    }

    @Test
    @DisplayName("Refresh Token 쿠키 제거 성공")
    void removeRefreshTokenCookie_success() {
        // Given
        MockHttpServletResponse response = new MockHttpServletResponse();

        // When
        jwtTokenProvider.removeRefreshTokenCookie(response);

        // Then
        assertThat(response.getCookies()).hasSize(1);
        var cookie = response.getCookie("refreshToken");
        assertThat(cookie).isNotNull();
        assertThat(cookie.getValue()).isNull(); // Value is null to remove cookie
        assertThat(cookie.getMaxAge()).isEqualTo(0); // Max age is 0 to remove cookie
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getSecure()).isTrue();
        assertThat(cookie.getPath()).isEqualTo("/");
    }

    @Test
    @DisplayName("Refresh Token 검증 성공")
    void validateRefreshToken_success() throws Exception {
        // Given
        String userId = "testUser";
        String refreshToken = jwtTokenProvider.createAccessToken(userId, "ROLE_USER"); // Using access token for test simplicity
        RefreshToken mockRefreshToken = RefreshToken.builder()
                .userId(userId)
                .token(refreshToken)
                .expiryDate(Instant.now().plusSeconds(60 * 60 * 24 * 7)) // 7 days from now
                .build();

        when(refreshTokenRepository.findByToken(refreshToken)).thenReturn(Optional.of(mockRefreshToken));

        // When
        boolean result = jwtTokenProvider.validateRefreshToken(refreshToken);

        // Then
        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("Refresh Token 검증 실패 - DB에 없는 토큰")
    void validateRefreshToken_fail_tokenNotInDb() {
        // Given
        String refreshToken = jwtTokenProvider.createAccessToken("testUser", "ROLE_USER");
        when(refreshTokenRepository.findByToken(refreshToken)).thenReturn(Optional.empty());

        // When
        boolean result = jwtTokenProvider.validateRefreshToken(refreshToken);

        // Then
        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("Refresh Token 검증 실패 - 만료된 토큰")
    void validateRefreshToken_fail_expiredToken() throws Exception {
        // Given
        String userId = "testUser";
        String refreshToken = jwtTokenProvider.createAccessToken(userId, "ROLE_USER"); // Using access token for test simplicity
        RefreshToken expiredRefreshToken = RefreshToken.builder()
                .userId(userId)
                .token(refreshToken)
                .expiryDate(Instant.now().minusSeconds(1)) // Expired 1 second ago
                .build();

        when(refreshTokenRepository.findByToken(refreshToken)).thenReturn(Optional.of(expiredRefreshToken));

        // When
        boolean result = jwtTokenProvider.validateRefreshToken(refreshToken);

        // Then
        assertThat(result).isFalse();
    }

    // Helper method to access the key for testing purposes
    public static class TestHelper {
        public static io.jsonwebtoken.security.SecretKey getKeyForTest(JwtTokenProvider provider) {
            return (io.jsonwebtoken.security.SecretKey) ReflectionTestUtils.getField(provider, "key");
        }
    }

    // Add a helper method to access the key for testing
    public io.jsonwebtoken.security.SecretKey getKeyForTest() {
        return (io.jsonwebtoken.security.SecretKey) ReflectionTestUtils.getField(jwtTokenProvider, "key");
    }
}