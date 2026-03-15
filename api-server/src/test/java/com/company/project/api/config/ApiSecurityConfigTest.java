package com.company.project.api.config;

import com.company.project.security.iam.EgovAuthenticationProvider;
import com.company.project.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.test.context.support.WithMockUser;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import com.company.project.api.controller.UserController;
import com.company.project.service.user.UserService;
import com.company.project.api.interceptor.OperationalAuditInterceptor;

@WebMvcTest(controllers = UserController.class)
@ActiveProfiles({ "prod", "test", "security-test" })
@ContextConfiguration(classes = { ApiSecurityConfig.class })
@DisplayName("ApiSecurityConfig 설정 테스트")
public class ApiSecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EgovAuthenticationProvider egovAuthenticationProvider;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private OperationalAuditInterceptor operationalAuditInterceptor;

    @Autowired(required = false)
    private PasswordEncoder passwordEncoder;

    @Autowired(required = false)
    private SecurityFilterChain apiSecurityFilterChain;

    @Autowired(required = false)
    private AuthenticationManager authenticationManager;

    @Test
    @DisplayName("보안 관련 빈들이 정상적으로 등록되었는지 확인")
    void securityBeansLoadedTest() {
        assertThat(passwordEncoder).isNotNull();
        assertThat(apiSecurityFilterChain).isNotNull();
        assertThat(authenticationManager).isNotNull();
    }

    @Test
    @DisplayName("공개 API 엔드포인트는 인증 없이 접근 가능해야 함")
    void publicEndpointsTest() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isNotEqualTo(401);
                    assertThat(status).isNotEqualTo(403);
                });
        
        mockMvc.perform(get("/api/v1/auth/login"))
                .andDo(print())
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).withFailMessage("Expected status not to be 401 but was 401 for /api/v1/auth/login")
                                      .isNotEqualTo(401);
                    assertThat(status).isNotEqualTo(403);
                });
    }

    @Test
    @DisplayName("인증되지 않은 사용자가 보호된 API 접근 시 401을 반환해야 함")
    void unauthorizedAccessTest() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("일반 사용자가 관리자 API 접근 시 403을 반환해야 함")
    void forbiddenAccessTest() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("관리자 권한으로 관리자 API 접근 가능 확인")
    void adminAccessTest() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isNotFound()); // 권한 통과 후 컨트롤러 부재로 404
    }

    @Test
    @DisplayName("CORS 설정 확인 - OPTIONS 요청 시 관련 헤더가 포함되어야 함")
    void corsConfigurationTest() throws Exception {
        mockMvc.perform(options("/api/v1/health")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().exists("Access-Control-Allow-Origin"))
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
    }
}
