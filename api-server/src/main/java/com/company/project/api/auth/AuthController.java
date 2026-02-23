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
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 사용자 인증을 위한 REST API 컨트롤러 (Dual Token 지원으로 현대화됨)
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * REST 로그인 기능 (Access Token + HttpOnly Refresh Token 발행)
     */
    @PostMapping("/login")
    public ApiResponse<Map<String, String>> login(@RequestBody Map<String, String> loginRequest,
            HttpServletResponse response) {

        String userId = loginRequest.get("id");
        String password = loginRequest.get("password");

        try {
            // 1. Spring Security를 통한 인증
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(userId, password));

            String role = authentication.getAuthorities().iterator().next().getAuthority();

            // 2. 이중 토큰 발행
            String accessToken = jwtTokenProvider.createAccessToken(userId, role);
            String refreshToken = jwtTokenProvider.createRefreshToken(userId);

            // 3. 보안을 위해 Refresh Token은 HttpOnly 쿠키에 저장
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
     * Refresh Token을 사용한 Access Token 재발급 서비스
     */
    @PostMapping("/reissue")
    public ApiResponse<Map<String, String>> reissue(@CookieValue(name = "refreshToken") String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }

        String userId = jwtTokenProvider.getUserId(refreshToken);

        // Refresh Token 검증 및 새로운 Access Token 생성
        String role = "ROLE_USER"; // 임시 역할, 실제로는 DB에서 조회
        String newAccessToken = jwtTokenProvider.createAccessToken(userId, role);

        Map<String, String> responseData = new HashMap<>();
        responseData.put("accessToken", newAccessToken);

        return ApiResponse.success(responseData);
    }

    /**
     * 로그아웃 처리 (무효화 로직)
     */
    @PostMapping("/logout")
    public ApiResponse<String> logout(HttpServletResponse response) {
        // Refresh Token 쿠키 삭제 및 필요시 서버측 RefreshToken 엔티티 제거
        jwtTokenProvider.addRefreshTokenCookie(response, "");
        return ApiResponse.success("Logged out successfully");
    }
}
