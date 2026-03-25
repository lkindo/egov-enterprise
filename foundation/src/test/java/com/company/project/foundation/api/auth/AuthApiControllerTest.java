package com.company.project.foundation.api.auth;

import com.company.project.foundation.domain.auth.UserAuthorityRepository;
import com.company.project.foundation.domain.user.entity.Role;
import com.company.project.foundation.domain.user.entity.User;
import com.company.project.foundation.domain.user.repository.UserRepository;
import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.security.service.CustomUserDetails;
import com.company.project.foundation.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import jakarta.servlet.http.Cookie;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
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
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserAuthorityRepository userAuthorityRepository;

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
        Authentication auth = new UsernamePasswordAuthenticationToken(
                "user01", "password", List.of(new SimpleGrantedAuthority("ROLE_USER")));

        when(authenticationManager.authenticate(any())).thenReturn(auth);
        when(jwtTokenProvider.createAccessToken("user01", "ROLE_USER")).thenReturn("accessToken");
        when(jwtTokenProvider.createRefreshToken("user01")).thenReturn("refreshToken");

        String requestBody = "{\"id\":\"user01\",\"password\":\"password\"}";

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").value("accessToken"))
                .andExpect(jsonPath("$.data.role").value("ROLE_USER"));
    }

    @Test
    @DisplayName("로그아웃 테스트")
    void logout_Success() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("로그인 실패 테스트 - 인증 오류")
    void loginFailTest() throws Exception {
        when(authenticationManager.authenticate(any())).thenThrow(new org.springframework.security.authentication.BadCredentialsException("Auth failed"));

        String requestBody = "{\"id\":\"user01\",\"password\":\"wrong\"}";

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andDo(print())
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Login Failed"));
    }

    @Test
    @DisplayName("토큰 재발급 성공 테스트")
    void reissue_Success() throws Exception {
        String refreshToken = "validRefreshToken";
        User mockUser = mock(User.class);
        when(mockUser.getUserId()).thenReturn("user01");
        when(mockUser.getRole()).thenReturn(Role.USER);
        when(mockUser.getEsntlId()).thenReturn("USR01");

        when(jwtTokenProvider.validateToken(refreshToken)).thenReturn(true);
        when(jwtTokenProvider.getUserId(refreshToken)).thenReturn("user01");
        when(userRepository.findById("user01")).thenReturn(Optional.of(mockUser));
        when(userAuthorityRepository.findById("USR01")).thenReturn(Optional.empty());
        when(jwtTokenProvider.createAccessToken("user01", "ROLE_USER")).thenReturn("newAccessToken");

        mockMvc.perform(post("/api/v1/auth/reissue")
                        .cookie(new Cookie("refreshToken", refreshToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").value("newAccessToken"))
                .andExpect(jsonPath("$.data.role").value("ROLE_USER"));
    }

    @Test
    @DisplayName("토큰 재발급 실패 테스트 - 유효하지 않은 토큰")
    void reissue_Fail_InvalidToken() throws Exception {
        String refreshToken = "invalidToken";
        when(jwtTokenProvider.validateToken(refreshToken)).thenReturn(false);

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
