package com.company.project.security.service;

import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.AccountStatusException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 사용자 인증 처리 Provider
 * - EgovLoginService 의존성 제거, Spring Security 표준 방식으로 직접 인증
 */
@Component
@RequiredArgsConstructor
public class EgovAuthenticationProvider implements AuthenticationProvider {

    private final UserRepository userRepository;
    private final UserAuthorityRepository userAuthorityRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        String userId = authentication.getName();
        String password = (String) authentication.getCredentials();

        // 1. 사용자 조회 (ID 또는 esntlId로 조회)
        User userEntity = userRepository.findById(userId)
                .orElseGet(() -> userRepository.findByEsntlId(userId)
                        .orElseThrow(() -> new BadCredentialsException("Invalid User ID or Password")));

        // 2. 계정 상태 검증
        validateAccountStatus(userEntity);

        // 3. 비밀번호 검증
        if (!passwordEncoder.matches(password, userEntity.getPassword())) {
            userEntity.incrementLockCount();
            userRepository.save(userEntity);
            throw new BadCredentialsException("Invalid User ID or Password");
        }

        // 4. 로그인 성공: 락 해제
        userEntity.unlock();
        userRepository.save(userEntity);

        // 5. 권한 조회 및 CustomUserDetails 생성
        String authorCode = userAuthorityRepository.findById(userEntity.getEsntlId())
                .map(ua -> ua.getAuthorCode())
                .orElse("ROLE_USER");

        userEntity.setAuthorCode(authorCode);

        CustomUserDetails userDetails = new CustomUserDetails(userEntity);

        return new UsernamePasswordAuthenticationToken(userDetails, password, userDetails.getAuthorities());
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
