package nuri.security;

import java.util.List;
import java.util.stream.Stream;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.iam.CustomUserDetailsService;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * RBAC 매트릭스 — **core 도메인만** 표적으로 하는 인가 판정 계약.
 *
 * Real HTTP and method authorization use explicit current grants; no retired URL-role tables are seeded.
 *
 * ── 왜 core 전용인가 ────────────────────────────────────────────────────────
 * 종전에는 이 한 클래스가 stats·설문·투표·배너/팝업·약식결재까지 함께 검사했고, 그 때문에
 * {@code nuri.business.service.stats.ReportStatsService} 를 {@code @MockitoBean} 으로 들고 있었다.
 * 재사용 base 투영은 **타입 참조**로 연쇄 제거를 판정하므로, 그 한 줄 때문에 축소 프로필
 * (core·collaboration)에서 **RBAC 매트릭스 게이트가 하나도 남지 않았다**(GAP-PACK-001 ④).
 *
 * 그래서 pack 경계로 나눈다. 이 클래스는 모든 프로필에 남는 표면만 본다 —
 * 사용자 관리·로그인 정책, 익명 접근, 미등록 라우트, 그룹 이름과 실제 권한의 분리.
 * demo 소유 표면은 {@link RbacDemoSurfaceAuthorizationMatrixTest} 가 가져간다.
 *
 * ⚠ H2 DB 이름을 분리 클래스와 다르게 둔다({@code rbac_core_testdb}). 같은 이름을 공유하면
 *   {@code create-drop} + {@code @DirtiesContext} 조합에서 컨텍스트 축출 순서에 따라 앞선
 *   클래스가 스키마를 지운 뒤 다른 클래스가 그 DB 를 만나 42S02 로 죽는다(저장소 실측 이력).
 */
@SpringBootTest(classes = nuri.ApiServerApplication.class, properties = {
        "spring.datasource.url=jdbc:h2:mem:rbac_core_testdb;DB_CLOSE_DELAY=-1;IGNORECASE=TRUE;NON_KEYWORDS=KEY,VALUE",
        "spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.test.annotation.DirtiesContext
class RbacAuthorizationMatrixTest {
    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private nuri.business.domain.auth.AuthorityRepository authorityRepository;
    @MockitoBean private CustomUserDetailsService customUserDetailsService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;

    /** core 프로필에도 남는 관리 표면만 둔다 — 설문(`/admin/system/surveys`)은 survey pack 소유라 뺐다. */
    private static final List<String> PATHS = List.of(
            "/api/v1/admin/system/users", "/api/v1/admin/system/login-policies");

    @Test void initialAdminGrantSnapshotAllowsRegisteredAdministrativeReads() throws Exception {
        var admin = nuri.business.support.AuthorizationTestPrincipal.principal("admin_test", "USR_999", "ADMIN");
        for (String path : PATHS) mockMvc.perform(get(path).with(user(admin))).andExpect(status().isOk());
    }
    @Test void initialUserGrantSnapshotCannotAccessAdministrativeReads() throws Exception {
        var ordinary = nuri.business.support.AuthorizationTestPrincipal.principal("user_test", "USR_001", "USER");
        for (String path : PATHS) mockMvc.perform(get(path).with(user(ordinary))).andExpect(status().isForbidden());
    }
    @Test void anonymousAdministrativeRequestsRequireAuthentication() throws Exception {
        for (String path : PATHS) mockMvc.perform(get(path)).andExpect(status().isUnauthorized());
    }
    @Test void domainGroupWithOnlyExplicitReadGrantsWorksWithoutAdministrativeGroup() throws Exception {
        var operator = explicit(List.of("OPERATIONS_TEAM"), List.of("USER_READ", "LOGIN_POL_READ"));
        for (String path : PATHS) mockMvc.perform(get(path).with(user(operator))).andExpect(status().isOk());
        mockMvc.perform(post(PATHS.get(0)).with(user(operator))).andExpect(status().isForbidden());
        mockMvc.perform(delete(PATHS.get(0)).with(user(operator))).andExpect(status().isForbidden());
    }
    @Test void administrativeGroupNameWithoutGrantsDoesNotGrantAccess() throws Exception {
        var empty = explicit(List.of("ROLE_ADMIN", "ROLE_SYSTEM"), List.of());
        for (String path : PATHS) mockMvc.perform(get(path).with(user(empty))).andExpect(status().isForbidden());
    }
    @Test void unknownRouteDoesNotFallBackToAdministrativeGroup() throws Exception {
        var admin = nuri.business.support.AuthorizationTestPrincipal.principal("admin_test", "USR_999", "ADMIN");
        mockMvc.perform(get("/api/v1/admin/unregistered-operation").with(user(admin))).andExpect(status().isForbidden());
    }

    @ParameterizedTest(name = "login policy {0} rejects {1}")
    @MethodSource("loginPolicyWritesWithoutExactPermission")
    void loginPolicyWriteRequiresItsExactHttpPermission(HttpMethod method, MissingGrant missing) throws Exception {
        performDeniedManagementWrite(mockMvc, method,
                "/api/v1/admin/system/login-policies/rbac_missing",
                """
                {"userId":"rbac_missing","ipAddr":"192.0.2.1","lmtYn":"N","otpUseYn":"N"}
                """, "LOGIN_POL", "LOGIN_POL_READ", missing);
    }

    static Stream<Arguments> loginPolicyWritesWithoutExactPermission() {
        return Stream.of(HttpMethod.POST, HttpMethod.PUT, HttpMethod.DELETE)
                .flatMap(method -> Stream.of(MissingGrant.values()).map(missing -> Arguments.of(method, missing)));
    }

    /** A real user and real services are used; no mocked business write can turn a denied request into a pass. */
    @Test
    @Transactional
    void exactLoginPolicyGrantsIndependentlyAllowRealHttpCrud() throws Exception {
        String loginId = "rbac_policy";
        userRepository.saveAndFlush(User.builder().esntlId("USR_RBAC_POLICY").userId(loginId)
                .userNm("RBAC policy fixture").pswd("unused-test-hash").build());
        // [GAP-SEC-006] 로그인 정책 쓰기는 보호 계정 가드를 지나며 그 가드는 예약 그룹 ROLE_ADMIN 행으로 직렬화한다.
        //   Flyway 로 만든 DB 에는 늘 있는 행이지만 이 H2 스키마는 엔티티로 만들어 비어 있다 — 운영과 같게 둔다.
        //   대상(USR_RBAC_POLICY)은 그룹이 없어 보호 계정이 아니므로 정책 권한만으로 통과한다. 이 DB 에는 권한관리자가
        //   없어 마지막 관리자 보호(앞뒤 관리자 수 비교)도 0 → 0 으로 걸리지 않는다.
        authorityRepository.saveAndFlush(nuri.business.domain.auth.Authority.create("ROLE_ADMIN", "관리자", null, null));
        String path = "/api/v1/admin/system/login-policies/" + loginId;

        mockMvc.perform(post(path).with(user(explicit(List.of("POLICY_OPERATORS"), List.of("LOGIN_POL_CREATE"))))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                        {"userId":"body_other","ipAddr":"192.0.2.1","dpcnPrmYn":"Y",
                         "lmtYn":"N","bgngTm":"09:00","endTm":"18:00","otpUseYn":"N"}
                        """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        mockMvc.perform(get(path).with(user(explicit(List.of("POLICY_READERS"), List.of("LOGIN_POL_READ")))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.userId").value(loginId))
                .andExpect(jsonPath("$.data.regYn").value("Y"))
                .andExpect(jsonPath("$.data.ipAddr").value("192.0.2.1"))
                .andExpect(jsonPath("$.data.dpcnPrmYn").value("Y"));

        mockMvc.perform(put(path).with(user(explicit("policy_editor", List.of("POLICY_OPERATORS"),
                        List.of("LOGIN_POL_UPDATE"))))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                        {"userId":"body_other","ipAddr":"192.0.2.2","lmtYn":"Y",
                         "bgngTm":"08:00","endTm":"18:00","otpUseYn":"N"}
                        """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        mockMvc.perform(get(path).with(user(explicit(List.of("POLICY_READERS"), List.of("LOGIN_POL_READ")))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.ipAddr").value("192.0.2.2"))
                .andExpect(jsonPath("$.data.lmtYn").value("Y"))
                .andExpect(jsonPath("$.data.dpcnPrmYn").value("Y"));

        mockMvc.perform(delete(path).with(user(explicit("policy_remover", List.of("POLICY_OPERATORS"),
                        List.of("LOGIN_POL_DELETE")))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        mockMvc.perform(get(path).with(user(explicit(List.of("POLICY_READERS"), List.of("LOGIN_POL_READ")))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.regYn").value("N"));
    }

    enum MissingGrant { ANONYMOUS, NO_GRANTS, READ_ONLY, OTHER_WRITE, GROUP_NAME_ONLY }

    /** Shared HTTP-only helper keeps the core class free of any removable business-app type. */
    static void performDeniedManagementWrite(MockMvc mvc, HttpMethod method, String path, String body,
                                             String prefix, String readPermission, MissingGrant missing) throws Exception {
        var request = request(method, path).contentType(MediaType.APPLICATION_JSON).content(body);
        if (missing != MissingGrant.ANONYMOUS) {
            List<String> permissions = switch (missing) {
                case READ_ONLY -> List.of(readPermission);
                case OTHER_WRITE -> List.of(prefix + (HttpMethod.POST.equals(method) ? "_UPDATE" : "_CREATE"));
                default -> List.of();
            };
            List<String> groups = missing == MissingGrant.GROUP_NAME_ONLY
                    ? List.of("ROLE_ADMIN", "ROLE_SYSTEM") : List.of("OPERATIONS_TEAM");
            request.with(user(explicit(groups, permissions)));
        }
        var response = mvc.perform(request)
                .andExpect(status().is(missing == MissingGrant.ANONYMOUS ? 401 : 403));
        if (missing != MissingGrant.ANONYMOUS) {
            response.andExpect(jsonPath("$.code").value("C010"));
        }
    }

    static CustomUserDetails explicit(List<String> groups, List<String> permissions) {
        return explicit("operator", groups, permissions);
    }

    static CustomUserDetails explicit(String loginId, List<String> groups, List<String> permissions) {
        return CustomUserDetails.builder().userId(loginId).esntlId("USR_" + loginId).enabled(true)
                .groups(groups).permissions(permissions).authorizationVersion("fixture").build();
    }
}
