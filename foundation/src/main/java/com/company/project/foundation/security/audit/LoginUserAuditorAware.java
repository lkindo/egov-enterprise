package com.company.project.foundation.security.audit;

import com.company.project.foundation.security.service.CustomUserDetails;
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.lang.NonNull;
import java.util.Optional;

/**
 * JPA Auditing을 위해 현재 로그인한 사용자의 ID 정보를 제공하는 클래스입니다.
 */
@Component("loginUserAuditorAware")
public class LoginUserAuditorAware implements AuditorAware<String> {

    @Override
    @NonNull
    public Optional<String> getCurrentAuditor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getPrincipal().equals("anonymousUser")) {
            return Optional.of("SYSTEM");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof CustomUserDetails) {
            return Optional.of(((CustomUserDetails) principal).getUserId());
        }

        return Optional.of(authentication.getName());
    }
}
