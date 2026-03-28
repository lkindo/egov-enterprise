package com.company.project.web.auth;

import com.company.project.foundation.api.auth.AuthApiController;
import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.domain.auth.UserAuthorityRepository;
import com.company.project.foundation.domain.user.repository.UserRepository;
import com.company.project.foundation.service.auth.AuthService;
import com.company.project.foundation.service.auth.dto.LoginRequest;
import com.company.project.foundation.service.auth.dto.TokenResponse;
import com.company.project.foundation.security.jwt.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.List;
import java.util.Map;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * AuthApiController 테스트 (Standalone)
 */
class AuthApiControllerTest {

    private MockMvc mockMvc;
    private AuthService authService;
    private JwtTokenProvider jwtTokenProvider;
    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        authService = mock(AuthService.class);
        jwtTokenProvider = mock(JwtTokenProvider.class);

        mockMvc = MockMvcBuilders.standaloneSetup(new AuthApiController(authService, jwtTokenProvider))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("로그인 - 성공")
    void login_success() throws Exception {
        // Given
        TokenResponse mockResponse = new TokenResponse("mock-access-token", "mock-refresh-token", "ROLE_USER");
        when(authService.login(any(LoginRequest.class))).thenReturn(mockResponse);

        Map<String, String> request = Map.of(
                "userId", "loginUser",
                "password", "correctPassword");

        // When & Then
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("mock-access-token"))
                .andExpect(jsonPath("$.data.role").value("ROLE_USER"));
    }

    @Test
    @DisplayName("로그인 - 실패 (잘못된 비밀번호)")
    void login_fail() throws Exception {
        // Given
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new com.company.project.foundation.core.exception.BusinessException(
                        com.company.project.foundation.core.exception.ErrorCode.LOGIN_FAILED));

        Map<String, String> request = Map.of(
                "userId", "loginUser",
                "password", "wrongPassword");

        // When & Then
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("A005")); // LOGIN_FAILED
    }
}
