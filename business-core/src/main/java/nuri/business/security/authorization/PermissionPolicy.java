package nuri.business.security.authorization;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.List;
import nuri.foundation.security.service.CustomUserDetails;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/** Method and request authorization share the reviewed operation binding manifest. */
@Component("permissionPolicy")
public class PermissionPolicy {
    public record Binding(String method, String path, String handler, String access, String permission,
                          List<String> excludedGroups) {}
    private final List<Binding> bindings;

    public PermissionPolicy() {
        try (var stream = new ClassPathResource("authorization/operation-bindings.json").getInputStream()) {
            bindings = List.copyOf(new ObjectMapper().readValue(stream, new TypeReference<List<Binding>>() {}));
        } catch (IOException e) {
            throw new IllegalStateException("Operation policy cannot be loaded", e);
        }
    }

    public List<Binding> bindings() { return bindings; }

    public boolean allowed(Authentication authentication, String handler) {
        return bindings.stream().filter(row -> row.handler().equals(handler)).anyMatch(row -> allows(authentication, row));
    }

    public boolean allows(Authentication authentication, Binding binding) {
        if ("PUBLIC".equals(binding.access())) return true;
        if (!authenticated(authentication)) return false;
        if (binding.excludedGroups() != null && authentication.getPrincipal() instanceof CustomUserDetails user
                && user.getGroups().stream().anyMatch(binding.excludedGroups()::contains)) return false;
        if ("AUTHENTICATED".equals(binding.access())) return true;
        return "PERMISSION".equals(binding.access()) && has(authentication, binding.permission());
    }

    public boolean isSystem(Authentication authentication) {
        return authenticated(authentication) && authentication.getPrincipal() instanceof CustomUserDetails user
                && user.getGroups().contains("ROLE_SYSTEM");
    }

    public static boolean authenticated(Authentication authentication) {
        return authentication != null && authentication.isAuthenticated() && !(authentication instanceof AnonymousAuthenticationToken)
                && authentication.getPrincipal() instanceof CustomUserDetails user && user.isEnabled() && user.isAccountNonLocked();
    }

    public static boolean has(Authentication authentication, String permission) {
        return permission != null && PermissionCodes.ALL.contains(permission) && authenticated(authentication)
                && authentication.getAuthorities().stream().anyMatch(a -> permission.equals(a.getAuthority()));
    }
}
