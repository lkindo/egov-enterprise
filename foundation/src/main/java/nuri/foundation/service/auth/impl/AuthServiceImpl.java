package nuri.foundation.service.auth.impl;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.domain.auth.UserAuthorityRepository;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.service.auth.AuthService;
import nuri.foundation.service.auth.dto.LoginRequest;
import nuri.foundation.service.auth.dto.TokenResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.OptimisticLockingFailureException;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final UserAuthorityRepository userAuthorityRepository;
    private final nuri.foundation.domain.auth.RefreshTokenRepository refreshTokenRepository;

    @Override
    @Transactional
    public TokenResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUserId(), request.getPassword()));
        
        String userId = authentication.getName();
        String role = authentication.getAuthorities().stream()
                .map(auth -> auth.getAuthority())
                .findFirst()
                .orElse("ROLE_USER");
        
        String finalRole = role.startsWith("ROLE_") ? role : "ROLE_" + role;
        String accessToken = jwtTokenProvider.createAccessToken(userId, finalRole);
        String refreshToken = jwtTokenProvider.createRefreshToken(userId);
        
        // Refresh Token 저장/갱신
        nuri.foundation.domain.auth.RefreshToken rt = refreshTokenRepository.findById(userId)
                .map(token -> {
                    token.updateToken(refreshToken, java.time.Instant.now().plus(java.time.Duration.ofDays(7)));
                    return token;
                })
                .orElseGet(() -> nuri.foundation.domain.auth.RefreshToken.builder()
                        .userId(userId)
                        .token(refreshToken)
                        .expiryDate(java.time.Instant.now().plus(java.time.Duration.ofDays(7)))
                        .build());
        refreshTokenRepository.save(rt);
        
        return new TokenResponse(accessToken, refreshToken, finalRole);
    }

    @Override
    @Transactional
    public TokenResponse reissue(String refreshToken) {
        if (refreshToken == null || !jwtTokenProvider.validateToken(refreshToken)) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }
        
        // DB에 저장된 토큰과 일치하는지 검증
        nuri.foundation.domain.auth.RefreshToken storedToken = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN));

        if (storedToken.getExpiryDate().isBefore(java.time.Instant.now())) {
            refreshTokenRepository.delete(storedToken);
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }

        String userId = storedToken.getUserId();
        
        String authorCode = userRepository.findById(userId)
                .map(user -> userAuthorityRepository.findById(user.getEsntlId())
                        .map(ua -> ua.getAuthorCode())
                        .orElseGet(() -> user.getRole().name()))
                .orElse("ROLE_USER");

        String finalRole = authorCode.startsWith("ROLE_") ? authorCode : "ROLE_" + authorCode;
        String newAccessToken = jwtTokenProvider.createAccessToken(userId, finalRole);

        return new TokenResponse(newAccessToken, refreshToken, finalRole);
    }

    @Override
    @Transactional
    public void logout(String userId) {
        try {
            log.info(">>> [Logout] Deleting refresh token for user: {}", userId);
            refreshTokenRepository.findById(userId).ifPresent(token -> {
                refreshTokenRepository.delete(token);
                refreshTokenRepository.flush();
            });
        } catch (Exception e) {
            log.warn(">>> [Logout] RefreshToken already deleted or error occurred for user: {}. Message: {}", userId, e.getMessage());
        }
    }
}
