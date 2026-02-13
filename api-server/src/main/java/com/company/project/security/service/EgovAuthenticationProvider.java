package com.company.project.security.service;

import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.user.User;
import com.company.project.domain.user.UserRepository;
import egovframework.com.cmm.LoginVO;
import egovframework.com.uat.uia.service.EgovLoginService;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.AccountStatusException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Component;

@Component
public class EgovAuthenticationProvider implements AuthenticationProvider {

    private final EgovLoginService loginService;
    private final UserAuthorityRepository userAuthorityRepository;
    private final UserRepository userRepository;

    public EgovAuthenticationProvider(@Lazy EgovLoginService loginService,
            UserAuthorityRepository userAuthorityRepository,
            UserRepository userRepository) {
        this.loginService = loginService;
        this.userAuthorityRepository = userAuthorityRepository;
        this.userRepository = userRepository;
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
                // Check if user account is locked
                User userEntity = userRepository.findById(resultVO.getId())
                    .orElseThrow(() -> new BadCredentialsException("User not found"));

                // Check account status
                validateAccountStatus(userEntity);

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
                        .lockAt(userEntity.getLockAt())
                        .lockCnt(userEntity.getLockCnt())
                        .lockLastPnttm(userEntity.getLockLastPnttm())
                        .build();

                CustomUserDetails userDetails = new CustomUserDetails(user);

                return new UsernamePasswordAuthenticationToken(userDetails, password, userDetails.getAuthorities());
            } else {
                throw new BadCredentialsException("Invalid User ID or Password");
            }
        } catch (BadCredentialsException e) {
            throw e; // Re-throw bad credentials exception
        } catch (Exception e) {
            throw new BadCredentialsException("Authentication failed: " + e.getMessage(), e);
        }
    }

    /**
     * Validate user account status (locked, suspended, etc.)
     */
    private void validateAccountStatus(User user) {
        if ("Y".equalsIgnoreCase(user.getLockAt())) {
            throw new AccountStatusException("User account is locked") {
                private static final long serialVersionUID = 1L;
            };
        }
        
        // Additional account status checks can be added here
        // For example: check if account is expired, disabled, etc.
    }

    @Override
    public boolean supports(Class<?> authentication) {
        return UsernamePasswordAuthenticationToken.class.isAssignableFrom(authentication);
    }
}
