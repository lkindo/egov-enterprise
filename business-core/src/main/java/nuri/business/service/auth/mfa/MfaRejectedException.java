package nuri.business.service.auth.mfa;

import org.springframework.security.authentication.BadCredentialsException;

/** 실패 횟수는 noRollbackFor로 보존하고 응답은 기존 안전한 인증 실패 401로 통일한다. */
public final class MfaRejectedException extends BadCredentialsException {
    private static final long serialVersionUID = 1L;
    public MfaRejectedException() { super("MFA verification rejected"); }
}
