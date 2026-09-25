package nuri.business.service.auth;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.security.authentication.AccountExpiredException;
import org.springframework.security.authentication.AccountStatusException;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.CredentialsExpiredException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.AuthenticationException;

/**
 * 로그인 실패 사유 — <b>서버 감사 기록({@code tb_login_log.err_cd}, 12자)에만</b> 남는다(2026-09-25 DIP D2).
 *
 * <p>API 응답은 사유와 무관하게 같은 401·같은 문구다(GlobalExceptionHandler). 사유를 응답에 실으면
 * 비밀번호 없이도 "없는 계정·잠긴 계정·IP 정책이 걸린 계정" 을 구분할 수 있다. 관리자는 로그인 로그 화면의
 * 오류 열에서 이 코드를 본다.
 */
public enum LoginFailureReason {
    BAD_CREDENTIALS("BAD_CRED"),
    LOCKED("LOCKED"),
    DISABLED("DISABLED"),
    ACCOUNT_EXPIRED("ACCT_EXPIRED"),
    PASSWORD_EXPIRED("PW_EXPIRED"),
    POLICY_BLOCKED("POLICY_BLOCK"),
    POLICY_IP("POLICY_IP"),
    POLICY_TIME("POLICY_TIME"),
    OTP_MISSING("OTP_MISSING"),
    OTP_INVALID("OTP_INVALID"),
    SERVICE_FAILURE("AUTH_SERVICE"),
    OTHER("AUTH_FAILED");

    private final String code;

    LoginFailureReason(String code) {
        this.code = code;
    }

    /** 감사 기록에 남는 코드(최대 12자). */
    public String code() {
        return code;
    }

    /** 인증 예외를 사유로 옮긴다. 순서가 중요하다 — 구체 타입이 상위 타입보다 먼저다. */
    public static LoginFailureReason of(AuthenticationException exception) {
        if (exception instanceof LoginRejectedException rejected) {
            return rejected.reason();
        }
        if (exception instanceof BadCredentialsException) {
            return BAD_CREDENTIALS;
        }
        if (exception instanceof DisabledException) {
            return DISABLED;
        }
        if (exception instanceof AccountExpiredException) {
            return ACCOUNT_EXPIRED;
        }
        if (exception instanceof CredentialsExpiredException) {
            return PASSWORD_EXPIRED;
        }
        if (exception instanceof AccountStatusException) {
            // 인증 제공자는 잠금을 이름 없는 AccountStatusException 하위 타입으로 던진다.
            return LOCKED;
        }
        if (exception instanceof AuthenticationServiceException) {
            return SERVICE_FAILURE;
        }
        return OTHER;
    }

    /**
     * 로그인 정책 검증의 거부를 사유로 옮긴다. 정책 거부가 아닌 예외는 {@code null} 이다 —
     * 호출자는 그 예외를 그대로 다시 던진다(입력 오류 등을 인증 실패로 바꾸지 않는다).
     */
    public static LoginFailureReason ofPolicy(BusinessException exception) {
        if (exception.getErrorCode() == CommonErrorCode.LOGIN_POLICY_LIMITED) {
            return POLICY_BLOCKED;
        }
        if (exception.getErrorCode() == CommonErrorCode.LOGIN_POLICY_IP_MISMATCH) {
            return POLICY_IP;
        }
        if (exception.getErrorCode() == CommonErrorCode.LOGIN_POLICY_TIME_RESTRICTED) {
            return POLICY_TIME;
        }
        return null;
    }
}
