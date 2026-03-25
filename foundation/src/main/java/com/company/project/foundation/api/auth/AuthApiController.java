package com.company.project.foundation.api.auth;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.foundation.core.response.ApiResponse;
import com.company.project.foundation.domain.auth.UserAuthorityRepository;
import com.company.project.foundation.domain.user.repository.UserRepository;
import com.company.project.foundation.security.service.CustomUserDetails;
import com.company.project.foundation.security.jwt.JwtTokenProvider;
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
public class AuthApiController {
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    private final UserRepository userRepository;
    private final UserAuthorityRepository userAuthorityRepository;

    @PostMapping("/login")
    public ApiResponse<Map<String, String>> login(@RequestBody Map<String, String> loginRequest,
            HttpServletResponse response) {
        String userId = loginRequest.get("id");
        if (userId == null) {
            userId = loginRequest.get("userId");
        }
        String password = loginRequest.get("password");
        
        log.info(">>> [Login] Attempting login for userId: {}", userId);
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
    public ApiResponse<Map<String, String>> reissue(
            @CookieValue(name = "refreshToken", required = false) String refreshToken) {
        if (refreshToken == null || !jwtTokenProvider.validateToken(refreshToken)) {
            log.warn(">>> [Reissue] Missing or invalid refresh token");
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }
        String userId = jwtTokenProvider.getUserId(refreshToken);
        log.info(">>> [Reissue] Request received for userId: {}", userId);

        // Fetch actual user role from DB
        String authorCode = userRepository.findById(userId)
                .map(user -> {
                    log.debug(">>> [Reissue] Found user: {}, current inherent role: {}", user.getUserId(), user.getRole());
                    return userAuthorityRepository.findById(user.getEsntlId())
                            .map(ua -> {
                                log.debug(">>> [Reissue] Found explicit authority: {} for user: {}", ua.getAuthorCode(), userId);
                                return ua.getAuthorCode();
                            })
                            .orElseGet(() -> {
                                log.info(">>> [Reissue] No explicit authority found, using inherent role: {}", user.getRole());
                                return user.getRole().name();
                            });
                })
                .orElseGet(() -> {
                    log.warn(">>> [Reissue] Failed to find user: {}, falling back to ROLE_USER", userId);
                    return "ROLE_USER";
                });

        String finalRole = authorCode.startsWith("ROLE_") ? authorCode : "ROLE_" + authorCode;
        log.info(">>> [Reissue] Final role for user {}: {}", userId, finalRole);
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
