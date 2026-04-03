package com.company.project.foundation.api.auth;
 
import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.security.jwt.JwtTokenProvider;
import com.company.project.foundation.service.auth.AuthService;
import com.company.project.foundation.service.auth.dto.LoginRequest;
import com.company.project.foundation.service.auth.dto.TokenResponse;
import com.company.project.foundation.service.user.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
 
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
 
@DisplayName("AuthApiController 테스트")
class AuthApiControllerTest {
 
    private MockMvc mockMvc;
 
    @Mock
    private AuthService authService;
    
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    
    @Mock
    private UserService userService;
 
    @InjectMocks
    private AuthApiController authApiController;
 
    private final ObjectMapper objectMapper = new ObjectMapper();
 
    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(authApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }
 
    @Test
    @DisplayName("로그인 성공")
    void testLoginSuccess() throws Exception {
        // Given
        LoginRequest request = new LoginRequest("user01", "password");
        TokenResponse tokenResponse = new TokenResponse("access-token", "refresh-token", "ROLE_USER");
 
        when(authService.login(any())).thenReturn(tokenResponse);
 
        // When & Then
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("access-token"));
    }
 
    @Test
    @DisplayName("로그인 실패 - 잘못된 비밀번호")
    void testLoginFail() throws Exception {
        // Given
        LoginRequest request = new LoginRequest("user01", "wrong-password");
        when(authService.login(any())).thenThrow(new RuntimeException("인증 실패"));
 
        // When & Then
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError());
    }
}