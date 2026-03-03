package com.company.project.security.service;

import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.AccountStatusException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class EgovAuthenticationProvider implements AuthenticationProvider {
    private final UserRepository userRepository;
    private final UserAuthorityRepository userAuthorityRepository;
    private final PasswordEncoder passwordEncoder;
    private final EgovPasswordEncoder egovPasswordEncoder;

    @Override
    @Transactional
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        String userId = authentication.getName();
        String password = (String) authentication.getCredentials();
        try {
            User userEntity = userRepository.findById(userId)
                    .orElseGet(() -> userRepository.findByEsntlId(userId)
                            .orElseThrow(() -> new BadCredentialsException("Invalid User ID or Password")));
            validateAccountStatus(userEntity);
            boolean isMatched = false;
            String encodedPassword = userEntity.getPassword();
            if (encodedPassword != null && (encodedPassword.startsWith("{egov}") || !encodedPassword.startsWith("{"))) {
                String cleanHash = encodedPassword.startsWith("{egov}") ? encodedPassword.substring(6) : encodedPassword;
                String generatedHash = egovPasswordEncoder.encode(password, userId);
                isMatched = cleanHash.equals(generatedHash);
                if (isMatched) {
                    log.info(">>> Authentication successful for user: {}", userId);
                }
            }
            if (!isMatched) {
                isMatched = passwordEncoder.matches(password, encodedPassword);
            }
            if (!isMatched) {
                log.warn(">>> Password mismatch for user: {}", userId);
                userEntity.incrementLockCount();
                userRepository.save(userEntity);
                throw new BadCredentialsException("Invalid User ID or Password");
            }
            userEntity.unlock();
            userRepository.save(userEntity);
            log.info(">>> Authenticating user: {}, esntlId: {}", userEntity.getUserId(), userEntity.getEsntlId());
            String authorCode = userAuthorityRepository.findById(userEntity.getEsntlId())
                    .map(ua -> {
                        log.info(">>> Found authorCode: {} for esntlId: {}", ua.getAuthorCode(), userEntity.getEsntlId());
                        return ua.getAuthorCode();
                    }).orElse("ROLE_USER");
            log.info(">>> Final authorCode for user {}: {}", userId, authorCode);
            userEntity.setAuthorCode(authorCode);
            CustomUserDetails userDetails = new CustomUserDetails(userEntity, authorCode);
            return new UsernamePasswordAuthenticationToken(userDetails, password, userDetails.getAuthorities());
        } catch (AuthenticationException e) {
            log.error(">>> Authentication failed for user {}: {}", userId, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error(">>> Unexpected error during authentication for user {}: ", userId, e);
            throw new BadCredentialsException("Authentication service error");
        }
    }

    private void validateAccountStatus(User user) {
        if ("Y".equalsIgnoreCase(user.getLockAt())) {
            throw new AccountStatusException("User account is locked.") {
                private static final long serialVersionUID = 1L;
            };
        }
    }

    @Override
    public boolean supports(Class<?> authentication) {
        return UsernamePasswordAuthenticationToken.class.isAssignableFrom(authentication);
    }
}
