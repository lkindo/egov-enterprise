package com.company.project.security.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureWebMvc
@Import(SecurityConfig.class)
class SecurityConfigTest {

        @Autowired
        private MockMvc mockMvc;

        @Test
        @DisplayName("인증이 필요한 엔드포인트에 인증 없이 접근 시 401 Unauthorized 반환")
        void unauthorizedAccess_toProtectedEndpoint_returns401() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("인증된 사용자가 인증이 필요한 엔드포인트에 접근 시 200 OK 반환")
        @WithMockUser(roles = "USER")
        void authorizedAccess_toProtectedEndpoint_returns200() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("인증이 필요 없는 엔드포인트에 인증 없이 접근 시 200 OK 반환")
        void anonymousAccess_toPublicEndpoint_returns200() throws Exception {
                // When & Then
                mockMvc.perform(get("/auth/login")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().is(200)); // May return 405 Method Not Allowed or 200 depending on
                                                              // implementation
        }

        @Test
        @DisplayName("정적 리소스에 인증 없이 접근 가능")
        void anonymousAccess_toStaticResources_returns200() throws Exception {
                // When & Then
                mockMvc.perform(get("/css/style.css"))
                                .andExpect(status().is(404)); // Resource may not exist but should not be blocked by
                                                              // security

                mockMvc.perform(get("/js/app.js"))
                                .andExpect(status().is(404)); // Resource may not exist but should not be blocked by
                                                              // security

                mockMvc.perform(get("/images/logo.png"))
                                .andExpect(status().is(404)); // Resource may not exist but should not be blocked by
                                                              // security
        }

        @Test
        @DisplayName("CSRF 보호가 비활성화되어 있어야 함")
        void csrf_disabled() throws Exception {
                // When & Then - Should not return 403 Forbidden due to CSRF
                mockMvc.perform(post("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                                .andExpect(status().isUnauthorized()); // Should return 401 instead of 403 due to
                                                                       // authentication, not CSRF
        }

        @Test
        @DisplayName("세션 관리가 STATELESS로 설정됨")
        void sessionManagement_stateless() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(header().doesNotExist("Set-Cookie")); // No session cookie should be set
        }

        @Test
        @DisplayName("CORS 설정이 없을 경우 기본 보안 헤더만 포함")
        void securityHeaders_present() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isUnauthorized())
                                .andExpect(header().exists("X-Content-Type-Options"))
                                .andExpect(header().exists("X-XSS-Protection"))
                                .andExpect(header().exists("X-Frame-Options"));
        }

        @Test
        @DisplayName("권한이 없는 사용자가 관리자 전용 엔드포인트에 접근 시 403 Forbidden 반환")
        @WithMockUser(roles = "USER")
        void insufficientPrivileges_toAdminEndpoint_returns403() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/admin/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("관리자 권한 사용자가 관리자 전용 엔드포인트에 접근 시 200 OK 반환")
        @WithMockUser(roles = "ADMIN")
        void sufficientPrivileges_toAdminEndpoint_returns200() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/admin/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().is(200)); // May return 405 or 200 depending on implementation
        }
}