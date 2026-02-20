package com.company.project.service.auth;

import com.company.project.security.jwt.JwtTokenProvider;
import com.company.project.service.auth.dto.LoginRequest;
import com.company.project.service.auth.dto.TokenResponse;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

/**
 * ?몄쬆 ?쒕퉬??援ы쁽泥?
 * - ?꾩옄?뺣??꾨젅?꾩썙??5.0 ?명솚???몄쬆 ?붽굔 異⑹”
 * - EgovAbstractServiceImpl ?곸냽 諛?EgovAuthService ?명꽣?섏씠??援ы쁽
 */
@Service("egovAuthService")
public class AuthService extends EgovAbstractServiceImpl implements EgovAuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(AuthenticationManager authenticationManager, JwtTokenProvider jwtTokenProvider) {
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    @Transactional
    public TokenResponse login(LoginRequest request) {
        Objects.requireNonNull(request);
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.userId(), request.password()));

        Objects.requireNonNull(authentication);

        String role = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .findFirst()
                .orElse("ROLE_USER");

        String accessToken = jwtTokenProvider.createAccessToken(Objects.requireNonNull(authentication.getName()), role);
        String refreshToken = jwtTokenProvider
                .createRefreshToken(Objects.requireNonNull(authentication.getName()));

        return new TokenResponse(accessToken, refreshToken);
    }
}
