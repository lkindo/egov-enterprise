package nuri.security.support;

import java.lang.reflect.Method;
import java.util.List;
import nuri.business.security.authorization.PermissionPolicy;
import nuri.foundation.security.service.CustomUserDetails;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import static org.assertj.core.api.Assertions.assertThat;

/** Fast source/manifest contract; HTTP and proxied-method enforcement have separate integration tests. */
public final class MethodPermissionContract {
    private MethodPermissionContract() {}

    public static Authentication authentication(List<String> groups, String... permissions) {
        var user = CustomUserDetails.builder().userId("operator").esntlId("operator-id")
                .enabled(true).lockAt("N").authorizationVersion("test-policy")
                .groups(groups).permissions(List.of(permissions)).build();
        return new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
    }

    public static void assertOperation(Method method, String permission, boolean excludeSystem) {
        String handler = method.getDeclaringClass().getName() + "#" + method.getName();
        var annotation = method.getAnnotation(PreAuthorize.class);
        assertThat(annotation).as(handler).isNotNull();
        assertThat(annotation.value()).isEqualTo("@permissionPolicy.allowed(authentication, '" + handler + "')");
        var policy = new PermissionPolicy();
        var rows = policy.bindings().stream().filter(row -> handler.equals(row.handler())).toList();
        assertThat(rows).isNotEmpty().allSatisfy(row -> {
            assertThat(row.access()).isEqualTo("PERMISSION");
            assertThat(row.permission()).isEqualTo(permission);
            assertThat(row.excludedGroups() == null ? List.of() : row.excludedGroups())
                    .isEqualTo(excludeSystem ? List.of("ROLE_SYSTEM") : List.of());
        });
        assertThat(policy.allowed(authentication(List.of("OPERATIONS_TEAM"), permission), handler)).isTrue();
        assertThat(policy.allowed(authentication(List.of()), handler)).isFalse();
        assertThat(policy.allowed(authentication(List.of("ROLE_ADMIN", "ROLE_SYSTEM")), handler)).isFalse();
        assertThat(policy.allowed(authentication(List.of("ROLE_SYSTEM", "OPERATIONS_TEAM"), permission), handler))
                .isEqualTo(!excludeSystem);
        assertThat(policy.allowed(null, handler)).isFalse();
    }
}
