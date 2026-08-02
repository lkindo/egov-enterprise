package nuri.business.security.authorization;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * DB 기반 URL 인가 엔진의 판정 계약 고정.
 *
 * <p>[존재 이유 — W1-04] 이 클래스는 {@code rbac.db-auth.enabled=true} 인 프로덕션에서
 * 모든 URL 인가를 판정하는데, 2026-08-02 이전까지 **단위 테스트가 0건**이었다.
 * 유일한 커버리지는 {@code RbacAuthorizationMatrixTest} 하나였고 그마저
 * {@code status().is(not(403))} 이라 '403이 아니다' 만 확인했다 — 500 이든 401 이든 통과한다.
 *
 * <p>[특히 중요한 것] {@code check()} 는 매핑에도 securePaths 에도 걸리지 않으면 <b>null(abstain)</b> 을
 * 반환하고, Spring Security 는 이를 <b>허용</b>으로 해석한다. 현 배선(securityMatcher 범위)에서는
 * 도달 경로가 좁지만, 매처를 넓히거나 securePaths 를 줄이는 순간 그대로 fail-open 이 된다.
 * 그 계약을 테스트로 고정해 두어야 나중에 조용히 바뀌지 않는다.
 *
 * <p>[실행 경로 — §0.7-H5] business-core 단위 테스트이므로 <b>pre-push 에서는 실행되지 않는다</b>
 * (pre-push 는 {@code :api-server:harnessTest} 만 돌린다). 실행 경로는 {@code ./gradlew localGate}
 * 와 CI 다. 'pre-push 가 막아 준다' 고 서술하면 그 자체가 거짓 안전감이다.
 */
@DisplayName("DbUrlAuthorizationManager 인가 판정 계약")
class DbUrlAuthorizationManagerTest {

    private static final String ADMIN_URL = "/api/v1/admin/**";
    private static final String ROLE_ADMIN = "ROLE_ADMIN";
    private static final String ROLE_USER = "ROLE_USER";

    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate = mock(JdbcTemplate.class);
    }

    // ---------------------------------------------------------------- 인증 전제

    @Test
    @DisplayName("인증 객체가 없으면 거부한다")
    void deniesWhenAuthenticationIsNull() {
        givenMappings(row(ADMIN_URL, ROLE_ADMIN));
        DbUrlAuthorizationManager manager = new DbUrlAuthorizationManager(jdbcTemplate, List.of());

        AuthorizationDecision decision = manager.check(() -> null, contextFor("/api/v1/admin/system/users"));

        assertNotNull(decision, "인증 부재는 abstain 이 아니라 명시적 거부여야 한다");
        assertFalse(decision.isGranted());
    }

    @Test
    @DisplayName("미인증(isAuthenticated=false) 이면 거부한다")
    void deniesWhenNotAuthenticated() {
        givenMappings(row(ADMIN_URL, ROLE_ADMIN));
        DbUrlAuthorizationManager manager = new DbUrlAuthorizationManager(jdbcTemplate, List.of());
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(false);

        AuthorizationDecision decision = manager.check(supply(auth), contextFor("/api/v1/admin/system/users"));

        assertNotNull(decision);
        assertFalse(decision.isGranted());
    }

    // ---------------------------------------------------------------- fail-closed

    @Test
    @DisplayName("JdbcTemplate 이 없으면 fail-closed 로 거부한다 (매핑을 못 읽는 것은 허용 사유가 아니다)")
    void deniesWhenJdbcTemplateAbsent() {
        DbUrlAuthorizationManager manager = new DbUrlAuthorizationManager(null, List.of());

        AuthorizationDecision decision = manager.check(supply(adminAuth()), contextFor("/api/v1/admin/system/users"));

        assertNotNull(decision);
        assertFalse(decision.isGranted());
    }

    @Test
    @DisplayName("DB 매핑이 비어 있으면 fail-closed 로 거부한다")
    void deniesWhenMappingsEmpty() {
        givenMappings(); // 행 0건
        DbUrlAuthorizationManager manager = new DbUrlAuthorizationManager(jdbcTemplate, List.of());

        AuthorizationDecision decision = manager.check(supply(adminAuth()), contextFor("/api/v1/admin/system/users"));

        assertNotNull(decision);
        assertFalse(decision.isGranted());
    }

    @Test
    @DisplayName("매핑 조회가 예외를 던져도 fail-closed 로 거부한다 (예외가 통과로 번역되지 않는다)")
    void deniesWhenQueryThrows() {
        doThrow(new org.springframework.dao.DataAccessResourceFailureException("db down"))
                .when(jdbcTemplate).query(anyString(), any(RowCallbackHandler.class));
        DbUrlAuthorizationManager manager = new DbUrlAuthorizationManager(jdbcTemplate, List.of());

        AuthorizationDecision decision = manager.check(supply(adminAuth()), contextFor("/api/v1/admin/system/users"));

        assertNotNull(decision);
        assertFalse(decision.isGranted());
    }

    // ---------------------------------------------------------------- 매칭 판정

    @Test
    @DisplayName("패턴이 매칭되고 요구 롤을 보유하면 허용한다")
    void grantsWhenPatternMatchesAndRoleHeld() {
        givenMappings(row(ADMIN_URL, ROLE_ADMIN));
        DbUrlAuthorizationManager manager = new DbUrlAuthorizationManager(jdbcTemplate, List.of());

        AuthorizationDecision decision = manager.check(supply(adminAuth()), contextFor("/api/v1/admin/system/users"));

        assertNotNull(decision);
        assertTrue(decision.isGranted());
    }

    @Test
    @DisplayName("패턴이 매칭되지만 요구 롤이 없으면 거부한다")
    void deniesWhenPatternMatchesButRoleMissing() {
        givenMappings(row(ADMIN_URL, ROLE_ADMIN));
        DbUrlAuthorizationManager manager = new DbUrlAuthorizationManager(jdbcTemplate, List.of());

        AuthorizationDecision decision = manager.check(supply(userAuth()), contextFor("/api/v1/admin/system/users"));

        assertNotNull(decision);
        assertFalse(decision.isGranted());
    }

    @Test
    @DisplayName("여러 패턴이 동시에 매칭되면 요구 롤은 합집합이다 (한 쪽만 만족해도 허용)")
    void unionsRequiredRolesAcrossMatchingPatterns() {
        givenMappings(
                row(ADMIN_URL, ROLE_ADMIN),
                row("/api/v1/admin/system/**", ROLE_USER));
        DbUrlAuthorizationManager manager = new DbUrlAuthorizationManager(jdbcTemplate, List.of());

        AuthorizationDecision decision = manager.check(supply(userAuth()), contextFor("/api/v1/admin/system/users"));

        assertNotNull(decision);
        assertTrue(decision.isGranted(), "합집합 판정이라 ROLE_USER 만 있어도 허용되어야 한다");
    }

    // ---------------------------------------------------------------- 미매칭 경로

    @Test
    @DisplayName("매핑에 없어도 securePaths 에 걸리면 fail-closed 로 거부한다")
    void deniesUnmappedButSecurePath() {
        givenMappings(row("/api/v1/board/**", ROLE_USER));
        DbUrlAuthorizationManager manager = new DbUrlAuthorizationManager(
                jdbcTemplate, List.of("/api/v1/admin/**"));

        AuthorizationDecision decision = manager.check(supply(adminAuth()), contextFor("/api/v1/admin/secret"));

        assertNotNull(decision, "보호 경로의 매핑 부재는 abstain 이 아니라 거부여야 한다");
        assertFalse(decision.isGranted());
    }

    /**
     * ⚠ 이 테스트가 고정하는 것은 '허용' 이 아니라 <b>abstain(null)</b> 이다.
     * Spring Security 의 AuthorizationFilter 는 null 을 <b>ALLOW</b> 로 해석하므로,
     * 이 경로에 도달하는 URL 은 DB 인가의 보호를 받지 않는다.
     * securityMatcher 를 넓히거나 securePaths 를 줄이면 그 순간 fail-open 표면이 커진다.
     */
    @Test
    @DisplayName("매핑에도 securePaths 에도 없으면 abstain(null) — 이 null 은 하위에서 허용으로 해석된다")
    void abstainsForUnmappedNonSecurePath() {
        givenMappings(row("/api/v1/board/**", ROLE_USER));
        DbUrlAuthorizationManager manager = new DbUrlAuthorizationManager(
                jdbcTemplate, List.of("/api/v1/admin/**"));

        AuthorizationDecision decision = manager.check(supply(userAuth()), contextFor("/api/v1/public/notice"));

        assertNull(decision, "미매칭·비보호 경로는 abstain 이어야 한다 (계약 변경 시 fail-open 영향 검토 필요)");
    }

    // ---------------------------------------------------------------- 캐시 계약

    @Test
    @DisplayName("연속 요청은 매핑을 재조회하지 않는다 (요청당 DB 조회 방지)")
    void cachesMappingsAcrossRequests() {
        givenMappings(row(ADMIN_URL, ROLE_ADMIN));
        DbUrlAuthorizationManager manager = new DbUrlAuthorizationManager(jdbcTemplate, List.of());

        manager.check(supply(adminAuth()), contextFor("/api/v1/admin/a"));
        manager.check(supply(adminAuth()), contextFor("/api/v1/admin/b"));

        verify(jdbcTemplate, times(1)).query(anyString(), any(RowCallbackHandler.class));
    }

    @Test
    @DisplayName("evictCache() 후에는 매핑을 다시 조회한다")
    void reloadsMappingsAfterEvict() {
        givenMappings(row(ADMIN_URL, ROLE_ADMIN));
        DbUrlAuthorizationManager manager = new DbUrlAuthorizationManager(jdbcTemplate, List.of());

        manager.check(supply(adminAuth()), contextFor("/api/v1/admin/a"));
        manager.evictCache();
        manager.check(supply(adminAuth()), contextFor("/api/v1/admin/b"));

        verify(jdbcTemplate, times(2)).query(anyString(), any(RowCallbackHandler.class));
    }

    // ---------------------------------------------------------------- helpers

    private Supplier<Authentication> supply(Authentication auth) {
        return () -> auth;
    }

    private Authentication adminAuth() {
        return authWith(ROLE_ADMIN);
    }

    private Authentication userAuth() {
        return authWith(ROLE_USER);
    }

    private Authentication authWith(String authority) {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        // doReturn 을 쓰는 이유: getAuthorities() 의 반환형이 Collection<? extends GrantedAuthority> 라
        // when(...).thenReturn(...) 은 무검사 경고를 낳고, 이 저장소는 -Werror 다.
        doReturn(List.of(new SimpleGrantedAuthority(authority))).when(auth).getAuthorities();
        return auth;
    }

    private RequestAuthorizationContext contextFor(String uri) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI(uri);
        return new RequestAuthorizationContext(request);
    }

    /** {@code jdbcTemplate.query(sql, RowCallbackHandler)} 가 주어진 행들을 흘려보내도록 스텁한다. */
    private void givenMappings(ResultSet... rows) {
        doAnswer(invocation -> {
            RowCallbackHandler handler = invocation.getArgument(1);
            for (ResultSet row : rows) {
                handler.processRow(row);
            }
            return null;
        }).when(jdbcTemplate).query(anyString(), any(RowCallbackHandler.class));
    }

    private static ResultSet row(String url, String roleId) {
        ResultSet rs = mock(ResultSet.class);
        try {
            when(rs.getString("url")).thenReturn(url);
            when(rs.getString("role_id")).thenReturn(roleId);
        } catch (SQLException e) {
            throw new IllegalStateException("mock 스텁 중 예외 — 발생할 수 없다", e);
        }
        return rs;
    }
}
