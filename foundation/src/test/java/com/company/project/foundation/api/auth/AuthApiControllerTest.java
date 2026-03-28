package com.company.project.foundation.api.auth;

import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.foundation.security.service.CustomUserDetails;
import com.company.project.foundation.security.jwt.JwtTokenProvider;
import com.company.project.foundation.service.auth.AuthService;
import com.company.project.foundation.service.auth.dto.LoginRequest;
import com.company.project.foundation.service.auth.dto.TokenResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import jakarta.servlet.http.Cookie;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthApiController 테스트")
class AuthApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AuthService authService;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private AuthApiController authApiController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("로그인 성공 테스트")
    void loginSuccessTest() throws Exception {
        TokenResponse tokenResponse = new TokenResponse("accessToken", "refreshToken");
        when(authService.login(any(LoginRequest.class))).thenReturn(tokenResponse);
        doNothing().when(jwtTokenProvider).addRefreshTokenCookie(any(), eq("refreshToken"));

        String requestBody = "{\"userId\":\"user01\",\"password\":\"password\"}";

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").value("accessToken"))
                .andExpect(jsonPath("$.data.refreshToken").value("refreshToken"));
    }

    @Test
    @DisplayName("로그아웃 테스트")
    void logout_Success() throws Exception {
        doNothing().when(jwtTokenProvider).addRefreshTokenCookie(any(), eq(""));
        
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("Logged out successfully"));
    }

    @Test
    @DisplayName("로그인 실패 테스트 - 인증 오류")
    void loginFailTest() throws Exception {
        when(authService.login(any(LoginRequest.class))).thenThrow(new org.springframework.security.authentication.BadCredentialsException("Auth failed"));

        String requestBody = "{\"userId\":\"user01\",\"password\":\"wrong\"}";

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andDo(print())
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Auth failed"));
    }

    @Test
    @DisplayName("토큰 재발급 성공 테스트")
    void reissue_Success() throws Exception {
        String refreshToken = "validRefreshToken";
        TokenResponse tokenResponse = new TokenResponse("newAccessToken", "validRefreshToken");
        when(authService.reissue(refreshToken)).thenReturn(tokenResponse);

        mockMvc.perform(post("/api/v1/auth/reissue")
                        .cookie(new Cookie("refreshToken", refreshToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").value("newAccessToken"))
                .andExpect(jsonPath("$.data.refreshToken").value("validRefreshToken"));
    }

    @Test
    @DisplayName("토큰 재발급 실패 테스트 - 유효하지 않은 토큰")
    void reissue_Fail_InvalidToken() throws Exception {
        String refreshToken = "invalidToken";
        when(authService.reissue(refreshToken)).thenThrow(new BusinessException(ErrorCode.INVALID_TOKEN));

        mockMvc.perform(post("/api/v1/auth/reissue")
                        .cookie(new Cookie("refreshToken", refreshToken)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("A002")); // INVALID_TOKEN
    }

    @Test
    @DisplayName("내 정보 조회 - CustomUserDetails 사용")
    void me_Success_WithCustomUserDetails() throws Exception {
        CustomUserDetails userDetails = mock(CustomUserDetails.class);
        when(userDetails.getUserId()).thenReturn("user01");
        when(userDetails.getUserNm()).thenReturn("홍길동");
        when(userDetails.getAuthorCode()).thenReturn("ROLE_ADMIN");

        Authentication auth = new UsernamePasswordAuthenticationToken(userDetails, null, 
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(auth);

        mockMvc.perform(get("/api/v1/auth/me")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value("user01"))
                .andExpect(jsonPath("$.data.name").value("홍길동"))
                .andExpect(jsonPath("$.data.role").value("ROLE_ADMIN"));
        
        SecurityContextHolder.clearContext();
    }
}