package nuri.foundation.security.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import java.util.Optional;

@Component
public class SecurityUtil {

    public static Optional<String> getCurrentUserId() {
        final Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null) {
            return Optional.empty();
        }

        String userId = null;
        if (authentication.getPrincipal() instanceof UserDetails springSecurityUser) {
            userId = springSecurityUser.getUsername();
        } else if (authentication.getPrincipal() instanceof String) {
            userId = (String) authentication.getPrincipal();
        }

        return Optional.ofNullable(userId);
    }

    public static boolean hasRole(String role) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null)
            return false;

        return authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_" + role));
    }
}
