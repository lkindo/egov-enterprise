package nuri.web.auth;

import nuri.api.controller.foundation.auth.AuthApiController;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.business.service.auth.AuthService;
import nuri.business.service.auth.dto.LoginRequest;
import nuri.business.service.auth.dto.TokenResponse;
import nuri.foundation.security.jwt.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
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
    private nuri.business.service.user.UserService userService;
    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        authService = mock(AuthService.class);
        jwtTokenProvider = mock(JwtTokenProvider.class);
        userService = mock(nuri.business.service.user.UserService.class);

        // [W1-07] 로그인 IP 제한의 입력이 되는 신뢰 경계 판정. 실제 구현을 기본 신뢰 목록으로 구성한다.
        mockMvc = MockMvcBuilders.standaloneSetup(new AuthApiController(
                authService, jwtTokenProvider,
                new nuri.foundation.security.net.ClientIpResolver(
                        "127.0.0.1/32,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"),
                userService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("로그인 - 성공")
    void login_success() throws Exception {
        // Given
        TokenResponse mockResponse = new TokenResponse("mock-access-token", "mock-refresh-token", "ROLE_USER");
        when(authService.login(any(LoginRequest.class), anyString())).thenReturn(mockResponse);

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
        when(authService.login(any(LoginRequest.class), anyString()))
                .thenThrow(new nuri.foundation.core.exception.BusinessException(
                        nuri.foundation.core.exception.CommonErrorCode.LOGIN_FAILED));

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
