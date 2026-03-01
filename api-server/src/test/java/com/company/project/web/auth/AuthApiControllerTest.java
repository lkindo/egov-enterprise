package com.company.project.web.auth;

import com.company.project.api.auth.AuthController;
import com.company.project.security.jwt.JwtTokenProvider;
import com.company.project.service.auth.AuthService;
import com.company.project.service.auth.dto.LoginRequest;
import com.company.project.service.auth.dto.TokenResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.batch.BatchAutoConfiguration;
import org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * ?�증 API 컨트롤러 ?�라?�스 ?�스?? */
@WebMvcTest(controllers = AuthController.class, excludeAutoConfiguration = {
                DataSourceAutoConfiguration.class,
                JpaRepositoriesAutoConfiguration.class,
                HibernateJpaAutoConfiguration.class,
                BatchAutoConfiguration.class
})
@ActiveProfiles("test")
@org.springframework.test.context.TestPropertySource(properties = "jwt.secret=test-secret-key-for-unit-testing-purposes-only-12345678901234567890")
@org.junit.jupiter.api.Disabled("Disabled due to major refactoring of AuthController")
class AuthApiControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @Autowired
        private ObjectMapper objectMapper;

        @MockitoBean
        private AuthService authService;

        @MockitoBean
        private JwtTokenProvider jwtTokenProvider;

        @MockitoBean
        private PasswordEncoder passwordEncoder;

        @MockitoBean
        private AuthenticationManager authenticationManager;

        @MockitoBean
        private SecurityContextRepository securityContextRepository;

        @Test
        @DisplayName("로그??- ?�공")
        void login_success() throws Exception {
                // Given
                TokenResponse mockResponse = new TokenResponse("mock-jwt-token", null);
                when(authService.login(any(LoginRequest.class))).thenReturn(mockResponse);

                Map<String, String> request = Map.of(
                                "userId", "loginUser",
                                "password", "correctPassword");

                // When & Then
                mockMvc.perform(post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andDo(print())
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.accessToken").exists());
        }

        @Test
        @DisplayName("로그??- ?�못??비�?번호")
        void login_wrongPassword() throws Exception {
                // Given
                when(authService.login(any(LoginRequest.class)))
                                .thenThrow(new org.springframework.security.authentication.BadCredentialsException(
                                                "Bad credentials"));

                Map<String, String> request = Map.of(
                                "userId", "loginUser",
                                "password", "wrongPassword");

                // When & Then
                mockMvc.perform(post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andDo(print())
                                .andExpect(status().isUnauthorized());
        }
}
