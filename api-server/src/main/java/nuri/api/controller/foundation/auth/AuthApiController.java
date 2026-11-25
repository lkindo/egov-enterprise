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
        response.setHeader("Cache-Control", "no-store");
        if (tokenResponse.getRefreshToken() != null) {
            jwtTokenProvider.addRefreshTokenCookie(response, tokenResponse.getRefreshToken());
        } else {
            jwtTokenProvider.removeRefreshTokenCookie(response);
        }
        return ApiResponse.success(tokenResponse);
    }

    @PostMapping("/reissue")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.auth.AuthApiController#reissue')")
    public ApiResponse<TokenResponse> reissue(
            @CookieValue(name = "refreshToken", required = false) String refreshToken,
            HttpServletRequest request,
            HttpServletResponse response) {
        // 재발급도 로그인 정책(IP·시간대)을 다시 본다 — 입력 IP 는 로그인과 같은 해석기에서 온다.
        TokenResponse tokenResponse = authService.reissue(refreshToken, clientIpResolver.resolve(request));
        // 회전된 refreshToken은 로그인과 동일하게 HttpOnly 쿠키로만 전달한다.
        jwtTokenProvider.addRefreshTokenCookie(response, tokenResponse.getRefreshToken());
        return ApiResponse.success(tokenResponse);
    }

    @PostMapping("/logout")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.auth.AuthApiController#logout')")
    public ApiResponse<String> logout(HttpServletRequest request, HttpServletResponse response) {
        // [2026-09-25 DIP D7] 공개 경로다 — 액세스 토큰이 만료된 뒤에도 쿠키의 리프레시 토큰으로 서버 세션을 끝낸다.
        //   익명 인증 토큰도 isAuthenticated() 가 참이므로 실제 사용자 주체일 때만 신원으로 쓴다.
        //   쿠키는 요청에서 직접 읽는다 — @CookieValue 로 선언하면 API 계약에 쿠키 파라미터가 생기는데,
        //   생성 계약은 브라우저가 관리하는 쿠키를 재발급 한 곳에서만 허용한다(codegen-zod BROWSER_MANAGED_COOKIE_SPECIAL).
        jakarta.servlet.http.Cookie cookie = org.springframework.web.util.WebUtils.getCookie(request, "refreshToken");
        String refreshToken = cookie != null ? cookie.getValue() : null;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String esntlId = auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof CustomUserDetails principal
                ? principal.getUsername()
                : null;
        // [2026-11-25 품질 평가] 서버 쪽 세션 폐기가 실패해도 이 브라우저의 리프레시 쿠키는 지운다 — 사용자가 이 브라우저의 세션을
        //   끊을 수 있게 한다. 실패 자체는 삼키지 않고 응답으로 알린다(종전 서비스의 catch 는 실제 트랜잭션에서 rollback-only 로
        //   커밋이 실패해 성공처럼 끝나지도 못했고, 그때는 쿠키도 지우지 못했다).
        try {
            authService.logout(esntlId, refreshToken);
        } finally {
            jwtTokenProvider.removeRefreshTokenCookie(response);
        }
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
                    principal.getAuthorizationVersion(),
                    principal.isPasswordChangeRequired() ? Boolean.TRUE : null);
            return ApiResponse.success(body);
        }
        throw new BusinessException(CommonErrorCode.INVALID_TOKEN);
    }
}
