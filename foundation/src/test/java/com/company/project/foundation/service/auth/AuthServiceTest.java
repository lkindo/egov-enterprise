package com.company.project.foundation.service.auth;

import com.company.project.foundation.security.jwt.JwtTokenProvider;
import com.company.project.foundation.service.auth.dto.LoginRequest;
import com.company.project.foundation.service.auth.dto.TokenResponse;
import com.company.project.foundation.service.auth.impl.AuthServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.Collections;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService ?åÏä§??)
class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private com.company.project.foundation.domain.user.repository.UserRepository userRepository;

    @Mock
    private com.company.project.foundation.domain.auth.UserAuthorityRepository userAuthorityRepository;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private AuthServiceImpl authService;

    @Nested
    @DisplayName("Î°úÍ∑∏???åÏä§??)
    class LoginTests {

        @Test
        @DisplayName("?ïÏÉÅ Î°úÍ∑∏?????°ÏÑ∏???†ÌÅ∞Í≥?Î¶¨ÌîÑ?àÏãú ?†ÌÅ∞ Î∞òÌôò")
        void login_Success() {
            // Given
            String userId = "testUser";
            String password = "testPassword";
            String role = "ROLE_USER";
            String expectedAccessToken = "accessToken123";
            String expectedRefreshToken = "refreshToken456";

            LoginRequest request = new LoginRequest(userId, password);

            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenReturn(authentication);
            when(authentication.getName()).thenReturn(userId);
            doReturn(Collections.singletonList(new SimpleGrantedAuthority(role))).when(authentication).getAuthorities();
            when(jwtTokenProvider.createAccessToken(userId, role)).thenReturn(expectedAccessToken);
            when(jwtTokenProvider.createRefreshToken(userId)).thenReturn(expectedRefreshToken);

            // When
            TokenResponse result = authService.login(request);

            // Then
            assertNotNull(result);
            assertEquals(expectedAccessToken, result.accessToken());
            assertEquals(expectedRefreshToken, result.refreshToken());
            verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
            verify(jwtTokenProvider, times(1)).createAccessToken(userId, role);
            verify(jwtTokenProvider, times(1)).createRefreshToken(userId);
        }

        @Test
        @DisplayName("Î°úÍ∑∏????ROLE_USER Í∞Ä Í∏∞Î≥∏ ??ï†Î°??§Ï†ï??)
        void login_DefaultRole() {
            // Given
            String userId = "newUser";
            String password = "password";
            String defaultRole = "ROLE_USER";
            String accessToken = "accessToken";
            String refreshToken = "refreshToken";

            LoginRequest request = new LoginRequest(userId, password);

            when(authenticationManager.authenticate(any())).thenReturn(authentication);
            when(authentication.getName()).thenReturn(userId);
            doReturn(Collections.singletonList(new SimpleGrantedAuthority(defaultRole))).when(authentication)
                    .getAuthorities();
            when(jwtTokenProvider.createAccessToken(userId, defaultRole)).thenReturn(accessToken);
            when(jwtTokenProvider.createRefreshToken(userId)).thenReturn(refreshToken);

            // When
            TokenResponse result = authService.login(request);

            // Then
            assertNotNull(result);
            verify(jwtTokenProvider, times(1)).createAccessToken(userId, defaultRole);
        }

        @Test
        @DisplayName("Î°úÍ∑∏????ROLE_ADMIN ??ï† ?ïÏÉÅ Ï≤òÎ¶¨")
        void login_AdminRole() {
            // Given
            String userId = "admin";
            String password = "adminPassword";
            String adminRole = "ROLE_ADMIN";
            String accessToken = "adminAccessToken";
            String refreshToken = "adminRefreshToken";

            LoginRequest request = new LoginRequest(userId, password);

            when(authenticationManager.authenticate(any())).thenReturn(authentication);
            when(authentication.getName()).thenReturn(userId);
            doReturn(Collections.singletonList(new SimpleGrantedAuthority(adminRole))).when(authentication)
                    .getAuthorities();
            when(jwtTokenProvider.createAccessToken(userId, adminRole)).thenReturn(accessToken);
            when(jwtTokenProvider.createRefreshToken(userId)).thenReturn(refreshToken);

            // When
            TokenResponse result = authService.login(request);

            // Then
            assertNotNull(result);
            verify(jwtTokenProvider, times(1)).createAccessToken(userId, adminRole);
        }

        @Test
        @DisplayName("?òÎ™ª???∏Ï¶ù ?ïÎ≥¥Î°?Î°úÍ∑∏?????àÏô∏ Î∞úÏÉù")
        void login_InvalidCredentials() {
            // Given
            LoginRequest request = new LoginRequest("invalidUser", "wrongPassword");

            when(authenticationManager.authenticate(any()))
                    .thenThrow(new BadCredentialsException("Invalid username or password"));

            // When & Then
            assertThrows(BadCredentialsException.class, () -> {
                authService.login(request);
            });
            verify(jwtTokenProvider, never()).createAccessToken(any(), any());
            verify(jwtTokenProvider, never()).createRefreshToken(any());
        }

        @Test
        @DisplayName("null Î°úÍ∑∏???îÏ≤≠?ºÎ°ú ?àÏô∏ Î∞úÏÉù")
        void login_NullRequest() {
            // When & Then
            assertThrows(NullPointerException.class, () -> {
                authService.login(null);
            });
        }

        @Test
        @DisplayName("Îπ??¨Ïö©??ID Î°?Î°úÍ∑∏???úÎèÑ")
        void login_EmptyUserId() {
            // Given
            LoginRequest request = new LoginRequest("", "password");

            when(authenticationManager.authenticate(any())).thenReturn(authentication);
            when(authentication.getName()).thenReturn("");
            doReturn(Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))).when(authentication)
                    .getAuthorities();
            when(jwtTokenProvider.createAccessToken(anyString(), anyString())).thenReturn("token");
            when(jwtTokenProvider.createRefreshToken(anyString())).thenReturn("refresh");

            // When
            TokenResponse result = authService.login(request);

            // Then
            assertNotNull(result);
            // Îπ??¨Ïö©??ID ???àÏö©??(Íµ¨ÌòÑ???∞Îùº ?§Î? ???àÏùå)
        }
    }

    @Nested
    @DisplayName("?†ÌÅ∞ Í¥ÄÎ¶??åÏä§??)
    class TokenManagementTests {

        @Test
        @DisplayName("Î°úÍ∑∏???ëÎãµ???†Ìö®???†ÌÅ∞???¨Ìï®?òÏñ¥????)
        void loginResponse_ValidTokens() {
            // Given
            LoginRequest request = new LoginRequest("user", "pass");

            when(authenticationManager.authenticate(any())).thenReturn(authentication);
            when(authentication.getName()).thenReturn("user");
            doReturn(Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))).when(authentication)
                    .getAuthorities();
            when(jwtTokenProvider.createAccessToken(any(), any())).thenReturn("validAccessToken");
            when(jwtTokenProvider.createRefreshToken(any())).thenReturn("validRefreshToken");

            // When
            TokenResponse response = authService.login(request);

            // Then
            assertNotNull(response.accessToken());
            assertNotNull(response.refreshToken());
            assertFalse(response.accessToken().isBlank());
            assertFalse(response.refreshToken().isBlank());
        }

        @Test
        @DisplayName("?¨Îü¨ Î≤?Î°úÍ∑∏???úÎèÑ ??Îß§Î≤à ?àÎ°ú???†ÌÅ∞ Î∞úÍ∏â")
        void login_MultipleAttempts() {
            // Given
            LoginRequest request = new LoginRequest("user", "pass");

            when(authenticationManager.authenticate(any())).thenReturn(authentication);
            when(authentication.getName()).thenReturn("user");
            doReturn(Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))).when(authentication)
                    .getAuthorities();
            when(jwtTokenProvider.createAccessToken("user", "ROLE_USER"))
                    .thenReturn("token1", "token2", "token3");
            when(jwtTokenProvider.createRefreshToken("user"))
                    .thenReturn("refresh1", "refresh2", "refresh3");

            // When
            TokenResponse response1 = authService.login(request);
            TokenResponse response2 = authService.login(request);
            TokenResponse response3 = authService.login(request);

            // Then
            assertNotEquals(response1.accessToken(), response2.accessToken());
            assertNotEquals(response2.accessToken(), response3.accessToken());
            verify(jwtTokenProvider, times(3)).createAccessToken(any(), any());
            verify(jwtTokenProvider, times(3)).createRefreshToken(any());
        }
    }
}
