package nuri.business.service.auth;

import nuri.business.service.auth.dto.LoginRequest;
import nuri.business.service.auth.dto.TokenResponse;

public interface AuthService {
    TokenResponse login(LoginRequest request, String clientIp);
    /**
     * 리프레시 토큰으로 재발급한다. {@code clientIp} 는 로그인 정책(IP·시간대·접속 제한)을 다시 보기 위한
     * 입력이다 — 정책을 새로 걸어도 리프레시 토큰 수명 동안 재발급이 계속되던 경로를 닫는다(DIP S6 ②).
     */
    TokenResponse reissue(String refreshToken, String clientIp);
    void logout(String userId);
}
