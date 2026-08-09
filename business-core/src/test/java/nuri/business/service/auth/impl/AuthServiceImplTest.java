package nuri.business.service.auth.impl;

import nuri.business.domain.auth.RefreshToken;
import nuri.business.domain.auth.RefreshTokenRepository;
import nuri.business.domain.auth.UserAuthority;
import nuri.business.domain.auth.UserAuthorityRepository;
import nuri.business.domain.login.LoginPolicy;
import nuri.business.domain.login.LoginPolicyRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.auth.OtpService;
import nuri.business.service.auth.dto.LoginRequest;
import nuri.business.service.auth.dto.TokenResponse;
import nuri.business.service.log.LogService;
import nuri.business.service.login.LoginPolicyManageService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * AuthServiceImpl 단위 테스트.
 *
 * <p>[2026-08-09 신설] 이 클래스에는 <b>단위 테스트가 존재하지 않았다</b>.
 * PIT 이 9개의 뮤턴트를 살려 보냈고, 그중 넷은 단순한 커버리지 결손이 아니라
 * <b>과거에 고친 보안 수정이 회귀해도 감지되지 않는다</b>는 뜻이었다:
 *
 * <ul>
 *   <li>L42 {@code removed call to validateLoginPolicy}
 *       — IP·시간 제한 정책 검사를 통째로 지워도 그린이었다.</li>
 *   <li>L141 {@code removed call to updateToken}
 *       — <b>리프레시 토큰 회전(W1-06)</b>을 무력화해도 그린이었다.
 *         회전이 사라지면 탈취된 토큰이 절대만료(최대 7일)까지 계속 유효하다.</li>
 *   <li>L98 {@code removed call to logLogin}
 *       — 법정 감사기록(W1-E2)이 다시 0건이 되어도 그린이었다.</li>
 *   <li>L87 {@code replaced return value with null}
 *       — 신규 RefreshToken 생성 분기가 검증된 적이 없었다.</li>
 * </ul>
 *
 * <p>즉 이 테스트들은 "커버리지를 올리기 위한 것"이 아니라
 * <b>이미 적용된 보안 통제에 회귀 탐지기를 다는 것</b>이다.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AuthServiceImpl 단위 테스트")
class AuthServiceImplTest {

    private static final String LOGIN_ID = "admin";
    private static final String ESNTL_ID = "USRCNFRM_00000000001";
    private static final String CLIENT_IP = "192.168.0.10";

    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private UserRepository userRepository;
    @Mock private UserAuthorityRepository userAuthorityRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private LoginPolicyManageService loginPolicyManageService;
    @Mock private LoginPolicyRepository loginPolicyRepository;
    @Mock private OtpService otpService;
    @Mock private LogService logService;
    @Mock private Authentication authentication;

    @InjectMocks private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        // 인증 성공이 기본값 — 각 테스트는 자기가 검증할 분기만 덮어쓴다.
        given(authentication.getName()).willReturn(ESNTL_ID);
        given(authentication.getAuthorities())
                .willAnswer(inv -> List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        given(authenticationManager.authenticate(any())).willReturn(authentication);
        given(jwtTokenProvider.createAccessToken(anyString(), anyString())).willReturn("access-token");
        given(jwtTokenProvider.createRefreshToken(anyString())).willReturn("refresh-token");
        given(refreshTokenRepository.findById(anyString())).willReturn(Optional.empty());
        given(loginPolicyRepository.findById(anyString())).willReturn(Optional.empty());
    }

    private LoginRequest loginRequest(Integer otpCode) {
        return LoginRequest.builder().userId(LOGIN_ID).password("pw").otpCode(otpCode).build();
    }

    @Nested
    @DisplayName("login")
    class Login {

        @Test
        @DisplayName("로그인 정책 검증이 인증보다 먼저 호출된다 (검사 제거를 탐지)")
        void validatesLoginPolicyBeforeAuthenticating() {
            authService.login(loginRequest(null), CLIENT_IP);

            // L42 `removed call to validateLoginPolicy` 뮤턴트가 여기서 죽는다.
            // 이 호출이 사라지면 IP·접속시간 제한이 통째로 무력화된다.
            verify(loginPolicyManageService).validateLoginPolicy(LOGIN_ID, CLIENT_IP);
        }

        @Test
        @DisplayName("정책 검증이 거부하면 인증 자체를 시도하지 않는다")
        void abortsBeforeAuthenticationWhenPolicyRejects() {
            org.mockito.BDDMockito.willThrow(new BusinessException("제한된 접속 시간입니다.",
                            nuri.foundation.core.exception.CommonErrorCode.AUTH_ERROR))
                    .given(loginPolicyManageService).validateLoginPolicy(anyString(), anyString());

            assertThatThrownBy(() -> authService.login(loginRequest(null), CLIENT_IP))
                    .isInstanceOf(BusinessException.class);

            verify(authenticationManager, never()).authenticate(any());
            verify(refreshTokenRepository, never()).save(any());
        }

        @Test
        @DisplayName("정책은 로그인 ID 로 조회한다 — esntlId 로 조회하면 OTP 가 전원 무력화된다")
        void looksUpPolicyByLoginIdNotEsntlId() {
            authService.login(loginRequest(null), CLIENT_IP);

            ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
            verify(loginPolicyRepository).findById(key.capture());
            // 과거 버그의 회귀 탐지기: esntlId 로 키잉하면 정책이 항상 empty 가 되어
            // otpUseYn='Y' 인 계정도 OTP 없이 통과했다.
            assertThat(key.getValue()).isEqualTo(LOGIN_ID);
        }

        @Test
        @DisplayName("OTP 필수 계정이 코드를 누락하면 거부한다")
        void rejectsWhenOtpRequiredButMissing() {
            given(loginPolicyRepository.findById(LOGIN_ID)).willReturn(Optional.of(otpEnabledPolicy()));

            assertThatThrownBy(() -> authService.login(loginRequest(null), CLIENT_IP))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("OTP");

            verify(refreshTokenRepository, never()).save(any());
        }

        @Test
        @DisplayName("OTP 필수 계정이 틀린 코드를 내면 거부한다")
        void rejectsWhenOtpVerificationFails() {
            // ⚠ userWithSecret() 은 내부에서 스터빙한다 — given(...) 인자 안에서 부르면
            //   Mockito 가 중첩 스터빙으로 보고 UnfinishedStubbingException 을 던진다.
            User user = userWithSecret();
            given(loginPolicyRepository.findById(LOGIN_ID)).willReturn(Optional.of(otpEnabledPolicy()));
            given(userRepository.findById(ESNTL_ID)).willReturn(Optional.of(user));
            given(otpService.verifyCode(anyString(), org.mockito.ArgumentMatchers.anyInt())).willReturn(false);

            assertThatThrownBy(() -> authService.login(loginRequest(111111), CLIENT_IP))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("일치하지 않습니다");

            verify(refreshTokenRepository, never()).save(any());
        }

        @Test
        @DisplayName("OTP 필수 계정: 사용자를 못 찾으면 USER_NOT_FOUND 로 끝난다 (null 반환 아님)")
        void throwsWhenOtpUserMissing() {
            given(loginPolicyRepository.findById(LOGIN_ID)).willReturn(Optional.of(otpEnabledPolicy()));
            given(userRepository.findById(ESNTL_ID)).willReturn(Optional.empty());

            // L62 `replaced return value with null` — orElseThrow 람다가 검증된 적이 없었다.
            assertThatThrownBy(() -> authService.login(loginRequest(111111), CLIENT_IP))
                    .isInstanceOf(BusinessException.class);
        }

        @Test
        @DisplayName("OTP 검증은 사용자의 비밀키와 입력 코드로 수행된다")
        void verifiesOtpWithUserSecretAndSubmittedCode() {
            User user = userWithSecret();
            given(loginPolicyRepository.findById(LOGIN_ID)).willReturn(Optional.of(otpEnabledPolicy()));
            given(userRepository.findById(ESNTL_ID)).willReturn(Optional.of(user));
            given(otpService.verifyCode(anyString(), org.mockito.ArgumentMatchers.anyInt())).willReturn(true);

            authService.login(loginRequest(654321), CLIENT_IP);

            verify(otpService).verifyCode("USER-OTP-SECRET", 654321);
            verify(refreshTokenRepository).save(any(RefreshToken.class));
        }

        @Test
        @DisplayName("OTP 미사용 정책이면 OTP 검증을 아예 건너뛴다")
        void skipsOtpWhenPolicyDisablesIt() {
            given(loginPolicyRepository.findById(LOGIN_ID))
                    .willReturn(Optional.of(LoginPolicy.create(LOGIN_ID, null, "Y", "N", null, null, "N")));

            authService.login(loginRequest(null), CLIENT_IP);

            verify(otpService, never()).verifyCode(anyString(), org.mockito.ArgumentMatchers.anyInt());
        }

        @Test
        @DisplayName("신규 로그인은 RefreshToken 을 생성해 저장한다 (7일 절대만료)")
        void createsRefreshTokenOnFirstLogin() {
            Instant before = Instant.now();

            authService.login(loginRequest(null), CLIENT_IP);

            ArgumentCaptor<RefreshToken> saved = ArgumentCaptor.forClass(RefreshToken.class);
            verify(refreshTokenRepository).save(saved.capture());
            RefreshToken rt = saved.getValue();
            // L87 `replaced return value with null` 뮤턴트는 여기서 NPE 로 죽는다.
            assertThat(rt).isNotNull();
            assertThat(rt.getUserId()).isEqualTo(ESNTL_ID);
            assertThat(rt.getRfshTkn()).isEqualTo("refresh-token");
            assertThat(rt.getExprtnDt())
                    .isAfter(before.plus(Duration.ofDays(7)).minusSeconds(60))
                    .isBefore(before.plus(Duration.ofDays(7)).plusSeconds(60));
        }

        @Test
        @DisplayName("재로그인은 기존 RefreshToken 을 회전해 저장한다 (행 중복 생성 아님)")
        void rotatesExistingRefreshTokenOnRelogin() {
            RefreshToken existing = RefreshToken.builder()
                    .userId(ESNTL_ID).rfshTkn("old-token")
                    .exprtnDt(Instant.now().plus(Duration.ofDays(1))).build();
            given(refreshTokenRepository.findById(ESNTL_ID)).willReturn(Optional.of(existing));

            authService.login(loginRequest(null), CLIENT_IP);

            ArgumentCaptor<RefreshToken> saved = ArgumentCaptor.forClass(RefreshToken.class);
            verify(refreshTokenRepository).save(saved.capture());
            // L84 `removed call to updateToken` 뮤턴트가 여기서 죽는다 — 값이 갱신돼야 한다.
            assertThat(saved.getValue()).isSameAs(existing);
            assertThat(existing.getRfshTkn()).isEqualTo("refresh-token");
        }

        @Test
        @DisplayName("로그인 성공은 감사 로그를 남긴다 — tb_login_log 는 비어 있으면 안 된다")
        void writesLoginAuditRecord() {
            authService.login(loginRequest(null), CLIENT_IP);

            // L98 `removed call to logLogin` 뮤턴트가 여기서 죽는다.
            // 이 호출이 사라지면 법정 감사기록이 영구히 0건이 된다(W1-E2 이전 상태로 회귀).
            verify(logService, times(1)).logLogin(LOGIN_ID, CLIENT_IP, "WEB", "N", null);
        }

        @Test
        @DisplayName("권한에 ROLE_ 접두가 없으면 붙이고, 있으면 중복해 붙이지 않는다")
        void normalizesRolePrefix() {
            given(authentication.getAuthorities())
                    .willAnswer(inv -> List.of(new SimpleGrantedAuthority("ADMIN")));

            TokenResponse res = authService.login(loginRequest(null), CLIENT_IP);
            assertThat(res.getRole()).isEqualTo("ROLE_ADMIN");

            given(authentication.getAuthorities())
                    .willAnswer(inv -> List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
            assertThat(authService.login(loginRequest(null), CLIENT_IP).getRole())
                    .isEqualTo("ROLE_ADMIN");
        }

        @Test
        @DisplayName("권한이 비어 있으면 ROLE_USER 로 떨어진다")
        void fallsBackToRoleUserWhenNoAuthorities() {
            given(authentication.getAuthorities()).willAnswer(inv -> List.of());

            assertThat(authService.login(loginRequest(null), CLIENT_IP).getRole()).isEqualTo("ROLE_USER");
        }

        @Test
        @DisplayName("토큰은 esntlId 로 발급된다 — 로그인 ID 로 발급하면 정체성 경계가 무너진다")
        void issuesTokensForEsntlIdNotLoginId() {
            authService.login(loginRequest(null), CLIENT_IP);

            verify(jwtTokenProvider).createAccessToken(ESNTL_ID, "ROLE_ADMIN");
            verify(jwtTokenProvider).createRefreshToken(ESNTL_ID);
        }
    }

    @Nested
    @DisplayName("reissue")
    class Reissue {

        @Test
        @DisplayName("null 이거나 리프레시가 아닌 토큰은 거부한다 (액세스 토큰 제시 차단)")
        void rejectsNullOrNonRefreshToken() {
            assertThatThrownBy(() -> authService.reissue(null)).isInstanceOf(BusinessException.class);

            given(jwtTokenProvider.validateRefreshToken("access-token")).willReturn(false);
            assertThatThrownBy(() -> authService.reissue("access-token"))
                    .isInstanceOf(BusinessException.class);

            verify(refreshTokenRepository, never()).findByRfshTkn(anyString());
        }

        @Test
        @DisplayName("DB 에 없는 토큰은 거부한다")
        void rejectsUnknownToken() {
            given(jwtTokenProvider.validateRefreshToken(anyString())).willReturn(true);
            given(refreshTokenRepository.findByRfshTkn(anyString())).willReturn(Optional.empty());

            // L113 `replaced return value with null` — orElseThrow 람다가 검증된 적이 없었다.
            assertThatThrownBy(() -> authService.reissue("unknown"))
                    .isInstanceOf(BusinessException.class);
        }

        @Test
        @DisplayName("만료된 토큰은 삭제하고 거부한다")
        void deletesAndRejectsExpiredToken() {
            RefreshToken expired = RefreshToken.builder()
                    .userId(ESNTL_ID).rfshTkn("expired")
                    .exprtnDt(Instant.now().minus(Duration.ofMinutes(1))).build();
            given(jwtTokenProvider.validateRefreshToken(anyString())).willReturn(true);
            given(refreshTokenRepository.findByRfshTkn("expired")).willReturn(Optional.of(expired));

            assertThatThrownBy(() -> authService.reissue("expired")).isInstanceOf(BusinessException.class);

            verify(refreshTokenRepository).delete(expired);
            verify(refreshTokenRepository, never()).save(any());
        }

        @Test
        @DisplayName("재발급은 리프레시 토큰을 회전한다 — 회전 제거는 탈취 창을 7일로 되돌린다")
        void rotatesRefreshTokenOnReissue() {
            RefreshToken stored = storedToken();
            given(jwtTokenProvider.validateRefreshToken(anyString())).willReturn(true);
            given(refreshTokenRepository.findByRfshTkn("old")).willReturn(Optional.of(stored));
            given(userRepository.findById(ESNTL_ID)).willReturn(Optional.empty());
            given(jwtTokenProvider.createRefreshToken(anyString(), any(Date.class))).willReturn("rotated");

            TokenResponse res = authService.reissue("old");

            // L141 `removed call to updateToken` 뮤턴트가 여기서 죽는다.
            // 회전이 사라지면 같은 토큰이 계속 유효해 W1-06 이전 상태로 회귀한다.
            assertThat(stored.getRfshTkn()).isEqualTo("rotated");
            assertThat(res.getRefreshToken()).isEqualTo("rotated");
            verify(refreshTokenRepository).save(stored);
        }

        @Test
        @DisplayName("회전해도 절대만료는 연장되지 않는다 (슬라이딩 세션 금지)")
        void preservesAbsoluteExpiryAcrossRotation() {
            RefreshToken stored = storedToken();
            Instant originalExpiry = stored.getExprtnDt();
            given(jwtTokenProvider.validateRefreshToken(anyString())).willReturn(true);
            given(refreshTokenRepository.findByRfshTkn("old")).willReturn(Optional.of(stored));
            given(userRepository.findById(ESNTL_ID)).willReturn(Optional.empty());
            given(jwtTokenProvider.createRefreshToken(anyString(), any(Date.class))).willReturn("rotated");

            authService.reissue("old");

            // 회전마다 7일을 새로 주면 탈취 토큰이 무기한 연장된다 — 회전의 목적이 사라진다.
            assertThat(stored.getExprtnDt()).isEqualTo(originalExpiry);
            ArgumentCaptor<Date> expiry = ArgumentCaptor.forClass(Date.class);
            verify(jwtTokenProvider).createRefreshToken(eq(ESNTL_ID), expiry.capture());
            assertThat(expiry.getValue()).isEqualTo(Date.from(originalExpiry));
        }

        @Test
        @DisplayName("권한은 UserAuthority → User.role → ROLE_USER 순으로 결정된다")
        void resolvesRoleByPrecedence() {
            given(jwtTokenProvider.validateRefreshToken(anyString())).willReturn(true);
            given(jwtTokenProvider.createRefreshToken(anyString(), any(Date.class))).willReturn("rotated");

            // ① UserAuthority 가 있으면 그것이 이긴다.
            RefreshToken t1 = storedToken();
            given(refreshTokenRepository.findByRfshTkn("old")).willReturn(Optional.of(t1));
            User user = userWithSecret();
            given(userRepository.findById(ESNTL_ID)).willReturn(Optional.of(user));
            UserAuthority ua = org.mockito.Mockito.mock(UserAuthority.class);
            given(ua.getAuthrtId()).willReturn("ROLE_MANAGER");
            given(userAuthorityRepository.findById(ESNTL_ID)).willReturn(Optional.of(ua));
            assertThat(authService.reissue("old").getRole()).isEqualTo("ROLE_MANAGER");

            // ② UserAuthority 가 없으면 User.role 로 떨어진다.
            given(userAuthorityRepository.findById(ESNTL_ID)).willReturn(Optional.empty());
            assertThat(authService.reissue("old").getRole())
                    .isEqualTo("ROLE_" + user.getRole().name());

            // ③ 사용자 자체가 없으면 ROLE_USER.
            given(userRepository.findById(ESNTL_ID)).willReturn(Optional.empty());
            assertThat(authService.reissue("old").getRole()).isEqualTo("ROLE_USER");
        }
    }

    @Nested
    @DisplayName("logout")
    class Logout {

        @Test
        @DisplayName("리프레시 토큰을 삭제하고 즉시 flush 한다")
        void deletesAndFlushesRefreshToken() {
            RefreshToken stored = storedToken();
            given(refreshTokenRepository.findById(ESNTL_ID)).willReturn(Optional.of(stored));

            authService.logout(ESNTL_ID);

            verify(refreshTokenRepository).delete(stored);
            // L154 `removed call to flush` 뮤턴트가 여기서 죽는다.
            // flush 가 없으면 삭제가 트랜잭션 커밋까지 지연돼 로그아웃 직후 재발급이 성공할 수 있다.
            verify(refreshTokenRepository).flush();
        }

        @Test
        @DisplayName("토큰이 이미 없으면 조용히 지나간다")
        void isNoOpWhenTokenAbsent() {
            given(refreshTokenRepository.findById(ESNTL_ID)).willReturn(Optional.empty());

            authService.logout(ESNTL_ID);

            verify(refreshTokenRepository, never()).delete(any());
            verify(refreshTokenRepository, never()).flush();
        }

        @Test
        @DisplayName("삭제 중 예외가 나도 로그아웃은 실패하지 않는다")
        void swallowsRepositoryFailure() {
            given(refreshTokenRepository.findById(ESNTL_ID))
                    .willThrow(new IllegalStateException("detached"));

            // 로그아웃이 예외로 실패하면 사용자는 세션을 끊을 방법이 없어진다.
            authService.logout(ESNTL_ID);
        }
    }

    // ── 픽스처 ────────────────────────────────────────────────────────────────

    private static LoginPolicy otpEnabledPolicy() {
        return LoginPolicy.create(LOGIN_ID, null, "Y", "N", null, null, "Y");
    }

    private static RefreshToken storedToken() {
        return RefreshToken.builder()
                .userId(ESNTL_ID).rfshTkn("old")
                .exprtnDt(Instant.now().plus(Duration.ofDays(3))).build();
    }

    private static User userWithSecret() {
        User user = org.mockito.Mockito.mock(User.class);
        given(user.getOtpSecret()).willReturn("USER-OTP-SECRET");
        given(user.getEsntlId()).willReturn(ESNTL_ID);
        given(user.getRole()).willReturn(nuri.business.domain.user.entity.Role.USER);
        return user;
    }
}
