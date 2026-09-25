package nuri.business.service.auth;

import org.springframework.security.core.AuthenticationException;

/**
 * 로그인 정책(IP·시간대·접속 제한)이나 2단계 인증이 로그인을 거부했다.
 *
 * <p>{@link AuthenticationException} 이므로 전역 처리기가 비밀번호 불일치와 <b>같은 401·같은 문구</b>로
 * 응답한다(2026-09-25 DIP D2). 종전에는 정책 거부가 403 과 "허용되지 않은 IP에서의 접속입니다" 같은
 * 구체 문구로 나가, 비밀번호 없이도 그 로그인 ID 가 존재하고 어떤 정책이 걸려 있는지 알 수 있었다.
 * 사유는 {@link #reason()} 으로 감사 기록에만 남긴다.
 */
public class LoginRejectedException extends AuthenticationException {

    private static final long serialVersionUID = 1L;

    private final LoginFailureReason reason;

    public LoginRejectedException(LoginFailureReason reason) {
        super("Login rejected: " + reason.code());
        this.reason = reason;
    }

    public LoginFailureReason reason() {
        return reason;
    }
}
