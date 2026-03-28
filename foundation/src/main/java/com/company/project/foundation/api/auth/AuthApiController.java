package com.company.project.foundation.api.auth;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.foundation.core.response.ApiResponse;
import com.company.project.foundation.security.service.CustomUserDetails;
import com.company.project.foundation.security.jwt.JwtTokenProvider;
import com.company.project.foundation.service.auth.AuthService;
import com.company.project.foundation.service.auth.dto.LoginRequest;
import com.company.project.foundation.service.auth.dto.TokenResponse;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthApiController {
    
    private final AuthService authService;
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping("/login")
    public ApiResponse<TokenResponse> login(@RequestBody LoginRequest loginRequest,
            HttpServletResponse response) {
        log.info(">>> [Login] Attempting login for userId: {}", loginRequest.userId());
        TokenResponse tokenResponse = authService.login(loginRequest);
        jwtTokenProvider.addRefreshTokenCookie(response, tokenResponse.refreshToken());
        return ApiResponse.success(tokenResponse);
    }

    @PostMapping("/reissue")
    public ApiResponse<TokenResponse> reissue(
            @CookieValue(name = "refreshToken", required = false) String refreshToken,
            HttpServletResponse response) {
        TokenResponse tokenResponse = authService.reissue(refreshToken);
        return ApiResponse.success(tokenResponse);
    }

    @PostMapping("/logout")
    public ApiResponse<String> logout(HttpServletResponse response) {
        jwtTokenProvider.addRefreshTokenCookie(response, "");
        return ApiResponse.success("Logged out successfully");
    }

    @GetMapping("/me")
    public ApiResponse<Map<String, Object>> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            Map<String, Object> userData = new HashMap<>();

            if (auth.getPrincipal() instanceof CustomUserDetails) {
                CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
                userData.put("id", userDetails.getUserId());
                userData.put("name", userDetails.getUserNm());
                userData.put("role", userDetails.getAuthorCode());
                userData.put("userSe", userDetails.getAuthorCode().contains("ADMIN") ? "EMP" : "USR");
            } else {
                userData.put("id", auth.getName());
                userData.put("name", auth.getName());
                userData.put("role", "ROLE_USER");
                userData.put("userSe", "USR");
            }

            return ApiResponse.success(userData);
        }
        throw new BusinessException(ErrorCode.INVALID_TOKEN);
    }
}
