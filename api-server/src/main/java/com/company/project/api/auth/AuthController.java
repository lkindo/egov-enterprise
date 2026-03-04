package com.company.project.api.auth;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.core.response.ApiResponse;
import com.company.project.security.service.CustomUserDetails;
import com.company.project.security.jwt.JwtTokenProvider;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping("/login")
    public ApiResponse<Map<String, String>> login(@RequestBody Map<String, String> loginRequest,
            HttpServletResponse response) {
        String userId = loginRequest.get("id");
        String password = loginRequest.get("password");
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(userId, password));
            String role = authentication.getAuthorities().stream()
                    .map(auth -> auth.getAuthority())
                    .findFirst()
                    .orElse("ROLE_USER");
            String finalRole = role.startsWith("ROLE_") ? role : "ROLE_" + role;
            String accessToken = jwtTokenProvider.createAccessToken(userId, finalRole);
            String refreshToken = jwtTokenProvider.createRefreshToken(userId);
            jwtTokenProvider.addRefreshTokenCookie(response, refreshToken);
            Map<String, String> responseData = new HashMap<>();
            responseData.put("accessToken", accessToken);
            responseData.put("role", finalRole);
            return ApiResponse.success(responseData);
        } catch (Exception e) {
            log.error(">>> Login failed for user {}: ", userId, e);
            throw new BusinessException(ErrorCode.LOGIN_FAILED);
        }
    }

    @PostMapping("/reissue")
    public ApiResponse<Map<String, String>> reissue(@CookieValue(name = "refreshToken") String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }
        String userId = jwtTokenProvider.getUserId(refreshToken);
        String role = "ROLE_USER";
        String finalRole = role.startsWith("ROLE_") ? role : "ROLE_" + role;
        String newAccessToken = jwtTokenProvider.createAccessToken(userId, finalRole);
        Map<String, String> responseData = new HashMap<>();
        responseData.put("accessToken", newAccessToken);
        responseData.put("role", finalRole);
        return ApiResponse.success(responseData);
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
                userData.put("id", userDetails.getUser().getUserId());
                userData.put("name", userDetails.getUser().getUserNm());
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
