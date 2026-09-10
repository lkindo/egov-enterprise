package nuri.business.security.annotation;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.ArrayList;
import nuri.business.security.authorization.PermissionCodes;
import nuri.foundation.security.service.CustomUserDetails;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithSecurityContextFactory;

public class WithMockCustomUserSecurityContextFactory implements WithSecurityContextFactory<WithMockCustomUser> {

    private static final Map<String, List<String>> DEFAULT_PERMISSIONS = loadDefaultPermissions();

    @Override
    public SecurityContext createSecurityContext(WithMockCustomUser customUser) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        String group = customUser.role().startsWith("ROLE_") ? customUser.role() : "ROLE_" + customUser.role();

        CustomUserDetails principal = CustomUserDetails.builder()
                .userId(customUser.username())
                .esntlId(customUser.esntlId())
                .userNm(customUser.username() + " Name")
                .password("password")
                .roleName(customUser.role())
                .authorCode(group)
                .lockAt("N")
                .enabled(true)
                .groups(List.of(group))
                .permissions(DEFAULT_PERMISSIONS.getOrDefault(group, List.of()))
                .authorizationVersion(PermissionCodes.CATALOG_VERSION)
                .build();

        Authentication auth = new UsernamePasswordAuthenticationToken(principal, "password", principal.getAuthorities());
        context.setAuthentication(auth);
        return context;
    }

    /** Test identities mirror reviewed initial grants; group names never become operation authorities. */
    private static Map<String, List<String>> loadDefaultPermissions() {
        try (var stream = new ClassPathResource("authorization/permission-catalog.json").getInputStream()) {
            var catalog = new ObjectMapper().readTree(stream);
            Map<String, List<String>> byGroup = new TreeMap<>();
            for (var permission : catalog.path("permissions")) {
                String code = permission.path("code").asText();
                if (!PermissionCodes.ALL.contains(code)) throw new IllegalStateException("Unknown fixture permission");
                for (var group : permission.path("defaultGroups")) {
                    byGroup.computeIfAbsent(group.asText(), ignored -> new ArrayList<>()).add(code);
                }
            }
            if (byGroup.isEmpty()) throw new IllegalStateException("Test permission catalog is empty");
            byGroup.replaceAll((group, codes) -> List.copyOf(codes));
            return Map.copyOf(byGroup);
        } catch (IOException e) {
            throw new IllegalStateException("Test authorization catalog unavailable", e);
        }
    }
}
