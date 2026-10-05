package nuri.business.service.auth;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.service.auth.dto.LoginRequest;
import nuri.business.service.auth.dto.TokenResponse;
import nuri.business.service.auth.impl.AuthServiceImpl;
import nuri.business.service.auth.mfa.MfaRejectedException;
import nuri.business.service.auth.mfa.MfaResults;
import nuri.business.service.auth.mfa.MfaService;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.business.domain.user.repository.UserRepository;

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
import java.time.Instant;
import java.util.List;

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
    private org.springframework.security.core.userdetails.UserDetailsService userDetailsService;

    @Mock
    private nuri.business.domain.auth.RefreshTokenRepository refreshTokenRepository;

    @Mock
    private nuri.business.service.login.LoginPolicyManageService loginPolicyManageService;

    @Mock
    private nuri.business.domain.login.LoginPolicyRepository loginPolicyRepository;

    @Mock
    private MfaService mfaService;

    @Mock

     private nuri.business.service.log.LogService logService;


    @InjectMocks
    private AuthServiceImpl authService;

    private AutoCloseable mocks;
    @BeforeEach
    void setUp() {
        mocks=MockitoAnnotations.openMocks(this);
        when(jwtTokenProvider.createRefreshToken(anyString())).thenReturn("refresh-token-fixture");
        when(jwtTokenProvider.getExpiration(anyString()))
                .thenReturn(java.util.Date.from(java.time.Instant.now().plusSeconds(604800)));
    }
    @org.junit.jupiter.api.AfterEach
    void closeMocks() throws Exception { mocks.close(); }
    private static nuri.foundation.security.service.CustomUserDetails principal(String id,String... groups) {
        return (nuri.foundation.security.service.CustomUserDetails) nuri.business.support.AuthorizationTestPrincipal.authentication(id,id,groups).getPrincipal();
    }


    @Test
    @DisplayName("로그인 성공")
    void testLoginSuccess() {
        // Given
        LoginRequest request = LoginRequest.builder().userId("user").password("password").build();
        Authentication authentication = mock(Authentication.class);
        CustomUserDetails authenticatedPrincipal = principal("user", "ROLE_USER");
        when(authentication.getName()).thenReturn("user");
        when(authentication.getPrincipal()).thenReturn(authenticatedPrincipal);
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
        assertEquals("AUTHENTICATED", response.getAuthenticationStage());
        verify(mfaService).beginLogin(same(authenticatedPrincipal), eq(false));
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
        when(refreshTokenRepository.findByRfshTkn(nuri.business.domain.auth.RefreshTokenDigest.of(refreshToken))).thenReturn(java.util.Optional.of(rt));
        
        when(userDetailsService.loadUserByUsername("user")).thenReturn(principal("user","ROLE_USER"));
        when(refreshTokenRepository.rotateIfCurrent(any(), any(), any(), any(), any())).thenReturn(1);
        when(jwtTokenProvider.createAccessToken(eq("user"), anyString())).thenReturn("new_access_token");

        // When
        TokenResponse response = authService.reissue(refreshToken, "127.0.0.1");

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
        
        when(jwtTokenProvider.validateRefreshToken(refreshToken)).thenReturn(true);
        when(jwtTokenProvider.getUserId(refreshToken)).thenReturn(userId);
        
        when(userDetailsService.loadUserByUsername(userId)).thenReturn(principal(userId,"ROLE_ADMIN"));

        nuri.business.domain.auth.RefreshToken rt = nuri.business.domain.auth.RefreshToken.builder()
                .userId(userId)
                .rfshTkn(refreshToken)
                .exprtnDt(java.time.Instant.now().plus(java.time.Duration.ofDays(1)))
                .build();
        when(refreshTokenRepository.findByRfshTkn(nuri.business.domain.auth.RefreshTokenDigest.of(refreshToken))).thenReturn(java.util.Optional.of(rt));

        when(jwtTokenProvider.createAccessToken(eq(userId), eq("ROLE_ADMIN"))).thenReturn("new_access_token_admin");
        when(refreshTokenRepository.rotateIfCurrent(any(), any(), any(), any(), any())).thenReturn(1);

        // When
        TokenResponse response = authService.reissue(refreshToken, "127.0.0.1");

        // Then
        assertNotNull(response);
        assertEquals("ROLE_ADMIN", response.getRole());
        assertEquals("new_access_token_admin", response.getAccessToken());
    }

    @Test
    @DisplayName("토큰 재발급 - 그룹 0개이면 기본 권한을 부여하지 않는다")
    void testReissueSuccessWithDefaultRole() {
        // Given
        String refreshToken = "valid_refresh_token";
        String userId = "user123";

        when(jwtTokenProvider.validateRefreshToken(refreshToken)).thenReturn(true);
        when(jwtTokenProvider.getUserId(refreshToken)).thenReturn(userId);

        when(userDetailsService.loadUserByUsername(userId)).thenReturn(principal(userId));

        nuri.business.domain.auth.RefreshToken rt = nuri.business.domain.auth.RefreshToken.builder()
                .userId(userId)
                .rfshTkn(refreshToken)
                .exprtnDt(java.time.Instant.now().plus(java.time.Duration.ofDays(1)))
                .build();
        when(refreshTokenRepository.findByRfshTkn(nuri.business.domain.auth.RefreshTokenDigest.of(refreshToken))).thenReturn(java.util.Optional.of(rt));

        when(jwtTokenProvider.createAccessToken(eq(userId), isNull())).thenReturn("new_access_token_user");
        when(refreshTokenRepository.rotateIfCurrent(any(), any(), any(), any(), any())).thenReturn(1);

        // When
        TokenResponse response = authService.reissue(refreshToken, "127.0.0.1");

        // Then
        assertNotNull(response);
        assertNull(response.getRole());
        assertTrue(response.getGroups().isEmpty());
        assertTrue(response.getPermissions().isEmpty());
    }

    @Test
    @DisplayName("로그인 성공 - 권한 접두어 처리 확인")
    void testLoginRolePrefix() {
        // Case 1: Already has ROLE_
        LoginRequest request1 = LoginRequest.builder().userId("admin").password("pass").build();
        Authentication auth1 = mock(Authentication.class);
        when(auth1.getName()).thenReturn("admin");
        when(auth1.getPrincipal()).thenReturn(principal("admin","ROLE_ADMIN"));
        when(auth1.getAuthorities()).thenAnswer(i -> Collections.singletonList(new SimpleGrantedAuthority("ROLE_ADMIN")));
        when(authenticationManager.authenticate(any())).thenReturn(auth1);
        when(jwtTokenProvider.createAccessToken(any(), any())).thenReturn("token1");

        TokenResponse resp1 = authService.login(request1, "127.0.0.1");
        assertEquals("ROLE_ADMIN", resp1.getRole());

        // Case 2: No ROLE_ prefix
        LoginRequest request2 = LoginRequest.builder().userId("user").password("pass").build();
        Authentication auth2 = mock(Authentication.class);
        when(auth2.getName()).thenReturn("user");
        when(auth2.getPrincipal()).thenReturn(principal("user","ROLE_USER"));
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
        BusinessException exception = assertThrows(BusinessException.class, () -> authService.reissue(refreshToken, "127.0.0.1"));
        assertEquals(CommonErrorCode.INVALID_TOKEN, exception.getErrorCode());
    }

    @Test
    @DisplayName("로그인 - legacy OTP 필수 계정은 등록 확인 전 제한 도전만 받는다")
    void testLoginOtpRequired() {
        LoginRequest request = LoginRequest.builder().userId("otpUser").password("pass").build();
        Authentication auth = nuri.business.support.AuthorizationTestPrincipal.authentication("otpUser", "OTP_INTERNAL", "ROLE_USER");
        when(authenticationManager.authenticate(any())).thenReturn(auth);

        nuri.business.domain.login.LoginPolicy policy = mock(nuri.business.domain.login.LoginPolicy.class);
        when(policy.getOtpUseYn()).thenReturn("Y");
        when(loginPolicyRepository.findById("otpUser")).thenReturn(java.util.Optional.of(policy));
        when(mfaService.beginLogin(same((CustomUserDetails) auth.getPrincipal()), eq(true))).thenReturn(new MfaResults.Challenge(
                "ENROLLMENT_REQUIRED", "registration-challenge-fixture", Instant.now().plusSeconds(300)));

        TokenResponse response = authService.login(request, "127.0.0.1");

        assertRestrictedChallenge(response, "ENROLLMENT_REQUIRED", "registration-challenge-fixture");
        verify(mfaService).beginLogin(same((CustomUserDetails) auth.getPrincipal()), eq(true));
        verifyNoInteractions(jwtTokenProvider, refreshTokenRepository);
        verify(logService, never()).logLogin(anyString(), anyString(), anyString(), eq("N"), any());
    }

    @Test
    @DisplayName("로그인 - 위조 inline OTP는 제한 도전을 생략하지 못하고 2단계 오답도 거부한다")
    void testLoginOtpInvalid() {
        LoginRequest request = LoginRequest.builder().userId("otpUser").password("pass").otpCode(123456).build();
        Authentication auth = nuri.business.support.AuthorizationTestPrincipal.authentication("otpUser", "OTP_INTERNAL", "ROLE_USER");
        when(authenticationManager.authenticate(any())).thenReturn(auth);

        nuri.business.domain.login.LoginPolicy policy = mock(nuri.business.domain.login.LoginPolicy.class);
        when(policy.getOtpUseYn()).thenReturn("Y");
        when(loginPolicyRepository.findById("otpUser")).thenReturn(java.util.Optional.of(policy));
        when(mfaService.beginLogin(same((CustomUserDetails) auth.getPrincipal()), eq(true))).thenReturn(new MfaResults.Challenge(
                "MFA_REQUIRED", "verification-challenge-fixture", Instant.now().plusSeconds(300)));
        MfaRejectedException rejection = new MfaRejectedException();
        when(mfaService.verifyLogin("verification-challenge-fixture", "000001", null, "127.0.0.1"))
                .thenThrow(rejection);

        TokenResponse response = authService.login(request, "127.0.0.1");

        assertRestrictedChallenge(response, "MFA_REQUIRED", "verification-challenge-fixture");
        verify(mfaService).beginLogin(same((CustomUserDetails) auth.getPrincipal()), eq(true));
        assertSame(rejection, assertThrows(MfaRejectedException.class, () ->
                authService.verifyMfaLogin(response.getMfaChallenge(), "000001", null, "127.0.0.1")));
        verify(mfaService).verifyLogin("verification-challenge-fixture", "000001", null, "127.0.0.1");
        verifyNoInteractions(jwtTokenProvider, refreshTokenRepository, userDetailsService);
    }

    @Test
    @DisplayName("[정체성/보안] OTP 정책은 로그인 ID 로 조회한다 — esntlId≠loginId 여도 OTP 강제")
    void testLoginOtp_PolicyLookedUpByLoginId_NotEsntlId() {
        // Given: 로그인 ID 와 esntlId 를 서로 다르게 설정한다(기존 테스트는 둘을 같은 값으로 두어 버그를 은폐했다).
        String loginId = "loginuser";
        String esntlId = "USR_ESNTL_0001";
        LoginRequest request = LoginRequest.builder().userId(loginId).password("pass").build(); // otpCode 없음
        Authentication auth = nuri.business.support.AuthorizationTestPrincipal.authentication(loginId, esntlId, "ROLE_USER");
        when(authenticationManager.authenticate(any())).thenReturn(auth);

        nuri.business.domain.login.LoginPolicy policy = mock(nuri.business.domain.login.LoginPolicy.class);
        when(policy.getOtpUseYn()).thenReturn("Y");
        // 정책은 로그인 ID 로만 키잉된다. (과거 버그 코드는 esntlId 로 조회해 여기서 못 찾고 OTP 를 skip 했다)
        when(loginPolicyRepository.findById(loginId)).thenReturn(java.util.Optional.of(policy));
        when(mfaService.beginLogin(same((CustomUserDetails) auth.getPrincipal()), eq(true))).thenReturn(new MfaResults.Challenge(
                "ENROLLMENT_REQUIRED", "identity-challenge-fixture", Instant.now().plusSeconds(300)));

        TokenResponse response = authService.login(request, "127.0.0.1");

        assertRestrictedChallenge(response, "ENROLLMENT_REQUIRED", "identity-challenge-fixture");
        verify(loginPolicyRepository).findById(loginId);
        verify(loginPolicyRepository, never()).findById(esntlId);
        verify(mfaService).beginLogin(same((CustomUserDetails) auth.getPrincipal()), eq(true));
        verifyNoInteractions(jwtTokenProvider, refreshTokenRepository);
    }

    @Test
    @DisplayName("[정체성/보안] MFA 완료는 esntlId로 최신 principal을 조회하고 검증 시각·버전과 함께 토큰을 발급한다")
    void testLoginOtp_UserLookedUpByEsntlId() {
        String loginId = "loginuser";
        String esntlId = "USR_ESNTL_0001";
        String version = "mfa-version-fixture";
        Instant verifiedAt = Instant.parse("2026-09-28T00:00:00Z");
        CustomUserDetails current = CustomUserDetails.builder().userId(loginId).esntlId(esntlId)
                .authorCode("ROLE_USER").enabled(true).lockAt("N")
                .mfaCredentialVersion(version).mfaRequired(true).build();
        when(mfaService.verifyLogin("completion-challenge-fixture", "000001", null, "127.0.0.1"))
                .thenReturn(new MfaResults.Completion(esntlId, version, verifiedAt, List.of(), null));
        when(userDetailsService.loadUserByUsername(esntlId)).thenReturn(current);
        when(jwtTokenProvider.createAccessToken(esntlId, "ROLE_USER", version, verifiedAt)).thenReturn("mfa-access-fixture");
        when(jwtTokenProvider.createRefreshToken(esntlId, version, verifiedAt)).thenReturn("mfa-refresh-fixture");

        TokenResponse response = authService.verifyMfaLogin("completion-challenge-fixture", "000001", null, "127.0.0.1");

        assertEquals("AUTHENTICATED", response.getAuthenticationStage());
        assertEquals("mfa-access-fixture", response.getAccessToken());
        assertEquals("mfa-refresh-fixture", response.getRefreshToken());
        verify(mfaService).verifyLogin("completion-challenge-fixture", "000001", null, "127.0.0.1");
        verify(userDetailsService).loadUserByUsername(esntlId);
        verify(userDetailsService, never()).loadUserByUsername(loginId);
        verify(loginPolicyManageService).validateLoginPolicy(loginId, "127.0.0.1");
        verify(jwtTokenProvider).createAccessToken(esntlId, "ROLE_USER", version, verifiedAt);
        verify(jwtTokenProvider).createRefreshToken(esntlId, version, verifiedAt);
        verify(jwtTokenProvider, never()).createAccessToken(anyString(), anyString());
        verify(jwtTokenProvider, never()).createRefreshToken(anyString());
        verify(refreshTokenRepository).save(argThat(token -> esntlId.equals(token.getUserId())
                && nuri.business.domain.auth.RefreshTokenDigest.of("mfa-refresh-fixture").equals(token.getRfshTkn())));
        verifyNoInteractions(userRepository);
    }

    @Test
    @DisplayName("MFA 검증 뒤 자격 버전이 달라졌으면 정상 토큰을 발급하지 않는다")
    void testMfaCompletionRejectsChangedCredentialVersion() {
        CustomUserDetails current = CustomUserDetails.builder().userId("loginuser").esntlId("USR_ESNTL_0001")
                .enabled(true).lockAt("N").mfaCredentialVersion("new-version-fixture").build();
        when(mfaService.verifyLogin("completion-challenge-fixture", "000001", null, "127.0.0.1"))
                .thenReturn(new MfaResults.Completion("USR_ESNTL_0001", "old-version-fixture", Instant.now(), List.of(), null));
        when(userDetailsService.loadUserByUsername("USR_ESNTL_0001")).thenReturn(current);

        assertThrows(MfaRejectedException.class, () ->
                authService.verifyMfaLogin("completion-challenge-fixture", "000001", null, "127.0.0.1"));

        verifyNoInteractions(jwtTokenProvider, refreshTokenRepository);
    }

    private static void assertRestrictedChallenge(TokenResponse response, String stage, String challenge) {
        assertEquals(stage, response.getAuthenticationStage());
        assertEquals(challenge, response.getMfaChallenge());
        assertNotNull(response.getMfaChallengeExpiresAt());
        assertNull(response.getAccessToken());
        assertNull(response.getRefreshToken());
        assertNull(response.getRole());
        assertTrue(response.getGroups().isEmpty());
        assertTrue(response.getPermissions().isEmpty());
    }

    @Test
    @DisplayName("토큰 재발급 - 만료된 토큰 실패")
    void testReissueExpired() {
        // Given
        String refreshToken = "expired_token";
        when(jwtTokenProvider.validateRefreshToken(refreshToken)).thenReturn(true);
        
        nuri.business.domain.auth.RefreshToken rt = mock(nuri.business.domain.auth.RefreshToken.class);
        when(rt.getExprtnDt()).thenReturn(java.time.Instant.now().minusSeconds(10));
        when(rt.getUserId()).thenReturn("user");
        when(refreshTokenRepository.findByRfshTkn(nuri.business.domain.auth.RefreshTokenDigest.of(refreshToken))).thenReturn(java.util.Optional.of(rt));

        // When & Then
        BusinessException ex = assertThrows(BusinessException.class, () -> authService.reissue(refreshToken, "127.0.0.1"));
        assertEquals(CommonErrorCode.INVALID_TOKEN, ex.getErrorCode());
        verify(refreshTokenRepository).deleteIfCurrent("user", nuri.business.domain.auth.RefreshTokenDigest.of(refreshToken));
    }

    @Test
    @DisplayName("로그아웃 성공")
    void testLogoutSuccess() {
        // Given
        String userId = "user1";
        nuri.business.domain.auth.RefreshToken rt = mock(nuri.business.domain.auth.RefreshToken.class);
        when(refreshTokenRepository.findById(userId)).thenReturn(java.util.Optional.of(rt));

        // When
        authService.logout(userId, null);

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
        assertDoesNotThrow(() -> authService.logout(userId, null));
    }
}
