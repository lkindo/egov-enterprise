package com.company.project.api.config;

import com.company.project.security.jwt.JwtTokenProvider;
import com.company.project.security.service.EgovAuthenticationProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"prod", "test"}) // prod로 ApiSecurityConfig 활성화, test로 DB 설정 유지
@DisplayName("ApiSecurityConfig 설정 테스트")
class ApiSecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

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
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("보호된 API 엔드포인트는 인증 없이 접근 시 거부되거나 필터 예외가 발생해야 함")
    void securedEndpointsTest() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status == 401 || status == 403 || status == 500).isTrue();
                });
    }
}
