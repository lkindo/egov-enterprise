package com.company.project.security.audit;

import com.company.project.security.service.CustomUserDetails;
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import org.springframework.lang.NonNull;
import java.util.Optional;
import java.util.Objects;

/**
 * JPA Auditing???袁る립 ?袁⑹삺 ?????ID ??볥궗 ?????
 */
@Component
public class LoginUserAuditorAware implements AuditorAware<String> {

    @Override
    @NonNull
    public Optional<String> getCurrentAuditor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getPrincipal().equals("anonymousUser")) {
            return Objects.requireNonNull(Optional.of("SYSTEM"));
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof CustomUserDetails) {
            return Objects.requireNonNull(Optional.of(((CustomUserDetails) principal).getUser().getUserId()));
        }

        return Objects.requireNonNull(Optional.of(authentication.getName()));
    }
}
