package nuri.security;

import java.util.List;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.iam.CustomUserDetailsService;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
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
    static CustomUserDetails explicit(List<String> groups, List<String> permissions) {
        return CustomUserDetails.builder().userId("operator").esntlId("USR_OPERATOR").enabled(true)
                .groups(groups).permissions(permissions).authorizationVersion("fixture").build();
    }
}
