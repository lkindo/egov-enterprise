package nuri.api.controller.foundation.auth;

import jakarta.validation.Valid;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.core.response.ApiResponse;
import nuri.business.security.service.CustomUserDetails;
import nuri.business.security.jwt.JwtTokenProvider;
import nuri.business.service.auth.AuthService;
import nuri.business.service.auth.dto.LoginRequest;
import nuri.business.service.auth.dto.TokenResponse;
import jakarta.servlet.http.HttpServletRequest;
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
    public ApiResponse<TokenResponse> login(@Valid @RequestBody LoginRequest loginRequest,
            HttpServletRequest request,
            HttpServletResponse response) {
        String clientIp = getClientIp(request);
        log.info(">>> [Login] Attempting login for userId: {} from IP: {}", loginRequest.getUserId(), clientIp);
        TokenResponse tokenResponse = authService.login(loginRequest, clientIp);
        jwtTokenProvider.addRefreshTokenCookie(response, tokenResponse.getRefreshToken());
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
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            authService.logout(auth.getName());
        }
        jwtTokenProvider.removeRefreshTokenCookie(response);
        return ApiResponse.success("Logged out successfully");
    }

    private final nuri.business.service.user.UserService userService;

    @GetMapping("/me")
    public ApiResponse<Map<String, Object>> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            String userId = auth.getName();
            if (auth.getPrincipal() instanceof CustomUserDetails) {
                userId = ((CustomUserDetails) auth.getPrincipal()).getUserId();
            }
            
            nuri.business.service.user.dto.UserDto userDto = userService.getUserById(userId);
            
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", userDto.getUserId());
            userData.put("name", userDto.getUserNm());
            userData.put("role", userDto.getRole());
            userData.put("userSe", userDto.getUserSe());
            userData.put("email", userDto.getEmlAddr());

            return ApiResponse.success(userData);
        }
        throw new BusinessException(ErrorCode.INVALID_TOKEN);
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }
}
