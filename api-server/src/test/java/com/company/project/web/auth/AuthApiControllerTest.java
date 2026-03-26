package com.company.project.web.auth;

import com.company.project.api.auth.AuthApiController;
import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.domain.auth.UserAuthorityRepository;
import com.company.project.foundation.domain.user.repository.UserRepository;
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
 * AuthApiController ?뚯뒪??(Standalone)
 */
class AuthApiControllerTest {

    private MockMvc mockMvc;
    private AuthenticationManager authenticationManager;
    private JwtTokenProvider jwtTokenProvider;
    private UserRepository userRepository;
    private UserAuthorityRepository userAuthorityRepository;
    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        authenticationManager = mock(AuthenticationManager.class);
        jwtTokenProvider = mock(JwtTokenProvider.class);
        userRepository = mock(UserRepository.class);
        userAuthorityRepository = mock(UserAuthorityRepository.class);

        mockMvc = MockMvcBuilders.standaloneSetup(
                new AuthApiController(authenticationManager, jwtTokenProvider, userRepository, userAuthorityRepository))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("濡쒓렇??- ?깃났")
    void login_success() throws Exception {
        // Given
        Authentication mockAuth = mock(Authentication.class);
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_USER"))).when(mockAuth).getAuthorities();
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(mockAuth);
        
        when(jwtTokenProvider.createAccessToken(anyString(), anyString())).thenReturn("mock-access-token");
        when(jwtTokenProvider.createRefreshToken(anyString())).thenReturn("mock-refresh-token");

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
    @DisplayName("濡쒓렇??- ?ㅽ뙣 (?먭꺽 利앸챸 ?ㅻ쪟)")
    void login_fail() throws Exception {
        // Given
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new org.springframework.security.authentication.BadCredentialsException("Bad credentials"));

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
