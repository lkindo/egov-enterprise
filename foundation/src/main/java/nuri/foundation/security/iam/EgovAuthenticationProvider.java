package nuri.foundation.security.iam;

import nuri.foundation.security.service.EgovPasswordEncoder;
import nuri.foundation.security.service.CustomUserDetails;

import nuri.foundation.domain.auth.UserAuthorityRepository;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
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
        
        log.info(">>> [EgovAuthenticationProvider] Attempting authentication for userId: {}", userId);
        
        try {
            log.info(">>> [EgovAuthenticationProvider] DB check started for userId: {}", userId);
            
            // Try find by userId
            var userOpt = userRepository.findById(userId);
            if (userOpt.isPresent()) {
                log.info(">>> [EgovAuthenticationProvider] User found by findById: {}", userOpt.get().getUserId());
            } else {
                log.warn(">>> [EgovAuthenticationProvider] User NOT found by findById: {}", userId);
            }
            
            User userEntity = userOpt
                    .orElseGet(() -> {
                        log.info(">>> [EgovAuthenticationProvider] Trying findByEsntlId for: {}", userId);
                        return userRepository.findByEsntlId(userId)
                            .orElseThrow(() -> {
                                log.warn(">>> [EgovAuthenticationProvider] User NOT found by either method: {}", userId);
                                return new BadCredentialsException("Invalid User ID or Password");
                            });
                    });
            
            validateAccountStatus(userEntity);
            
            boolean isMatched = false;
            String encodedPassword = userEntity.getPassword();
            
            log.info(">>> [EgovAuthenticationProvider] User found: {}, DB password hash: {}", userEntity.getUserId(), encodedPassword);
            
            if (encodedPassword != null && (encodedPassword.startsWith("{egov}") || !encodedPassword.startsWith("{"))) {
                String cleanHash = encodedPassword.startsWith("{egov}") ? encodedPassword.substring(6) : encodedPassword;
                
                // Try 1: Using userId as salt
                String generatedHash = egovPasswordEncoder.encode(password, userId);
                log.info(">>> [EgovAuthenticationProvider] Checking with userId salt. Hash: {}", generatedHash);
                isMatched = cleanHash.equals(generatedHash);
                
                // Try 2: Using esntlId as salt if Try 1 failed (Legacy Egov behavior)
                if (!isMatched && userEntity.getEsntlId() != null) {
                    generatedHash = egovPasswordEncoder.encode(password, userEntity.getEsntlId());
                    log.info(">>> [EgovAuthenticationProvider] Checking with esntlId salt. Hash: {}", generatedHash);
                    isMatched = cleanHash.equals(generatedHash);
                }
                
                if (isMatched) {
                    log.info(">>> Authentication successful (Egov pattern) for user: {}", userId);
                }
            }
            
            if (!isMatched) {
                log.info(">>> [EgovAuthenticationProvider] Trying standard PasswordEncoder.");
                try {
                    isMatched = passwordEncoder.matches(password, encodedPassword);
                } catch (Exception e) {
                    log.warn(">>> [EgovAuthenticationProvider] Standard PasswordEncoder match failed: {}", e.getMessage());
                }
            }
            
            if (!isMatched) {
                log.warn(">>> Password mismatch for user: {}", userId);
                userEntity.incrementLockCount();
                userRepository.save(userEntity);
                throw new BadCredentialsException("Invalid User ID or Password");
            }
            
            userEntity.unlock();
            userRepository.save(userEntity);
            log.info(">>> Authenticating user: {}, esntlId: {}, Inherent Role: {}", 
                    userEntity.getUserId(), userEntity.getEsntlId(), userEntity.getRole());

            String authorCodeFromDb = userAuthorityRepository.findById(userEntity.getEsntlId())
                    .map(ua -> ua.getAuthorCode())
                    .orElse(null);

            log.info(">>> Role from DB table (NEMPLYRSCRTYESTBS): {}", authorCodeFromDb);

            String authorCode;
            if ("webmaster".equals(userEntity.getUserId())) {
                log.info(">>> [SPECIAL] Forcing ROLE_ADMIN for user: webmaster");
                authorCode = "ROLE_ADMIN";
            } else if (authorCodeFromDb != null) {
                authorCode = authorCodeFromDb;
            } else {
                authorCode = userEntity.getRole() != null ? userEntity.getRole().name() : "ROLE_USER";
            }

            if (!authorCode.startsWith("ROLE_")) {
                authorCode = "ROLE_" + authorCode;
            }

            log.info(">>> Final resolved authorCode for user {}: {}", userId, authorCode);
            userEntity.setAuthorCode(authorCode);
            CustomUserDetails userDetails = CustomUserDetails.builder()
                    .userId(userEntity.getUserId())
                    .esntlId(userEntity.getEsntlId())
                    .userNm(userEntity.getUserNm())
                    .password(userEntity.getPassword())
                    .roleName(userEntity.getRole() != null ? userEntity.getRole().name() : null)
                    .lockAt(userEntity.getLockAt())
                    .authorCode(authorCode)
                    .build();
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
