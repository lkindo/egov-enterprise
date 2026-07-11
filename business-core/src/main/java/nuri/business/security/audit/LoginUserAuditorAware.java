package nuri.business.security.audit;

import nuri.foundation.security.service.CustomUserDetails;
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

        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.of("SYSTEM");
        }

        Object principal = authentication.getPrincipal();
        if (principal == null || "anonymousUser".equals(principal)) {
            return Optional.of("SYSTEM");
        }

        if (principal instanceof CustomUserDetails) {
            return Optional.of(((CustomUserDetails) principal).getUserId());
        }

        String name = authentication.getName();
        return Optional.ofNullable(name).or(() -> Optional.of("SYSTEM"));
    }
}
