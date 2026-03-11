package com.company.project.api.controller.system.usermanagement;

import com.company.project.config.TestSecurityConfig;
import com.company.project.service.usermanagement.UserManageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = UserManageController.class)
@Import(TestSecurityConfig.class)
@ActiveProfiles("test")
class UserManageControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserManageService userManageService;

    @Test
    @DisplayName("인증되지 않은 사용자는 관리자 API 호출 시 403 에러 발생 (MockSecurityConfig 기준)")
    @WithMockUser(roles = "USER")
    void getUsers_unauthorizedRole_forbidden() throws Exception {
        mockMvc.perform(get("/api/v1/admin/system/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ADMIN 권한 사용자는 관리자 API 호출 가능")
    @WithMockUser(roles = "ADMIN")
    void getUsers_authorizedRole_ok() throws Exception {
        mockMvc.perform(get("/api/v1/admin/system/users"))
                .andExpect(status().isOk());
    }
}
