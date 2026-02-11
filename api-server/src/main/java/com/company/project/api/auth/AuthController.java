package com.company.project.api.auth;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.core.response.ApiResponse;
import com.company.project.security.jwt.JwtTokenProvider;
import com.company.project.security.service.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 인증 관련 REST API 컨트롤러
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService userDetailsService;

    /**
     * Refresh Token을 이용한 Access Token 재발급
     */
    @PostMapping("/reissue")
    public ApiResponse<Map<String, String>> reissue(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");

        if (refreshToken == null || !jwtTokenProvider.validateRefreshToken(refreshToken)) {
            throw new BusinessException(ErrorCode.EXPIRED_TOKEN);
        }

        String userId = jwtTokenProvider.getUserId(refreshToken);
        UserDetails userDetails = userDetailsService.loadUserByUsername(userId);
        
        String role = userDetails.getAuthorities().iterator().next().getAuthority();

        String newAccessToken = jwtTokenProvider.createAccessToken(userId, role);
        String newRefreshToken = jwtTokenProvider.createRefreshToken(userId);

        Map<String, String> responseData = new HashMap<>();
        responseData.put("accessToken", newAccessToken);
        responseData.put("refreshToken", newRefreshToken);

        return ApiResponse.success(responseData);
    }
}
