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

/** Real HTTP and method authorization use explicit current grants; no retired URL-role tables are seeded. */
@SpringBootTest(classes = nuri.ApiServerApplication.class, properties = {
        "spring.datasource.url=jdbc:h2:mem:rbac_testdb;DB_CLOSE_DELAY=-1;IGNORECASE=TRUE;NON_KEYWORDS=KEY,VALUE",
        "spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.test.annotation.DirtiesContext
class RbacAuthorizationMatrixTest {
    @Autowired private MockMvc mockMvc;
    @MockitoBean private CustomUserDetailsService customUserDetailsService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    private static final List<String> PATHS = List.of(
            "/api/v1/admin/system/users", "/api/v1/admin/system/surveys", "/api/v1/admin/system/login-policies");

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
        var operator = explicit(List.of("OPERATIONS_TEAM"), List.of("USER_READ", "SURVEY_READ_ALL", "LOGIN_POL_READ"));
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
    private static CustomUserDetails explicit(List<String> groups, List<String> permissions) {
        return CustomUserDetails.builder().userId("operator").esntlId("USR_OPERATOR").enabled(true)
                .groups(groups).permissions(permissions).authorizationVersion("fixture").build();
    }
}
