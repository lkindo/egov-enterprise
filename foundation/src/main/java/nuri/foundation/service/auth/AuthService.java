package nuri.foundation.service.auth;

import nuri.foundation.service.auth.dto.LoginRequest;
import nuri.foundation.service.auth.dto.TokenResponse;

public interface AuthService {
    TokenResponse login(LoginRequest request);
    TokenResponse reissue(String refreshToken);
    void logout(String userId);
}
