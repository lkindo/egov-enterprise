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
        
        return new TokenResponse(accessToken, refreshToken, finalRole);
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

        return new TokenResponse(newAccessToken, refreshToken, finalRole);
    }
}
