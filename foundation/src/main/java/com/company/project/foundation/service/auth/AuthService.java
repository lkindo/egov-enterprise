package com.company.project.foundation.service.auth;

import com.company.project.foundation.service.auth.dto.LoginRequest;
import com.company.project.foundation.service.auth.dto.TokenResponse;

public interface AuthService {
    TokenResponse login(LoginRequest request);
    TokenResponse reissue(String refreshToken);
}
