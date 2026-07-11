package nuri.api.controller.foundation.auth;
import nuri.foundation.core.exception.CommonErrorCode;

import jakarta.validation.Valid;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.business.service.auth.AuthService;
import nuri.business.service.auth.dto.LoginRequest;
import nuri.business.service.auth.dto.TokenResponse;
import nuri.api.controller.foundation.auth.dto.CurrentUserResponse;
import nuri.api.support.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

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
        String clientIp = ClientIpResolver.resolve(request);
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
    public ApiResponse<CurrentUserResponse> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            String userId = auth.getName();
            if (auth.getPrincipal() instanceof CustomUserDetails) {
                userId = ((CustomUserDetails) auth.getPrincipal()).getUserId();
            }

            nuri.business.service.user.dto.UserDto userDto = userService.getUserById(userId);

            // [헌법 제3조] ad-hoc Map 대신 응답 전용 DTO(record)로 계약을 명시한다. JSON 필드명은 기존과 동일.
            CurrentUserResponse body = new CurrentUserResponse(
                    userDto.userId(),
                    userDto.userNm(),
                    userDto.role(),
                    userDto.userSe(),
                    userDto.emlAddr());
            return ApiResponse.success(body);
        }
        throw new BusinessException(CommonErrorCode.INVALID_TOKEN);
    }
}
