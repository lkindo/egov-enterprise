package nuri.business.service.auth;

import nuri.business.service.auth.dto.LoginRequest;
import nuri.business.service.auth.dto.TokenResponse;

public interface AuthService {
    TokenResponse login(LoginRequest request, String clientIp);
    TokenResponse reissue(String refreshToken);
    void logout(String userId);
}
