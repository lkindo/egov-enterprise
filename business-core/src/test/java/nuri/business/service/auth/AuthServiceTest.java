package nuri.business.service.auth;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.service.auth.dto.LoginRequest;
import nuri.business.service.auth.dto.TokenResponse;
import nuri.business.service.auth.impl.AuthServiceImpl;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.domain.auth.UserAuthorityRepository;

import nuri.business.domain.auth.UserAuthority;
import nuri.business.domain.user.entity.Role;
import nuri.business.domain.user.entity.User;
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

    @Mock
    private nuri.business.domain.auth.RefreshTokenRepository refreshTokenRepository;

    @Mock
    private nuri.business.service.login.LoginPolicyManageService loginPolicyManageService;

    @Mock
    private nuri.business.domain.login.LoginPolicyRepository loginPolicyRepository;

    @Mock
    private nuri.business.service.auth.OtpService otpService;

    @Mock

     private nuri.business.service.log.LogService logService;


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
        TokenResponse response = authService.login(request, "127.0.0.1");

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
        when(jwtTokenProvider.validateRefreshToken(refreshToken)).thenReturn(true);
        when(jwtTokenProvider.getUserId(refreshToken)).thenReturn("user");
        
        nuri.business.domain.auth.RefreshToken rt = nuri.business.domain.auth.RefreshToken.builder()
                .userId("user")
                .rfshTkn(refreshToken)
                .exprtnDt(java.time.Instant.now().plus(java.time.Duration.ofDays(1)))
                .build();
        when(refreshTokenRepository.findByRfshTkn(refreshToken)).thenReturn(java.util.Optional.of(rt));
        
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
        
        when(jwtTokenProvider.validateRefreshToken(refreshToken)).thenReturn(true);
        when(jwtTokenProvider.getUserId(refreshToken)).thenReturn(userId);
        
        User user = mock(User.class);
        when(user.getEsntlId()).thenReturn(esntlId);
        when(userRepository.findById(userId)).thenReturn(java.util.Optional.of(user));
        
        UserAuthority ua = mock(UserAuthority.class);
        when(ua.getAuthrtId()).thenReturn("ROLE_ADMIN");
        when(userAuthorityRepository.findById(esntlId)).thenReturn(java.util.Optional.of(ua));

        nuri.business.domain.auth.RefreshToken rt = nuri.business.domain.auth.RefreshToken.builder()
                .userId(userId)
                .rfshTkn(refreshToken)
                .exprtnDt(java.time.Instant.now().plus(java.time.Duration.ofDays(1)))
                .build();
        when(refreshTokenRepository.findByRfshTkn(refreshToken)).thenReturn(java.util.Optional.of(rt));

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

        when(jwtTokenProvider.validateRefreshToken(refreshToken)).thenReturn(true);
        when(jwtTokenProvider.getUserId(refreshToken)).thenReturn(userId);

        User user = mock(User.class);
        when(user.getEsntlId()).thenReturn(esntlId);
        when(user.getRole()).thenReturn(Role.USER);
        when(userRepository.findById(userId)).thenReturn(java.util.Optional.of(user));

        when(userAuthorityRepository.findById(esntlId)).thenReturn(java.util.Optional.empty());

        nuri.business.domain.auth.RefreshToken rt = nuri.business.domain.auth.RefreshToken.builder()
                .userId(userId)
                .rfshTkn(refreshToken)
                .exprtnDt(java.time.Instant.now().plus(java.time.Duration.ofDays(1)))
                .build();
        when(refreshTokenRepository.findByRfshTkn(refreshToken)).thenReturn(java.util.Optional.of(rt));

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

        TokenResponse resp1 = authService.login(request1, "127.0.0.1");
        assertEquals("ROLE_ADMIN", resp1.getRole());

        // Case 2: No ROLE_ prefix
        LoginRequest request2 = LoginRequest.builder().userId("user").password("pass").build();
        Authentication auth2 = mock(Authentication.class);
        when(auth2.getName()).thenReturn("user");
        when(auth2.getAuthorities()).thenAnswer(i -> Collections.singletonList(new SimpleGrantedAuthority("USER")));
        when(authenticationManager.authenticate(any())).thenReturn(auth2);
        when(jwtTokenProvider.createAccessToken(any(), any())).thenReturn("token2");

        TokenResponse resp2 = authService.login(request2, "127.0.0.1");
        assertEquals("ROLE_USER", resp2.getRole());
    }

    @Test
    @DisplayName("유효하지 않은 토큰 재발급 실패")
    void testReissueFail() {
        // Given
        String refreshToken = "invalid_refresh_token";
        when(jwtTokenProvider.validateRefreshToken(refreshToken)).thenReturn(false);

        // When & Then
        BusinessException exception = assertThrows(BusinessException.class, () -> authService.reissue(refreshToken));
        assertEquals(CommonErrorCode.INVALID_TOKEN, exception.getErrorCode());
    }

    @Test
    @DisplayName("로그인 - OTP 활성화 시 OTP 누락 실패")
    void testLoginOtpRequired() {
        // Given
        LoginRequest request = LoginRequest.builder().userId("otpUser").password("pass").build();
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("otpUser");
        when(authenticationManager.authenticate(any())).thenReturn(auth);

        nuri.business.domain.login.LoginPolicy policy = mock(nuri.business.domain.login.LoginPolicy.class);
        when(policy.getOtpUseYn()).thenReturn("Y");
        when(loginPolicyRepository.findById("otpUser")).thenReturn(java.util.Optional.of(policy));

        // When & Then
        BusinessException ex = assertThrows(BusinessException.class, () -> authService.login(request, "127.0.0.1"));
        assertTrue(ex.getMessage().contains("OTP"));
    }

    @Test
    @DisplayName("로그인 - OTP 활성화 시 잘못된 OTP 실패")
    void testLoginOtpInvalid() {
        // Given
        LoginRequest request = LoginRequest.builder().userId("otpUser").password("pass").otpCode(123456).build();
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("otpUser");
        when(authenticationManager.authenticate(any())).thenReturn(auth);

        nuri.business.domain.login.LoginPolicy policy = mock(nuri.business.domain.login.LoginPolicy.class);
        when(policy.getOtpUseYn()).thenReturn("Y");
        when(loginPolicyRepository.findById("otpUser")).thenReturn(java.util.Optional.of(policy));

        User user = mock(User.class);
        when(user.getOtpSecret()).thenReturn("SECRET");
        when(userRepository.findById("otpUser")).thenReturn(java.util.Optional.of(user));
        when(otpService.verifyCode("SECRET", 123456)).thenReturn(false);

        // When & Then
        BusinessException ex = assertThrows(BusinessException.class, () -> authService.login(request, "127.0.0.1"));
        assertTrue(ex.getMessage().contains("일치하지 않습니다"));
    }

    @Test
    @DisplayName("[정체성/보안] OTP 정책은 로그인 ID 로 조회한다 — esntlId≠loginId 여도 OTP 강제")
    void testLoginOtp_PolicyLookedUpByLoginId_NotEsntlId() {
        // Given: 로그인 ID 와 esntlId 를 서로 다르게 설정한다(기존 테스트는 둘을 같은 값으로 두어 버그를 은폐했다).
        String loginId = "loginuser";
        String esntlId = "USR_ESNTL_0001";
        LoginRequest request = LoginRequest.builder().userId(loginId).password("pass").build(); // otpCode 없음
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(esntlId); // 인증 principal 이름 = esntlId
        when(authenticationManager.authenticate(any())).thenReturn(auth);

        nuri.business.domain.login.LoginPolicy policy = mock(nuri.business.domain.login.LoginPolicy.class);
        when(policy.getOtpUseYn()).thenReturn("Y");
        // 정책은 로그인 ID 로만 키잉된다. (과거 버그 코드는 esntlId 로 조회해 여기서 못 찾고 OTP 를 skip 했다)
        when(loginPolicyRepository.findById(loginId)).thenReturn(java.util.Optional.of(policy));

        // When & Then: OTP 코드가 없으므로 반드시 OTP 요구 예외가 발생해야 한다(버그 시엔 통과되어 토큰 발급됨).
        BusinessException ex = assertThrows(BusinessException.class, () -> authService.login(request, "127.0.0.1"));
        assertTrue(ex.getMessage().contains("OTP"), "OTP 정책이 무시되어 로그인이 통과됨(정체성 조회 버그)");
    }

    @Test
    @DisplayName("[정체성/보안] OTP 검증 시 사용자(otpSecret)는 esntlId 로 조회한다")
    void testLoginOtp_UserLookedUpByEsntlId() {
        // Given
        String loginId = "loginuser";
        String esntlId = "USR_ESNTL_0001";
        LoginRequest request = LoginRequest.builder().userId(loginId).password("pass").otpCode(123456).build();
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(esntlId);
        when(authenticationManager.authenticate(any())).thenReturn(auth);

        nuri.business.domain.login.LoginPolicy policy = mock(nuri.business.domain.login.LoginPolicy.class);
        when(policy.getOtpUseYn()).thenReturn("Y");
        when(loginPolicyRepository.findById(loginId)).thenReturn(java.util.Optional.of(policy));

        User user = mock(User.class);
        when(user.getOtpSecret()).thenReturn("SECRET");
        when(userRepository.findById(esntlId)).thenReturn(java.util.Optional.of(user)); // User 는 esntlId 로 조회
        when(otpService.verifyCode("SECRET", 123456)).thenReturn(false);

        // When & Then
        BusinessException ex = assertThrows(BusinessException.class, () -> authService.login(request, "127.0.0.1"));
        assertTrue(ex.getMessage().contains("일치하지 않습니다"));
    }

    @Test
    @DisplayName("토큰 재발급 - 만료된 토큰 실패")
    void testReissueExpired() {
        // Given
        String refreshToken = "expired_token";
        when(jwtTokenProvider.validateRefreshToken(refreshToken)).thenReturn(true);
        
        nuri.business.domain.auth.RefreshToken rt = mock(nuri.business.domain.auth.RefreshToken.class);
        when(rt.getExprtnDt()).thenReturn(java.time.Instant.now().minusSeconds(10));
        when(refreshTokenRepository.findByRfshTkn(refreshToken)).thenReturn(java.util.Optional.of(rt));

        // When & Then
        BusinessException ex = assertThrows(BusinessException.class, () -> authService.reissue(refreshToken));
        assertEquals(CommonErrorCode.INVALID_TOKEN, ex.getErrorCode());
        verify(refreshTokenRepository).delete(rt);
    }

    @Test
    @DisplayName("로그아웃 성공")
    void testLogoutSuccess() {
        // Given
        String userId = "user1";
        nuri.business.domain.auth.RefreshToken rt = mock(nuri.business.domain.auth.RefreshToken.class);
        when(refreshTokenRepository.findById(userId)).thenReturn(java.util.Optional.of(rt));

        // When
        authService.logout(userId);

        // Then
        verify(refreshTokenRepository).delete(rt);
    }

    @Test
    @DisplayName("로그아웃 예외 처리")
    void testLogoutException() {
        // Given
        String userId = "user1";
        when(refreshTokenRepository.findById(userId)).thenThrow(new RuntimeException("DB Error"));

        // When
        assertDoesNotThrow(() -> authService.logout(userId));
    }
}