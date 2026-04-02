package com.company.project.foundation.service.auth;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.foundation.service.auth.dto.LoginRequest;
import com.company.project.foundation.service.auth.dto.TokenResponse;
import com.company.project.foundation.service.auth.impl.AuthServiceImpl;
import com.company.project.foundation.security.jwt.JwtTokenProvider;
import com.company.project.foundation.domain.user.repository.UserRepository;
import com.company.project.foundation.domain.auth.UserAuthorityRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("AuthService 테스트")
class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserAuthorityRepository userAuthorityRepository;

    @InjectMocks
    private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("로그인 성공")
    void testLoginSuccess() {
        // Given
        LoginRequest request = new LoginRequest("user", "password");
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("user");
        when(authentication.getAuthorities()).thenAnswer(i -> Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        
        when(jwtTokenProvider.createAccessToken(eq("user"), eq("ROLE_USER"))).thenReturn("access_token");
        when(jwtTokenProvider.createRefreshToken(eq("user"))).thenReturn("refresh_token");

        // When
        TokenResponse response = authService.login(request);

        // Then
        assertNotNull(response);
        assertEquals("access_token", response.accessToken());
        assertEquals("refresh_token", response.refreshToken());
        assertEquals("ROLE_USER", response.role());
    }

    @Test
    @DisplayName("토큰 재발급 성공")
    void testReissueSuccess() {
        // Given
        String refreshToken = "valid_refresh_token";
        when(jwtTokenProvider.validateToken(refreshToken)).thenReturn(true);
        when(jwtTokenProvider.getUserId(refreshToken)).thenReturn("user");
        
        when(jwtTokenProvider.createAccessToken(eq("user"), anyString())).thenReturn("new_access_token");

        // When
        TokenResponse response = authService.reissue(refreshToken);

        // Then
        assertNotNull(response);
        assertEquals("new_access_token", response.accessToken());
    }

    @Test
    @DisplayName("유효하지 않은 토큰 재발급 실패")
    void testReissueFail() {
        // Given
        String refreshToken = "invalid_refresh_token";
        when(jwtTokenProvider.validateToken(refreshToken)).thenReturn(false);

        // When & Then
        BusinessException exception = assertThrows(BusinessException.class, () -> authService.reissue(refreshToken));
        assertEquals(ErrorCode.INVALID_TOKEN, exception.getErrorCode());
    }
}