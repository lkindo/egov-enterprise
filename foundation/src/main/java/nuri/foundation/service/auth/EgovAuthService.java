package nuri.foundation.service.auth;

import nuri.foundation.service.auth.dto.LoginRequest;
import nuri.foundation.service.auth.dto.TokenResponse;

/**
 * 인증 서비스 인터페이스
 * - 전자정부 표준프레임워크 5.0 호환성 인증 요건을 충족하기 위한 인터페이스 정의
 */
public interface EgovAuthService {

    /**
     * 로그인 처리 및 토큰 발급
     */
    TokenResponse login(LoginRequest request);
}
