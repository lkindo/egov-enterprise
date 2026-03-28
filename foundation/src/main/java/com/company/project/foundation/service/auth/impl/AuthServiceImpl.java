package com.company.project.foundation.service.auth.impl;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.foundation.domain.auth.UserAuthorityRepository;
import com.company.project.foundation.domain.user.repository.UserRepository;
import com.company.project.foundation.security.jwt.JwtTokenProvider;
import com.company.project.foundation.service.auth.AuthService;
import com.company.project.foundation.service.auth.dto.LoginRequest;
import com.company.project.foundation.service.auth.dto.TokenResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final UserAuthorityRepository userAuthorityRepository;

    @Override
    @Transactional
    public TokenResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.userId(), request.password()));
        
        String userId = authentication.getName();
        String role = authentication.getAuthorities().stream()
                .map(auth -> auth.getAuthority())
                .findFirst()
                .orElse("ROLE_USER");
        
        String finalRole = role.startsWith("ROLE_") ? role : "ROLE_" + role;
        String accessToken = jwtTokenProvider.createAccessToken(userId, finalRole);
        String refreshToken = jwtTokenProvider.createRefreshToken(userId);
        
        return new TokenResponse(accessToken, refreshToken);
    }

    @Override
    public TokenResponse reissue(String refreshToken) {
        if (refreshToken == null || !jwtTokenProvider.validateToken(refreshToken)) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }
        
        String userId = jwtTokenProvider.getUserId(refreshToken);
        
        String authorCode = userRepository.findById(userId)
                .map(user -> userAuthorityRepository.findById(user.getEsntlId())
                        .map(ua -> ua.getAuthorCode())
                        .orElseGet(() -> user.getRole().name()))
                .orElse("ROLE_USER");

        String finalRole = authorCode.startsWith("ROLE_") ? authorCode : "ROLE_" + authorCode;
        String newAccessToken = jwtTokenProvider.createAccessToken(userId, finalRole);

        return new TokenResponse(newAccessToken, refreshToken);
    }
}
