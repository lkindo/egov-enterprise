package nuri.api.controller.foundation.controller.system.log;

import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.foundation.security.iam.CustomUserDetailsService;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;



import org.springframework.test.context.ActiveProfiles;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Current operation permission plus SYSTEM membership exclusion, through the real HTTP chain. */
@SpringBootTest(
        classes = nuri.ApiServerApplication.class,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:privacy_log_authz_testdb;DB_CLOSE_DELAY=-1;IGNORECASE=TRUE;NON_KEYWORDS=KEY,VALUE",
                "spring.jpa.hibernate.ddl-auto=create-drop",
        }
)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.test.annotation.DirtiesContext
class PrivacyLogSystemRoleExclusionTest {

    private static final String LIST_URL = "/api/v1/admin/system/logs/privacy";
    private static final String EXPORT_URL = "/api/v1/admin/system/logs/privacy/export.xlsx";

    @Autowired
    private MockMvc mockMvc;



    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    private CustomUserDetails principal(String userId, String roleName) {
        return (CustomUserDetails) nuri.business.support.AuthorizationTestPrincipal
                .authentication(userId, "USR_" + userId, roleName).getPrincipal();
    }
    @Test
    @DisplayName("SYSTEM 그룹은 다른 그룹이 개인정보 권한을 부여해도 목록과 반출을 모두 차단한다")
    void systemExclusionWinsOverExplicitPrivacyGrants() throws Exception {
        var mixed = CustomUserDetails.builder().userId("mixed").esntlId("USR_MIXED")
                .groups(List.of("ROLE_SYSTEM", "PRIVACY_TEAM"))
                .permissions(List.of("PRIVACY_READ", "PRIVACY_EXPORT"))
                .enabled(true).authorizationVersion("fixture").build();
        assertThat(mixed.getAuthorities()).extracting(org.springframework.security.core.GrantedAuthority::getAuthority)
                .contains("PRIVACY_READ", "PRIVACY_EXPORT");
        mockMvc.perform(get(LIST_URL).with(user(mixed))).andExpect(status().isForbidden());
        mockMvc.perform(get(EXPORT_URL).with(user(mixed))).andExpect(status().isForbidden());
    }
    @Test
    @DisplayName("배제 — SYSTEM 롤은 개인정보 로그 목록을 볼 수 없다")
    void list_shouldBeForbidden_forSystemRole() throws Exception {
        mockMvc.perform(get(LIST_URL).with(user(principal("system_user", "SYSTEM"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("배제 — SYSTEM 롤은 개인정보 로그 전량 반출을 할 수 없다")
    void export_shouldBeForbidden_forSystemRole() throws Exception {
        mockMvc.perform(get(EXPORT_URL).with(user(principal("system_user", "SYSTEM"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("허용 — ADMIN 롤은 목록과 반출을 모두 사용할 수 있다 (배제가 과하지 않다)")
    void listAndExport_shouldBeAllowed_forAdminRole() throws Exception {
        var admin = principal("admin_user", "ADMIN");

        mockMvc.perform(get(LIST_URL).with(user(admin)))
                .andExpect(status().isOk());
        mockMvc.perform(get(EXPORT_URL).with(user(admin)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("배제 — 일반 사용자는 종전과 같이 차단된다")
    void list_shouldBeForbidden_forNormalUser() throws Exception {
        mockMvc.perform(get(LIST_URL).with(user(principal("normal_user", "USER"))))
                .andExpect(status().isForbidden());
    }
}
