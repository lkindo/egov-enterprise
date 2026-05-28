package nuri.foundation.security.jwt;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import nuri.foundation.domain.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.util.ReflectionTestUtils;
import jakarta.servlet.http.Cookie;

import java.util.Collections;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("JwtTokenProvider 테스트")
class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private final String secretKey = "testSecretKeytestSecretKeytestSecretKeytestSecretKey";
    
    @Mock
    private UserDetailsService userDetailsService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "secretKey", secretKey);
        ReflectionTestUtils.setField(jwtTokenProvider, "cookieSecure", false);
        ReflectionTestUtils.invokeMethod(jwtTokenProvider, "init");
        ReflectionTestUtils.setField(jwtTokenProvider, "userDetailsService", userDetailsService);
    }

    @Test
    @DisplayName("SecretKey 누락 시 예외 발생")
    void init_Fail() {
        JwtTokenProvider provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "secretKey", "");
        assertThrows(IllegalStateException.class, () -> ReflectionTestUtils.invokeMethod(provider, "init"));
    }

    @Test
    @DisplayName("액세스 토큰 생성 및 검증 성공")
    void createToken_and_validate_success() {
        String token = jwtTokenProvider.createAccessToken("testuser", "ROLE_USER");
        assertThat(token).isNotNull();
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
    }

    @Test
    @DisplayName("리프레시 토큰 생성 성공")
    void createRefreshToken_success() {
        String token = jwtTokenProvider.createRefreshToken("testuser");
        assertThat(token).isNotNull();
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
    }

    @Test
    @DisplayName("토큰에서 인증 정보 조회 성공")
    void getAuthentication_success() {
        String token = jwtTokenProvider.createAccessToken("testuser", "ROLE_USER");
        UserDetails userDetails = mock(UserDetails.class);
        when(userDetails.getAuthorities()).thenReturn(Collections.emptyList());
        when(userDetailsService.loadUserByUsername("testuser")).thenReturn(userDetails);
        
        Authentication authentication = jwtTokenProvider.getAuthentication(token);
        assertThat(authentication).isNotNull();
        assertThat(authentication.getPrincipal()).isEqualTo(userDetails);
    }

    @Test
    @DisplayName("잘못된 형식 토큰 검증 실패 (Malformed)")
    void validateToken_Malformed_fail() {
        String invalidToken = "invalidToken.invalid.invalid";
        assertThat(jwtTokenProvider.validateToken(invalidToken)).isFalse();
    }

    @Test
    @DisplayName("서명 오류 토큰 검증 실패 (Signature)")
    void validateToken_Signature_fail() {
        // 다른 키로 사인된 토큰
        String otherKeyToken = Jwts.builder()
                .subject("testuser")
                .signWith(Keys.hmacShaKeyFor("anotherSecretKeyanotherSecretKeyanotherSecretKey".getBytes()))
                .compact();
        assertThat(jwtTokenProvider.validateToken(otherKeyToken)).isFalse();
    }

    @Test
    @DisplayName("만료된 토큰 검증 실패 (Expired)")
    void validateToken_Expired_fail() {
        String expiredToken = Jwts.builder()
                .subject("testuser")
                .issuedAt(new Date(System.currentTimeMillis() - 2000))
                .expiration(new Date(System.currentTimeMillis() - 1000))
                .signWith(jwtTokenProvider.getKeyForTest())
                .compact();
        assertThat(jwtTokenProvider.validateToken(expiredToken)).isFalse();
    }

    @Test
    @DisplayName("헤더에서 토큰 해석 성공")
    void resolveToken_success() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer valid.token.here");
        
        String token = jwtTokenProvider.resolveToken(request);
        assertThat(token).isEqualTo("valid.token.here");
    }

    @Test
    @DisplayName("헤더에 토큰 없을 경우 null 반환")
    void resolveToken_null() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        String token = jwtTokenProvider.resolveToken(request);
        assertThat(token).isNull();
    }

    @Test
    @DisplayName("리프레시 토큰 쿠키 추가 성공")
    void addRefreshTokenCookie_success() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        jwtTokenProvider.addRefreshTokenCookie(response, "ref-token");
        
        Cookie cookie = response.getCookie("refreshToken");
        assertThat(cookie).isNotNull();
        assertThat(cookie.getValue()).isEqualTo("ref-token");
        assertThat(cookie.isHttpOnly()).isTrue();
    }

    @Test
    @DisplayName("리프레시 토큰 해석 성공")
    void resolveRefreshToken_success() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("refreshToken", "ref-token-val"));
        
        String token = jwtTokenProvider.resolveRefreshToken(request);
        assertThat(token).isEqualTo("ref-token-val");
    }

    @Test
    @DisplayName("쿠키가 없을 때 리프레시 토큰 해석 null")
    void resolveRefreshToken_null() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        String token = jwtTokenProvider.resolveRefreshToken(request);
        assertThat(token).isNull();
    }

    @Test
    @DisplayName("리프레시 토큰 쿠키 삭제 성공")
    void removeRefreshTokenCookie_success() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        jwtTokenProvider.removeRefreshTokenCookie(response);
        
        Cookie cookie = response.getCookie("refreshToken");
        assertThat(cookie).isNotNull();
        assertThat(cookie.getMaxAge()).isEqualTo(0);
        assertThat(cookie.getValue()).isNull();
    }
}