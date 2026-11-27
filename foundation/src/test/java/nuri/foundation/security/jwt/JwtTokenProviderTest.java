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

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import java.util.Collections;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import org.junit.jupiter.api.Nested;

@DisplayName("JwtTokenProvider 테스트")
class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private UserDetailsService userDetailsService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "cookieSecure", false);
        ReflectionTestUtils.invokeMethod(jwtTokenProvider, "init");
        ReflectionTestUtils.setField(jwtTokenProvider, "userDetailsService", userDetailsService);
    }

    /** 저장소에 커밋된 개발용 서명 개인키(이미 공개된 값). 클레임을 직접 짠 토큰을 그 키로 서명한다. */
    private static java.security.PrivateKey devSigningKey() {
        String b64 = (String) ReflectionTestUtils.getField(JwtTokenProvider.class, "DEV_ES256_PKCS8_B64");
        try {
            return java.security.KeyFactory.getInstance("EC")
                    .generatePrivate(new java.security.spec.PKCS8EncodedKeySpec(Base64.getDecoder().decode(b64)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    /** 기본 제공자(개발용 키링)가 받는 ES256 서명으로 마무리한다. */
    private static String devSigned(io.jsonwebtoken.JwtBuilder builder) {
        return builder.header().keyId("dev-es256-1").and().signWith(devSigningKey(), Jwts.SIG.ES256).compact();
    }

    @Test
    @DisplayName("[보안] prod 여도 새로 만든 EC 서명키면 기동한다 — 값 기준 판정이지 프로파일 기준이 아니다")
    void init_allowsFreshSigningKeyInProd() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair kp = kpg.generateKeyPair();
        String pkcs8 = Base64.getEncoder().encodeToString(kp.getPrivate().getEncoded());

        JwtTokenProvider provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "signingActiveKid", "prod-es256-1");
        ReflectionTestUtils.setField(provider, "signingKeysJson", "{\"prod-es256-1\":\"" + pkcs8 + "\"}");
        ReflectionTestUtils.setField(provider, "activeProfiles", "prod");
        ReflectionTestUtils.invokeMethod(provider, "init");
        assertThat(provider.getActiveKidForTest()).isEqualTo("prod-es256-1");
    }

    /**
     * [ADR-0060 2차 · 2026-11-25] 저장소에 커밋된 개발용 서명키는 루프백에 바인딩한 서버에서만 쓴다.
     * 키링 없이 모든 주소에 바인딩한 서버는 그 서버에 닿는 누구나 공개된 개인키로 토큰을 만들 수 있었다.
     */
    @Nested
    @DisplayName("개발용 서명키의 네트워크 노출 차단")
    class DevKeyNetworkExposure {

        private JwtTokenProvider devKeyProvider(String serverAddress, boolean allowOnNetwork) {
            JwtTokenProvider p = new JwtTokenProvider();
            ReflectionTestUtils.setField(p, "serverAddress", serverAddress);
            ReflectionTestUtils.setField(p, "allowDevKeyOnNetwork", allowOnNetwork);
            ReflectionTestUtils.invokeMethod(p, "init");
            return p;
        }

        @Test
        @DisplayName("🚨 키링 없이 server.address 가 비었거나(모든 주소) 루프백이 아니면 기동을 멈춘다")
        void rejectsCommittedDevKeyWhenNotLoopback() {
            for (String address : new String[] { "", "0.0.0.0", "192.168.0.10", "::", "example.internal" }) {
                JwtTokenProvider p = devKeyProvider(address, false);
                IllegalStateException e = assertThrows(IllegalStateException.class, p::rejectCommittedDevKeyOnNetwork,
                        "주소 '" + address + "' 에서 개발용 키를 쓰면 막혀야 한다");
                assertThat(e.getMessage()).contains("server.address").contains("allow-dev-key-on-network");
            }
        }

        @Test
        @DisplayName("루프백 주소(127.0.0.1·::1·localhost)에서는 개발용 키를 쓴다")
        void allowsCommittedDevKeyOnLoopback() {
            for (String address : new String[] { "127.0.0.1", "127.0.1.1", "::1", "[::1]", "localhost" }) {
                JwtTokenProvider p = devKeyProvider(address, false);
                assertDoesNotThrow(p::rejectCommittedDevKeyOnNetwork, "루프백 '" + address + "' 은 허용돼야 한다");
            }
        }

        @Test
        @DisplayName("개발 스택이 명시적으로 허용하면 모든 주소에서도 쓴다")
        void allowsCommittedDevKeyWhenExplicitlyOptedIn() {
            assertDoesNotThrow(devKeyProvider("0.0.0.0", true)::rejectCommittedDevKeyOnNetwork);
        }

        @Test
        @DisplayName("🚨 WAR(외부 서블릿 컨테이너) 배포는 내장 서버 이벤트가 없다 — 기동 시점에 막고, server.address 루프백도 예외가 아니다")
        void externalServletContainerRejectsDevKeyAtStartupUnlessOptedIn() {
            for (String address : new String[] { "", "127.0.0.1" }) {
                JwtTokenProvider p = new JwtTokenProvider();
                ReflectionTestUtils.setField(p, "serverAddress", address);
                ReflectionTestUtils.setField(p, "externalServletContainer", true);
                IllegalStateException e = assertThrows(IllegalStateException.class, () -> ReflectionTestUtils.invokeMethod(p, "init"),
                        "WAR 배포는 server.address='" + address + "' 여도 막혀야 한다");
                assertThat(e.getMessage()).contains("WAR").contains("allow-dev-key-on-network");
            }
            JwtTokenProvider optedIn = new JwtTokenProvider();
            ReflectionTestUtils.setField(optedIn, "externalServletContainer", true);
            ReflectionTestUtils.setField(optedIn, "allowDevKeyOnNetwork", true);
            assertDoesNotThrow(() -> ReflectionTestUtils.invokeMethod(optedIn, "init"));
        }

        @Test
        @DisplayName("WAR 배포여도 새로 만든 키링이면 막지 않는다")
        void externalServletContainerWithFreshKeyringStarts() throws Exception {
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
            kpg.initialize(new ECGenParameterSpec("secp256r1"));
            String pkcs8 = Base64.getEncoder().encodeToString(kpg.generateKeyPair().getPrivate().getEncoded());
            JwtTokenProvider p = new JwtTokenProvider();
            ReflectionTestUtils.setField(p, "signingActiveKid", "k1");
            ReflectionTestUtils.setField(p, "signingKeysJson", "{\"k1\":\"" + pkcs8 + "\"}");
            ReflectionTestUtils.setField(p, "externalServletContainer", true);
            assertDoesNotThrow(() -> ReflectionTestUtils.invokeMethod(p, "init"));
        }

        @Test
        @DisplayName("키링에 개발용 키를 명시해 넣어도 같은 규칙이다 — 그 개인키는 공개돼 있다")
        void explicitKeyringContainingCommittedDevKeyIsTreatedAsDevKey() {
            String devPkcs8 = (String) ReflectionTestUtils.getField(JwtTokenProvider.class, "DEV_ES256_PKCS8_B64");
            JwtTokenProvider p = new JwtTokenProvider();
            ReflectionTestUtils.setField(p, "signingActiveKid", "dev-es256-1");
            ReflectionTestUtils.setField(p, "signingKeysJson", "{\"dev-es256-1\":\"" + devPkcs8 + "\"}");
            ReflectionTestUtils.setField(p, "serverAddress", "0.0.0.0");
            ReflectionTestUtils.invokeMethod(p, "init");
            assertThrows(IllegalStateException.class, p::rejectCommittedDevKeyOnNetwork);
        }

        @Test
        @DisplayName("새로 만든 키링이면 어느 주소에 바인딩해도 막지 않는다")
        void freshKeyringIsNotRestrictedByBinding() throws Exception {
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
            kpg.initialize(new ECGenParameterSpec("secp256r1"));
            String pkcs8 = Base64.getEncoder().encodeToString(kpg.generateKeyPair().getPrivate().getEncoded());
            JwtTokenProvider p = new JwtTokenProvider();
            ReflectionTestUtils.setField(p, "signingActiveKid", "k1");
            ReflectionTestUtils.setField(p, "signingKeysJson", "{\"k1\":\"" + pkcs8 + "\"}");
            ReflectionTestUtils.setField(p, "serverAddress", "0.0.0.0");
            ReflectionTestUtils.invokeMethod(p, "init");
            assertDoesNotThrow(p::rejectCommittedDevKeyOnNetwork);
        }

        @Test
        @DisplayName("판정은 기본 웹 서버가 바인딩될 때 한다 — 관리 포트 같은 보조 서버의 이벤트는 보지 않는다")
        void judgesOnlyTheMainWebServer() {
            JwtTokenProvider p = devKeyProvider("0.0.0.0", false);
            var mainContext = mock(org.springframework.boot.web.server.context.WebServerApplicationContext.class);
            var management = mock(org.springframework.boot.web.server.context.WebServerApplicationContext.class);
            when(mainContext.getServerNamespace()).thenReturn(null);
            when(management.getServerNamespace()).thenReturn("management");
            var mainEvent = mock(org.springframework.boot.web.server.context.WebServerInitializedEvent.class);
            var managementEvent = mock(org.springframework.boot.web.server.context.WebServerInitializedEvent.class);
            when(mainEvent.getApplicationContext()).thenReturn(mainContext);
            when(managementEvent.getApplicationContext()).thenReturn(management);

            assertDoesNotThrow(() -> p.onWebServerInitialized(managementEvent));
            assertThrows(IllegalStateException.class, () -> p.onWebServerInitialized(mainEvent));
        }
    }

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
                .verifyWith(jwtTokenProvider.getActiveVerifyKeyForTest())
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
        // 제공자가 쓰는 개발용 키로 서명해 typ 클레임 없는 토큰을 만든다.
        String legacy = devSigned(io.jsonwebtoken.Jwts.builder()
                .subject("testuser")
                .issuedAt(new java.util.Date())
                .expiration(new java.util.Date(System.currentTimeMillis() + 60_000)));

        assertThat(jwtTokenProvider.validateToken(legacy)).isTrue();
        assertThat(jwtTokenProvider.validateRefreshToken(legacy)).isTrue();
    }

    @Test
    @DisplayName("토큰에서 인증 정보 조회 성공")
    void getAuthentication_success() {
        String token = jwtTokenProvider.createAccessToken("testuser", "ROLE_USER");
        UserDetails userDetails = mock(UserDetails.class);
        when(userDetails.isAccountNonLocked()).thenReturn(true);
        when(userDetails.isAccountNonExpired()).thenReturn(true);
        when(userDetails.isCredentialsNonExpired()).thenReturn(true);
        when(userDetails.isEnabled()).thenReturn(true);
        when(userDetails.getAuthorities()).thenReturn(Collections.emptyList());
        when(userDetailsService.loadUserByUsername("testuser")).thenReturn(userDetails);
        
        Authentication authentication = jwtTokenProvider.getAuthentication(token);
        assertThat(authentication).isNotNull();
        assertThat(authentication.getPrincipal()).isEqualTo(userDetails);
    }

    @Test
    void existingJwtUsesCurrentPermissionsAfterRevocationInsteadOfItsRoleClaim() {
        String token = jwtTokenProvider.createAccessToken("subject", "ROLE_ADMIN");
        var initial = nuri.foundation.security.service.CustomUserDetails.builder()
                .esntlId("subject").enabled(true).groups(java.util.List.of("CONTENT"))
                .permissions(java.util.List.of("CONTENT_EDIT")).authorizationVersion("before").build();
        var revoked = nuri.foundation.security.service.CustomUserDetails.builder()
                .esntlId("subject").enabled(true).groups(java.util.List.of())
                .permissions(java.util.List.of()).authorizationVersion("after").build();
        when(userDetailsService.loadUserByUsername("subject")).thenReturn(initial, revoked);

        assertThat(jwtTokenProvider.getAuthentication(token).getAuthorities())
                .extracting(org.springframework.security.core.GrantedAuthority::getAuthority)
                .containsExactly("CONTENT_EDIT");
        assertThat(jwtTokenProvider.getAuthentication(token).getAuthorities()).isEmpty();
        org.mockito.Mockito.verify(userDetailsService, org.mockito.Mockito.times(2)).loadUserByUsername("subject");
    }

    @Test
    void existingJwtIsRejectedWhenTheCurrentAccountIsDisabledOrLocked() {
        String token = jwtTokenProvider.createAccessToken("subject", "ROLE_ADMIN");
        var disabled = nuri.foundation.security.service.CustomUserDetails.builder()
                .esntlId("subject").enabled(false).lockAt("N").build();
        var locked = nuri.foundation.security.service.CustomUserDetails.builder()
                .esntlId("subject").enabled(true).lockAt("Y").build();
        when(userDetailsService.loadUserByUsername("subject")).thenReturn(disabled, locked);

        assertThrows(org.springframework.security.authentication.DisabledException.class,
                () -> jwtTokenProvider.getAuthentication(token));
        assertThrows(org.springframework.security.authentication.LockedException.class,
                () -> jwtTokenProvider.getAuthentication(token));
    }

    /**
     * [2026-09-14 DEC-OPS-094] 비밀번호를 바꾸면 그 전에 발급된 access token 은 만료 전이라도 거부한다.
     * JWT 발급 시각은 초 단위로 내림 저장되므로 같은 초의 토큰은 통과시키는 경계를 함께 고정한다.
     */
    @Nested
    @DisplayName("비밀번호 변경 전 발급 토큰 거부")
    class CredentialChange {
        private final java.time.Instant changedAt = java.time.Instant.parse("2026-09-14T01:00:00.700Z");

        private String accessTokenIssuedAt(java.time.Instant issuedAt) {
            var builder = Jwts.builder().subject("subject").claim("typ", "access")
                    .expiration(new Date(System.currentTimeMillis() + 3_600_000L));
            if (issuedAt != null) builder.issuedAt(Date.from(issuedAt));
            return devSigned(builder);
        }

        private void currentAccount(java.time.Instant credentialsChangedAt) {
            when(userDetailsService.loadUserByUsername("subject")).thenReturn(
                    nuri.foundation.security.service.CustomUserDetails.builder()
                            .esntlId("subject").enabled(true).lockAt("N")
                            .credentialsChangedAt(credentialsChangedAt).build());
        }

        @Test
        @DisplayName("변경 전 초에 발급된 토큰은 거부한다")
        void rejectsTokenIssuedBeforeChange() {
            currentAccount(changedAt);
            String token = accessTokenIssuedAt(java.time.Instant.parse("2026-09-14T00:59:59Z"));

            assertThrows(org.springframework.security.authentication.CredentialsExpiredException.class,
                    () -> jwtTokenProvider.getAuthentication(token));
        }

        @Test
        @DisplayName("같은 초·이후에 발급된 토큰은 통과한다 — 변경 직후 다시 로그인한 토큰을 끊지 않는다")
        void acceptsTokenIssuedInTheSameSecondOrLater() {
            currentAccount(changedAt);

            assertThat(jwtTokenProvider.getAuthentication(accessTokenIssuedAt(java.time.Instant.parse("2026-09-14T01:00:00Z")))).isNotNull();
            assertThat(jwtTokenProvider.getAuthentication(accessTokenIssuedAt(java.time.Instant.parse("2026-09-14T01:00:01Z")))).isNotNull();
        }

        @Test
        @DisplayName("변경 시각을 모르면 이 기준으로 거부하지 않는다")
        void acceptsWhenChangeTimeUnknown() {
            currentAccount(null);

            assertThat(jwtTokenProvider.getAuthentication(accessTokenIssuedAt(java.time.Instant.parse("2020-01-01T00:00:00Z")))).isNotNull();
        }

        @Test
        @DisplayName("변경 시각이 있는데 발급 시각이 없는 토큰은 판정할 수 없으므로 거부한다")
        void rejectsTokenWithoutIssuedAtWhenChangeTimeKnown() {
            currentAccount(changedAt);

            assertThrows(org.springframework.security.authentication.CredentialsExpiredException.class,
                    () -> jwtTokenProvider.getAuthentication(accessTokenIssuedAt(null)));
        }
    }

    /**
     * [2026-10-18] 로그아웃하면 그 전에 발급된 access token 은 만료 전이라도 거부한다. 비밀번호 변경과 같은 비교다 —
     * 로그아웃 시각을 초로 내리므로 로그아웃한 그 초 안에 다시 로그인해 받은 토큰은 통과한다.
     */
    @Nested
    @DisplayName("로그아웃 전 발급 토큰 거부")
    class Logout {
        private final java.time.Instant loggedOutAt = java.time.Instant.parse("2026-10-18T01:00:00.700Z");

        private String accessTokenIssuedAt(java.time.Instant issuedAt) {
            var builder = Jwts.builder().subject("subject").claim("typ", "access")
                    .expiration(new Date(System.currentTimeMillis() + 3_600_000L));
            if (issuedAt != null) builder.issuedAt(Date.from(issuedAt));
            return devSigned(builder);
        }

        private void currentAccount(java.time.Instant lastLogoutAt, java.time.Instant credentialsChangedAt) {
            when(userDetailsService.loadUserByUsername("subject")).thenReturn(
                    nuri.foundation.security.service.CustomUserDetails.builder()
                            .esntlId("subject").enabled(true).lockAt("N")
                            .credentialsChangedAt(credentialsChangedAt).lastLogoutAt(lastLogoutAt).build());
        }

        @Test
        @DisplayName("로그아웃 전 초에 발급된 토큰은 거부한다")
        void rejectsTokenIssuedBeforeLogout() {
            currentAccount(loggedOutAt, null);

            var rejected = assertThrows(org.springframework.security.authentication.CredentialsExpiredException.class,
                    () -> jwtTokenProvider.getAuthentication(accessTokenIssuedAt(java.time.Instant.parse("2026-10-18T00:59:59Z"))));
            assertThat(rejected.getMessage()).contains("logout");
        }

        @Test
        @DisplayName("로그아웃한 초·이후에 발급된 토큰은 통과한다 — 로그아웃 직후 다시 로그인한 토큰을 끊지 않는다")
        void acceptsTokenIssuedInTheSameSecondOrLater() {
            currentAccount(loggedOutAt, null);

            assertThat(jwtTokenProvider.getAuthentication(accessTokenIssuedAt(java.time.Instant.parse("2026-10-18T01:00:00Z")))).isNotNull();
            assertThat(jwtTokenProvider.getAuthentication(accessTokenIssuedAt(java.time.Instant.parse("2026-10-18T01:00:01Z")))).isNotNull();
        }

        @Test
        @DisplayName("로그아웃한 적이 없으면 이 기준으로 거부하지 않는다")
        void acceptsWhenNeverLoggedOut() {
            currentAccount(null, null);

            assertThat(jwtTokenProvider.getAuthentication(accessTokenIssuedAt(java.time.Instant.parse("2020-01-01T00:00:00Z")))).isNotNull();
        }

        @Test
        @DisplayName("로그아웃 시각이 있는데 발급 시각이 없는 토큰은 판정할 수 없으므로 거부한다")
        void rejectsTokenWithoutIssuedAtWhenLoggedOut() {
            currentAccount(loggedOutAt, null);

            assertThrows(org.springframework.security.authentication.CredentialsExpiredException.class,
                    () -> jwtTokenProvider.getAuthentication(accessTokenIssuedAt(null)));
        }

        @Test
        @DisplayName("비밀번호 변경보다 나중의 로그아웃이 기준이다 — 두 기준 중 늦은 쪽 전에 발급된 토큰은 거부한다")
        void laterOfLogoutAndCredentialChangeWins() {
            currentAccount(loggedOutAt, java.time.Instant.parse("2026-10-17T00:00:00Z"));

            assertThrows(org.springframework.security.authentication.CredentialsExpiredException.class,
                    () -> jwtTokenProvider.getAuthentication(accessTokenIssuedAt(java.time.Instant.parse("2026-10-18T00:30:00Z"))));
        }
    }

    /**
     * [V2_153] 세션차수. 토큰은 발급 때의 차수를 담고, 사용자의 현재 차수와 다르면 거부한다 — 비밀번호 변경·잠금·권한 그룹 회수·강제
     * 로그아웃이 차수를 올린다. 차수를 담지 않은 이전 토큰은 0 으로 읽어 배포 직후 기존 세션을 끊지 않는다.
     */
    @Nested
    @DisplayName("세션차수가 바뀐 토큰 거부")
    class SessionCycle {
        private void currentCycle(Integer cycle) {
            when(userDetailsService.loadUserByUsername("subject")).thenReturn(
                    nuri.foundation.security.service.CustomUserDetails.builder()
                            .esntlId("subject").enabled(true).lockAt("N").sessionCycle(cycle).build());
        }

        @Test
        @DisplayName("🚨 차수가 오른 뒤에는 그 전에 발급된 access token 을 거부한다(401 경로)")
        void rejectsAccessTokenIssuedBeforeRevocation() {
            String token = jwtTokenProvider.createAccessToken("subject", "ROLE_USER", null, null, 3);
            currentCycle(4);

            var rejected = assertThrows(org.springframework.security.authentication.CredentialsExpiredException.class,
                    () -> jwtTokenProvider.getAuthentication(token));
            assertThat(rejected.getMessage()).contains("revoked");
        }

        @Test
        @DisplayName("차수가 같으면 통과하고, 토큰의 차수를 그대로 읽는다(access·refresh)")
        void acceptsMatchingCycle() {
            currentCycle(3);
            assertThat(jwtTokenProvider.getAuthentication(
                    jwtTokenProvider.createAccessToken("subject", "ROLE_USER", null, null, 3))).isNotNull();
            assertThat(jwtTokenProvider.getSessionCycle(jwtTokenProvider.createRefreshToken("subject", null, null, 3)))
                    .isEqualTo(3);
        }

        @Test
        @DisplayName("차수를 담지 않은 이전 토큰은 0 이다 — 한 번도 끊지 않은 계정의 기존 세션은 이어지고, 끊은 계정은 거부한다")
        void tokenWithoutCycleReadsAsZero() {
            String legacy = jwtTokenProvider.createAccessToken("subject", "ROLE_USER");
            assertThat(jwtTokenProvider.getSessionCycle(legacy)).isZero();
            currentCycle(0);
            assertThat(jwtTokenProvider.getAuthentication(legacy)).isNotNull();
            currentCycle(1);
            assertThrows(org.springframework.security.authentication.CredentialsExpiredException.class,
                    () -> jwtTokenProvider.getAuthentication(legacy));
        }

        @Test
        @DisplayName("현재 차수를 모르는 주체(차수를 읽지 않는 어댑터)는 이 기준으로 거부하지 않는다")
        void unknownCurrentCycleDoesNotReject() {
            currentCycle(null);
            assertThat(jwtTokenProvider.getAuthentication(
                    jwtTokenProvider.createAccessToken("subject", "ROLE_USER", null, null, 9))).isNotNull();
        }
    }

    @Test
    @DisplayName("잘못된 형식 토큰 검증 실패 (Malformed)")
    void validateToken_Malformed_fail() {
        String invalidToken = "invalidToken.invalid.invalid";
        assertThat(jwtTokenProvider.validateToken(invalidToken)).isFalse();
    }

    @Test
    @DisplayName("서명 오류 토큰 검증 실패 (Signature)")
    void validateToken_Signature_fail() throws Exception {
        // 같은 kid 를 달고 다른 P-256 키로 사인된 토큰
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"));
        String otherKeyToken = Jwts.builder()
                .header().keyId("dev-es256-1").and()
                .subject("testuser")
                .signWith(kpg.generateKeyPair().getPrivate(), Jwts.SIG.ES256)
                .compact();
        assertThat(jwtTokenProvider.validateToken(otherKeyToken)).isFalse();
    }

    @Test
    @DisplayName("만료된 토큰 검증 실패 (Expired)")
    void validateToken_Expired_fail() {
        String expiredToken = devSigned(Jwts.builder()
                .subject("testuser")
                .issuedAt(new Date(System.currentTimeMillis() - 2000))
                .expiration(new Date(System.currentTimeMillis() - 1000)));
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
        String token = jwtTokenProvider.createRefreshToken("cookie-test-user");
        jwtTokenProvider.addRefreshTokenCookie(response, token);
        
        String setCookieHeader = response.getHeader(org.springframework.http.HttpHeaders.SET_COOKIE);
        assertThat(setCookieHeader).isNotNull();
        assertThat(setCookieHeader).contains("refreshToken=" + token);
        assertThat(setCookieHeader).contains("HttpOnly");
        assertThat(setCookieHeader).contains("SameSite=Strict");
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(longs = {120000L, 604800000L, 1209600000L})
    @DisplayName("회전 토큰 쿠키는 설정 수명이 아니라 실제 절대 만료까지의 남은 시간만 유지한다")
    void refreshCookieCannotExtendRotatedTokenLifetime(long configuredValidityMs) {
        ReflectionTestUtils.setField(jwtTokenProvider, "refreshTokenValidityInMilliseconds", configuredValidityMs);
        String rotated = jwtTokenProvider.createRefreshToken("cookie-test-user",
                new Date(System.currentTimeMillis() + 60_000));
        long expiryMs = jwtTokenProvider.getExpiration(rotated).getTime();
        long before = System.currentTimeMillis();
        MockHttpServletResponse response = new MockHttpServletResponse();

        jwtTokenProvider.addRefreshTokenCookie(response, rotated);

        long after = System.currentTimeMillis();
        var matcher = java.util.regex.Pattern.compile("Max-Age=(\\d+)")
                .matcher(response.getHeader(org.springframework.http.HttpHeaders.SET_COOKIE));
        assertThat(matcher.find()).isTrue();
        assertThat(Long.parseLong(matcher.group(1)))
                .isBetween(Math.max(0, (expiryMs - after) / 1000), Math.max(0, (expiryMs - before) / 1000));
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

    // ─────────────────────────────────────────────────────────────────────────
    // [2026-08-09 뮤테이션 보강] 이 클래스에 9개가 살아 있었다.
    //
    //   가장 무거운 것은 **validateRefreshToken 이 전량 NO_COVERAGE** 였다는 점이다.
    //   `return true` 로 바꿔도 아무도 모른다 — 즉 **어떤 토큰이든 재발급 검증을 통과**한다.
    //   앞서 AuthServiceImpl 테스트에서 이 메서드를 검증했다고 볼 수도 있으나,
    //   거기서는 **목(mock)으로 대체**했으므로 구현 자체는 한 번도 실행되지 않았다.
    //   "호출부는 테스트했는데 구현은 아무도 안 봤다" 는 이 저장소에서 반복된 형태다.
    // ─────────────────────────────────────────────────────────────────────────

    /** 같은 kid 에 다른 P-256 서명키로 초기화된 별도 제공자 — 서명 비대칭 상황을 만든다. */
    private JwtTokenProvider providerWithOtherSecret() {
        try {
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
            kpg.initialize(new ECGenParameterSpec("secp256r1"));
            String otherPkcs8 = Base64.getEncoder().encodeToString(kpg.generateKeyPair().getPrivate().getEncoded());
            JwtTokenProvider other = new JwtTokenProvider();
            ReflectionTestUtils.setField(other, "signingActiveKid", "dev-es256-1");
            ReflectionTestUtils.setField(other, "signingKeysJson", "{\"dev-es256-1\":\"" + otherPkcs8 + "\"}");
            ReflectionTestUtils.setField(other, "cookieSecure", false);
            ReflectionTestUtils.invokeMethod(other, "init");
            return other;
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @Nested
    @DisplayName("리프레시 토큰 검증 [W1-06]")
    class RefreshTokenValidation {

        @Test
        @DisplayName("정상 리프레시 토큰은 통과한다")
        void acceptsValidRefreshToken() {
            String refresh = jwtTokenProvider.createRefreshToken("USR_001");

            assertTrue(jwtTokenProvider.validateRefreshToken(refresh));
        }

        @Test
        @DisplayName("액세스 토큰을 재발급 자리에 제시하면 거부한다 — 반대 방향 차단")
        void rejectsAccessTokenAtRefreshSlot() {
            String access = jwtTokenProvider.createAccessToken("USR_001", "ROLE_USER");

            // 이것이 W1-06 의 핵심이다. `return true` 뮤턴트가 여기서 죽는다 —
            //   통과시키면 수명이 짧은 액세스 토큰으로 무한 재발급이 가능해진다.
            assertFalse(jwtTokenProvider.validateRefreshToken(access));
        }

        @Test
        @DisplayName("서명이 다른 토큰은 거부한다")
        void rejectsTokenSignedWithAnotherSecret() {
            String foreign = providerWithOtherSecret().createRefreshToken("USR_001");

            // 서명 검증을 건너뛰면 **아무나 발급한 토큰으로 세션을 얻는다.**
            assertFalse(jwtTokenProvider.validateRefreshToken(foreign));
        }

        @Test
        @DisplayName("깨진 토큰과 빈 값은 예외 없이 거부한다")
        void rejectsMalformedInput() {
            assertFalse(jwtTokenProvider.validateRefreshToken("not-a-jwt"));
            assertFalse(jwtTokenProvider.validateRefreshToken(""));
            assertFalse(jwtTokenProvider.validateRefreshToken(null));
        }

        @Test
        @DisplayName("만료된 리프레시 토큰은 거부한다")
        void rejectsExpiredRefreshToken() {
            // 절대만료를 과거로 주어 즉시 만료된 토큰을 만든다.
            String expired = jwtTokenProvider.createRefreshToken(
                    "USR_001", new java.util.Date(System.currentTimeMillis() - 1000));

            assertFalse(jwtTokenProvider.validateRefreshToken(expired));
        }
    }

    @Nested
    @DisplayName("만료 시각 조회")
    class ExpirationLookup {

        @Test
        @DisplayName("발급 시 지정한 절대만료를 그대로 돌려준다 — 회전 시 물려주는 값이다")
        void returnsAbsoluteExpiry() {
            java.util.Date target = new java.util.Date(System.currentTimeMillis() + 3600000L);
            String refresh = jwtTokenProvider.createRefreshToken("USR_001", target);

            java.util.Date actual = jwtTokenProvider.getExpiration(refresh);

            // null 을 돌려주는 뮤턴트가 여기서 죽는다. 이 값이 틀리면 토큰 회전이
            //   슬라이딩 세션이 되어 탈취 토큰이 무기한 연장된다(W1-06 이 막으려던 것).
            assertNotNull(actual);
            assertEquals(target.getTime() / 1000, actual.getTime() / 1000);
        }

        @Test
        @DisplayName("서명이 다른 토큰의 만료는 읽지 않는다")
        void refusesForeignToken() {
            String foreign = providerWithOtherSecret().createRefreshToken("USR_001");

            assertThrows(Exception.class, () -> jwtTokenProvider.getExpiration(foreign));
        }
    }

    @Nested
    @DisplayName("쿠키에서 리프레시 토큰 꺼내기")
    class RefreshCookieResolution {

        @Test
        @DisplayName("refreshToken 쿠키만 골라낸다")
        void picksOnlyRefreshTokenCookie() {
            jakarta.servlet.http.HttpServletRequest request =
                    org.mockito.Mockito.mock(jakarta.servlet.http.HttpServletRequest.class);
            org.mockito.Mockito.when(request.getCookies()).thenReturn(new jakarta.servlet.http.Cookie[] {
                    new jakarta.servlet.http.Cookie("accessToken", "AAA"),
                    new jakarta.servlet.http.Cookie("refreshToken", "RRR"),
                    new jakarta.servlet.http.Cookie("XSRF-TOKEN", "XXX"),
            });

            // 필터 조건을 항상 참으로 바꾼 뮤턴트는 첫 쿠키(accessToken)를 돌려주어 여기서 죽는다.
            //   액세스 토큰을 리프레시로 오인하면 재발급이 통째로 어긋난다.
            assertEquals("RRR", jwtTokenProvider.resolveRefreshToken(request));
        }

        @Test
        @DisplayName("해당 쿠키가 없거나 쿠키 자체가 없으면 null 이다")
        void returnsNullWhenAbsent() {
            jakarta.servlet.http.HttpServletRequest none =
                    org.mockito.Mockito.mock(jakarta.servlet.http.HttpServletRequest.class);
            org.mockito.Mockito.when(none.getCookies()).thenReturn(null);
            assertNull(jwtTokenProvider.resolveRefreshToken(none));

            jakarta.servlet.http.HttpServletRequest other =
                    org.mockito.Mockito.mock(jakarta.servlet.http.HttpServletRequest.class);
            org.mockito.Mockito.when(other.getCookies()).thenReturn(new jakarta.servlet.http.Cookie[] {
                    new jakarta.servlet.http.Cookie("accessToken", "AAA"),
            });
            assertNull(jwtTokenProvider.resolveRefreshToken(other));
        }
    }

    @Nested
    @DisplayName("기동 시점 설정 검증")
    class StartupValidation {

        @Test
        @DisplayName("토큰 수명이 0 이하면 기동을 실패시킨다")
        void rejectsNonPositiveValidity() {
            // 0 이면 토큰이 발급 즉시 만료돼 "로그인은 되는데 곧바로 /login" 이라는
            //   원인을 알 수 없는 증상이 된다. 조용히 통과시키면 안 된다.
            for (long[] pair : new long[][] { { 0L, 1000L }, { 1000L, 0L }, { -1L, 1000L } }) {
                JwtTokenProvider p = new JwtTokenProvider();
                ReflectionTestUtils.setField(p, "accessTokenValidityInMilliseconds", pair[0]);
                ReflectionTestUtils.setField(p, "refreshTokenValidityInMilliseconds", pair[1]);
                assertThrows(IllegalStateException.class,
                        () -> ReflectionTestUtils.invokeMethod(p, "init"));
            }
        }

        @Test
        @DisplayName("경계: 수명이 1ms 면 통과한다")
        void acceptsSmallestPositiveValidity() {
            // `<= 0` 의 경계를 옮긴 뮤턴트가 여기서 죽는다.
            JwtTokenProvider p = new JwtTokenProvider();
            ReflectionTestUtils.setField(p, "accessTokenValidityInMilliseconds", 1L);
            ReflectionTestUtils.setField(p, "refreshTokenValidityInMilliseconds", 1L);
            assertDoesNotThrow(() -> ReflectionTestUtils.invokeMethod(p, "init"));
        }

        @Test
        @DisplayName("공개키 지문은 8자 16진이고 키마다 다르다 — 백엔드·Next 키링 대조의 계약이다")
        void verifyKeyFingerprintIsEightHexAndKeySpecific() {
            String fp = jwtTokenProvider.getVerifyKeyFingerprints().get("dev-es256-1");
            assertNotNull(fp);
            assertTrue(fp.matches("[0-9a-f]{8}"), "16진 소문자 8자여야 한다: " + fp);
            assertNotEquals(fp, providerWithOtherSecret().getVerifyKeyFingerprints().get("dev-es256-1"));
        }
    }

    @Nested
    @DisplayName("ADR-0060 비대칭 ES256 서명·키링·전환 검증")
    class AsymmetricEs256Signing {

        private KeyPair generateEcKeyPair(String curve) throws Exception {
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
            kpg.initialize(new ECGenParameterSpec(curve));
            return kpg.generateKeyPair();
        }

        private JwtTokenProvider providerWith(String activeKid, String keysJson, String profiles) {
            JwtTokenProvider p = new JwtTokenProvider();
            ReflectionTestUtils.setField(p, "signingActiveKid", activeKid);
            ReflectionTestUtils.setField(p, "signingKeysJson", keysJson);
            ReflectionTestUtils.setField(p, "activeProfiles", profiles);
            ReflectionTestUtils.invokeMethod(p, "init");
            return p;
        }

        @Test
        @DisplayName("dev 기본 키링은 ES256·dev-es256-1 kid 로 발급하고 Node 와 동일한 SPKI 지문을 계산한다")
        void issuesEs256WithKidAndExpectedFingerprint() {
            assertEquals("dev-es256-1", jwtTokenProvider.getActiveKidForTest());
            assertEquals("3989a5f1", jwtTokenProvider.getVerifyKeyFingerprints().get("dev-es256-1"));

            String access = jwtTokenProvider.createAccessToken("alice", "ROLE_USER");
            String refresh = jwtTokenProvider.createRefreshToken("alice");

            var parsedAccess = Jwts.parser()
                    .verifyWith(jwtTokenProvider.getActiveVerifyKeyForTest())
                    .build()
                    .parseSignedClaims(access);
            assertEquals("ES256", parsedAccess.getHeader().getAlgorithm());
            assertEquals("dev-es256-1", parsedAccess.getHeader().getKeyId());

            assertTrue(jwtTokenProvider.validateToken(access));
            assertTrue(jwtTokenProvider.validateRefreshToken(refresh));
            assertEquals("alice", jwtTokenProvider.getUserId(access));
        }

        @Test
        @DisplayName("키 회전 중에는 이전 kid 키가 키링에 남아 있으면 검증되고 제거하면 거부된다")
        void keyRotationAcceptsPreviousKidWhilePresentAndRejectsAfterRemoval() throws Exception {
            KeyPair oldKp = generateEcKeyPair("secp256r1");
            KeyPair newKp = generateEcKeyPair("secp256r1");
            String oldB64 = Base64.getEncoder().encodeToString(oldKp.getPrivate().getEncoded());
            String newB64 = Base64.getEncoder().encodeToString(newKp.getPrivate().getEncoded());

            JwtTokenProvider oldIssuer = providerWith("k1", "{\"k1\":\"" + oldB64 + "\"}", "");
            String oldToken = oldIssuer.createAccessToken("bob", "ROLE_USER");

            JwtTokenProvider rotated = providerWith(
                    "k2", "{\"k1\":\"" + oldB64 + "\",\"k2\":\"" + newB64 + "\"}", "");
            assertTrue(rotated.validateToken(oldToken));
            String newToken = rotated.createAccessToken("bob", "ROLE_USER");
            assertTrue(rotated.validateToken(newToken));

            JwtTokenProvider trimmed = providerWith("k2", "{\"k2\":\"" + newB64 + "\"}", "");
            assertFalse(trimmed.validateToken(oldToken));
            assertTrue(trimmed.validateToken(newToken));
        }

        @Test
        @DisplayName("ES256 kid 누락·미등록 kid·alg=none·RS256 토큰은 모두 거부한다")
        void rejectsUnknownKidMissingKidAndDisallowedAlgorithms() throws Exception {
            String missingKid = Jwts.builder()
                    .subject("alice")
                    .claim("typ", "access")
                    .issuedAt(new Date())
                    .expiration(new Date(System.currentTimeMillis() + 60_000))
                    .compact();
            assertFalse(jwtTokenProvider.validateToken(missingKid));

            KeyPair other = generateEcKeyPair("secp256r1");
            String unknownKidToken = Jwts.builder()
                    .header().keyId("unknown-kid").and()
                    .subject("alice")
                    .claim("typ", "access")
                    .issuedAt(new Date())
                    .expiration(new Date(System.currentTimeMillis() + 60_000))
                    .signWith(other.getPrivate(), Jwts.SIG.ES256)
                    .compact();
            assertFalse(jwtTokenProvider.validateToken(unknownKidToken));

            String esNoKid = Jwts.builder()
                    .subject("alice")
                    .claim("typ", "access")
                    .issuedAt(new Date())
                    .expiration(new Date(System.currentTimeMillis() + 60_000))
                    .signWith(other.getPrivate(), Jwts.SIG.ES256)
                    .compact();
            assertFalse(jwtTokenProvider.validateToken(esNoKid));

            KeyPairGenerator rsaGen = KeyPairGenerator.getInstance("RSA");
            rsaGen.initialize(2048);
            KeyPair rsa = rsaGen.generateKeyPair();
            String rs256Token = Jwts.builder()
                    .header().keyId("dev-es256-1").and()
                    .subject("alice")
                    .claim("typ", "access")
                    .issuedAt(new Date())
                    .expiration(new Date(System.currentTimeMillis() + 60_000))
                    .signWith(rsa.getPrivate(), Jwts.SIG.RS256)
                    .compact();
            assertFalse(jwtTokenProvider.validateToken(rs256Token));
        }

        @Test
        @org.junit.jupiter.api.extension.ExtendWith(org.springframework.boot.test.system.OutputCaptureExtension.class)
        @DisplayName("헤더 kid 에 개행을 넣은 미인증 토큰은 거부하고 가짜 로그 줄을 만들지 못한다")
        void forgedKidCannotInjectLogLines(org.springframework.boot.test.system.CapturedOutput output) throws Exception {
            KeyPair other = generateEcKeyPair("secp256r1");
            String forged = Jwts.builder()
                    .header().keyId("x\r\nFORGED-LOG-LINE level=INFO").and()
                    .subject("alice")
                    .claim("typ", "access")
                    .issuedAt(new Date())
                    .expiration(new Date(System.currentTimeMillis() + 60_000))
                    .signWith(other.getPrivate(), Jwts.SIG.ES256)
                    .compact();

            assertFalse(jwtTokenProvider.validateToken(forged));

            assertThat(output.getAll()).contains("Unknown ES256 kid: x__FORGED-LOG-LINE");
            assertThat(output.getAll()).doesNotContain("\nFORGED-LOG-LINE").doesNotContain("\rFORGED-LOG-LINE");
        }

        @Test
        @DisplayName("🚨 ADR-0060 2차: HMAC(HS256·HS384·HS512) 토큰은 비밀을 알아도 늘 거부하고 ES256 만 통과한다")
        void rejectsEveryHmacSignedToken() {
            // 2차 배포 전 Next 가 가졌던 것과 같은 꼴(HS512 에 충분한 길이)의 공유 비밀이다 — 이런 비밀로 만든 토큰은 이제 어디서도 받지 않는다.
            byte[] formerSharedSecret = "former-shared-hmac-secret-of-the-first-deployment-padding-to-64-bytes!!"
                    .getBytes(java.nio.charset.StandardCharsets.UTF_8);
            for (var alg : java.util.List.of(Jwts.SIG.HS256, Jwts.SIG.HS384, Jwts.SIG.HS512)) {
                String hmac = Jwts.builder()
                        .subject("admin")
                        .claim("typ", "access")
                        .issuedAt(new Date())
                        .expiration(new Date(System.currentTimeMillis() + 60_000))
                        .signWith(Keys.hmacShaKeyFor(formerSharedSecret), alg)
                        .compact();
                assertFalse(jwtTokenProvider.validateToken(hmac), alg.getId() + " 토큰은 거부돼야 한다");
                assertFalse(jwtTokenProvider.validateRefreshToken(hmac), alg.getId() + " 재발급 토큰도 거부돼야 한다");
            }
            assertTrue(jwtTokenProvider.validateToken(jwtTokenProvider.createAccessToken("es-user", "ROLE_USER")));
        }

        @Test
        @DisplayName("키링 반쪽 설정·prod 누락·prod 커밋 dev 서명키·비P-256 키는 기동을 거부한다")
        void rejectsInvalidOrCommittedDevAsymmetricKeyring() throws Exception {
            KeyPair ecKp = generateEcKeyPair("secp256r1");
            String ecB64 = Base64.getEncoder().encodeToString(ecKp.getPrivate().getEncoded());

            assertThrows(IllegalStateException.class,
                    () -> providerWith("only-kid", "", ""));
            assertThrows(IllegalStateException.class,
                    () -> providerWith("", "{\"only-kid\":\"" + ecB64 + "\"}", ""));

            JwtTokenProvider prodNoEc = new JwtTokenProvider();
            ReflectionTestUtils.setField(prodNoEc, "activeProfiles", "prod");
            assertThrows(IllegalStateException.class, () -> ReflectionTestUtils.invokeMethod(prodNoEc, "init"));

            String devPkcs8 = (String) ReflectionTestUtils.getField(JwtTokenProvider.class, "DEV_ES256_PKCS8_B64");
            JwtTokenProvider prodDevEc = new JwtTokenProvider();
            ReflectionTestUtils.setField(prodDevEc, "signingActiveKid", "dev-es256-1");
            ReflectionTestUtils.setField(prodDevEc, "signingKeysJson", "{\"dev-es256-1\":\"" + devPkcs8 + "\"}");
            ReflectionTestUtils.setField(prodDevEc, "activeProfiles", "prod");
            assertThrows(IllegalStateException.class, () -> ReflectionTestUtils.invokeMethod(prodDevEc, "init"));

            KeyPair p384 = generateEcKeyPair("secp384r1");
            String p384B64 = Base64.getEncoder().encodeToString(p384.getPrivate().getEncoded());
            assertThrows(IllegalStateException.class,
                    () -> providerWith("p384", "{\"p384\":\"" + p384B64 + "\"}", ""));
            assertThrows(IllegalStateException.class,
                    () -> providerWith("bad", "not-json", ""));
            assertThrows(IllegalStateException.class,
                    () -> providerWith("missing", "{\"other\":\"" + ecB64 + "\"}", ""));
            assertThrows(IllegalStateException.class,
                    () -> providerWith("badb64", "{\"badb64\":\"not-valid-base64!!!\"}", ""));

            JwtTokenProvider envProdNoEc = new JwtTokenProvider();
            var mockEnv = new org.springframework.mock.env.MockEnvironment();
            mockEnv.setActiveProfiles("prod");
            ReflectionTestUtils.setField(envProdNoEc, "environment", mockEnv);
            assertThrows(IllegalStateException.class, () -> ReflectionTestUtils.invokeMethod(envProdNoEc, "init"));
        }

        @Test
        @DisplayName("authenticateAccessToken 은 단일 파싱으로 검증·인증하고 리프레시·불량 토큰에는 사용자 조회 없이 null 을 반환한다")
        void authenticateAccessTokenSingleParseAndCachingContract() {
            var userDetails = org.springframework.security.core.userdetails.User.withUsername("alice")
                    .password("x")
                    .authorities("ROLE_USER")
                    .build();
            when(userDetailsService.loadUserByUsername("alice")).thenReturn(userDetails);

            String accessToken = jwtTokenProvider.createAccessToken("alice", "ROLE_USER");
            Authentication auth = jwtTokenProvider.authenticateAccessToken(accessToken);
            assertThat(auth).isNotNull();
            assertThat(auth.getName()).isEqualTo("alice");
            org.mockito.Mockito.verify(userDetailsService, org.mockito.Mockito.times(1)).loadUserByUsername("alice");

            String refreshToken = jwtTokenProvider.createRefreshToken("alice");
            assertThat(jwtTokenProvider.authenticateAccessToken(refreshToken)).isNull();
            assertThat(jwtTokenProvider.authenticateAccessToken("not-a-jwt")).isNull();
            assertThat(jwtTokenProvider.authenticateAccessToken(null)).isNull();
            assertThat(jwtTokenProvider.authenticateAccessToken("   ")).isNull();
            org.mockito.Mockito.verifyNoMoreInteractions(userDetailsService);

            Object parser1 = ReflectionTestUtils.invokeMethod(jwtTokenProvider, "jwtParser");
            Object parser2 = ReflectionTestUtils.invokeMethod(jwtTokenProvider, "jwtParser");
            assertThat(parser1).isNotNull().isSameAs(parser2);
        }
    }
}
