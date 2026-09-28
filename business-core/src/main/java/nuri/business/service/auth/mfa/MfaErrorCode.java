package nuri.business.service.auth.mfa;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import nuri.foundation.core.exception.ErrorCode;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum MfaErrorCode implements ErrorCode {
    UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "MFA503", "2단계 인증을 준비 중입니다. 관리자에게 문의해 주세요.");
    private final HttpStatus status;
    private final String code;
    private final String message;
}
