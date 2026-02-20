package com.company.project.api.auth;

import com.company.project.core.exception.BusinessException;

import com.company.project.core.exception.ErrorCode;

import com.company.project.core.response.ApiResponse;

import com.company.project.security.jwt.JwtTokenProvider;

import com.company.project.security.service.CustomUserDetailsService;

import jakarta.servlet.http.HttpServletRequest;

import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;

import org.springframework.security.authentication.AuthenticationManager;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import org.springframework.security.core.Authentication;

import org.springframework.security.core.userdetails.UserDetails;

import org.springframework.web.bind.annotation.*;

import java.util.HashMap;

import java.util.Map;

/**

 * ?          ?     ??REST API ?      ?      ?       (Modernized with Dual Token support)

 */

@RestController("modernAuthController")

@RequestMapping("/auth")

@RequiredArgsConstructor

public class AuthController {

    private final JwtTokenProvider jwtTokenProvider;

    private final CustomUserDetailsService userDetailsService;

    private final AuthenticationManager authenticationManager;

    /**

     * REST          ???(Access Token + HttpOnly Refresh Token)

     */

    @PostMapping("/login")

    public ApiResponse<Map<String, String>> login(@RequestBody Map<String, String> loginRequest,

            HttpServletResponse response) {

        String userId = loginRequest.get("id");

        String password = loginRequest.get("password");

        // 1. Authenticate via Spring Security

        Authentication authentication = authenticationManager.authenticate(

                new UsernamePasswordAuthenticationToken(userId, password));

        String role = authentication.getAuthorities().iterator().next().getAuthority();

        // 2. Issue Dual Tokens

        String accessToken = jwtTokenProvider.createAccessToken(userId, role);

        String refreshToken = jwtTokenProvider.createRefreshToken(userId);

        // 3. Set Refresh Token in HttpOnly Cookie for security

        jwtTokenProvider.addRefreshTokenCookie(response, refreshToken);

        Map<String, String> responseData = new HashMap<>();

        responseData.put("accessToken", accessToken);

        responseData.put("role", role);

        return ApiResponse.success(responseData);

    }

    /**

     * Refresh Token????      ??Access Token ??         ?(Cookie             ?

     */

    @PostMapping("/reissue")

    public ApiResponse<Map<String, String>> reissue(HttpServletRequest request, HttpServletResponse response) {

        String refreshToken = jwtTokenProvider.resolveRefreshToken(request);

        if (refreshToken == null || !jwtTokenProvider.validateRefreshToken(refreshToken)) {

            throw new BusinessException(ErrorCode.EXPIRED_TOKEN);

        }

        String userId = jwtTokenProvider.getUserId(refreshToken);

        UserDetails userDetails = userDetailsService.loadUserByUsername(userId);

        String role = userDetails.getAuthorities().iterator().next().getAuthority();

        // New Tokens

        String newAccessToken = jwtTokenProvider.createAccessToken(userId, role);

        String newRefreshToken = jwtTokenProvider.createRefreshToken(userId);

        // Update Cookie

        jwtTokenProvider.addRefreshTokenCookie(response, newRefreshToken);

        Map<String, String> responseData = new HashMap<>();

        responseData.put("accessToken", newAccessToken);

        return ApiResponse.success(responseData);

    }

    /**

     *          ??          (?         ?????

     */

    @PostMapping("/logout")

    public ApiResponse<Void> logout(HttpServletResponse response) {

        jwtTokenProvider.removeRefreshTokenCookie(response);

        return ApiResponse.success(null);

    }

}

