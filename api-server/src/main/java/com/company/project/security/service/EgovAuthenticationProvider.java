package com.company.project.security.service;

import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.user.User;
import egovframework.com.cmm.LoginVO;
import egovframework.com.uat.uia.service.EgovLoginService;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Component;

@Component
public class EgovAuthenticationProvider implements AuthenticationProvider {

    private final EgovLoginService loginService;
    private final UserAuthorityRepository userAuthorityRepository;

    public EgovAuthenticationProvider(@Lazy EgovLoginService loginService,
            UserAuthorityRepository userAuthorityRepository) {
        this.loginService = loginService;
        this.userAuthorityRepository = userAuthorityRepository;
    }

    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        String userId = authentication.getName();
        String password = (String) authentication.getCredentials();

        LoginVO loginVO = new LoginVO();
        loginVO.setId(userId);
        loginVO.setPassword(password);

        try {
            LoginVO resultVO = loginService.actionLogin(loginVO);

            if (resultVO != null && resultVO.getId() != null && !resultVO.getId().isEmpty()) {
                // Fetch actual authority from NEMPLYRSCRTYESTBS
                String authorCode = userAuthorityRepository.findById(resultVO.getUniqId())
                        .map(ua -> ua.getAuthorCode())
                        .orElse("ROLE_USER"); // Default fallback

                // Map LoginVO to User Domain
                User user = User.builder()
                        .userId(resultVO.getId())
                        .userNm(resultVO.getName())
                        .esntlId(resultVO.getUniqId())
                        .emailAdres(resultVO.getEmail())
                        .ihidnum(resultVO.getIhidNum())
                        .orgnztId(resultVO.getOrgnztId())
                        .authorCode(authorCode) // Use authorCode instead of static Role.USER
                        .password(resultVO.getPassword())
                        .build();

                CustomUserDetails userDetails = new CustomUserDetails(user);

                return new UsernamePasswordAuthenticationToken(userDetails, password, userDetails.getAuthorities());
            } else {
                throw new BadCredentialsException("Invalid User ID or Password");
            }
        } catch (Exception e) {
            throw new BadCredentialsException("Authentication failed: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean supports(Class<?> authentication) {
        return UsernamePasswordAuthenticationToken.class.isAssignableFrom(authentication);
    }
}
