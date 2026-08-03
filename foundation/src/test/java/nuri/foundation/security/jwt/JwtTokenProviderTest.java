package nuri.foundation.security.jwt;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
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

    /**
     * [W0-P0-4-c 회귀 방지 / 2026-08-03] 저장소에 커밋된 dev 시크릿을 운영에 주입하면 기동을 거부한다.
     *
     * <p>종전 prod 방어({@code ${JWT_SECRET}} 무기본값)는 <b>변수의 존재</b>만 검사했다.
     * 공개 저장소의 그 값을 그대로 주입하면 통과했고, 그 상태에서는 누구나 임의 esntlId 로
     * 토큰을 위조할 수 있다 — 인증 체계 전체가 무의미해진다.
     */
    @Test
    @DisplayName("[보안] prod 에 저장소 커밋 dev 시크릿을 주입하면 기동 거부")
    void init_rejectsCommittedDevSecretInProd() {
        JwtTokenProvider provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "secretKey", COMMITTED_DEV_SECRET);
        ReflectionTestUtils.setField(provider, "activeProfiles", "prod");

        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> ReflectionTestUtils.invokeMethod(provider, "init"));
        assertThat(e.getMessage())
                .as("거부 사유가 메시지에 드러나야 한다")
                .contains("커밋된 개발용 JWT_SECRET");
    }

    @Test
    @DisplayName("[보안] 같은 시크릿이라도 dev·e2e 프로파일에서는 허용된다 (개발 경로 차단 금지)")
    void init_allowsCommittedDevSecretOutsideProd() {
        for (String profiles : new String[] { "", "dev", "test,e2e", "local" }) {
            JwtTokenProvider provider = new JwtTokenProvider();
            ReflectionTestUtils.setField(provider, "secretKey", COMMITTED_DEV_SECRET);
            ReflectionTestUtils.setField(provider, "activeProfiles", profiles);
            ReflectionTestUtils.invokeMethod(provider, "init"); // 예외가 나면 이 테스트가 실패한다
        }
    }

    @Test
    @DisplayName("[보안] prod 여도 새로 만든 시크릿이면 기동한다 — 값 기준 판정이지 프로파일 기준이 아니다")
    void init_allowsFreshSecretInProd() {
        JwtTokenProvider provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "secretKey",
                "a-freshly-generated-secret-that-is-long-enough-for-hs512-hmac-key-material-0123456789");
        ReflectionTestUtils.setField(provider, "activeProfiles", "prod");
        ReflectionTestUtils.invokeMethod(provider, "init");
    }

    /**
     * docker-compose.yml · application.yml · frontend/src/middleware.ts 에 있는 그 값이다.
     * 이미 공개된 값이라 테스트에 두는 것이 새로운 노출을 만들지 않으며,
     * 여기 두어야 "이 값이 운영에 들어오면 막힌다" 를 실제로 증명할 수 있다.
     */
    private static final String COMMITTED_DEV_SECRET =
            "dGhpcy1pcy1hLXZlcnktbG9uZy1zZWNyZXQta2V5LWZvci1lZ292LWVudGVycHJpc2UtbW9kZXJuaXphdGlvbg==";

    /**
     * [회귀 방지 / 2026-07-28] 토큰 수명을 상수에서 `@Value` 주입으로 바꾸면서 **필드 초기화값을
     * 빠뜨려** 이 클래스의 3개 테스트가 `ExpiredJwtException: JWT expired 716 milliseconds ago`
     * 로 깨진 사고가 있었다(CI run 30320684270). `@Value` 는 Spring 이 주입할 때만 채워지므로
     * 컨텍스트 없이 `new JwtTokenProvider()` 로 만들면 0 이 되어 토큰이 발급 즉시 만료된다.
     * 컴파일은 통과하므로 `compileTestJava` 만으로는 잡히지 않는다 — 그래서 테스트로 못박는다.
     */
    @Test
    @DisplayName("Spring 주입이 없어도 기본 수명이 유지된다 (필드 초기화값 누락 회귀 방지)")
    void defaultValidity_survivesWithoutSpringInjection() {
        JwtTokenProvider provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "secretKey", secretKey);
        // 수명 필드는 일부러 주입하지 않는다 — 초기화값이 없으면 init() 이 즉시 예외를 던진다.
        ReflectionTestUtils.invokeMethod(provider, "init");

        String token = provider.createAccessToken("testuser", "ROLE_USER");
        assertThat(provider.validateToken(token)).isTrue();
    }

    @Test
    @DisplayName("설정된 액세스 토큰 수명이 exp 에 그대로 반영된다")
    void accessTokenValidity_isReflectedInExpiration() {
        ReflectionTestUtils.setField(jwtTokenProvider, "accessTokenValidityInMilliseconds", 120_000L);

        String token = jwtTokenProvider.createAccessToken("testuser", "ROLE_USER");

        io.jsonwebtoken.Claims claims = Jwts.parser()
                .verifyWith(jwtTokenProvider.getKeyForTest())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        long validityMs = claims.getExpiration().getTime() - claims.getIssuedAt().getTime();
        assertThat(validityMs).isEqualTo(120_000L);
    }

    @Test
    @DisplayName("토큰 수명이 0 이하이면 기동 시점에 실패한다")
    void init_Fail_whenValidityNotPositive() {
        JwtTokenProvider provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "secretKey", secretKey);
        ReflectionTestUtils.setField(provider, "accessTokenValidityInMilliseconds", 0L);

        // 조용히 통과해 "로그인은 되는데 곧바로 /login" 이 되는 것을 막는다.
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
        assertThat(jwtTokenProvider.validateRefreshToken(token)).isTrue();
    }

    @Test
    @DisplayName("[W1-06] 리프레시 토큰은 액세스 토큰 자리에서 거부된다")
    void refreshToken_isRejectedAsAccessToken() {
        String refresh = jwtTokenProvider.createRefreshToken("testuser");

        // 종전에는 이 단언이 true 였다 — 두 토큰이 같은 키로 서명되고 구조가 같아 구분할 근거가 없었고,
        // 그래서 7일짜리 리프레시 토큰을 그대로 Authorization: Bearer 로 쓸 수 있었다.
        assertThat(jwtTokenProvider.validateToken(refresh)).isFalse();
    }

    @Test
    @DisplayName("[W1-06] 액세스 토큰은 재발급 자리에서 거부된다 (반대 방향)")
    void accessToken_isRejectedAsRefreshToken() {
        String access = jwtTokenProvider.createAccessToken("testuser", "ROLE_USER");

        assertThat(jwtTokenProvider.validateRefreshToken(access)).isFalse();
    }

    @Test
    @DisplayName("[W1-06] typ 이 없는 구(舊) 토큰은 양쪽 모두 통과한다 (롤링 배포 호환)")
    void legacyTokenWithoutTypeClaim_isAccepted() {
        // deny-list 로 판정하는 이유의 근거. allow-list(typ=="access" 를 요구)로 만들면
        // 배포 이전에 발급된 무-typ 액세스 토큰이 신 노드에서 전량 401 이 되어
        // 롤링 배포 중 대량 로그아웃이 난다.
        // 프로바이더와 같은 방식으로 키를 유도해(JwtTokenProvider.init 참조) typ 클레임 없는 토큰을 만든다.
        String legacy = io.jsonwebtoken.Jwts.builder()
                .subject("testuser")
                .issuedAt(new java.util.Date())
                .expiration(new java.util.Date(System.currentTimeMillis() + 60_000))
                .signWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(secretKey.getBytes()))
                .compact();

        assertThat(jwtTokenProvider.validateToken(legacy)).isTrue();
        assertThat(jwtTokenProvider.validateRefreshToken(legacy)).isTrue();
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
        
        String setCookieHeader = response.getHeader(org.springframework.http.HttpHeaders.SET_COOKIE);
        assertThat(setCookieHeader).isNotNull();
        assertThat(setCookieHeader).contains("refreshToken=ref-token");
        assertThat(setCookieHeader).contains("HttpOnly");
        assertThat(setCookieHeader).contains("SameSite=Strict");
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
        
        String setCookieHeader = response.getHeader(org.springframework.http.HttpHeaders.SET_COOKIE);
        assertThat(setCookieHeader).isNotNull();
        assertThat(setCookieHeader).contains("Max-Age=0");
        assertThat(setCookieHeader).contains("SameSite=Strict");
    }
}