package com.company.project.security.service;

import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
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
import org.springframework.transaction.annotation.Transactional;

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
    @Transactional
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        String userId = authentication.getName();
        String password = (String) authentication.getCredentials();

        // 1. ?¬ìš©??ì¡´ì¬ ?¬ë? ë°?? ê¸ˆ ?íƒœ ë¨¼ì? ?•ì¸
        User userEntity = userRepository.findById(userId)
                .orElseGet(() -> userRepository.findByEsntlId(userId)
                        .orElseThrow(() -> new BadCredentialsException("Invalid User ID or Password")));

        validateAccountStatus(userEntity);

        LoginVO loginVO = new LoginVO();
        loginVO.setId(userId);
        loginVO.setPassword(password);

        try {
            LoginVO resultVO = loginService.actionLogin(loginVO);

            if (resultVO != null && resultVO.getId() != null && !resultVO.getId().isEmpty()) {
                // ë¡œê·¸???±ê³µ ??? ê¸ˆ ?Ÿìˆ˜ ì´ˆê¸°??
                userEntity.unlock();
                userRepository.save(userEntity);

                // Fetch actual authority from NEMPLYRSCRTYESTBS
                String authorCode = userAuthorityRepository.findById(resultVO.getUniqId())
                        .map(ua -> ua.getAuthorCode())
                        .orElse("ROLE_USER");

                // Map to CustomUserDetails
                userEntity.setAuthorCode(authorCode);
                CustomUserDetails userDetails = new CustomUserDetails(userEntity);

                return new UsernamePasswordAuthenticationToken(userDetails, password, userDetails.getAuthorities());
            } else {
                // ë¡œê·¸???¤íŒ¨ ??? ê¸ˆ ?Ÿìˆ˜ ì¦ê?
                userEntity.incrementLockCount();
                userRepository.save(userEntity);
                throw new BadCredentialsException("Invalid User ID or Password");
            }
        } catch (BadCredentialsException e) {
            throw e;
        } catch (Exception e) {
            // ê¸°í? ?ˆì™¸ ë°œìƒ ?œì—??ê³„ì • ë³´í˜¸ë¥??„í•´ ?¤íŒ¨ ì²˜ë¦¬ ê³ ë ¤ ê°€??(?„ì¬??ë¡œê¹… ???¬íˆ¬ì²?
            throw new BadCredentialsException("Authentication failed: " + e.getMessage(), e);
        }
    }

    private void validateAccountStatus(User user) {
        if ("Y".equalsIgnoreCase(user.getLockAt())) {
            throw new AccountStatusException("User account is locked due to multiple login failures.") {
                private static final long serialVersionUID = 1L;
            };
        }
    }

    @Override
    public boolean supports(Class<?> authentication) {
        return UsernamePasswordAuthenticationToken.class.isAssignableFrom(authentication);
    }
}
