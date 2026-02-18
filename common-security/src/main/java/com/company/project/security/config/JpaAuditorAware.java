package com.company.project.security.config;

import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import org.springframework.lang.NonNull;
import java.util.Optional;

/**
 * JPA Auditing에서 현재 로그인한 사용자 ID를 제공
 */
@Component
public class JpaAuditorAware implements AuditorAware<String> {

    @Override
    @NonNull
    public Optional<String> getCurrentAuditor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getPrincipal().equals("anonymousUser")) {
            return Optional.of("SYSTEM"); // 로그인 정보가 없는 경우 (배치 등)
        }

        return Optional.ofNullable(authentication.getName());
    }
}
