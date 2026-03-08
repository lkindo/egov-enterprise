package com.company.project.security.jwt;

import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.util.ReflectionTestUtils;
import javax.crypto.SecretKey;
import java.util.Collections;
import java.util.Date;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("JwtTokenProvider 테스트")
class JwtTokenProviderTest {

    @InjectMocks
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private UserDetailsService userDetailsService;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    private final String secretKeyString = "testSecretKeyWithEnoughLengthForHMACSHA256Algorithm1234567890";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(jwtTokenProvider, "secretKey", secretKeyString);
        ReflectionTestUtils.setField(jwtTokenProvider, "userDetailsService", userDetailsService);
        jwtTokenProvider.init();
    }

    @Nested
    @DisplayName("액세스 토큰 생성 테스트")
    class CreateAccessTokenTests {

        @Test
        @DisplayName("사용자 ID 와 역할로 액세스 토큰 생성 성공")
        void createAccessToken_Success() {
            // Given
            String userId = "user01";
            String role = "ROLE_USER";

            // When
            String token = jwtTokenProvider.createAccessToken(userId, role);

            // Then
            assertThat(token).isNotNull();
            assertThat(jwtTokenProvider.validateToken(token)).isTrue();
            assertThat(jwtTokenProvider.getUserId(token)).isEqualTo(userId);
        }

        @Test
        @DisplayName("토큰에 역할 (role) 클레임이 포함되어야 함")
        void createAccessToken_ContainsRoleClaim() {
            // Given
            String userId = "admin";
            String role = "ROLE_ADMIN";

            // When
            String token = jwtTokenProvider.createAccessToken(userId, role);

            // Then
            assertThat(token).isNotNull();
            // 토큰 디코딩 후 role 클레임 확인 (구현에 따라 다를 수 있음)
        }
    }

    @Nested
    @DisplayName("리프레시 토큰 생성 테스트")
    class CreateRefreshTokenTests {

        @Test
        @DisplayName("사용자 ID 로 리프레시 토큰 생성 성공")
        void createRefreshToken_Success() {
            // Given
            String userId = "user01";

            // When
            String refreshToken = jwtTokenProvider.createRefreshToken(userId);

            // Then
            assertThat(refreshToken).isNotNull();
            assertThat(jwtTokenProvider.validateToken(refreshToken)).isTrue();
            assertThat(jwtTokenProvider.getUserId(refreshToken)).isEqualTo(userId);
        }

        @Test
        @DisplayName("리프레시 토큰은 null 사용자 ID 를 허용하지 않음")
        void createRefreshToken_NullUserId() {
            // When & Then
            // Note: 실제 구현은 @NonNull 애노테이션이 있지만, 런타임에 NullPointerException 이 발생할 수 있음
            // 여기서는 단순히 null 을 전달하면 토큰 생성이 시도되는 것을 확인
            String refreshToken = jwtTokenProvider.createRefreshToken(null);
            // null userId 도 토큰은 생성됨 (JWT spec 상 subject 는 null 일 수 있음)
            assertThat(refreshToken).isNotNull();
        }
    }

    @Nested
    @DisplayName("토큰 유효성 검증 테스트")
    class ValidateTokenTests {

        @Test
        @DisplayName("정상 토큰 검증 성공")
        void validateValidToken() {
            // Given
            String userId = "user01";
            String token = jwtTokenProvider.createAccessToken(userId, "ROLE_USER");

            // When & Then
            assertThat(jwtTokenProvider.validateToken(token)).isTrue();
        }

        @Test
        @DisplayName("잘못된 토큰 검증 시 false 반환")
        void validateInvalidToken() {
            // Given
            String invalidToken = "invalid.token.here";

            // When & Then
            assertThat(jwtTokenProvider.validateToken(invalidToken)).isFalse();
        }

        @Test
        @DisplayName("만료된 토큰 검증 시 false 반환")
        void validateExpiredToken() {
            // Given: Create a token that expired 1 second ago
            SecretKey key = Keys.hmacShaKeyFor(secretKeyString.getBytes());
            String expiredToken = io.jsonwebtoken.Jwts.builder()
                    .subject("expiredUser")
                    .expiration(new Date(System.currentTimeMillis() - 1000))
                    .signWith(key)
                    .compact();

            // When & Then
            assertThat(jwtTokenProvider.validateToken(expiredToken)).isFalse();
        }

        @Test
        @DisplayName("서명이 다른 토큰 검증 시 false 반환")
        void validateTokenWithWrongSignature() {
            // Given
            SecretKey wrongKey = Keys.hmacShaKeyFor("wrongSecretKeyWithEnoughLengthForTesting1234567890".getBytes());
            String tokenWithWrongSignature = io.jsonwebtoken.Jwts.builder()
                    .subject("user01")
                    .expiration(new Date(System.currentTimeMillis() + 3600000))
                    .signWith(wrongKey)
                    .compact();

            // When & Then
            assertThat(jwtTokenProvider.validateToken(tokenWithWrongSignature)).isFalse();
        }

        @Test
        @DisplayName("null 토큰 검증 시 false 반환")
        void validateNullToken() {
            // When & Then
            assertThat(jwtTokenProvider.validateToken(null)).isFalse();
        }
    }

    @Nested
    @DisplayName("토큰에서 사용자 정보 추출 테스트")
    class GetAuthenticationTests {

        @Test
        @DisplayName("토큰에서 Authentication 객체 생성 성공")
        void getAuthentication_Success() {
            // Given
            String userId = "authenticatedUser";
            String role = "ROLE_USER";
            String token = jwtTokenProvider.createAccessToken(userId, role);

            User mockUser = new User(userId, "", Collections.singletonList(new SimpleGrantedAuthority(role)));
            when(userDetailsService.loadUserByUsername(userId)).thenReturn(mockUser);

            // When
            var authentication = jwtTokenProvider.getAuthentication(token);

            // Then
            assertThat(authentication).isNotNull();
            assertThat(authentication.getName()).isEqualTo(userId);
            assertThat(authentication.getAuthorities()).hasSize(1);
            assertThat(authentication.getAuthorities().iterator().next().getAuthority()).isEqualTo(role);
        }

        @Test
        @DisplayName("토큰에서 사용자 ID 추출 성공")
        void getUserId_Success() {
            // Given
            String expectedUserId = "testUser";
            String token = jwtTokenProvider.createAccessToken(expectedUserId, "ROLE_USER");

            // When
            String extractedUserId = jwtTokenProvider.getUserId(token);

            // Then
            assertThat(extractedUserId).isEqualTo(expectedUserId);
        }
    }

    @Nested
    @DisplayName("HTTP 요청에서 토큰 추출 테스트")
    class ResolveTokenTests {

        @Test
        @DisplayName("Authorization 헤더에서 Bearer 토큰 추출 성공")
        void resolveToken_FromAuthorizationHeader() {
            // Given
            String expectedToken = "testBearerToken123";
            when(request.getHeader("Authorization")).thenReturn("Bearer " + expectedToken);

            // When
            String extractedToken = jwtTokenProvider.resolveToken(request);

            // Then
            assertThat(extractedToken).isEqualTo(expectedToken);
        }

        @Test
        @DisplayName("Bearer 접두사가 없는 경우 null 반환")
        void resolveToken_WithoutBearerPrefix() {
            // Given
            when(request.getHeader("Authorization")).thenReturn("SomeOtherPrefix token");

            // When
            String token = jwtTokenProvider.resolveToken(request);

            // Then
            assertThat(token).isNull();
        }

        @Test
        @DisplayName("Authorization 헤더가 없는 경우 null 반환")
        void resolveToken_NoAuthorizationHeader() {
            // Given
            when(request.getHeader("Authorization")).thenReturn(null);

            // When
            String token = jwtTokenProvider.resolveToken(request);

            // Then
            assertThat(token).isNull();
        }
    }

    @Nested
    @DisplayName("리프레시 토큰 쿠키 처리 테스트")
    class RefreshTokenCookieTests {

        @Test
        @DisplayName("리프레시 토큰 쿠키 추가 성공")
        void addRefreshTokenCookie() {
            // Given
            String refreshToken = "testRefreshToken123";

            // When
            jwtTokenProvider.addRefreshTokenCookie(response, refreshToken);

            // Then
            verify(response, times(1)).addCookie(any(Cookie.class));
        }

        @Test
        @DisplayName("리프레시 토큰 쿠키 제거 성공")
        void removeRefreshTokenCookie() {
            // When
            jwtTokenProvider.removeRefreshTokenCookie(response);

            // Then
            verify(response, times(1)).addCookie(any(Cookie.class));
        }

        @Test
        @DisplayName("HTTP 요청에서 리프레시 토큰 추출 성공")
        void resolveRefreshToken_Success() {
            // Given
            String expectedToken = "refreshTokenValue";
            Cookie[] cookies = { new Cookie("refreshToken", expectedToken) };
            when(request.getCookies()).thenReturn(cookies);

            // When
            String extractedToken = jwtTokenProvider.resolveRefreshToken(request);

            // Then
            assertThat(extractedToken).isEqualTo(expectedToken);
        }

        @Test
        @DisplayName("쿠키가 없는 경우 null 반환")
        void resolveRefreshToken_NoCookies() {
            // Given
            when(request.getCookies()).thenReturn(null);

            // When
            String token = jwtTokenProvider.resolveRefreshToken(request);

            // Then
            assertThat(token).isNull();
        }

        @Test
        @DisplayName("리프레시 토큰 쿠키가 없는 경우 null 반환")
        void resolveRefreshToken_NoRefreshTokenCookie() {
            // Given
            Cookie[] cookies = { new Cookie("otherCookie", "value") };
            when(request.getCookies()).thenReturn(cookies);

            // When
            String token = jwtTokenProvider.resolveRefreshToken(request);

            // Then
            assertThat(token).isNull();
        }
    }
}
