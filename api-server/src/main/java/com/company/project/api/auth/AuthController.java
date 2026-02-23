package com.company.project.api.auth;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.core.response.ApiResponse;
import com.company.project.security.jwt.JwtTokenProvider;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

/**
 * 사용자 인증을 위한 REST API 컨트롤러 (JWT 기반)
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * REST 로그인: Access Token 발행 및 Refresh Token 쿠키 설정
     */
    @PostMapping("/login")
    public ApiResponse<Map<String, String>> login(@RequestBody Map<String, String> loginRequest, HttpServletResponse response) {
        String userId = loginRequest.get("id");
        String password = loginRequest.get("password");
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(userId, password));
            String role = authentication.getAuthorities().iterator().next().getAuthority();

            String accessToken = jwtTokenProvider.createAccessToken(userId, role);
            String refreshToken = jwtTokenProvider.createRefreshToken(userId);
            jwtTokenProvider.addRefreshTokenCookie(response, refreshToken);

            Map<String, String> responseData = new HashMap<>();
            responseData.put("accessToken", accessToken);
            responseData.put("role", role);
            return ApiResponse.success(responseData);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.LOGIN_FAILED);
        }
    }

    /**
     * 토큰 재발급
     */
    @PostMapping("/reissue")
    public ApiResponse<Map<String, String>> reissue(@CookieValue(name = "refreshToken") String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }
        String userId = jwtTokenProvider.getUserId(refreshToken);
        String role = "ROLE_USER"; // 실제 서비스에서는 DB 조회 필요
        String newAccessToken = jwtTokenProvider.createAccessToken(userId, role);
        Map<String, String> responseData = new HashMap<>();
        responseData.put("accessToken", newAccessToken);
        return ApiResponse.success(responseData);
    }

    /**
     * 로그아웃
     */
    @PostMapping("/logout")
    public ApiResponse<String> logout(HttpServletResponse response) {
        jwtTokenProvider.addRefreshTokenCookie(response, "");
        return ApiResponse.success("Logged out successfully");
    }

    /**
     * 현재 사용자 정보 조회
     */
    @GetMapping("/me")
    public ApiResponse<Map<String, Object>> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            Map<String, Object> user = new HashMap<>();
            user.put("id", auth.getName());
            user.put("name", auth.getName());
            return ApiResponse.success(user);
        }
        throw new BusinessException(ErrorCode.INVALID_TOKEN);
    }
}
