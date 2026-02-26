package com.company.project.web.user;

import com.company.project.api.controller.UserController;
import com.company.project.api.common.exception.GlobalExceptionHandler;
import com.company.project.domain.user.entity.Role;
import com.company.project.security.jwt.JwtTokenProvider;
import com.company.project.api.interceptor.OperationalAuditInterceptor;
import com.company.project.service.menu.MenuService;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = UserController.class)
@ContextConfiguration(classes = {
                UserController.class,
                GlobalExceptionHandler.class,
                UserApiControllerTest.TestConfig.class
})
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class UserApiControllerTest {

        @org.springframework.boot.SpringBootConfiguration
        @org.springframework.boot.autoconfigure.EnableAutoConfiguration(exclude = {
                        org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration.class,
                        org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration.class,
                        org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration.class,
                        org.springframework.boot.autoconfigure.batch.BatchAutoConfiguration.class
        })
        static class TestConfig {
        }

        @Autowired
        private MockMvc mockMvc;

        @Autowired
        private ObjectMapper objectMapper;

        @MockitoBean
        private UserService userService;

        @MockitoBean
        private PasswordEncoder passwordEncoder;

        @MockitoBean
        private JwtTokenProvider jwtTokenProvider;

        @MockitoBean
        private AuthenticationManager authenticationManager;

        @MockitoBean
        private OperationalAuditInterceptor operationalAuditInterceptor;

        @MockitoBean
        private MenuService menuService;

        @MockitoBean
        private com.company.project.security.service.EgovAuthenticationProvider egovAuthenticationProvider;

        @MockitoBean
        private com.company.project.security.service.CustomUserDetailsService customUserDetailsService;

        @Test
        @DisplayName("사용자 목록 조회 - 관리자")
        void getUserList_admin() throws Exception {
                // Given
                when(jwtTokenProvider.validateToken(any())).thenReturn(true);
                when(userService.getUserList()).thenReturn(Collections.emptyList());

                // When & Then
                mockMvc.perform(get("/api/v1/users")
                                .header("Authorization", "Bearer admin-token")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andDo(print())
                                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("회원가입 - 성공")
        void signup_success() throws Exception {
                // Given
                UserResponse mockResponse = new UserResponse("newUser", "신규사용자", Role.USER);
                when(userService.signup(any(UserSignupRequest.class))).thenReturn(mockResponse);

                Map<String, Object> request = Map.of(
                                "userId", "newUser",
                                "password", "password123",
                                "userNm", "신규사용자",
                                "passwordHint", "hint",
                                "passwordCnsr", "answer");

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andDo(print())
                                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("회원가입 - 중복 사용자 ID (409)")
        void signup_duplicateUserId() throws Exception {
                // Given
                when(userService.signup(any(UserSignupRequest.class)))
                                .thenThrow(new com.company.project.core.exception.BusinessException(
                                                com.company.project.core.exception.ErrorCode.DUPLICATE_USER_ID));

                Map<String, Object> request = Map.of(
                                "userId", "admin",
                                "password", "password123",
                                "userNm", "중복사용자");

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andDo(print())
                                .andExpect(status().isConflict());
        }
}
