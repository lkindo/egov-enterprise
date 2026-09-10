package nuri.api.controller.foundation.controller.system.login;

import nuri.foundation.security.iam.CustomUserDetailsService;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** HTTP 요청과 실제 proxied controller 직접 호출에서 동일한 명시적 기능 권한을 검증한다. */
@SpringBootTest(
        classes = nuri.ApiServerApplication.class,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:login_policy_authz_testdb;DB_CLOSE_DELAY=-1;IGNORECASE=TRUE;NON_KEYWORDS=KEY,VALUE",
                "spring.jpa.hibernate.ddl-auto=create-drop",
        }
)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.test.annotation.DirtiesContext
class LoginPolicyMethodAuthorizationTest {
    @Autowired
    private LoginPolicyApiController controller;

    @org.junit.jupiter.api.AfterEach
    void clearPrincipal() { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }

    private static final String LIST_URL = "/api/v1/admin/system/login-policies";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("HTTP 필터를 거치지 않은 컨트롤러 빈 호출도 기능 권한을 집행한다")
    void directControllerInvocationRequiresTheSamePermission() throws Exception {
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                nuri.business.support.AuthorizationTestPrincipal.authentication("ordinary", "USR_ORDINARY", "USER"));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> controller.getLoginPolicyList(new nuri.business.domain.common.BaseSearchDto()))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                nuri.business.support.AuthorizationTestPrincipal.authentication("operator", "USR_OPERATOR", "ADMIN"));
        org.assertj.core.api.Assertions.assertThat(controller.getLoginPolicyList(new nuri.business.domain.common.BaseSearchDto()).getStatusCode().value())
                .isEqualTo(200);
    }

    private CustomUserDetails principal(String userId, String roleName) {
        return nuri.business.support.AuthorizationTestPrincipal.principal(userId, "USR_" + userId, roleName);
    }

    @Test
    @DisplayName("일반 사용자는 로그인 정책 기능 권한이 없어 차단된다")
    void list_shouldBeForbidden_forNormalUser() throws Exception {
        mockMvc.perform(get(LIST_URL).with(user(principal("normal_user", "USER"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("익명 사용자는 401 이다")
    void list_shouldRequireAuthentication_forAnonymous() throws Exception {
        mockMvc.perform(get(LIST_URL))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("관리자는 통과한다 — 인가를 좁히지 않았다")
    void list_shouldBeAllowed_forAdmin() throws Exception {
        mockMvc.perform(get(LIST_URL).with(user(principal("admin_user", "ADMIN"))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("SYSTEM 롤도 통과한다 — URL 게이트와 같은 집합이라 동작이 바뀌지 않는다")
    void list_shouldBeAllowed_forSystemRole() throws Exception {
        mockMvc.perform(get(LIST_URL).with(user(principal("system_user", "SYSTEM"))))
                .andExpect(status().isOk());
    }
}
