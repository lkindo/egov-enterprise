package nuri.foundation.service.auth;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.service.auth.dto.LoginRequest;
import nuri.foundation.service.auth.dto.TokenResponse;
import nuri.foundation.service.auth.impl.AuthServiceImpl;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.foundation.domain.auth.UserAuthorityRepository;

import nuri.foundation.domain.auth.UserAuthority;
import nuri.foundation.domain.user.entity.Role;
import nuri.foundation.domain.user.entity.User;
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
        LoginRequest request = LoginRequest.builder().userId("user").password("password").build();
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
        assertEquals("access_token", response.getAccessToken());
        assertEquals("refresh_token", response.getRefreshToken());
        assertEquals("ROLE_USER", response.getRole());
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
        assertEquals("new_access_token", response.getAccessToken());
    }

    @Test
    @DisplayName("토큰 재발급 성공 - 권한 정보가 있는 경우")
    void testReissueSuccessWithAuthorities() {
        // Given
        String refreshToken = "valid_refresh_token";
        String userId = "user123";
        String esntlId = "USR_0000001";
        
        when(jwtTokenProvider.validateToken(refreshToken)).thenReturn(true);
        when(jwtTokenProvider.getUserId(refreshToken)).thenReturn(userId);
        
        User user = mock(User.class);
        when(user.getEsntlId()).thenReturn(esntlId);
        when(userRepository.findById(userId)).thenReturn(java.util.Optional.of(user));
        
        UserAuthority ua = mock(UserAuthority.class);
        when(ua.getAuthorCode()).thenReturn("ROLE_ADMIN");
        when(userAuthorityRepository.findById(esntlId)).thenReturn(java.util.Optional.of(ua));

        when(jwtTokenProvider.createAccessToken(eq(userId), eq("ROLE_ADMIN"))).thenReturn("new_access_token_admin");

        // When
        TokenResponse response = authService.reissue(refreshToken);

        // Then
        assertNotNull(response);
        assertEquals("ROLE_ADMIN", response.getRole());
        assertEquals("new_access_token_admin", response.getAccessToken());
    }

    @Test
    @DisplayName("토큰 재발급 성공 - 권한 정보가 없어 기본 역할 사용")
    void testReissueSuccessWithDefaultRole() {
        // Given
        String refreshToken = "valid_refresh_token";
        String userId = "user123";
        String esntlId = "USR_0000001";

        when(jwtTokenProvider.validateToken(refreshToken)).thenReturn(true);
        when(jwtTokenProvider.getUserId(refreshToken)).thenReturn(userId);

        User user = mock(User.class);
        when(user.getEsntlId()).thenReturn(esntlId);
        when(user.getRole()).thenReturn(Role.USER);
        when(userRepository.findById(userId)).thenReturn(java.util.Optional.of(user));

        when(userAuthorityRepository.findById(esntlId)).thenReturn(java.util.Optional.empty());

        when(jwtTokenProvider.createAccessToken(eq(userId), eq("ROLE_USER"))).thenReturn("new_access_token_user");

        // When
        TokenResponse response = authService.reissue(refreshToken);

        // Then
        assertNotNull(response);
        assertEquals("ROLE_USER", response.getRole());
    }

    @Test
    @DisplayName("로그인 성공 - 권한 접두어 처리 확인")
    void testLoginRolePrefix() {
        // Case 1: Already has ROLE_
        LoginRequest request1 = LoginRequest.builder().userId("admin").password("pass").build();
        Authentication auth1 = mock(Authentication.class);
        when(auth1.getName()).thenReturn("admin");
        when(auth1.getAuthorities()).thenAnswer(i -> Collections.singletonList(new SimpleGrantedAuthority("ROLE_ADMIN")));
        when(authenticationManager.authenticate(any())).thenReturn(auth1);
        when(jwtTokenProvider.createAccessToken(any(), any())).thenReturn("token1");

        TokenResponse resp1 = authService.login(request1);
        assertEquals("ROLE_ADMIN", resp1.getRole());

        // Case 2: No ROLE_ prefix
        LoginRequest request2 = LoginRequest.builder().userId("user").password("pass").build();
        Authentication auth2 = mock(Authentication.class);
        when(auth2.getName()).thenReturn("user");
        when(auth2.getAuthorities()).thenAnswer(i -> Collections.singletonList(new SimpleGrantedAuthority("USER")));
        when(authenticationManager.authenticate(any())).thenReturn(auth2);
        when(jwtTokenProvider.createAccessToken(any(), any())).thenReturn("token2");

        TokenResponse resp2 = authService.login(request2);
        assertEquals("ROLE_USER", resp2.getRole());
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