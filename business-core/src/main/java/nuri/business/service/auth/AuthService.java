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
    /**
     * 세션을 끝낸다. {@code userId}(esntlId)는 유효한 액세스 토큰이 있을 때만 주어지고, 없으면
     * {@code refreshToken}(쿠키 원문)으로 그 토큰 행만 지운다 — 액세스 토큰이 만료된 뒤에도 로그아웃이
     * 서버 세션을 실제로 끝내게 하기 위해서다(DIP D7).
     */
    void logout(String userId, String refreshToken);
}
