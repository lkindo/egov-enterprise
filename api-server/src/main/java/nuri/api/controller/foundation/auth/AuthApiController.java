package nuri.api.controller.foundation.auth;
import nuri.foundation.core.exception.CommonErrorCode;

import jakarta.validation.Valid;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.business.service.auth.AuthService;
import nuri.business.service.auth.dto.LoginRequest;
import nuri.business.service.auth.dto.TokenResponse;
import nuri.api.controller.foundation.auth.dto.CurrentUserResponse;
import nuri.foundation.security.net.ClientIpResolver;
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
    // [W1-07] 로그인 IP 제한 정책의 입력이다. XFF 를 무조건 신뢰하던 종전 구현에서는
    //   헤더 한 줄로 IP 제한을 우회할 수 있었다.
    private final ClientIpResolver clientIpResolver;

    @PostMapping("/login")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.auth.AuthApiController#login')")
    public ApiResponse<TokenResponse> login(@Valid @RequestBody LoginRequest loginRequest,
            HttpServletRequest request,
            HttpServletResponse response) {
        String clientIp = clientIpResolver.resolve(request);
        log.debug(">>> [Login] Authentication requested");
        TokenResponse tokenResponse = authService.login(loginRequest, clientIp);
        jwtTokenProvider.addRefreshTokenCookie(response, tokenResponse.getRefreshToken());
        return ApiResponse.success(tokenResponse);
    }

    @PostMapping("/reissue")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.auth.AuthApiController#reissue')")
    public ApiResponse<TokenResponse> reissue(
            @CookieValue(name = "refreshToken", required = false) String refreshToken,
            HttpServletResponse response) {
        TokenResponse tokenResponse = authService.reissue(refreshToken);
        // 회전된 refreshToken은 로그인과 동일하게 HttpOnly 쿠키로만 전달한다.
        jwtTokenProvider.addRefreshTokenCookie(response, tokenResponse.getRefreshToken());
        return ApiResponse.success(tokenResponse);
    }

    @PostMapping("/logout")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.auth.AuthApiController#logout')")
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
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.auth.AuthApiController#getCurrentUser')")
    public ApiResponse<CurrentUserResponse> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof CustomUserDetails principal) {
            new org.springframework.security.authentication.AccountStatusUserDetailsChecker().check(principal);
            String userId = principal.getUserId();

            nuri.business.service.user.dto.UserDto userDto = userService.getUserById(userId);

            // [헌법 제3조] ad-hoc Map 대신 응답 전용 DTO(record)로 계약을 명시한다. JSON 필드명은 기존과 동일.
            CurrentUserResponse body = new CurrentUserResponse(
                    userDto.userId(),
                    userDto.esntlId(),
                    userDto.userNm(),
                    principal.getAuthorCode(),
                    userDto.userSe(),
                    userDto.emlAddr(),
                    principal.getGroups(),
                    principal.getPermissions(),
                    principal.getAuthorizationVersion());
            return ApiResponse.success(body);
        }
        throw new BusinessException(CommonErrorCode.INVALID_TOKEN);
    }
}
