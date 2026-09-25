package nuri.business.service.auth;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AccountExpiredException;
import org.springframework.security.authentication.AccountStatusException;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.CredentialsExpiredException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.authentication.LockedException;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

/** 로그인 실패 사유 분류 — 감사 기록 코드는 12자 컬럼에 들어가야 하고 사유별로 구분돼야 한다(DIP D2). */
@DisplayName("LoginFailureReason")
class LoginFailureReasonTest {

    @Test
    @DisplayName("인증 예외를 구체 사유로 옮긴다 — 하위 타입이 상위 타입에 삼켜지지 않는다")
    void mapsAuthenticationExceptions() {
        assertThat(LoginFailureReason.of(new BadCredentialsException("x"))).isEqualTo(LoginFailureReason.BAD_CREDENTIALS);
        assertThat(LoginFailureReason.of(new DisabledException("x"))).isEqualTo(LoginFailureReason.DISABLED);
        assertThat(LoginFailureReason.of(new LockedException("x"))).isEqualTo(LoginFailureReason.LOCKED);
        assertThat(LoginFailureReason.of(new AccountExpiredException("x"))).isEqualTo(LoginFailureReason.ACCOUNT_EXPIRED);
        assertThat(LoginFailureReason.of(new CredentialsExpiredException("x"))).isEqualTo(LoginFailureReason.PASSWORD_EXPIRED);
        // 인증 제공자는 잠금을 이름 없는 AccountStatusException 하위 타입으로 던진다.
        assertThat(LoginFailureReason.of(new AccountStatusException("locked") { })).isEqualTo(LoginFailureReason.LOCKED);
        assertThat(LoginFailureReason.of(new AuthenticationServiceException("x"))).isEqualTo(LoginFailureReason.SERVICE_FAILURE);
        assertThat(LoginFailureReason.of(new InsufficientAuthenticationException("x"))).isEqualTo(LoginFailureReason.OTHER);
        assertThat(LoginFailureReason.of(new LoginRejectedException(LoginFailureReason.POLICY_IP)))
                .isEqualTo(LoginFailureReason.POLICY_IP);
    }

    @Test
    @DisplayName("로그인 정책 거부 코드만 사유로 옮기고, 그 밖의 업무 오류는 null 이다")
    void mapsOnlyPolicyErrors() {
        assertThat(LoginFailureReason.ofPolicy(new BusinessException(CommonErrorCode.LOGIN_POLICY_LIMITED)))
                .isEqualTo(LoginFailureReason.POLICY_BLOCKED);
        assertThat(LoginFailureReason.ofPolicy(new BusinessException(CommonErrorCode.LOGIN_POLICY_IP_MISMATCH)))
                .isEqualTo(LoginFailureReason.POLICY_IP);
        assertThat(LoginFailureReason.ofPolicy(new BusinessException(CommonErrorCode.LOGIN_POLICY_TIME_RESTRICTED)))
                .isEqualTo(LoginFailureReason.POLICY_TIME);
        assertThat(LoginFailureReason.ofPolicy(new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE))).isNull();
    }

    @Test
    @DisplayName("감사 코드는 서로 다르고 err_cd 컬럼(12자)에 들어간다")
    void codesFitColumnAndAreDistinct() {
        assertThat(Arrays.stream(LoginFailureReason.values()).map(LoginFailureReason::code))
                .allSatisfy(code -> assertThat(code).hasSizeBetween(1, 12))
                .doesNotHaveDuplicates();
    }

    @Test
    @DisplayName("거부 예외의 메시지는 사유 코드만 담는다 — 사용자에게 보일 정책 문구를 싣지 않는다")
    void rejectionCarriesOnlyCode() {
        LoginRejectedException rejected = new LoginRejectedException(LoginFailureReason.POLICY_TIME);
        assertThat(rejected.reason()).isEqualTo(LoginFailureReason.POLICY_TIME);
        assertThat(rejected.getMessage()).isEqualTo("Login rejected: POLICY_TIME");
    }
}
