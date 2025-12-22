package com.company.project.service.auth;

import com.company.project.service.auth.dto.LoginRequest;
import com.company.project.service.auth.dto.TokenResponse;

/**
 * 인증 서비스 인터페이스
 * - 전자정부프레임워크 5.0 호환성 인증 요건 충족을 위한 인터페이스 분리
 */
public interface EgovAuthService {

    /**
     * 로그인 처리 및 토큰 발급
     */
    TokenResponse login(LoginRequest request);
}
