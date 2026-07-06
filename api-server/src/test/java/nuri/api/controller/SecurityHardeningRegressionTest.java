package nuri.api.controller;

import nuri.business.service.user.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import nuri.business.security.annotation.WithMockCustomUser;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Security Hardening Regression Test
 * 강화된 권한 제어(ADMIN 전용 API)가 예상대로 작동하는지 검증합니다.
 */
@SpringBootTest(classes = nuri.ApiServerApplication.class, webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
public class SecurityHardeningRegressionTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @org.junit.jupiter.api.BeforeEach
    public void setup() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    @Test
    @DisplayName("[Admin API - Security] 일반 사용자가 부서 목록 조회를 시도할 경우 403 Forbidden 반환")
    @WithMockCustomUser(username = "user", role = "USER", esntlId = "user")
    void getDepartments_fail_forNormalUser() throws Exception {
        mockMvc.perform(get("/api/v1/admin/system/departments"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[Admin API - Security] 관리자가 부서 목록 조회를 시도할 경우 200 OK 반환")
    @WithMockCustomUser(username = "admin", role = "ADMIN", esntlId = "admin")
    void getDepartments_success_forAdminUser() throws Exception {
        mockMvc.perform(get("/api/v1/admin/system/departments"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("[File API - Security] 허용되지 않은 확장자(.jsp) 업로드 시도 시 415 Unsupported Media Type 반환")
    @WithMockCustomUser(username = "user", role = "USER", esntlId = "user")
    void uploadFiles_fail_forForbiddenExtension() throws Exception {
        org.springframework.mock.web.MockMultipartFile file = new org.springframework.mock.web.MockMultipartFile(
                "files", "malicious.jsp", "text/plain", "malicious content".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/files")
                .file(file))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("C011")); // UNSUPPORTED_MEDIA_TYPE
    }
}
